import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ModeratorApp } from './moderator/ModeratorApp';
import { PlayerApp } from './player/PlayerApp';
import { ScreenApp } from './screen/ScreenApp';
import { isModeratorPage, isScreenPage } from './socket';
import './theme.css';
import './player/player.css';
import './moderator/moderator.css';
import './screen/screen.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isScreenPage ? <ScreenApp /> : isModeratorPage ? <ModeratorApp /> : <PlayerApp />}</StrictMode>,
);
