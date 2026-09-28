/**
 * Content, read off the rendered pages.
 *
 * The film never types a headline, date, name or caption by hand: every word
 * and photograph it sets comes from here, taken from the site at capture time.
 * Captured against production, the film therefore carries production's
 * content; `npm run verify` diffs this record against the live site.
 */
import type { Page } from 'playwright';

export type Photo = { master: string; alt: string; caption: string; width: number; height: number };

export const CONTENT_PAGES: Record<string, string> = {
  home: '/en',
  homeAz: '/az',
  homeRu: '/ru',
  blog: '/en/blog',
  article: '/en/blog/article-264-duty-to-cooperate-and-self-incrimination',
  news: '/en/news',
  orientation: '/en/news/orientation-day-2026',
  moot: '/en/news/law-of-the-sea-moot-court-final',
  debate: '/en/news/iv-parliamentary-debate-tournament-final',
  aiDebate: '/en/news/ai-and-the-law-professors-debate',
  seminar: '/en/news/brain-computer-interfaces-seminar',
  team: '/en/team',
  about: '/en/about',
};

/** Runs in the page. Must be self-contained. */
function pageContent(kind: string) {
  // innerText, not textContent: a heading set as balanced line spans reads
  // "Cooperate and", not "Cooperateand".
  const lines = (el: Element | null | undefined) =>
    ((el as HTMLElement | null)?.innerText ?? el?.textContent ?? '')
      .split('\n')
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  const text = (el: Element | null | undefined) => lines(el).join(' ');
  const master = (img: HTMLImageElement | null | undefined): string => {
    if (!img) return '';
    const raw = img.currentSrc || img.src || '';
    try {
      const u = new URL(raw, location.href);
      const inner = u.searchParams.get('url');
      return decodeURIComponent(inner ?? u.pathname);
    } catch {
      return raw;
    }
  };
  const photo = (img: HTMLImageElement | null | undefined, caption = '') => {
    // The site crops every photograph around its stored focal point.
    const pos = img ? getComputedStyle(img).objectPosition.split(' ') : ['50%', '50%'];
    const pct = (v: string | undefined) => (v && v.endsWith('%') ? parseFloat(v) / 100 : 0.5);
    return {
      master: master(img),
      alt: img?.alt ?? '',
      caption,
      width: img?.naturalWidth ?? 0,
      height: img?.naturalHeight ?? 0,
      focal: [pct(pos[0]), pct(pos[1])] as [number, number],
    };
  };
  const figures = () =>
    Array.from(document.querySelectorAll<HTMLImageElement>('main img'))
      .filter((img) => master(img).startsWith('/media/'))
      .map((img) => {
        const fig = img.closest('figure');
        const cap = fig?.querySelector('[data-plate], figcaption');
        return photo(img, text(cap));
      });

  const out: Record<string, unknown> = { figures: figures() };

  if (kind === 'home' || kind === 'homeAz' || kind === 'homeRu') {
    const hero = document.querySelector('main > div:first-child');
    out.hero = {
      eyebrow: text(hero?.querySelector('p.t-label')),
      lines: Array.from(hero?.querySelectorAll('h1 [data-reveal-kind="lift"]') ?? []).map(text),
      lead: text(hero?.querySelector('p.t-lead')),
      scroll: text(hero?.querySelector('span.t-label')),
      photo: photo(hero?.querySelector('img')),
    };
    const chapter = (id: string) => {
      const sec = document.getElementById(id);
      return {
        index: sec?.dataset.chapterIndex ?? '',
        title: sec?.dataset.chapter ?? '',
        lines: Array.from(sec?.querySelectorAll('h2 [data-reveal-kind="lift"]') ?? []).map(text),
      };
    };
    out.chapters = {
      society: chapter('society'),
      events: chapter('events'),
      enquiry: chapter('enquiry'),
      publication: chapter('publication'),
      newsroom: chapter('newsroom'),
      team: chapter('team'),
    };
    const invite = document.querySelector('section[data-chapter-index="§ 07"]') as HTMLElement | null;
    out.invitation = {
      index: invite?.dataset.chapterIndex ?? '',
      title: invite?.dataset.chapter ?? '',
      lines: Array.from(invite?.querySelectorAll('h2 [data-reveal-kind="lift"]') ?? []).map(text),
      email: text(invite?.querySelector('a[href^="mailto:"]')),
    };
    out.docket = Array.from(document.querySelectorAll('#events ol > li')).map((li, i) => {
      const stageImg = document.querySelectorAll<HTMLImageElement>('#events .sticky img')[i];
      return {
        label: text(li.querySelector('p.t-label')),
        title: text(li.querySelector('h3')),
        body: text(li.querySelector('p.t-body')),
        plate: text(li.querySelector('p[data-plate]')),
        href: li.querySelector('a')?.getAttribute('href') ?? '',
        photo: photo(stageImg, text(li.querySelector('p[data-plate]'))),
      };
    });
    out.counter = text(document.querySelector('#events .sticky span.t-label'));
    out.seminars = {
      heading: Array.from(document.querySelectorAll('#enquiry-heading [data-reveal-kind="lift"]')).map(text),
      programme: Array.from(document.querySelectorAll('#enquiry ol > li')).map((li) => ({
        date: text(li.querySelector('p.t-meta.tabular-nums')),
        title: text(li.querySelector('p.t-title')),
        speaker: text(li.querySelectorAll('p.t-meta')[1]),
      })),
      photos: Array.from(document.querySelectorAll<HTMLImageElement>('#enquiry img')).map((img) => {
        const cap = img.closest('figure')?.parentElement?.querySelector('p.t-meta');
        return photo(img, text(cap));
      }),
    };
    out.blog = Array.from(document.querySelectorAll('#publication ol > li')).map((li) => {
      const metas = li.querySelectorAll('a > span.t-meta');
      return {
        number: text(li.querySelector('span.t-section-mark')),
        title: text(li.querySelector('span.t-title')),
        author: text(metas[0]),
        date: text(metas[1]),
        href: li.querySelector('a')?.getAttribute('href') ?? '',
      };
    });
    const teamSec = document.getElementById('team');
    out.team = {
      term: text(teamSec?.querySelector('p.t-label')),
      groups: Array.from(teamSec?.querySelectorAll('ul li.flex') ?? []).map((li) => ({
        name: text(li.querySelector('span.t-meta')),
        count: text(li.querySelectorAll('span.t-meta')[1]),
      })),
    };
  }

  if (kind === 'blog') {
    out.masthead = {
      eyebrow: text(document.querySelector('main p.t-label')),
      title: text(document.querySelector('main h1')),
    };
    out.articles = Array.from(document.querySelectorAll('main a[href*="/blog/"]'))
      .filter((a) => a.querySelector('h2'))
      .map((a) => ({
        title: text(a.querySelector('h2')),
        meta: Array.from(a.querySelectorAll('p.t-meta, p.t-label, span.t-meta')).flatMap(lines),
        href: a.getAttribute('href') ?? '',
        plate: photo(a.querySelector('img')),
      }));
  }

  if (kind === 'article') {
    const h = document.querySelector('main header');
    out.article = {
      back: text(h?.querySelector('a.t-label')),
      category: text(h?.querySelector('p.t-label')),
      title: text(h?.querySelector('h1')),
      byline: Array.from(h?.querySelectorAll('p.t-meta') ?? []).map(text),
      firstParagraph: text(document.querySelector('.prose-legal > p')),
      plate: photo(document.querySelector<HTMLImageElement>('main figure img')),
    };
  }

  if (kind === 'news') {
    out.masthead = {
      eyebrow: text(document.querySelector('main p.t-label')),
      title: text(document.querySelector('main h1')),
    };
    out.entries = Array.from(document.querySelectorAll('main ol > li, main ul > li'))
      .filter((li) => li.querySelector('h3'))
      .map((li) => {
        const metas = Array.from(li.querySelectorAll('p.t-meta, p.t-label, time')).map(text).filter(Boolean);
        return {
          title: text(li.querySelector('h3')),
          meta: metas,
          href: li.querySelector('a')?.getAttribute('href') ?? '',
          photo: li.querySelector('img') ? photo(li.querySelector('img')) : null,
        };
      });
  }

  if (['orientation', 'moot', 'debate', 'aiDebate', 'seminar'].includes(kind)) {
    const h = document.querySelector('main header');
    out.story = {
      category: text(h?.querySelector('p.t-label')),
      title: text(h?.querySelector('h1')),
      meta: Array.from(h?.querySelectorAll('p.t-meta') ?? []).map(text),
    };
  }

  if (kind === 'team') {
    out.masthead = {
      eyebrow: text(document.querySelector('main p.t-label')),
      title: text(document.querySelector('main h1')),
      numeral: text(document.querySelector('main p.pointer-events-none')),
    };
    out.members = Array.from(document.querySelectorAll<HTMLImageElement>('main li img'))
      .filter((img) => img.alt.includes(','))
      .map((img) => {
        const section = img.closest('section');
        const group = text(section?.querySelector('h2'));
        const [name, ...role] = img.alt.split(',');
        return { name: name.trim(), role: role.join(',').trim(), group, photo: photo(img) };
      });
    out.summary = Array.from(document.querySelectorAll('main header p.t-meta, main header span')).map(text).filter(Boolean);
  }

  if (kind === 'about') {
    out.masthead = {
      eyebrow: text(document.querySelector('main p.t-label')),
      title: text(document.querySelector('main h1')),
    };
    const chron = document.getElementById('chronicle-heading')?.closest('section');
    out.chronicle = {
      heading: text(document.getElementById('chronicle-heading')),
      rows: Array.from(chron?.querySelectorAll('p.font-display') ?? []).map((p) => {
        const row = p.parentElement?.parentElement ?? p.parentElement;
        return {
          year: text(p),
          title: text(row?.querySelector('h3')),
          text: text(row?.querySelector('p:not(.font-display)')),
        };
      }),
    };
  }
  return out;
}

export async function extractContent(page: Page, kind: string) {
  return page.evaluate(pageContent, kind);
}
