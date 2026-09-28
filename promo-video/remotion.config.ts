import { Config } from '@remotion/cli/config';

/*
 * In this repository's cloud environment Chrome cannot be downloaded, so the
 * Playwright headless shell is used. Anywhere else, unset REMOTION_BROWSER (or
 * point it at another Chromium) and Remotion manages its own browser.
 */
const browser =
  process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
import fs from 'node:fs';
if (browser && fs.existsSync(browser)) {
  Config.setBrowserExecutable(browser);
  Config.setChromeMode('headless-shell');
}

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(96);
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');
Config.setDelayRenderTimeoutInMilliseconds(180_000);
Config.setChromiumOpenGlRenderer('swangle');
Config.setOverwriteOutput(true);
