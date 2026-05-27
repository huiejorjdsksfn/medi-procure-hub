/**
 * ProcurBosse EdgeOne Worker v5 — DEFINITIVE SPA FIX
 *
 * Strategy:
 *   - Static assets (/assets/*, /icons/*, known extensions) → serve directly
 *   - Known static files (favicon, manifest, etc.) → serve directly  
 *   - auth-callback.html → serve directly
 *   - EVERYTHING ELSE → serve /index.html with status 200
 *
 * The app uses HashRouter: /dashboard → index.html loads → JS converts to /#/dashboard
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Known static files — serve directly, no rewrite
    const staticFiles = new Set([
      '/favicon.ico', '/favicon.png', '/icon.png', '/logo.png',
      '/manifest.json', '/robots.txt', '/sw.js', '/placeholder.svg',
      '/auth-callback.html', '/404.html'
    ]);

    if (staticFiles.has(path)) {
      try {
        return await env.ASSETS.fetch(request);
      } catch {
        return new Response('Not found', { status: 404 });
      }
    }

    // 2. Auth-callback without .html extension
    if (path === '/auth-callback') {
      try {
        return await env.ASSETS.fetch(
          new Request(new URL('/auth-callback.html', url.origin), request)
        );
      } catch {
        return new Response('Not found', { status: 404 });
      }
    }

    // 3. Static asset directories and file extensions → direct serve
    if (
      path.startsWith('/assets/') ||
      path.startsWith('/icons/') ||
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|json|txt|xml|pdf)$/.test(path)
    ) {
      try {
        return await env.ASSETS.fetch(request);
      } catch {
        return new Response('Asset not found', { status: 404 });
      }
    }

    // 4. EVERYTHING ELSE = SPA route → serve index.html, status 200
    //    This handles: /dashboard, /login, /requisitions, /admin/panel, etc.
    try {
      const indexResponse = await env.ASSETS.fetch(
        new Request(new URL('/index.html', url.origin), {
          method: 'GET',
          headers: { 'Accept': 'text/html' }
        })
      );
      return new Response(indexResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Frame-Options': 'SAMEORIGIN',
          'X-Content-Type-Options': 'nosniff',
          'X-Worker-Version': 'v5',
          'X-Routed-Path': path,
        }
      });
    } catch (err) {
      // Absolute fallback: inline redirect to root
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
        `<script>window.location.replace('/');<\/script>` +
        `</head><body>Loading...</body></html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }
  }
};
