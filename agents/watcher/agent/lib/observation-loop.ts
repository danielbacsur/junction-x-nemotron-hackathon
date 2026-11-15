import type { Analysis, Frame } from './contracts';
import { reviewInterval } from '../tools/review-footage';
export async function observeFrames(
  frames: Frame[],
  send: (
    frames: Frame[],
    previous?: Analysis,
    reviewed?: boolean,
  ) => Promise<Analysis>,
  review: (start: number, end: number) => Promise<Frame[]>,
) {
  let result = await send(frames);
  if (result.verdict.request.needed) {
    const interval = reviewInterval(
      result.verdict.request,
      frames.at(-1)!.time,
    );
    if (interval) {
      const dense = await review(interval.start, interval.end);
      frames = [
        ...new Map([...frames, ...dense].map((f) => [f.id, f])).values(),
      ].sort((a, b) => a.time - b.time);
      if (frames.length > 40)
        frames = frames.filter(
          (_, i) => i % Math.ceil(frames.length / 40) === 0,
        );
      const next = await send(frames, result, true);
      next.cost += result.cost;
      next.latencyMs += result.latencyMs;
      next.inputTokens += result.inputTokens;
      next.outputTokens += result.outputTokens;
      result = next;
    }
  }
  return { result, frames };
}
