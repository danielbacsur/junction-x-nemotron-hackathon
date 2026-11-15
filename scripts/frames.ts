import { execFileSync } from 'node:child_process';
import type { Frame } from '../agents/watcher/agent/lib/contracts';

// Samples a fixture the way the studio samples a recording: twenty frames,
// evenly spaced and 768 pixels wide. Passing `end` cuts the recording short,
// as if it had stopped there.
export function sample(clip: string, end?: number, start = 0): Frame[] {
  const file = `apps/web/public/recordings/${clip}.mp4`;
  const duration = Number(
    execFileSync('ffprobe', [
      '-v',
      'quiet',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      file,
    ]).toString(),
  );
  const length = Math.min(end ?? duration, duration);
  const stop = length - 0.04;
  const count = 20;
  return Array.from({ length: count }, (_, i) => {
    const time = start + ((stop - start) * i) / (count - 1);
    const jpeg = execFileSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-ss',
        time.toFixed(3),
        '-i',
        file,
        '-frames:v',
        '1',
        '-vf',
        'scale=768:-1',
        '-q:v',
        '4',
        '-f',
        'image2pipe',
        '-c:v',
        'mjpeg',
        '-',
      ],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    return {
      id: `f-${Math.round(time * 1000)}`,
      time,
      image: 'data:image/jpeg;base64,' + jpeg.toString('base64'),
    };
  });
}
