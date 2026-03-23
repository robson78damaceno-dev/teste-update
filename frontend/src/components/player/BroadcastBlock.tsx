"use client";

import React, { useCallback, memo } from "react";
import { useAudioLevels } from "@/hooks/useAudioLevels";
import type { TrackViewModel, TrackMarkerViewModel } from "@/types/player";
import type { PlayRegion } from "./WaveformFromEngine";
import { VuMeters } from "./VuMeters";
import { WaveformFromEngine } from "./WaveformFromEngine";
import { WaveformCanvas } from "./WaveformCanvas";

export type BroadcastBlockProps = {
  track?: TrackViewModel;
  streamUrl?: string;
  audioElement?: HTMLMediaElement | null;
  allowAudioAnalyser?: boolean;
  currentTime: number;
  duration: number;
  playRegion: PlayRegion;
  onSeek(ratio: number): void;
  markers?: TrackMarkerViewModel[];
  onAddMarker?(ratio: number, label: string): void;
  /** Pixels por segundo para o zoom da waveform (60 | 100 | 160). */
  pixelsPerSecond?: number;
  activeTrackId?: string;
  liveTrackId?: string | null;
  monitorTrackId?: string | null;
  /** Volume de transmissão 0–100 — usado para escalar os VU meters. */
  volumePercent?: number;
};

function buildPlaceholderSamples(track: TrackViewModel | undefined): number[] {
  if (track === undefined) return [];
  const samples: number[] = [];
  const total = 600;
  for (let index = 0; index < total; index += 1) {
    const position = index / total;
    const envelope = position < 0.1 || position > 0.9 ? 0.2 : 1;
    samples.push(envelope * Math.abs(Math.sin(position * Math.PI * 4)));
  }
  return samples;
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function BroadcastBlock(props: BroadcastBlockProps): React.ReactElement {
  const {
    track,
    streamUrl,
    audioElement,
    allowAudioAnalyser = false,
    currentTime,
    duration,
    playRegion,
    onSeek,
    markers = [],
    onAddMarker,
    pixelsPerSecond = 100,
    activeTrackId,
    liveTrackId,
    monitorTrackId,
    volumePercent = 100,
  } = props;

  const badgeLabel = activeTrackId === liveTrackId ? "LIVE" : activeTrackId === monitorTrackId ? "MONITOR" : "NOW";
  const badgeClass = activeTrackId === liveTrackId ? " control-panel-track-badge-live" : activeTrackId === monitorTrackId ? " control-panel-track-badge-monitor" : "";

  const rawLevel = useAudioLevels(audioElement, allowAudioAnalyser);
  // Escala o nível pelo volume de transmissão — o analyser lê antes do gain do elemento
  const audioLevel = rawLevel * (volumePercent / 100);

  const durationSec = track !== undefined ? track.durationMs / 1000 : duration;
  const durationDisplay = Number.isFinite(duration) && duration > 0 ? duration : durationSec;
  const progress = durationDisplay > 0 ? currentTime / durationDisplay : 0;
  const remainingSec = Math.max(0, durationDisplay - currentTime);
  const samples = buildPlaceholderSamples(track);
  const useEngineWaveform = Boolean(streamUrl && track);

  const handleWaveformSeek = useCallback(
    (ratio: number): void => {
      onSeek(Math.max(0, Math.min(1, ratio)));
    },
    [onSeek]
  );

  return (
    <div className="now-playing-broadcast control-panel-center-broadcast">
      <div className="now-playing-broadcast-block glass-surface section-divider">
        {/* Coluna esquerda: track-info + tempos + waveform */}
        <div className="broadcast-block-main">
          {track !== undefined ? (
            <div className="control-panel-track-info broadcast-track-info">
              <span className={`control-panel-track-badge${badgeClass}`}>{badgeLabel}</span>
              <div className="control-panel-track-details">
                <span className="control-panel-track-title">{track.title}</span>
                <span className="control-panel-track-meta">{track.artist}{track.album.length > 0 ? ` · ${track.album}` : ""}</span>
              </div>
            </div>
          ) : (
            <div className="control-panel-track-info broadcast-track-info control-panel-track-info-empty">
              <span className="control-panel-track-badge">—</span>
              <div className="control-panel-track-details">
                <span className="control-panel-track-title" style={{ opacity: 0.3 }}>Nenhuma faixa selecionada</span>
              </div>
            </div>
          )}
          <div className="now-playing-broadcast-times">
            <div className="now-playing-broadcast-time now-playing-broadcast-time-total">
              <div className="now-playing-broadcast-time-label">Total</div>
              <div className="now-playing-broadcast-time-value">
                {durationDisplay > 0 ? formatTime(durationDisplay) : "0:00"}
              </div>
            </div>
            <div className="now-playing-broadcast-time now-playing-broadcast-time-elapsed">
              <div className="now-playing-broadcast-time-label">Decorrido</div>
              <div className="now-playing-broadcast-time-value">{formatTime(currentTime)}</div>
            </div>
            <div className="now-playing-broadcast-time now-playing-broadcast-time-remaining">
              <div className="now-playing-broadcast-time-label">Restante</div>
              <div className="now-playing-broadcast-time-value">{formatTime(remainingSec)}</div>
            </div>
          </div>
          <div className="now-playing-broadcast-waveform-wrap">
            {useEngineWaveform && streamUrl ? (
              <WaveformFromEngine
                streamUrl={streamUrl}
                progress={progress}
                duration={durationSec}
                onSeek={handleWaveformSeek}
                region={playRegion}
                markers={markers}
                onAddMarker={onAddMarker}
                renderStyle="bars"
                pixelsPerSecond={pixelsPerSecond}
              />
            ) : (
              <WaveformCanvas samples={samples} progress={progress} onSeek={handleWaveformSeek} />
            )}
          </div>
        </div>
        {/* VU meters: altura total à direita */}
        <VuMeters level={audioLevel} width={22} height={130} segments={16} />
      </div>
    </div>
  );
}

export const BroadcastBlockMemoized = memo(BroadcastBlock);
