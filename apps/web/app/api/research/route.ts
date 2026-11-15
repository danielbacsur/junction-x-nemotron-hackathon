import { z } from 'zod';
import { research } from '@agent/lib/research';
export const maxDuration = 180;
export async function POST(req: Request) {
  try {
    const { task } = z
      .object({ task: z.string().min(10).max(1000) })
      .parse(await req.json());
    return Response.json(await research(task));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Research failed' },
      { status: 502 },
    );
  }
}
