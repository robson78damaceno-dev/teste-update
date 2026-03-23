"use client";

import React, { useCallback, useEffect, useRef } from "react";

type WaveformCanvasProps = {
  samples: number[];
  /** 0–1 progress (para preencher até onde tocou) */
  progress?: number;
  /** Clique na onda para buscar posição (0–1) */
  onSeek?(ratio: number): void;
};

export function WaveformCanvas(props: WaveformCanvasProps): React.ReactElement {
  const { samples, progress = 0, onSeek } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (samples.length === 0) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
      ctx.fillRect(0, height / 2 - 1, width, 2);
      return;
    }

    const step = samples.length / width;
    const midY = height / 2;

    // Fundo já tocado (progress)
    if (progress > 0) {
      ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
      ctx.fillRect(0, 0, width * progress, height);
    }

    // Linha da onda
    ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < width; i += 1) {
      const sampleIndex = Math.floor(i * step);
      const idx = sampleIndex < samples.length ? sampleIndex : samples.length - 1;
      const value = Math.max(0, Math.min(1, samples[idx]));
      const y = midY - value * (midY - 4);
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();
  }, [samples, progress]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      if (onSeek === undefined) return;
      const canvas = canvasRef.current;
      if (canvas === null) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = rect.width > 0 ? x / rect.width : 0;
      onSeek(Math.max(0, Math.min(1, ratio)));
    },
    [onSeek]
  );

  return (
    <canvas
      ref={canvasRef}
      className="waveform-canvas"
      width={600}
      height={80}
      aria-label="Forma de onda; clique para buscar na faixa"
      onClick={handleClick}
    />
  );
}
