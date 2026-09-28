/**
 * Deterministic capture of a live page, one film frame at a time.
 *
 * A screen recording samples the site at whatever moment the recorder
 * happens to grab a frame; scrolling stutters, reveals land between frames
 * and nothing repeats twice the same way. This engine instead *steps* the page:
 *
 *  - JavaScript time (Date, timers, requestAnimationFrame, performance.now) is
 *    Playwright's fake clock, advanced exactly one frame per captured frame, so
 *    the site's own rAF scroll loop and settle logic run on film time.
 *  - CSS transitions and animations (the site's reveals, the docket's
 *    cross-fade, the running head sliding in) are paused and seeked through the
 *    Web Animations API to the same film time, so a 1.6 s unmask spans exactly
 *    96 frames at 60 fps.
 *  - Scrolling is set per frame from a curve, never left to the browser's
 *    smooth-scroll, and every image in view is decoded before the shutter.
 *
 * The result is the real site — its own layout, type, photography and motion
 * code — sampled on a perfect timeline the film can cut against.
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export type Viewport = { width: number; height: number };

export type OpenOptions = {
  viewport: Viewport;
  /** Device pixels per CSS pixel. 2.4 maps a 1600-wide viewport onto 3840 px. */
  dpr: number;
  fps: number;
  reducedMotion?: boolean;
};

export type Rect = { x: number; y: number; width: number; height: number };

export type Word = Rect & { text: string };

export type Measured = {
  rect: Rect;
  text: string;
  /** Visual line boxes of the element's text, viewport coordinates. */
  lines: Rect[];
  /** The text of each visual line, as the browser actually broke it. */
  lineTexts: string[];
  /** Every word, with its box — for word-level morphs. */
  words: Word[];
  style: Record<string, string>;
};

const STYLE_KEYS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textTransform',
  'color',
  'textAlign',
  'textWrap',
  'fontVariantNumeric',
  'backgroundColor',
];

/* Installed into every page before its own scripts run. */
const INIT_SCRIPT = `
(() => {
  // tsx/esbuild wraps named functions in __name(); functions this script
  // passes to page.evaluate carry those calls into the page.
  globalThis.__name = (fn) => fn;
  window.__vt = 0;
  const born = new WeakMap();
  window.__syncAnimations = () => {
    for (const a of document.getAnimations()) {
      let t0 = born.get(a);
      if (t0 === undefined) { t0 = window.__vt; born.set(a, t0); }
      try { a.pause(); a.currentTime = Math.max(0, window.__vt - t0); } catch (e) {}
    }
  };
  const noSmooth = () => {
    document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
  };
  if (document.documentElement) noSmooth();
  document.addEventListener('DOMContentLoaded', noSmooth);
})();
`;

export class Stage {
  private constructor(
    readonly browser: Browser,
    readonly context: BrowserContext,
    readonly page: Page,
    readonly options: OpenOptions,
  ) {}

  frame = 0;

  static async open(browser: Browser, url: string, options: OpenOptions): Promise<Stage> {
    const context = await browser.newContext({
      viewport: options.viewport,
      deviceScaleFactor: options.dpr,
      reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference',
      colorScheme: 'light',
      locale: 'en-GB',
      timezoneId: 'Asia/Baku',
    });
    const page = await context.newPage();
    await page.addInitScript(INIT_SCRIPT);
    // The clock is installed before the page's scripts run, and runs freely
    // while the document loads; it is paused once the page is ready.
    await page.clock.install({ time: new Date('2026-09-28T12:00:00+04:00') });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.evaluate(() => document.fonts.ready);
    const stage = new Stage(browser, context, page, options);
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(new Date(now + 50));
    await stage.eagerImages();
    return stage;
  }

