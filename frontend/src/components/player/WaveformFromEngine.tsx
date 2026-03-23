"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decodeAudioUrl, getPeaksFromBuffer } from "@/lib/audio/audio-engine";
import type { TrackMarkerViewModel } from "@/types/player";

const DEFAULT_CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 96;

const MARKER_LABELS = ["Intro", "Verso", "Refrão", "Ponte", "Outro"] as const;
const MARKER_COLORS: Record<string, string> = {
  Intro: "#22c55e",
  Verso: "#3b82f6",
  Refrão: "#f59e0b",
  Ponte: "#a855f7",
  Outro: "#6b7280"
};

function getMarkerColor(label: string): string {
  return MARKER_COLORS[label] ?? "#94a3b8";
}

export type PlayRegion = { start: number; end: number } | null;

type WaveformFromEngineProps = {
  streamUrl: string;
  progress: number;
  duration: number;
  onSeek(ratio: number): void;
  region?: PlayRegion;
  markers?: TrackMarkerViewModel[];
  onAddMarker?(ratio: number, label: string): void;
  /** Estilo de desenho: onda contínua ou barras (tipo candlestick). */
  renderStyle?: "wave" | "bars";
  /**
   * Zoom horizontal em pixels por segundo de áudio.
   * Valores típicos: 60 (compacto), 100 (normal), 160 (detalhe).
   */
  pixelsPerSecond?: number;
};

/**
 * Waveform desenhada a partir da Web Audio API (decode → peaks → canvas).
 * Segue o mapa: Decodificar → Processar → Renderizar.
 */
