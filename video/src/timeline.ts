import manifest from './vo.json';

export const FPS = 60;
const frames = (seconds: number) => Math.round(seconds * FPS);

// Each scene lasts as long as its voiceover line, plus a lead-in and a tail.
const order = [
  { id: 'hook', lead: 0.55, tail: 0.35 },
  { id: 'problem', lead: 0.35, tail: 0.35 },
  { id: 'reveal', lead: 0.45, tail: 0.35 },
  { id: 'skill', lead: 0.35, tail: 0.95 },
  { id: 'watch', lead: 0.35, tail: 0.6 },
  { id: 'alert', lead: 0.35, tail: 0.9 },
  { id: 'edit', lead: 0.3, tail: 0.75 },
  { id: 'cards', lead: 0.12, tail: 0.3 },
  { id: 'business', lead: 0.35, tail: 0.45 },
  { id: 'end', lead: 0.7, tail: 2.3 },
] as const;

export type SceneId = (typeof order)[number]['id'];
type Word = { w: string; s: number; e: number };
type Line = { text: string; file: string; duration: number; words: Word[] };
export type Scene = {
  id: SceneId;
  from: number;
  duration: number;
  lead: number;
  file: string;
  voice: number;
  words: Word[];
};

const lines = manifest as Record<SceneId, Line>;
let cursor = 0;
export const scenes = Object.fromEntries(
  order.map(({ id, lead, tail }) => {
    const line = lines[id];
    const scene: Scene = {
      id,
      from: cursor,
      duration: frames(lead + line.duration + tail),
      lead: frames(lead),
      file: line.file,
      voice: frames(line.duration),
      words: line.words,
    };
    cursor += scene.duration;
    return [id, scene];
  }),
) as Record<SceneId, Scene>;

export const sceneList = order.map(({ id }) => scenes[id]);
export const TOTAL = cursor;

// The scene-local frame at which a spoken word starts. `match` is the word's
// first letters, and `nth` picks between repeats.
export function said(id: SceneId, match: string, nth = 0): number {
  const scene = scenes[id];
  const found = scene.words.filter((word) =>
    word.w.replace(/^["“]/, '').startsWith(match),
  )[nth];
  if (!found) throw new Error(`"${match}" is not spoken in ${id}`);
  return scene.lead + frames(found.s);
}
