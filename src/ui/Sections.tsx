import { useEffect, useState } from 'react';
import { arcade, contact, education, process, profile, projects, services, shot, skills } from '../data/content';
import type { SectionId } from '../data/world';
import { ROUTE } from '../data/world';
import { ACHIEVEMENTS } from '../game/achievements';
import { useGame } from '../game/store';
import { Brand } from './Brand';
import { Icon, type IconName } from './Icon';

const Ext = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
    {children}
  </a>
);

const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;

export function Home() {
  return (
    <>
      <div className="who">
        <img className="avatar" src={profile.photo} alt={profile.name} width={64} height={64} />
        <p className="lead" style={{ margin: 0 }}>
          I&apos;m <strong>{profile.name}</strong>, a full-stack developer. I build web apps from the database to the
          interface, and I like making them feel good to use.
        </p>
      </div>
      <p className="status" style={{ marginTop: 14 }}>
        <span className="dot" /> {profile.status}. {profile.pitch}
      </p>
      <div className="row">
        <Ext className="btn" href={contact.resume}>
          <Icon name="file" /> Download résumé
        </Ext>
        <a className="btn ghost" href={`mailto:${contact.email}`}>
          <Icon name="mail" /> Email me
        </a>
      </div>

      <section className="block">
        <h3 className="block-title">What I do</h3>
        <ul className="services">
          {services.map((s) => (
            <li key={s.title}>
              <span className="tile">
                <Icon name={s.icon as IconName} />
              </span>
              <div>
                <h4>{s.title}</h4>
                <p>{s.text}</p>
                <p className="proof">Seen in {s.proof.map(projectName).join(' and ')}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <h3 className="block-title">How I work</h3>
        <ol className="steps">
          {process.map((p, i) => (
            <li key={p.title}>
              <span className="step-n num">{i + 1}</span>
              <div>
                <h4>
                  <Icon name={p.icon as IconName} /> {p.title}
                </h4>
                <p>{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

export function Education() {
  return (
    <ol className="timeline">
      {education.map((e) => (
        <li key={e.level}>
          <span className="tl-years num">{e.years}</span>
          <h3>{e.title}</h3>
          <p className="tl-line">
            <Icon name="cap" /> {e.school}
          </p>
          <p className="tl-line">
            <Icon name="pin" /> {e.place}
          </p>
          <span className="score num">{e.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function Skills() {
  return (
    <div className="skills">
      {skills.map((s) => (
        <section key={s.group}>
          <h3>
            <span className="ring-dot" style={{ background: s.color }} /> {s.group}
          </h3>
          <ul className="tools">
            {s.items.map((i) => (
              <li key={i} className="tool">
                <Brand name={i} size={18} />
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="muted small">Each ring around the Forge is one of these groups.</p>
    </div>
  );
}

/**
 * Opens a live project only on a second, deliberate tap: the first tap arms it
 * ("Tap again to open") for 3 s, so a stray tap while scrolling never leaves the site.
 */
function SafeLink({ href, label }: { href: string; label: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn card-cta${armed ? '' : ' ghost'}`}
      aria-live="polite"
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
        } else setArmed(false);
      }}
    >
      {armed ? 'Tap again to open' : label} <Icon name="external" />
    </a>
  );
}

const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

interface CardProps {
  id: string;
  name: string;
  blurb: string;
  tags?: readonly string[];
  url: string;
  color?: string;
  action: string;
  focus?: boolean;
}

function Card({ id, name, blurb, tags, url, color, action, focus }: CardProps) {
  return (
    <article id={`card-${id}`} className={`card${focus ? ' focus' : ''}`} style={{ '--c': color ?? 'var(--accent)' } as React.CSSProperties}>
      <div className="browser">
        <div className="browser-bar" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>{host(url)}</span>
        </div>
        <div className="card-shot">
          <img src={shot(id)} alt={`${name} home page`} loading="lazy" decoding="async" width={960} height={600} />
        </div>
      </div>
      <div className="card-body">
        <div className="card-head">
          <span className="moon-dot" />
          <h3>{name}</h3>
        </div>
        <p>{blurb}</p>
        {tags && (
          <ul className="tools small-tools">
            {tags.map((t) => (
              <li key={t} className="tool">
                <Brand name={t} size={14} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
        <SafeLink href={url} label={action} />
      </div>
    </article>
  );
}

export function Projects() {
  const focus = useGame((s) => s.focusProject);
  useEffect(() => {
    if (!focus) return;
    // Arrived from a moon: bring that project's card into view and mark it.
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Scroll only the panel: scrollIntoView would also shift the fixed app shell.
    const card = document.getElementById(`card-${focus}`);
    const box = card?.closest('.panel-body');
    if (card && box) {
      const top = box.scrollTop + card.getBoundingClientRect().top - box.getBoundingClientRect().top - 12;
      box.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    }
    const t = setTimeout(() => useGame.getState().set({ focusProject: null }), 5000);
    return () => clearTimeout(t);
  }, [focus]);
  return (
    <div className="cards">
      {projects.map((p) => (
        <Card key={p.id} {...p} action="Visit live site" focus={focus === p.id} />
      ))}
    </div>
  );
}

export function Arcade({ inGame = true }: { inGame?: boolean }) {
  return (
    <div className="cards">
      <p className="lead">
        {inGame ? 'You cleared the Asteroid Run. Past the event horizon: small games I built for fun.' : 'Small games I built for fun.'}
      </p>
      {arcade.map((a) => (
        <Card key={a.id} {...a} action="Play" />
      ))}
    </div>
  );
}

export function Contact({ summary }: { summary: boolean }) {
  const visited = useGame((s) => s.visited);
  const best = useGame((s) => s.bestBelt);
  const arcadeUnlocked = useGame((s) => s.arcadeUnlocked);
  const earned = useGame((s) => s.achievements);
  const seen = ROUTE.filter((r) => visited.includes(r)).length;
  return (
    <>
      {summary && (
        <div className="mission">
          <h3>Mission complete</h3>
          <div className="stats">
            <div>
              <b className="num">
                {seen}/{ROUTE.length}
              </b>
              <span>stops visited</span>
            </div>
            <div>
              <b className="num">{best != null ? `${best.toFixed(1)}s` : '—'}</b>
              <span>asteroid run</span>
            </div>
            <div>
              <b>{arcadeUnlocked ? 'Yes' : 'No'}</b>
              <span>secret found</span>
            </div>
          </div>
          <ul className="badges">
            {ACHIEVEMENTS.map((a) => (
              <li key={a.id} className={earned.includes(a.id) ? 'on' : ''}>
                <b>{a.name}</b>
                <span>{a.how}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="lead">Thanks for flying by. If you&apos;d like to work together, the channel is open.</p>
      <a className="btn big mail-btn" href={`mailto:${contact.email}?subject=Hello%20from%20your%20space%20portfolio`}>
        <Icon name="mail" /> {contact.email}
      </a>
      <ul className="link-list">
        <li>
          <Ext className="link-row" href={contact.resume}>
            <Icon name="file" /> <span>Résumé (PDF)</span> <Icon name="external" className="icon trail" />
          </Ext>
        </li>
        {contact.links.map((l) => (
          <li key={l.label}>
            <Ext className="link-row" href={l.url}>
              <Brand name={l.label} size={18} /> <span>{l.label}</span> <Icon name="external" className="icon trail" />
            </Ext>
          </li>
        ))}
      </ul>
    </>
  );
}

export function SectionBody({ id, docked }: { id: SectionId; docked: boolean }) {
  switch (id) {
    case 'home':
      return <Home />;
    case 'education':
      return <Education />;
    case 'skills':
      return <Skills />;
    case 'projects':
      return <Projects />;
    case 'arcade':
      return <Arcade />;
    case 'contact':
      return <Contact summary={docked} />;
  }
}

/** One icon per stop, used in panel headers and the classic page. */
export const SECTION_ICON: Record<SectionId, IconName> = {
  home: 'user',
  education: 'cap',
  skills: 'layers',
  projects: 'grid',
  arcade: 'gamepad',
  contact: 'radio',
};
