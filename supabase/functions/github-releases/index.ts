/**
 * EL5 MediProcure — github-releases edge function
 * Proxies GitHub Releases API so the PAT stays server-side.
 * Deploy with: supabase secrets set GITHUB_PAT=<your-token>
 *
 * GET  /github-releases          → list releases (max 30)
 * GET  /github-releases?tag=vX   → single release by tag
 * GET  /github-releases?page=N   → page N
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const GH_TOKEN = Deno.env.get("GITHUB_PAT") ?? "";
const GH_REPO  = "huiejorjdsksfn/medi-procure-hub";
const GH_API   = `https://api.github.com/repos/${GH_REPO}`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const url  = new URL(req.url);
    const tag  = url.searchParams.get("tag");
    const page = url.searchParams.get("page") || "1";

    const endpoint = tag
      ? `${GH_API}/releases/tags/${encodeURIComponent(tag)}`
      : `${GH_API}/releases?per_page=30&page=${page}`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "EL5-MediProcure/11",
    };
    if (GH_TOKEN) headers["Authorization"] = `token ${GH_TOKEN}`;

    const ghRes = await fetch(endpoint, { headers });

    if (!ghRes.ok) {
      const err = await ghRes.text();
      return json({ error: "GitHub API error", detail: err }, ghRes.status);
    }

    const data = await ghRes.json();

    const slim = (r: Record<string, unknown>) => ({
      id:           r.id,
      tag_name:     r.tag_name,
      name:         r.name,
      published_at: r.published_at,
      prerelease:   r.prerelease,
      draft:        r.draft,
      body:         r.body,
      html_url:     r.html_url,
      assets: ((r.assets as any[]) || []).map((a: Record<string, unknown>) => ({
        id:                   a.id,
        name:                 a.name,
        size:                 a.size,
        download_count:       a.download_count,
        browser_download_url: a.browser_download_url,
        content_type:         a.content_type,
        created_at:           a.created_at,
      })),
    });

    return json(Array.isArray(data) ? data.map(slim) : slim(data));
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
