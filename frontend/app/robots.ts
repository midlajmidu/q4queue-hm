import { MetadataRoute } from 'next';
import { config } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard/',
        '/admin/',
        '/login/',
        '/super-admin/',
        '/register/',
      ],
    },
    sitemap: `${config.landingUrl ? config.landingUrl.replace(/\/$/, '') : 'https://www.q4queue.com'}/sitemap.xml`,
  };
}
