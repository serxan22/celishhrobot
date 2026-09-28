import { AbsoluteFill, Sequence } from 'remotion';
import { Grain } from '../components/Grain';
import { Soundtrack } from '../components/Soundtrack';
import { ORDER, SCENES, START, type SceneKey } from '../lib/timing';
import { color } from '../lib/tokens';
import { Identity } from '../scenes/Identity';
import { Threshold } from '../scenes/Threshold';
import { Events } from '../scenes/Events';
import { Seminars } from '../scenes/Seminars';
import { Blog } from '../scenes/Blog';
import { Newsroom } from '../scenes/Newsroom';
import { Team } from '../scenes/Team';
import { Record } from '../scenes/Record';
import { Mobile } from '../scenes/Mobile';
import { Finale } from '../scenes/Finale';

const SCENE_COMPONENTS: Partial<Record<SceneKey, () => React.ReactNode>> = {
  identity: Identity,
  threshold: Threshold,
  events: Events,
  seminars: Seminars,
  blog: Blog,
  newsroom: Newsroom,
  team: Team,
  record: Record,
  mobile: Mobile,
  finale: Finale,
};

/** In Session — the ADA Law Society website, as a film. */
export function Film() {
  return (
    <AbsoluteFill style={{ background: color.ink }}>
      {ORDER.map((key) => {
        const Scene = SCENE_COMPONENTS[key];
        if (!Scene) return null;
        return (
          <Sequence key={key} name={key} from={START[key]} durationInFrames={SCENES[key].duration}>
            <Scene />
          </Sequence>
        );
      })}
      <Grain />
      <Soundtrack />
    </AbsoluteFill>
  );
}
