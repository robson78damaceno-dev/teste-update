"use client";

import React, { useEffect, useRef } from "react";
import { getAudioContext, getOrCreateMediaGraph } from "@/lib/audio/audio-engine";

const WIDTH = 400;
const HEIGHT = 64;

type SpectrogramCanvasProps = {
  /** Elemento de áudio em reprodução; espectrograma em tempo real */
  audioElement: HTMLMediaElement | null | undefined;
  /** Largura do canvas */
  width?: number;
  /** Altura do canvas */
  height?: number;
  /** Só monta o grafo quando true (após user gesture). */
  allowRun?: boolean;
};

/**
 * Espectrograma: FFT em tempo real, desenhado como mapa térmico.
 * Eixo X = tempo (rolagem), eixo Y = frequência, cor = intensidade.
 */
export function SpectrogramCanvas(props: SpectrogramCanvasProps): React.ReactElement {
  const {
    audioElement,
    width = WIDTH,
    height = HEIGHT,
    allowRun = false,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const imageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    if (audioElement == null || !allowRun) return;

    const ctx = getAudioContext();
    const { analyser } = getOrCreateMediaGraph(audioElement);

    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    if (canvas === null) return;

    canvas.width = width;
    canvas.height = height;

    const rawCtx = canvas.getContext("2d");
    if (rawCtx === null) return;
    const drawCtx: CanvasRenderingContext2D = rawCtx;

    // Intensidade (0–255) -> cor HSL: azul escuro -> ciano -> amarelo
    function intensityToRgb(n: number): { r: number; g: number; b: number } {
      const t = n / 255;
      const h = (1 - t) * 220 + 180; // 180 (cyan) -> 220 (blue)
      const s = 0.7;
      const l = 0.35 + t * 0.4;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      let r = 0,
        g = 0,
        b = 0;
      if (h < 60) {
        r = c;
        g = x;
      } else if (h < 120) {
        r = x;
        g = c;
      } else if (h < 180) {
        g = c;
        b = x;
      } else if (h < 240) {
        g = x;
        b = c;
      } else if (h < 300) {
        r = x;
        b = c;
      } else {
        r = c;
        b = x;
      }
      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
      };
    }

    let imgData = drawCtx.getImageData(0, 0, width, height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 0;
      imgData.data[i + 1] = 0;
      imgData.data[i + 2] = 0;
      imgData.data[i + 3] = 255;
    }
    imageDataRef.current = imgData;

    function draw(): void {
      rafRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(frequencyData);

      // Deslizar imagem 1 px à esquerda
      const data = imgData.data;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width - 1; x += 1) {
          const i = (y * width + x) * 4;
          const j = (y * width + (x + 1)) * 4;
          data[i] = data[j];
          data[i + 1] = data[j + 1];
          data[i + 2] = data[j + 2];
          data[i + 3] = data[j + 3];
        }
      }

      // Nova coluna à direita: frequência no eixo Y (invertido = graves embaixo)
      const col = width - 1;
      const step = bufferLength / height;
      for (let py = 0; py < height; py += 1) {
        const binStart = Math.floor((height - 1 - py) * step);
        const binEnd = Math.min(bufferLength, Math.floor((height - py) * step));
        let sum = 0;
        let count = 0;
        for (let b = binStart; b < binEnd; b += 1) {
          sum += frequencyData[b];
          count += 1;
        }
        const value = count > 0 ? sum / count : 0;
        const { r, g, b } = intensityToRgb(value);
        const i = (py * width + col) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }

      drawCtx.putImageData(imgData, 0, 0);
    }

    if (ctx.state === "suspended") {
      ctx.resume().then(() => draw()).catch(() => {});
    } else {
      draw();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      // Não desconectamos source/analyser: o mesmo elemento não pode ter outro MediaElementSource.
    };
  }, [audioElement, width, height, allowRun]);

  return (
    <canvas
      ref={canvasRef}
      className="spectrogram-canvas"
      style={{ width: `${width}px`, height: `${height}px` }}
      width={width}
      height={height}
      aria-label="Espectrograma: frequências do áudio em tempo real (graves em baixo, agudos em cima)"
    />
  );
}
