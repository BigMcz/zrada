import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DebugPage } from './DebugPage';
import './theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DebugPage />
  </StrictMode>,
);
