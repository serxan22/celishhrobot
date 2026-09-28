import { Composition } from 'remotion';
import { Film } from './compositions/Film';
import { loadSiteFonts } from './lib/fonts';
import { FPS, TOTAL } from './lib/timing';
import { film } from './lib/tokens';

loadSiteFonts();

/**
 * Render the master at 3840 x 2160 with `--scale=2`: the composition is laid
 * out in a 1920 x 1080 design space and Chrome rasterises type, rules and
 * photographs natively at twice that density.
 */
export function Root() {
  return (
    <>
      <Composition id="Film" component={Film} durationInFrames={TOTAL} fps={FPS} width={film.width} height={film.height} />
    </>
  );
}
