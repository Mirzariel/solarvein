import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Must run before App: ?skenario/?jam are applied before the motion engine reads its first target.
import './presentation/earlyPreset';
import App from './App.tsx';
import { appMode } from './presentation/appMode';

const ExportPage = lazy(() => import('./export/ExportPage'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {appMode() === 'export' ? (
      <Suspense fallback={null}>
        <ExportPage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
