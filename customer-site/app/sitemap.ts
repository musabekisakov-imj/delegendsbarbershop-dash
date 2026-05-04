import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delegendsbarbershop.lt';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ['', '/services', '/team', '/locations', '/story', '/faq', '/gift-cards', '/book', '/privacy', '/terms'];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/services' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/book' ? 0.9 : 0.7,
  }));
}
