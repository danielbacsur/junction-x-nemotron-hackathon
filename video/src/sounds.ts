import { ALERT_CLICK, ALERT_IN, ALERT_PROOF } from './scenes/Alert';
import { BUSINESS_CARDS } from './scenes/Business';
import { CARD_STARTS } from './scenes/Cards';
import {
  EDIT_SELECT,
  EDIT_TYPE_FROM,
  EDIT_TYPE_TO,
  EDIT_UPDATED,
} from './scenes/Edit';
import { END_CTA } from './scenes/End';
import { HOOK_TYPE_FROM, HOOK_TYPE_TO } from './scenes/Hook';
import { SKILL_SAVE, SKILL_TYPE_FROM, SKILL_TYPE_TO } from './scenes/Skill';
import {
  WATCH_CLOSER,
  WATCH_LEAVE,
  WATCH_THUMBS,
  WATCH_UNCLEAR,
  WATCH_VERIFIED,
} from './scenes/Watch';
import { said, scenes, type SceneId } from './timeline';

// False renders without the music bed (public/audio/music.mp3).
export const MUSIC = true;

export type Sound = {
  name:
    | 'typing'
    | 'click'
    | 'tick'
    | 'whoosh'
    | 'impact'
    | 'alert'
    | 'success'
    | 'rewind'
    | 'riser';
  at: number;
  volume: number;
  length?: number;
  rate?: number;
  skip?: number;
};

// Every effect is placed on the frame of the motion it belongs to.
const cue = (
  id: SceneId,
  frame: number,
  name: Sound['name'],
  volume: number,
  more: Partial<Sound> = {},
): Sound => ({
  name,
  at: scenes[id].from + Math.max(0, frame),
  volume,
  ...more,
});

export const sounds: Sound[] = [
  // Hook: the rule is typed, then two verdicts land.
  cue('hook', HOOK_TYPE_FROM, 'typing', 0.34, {
    length: HOOK_TYPE_TO - HOOK_TYPE_FROM,
  }),
  cue('hook', said('hook', 'Obvious') - 6, 'whoosh', 0.3),
  cue('hook', said('hook', 'person') + 4, 'success', 0.35),
  cue('hook', said('hook', 'But') - 6, 'whoosh', 0.3),
  cue('hook', said('hook', 'train'), 'tick', 0.6, { rate: 0.55 }),

  // Problem: detector boxes, the rewind, the stamp.
  cue('problem', said('problem', 'No') + 2, 'tick', 0.4),
  cue('problem', said('problem', 'dataset') + 2, 'tick', 0.4, { rate: 1.15 }),
  cue('problem', said('problem', 'theft') - 4, 'tick', 0.6, { rate: 0.55 }),
  cue('problem', said('problem', 'tape') - 10, 'whoosh', 0.35),
  cue('problem', said('problem', 'reviewed') - 6, 'rewind', 0.42),
  cue('problem', said('problem', 'loss') + 14, 'impact', 0.5),
  cue('problem', scenes.problem.duration - 70, 'riser', 0.32),

  // Reveal
  cue('reveal', 2, 'impact', 0.68, { rate: 0.9 }),
  cue('reveal', said('reveal', 'A') - 4, 'whoosh', 0.28),

  // Skill: typed, saved.
  cue('skill', 0, 'whoosh', 0.3),
  cue('skill', SKILL_TYPE_FROM, 'typing', 0.34, {
    length: SKILL_TYPE_TO - SKILL_TYPE_FROM,
    skip: 20,
  }),
  cue('skill', SKILL_SAVE, 'click', 0.62),
  cue('skill', SKILL_SAVE + 6, 'success', 0.45),

  // Watch: frames are read, steps are judged, one moment gets a closer look.
  cue('watch', 0, 'whoosh', 0.3),
  ...WATCH_THUMBS.map((frame, i) =>
    cue('watch', frame, 'tick', 0.26, { rate: 1 + i * 0.03 }),
  ),
  cue('watch', WATCH_UNCLEAR, 'tick', 0.6, { rate: 0.55 }),
  cue('watch', WATCH_LEAVE, 'success', 0.4),
  cue('watch', WATCH_CLOSER, 'whoosh', 0.45),
  ...Array.from({ length: 8 }, (_, i) =>
    cue('watch', WATCH_CLOSER + 14 + i * 4, 'tick', 0.2, { rate: 1.5 }),
  ),
  cue('watch', WATCH_VERIFIED, 'success', 0.5),

  // Alert
  cue('alert', ALERT_IN, 'alert', 0.7),
  cue('alert', ALERT_PROOF[0], 'tick', 0.4),
  cue('alert', ALERT_PROOF[1], 'tick', 0.4, { rate: 1.15 }),
  cue('alert', ALERT_CLICK, 'click', 0.62),

  // Edit
  cue('edit', 0, 'whoosh', 0.3),
  cue('edit', EDIT_SELECT, 'tick', 0.3),
  cue('edit', EDIT_TYPE_FROM, 'typing', 0.34, {
    length: EDIT_TYPE_TO - EDIT_TYPE_FROM,
    skip: 90,
  }),
  cue('edit', EDIT_UPDATED, 'success', 0.5),

  // Cards: one hit per card.
  ...CARD_STARTS.map((frame, i) =>
    cue('cards', frame, 'impact', 0.55, { rate: [1, 1.1, 0.9][i] }),
  ),
  ...CARD_STARTS.map((frame) => cue('cards', frame - 5, 'whoosh', 0.3)),

  // Use cases
  ...BUSINESS_CARDS.map((frame, i) =>
    cue('business', frame, 'whoosh', 0.3, { rate: 1 + i * 0.06 }),
  ),
  ...BUSINESS_CARDS.map((frame, i) =>
    cue('business', frame + 8, 'tick', 0.35, { rate: 1 + i * 0.1 }),
  ),
  cue('business', said('business', 'write') - 4, 'success', 0.35),

  // End card
  cue('end', 0, 'whoosh', 0.4),
  cue('end', 2, 'impact', 0.4, { rate: 1.2 }),
  cue('end', END_CTA, 'click', 0.5),
];
