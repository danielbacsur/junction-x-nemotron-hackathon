import type { Frame } from '@agent/lib/contracts';
export async function extractFrames(
  src: string,
  start = 0,
  end?: number,
  count = 18,
  onProgress?: (n: number) => void,
): Promise<Frame[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.src = src;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () =>
      reject(new Error('This video cannot be decoded. Try an MP4 recording.'));
  });
  // MediaRecorder WebM files may omit duration until the decoder seeks to EOF.
  if (!Number.isFinite(video.duration)) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              'Could not read recording duration. Try exporting as MP4.',
            ),
          ),
        10000,
      );
      video.onseeked = () => {
        clearTimeout(timer);
        resolve();
      };
      video.currentTime = 1e10;
    });
  }
  if (video.duration > 120) {
    video.removeAttribute('src');
    video.load();
    throw new Error(
      'Use a recording up to two minutes long for this prototype.',
    );
  }
  const stop = Math.min(end ?? video.duration, video.duration) - 0.04;
  if (!Number.isFinite(stop) || stop <= start)
    throw new Error('The recording has no usable duration.');
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = Math.round((video.videoHeight / video.videoWidth) * 768);
  const ctx = canvas.getContext('2d')!;
  const result: Frame[] = [];
  try {
    for (let i = 0; i < count; i++) {
      const time = start + ((stop - start) * i) / Math.max(1, count - 1);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Video seek timed out.')),
          10000,
        );
        video.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        video.currentTime = Math.max(0.001, time);
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      result.push({
        id: `f-${Math.round(time * 1000)}`,
        time,
        image: canvas.toDataURL('image/jpeg', 0.72),
      });
      onProgress?.(Math.round(((i + 1) / count) * 100));
    }
    return result;
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}
export function cameraFrame(video: HTMLVideoElement, time: number): Frame {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = Math.round((video.videoHeight / video.videoWidth) * 768) || 512;
  c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height);
  return {
    id: `f-${Math.round(time * 1000)}`,
    time,
    image: c.toDataURL('image/jpeg', 0.72),
  };
}
