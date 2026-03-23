"use client";

import React, { useEffect, useRef, useState } from "react";

export type PlayRegion = { start: number; end: number } | null;

type WaveSurferWaveformProps = {
  /** URL do áudio para decodificar e desenhar a onda */
  streamUrl: string;
  /** Elemento de áudio compartilhado para reprodução (opcional; se não passar, wavesurfer usa o próprio) */
  media?: HTMLMediaElement | null;
  /** Progresso de reprodução 0–1 (para desenhar o cursor) */
  progress: number;
  /** Duração em segundos (para regiões) */
  duration: number;
  /** Callback ao clicar/arrastar na onda para seek */
  onSeek(ratio: number): void;
  /** Região de corte (cut in/out); null = tocar faixa inteira */
  region: PlayRegion;
  /** Callback quando o usuário altera a região (arrastar/redimensionar) */
  onRegionChange(region: PlayRegion): void;
  /** Ativar fade in no início */
  fadeIn: boolean;
  /** Ativar fade out no final */
  fadeOut: boolean;
};

const WAVE_COLOR = "rgba(56, 189, 248, 0.5)";
const PROGRESS_COLOR = "rgba(56, 189, 248, 0.9)";
const CURSOR_COLOR = "rgba(56, 189, 248, 0.8)";
const REGION_COLOR = "rgba(56, 189, 248, 0.2)";
const FADE_DURATION_SEC = 2;

export function WaveSurferWaveform(props: WaveSurferWaveformProps): React.ReactElement {
  const {
    streamUrl,
    media,
    progress,
    duration,
    onSeek,
    region,
    onRegionChange,
    fadeIn,
    fadeOut,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [wsInstance, setWsInstance] = useState<{
    ws: import("wavesurfer.js").default;
    regions: import("wavesurfer.js/dist/plugins/regions").default;
    envelope: import("wavesurfer.js/dist/plugins/envelope").default;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const progressRef = useRef(progress);
  const regionRef = useRef(region);
  progressRef.current = progress;
  regionRef.current = region;

  // Inicializa WaveSurfer no cliente (evita SSR)
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || !streamUrl) return;

    let cancelled = false;

    const init = async (): Promise<void> => {
      const [WaveSurfer, RegionsPlugin, EnvelopePlugin] = await Promise.all([
        import("wavesurfer.js").then((m) => m.default),
        import("wavesurfer.js/dist/plugins/regions.js").then((m) => m.default),
        import("wavesurfer.js/dist/plugins/envelope.js").then((m) => m.default),
      ]);

      if (cancelled || !containerRef.current) return;

      const regionsPlugin = RegionsPlugin.create();
      const envelopePlugin = EnvelopePlugin.create({
        lineColor: "rgba(56, 189, 248, 0.6)",
        dragLine: true,
      });

      const ws = WaveSurfer.create({
        container: containerRef.current,
        height: 80,
        waveColor: WAVE_COLOR,
        progressColor: PROGRESS_COLOR,
        cursorColor: CURSOR_COLOR,
        cursorWidth: 2,
        barWidth: 1,
        barGap: 1,
        barRadius: 0,
        normalize: true,
        interact: true,
        dragToSeek: true,
        plugins: [regionsPlugin, envelopePlugin],
        ...(media ? { media } : {}),
        url: streamUrl,
      });

      ws.on("ready", () => setReady(true));
      ws.on("interaction", (t: number) => onSeek(t));
      ws.on("seeking", (t: number) => onSeek(ws.getDuration() > 0 ? t / ws.getDuration() : 0));

      // Permitir criar região arrastando na onda
      regionsPlugin.enableDragSelection({
        color: REGION_COLOR,
        resize: true,
        drag: true,
      });

      regionsPlugin.on("region-created", (r) => {
        onRegionChange({ start: r.start, end: r.end });
      });
      regionsPlugin.on("region-updated", (r) => {
        onRegionChange({ start: r.start, end: r.end });
      });
      regionsPlugin.on("region-removed", () => {
        onRegionChange(null);
      });

      if (!cancelled) {
        setWsInstance({ ws, regions: regionsPlugin, envelope: envelopePlugin });
      } else {
        ws.destroy();
      }
    };

    init();
    return () => {
      cancelled = true;
      setWsInstance((prev) => {
        if (prev) prev.ws.destroy();
        return null;
      });
      setReady(false);
    };
  }, [streamUrl, media ?? undefined]); // eslint-disable-line react-hooks/exhaustive-deps -- media ref identity

  // Sincronizar progresso externo (nosso <audio>) com a onda
  useEffect(() => {
    if (!wsInstance?.ws || !ready) return;
    const time = progress * duration;
    if (Number.isFinite(time)) wsInstance.ws.setTime(time);
  }, [wsInstance, ready, progress, duration]);

  // Aplicar região (cut in/out) vinda de fora
  useEffect(() => {
    if (!wsInstance?.regions || !ready || !Number.isFinite(duration) || duration <= 0) return;
    const r = regionRef.current;
    wsInstance.regions.clearRegions();
    if (r && r.start < r.end) {
      wsInstance.regions.addRegion({
        start: r.start,
        end: Math.min(r.end, duration),
        color: REGION_COLOR,
        resize: true,
        drag: true,
      });
    }
  }, [wsInstance, ready, duration, region?.start, region?.end]);

  // Envelope: fade in / fade out
  useEffect(() => {
    if (!wsInstance?.envelope || !ready || !Number.isFinite(duration) || duration <= 0) return;
    const points: { time: number; volume: number }[] = [];
    if (fadeIn) {
      points.push({ time: 0, volume: 0 });
      points.push({ time: Math.min(FADE_DURATION_SEC, duration / 2), volume: 1 });
    }
    if (fadeOut) {
      const fadeOutStart = Math.max(duration - FADE_DURATION_SEC, duration / 2);
      if (fadeOutStart > (points[points.length - 1]?.time ?? 0)) {
        points.push({ time: fadeOutStart, volume: 1 });
      }
      points.push({ time: duration, volume: 0 });
    }
    if (points.length > 0) {
      wsInstance.envelope.setPoints(points);
    } else {
      wsInstance.envelope.setPoints([{ time: 0, volume: 1 }, { time: duration, volume: 1 }]);
    }
  }, [wsInstance, ready, duration, fadeIn, fadeOut]);

  return (
    <div
      ref={containerRef}
      className="wavesurfer-waveform"
      aria-label="Forma de onda; arraste para buscar ou selecionar trecho"
    />
  );
}
