"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * One shared <audio> for the whole studio so only a single clip plays at a time.
 */
export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setTime(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = useCallback(
    (url: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (currentUrl === url) {
        if (audio.paused) void audio.play().catch(() => {});
        else audio.pause();
        return;
      }
      audio.pause();
      audio.src = url;
      setCurrentUrl(url);
      setTime(0);
      setDuration(0);
      void audio.play().catch(() => setPlaying(false));
    },
    [currentUrl]
  );

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const isPlaying = useCallback((url?: string | null) => !!url && playing && currentUrl === url, [playing, currentUrl]);

  return { currentUrl, playing, time, duration, toggle, seek, stop, isPlaying };
}

export type AudioPlayer = ReturnType<typeof useAudioPlayer>;
