"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { beatStarts, flattenLines, type Beat } from "./beats";

export function activeBeatIndex(beats: readonly Beat[], t: number): number {
  const starts = beatStarts(beats);
  let idx = 0;
  for (let i = 0; i < starts.length; i++) {
    if (t >= starts[i]!) idx = i;
  }
  return idx;
}

export function activeLineIndex(beats: readonly Beat[], t: number): number {
  const lines = flattenLines(beats);
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (t >= lines[i]!.startSec) idx = i;
  }
  return idx;
}

export interface BeatSyncState {
  audioRef: RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  playing: boolean;
  beatIndex: number;
  lineIndex: number;
  toggle: () => void;
  seek: (ratio: number) => void;
  rate: number;
  cycleRate: () => void;
  ended: boolean;
  failed: boolean;
}

const RATES = [1, 1.25, 1.5, 0.75] as const;

export function useBeatSync(beats: readonly Beat[]): BeatSyncState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    // duração pode chegar em loadedmetadata, durationchange ou canplay, e às vezes
    // já está disponível antes do listener montar (cache). Lê em todos e na hora.
    const readDur = () => {
      const d = el.duration;
      if (Number.isFinite(d) && d > 0) setDuration(d);
    };
    const onPlay = () => {
      setPlaying(true);
      setEnded(false);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setEnded(true);
    };
    const onErr = () => setFailed(true);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", readDur);
    el.addEventListener("durationchange", readDur);
    el.addEventListener("canplay", readDur);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onErr);
    readDur();
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", readDur);
      el.removeEventListener("durationchange", readDur);
      el.removeEventListener("canplay", readDur);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onErr);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function seek(ratio: number) {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const r = Math.max(0, Math.min(1, ratio));
    el.currentTime = r * el.duration;
    setCurrentTime(el.currentTime);
  }

  function cycleRate() {
    const el = audioRef.current;
    const i = RATES.indexOf(rate as (typeof RATES)[number]);
    const next = RATES[(i + 1) % RATES.length]!;
    if (el) el.playbackRate = next;
    setRate(next);
  }

  return {
    audioRef,
    currentTime,
    duration,
    playing,
    beatIndex: activeBeatIndex(beats, currentTime),
    lineIndex: activeLineIndex(beats, currentTime),
    toggle,
    seek,
    rate,
    cycleRate,
    ended,
    failed,
  };
}
