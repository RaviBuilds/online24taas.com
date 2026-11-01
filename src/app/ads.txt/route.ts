// ads.txt must contain the exact lines shown in the owner's AdSense account (Sites > ads.txt).
// They are supplied through the ADS_TXT environment variable (use \n for line breaks) so nothing is invented here.
// Until it is set the route answers 404, which is what AdSense expects from a site without an ads.txt file.
export const dynamic = 'force-dynamic';

export function GET() {
  const raw = process.env.ADS_TXT?.trim();
  if (!raw) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const body = raw.replace(/\\n/g, '\n').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join('\n') + '\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
