export function reviewInterval(
  request: { start: number; end: number },
  duration: number,
) {
  const start = Math.max(0, Math.min(request.start, duration));
  const end = Math.max(start, Math.min(request.end, duration));
  return end - start >= 0.1 ? { start, end } : null;
}
