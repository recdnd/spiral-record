import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Static public routes only. Fragment pages (/f/[id], /meta/[meta_id]) are reached via /feed and /meta.
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/feed', '/meta', '/verify'].map((path) => ({
    url: `${SITE_URL}${path}`,
  }));
}
