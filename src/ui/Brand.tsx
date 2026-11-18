import * as si from 'simple-icons';
import { Icon, type IconName } from './Icon';

/*
 * Real brand icons (simple-icons, CC0) for tools and networks. Names the library
 * no longer carries (AWS, LinkedIn) get a neutral drawn icon, never a look-alike.
 */
type SI = { path: string; hex: string; title: string };
const map: Record<string, SI | IconName> = {
  C: si.siC,
  'C++': si.siCplusplus,
  Java: si.siOpenjdk,
  JavaScript: si.siJavascript,
  TypeScript: si.siTypescript,
  HTML5: si.siHtml5,
  CSS3: si.siCss,
  'React.js': si.siReact,
  React: si.siReact,
  'Next.js': si.siNextdotjs,
  Vite: si.siVite,
  'Tailwind CSS': si.siTailwindcss,
  'Node.js': si.siNodedotjs,
  NestJS: si.siNestjs,
  'Express.js': si.siExpress,
  PostgreSQL: si.siPostgresql,
  MySQL: si.siMysql,
  MongoDB: si.siMongodb,
  Elasticsearch: si.siElasticsearch,
  Docker: si.siDocker,
  Git: si.siGit,
  GitHub: si.siGithub,
  Postman: si.siPostman,
  Instagram: si.siInstagram,
  AWS: 'cloud',
  LinkedIn: 'briefcase',
  '3D': 'cube',
  'E-commerce': 'store',
  AI: 'bolt',
};

/** Dark brand colours (Next.js, Express, GitHub) would vanish on the dark panels. */
function readable(hex: string) {
  const n = parseInt(hex, 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l < 0.32 ? 'var(--ink)' : `#${hex}`;
}

export function Brand({ name, size = 16 }: { name: string; size?: number }) {
  const icon = map[name];
  if (!icon) return null;
  if (typeof icon === 'string') return <Icon name={icon} className="icon brand-icon" />;
  return (
    <svg className="brand-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={icon.path} fill={readable(icon.hex)} />
    </svg>
  );
}
