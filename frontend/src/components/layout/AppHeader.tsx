"use client";

import React, { useState } from "react";

type AppHeaderProps = {
  onOpenScenesSidebar?(): void;
  onOpenRightSidebar?(): void;
  stereo?: boolean;
  volumeNorm?: boolean;
  onStereoToggle?(): void;
  onVolumeNormToggle?(): void;
  // Controles de playback
  isPlaying?: boolean;
  onPlayPause?(): void;
  onNext?(): void;
  onPrevious?(): void;
  loopActive?: boolean;
  onLoopToggle?(): void;
  cutActive?: boolean;
  onCutToggle?(): void;
  onScan?(): void;
  scanning?: boolean;
  instantReplay?: boolean;
  onReplayToggle?(): void;
};

export function AppHeader(props: AppHeaderProps): React.ReactElement {
  const {
    onOpenScenesSidebar,
    onOpenRightSidebar,
    stereo = true,
    volumeNorm = false,
    onStereoToggle,
    onVolumeNormToggle,
    isPlaying = false,
    onPlayPause,
    onNext,
    onPrevious,
    loopActive = false,
    onLoopToggle,
    cutActive = false,
    onCutToggle,
    onScan,
    scanning = false,
    instantReplay = false,
    onReplayToggle,
  } = props;

  return (
    <div className="app-header glass-surface section-divider">
      <div className="app-header-left">
        {onOpenScenesSidebar != null && (
          <button
            type="button"
            onClick={onOpenScenesSidebar}
            className="show-mobile-only app-header-sidebar-toggle btn-glass"
            aria-label="Abrir cenas e bancos"
          >
            <span aria-hidden>☰</span>
          </button>
        )}
        {onOpenRightSidebar != null && (
          <button
            type="button"
            onClick={onOpenRightSidebar}
            className="show-mobile-only app-header-sidebar-toggle btn-glass"
            aria-label="Abrir lista de faixas"
          >
            <span aria-hidden>📋</span>
          </button>
        )}
        <div className="app-header-controls">
          {onCutToggle != null && (
            <button
              type="button"
              onClick={onCutToggle}
              className={`app-header-ctrl-btn ${cutActive ? "btn-accent" : "btn-glass"}`}
              title="Cortar região"
            >
              Cortar
            </button>
          )}
          {onLoopToggle != null && (
            <button
              type="button"
              onClick={onLoopToggle}
              className={`app-header-ctrl-btn ${loopActive ? "btn-accent" : "btn-glass"}`}
              title="Loop"
            >
              Loop
            </button>
          )}
          {onPrevious != null && (
            <button
              type="button"
              onClick={onPrevious}
              className="app-header-ctrl-btn btn-glass"
              title="Faixa anterior"
            >
              Anterior
            </button>
          )}
          {onNext != null && (
            <button
              type="button"
              onClick={onNext}
              className="app-header-ctrl-btn btn-glass"
              title="Próxima faixa"
            >
              Próxima
            </button>
          )}
          {onPlayPause != null && (
            <button
              type="button"
              onClick={onPlayPause}
              className={`app-header-ctrl-btn ${isPlaying ? "btn-pause-active" : "btn-glass"}`}
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? "Pausar" : "Reproduzir"}
            </button>
          )}
          {onReplayToggle != null && (
            <button
              type="button"
              onClick={onReplayToggle}
              className={`app-header-ctrl-btn ${instantReplay ? "btn-accent" : "btn-glass"}`}
              title="Replay instantâneo"
            >
              Replay
            </button>
          )}
          {onScan != null && (
            <button
              type="button"
              onClick={onScan}
              disabled={scanning}
              className="app-header-ctrl-btn btn-glass"
              title="Escanear músicas"
            >
              {scanning ? "Escanando…" : "Escanear"}
            </button>
          )}
        </div>
      </div>
      <div className="app-header-right section-divider">
        <div className="app-header-controls">
          {onStereoToggle != null && (
            <button
              type="button"
              onClick={onStereoToggle}
              className={`app-header-ctrl-btn ${stereo ? "btn-accent" : "btn-glass"}`}
              title="Estéreo"
            >
              Estéreo
            </button>
          )}
          {onVolumeNormToggle != null && (
            <button
              type="button"
              onClick={onVolumeNormToggle}
              className={`app-header-ctrl-btn ${volumeNorm ? "btn-accent" : "btn-glass"}`}
              title="Normalização"
            >
              Normalização
            </button>
          )}
        </div>
        <div className="app-header-status">
          <span className="app-header-status-dot status-dot" aria-hidden />
          <span className="app-header-status-text">Conectado ao deck</span>
        </div>
      </div>
    </div>
  );
}
