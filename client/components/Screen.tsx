import type { ReactNode } from 'react';

interface Props {
  /** Malý nápis nahoře, např. „Kulatý stůl · 2. kolo“. */
  tag: string;
  /** Prvek v pravém horním rohu (pečeť pro zobrazení role). */
  corner?: ReactNode;
  /** Hlavní akce dole, na dosah palce. */
  action?: ReactNode;
  children: ReactNode;
}

/** Kostra každé obrazovky telefonu: štítek fáze nahoře, obsah, hlavní akce dole. */
export function Screen({ tag, corner, action, children }: Props) {
  return (
    <div className="screen">
      <header className="screen-top">
        <span className="phase-tag">{tag}</span>
        {corner}
      </header>
      <div className="screen-body">{children}</div>
      {action && <div className="screen-action">{action}</div>}
    </div>
  );
}

export function PrimaryButton(props: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button className="primary" type={props.type ?? 'button'} onClick={props.onClick} disabled={props.disabled}>
      {props.children}
    </button>
  );
}
