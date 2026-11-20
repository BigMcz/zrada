import type { ComponentType } from 'react';
import { AuctionModerator, AuctionPlayer } from './auction/Auction';
import { SplitStealModerator, SplitStealPlayer } from './splitSteal/SplitSteal';

export interface MinigamePlayerProps<G = unknown> {
  game: G;
  nameOf: (id: string) => string;
  /** Pošle vstup minihry (`minigameInput`). */
  send: (payload: unknown) => void;
}

export interface MinigameModeratorProps<G = unknown> {
  game: G;
  nameOf: (id: string) => string;
  /** Id živých hráčů, kteří minihru hrají. */
  players: string[];
  /** Pošle zásah moderátora (`minigameModerator`). */
  send: (payload: unknown) => void;
  busy: boolean;
}

export interface MinigameUi {
  Player: ComponentType<MinigamePlayerProps<any>>;
  /** Úloha ducha (krok M5); bez ní duch jen sleduje. */
  Ghost?: ComponentType<MinigamePlayerProps<any>>;
  Moderator: ComponentType<MinigameModeratorProps<any>>;
}

/** Obrazovky miniher podle id ze serveru. */
export const MINIGAME_UI: Record<string, MinigameUi> = {
  AUCTION: { Player: AuctionPlayer, Moderator: AuctionModerator },
  SPLIT_STEAL: { Player: SplitStealPlayer, Moderator: SplitStealModerator },
};
