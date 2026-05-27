export type SfxName = "module-complete" | "trilha-complete" | "unlock" | "tap";

const SEQUENCES: Record<SfxName, { freq: number; start: number; dur: number }[]> = {
  "module-complete": [
    { freq: 523, start: 0, dur: 0.12 },
    { freq: 784, start: 0.1, dur: 0.16 },
  ],
  "trilha-complete": [
    { freq: 523, start: 0, dur: 0.12 },
    { freq: 659, start: 0.1, dur: 0.12 },
    { freq: 784, start: 0.2, dur: 0.12 },
    { freq: 1047, start: 0.3, dur: 0.22 },
  ],
  unlock: [{ freq: 659, start: 0, dur: 0.14 }],
  tap: [{ freq: 440, start: 0, dur: 0.05 }],
};

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function playSfx(name: SfxName, opts: { muted: boolean }): void {
  if (opts.muted || prefersReducedMotion()) return;
  try {
    const audio = getCtx();
    if (!audio) return;
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime;
    for (const note of SEQUENCES[name]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.18, now + note.start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.dur);
    }
  } catch {
    // SFX nunca bloqueia a interação; falha de áudio é silenciosa.
  }
}