export function WaveformFromEngine(props: WaveformFromEngineProps): React.ReactElement {
  const {
    streamUrl,
    progress,
    duration,
    onSeek,
    region = null,
    markers = [],
    onAddMarker,
    renderStyle = "bars",
    pixelsPerSecond = 100,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [peaks, setPeaks] = useState<{ min: Float32Array; max: Float32Array } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; ratio: number } | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(DEFAULT_CANVAS_WIDTH);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPeaks(null);

    decodeAudioUrl(streamUrl)
      .then((buffer) => {
        if (cancelled) return;
        const effectiveDuration = Number.isFinite(duration) && duration > 0 ? duration : buffer.duration;
        const baseWidth =
          effectiveDuration > 0 ? Math.round(effectiveDuration * pixelsPerSecond) : DEFAULT_CANVAS_WIDTH;
        const targetWidth = Math.max(300, Math.min(2000, baseWidth || DEFAULT_CANVAS_WIDTH));
        const p = getPeaksFromBuffer(buffer, targetWidth);
        setCanvasWidth(targetWidth);
        setPeaks(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao decodificar áudio");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [streamUrl, duration, pixelsPerSecond]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || peaks === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;
    ctx.clearRect(0, 0, width, height);

    const { min, max } = peaks;
    const playheadX = progress * width;

    // ── Região de corte: fill sutil + bordas ──────────────────────────────
    if (region !== null && duration > 0) {
      const x0 = Math.max(0, (region.start / duration) * width);
      const x1 = Math.min(width, (region.end / duration) * width);
      const rGrad = ctx.createLinearGradient(x0, 0, x1, 0);
      rGrad.addColorStop(0,   "rgba(0, 189, 255, 0.03)");
      rGrad.addColorStop(0.5, "rgba(0, 189, 255, 0.09)");
      rGrad.addColorStop(1,   "rgba(0, 189, 255, 0.03)");
      ctx.fillStyle = rGrad;
      ctx.fillRect(x0, 0, x1 - x0, height);
      ctx.save();
      ctx.strokeStyle = "rgba(0, 189, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, height); ctx.stroke();
      ctx.restore();
    }

    // ── Linha central sutil ───────────────────────────────────────────────
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, midY - 0.5, width, 1);

    // ── Gradientes de barra: tocado vs. não-tocado ────────────────────────
    const gradPlayed = ctx.createLinearGradient(0, 0, 0, height);
    gradPlayed.addColorStop(0,    "rgba(0, 189, 255, 0.70)");
    gradPlayed.addColorStop(0.40, "rgba(31, 162, 255, 1.00)");
    gradPlayed.addColorStop(0.50, "rgba(31, 162, 255, 1.00)");
    gradPlayed.addColorStop(0.60, "rgba(31, 162, 255, 1.00)");
    gradPlayed.addColorStop(1,    "rgba(0, 189, 255, 0.70)");

    const gradUnplayed = ctx.createLinearGradient(0, 0, 0, height);
    gradUnplayed.addColorStop(0,    "rgba(31, 162, 255, 0.16)");
    gradUnplayed.addColorStop(0.50, "rgba(31, 162, 255, 0.28)");
    gradUnplayed.addColorStop(1,    "rgba(31, 162, 255, 0.16)");

    // ── Barras simétricas (peak amplitude, not raw min/max) ───────────────
    const barW    = 2;   // largura da barra em px
    const barStep = 3;   // passo: 2px barra + 1px gap
    const pad     = 5;   // espaço mínimo topo/base em px

    if (renderStyle === "wave") {
      // Onda contínua com gradiente
      ctx.fillStyle = progress > 0 ? gradPlayed : gradUnplayed;
      ctx.beginPath();
      for (let i = 0; i < width; i += 1) {
        const vMax = Math.min(1, Math.abs(max[i] ?? 0));
        const yTop = midY - vMax * (midY - pad);
        if (i === 0) ctx.moveTo(i, yTop);
        else ctx.lineTo(i, yTop);
      }
      for (let i = width - 1; i >= 0; i -= 1) {
        const vMin = Math.min(1, Math.abs(min[i] ?? 0));
        const yBot = midY + vMin * (midY - pad);
        ctx.lineTo(i, yBot);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Barras simétricas limpas
      for (let i = 0; i < width; i += barStep) {
        const peak   = Math.min(1, Math.max(Math.abs(min[i] ?? 0), Math.abs(max[i] ?? 0)));
        const halfH  = Math.max(2, peak * (midY - pad));
        const isPlayed = i + barW / 2 < playheadX;
        ctx.fillStyle = isPlayed ? gradPlayed : gradUnplayed;
        ctx.fillRect(i, midY - halfH, barW, halfH * 2);
      }
    }

    // ── Playhead: glow laranja + linha + triângulo ────────────────────────
    if (playheadX >= 0 && playheadX <= width) {
      // Glow difuso
      ctx.save();
      ctx.shadowColor  = "rgba(220, 78, 3, 0.65)";
      ctx.shadowBlur   = 8;
      ctx.strokeStyle  = "#DC4E03";
      ctx.lineWidth    = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.restore();

      // Linha nítida sobre o glow
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Triângulo cap
      const tri = 7;
      ctx.fillStyle = "#DC4E03";
      ctx.beginPath();
      ctx.moveTo(playheadX,           0);
      ctx.lineTo(playheadX - tri / 2, tri);
      ctx.lineTo(playheadX + tri / 2, tri);
      ctx.closePath();
      ctx.fill();
    }
  }, [peaks, progress, region, duration, renderStyle]);

  // Auto-scroll to keep playhead visible when zoomed
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (wrap === null || canvas === null) return;
    const scrollParent = wrap.parentElement;
    if (scrollParent === null || scrollParent.scrollWidth <= scrollParent.clientWidth) return;
    const playheadX = progress * canvas.width;
    const scaleRatio = canvas.getBoundingClientRect().width / canvas.width;
    const visualX = playheadX * scaleRatio;
    const viewLeft = scrollParent.scrollLeft;
    const viewRight = viewLeft + scrollParent.clientWidth;
    const margin = scrollParent.clientWidth * 0.2;
    if (visualX < viewLeft + margin || visualX > viewRight - margin) {
      scrollParent.scrollLeft = visualX - scrollParent.clientWidth * 0.3;
    }
  }, [progress]);

  const getRatioFromEvent = useCallback((e: { clientX: number; clientY: number }): number => {
    const canvas = canvasRef.current;
    if (canvas === null) return 0;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return rect.width > 0 ? Math.max(0, Math.min(1, x / rect.width)) : 0;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      e.preventDefault();
      const ratio = getRatioFromEvent(e);
      onSeek(ratio);
    },
    [onSeek, getRatioFromEvent]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): void => {
      e.preventDefault();
      const ratio = getRatioFromEvent(e);
      setContextMenu({ x: e.clientX, y: e.clientY, ratio });
    },
    [getRatioFromEvent]
  );

  const handleAddMarker = useCallback(
    (label: string): void => {
      if (contextMenu === null) return;
      onAddMarker?.(contextMenu.ratio, label);
      setContextMenu(null);
    },
    [contextMenu, onAddMarker]
  );

  useEffect(() => {
    if (contextMenu === null) return;
    const close = (): void => setContextMenu(null);
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
    };
  }, [contextMenu]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>): void => {
      const step = 0.02;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSeek(Math.max(0, progress - step));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onSeek(Math.min(1, progress + step));
      } else if (e.key === "Home") {
        e.preventDefault();
        onSeek(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onSeek(1);
      }
    },
    [onSeek, progress]
  );

  const MARKER_LABEL_TOPS = [4, 28, 52] as const;
  const MIN_LABEL_DISTANCE = 0.14;
  const markerRows = useMemo(() => {
    const result: { marker: TrackMarkerViewModel; row: number }[] = [];
    for (let i = 0; i < markers.length; i += 1) {
      const m = markers[i];
      const prev = i > 0 ? result[i - 1] : null;
      const prevPos = prev?.marker.position ?? -1;
      const row =
        prev !== null && m.position - prevPos < MIN_LABEL_DISTANCE
          ? Math.min(prev.row + 1, MARKER_LABEL_TOPS.length - 1)
          : 0;
      result.push({ marker: m, row });
    }
    return result;
  }, [markers]);

  if (error !== null) {
    return (
      <div
        className="waveform-from-engine-error flex h-20 w-full items-center justify-center rounded-xl bg-glass-elevated text-xs text-accent-red"
        aria-live="polite"
      >
        {error}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="waveform-from-engine-wrap">
      {loading && peaks === null ? (
        <div className="waveform-loading-skeleton" aria-hidden>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="waveform-loading-bar"
              style={{ animationDelay: `${(i % 8) * 0.07}s` }}
            />
          ))}
        </div>
      ) : null}
      <div className="wave-container" style={{ opacity: loading && peaks === null ? 0 : 1 }}>
        <canvas
          ref={canvasRef}
          className="waveform-canvas wave"
          width={canvasWidth}
          height={CANVAS_HEIGHT}
          aria-label="Forma de onda; clique para ir à posição, botão direito para marcar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${Math.round(progress * 100)}%`}
          aria-busy={loading}
          role="slider"
          tabIndex={0}
          title="Clique para ir à posição. Botão direito para adicionar marcador (intro, verso, refrão…)."
          onPointerDown={handlePointerDown}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
        />
        <div className="markers-layer" aria-hidden>
          {markerRows.map(({ marker: m, row }, i) => (
            <div
              key={`marker-${i}-${m.position}`}
              className="waveform-marker"
              style={{
                left: `${m.position * 100}%`,
                backgroundColor: getMarkerColor(m.label),
              }}
            >
              <div
                className="waveform-marker-label"
                style={{
                  borderLeftColor: getMarkerColor(m.label),
                  top: MARKER_LABEL_TOPS[row],
                }}
              >
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>
      {contextMenu !== null && onAddMarker !== undefined ? (
        <div
          className="waveform-marker-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          {MARKER_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              className="waveform-marker-menu-btn"
              onClick={(e): void => {
                e.stopPropagation();
                handleAddMarker(label);
              }}
              role="menuitem"
            >
              <span
                className="waveform-marker-menu-btn-swatch"
                style={{ backgroundColor: getMarkerColor(label) }}
                aria-hidden
              />
              <span className="waveform-marker-menu-btn-label">{label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
