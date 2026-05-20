/**
 * ProcurBosse - EdgeOne Edge Worker v3
 * Handles SPA routing at CDN edge level
 * All non-asset requests → /index.html (200, not redirect)
 * This is the most reliable fix for Tencent EdgeOne 404 on refresh
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Static assets - serve directly
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
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json|txt|xml|webp)$/.test(path)
    );

    if (isAsset) {
      // Serve the asset as-is
      try {
        return await env.ASSETS.fetch(request);
      } catch {
        return new Response('Not found', { status: 404 });
      }
    }

    // All other requests (SPA routes) → serve index.html with 200
    const indexRequest = new Request(new URL('/index.html', url.origin), request);
    try {
      const response = await env.ASSETS.fetch(indexRequest);
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch {
      // Final fallback - try to serve whatever is at root
      return env.ASSETS.fetch(new Request(new URL('/', url.origin), request));
    }
  },
};
