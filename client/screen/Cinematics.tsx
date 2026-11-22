import type { ScreenView } from '../../shared/types';
import { Crest } from '../components/Crest';
import { Sigil } from '../components/Sigil';
import { ROLE_LABEL } from '../labels';
import { awardText, introLines, theme, winnersWord } from '../themeStore';

/** Úvod má 4 věty podle tématu (Rozšíření 16); každá má na obrazovce 3 s. */
export const INTRO_LINE_MS = 3000;
export const INTRO_MS = 4 * INTRO_LINE_MS;

/** Filmový úvod po startu hry; čas si měří volající (useElapsed), ať jde snadno přeskočit do rozdání rolí. */
export function Intro({ elapsed }: { elapsed: number }) {
  const lines = introLines();
  const i = Math.min(lines.length - 1, Math.floor(elapsed / INTRO_LINE_MS));
  return (
    <div className="screen-opening">
      {i === 0 && <Crest className="big intro-crest" />}
      <p key={i} className={i === 0 ? 'intro-line first' : 'intro-line'}>
        {lines[i]}
      </p>
    </div>
  );
}

/** Jak dlouho titulky jedou, než zůstane poslední karta. */
export const CREDITS_MS = 26000;

/**
 * Závěrečné titulky (Rozšíření 16): obsazení s rolemi, ocenění, vítězové pokladu a poděkování.
 * Text jede zdola nahoru; s „omezit pohyb“ se jen prolne poslední karta.
 */
export function Credits({ view, elapsed }: { view: ScreenView; elapsed: number }) {
  const name = (id: string) => view.players.find((p) => p.id === id)?.name ?? '—';
  if (elapsed >= CREDITS_MS) {
    return (
      <div className="screen-credits-end">
        <Crest className="big" />
        <h1>Děkujeme za hru</h1>
      </div>
    );
  }
  return (
    <div className="screen-credits" aria-label="Závěrečné titulky">
      <div className="credits-roll" style={{ animationDuration: `${CREDITS_MS}ms` }}>
        <Crest className="big" />
        <h1>{theme().title}</h1>
        <p className="credits-sub">{`Vyhráli ${winnersWord(view.winner)}`}</p>

        <h2>Hráli</h2>
        {view.players.map((p) => (
          <p key={p.id} className="credits-row">
            <span className="credits-name">
              {p.crest && <Sigil crest={p.crest} className="inline" />}
              {p.name}
            </span>
            <span className={p.revealedRole === 'TRAITOR' ? 'credits-role traitor' : 'credits-role loyal'}>
              {p.revealedRole ? ROLE_LABEL[p.revealedRole] : ''}
            </span>
          </p>
        ))}

        {view.recap && view.recap.awards.length > 0 && (
          <>
            <h2>Ocenění</h2>
            {view.recap.awards.map((a) => (
              <p key={a.key} className="credits-row">
                <span className="credits-role">{awardText(a).title}</span>
                <span className="credits-name">{a.ids.map(name).join(', ')}</span>
              </p>
            ))}
          </>
        )}

        {view.potShare && (
          <>
            <h2>Poklad {view.pot.toLocaleString('cs')}</h2>
            <p className="credits-sub">
              {view.potShare.winners.map(name).join(', ')} · každý {view.potShare.each.toLocaleString('cs')}
            </p>
          </>
        )}

        <h2 className="credits-thanks">Děkujeme za hru</h2>
      </div>
    </div>
  );
}