  /** Makes every lazy photograph load now, without triggering any reveal. */
  async eagerImages() {
    await this.page.evaluate(() => {
      document.querySelectorAll('img').forEach((img) => {
        if (img.loading === 'lazy') img.loading = 'eager';
      });
    });
    await this.page.waitForLoadState('networkidle');
    await this.page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map((img) =>
          img.complete ? img.decode().catch(() => undefined) : new Promise((r) => img.addEventListener('load', r, { once: true })),
        ),
      );
    });
  }

  /** Advances film time by `n` frames without capturing. */
  async advance(n = 1) {
    const ms = 1000 / this.options.fps;
    for (let i = 0; i < n; i++) {
      await this.page.clock.runFor(ms);
      await this.page.evaluate((dt) => {
        (window as unknown as { __vt: number }).__vt += dt;
      }, ms);
      // One real frame for layout, IntersectionObserver and React commits.
      await this.page.evaluate(
        () => new Promise<void>((resolve) => {
          const ch = new MessageChannel();
          ch.port1.onmessage = () => resolve();
          ch.port2.postMessage(0);
        }),
      );
      await this.page.evaluate(() => (window as unknown as { __syncAnimations: () => void }).__syncAnimations());
      this.frame += 1;
    }
  }

  async scrollTo(y: number) {
    await this.page.evaluate((top) => window.scrollTo({ top, left: 0, behavior: 'instant' as ScrollBehavior }), y);
  }

  async scrollY(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  /** Document y of an element's top edge (CSS px). */
  async top(selector: string): Promise<number> {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`No element for ${sel}`);
      return el.getBoundingClientRect().top + window.scrollY;
    }, selector);
  }

  /** Waits until every image intersecting the viewport is decoded and painted. */
  async imagesReady() {
    await this.page.evaluate(async () => {
      const vh = window.innerHeight;
      const visible = Array.from(document.images).filter((img) => {
        const r = img.getBoundingClientRect();
        return r.bottom > -200 && r.top < vh + 200 && r.width > 0;
      });
      await Promise.all(
        visible.map(async (img) => {
          if (!img.complete) await new Promise((r) => img.addEventListener('load', r, { once: true }));
          await img.decode().catch(() => undefined);
        }),
      );
    });
  }

  async shoot(file: string, opts: { type?: 'jpeg' | 'png'; quality?: number; clip?: Rect } = {}) {
    await this.imagesReady();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const type = opts.type ?? (file.endsWith('.png') ? 'png' : 'jpeg');
    await this.page.screenshot({
      path: file,
      type,
      quality: type === 'jpeg' ? (opts.quality ?? 94) : undefined,
      clip: opts.clip,
      caret: 'hide',
      scale: 'device',
      animations: 'allow',
      timeout: 120_000,
    });
  }

  /** Geometry, text and type of elements, for live overlays in the film. */
  async measure(selectors: Record<string, string>): Promise<Record<string, Measured>> {
    return this.page.evaluate(
      ({ selectors, keys }) => {
        const out: Record<string, unknown> = {};
        for (const [name, sel] of Object.entries(selectors)) {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (!el) continue;
          const r = el.getBoundingClientRect();
          // Every word's box, in reading order; lines are words that share a top.
          const words: { text: string; x: number; y: number; width: number; height: number }[] = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const t = node.textContent ?? '';
            const re = /\S+/g;
            for (let hit = re.exec(t); hit; hit = re.exec(t)) {
              const wr = document.createRange();
              wr.setStart(node, hit.index);
              wr.setEnd(node, hit.index + hit[0].length);
              const boxes = Array.from(wr.getClientRects()).filter((b) => b.width > 0);
              if (!boxes.length) continue;
              const b = boxes[0];
              const upper = getComputedStyle(node.parentElement!).textTransform === 'uppercase';
              words.push({ text: upper ? hit[0].toUpperCase() : hit[0], x: b.x, y: b.y, width: b.width, height: b.height });
            }
          }
          const lines: { x: number; y: number; width: number; height: number }[] = [];
          const lineTexts: string[] = [];
          for (const w of words) {
            const prev = lines[lines.length - 1];
            if (prev && Math.abs(prev.y - w.y) < w.height * 0.5) {
              const right = Math.max(prev.x + prev.width, w.x + w.width);
              prev.x = Math.min(prev.x, w.x);
              prev.width = right - prev.x;
              lineTexts[lineTexts.length - 1] += ' ' + w.text;
            } else {
              lines.push({ x: w.x, y: w.y, width: w.width, height: w.height });
              lineTexts.push(w.text);
            }
          }
          const cs = getComputedStyle(el);
          const style: Record<string, string> = {};
          for (const k of keys) style[k] = (cs as unknown as Record<string, string>)[k];
          out[name] = {
            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
            text: el.innerText,
            lines,
            lineTexts,
            words,
            style,
          };
        }
        return out;
      },
      { selectors, keys: STYLE_KEYS },
    ) as Promise<Record<string, Measured>>;
  }

  /** Temporarily hides elements (visibility, so layout is unchanged). */
  async hide(selectors: string[]) {
    await this.page.evaluate((sels) => {
      for (const sel of sels)
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          el.dataset.filmHidden = el.style.visibility || 'unset';
          el.style.visibility = 'hidden';
        });
    }, selectors);
  }

  async unhide() {
    await this.page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('[data-film-hidden]').forEach((el) => {
        el.style.visibility = el.dataset.filmHidden === 'unset' ? '' : el.dataset.filmHidden!;
        delete el.dataset.filmHidden;
      });
    });
  }

  async close() {
    await this.context.close();
  }
}

export async function launch(): Promise<Browser> {
  return chromium.launch({
    args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb', '--hide-scrollbars'],
  });
}
