import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DebugPage } from './DebugPage';
import { PlayerApp } from './player/PlayerApp';
import { isModeratorPage } from './socket';
import './theme.css';
import './player/player.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isModeratorPage ? <DebugPage /> : <PlayerApp />}</StrictMode>,
);
