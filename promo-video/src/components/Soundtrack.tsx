import { Html5Audio, staticFile } from 'remotion';

/**
 * Three stems — the narrator (vo.wav), the score and the sound design — so
 * each can be replaced without touching the others. The score and the sound
 * design are ducked under the narrator in audio/score.py.
 *
 * The score can be replaced without touching the sound design:
 * drop a licensed track in as public/audio/score.wav (same length, or longer)
 * and the picture's sync points — which live on the sfx stem — are unchanged.
 * Regenerate both from the film's clock with `npm run cues && npm run score`.
 */
export const MIX = { voice: 0.95, score: 0.78, sfx: 0.86 };

export function Soundtrack() {
  return (
    <>
      <Html5Audio src={staticFile('audio/vo.wav')} volume={MIX.voice} />
      <Html5Audio src={staticFile('audio/score.wav')} volume={MIX.score} />
      <Html5Audio src={staticFile('audio/sfx.wav')} volume={MIX.sfx} />
    </>
  );
}
