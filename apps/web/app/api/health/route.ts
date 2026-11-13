export async function GET() {
  return Response.json({
    connected: !!process.env.AI_GATEWAY_API_KEY,
    provider: 'Vercel AI Gateway',
  });
}
