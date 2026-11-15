import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET() {
  const defs = [
    ['pack', 'Pack & put away'],
    ['repack', 'Unpack & repack'],
    ['orientation', 'Orient & hold'],
    ['theft', 'Concealment review'],
    ['packing-alert', 'Incomplete packing alert'],
    ['guard', 'Machine guard review'],
  ];
  return Response.json(
    await Promise.all(
      defs.map(async ([id, name]) => ({
        id,
        name,
        markdown: await readFile(
          path.resolve(
            process.cwd(),
            '../../agents/watcher/agent/skills',
            id + '.md',
          ),
          'utf8',
        ),
      })),
    ),
  );
}
