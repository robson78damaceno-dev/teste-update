"use client";

import { useEffect, useState } from "react";
import { getAudioContext, getOrCreateMediaGraph } from "../lib/audio/audio-engine";

/**
 * Nível de áudio em tempo real (0–1) a partir do elemento.
 * Usa o mesmo grafo que o espectrograma (AnalyserNode).
 * @param allowRun - Só cria o grafo quando true (após user gesture), para evitar aviso do browser.
 */
export function useAudioLevels(
  audioElement: HTMLMediaElement | null | undefined,
  allowRun = false
): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (audioElement == null || !allowRun) {
      setLevel(0);
      return;
    }

    const ctx = getAudioContext();
    const { analyser } = getOrCreateMediaGraph(audioElement);
    const bufferLength = analyser.fftSize;
    const timeData = new Uint8Array(bufferLength);
    let rafId = 0;

    function tick(): void {
      rafId = requestAnimationFrame(tick);
      analyser.getByteTimeDomainData(timeData);
      let sum = 0;
      for (let i = 0; i < bufferLength; i += 1) {
        const n = (timeData[i] - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setLevel(Math.min(1, rms * 2));
    }

    tick();
    return () => cancelAnimationFrame(rafId);
  }, [audioElement, allowRun]);

  return level;
}
