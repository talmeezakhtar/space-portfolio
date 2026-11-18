import { Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Intro } from './ui/Intro';
import { Loader } from './ui/Loader';

const App = lazy(() => import('./App'));
const Classic = lazy(() => import('./ui/Classic'));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const isClassic = () =>
  location.pathname.startsWith('/classic') ||
  location.hash.replace(/^#\/?/, '') === 'classic' ||
  new URLSearchParams(location.search).get('view') === 'classic';

function Root() {
  const [classic, setClassic] = useState(() => isClassic() || !hasWebGL());
  useEffect(() => {
    const on = () => setClassic(isClassic() || !hasWebGL());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return (
    <>
      <Suspense fallback={classic ? <div className="boot">Loading…</div> : null}>{classic ? <Classic /> : <App />}</Suspense>
      {!classic && <Intro />}
      {!classic && <Loader />}
    </>
  );
}

// No StrictMode: its double-mount fights drei <Html> portals inside the canvas.
createRoot(document.getElementById('root')!).render(<Root />);
