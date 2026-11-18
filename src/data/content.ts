// Single source of truth for all portfolio content.
// Every planet panel, the /classic page and the SEO files (vite.config.ts) read from here.

// Also imported by vite.config.ts at build time, where import.meta.env does not exist.
const BASE = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

export const profile = {
  name: 'Talmeez Akhtar',
  role: 'Full Stack Developer',
  status: 'Available to hire',
  pitch: 'Open to internships, freelance work and collaborations.',
  photo: `${BASE}talmeez.jpg`,
  summary:
    'Talmeez Akhtar is a full-stack developer who builds web apps with React, Next.js, NestJS and PostgreSQL, from the database to the interface, including interactive and 3D web experiences.',
};

/** What I do: each line names the projects that prove it. Draft copy: edit freely. */
export const services = [
  {
    icon: 'code',
    title: 'Full-stack web apps',
    text: 'React and Next.js front-ends on NestJS or Express APIs, backed by PostgreSQL or MongoDB. One person who can carry a feature from the database to the button.',
    proof: ['bunakar', 'unslog'],
  },
  {
    icon: 'cube',
    title: 'Interactive and 3D experiences',
    text: 'Interfaces people remember: a playable 3D basketball court, a conveyor-belt menu, and the 3D solar system this portfolio lives in.',
    proof: ['crimson-claws', 'sushi'],
  },
  {
    icon: 'store',
    title: 'Stores and product sites',
    text: 'Fast, phone-first storefronts and product pages, including a bilingual English and Arabic shop with sizing and delivery details built in.',
    proof: ['tessara', 'wick-and-web'],
  },
] as const;

/** How I work. Draft copy: edit freely. */
export const process = [
  { icon: 'search', title: 'Understand', text: 'Start with who uses it and on what device. Most people arrive on a phone, so the small screen comes first.' },
  { icon: 'pen', title: 'Design', text: 'Map the flow, set the type and colour system, and prototype the risky parts before building them for real.' },
  { icon: 'code', title: 'Build', text: 'TypeScript end to end, small components, and a performance budget checked on an actual phone.' },
  { icon: 'rocket', title: 'Ship and refine', text: 'Deploy early, watch how people really use it, and fix what they trip over.' },
] as const;

export const oldSite = 'https://talmeezakhtar.github.io/';

