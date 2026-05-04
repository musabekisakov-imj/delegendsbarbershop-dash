import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delegendsbarbershop.lt';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /b/[id] is a private "manage my booking" surface reachable only via
        // the UUID in the confirmation email. /book/confirmation reads from
        // sessionStorage and has no public address worth indexing.
        disallow: ['/b/', '/book/confirmation'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
