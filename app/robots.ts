import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// AI training crawlers are refused; search engines may crawl the public pages.
const AI_TRAINING_BOTS = [
  'GPTBot',
  'CCBot',
  'Google-Extended',
  'ClaudeBot',
  'anthropic-ai',
  'Applebot-Extended',
  'Bytespider',
  'meta-externalagent',
  'cohere-training-data-crawler',
  'AI2Bot',
  'Ai2Bot-Dolma',
  'img2dataset',
  'Diffbot',
  'Omgilibot',
  'omgili',
  'ImagesiftBot',
  'Timpibot',
  'PanguBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_TRAINING_BOTS, disallow: '/' },
      { userAgent: '*', allow: '/', disallow: ['/api/', '/my'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
