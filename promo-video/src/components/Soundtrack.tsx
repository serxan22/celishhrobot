import { Html5Audio, staticFile } from 'remotion';

/**
 * Two stems, so the score can be replaced without touching the sound design:
 * drop a licensed track in as public/audio/score.wav (same length, or longer)
 * and the picture's sync points — which live on the sfx stem — are unchanged.
 * Regenerate both from the film's clock with `npm run cues && npm run score`.
 */
export const MIX = { score: 0.78, sfx: 0.86 };

export function Soundtrack() {
  return (
    <>
      <Html5Audio src={staticFile('audio/score.wav')} volume={MIX.score} />
      <Html5Audio src={staticFile('audio/sfx.wav')} volume={MIX.sfx} />
    </>
  );
}
