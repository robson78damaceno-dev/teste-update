"use client";

import React from "react";
import type { TrackMarkerViewModel } from "@/types/player";

const PLAYBACK_RATES: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5];

type ControlPanelProps = {
  searchQuery: string;
  onSearchChange(value: string): void;
  /** Conteúdo da coluna central (bloco Transmissão / waveform) */
  centerContent?: React.ReactNode;
  /** Volume da faixa 0–100 */
  volumePercent?: number;
  onVolumeChange?(n: number): void;
  /** URL para download dos marcadores (.txt) */
  trackMarkersExportUrl?: string;
  markers?: TrackMarkerViewModel[];
  onClearMarkers?(): void;
  activeTrackId?: string;
  liveTrackId?: string | null;
  monitorTrackId?: string | null;
  onLiveToggle?(trackId: string): void;
  onMonitorToggle?(trackId: string): void;
  /** Controles de reprodução */
  isPlaying?: boolean;
  onPlayPause?(): void;
  onStop?(): void;
  onNext?(): void;
  onPrevious?(): void;
  playbackRate?: number;
  onPlaybackRateChange?(rate: number): void;
  instantReplay?: boolean;
  onReplayToggle?(): void;
};

export function ControlPanel(props: ControlPanelProps): React.ReactElement {
  const {
    searchQuery,
    onSearchChange,
    centerContent,
    volumePercent,
    onVolumeChange,
    trackMarkersExportUrl,
    markers,
    onClearMarkers,
    activeTrackId,
    liveTrackId,
    monitorTrackId,
    isPlaying = false,
    onLiveToggle,
    onMonitorToggle,
    onPlayPause,
    onStop,
    onNext,
    onPrevious,
    playbackRate = 1,
    onPlaybackRateChange,
    instantReplay = false,
    onReplayToggle,
  } = props;

  const cyclePlaybackRate = (): void => {
    if (onPlaybackRateChange == null) return;
    const idx = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIdx = idx < 0 || idx >= PLAYBACK_RATES.length - 1 ? 0 : idx + 1;
    onPlaybackRateChange(PLAYBACK_RATES[nextIdx] as number);
  };

  const hasMarkerControls =
    trackMarkersExportUrl !== undefined ||
    (markers !== undefined && markers.length > 0 && onClearMarkers !== undefined);

  return (
    <div className="control-panel glass-surface section-divider">
      {centerContent != null ? (
        <div className="control-panel-center">
          {centerContent}
        </div>
      ) : null}

      <div className="control-panel-search-section">

        <input
          id="control-panel-search-input"
          type="search"
          value={searchQuery}
          onChange={(e): void => onSearchChange(e.target.value)}
          placeholder="Pesquisar faixas..."
          className="right-sidebar-search input-glass"
          aria-label="Pesquisar faixas"
        />

        <div className="control-panel-track-actions">
          {onPlaybackRateChange != null && (
            <button
              type="button"
              className="control-panel-track-btn control-panel-track-btn-speed"
              onClick={cyclePlaybackRate}
              title={`Velocidade: ${playbackRate}x`}
              aria-label={`Velocidade ${playbackRate}x`}
            >
              <span className="control-panel-track-btn-icon" aria-hidden>{playbackRate}x</span>
            </button>
          )}
          <div className="control-panel-track-actions-nav">
            {onPrevious != null && (
              <button
                type="button"
                className="control-panel-track-btn control-panel-track-btn-nav"
                onClick={onPrevious}
                title="Faixa anterior"
                aria-label="Faixa anterior"
              >
                <span className="control-panel-track-btn-icon" aria-hidden>⏮</span>
              </button>
            )}
            {onPlayPause != null && (
              <button
                type="button"
                className={`control-panel-track-btn control-panel-track-btn-play${isPlaying ? " control-panel-track-btn-play-active" : ""}`}
                onClick={onPlayPause}
                disabled={activeTrackId == null}
                title={isPlaying ? "Pausar" : "Play"}
                aria-label={isPlaying ? "Pausar" : "Play"}
              >
                <span className="control-panel-track-btn-icon" aria-hidden>{isPlaying ? "⏸" : "▶"}</span>
              </button>
            )}
            {onStop != null && (
              <button
                type="button"
                className={`control-panel-track-btn control-panel-track-btn-stop${isPlaying ? " control-panel-track-btn-stop-active" : ""}`}
                onClick={onStop}
                disabled={!isPlaying}
                title="Parar"
                aria-label="Parar"
              >
                <span className="control-panel-track-btn-icon" aria-hidden>■</span>
              </button>
            )}
            {onNext != null && (
              <button
                type="button"
                className="control-panel-track-btn control-panel-track-btn-nav"
                onClick={onNext}
                title="Próxima faixa"
                aria-label="Próxima faixa"
              >
                <span className="control-panel-track-btn-icon" aria-hidden>⏭</span>
              </button>
            )}
          </div>
          {onReplayToggle != null && (
            <button
              type="button"
              className={`control-panel-track-btn control-panel-track-btn-replay${instantReplay ? " control-panel-track-btn-active" : ""}`}
              onClick={onReplayToggle}
              title="Replay instantâneo"
              aria-label="Replay instantâneo"
            >
              <span className="control-panel-track-btn-icon" aria-hidden>↻</span>
            </button>
          )}
        </div>

        {(onLiveToggle != null || onMonitorToggle != null) && (
          <div className="control-panel-track-row-right">
            {onLiveToggle != null && (
              <button
                type="button"
                disabled={activeTrackId == null}
                className={`control-panel-output-btn control-panel-output-btn-live${activeTrackId != null && activeTrackId === liveTrackId ? " control-panel-output-btn-on" : ""}`}
                onClick={() => { if (activeTrackId != null) onLiveToggle(activeTrackId); }}
                title={activeTrackId === liveTrackId ? "Desativar Live" : "Live"}
              >
                <span className={`control-panel-output-btn-dot status-dot${activeTrackId != null && activeTrackId === liveTrackId ? " status-dot-live" : " status-dot-idle"}`} aria-hidden />
                LIVE
              </button>
            )}
            {onMonitorToggle != null && (
              <button
                type="button"
                disabled={activeTrackId == null}
                className={`control-panel-output-btn control-panel-output-btn-monitor${activeTrackId != null && activeTrackId === monitorTrackId ? " control-panel-output-btn-on" : ""}`}
                onClick={() => { if (activeTrackId != null) onMonitorToggle(activeTrackId); }}
                title={activeTrackId === monitorTrackId ? "Desativar Monitor" : "Monitor"}
              >
                <span className={`control-panel-output-btn-dot status-dot${activeTrackId != null && activeTrackId === monitorTrackId ? " status-dot-monitor" : " status-dot-idle"}`} aria-hidden />
                🎧
              </button>
            )}
          </div>
        )}

        <div className="broadcast-controls-section">
          {volumePercent !== undefined && onVolumeChange !== undefined && (
            <div className="broadcast-controls-row">
              <span className="broadcast-controls-label">Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={volumePercent}
                onChange={(e): void => onVolumeChange(Number(e.target.value))}
                className="broadcast-slider broadcast-controls-slider"
                aria-label="Volume da transmissão"
              />
              <span className="broadcast-controls-value">{volumePercent}%</span>
            </div>
          )}

          {hasMarkerControls && (
            <div className="broadcast-controls-row broadcast-controls-tools">
              <div className="broadcast-controls-zoom">
                <span className="broadcast-controls-label">Marcadores</span>
                {trackMarkersExportUrl !== undefined ? (
                  <a
                    href={trackMarkersExportUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="broadcast-ctrl-btn-2"
                  >
                    Exportar .txt
                  </a>
                ) : (
                  <button
                    type="button"
                    className="broadcast-ctrl-btn-2"
                    disabled
                    title="Selecione uma faixa para exportar marcadores"
                  >
                    Exportar .txt
                  </button>
                )}
                {markers !== undefined && markers.length > 0 && onClearMarkers !== undefined && (
                  <button
                    type="button"
                    className="broadcast-ctrl-btn broadcast-ctrl-btn-danger"
                    onClick={onClearMarkers}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