export const contact = {
  email: 'talmeezmzp@gmail.com',
  resume: 'https://talmeezakhtar.github.io/assets/Talmeez_Akhtar_Resume.pdf',
  links: [
    { label: 'GitHub', url: 'https://github.com/talmeezakhtar' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/talmeez-akhtar-308870242/' },
    { label: 'Instagram', url: 'https://www.instagram.com/akhtartalmeez/' },
  ],
};

export const education = [
  {
    level: 'Undergraduate',
    title: 'B.Tech, Information Technology',
    school: 'RCC Institute of Information Technology',
    place: 'Kolkata, West Bengal',
    years: '2021 – 2025',
    score: 'CGPA 8.78',
  },
  {
    level: 'Class XII',
    title: 'AISSCE',
    school: 'Daffodils Public School',
    place: 'Mirzapur, Uttar Pradesh',
    years: '2020 – 2021',
    score: '83.6%',
  },
  {
    level: 'Class X',
    title: 'AISSE',
    school: 'Daffodils Public School',
    place: 'Mirzapur, Uttar Pradesh',
    years: '2018 – 2019',
    score: '84.8%',
  },
];

export const skills = [
  { group: 'Languages', color: '#e3e2da', items: ['C', 'C++', 'Java', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3'] },
  { group: 'Frontend', color: '#9fc7b8', items: ['React.js', 'Next.js', 'Vite', 'Tailwind CSS'] },
  { group: 'Backend', color: '#d8c3a0', items: ['Node.js', 'NestJS', 'Express.js'] },
  { group: 'Databases', color: '#8fa9b8', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'Elasticsearch'] },
  { group: 'Cloud & Tools', color: '#a7b38f', items: ['AWS', 'Docker', 'Git', 'GitHub', 'Postman'] },
];

export interface Project {
  id: string;
  name: string;
  blurb: string;
  tags: string[];
  url: string;
  featured: boolean;
  color: string;
}

export const projects: Project[] = [
  {
    id: 'bunakar',
    name: 'Bunakar',
    blurb: 'Full-stack rug design studio with tile-based and freeform editors, real-room previews and tufting exports.',
    tags: ['React', 'NestJS', 'PostgreSQL'],
    url: 'https://bunakar.vercel.app/',
    featured: true,
    color: '#c98a5a',
  },
  {
    id: 'crimson-claws',
    name: 'Crimson Claws',
    blurb: 'Basketball club site with a playable 3D half-court in the browser, plus roster, schedule, tickets and shop.',
    tags: ['Next.js', '3D', 'Interactive'],
    url: 'https://crimson-claws.vercel.app/',
    featured: true,
    color: '#b8504a',
  },
  {
    id: 'unslog',
    name: 'Unslog',
    blurb: 'AI copilot that scores, ranks and tracks job postings so the search stops being a slog.',
    tags: ['Next.js', 'TypeScript', 'AI'],
    url: 'https://unslog.vercel.app/',
    featured: true,
    color: '#8fb0a0',
  },
  {
    id: 'tessara',
    name: 'Tessara',
    blurb: 'Everyday clothing store for the UAE: English/Arabic, size finder, cash on delivery and WhatsApp support.',
    tags: ['E-commerce', 'EN / AR', 'Responsive'],
    url: 'https://tessara-gules.vercel.app/',
    featured: true,
    color: '#d9c9a8',
  },
  {
    id: 'reading-room',
    name: 'The Reading Room',
    blurb: 'Web e-reader and library: shelves, notes, bookmarks, Paper/Sepia/Night themes and daily reading streaks.',
    tags: ['Web app', 'Reader', 'Themes'],
    url: 'https://readingroom-library.vercel.app/',
    featured: true,
    color: '#7f95b5',
  },
  {
    id: 'sushi',
    name: 'Sushi',
    blurb: 'Kaiten-style sushi restaurant concept with an animated conveyor-belt menu.',
    tags: ['Next.js', 'Tailwind CSS'],
    url: 'https://sushi-sigma-wheat.vercel.app/',
    featured: false,
    color: '#d9a1a1',
  },
  {
    id: 'wick-and-web',
    name: 'Wick & Web',
    blurb: 'Candle-and-mug shop concept with a cobweb-strewn hero and a spider mascot.',
    tags: ['Next.js', 'Tailwind CSS'],
    url: 'https://wick-and-web.vercel.app/',
    featured: false,
    color: '#c27a3a',
  },
];

/** Screenshot of a live project (public/shots, captured 5 s after load). */
export const shot = (id: string) => `${BASE}shots/${id}.jpg`;

export const arcade = [
  {
    id: 'color-cadence',
    name: 'Color-Cadence',
    blurb: 'Simon-style memory game. How long a sequence can you hold?',
    url: 'https://talmeezakhtar.github.io/Color-Cadence/',
  },
  {
    id: 'drum-kit',
    name: 'Drum Kit',
    blurb: 'Playable browser drum kit: six pads, click or use your keyboard.',
    url: 'https://talmeezakhtar.github.io/DrumKit/',
  },
  {
    id: 'brush-the-cat',
    name: 'Brush the Cat',
    blurb: "Brush the cat while he isn't looking. Keep stroking to build a purr combo up to ×5, but don't get caught.",
    url: 'https://brush-the-cat-game.vercel.app/',
  },
];

/** 3D models: CC BY 4.0 requires visible credit. */
export const credits = [
  { what: 'Space Shuttle Discovery', who: 'source to confirm', url: '' },
  { what: 'Space Station 3', who: 're1monsen', url: 'https://sketchfab.com/re1monsen' },
  { what: 'Planet Earth', who: 'Serafim123', url: 'https://sketchfab.com/Serafim123' },
  { what: 'Theia Prime C, E, F, G', who: 'ADITYA 3D (aditya299792)', url: 'https://sketchfab.com/aditya299792' },
  { what: 'Satellite', who: 'cdfd', url: 'https://sketchfab.com/cdfd' },
  { what: 'Need some space? (galaxy)', who: 'Loïc Norgeot', url: 'https://sketchfab.com/norgeotloic' },
];

/** Short answers, shown on the /classic page and published as FAQ structured data. */
export const faqs = [
  {
    q: 'What does Talmeez Akhtar do?',
    a: 'He is a full-stack developer. He builds web apps end to end: React and Next.js front-ends, NestJS and Express APIs, and PostgreSQL or MongoDB databases, plus interactive and 3D experiences like this portfolio.',
  },
  {
    q: 'Which technologies does he work with?',
    a: `${skills.map((g) => `${g.group}: ${g.items.join(', ')}`).join('. ')}.`,
  },
  {
    q: 'What has he built?',
    a: `${projects.map((p) => p.name).join(', ')}. Each is live on the web and described on this site.`,
  },
  {
    q: 'Where did he study?',
    a: 'B.Tech in Information Technology at RCC Institute of Information Technology, Kolkata (2021 to 2025), with a CGPA of 8.78.',
  },
  {
    q: 'Is he available for work, and how do I reach him?',
    a: `Yes: internships, freelance work and collaborations. Email ${'talmeezmzp@gmail.com'}, or find him on GitHub and LinkedIn.`,
  },
];
