"use client";

import React from "react";

type FooterBarProps = {
  /** Total de faixas na biblioteca (online) */
  soundsCount: number;
  /** Duração total de todas as faixas */
  totalDurationSec: number;
  /** Faixas com cache local (baixadas) */
  cachedCount?: number;
  /** Duração total das faixas em cache */
  cachedDurationSec?: number;
  /** Estéreo activo */
  stereo?: boolean;
  onStereoToggle?(): void;
  /** Normalização de volume activa */
  volumeNorm?: boolean;
  onVolumeNormToggle?(): void;
  /** Estado da ligação ao servidor */
  statusConnected?: boolean;
  /** Versão do app em execução */
  appVersion?: string | null;
};

function formatLongDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function FooterBar(props: FooterBarProps): React.ReactElement {
  const {
    soundsCount,
    totalDurationSec,
    cachedCount,
    cachedDurationSec,
    stereo,
    onStereoToggle,
    volumeNorm,
    onVolumeNormToggle,
    statusConnected = true,
    appVersion = null,
  } = props;

  const resolvedCachedCount = cachedCount ?? soundsCount;
  const resolvedCachedDuration = cachedDurationSec ?? totalDurationSec;

  return (
    <div className="footer-bar" role="region" aria-label="Estatísticas da biblioteca">

      {/* Esquerda 60%: stats */}
      <div className="footer-bar-left">
        <div className="footer-bar-col">
          <span className="footer-bar-col-label">Online</span>
          <div className="footer-bar-col-values">
            <span className="footer-bar-col-count">{soundsCount}</span>
            <span className="footer-bar-col-sep">·</span>
            <span className="footer-bar-col-duration">{formatLongDuration(totalDurationSec)}</span>
          </div>
        </div>

        <div className="footer-bar-col">
          <span className="footer-bar-col-label">Baixadas</span>
          <div className="footer-bar-col-values">
            <span className="footer-bar-col-count">{resolvedCachedCount}</span>
            <span className="footer-bar-col-sep">·</span>
            <span className="footer-bar-col-duration">{formatLongDuration(resolvedCachedDuration)}</span>
          </div>
        </div>
      </div>

      {/* Direita 40%: status */}
      <div className="footer-bar-right">
        <div className="footer-bar-col footer-bar-col-status">
          {onStereoToggle != null && (
            <button
              type="button"
              onClick={onStereoToggle}
              className={`footer-bar-status-btn${stereo === true ? " footer-bar-status-btn-active" : ""}`}
              title="Estéreo"
            >
              Estéreo
            </button>
          )}
          {onVolumeNormToggle != null && (
            <button
              type="button"
              onClick={onVolumeNormToggle}
              className={`footer-bar-status-btn${volumeNorm === true ? " footer-bar-status-btn-active" : ""}`}
              title="Normalização de volume"
            >
              Norm
            </button>
          )}
          <div className="footer-bar-status-dot-wrap">
            <span className="footer-bar-status-label">
              {statusConnected ? "Conectado" : "Desconectado"}
            </span>
            <span
              className={`status-dot${statusConnected ? "" : " status-dot-off"}`}
              aria-hidden
            />
          </div>
          {appVersion !== null && (
            <span className="footer-bar-version" title="Versão do app">
              v{appVersion}
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
