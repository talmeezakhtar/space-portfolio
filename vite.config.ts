import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { createServer, defineConfig, type Plugin } from 'vite';
import { arcade, contact, education, faqs, profile, projects, skills } from './src/data/content.ts';

/**
 * The live address. Set SITE_URL in Vercel (Project → Settings → Environment
 * Variables) once the domain is final; until then Vercel's own production domain is
 * used automatically, and a local build falls back to the placeholder below.
 */
const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'https://talmeez-akhtar.vercel.app'
).replace(/\/$/, '');

const abs = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
const today = new Date().toISOString().slice(0, 10);

const person = {
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: profile.name,
  jobTitle: profile.role,
  description: profile.summary,
  image: abs('/talmeez.jpg'),
  email: `mailto:${contact.email}`,
  url: `${SITE_URL}/`,
  sameAs: [...contact.links.map((l) => l.url), 'https://talmeezakhtar.github.io/'],
  alumniOf: { '@type': 'CollegeOrUniversity', name: education[0].school, address: education[0].place },
  knowsAbout: skills.flatMap((g) => g.items),
  seeks: { '@type': 'Demand', description: 'Internships, freelance work and collaborations' },
};

const works = [...projects, ...arcade].map((p) => ({
  '@type': 'CreativeWork',
  name: p.name,
  url: p.url,
  description: p.blurb,
  image: abs(`/shots/${p.id}.jpg`),
  creator: { '@id': `${SITE_URL}/#person` },
  ...('tags' in p ? { keywords: p.tags.join(', ') } : {}),
}));

function jsonLd(page: 'home' | 'classic') {
  const graph: object[] = [
    person,
    { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, url: `${SITE_URL}/`, name: `${profile.name} · Flight Log`, author: { '@id': `${SITE_URL}/#person` } },
    {
      '@type': 'ProfilePage',
      url: page === 'home' ? `${SITE_URL}/` : `${SITE_URL}/classic/`,
      name: page === 'home' ? `${profile.name} · Interactive portfolio` : `${profile.name} · Portfolio (plain version)`,
      mainEntity: { '@id': `${SITE_URL}/#person` },
      dateModified: today,
    },
    { '@type': 'ItemList', name: 'Projects and games', itemListElement: works.map((w, i) => ({ '@type': 'ListItem', position: i + 1, item: w })) },
  ];
  if (page === 'classic')
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

const robots = `# Everyone is welcome: search engines and AI answer engines alike.
User-agent: *
Allow: /

Sitemap: ${abs('/sitemap.xml')}
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
    <image:image><image:loc>${abs('/og.jpg')}</image:loc></image:image>
  </url>
  <url>
    <loc>${SITE_URL}/classic/</loc>
    <lastmod>${today}</lastmod>
    <priority>0.9</priority>
${works.map((w) => `    <image:image><image:loc>${w.image}</image:loc></image:image>`).join('\n')}
  </url>
</urlset>
`;

const llms = `# ${profile.name}

> ${profile.summary} ${profile.status}: ${profile.pitch}

This site is an interactive 3D portfolio (a small solar system you fly through). The same content as plain text is at ${abs('/classic/')}.

## About
- Role: ${profile.role}
- Education: ${education.map((e) => `${e.title}, ${e.school} (${e.years}, ${e.score})`).join('; ')}
- Contact: ${contact.email}
- Résumé: ${contact.resume}
${contact.links.map((l) => `- ${l.label}: ${l.url}`).join('\n')}

## Skills
${skills.map((g) => `- ${g.group}: ${g.items.join(', ')}`).join('\n')}

## Projects
${projects.map((p) => `- [${p.name}](${p.url}): ${p.blurb} (${p.tags.join(', ')})`).join('\n')}

## Games
${arcade.map((a) => `- [${a.name}](${a.url}): ${a.blurb}`).join('\n')}

## Quick answers
${faqs.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}
`;

/** SEO, GEO and AEO files, generated from src/data/content.ts so they never drift. */
function seo(): Plugin {
  let outDir = 'dist';
  return {
    name: 'portfolio-seo',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_URL%', SITE_URL).replace('</head>', `    ${jsonLd('home')}\n  </head>`);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llms });
    },
    // Pre-render /classic/ to static HTML: real content for crawlers, no JavaScript needed.
    async closeBundle() {
      if (process.env.SKIP_PRERENDER) return;
      const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
      try {
        const { renderToString } = await import('react-dom/server');
        const { createElement } = await import('react');
        const { default: Classic } = await server.ssrLoadModule('/src/ui/Classic.tsx');
        const body = renderToString(createElement(Classic));
        const title = `${profile.name} · Full Stack Developer · Portfolio`;
        const page = readFileSync(resolve(outDir, 'index.html'), 'utf8')
          .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
          .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${SITE_URL}/classic/" />`)
          .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${SITE_URL}/classic/" />`)
          .replace(/<script type="application\/ld\+json">.*?<\/script>/s, jsonLd('classic'))
          // the plain page skips the first-visit loader
          .replace(/<script>\s*try \{\s*if \(!sessionStorage[\s\S]*?<\/script>/, '')
          .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
        mkdirSync(resolve(outDir, 'classic'), { recursive: true });
        writeFileSync(resolve(outDir, 'classic/index.html'), page);
      } finally {
        await server.close();
      }
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), seo()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
