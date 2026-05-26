/**
 * ProcurBosse - EdgeOne Edge Worker v4
 * CRITICAL FIX: Always serve index.html for non-asset routes
 * Hash router app: /dashboard → serve index.html → JS redirects to /#/dashboard
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve auth-callback.html directly
    if (path === '/auth-callback' || path === '/auth-callback.html') {
      try {
        const resp = await env.ASSETS.fetch(new Request(new URL('/auth-callback.html', url.origin), request));
        return new Response(resp.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      } catch {}
    }

    // Static assets — serve directly with cache headers
    const isAsset = (
      path.startsWith('/assets/') ||
      path.startsWith('/icons/') ||
      path === '/favicon.ico' ||
      path === '/favicon.png' ||
      path === '/icon.png' ||
      path === '/logo.png' ||
      path === '/manifest.json' ||
      path === '/robots.txt' ||
      path === '/sw.js' ||
      path === '/placeholder.svg' ||
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp)$/.test(path)
    );

    if (isAsset) {
      try {
        return await env.ASSETS.fetch(request);
      } catch {
        return new Response('Asset not found', { status: 404 });
      }
    }

    // ALL other requests (SPA routes like /dashboard, /procurement, etc.)
    // → serve index.html with status 200 (NOT a redirect)
    // The hash-redirect script inside index.html will convert /dashboard → /#/dashboard
    try {
      const indexReq = new Request(new URL('/index.html', url.origin), {
        method: 'GET',
        headers: request.headers,
      });
      const response = await env.ASSETS.fetch(indexReq);
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Content-Type-Options': 'nosniff',
          'X-Served-By': 'ProcurBosse-Worker-v4',
        },
      });
    } catch (e) {
      // Absolute last resort
      return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><script>window.location.href='/';<\/script></head><body></body></html>`, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  },
};
