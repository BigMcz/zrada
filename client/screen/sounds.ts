// Zvuky velké obrazovky (Rozšíření 9, krok O3): syntéza přes Web Audio, žádné zvukové soubory.
// Krátké, tlumené, „dřevěné a kamenné“ podle návrhu designu. Hraje jen obrazovka, nikdy telefon.

export type SoundName = 'match' | 'bell' | 'flip' | 'gong' | 'minor' | 'drum' | 'coins';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let ambient: { stop: () => void } | null = null;

/** Prohlížeč pustí zvuk až po kliknutí; volá se z tlačítka Zahájit. */
export function startAudio(): void {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  void ctx.resume();
}

export const audioStarted = () => ctx !== null;

export function setMuted(m: boolean): void {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
}

/** Tón s obálkou: rychlý náběh, exponenciální doznění. */
function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine', endFreq?: number) {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(master!);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

/** Šum přes pásmový filtr (škrtnutí sirky, otočení karty, vítr). */
function noise(start: number, dur: number, gain: number, freq: number, q = 1) {
  const c = ctx!;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(start);
}

export function play(name: SoundName): void {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + 0.02;
  switch (name) {
    case 'match': // zapálení sirky: škrtnutí a krátké zasyčení
      noise(t, 0.08, 0.5, 3000, 2);
      noise(t + 0.08, 0.4, 0.15, 1200, 0.7);
      break;
    case 'bell': // úder do zvonu z dálky
      tone(523, t, 2.5, 0.12);
      tone(1046, t, 1.6, 0.05);
      tone(1567, t, 1.0, 0.03);
      break;
    case 'flip': // otočení karty
      noise(t, 0.06, 0.35, 1800, 1.5);
      tone(220, t, 0.08, 0.05, 'triangle');
      break;
    case 'gong': // odhalen Zrádce: nízký gong
      tone(73, t, 4, 0.35, 'sine');
      tone(110, t, 3, 0.15, 'sine');
      tone(147, t, 2.2, 0.08, 'triangle');
      break;
    case 'minor': // odhalen Věrný: tichý molový akord (a moll)
      tone(220, t, 2.5, 0.08);
      tone(261.6, t + 0.05, 2.4, 0.07);
      tone(329.6, t + 0.1, 2.3, 0.06);
      break;
    case 'drum': // oběť noci, výbuch: jediný úder bubnu
      tone(140, t, 0.6, 0.6, 'sine', 45);
      noise(t, 0.15, 0.2, 200, 0.8);
      break;
    case 'coins': // poklad roste: cinkání mincí
      for (let i = 0; i < 5; i++) tone(1800 + Math.random() * 900, t + i * 0.07, 0.25, 0.06, 'triangle');
      break;
  }
}

/** Noční ambient: tichý vítr (pomalu se měnící filtrovaný šum). */
export function setAmbient(on: boolean): void {
  if (!ctx || !master) return;
  if (!on) {
    ambient?.stop();
    ambient = null;
    return;
  }
  if (ambient) return;
  const c = ctx;
  const buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 400;
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.15;
  lfoGain.gain.value = 250;
  lfo.connect(lfoGain).connect(f.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 2);
  src.connect(f).connect(g).connect(master);
  src.start();
  lfo.start();
  ambient = {
    stop: () => {
      g.gain.setTargetAtTime(0.0001, c.currentTime, 0.5);
      src.stop(c.currentTime + 2);
      lfo.stop(c.currentTime + 2);
    },
  };
}
