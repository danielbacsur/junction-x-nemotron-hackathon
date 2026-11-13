import { requestSchema } from '@agent/lib/contracts';
import { callModel } from '@agent/lib/model';
export const maxDuration = 300;
export async function POST(req: Request) {
  try {
    const input = requestSchema.safeParse(await req.json());
    if (!input.success)
      return Response.json(
        { error: 'Invalid observation. Provide 1–40 JPEG frames and a skill.' },
        { status: 400 },
      );
    const result = await callModel(input.data);
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Analysis failed' },
      { status: 502 },
    );
  }
}
