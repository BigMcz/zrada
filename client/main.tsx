import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ModeratorApp } from './moderator/ModeratorApp';
import { PlayerApp } from './player/PlayerApp';
import { isModeratorPage } from './socket';
import './theme.css';
import './player/player.css';
import './moderator/moderator.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isModeratorPage ? <ModeratorApp /> : <PlayerApp />}</StrictMode>,
);
