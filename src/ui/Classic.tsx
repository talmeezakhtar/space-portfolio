import { faqs, oldSite, process, profile, services } from '../data/content';
import { Credits } from './Credits';
import { Icon, type IconName } from './Icon';
import { Arcade, Contact, Education, Projects, Skills } from './Sections';

/**
 * Plain, fast, accessible version of every section, served at /classic/.
 * Pre-rendered to static HTML at build time (vite.config.ts) for search engines and
 * AI answer engines, and used as the fallback where the 3D scene cannot run.
 */
export default function Classic() {
  return (
    <div className="classic">
      <header className="classic-head">
        <div className="who">
          <img className="avatar" src={profile.photo} alt={profile.name} width={64} height={64} />
          <div>
            <h1>{profile.name}</h1>
            <p className="role">{profile.role}</p>
          </div>
        </div>
        <p className="lead">{profile.summary}</p>
        <p className="status">
          <span className="dot" /> {profile.status}. {profile.pitch}
        </p>
        <div className="row">
          <a className="btn" href="/">
            <Icon name="rocket" /> Fly the 3D version
          </a>
          <a className="btn ghost" href={oldSite} target="_blank" rel="noopener noreferrer">
            <Icon name="history" /> Classic portfolio
          </a>
        </div>
      </header>
      <main>
        <section aria-labelledby="h-do">
          <h2 id="h-do">What I do</h2>
          <ul className="services">
            {services.map((s) => (
              <li key={s.title}>
                <span className="tile">
                  <Icon name={s.icon as IconName} />
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="h-how">
          <h2 id="h-how">How I work</h2>
          <ol className="steps">
            {process.map((p, i) => (
              <li key={p.title}>
                <span className="step-n num">{i + 1}</span>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="h-projects">
          <h2 id="h-projects">Projects</h2>
          <Projects />
        </section>
        <section aria-labelledby="h-skills">
          <h2 id="h-skills">Skills</h2>
          <Skills />
        </section>
        <section aria-labelledby="h-edu">
          <h2 id="h-edu">Education</h2>
          <Education />
        </section>
        <section aria-labelledby="h-games">
          <h2 id="h-games">Games</h2>
          <Arcade inGame={false} />
        </section>
        <section aria-labelledby="h-faq">
          <h2 id="h-faq">Quick answers</h2>
          <dl className="faq">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="h-contact">
          <h2 id="h-contact">Contact</h2>
          <Contact summary={false} />
        </section>
      </main>
      <footer>
        <Credits />
      </footer>
    </div>
  );
}
