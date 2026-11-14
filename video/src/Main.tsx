import type { FC } from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  interpolate,
  staticFile,
} from 'remotion';
import { clamp } from './anim';
import { Backdrop } from './components/ui';
import { Alert } from './scenes/Alert';
import { Business } from './scenes/Business';
import { Cards } from './scenes/Cards';
import { Edit } from './scenes/Edit';
import { End } from './scenes/End';
import { Hook } from './scenes/Hook';
import { Problem } from './scenes/Problem';
import { Reveal } from './scenes/Reveal';
import { Skill } from './scenes/Skill';
import { Watch } from './scenes/Watch';
import { MUSIC, sounds } from './sounds';
import { C } from './theme';
import { TOTAL, sceneList, type SceneId } from './timeline';

const components: Record<SceneId, FC> = {
  hook: Hook,
  problem: Problem,
  reveal: Reveal,
  skill: Skill,
  watch: Watch,
  alert: Alert,
  edit: Edit,
  cards: Cards,
  business: Business,
  end: End,
};

// Everything is mixed 6 dB down to leave headroom; scripts/master.mjs brings
// the finished file back up to broadcast loudness.
const GAIN = 0.5;
// Music sits low under the voice and comes up in the gaps and on the end card.
const UNDER = 0.2 * GAIN;
const OPEN = 0.46 * GAIN;
const musicVolume = (frame: number) => {
  let level = OPEN;
  for (const scene of sceneList) {
    const start = scene.from + scene.lead;
    const end = start + scene.voice;
    const distance =
      frame < start ? start - frame : frame > end ? frame - end : 0;
    level = Math.min(
      level,
      interpolate(distance, [0, 30], [UNDER, OPEN], clamp),
    );
  }
  const fadeIn = interpolate(frame, [0, 40], [0, 1], clamp);
  const fadeOut = interpolate(frame, [TOTAL - 80, TOTAL - 4], [1, 0], clamp);
  return level * fadeIn * fadeOut;
};

export const Main = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Backdrop />
    {sceneList.map((scene) => {
      const Component = components[scene.id];
      return (
        <Sequence
          key={scene.id}
          name={scene.id}
          from={scene.from}
          durationInFrames={scene.duration}
        >
          <Component />
        </Sequence>
      );
    })}

    {MUSIC ? (
      <Html5Audio src={staticFile('audio/music.mp3')} volume={musicVolume} />
    ) : null}
    {sceneList.map((scene) => (
      <Sequence
        key={scene.id}
        name={`voice: ${scene.id}`}
        from={scene.from + scene.lead}
      >
        <Html5Audio src={staticFile(scene.file)} volume={GAIN} />
      </Sequence>
    ))}
    {sounds.map((sound, i) => (
      <Sequence
        key={i}
        name={sound.name}
        from={sound.at}
        durationInFrames={sound.length}
      >
        <Html5Audio
          src={staticFile(`audio/sfx/${sound.name}.mp3`)}
          trimBefore={sound.skip}
          playbackRate={sound.rate ?? 1}
          volume={(frame) =>
            sound.length
              ? sound.volume *
                GAIN *
                interpolate(
                  frame,
                  [sound.length - 8, sound.length],
                  [1, 0],
                  clamp,
                )
              : sound.volume * GAIN
          }
        />
      </Sequence>
    ))}
  </AbsoluteFill>
);
