import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

/**
 * The site's three self-hosted variable families, loaded from the very files
 * the website serves (copied from adalawsociety-v2/public/fonts) with the same
 * weight ranges and unicode split, so type set in the film is the site's type.
 */
const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

type Face = { family: string; file: string; weight: string; style: 'normal' | 'italic'; range: string };

const FACES: Face[] = [
  { family: 'Cormorant Garamond', file: 'cormorant-latin-normal', weight: '300 700', style: 'normal', range: LATIN },
  { family: 'Cormorant Garamond', file: 'cormorant-latin-ext-normal', weight: '300 700', style: 'normal', range: LATIN_EXT },
  { family: 'Cormorant Garamond', file: 'cormorant-latin-italic', weight: '300 700', style: 'italic', range: LATIN },
  { family: 'Cormorant Garamond', file: 'cormorant-latin-ext-italic', weight: '300 700', style: 'italic', range: LATIN_EXT },
  { family: 'Literata', file: 'literata-latin-normal', weight: '200 700', style: 'normal', range: LATIN },
  { family: 'Literata', file: 'literata-latin-ext-normal', weight: '200 700', style: 'normal', range: LATIN_EXT },
  { family: 'Literata', file: 'literata-latin-italic', weight: '200 700', style: 'italic', range: LATIN },
  { family: 'Literata', file: 'literata-latin-ext-italic', weight: '200 700', style: 'italic', range: LATIN_EXT },
  { family: 'IBM Plex Sans', file: 'plex-latin-normal', weight: '100 700', style: 'normal', range: LATIN },
  { family: 'IBM Plex Sans', file: 'plex-latin-ext-normal', weight: '100 700', style: 'normal', range: LATIN_EXT },
];

let loaded: Promise<void> | null = null;

export function loadSiteFonts(): Promise<void> {
  loaded ??= Promise.all(
    FACES.map((f) =>
      loadFont({
        family: f.family,
        url: staticFile(`fonts/${f.file}.woff2`),
        weight: f.weight,
        style: f.style,
        unicodeRange: f.range,
        display: 'block',
      }),
    ),
  ).then(() => undefined);
  return loaded;
}
