import type { PublicPlayer, Recap as RecapData } from '../../shared/types';
import { nameOf, ROLE_LABEL } from '../labels';

/** Rekapitulace večera (Rozšíření 11): časová osa kol a ceny. Telefon i velká obrazovka. */
export function Recap({ recap, players, className = '' }: { recap: RecapData; players: PublicPlayer[]; className?: string }) {
  const name = (id: string | null) => nameOf(players, id);
  const role = (id: string) => {
    const r = players.find((p) => p.id === id)?.revealedRole;
    return r ? ` (${ROLE_LABEL[r]})` : '';
  };
  return (
    <section className={`recap ${className}`}>
      {recap.awards.length > 0 && (
        <div className="recap-awards">
          {recap.awards.map((a) => (
            <div key={a.key} className="recap-award">
              <span className="recap-award-title">{a.title}</span>
              <span className="recap-award-names">{a.ids.map((id) => name(id)).join(', ')}</span>
              <span className="recap-award-note">
                {a.note} · {a.count}
              </span>
            </div>
          ))}
        </div>
      )}
      <ol className="recap-rounds">
        {recap.rounds.map((r) => (
          <li key={r.round}>
            <b>{r.round}. kolo</b>
            {r.minigame && (
              <span>
                {r.minigame.name}
                {r.minigame.shieldWinnerId ? `, štít ${name(r.minigame.shieldWinnerId)}` : ''}
              </span>
            )}
            <span>{r.banishedId ? `vyhnán/a ${name(r.banishedId)}${role(r.banishedId)}` : 'nikdo nevyhnán'}</span>
            {r.murderedId && <span>v noci zemřel/a {name(r.murderedId)}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
