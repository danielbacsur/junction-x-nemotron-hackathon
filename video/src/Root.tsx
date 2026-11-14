import { Composition } from 'remotion';
import { Main } from './Main';
import { HEIGHT, WIDTH } from './theme';
import { FPS, TOTAL } from './timeline';

export const Root = () => (
  <Composition
    id="LookoutDemo"
    component={Main}
    durationInFrames={TOTAL}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
