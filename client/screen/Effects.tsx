import { useEffect, useMemo, useRef } from 'react';

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  kind: 'spark' | 'smoke';
}

/**
 * Jiskry a kouř (Rozšíření 14): pomalu stoupají ze spodku velké obrazovky v noci a ve finále.
 * Jeden canvas, pár desítek částic – nenáročné.
 */
export function Embers() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c || reducedMotion()) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = c.width = c.clientWidth;
      h = c.height = c.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (kind: Particle['kind']): Particle =>
      kind === 'spark'
        ? { kind, x: Math.random() * w, y: h + 10, vx: (Math.random() - 0.5) * 0.4, vy: -(0.4 + Math.random() * 0.9), r: 1.6 + Math.random() * 2.6, life: 0, max: 280 + Math.random() * 260 }
        : { kind, x: Math.random() * w, y: h + 60, vx: (Math.random() - 0.5) * 0.2, vy: -(0.15 + Math.random() * 0.25), r: 50 + Math.random() * 70, life: 0, max: 700 + Math.random() * 500 };
    const parts: Particle[] = [];
    for (let i = 0; i < 34; i++) parts.push({ ...spawn('spark'), y: Math.random() * h, life: Math.random() * 200 });
    for (let i = 0; i < 6; i++) parts.push({ ...spawn('smoke'), y: h * (0.5 + Math.random() * 0.5), life: Math.random() * 400 });

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.life++;
        p.x += p.vx + Math.sin((p.life + i * 37) / 40) * (p.kind === 'spark' ? 0.25 : 0.1);
        p.y += p.vy;
        const k = p.life / p.max;
        if (k >= 1 || p.y < -p.r * 2) {
          parts[i] = spawn(p.kind);
          continue;
        }
        const fade = Math.sin(Math.PI * k);
        if (p.kind === 'spark') {
          const flicker = 0.6 + 0.4 * Math.sin(p.life / 3 + i);
          ctx.shadowColor = 'rgba(255, 170, 60, 0.9)';
          ctx.shadowBlur = 8;
          ctx.fillStyle = `rgba(255, ${160 + Math.round(70 * flicker)}, 80, ${fade * flicker})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.shadowBlur = 0;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, `rgba(120, 110, 100, ${0.07 * fade})`);
          g.addColorStop(1, 'rgba(120, 110, 100, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas ref={canvas} className="screen-embers" aria-hidden="true" />;
}

/**
 * Rozsypaný poklad (Rozšíření 14): z pokladu vpravo nahoře se rozletí zlaté mince dolů k vítězům.
 */
export function CoinBurst({ count = 36 }: { count?: number }) {
  const coins = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        dx: `${-20 - Math.random() * 65}vw`,
        dy: `${35 + Math.random() * 45}vh`,
        delay: `${Math.random() * 0.9}s`,
        spin: `${(Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720)}deg`,
        size: `${0.6 + Math.random() * 0.6}em`,
      })),
    [count],
  );
  if (reducedMotion()) return null;
  return (
    <div className="coin-burst" aria-hidden="true">
      {coins.map((c) => (
        <span
          key={c.id}
          className="coin"
          style={{ '--dx': c.dx, '--dy': c.dy, '--spin': c.spin, animationDelay: c.delay, width: c.size, height: c.size } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
