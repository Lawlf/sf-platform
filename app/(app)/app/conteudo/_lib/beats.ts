import type { ReactNode } from "react";

export interface Beat {
  label: string;
  /** duração estimada em segundos; afinável de ouvido. */
  durationSec: number;
  lines: readonly string[];
  Visual: () => ReactNode;
}

export interface ModuleBeats {
  trilhaSlug: string;
  num: number;
  title: string;
  /** caminho do MP3 dentro do bucket conteudos (ex.: trilha/sair-do-vermelho/01.mp3). */
  audio: string;
  beats: readonly Beat[];
}

export interface FlatLine {
  text: string;
  beatIndex: number;
  beatLabel: string;
  firstOfBeat: boolean;
  /** segundo em que a frase entra (derivado: start do beat + fração). */
  startSec: number;
}

/** Achata os beats em linhas com tempo derivado (só os beats têm tempo "real"). */
export function flattenLines(beats: readonly Beat[]): FlatLine[] {
  const out: FlatLine[] = [];
  let acc = 0;
  for (let bi = 0; bi < beats.length; bi++) {
    const b = beats[bi]!;
    b.lines.forEach((text, li) => {
      out.push({
        text,
        beatIndex: bi,
        beatLabel: b.label,
        firstOfBeat: li === 0,
        startSec: acc + (li / b.lines.length) * b.durationSec,
      });
    });
    acc += b.durationSec;
  }
  return out;
}

export function beatStarts(beats: readonly Beat[]): number[] {
  const starts: number[] = [];
  let acc = 0;
  for (const b of beats) {
    starts.push(acc);
    acc += b.durationSec;
  }
  return starts;
}
