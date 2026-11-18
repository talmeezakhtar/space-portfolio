import { credits } from '../data/content';

/** Model credits (CC BY 4.0). Shown in the help panel and on the classic page. */
export function Credits() {
  return (
    <p className="credits">
      3D models (CC BY 4.0):{' '}
      {credits.map((c, i) => (
        <span key={c.what}>
          {c.what} by{' '}
          {c.url ? (
            <a href={c.url} target="_blank" rel="noopener noreferrer">
              {c.who}
            </a>
          ) : (
            c.who
          )}
          {i < credits.length - 1 ? ' · ' : '.'}
        </span>
      ))}
    </p>
  );
}
