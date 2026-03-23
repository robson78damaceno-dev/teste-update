"use client";

import React, { useCallback, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { TrackViewModel } from "@/types/player";
import type { PlayRegion } from "./WaveformFromEngine";

export type RepeatMode = "off" | "one" | "all";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5] as const;
const FADE_DURATION_PRESETS = [2, 5, 10] as const;

type NowPlayingBarProps = {
  track?: TrackViewModel;
  streamUrl?: string;
  audioElement?: HTMLMediaElement | null;
  /** Quando true, permite criar AudioContext/grafo (após user gesture); evita aviso do browser. */
  allowAudioAnalyser?: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  repeatMode: RepeatMode;
  playRegion: PlayRegion;
  playbackRate: number;
  loopRegion: boolean;
  fadeInSec: number;
  fadeOutSec: number;
  onSeek(ratio: number): void;
  onRepeatChange(mode: RepeatMode): void;
  onPlayRegionChange(region: PlayRegion): void;
  onPlaybackRateChange(rate: number): void;
  onLoopRegionChange(loop: boolean): void;
  onFadeDurationChange(which: "in" | "out", seconds: number): void;
};

export function NowPlayingBar(props: NowPlayingBarProps): React.ReactElement {
  const {
    track,
    streamUrl,
    audioElement,
    allowAudioAnalyser = false,
    currentTime,
    duration,
    isPlaying,
    repeatMode,
    playRegion,
    playbackRate,
    loopRegion,
    onSeek,
    onRepeatChange,
    onPlayRegionChange,
    onPlaybackRateChange,
    onLoopRegionChange,
    fadeInSec,
    fadeOutSec,
    onFadeDurationChange,
  } = props;
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const durationSec = track !== undefined ? track.durationMs / 1000 : duration;

  const handleCutIn = useCallback((): void => {
    const start = Math.max(0, currentTime);
    const end = playRegion !== null ? playRegion.end : durationSec;
    onPlayRegionChange({ start, end: end > start ? end : durationSec });
  }, [currentTime, durationSec, playRegion, onPlayRegionChange]);

  const handleCutOut = useCallback((): void => {
    const end = Math.max(0, currentTime);
    const start = playRegion !== null ? playRegion.start : 0;
    onPlayRegionChange({ start: start < end ? start : 0, end });
  }, [currentTime, playRegion, onPlayRegionChange]);

  const handleClearRegion = useCallback((): void => {
    onPlayRegionChange(null);
  }, [onPlayRegionChange]);

  return (
    <GlassCard className="now-playing-bar-inner">
      <div className="now-playing-bar-left">
      <div className="now-playing-block">
        <div className="now-playing-block-badge">
          {track !== undefined ? "Now" : "Idle"}
        </div>
        <div className="now-playing-block-info">
          <span className="now-playing-block-label">Agora tocando</span>
          <span className="now-playing-block-title">
            {track !== undefined ? track.title : "Selecione uma faixa no touchpad"}
          </span>
          <span className="now-playing-block-meta">
            {track !== undefined ? `${track.artist} • ${track.album}` : "Artista • Álbum"}
          </span>
        </div>
        <div className="now-playing-controls-group now-playing-controls-group-playback now-playing-controls-group-compact">
          <span className="now-playing-controls-label">Reprodução</span>
          <button
            type="button"
            title={repeatMode === "one" ? "Repetir faixa" : repeatMode === "all" ? "Repetir todas" : "Sem repetir"}
            onClick={(): void => onRepeatChange(repeatMode === "off" ? "one" : repeatMode === "one" ? "all" : "off")}
            className={`now-playing-controls-btn ${repeatMode !== "off" ? "now-playing-controls-btn-accent" : "btn-glass"}`}
          >
            {repeatMode === "off" ? "⟳" : repeatMode === "one" ? "1" : "∞"}
          </button>
          <span className="now-playing-controls-sep">|</span>
          {PLAYBACK_RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              title={`Velocidade ${rate}x`}
              onClick={(): void => onPlaybackRateChange(rate)}
              className={`now-playing-controls-btn px-1 py-0.5 ${playbackRate === rate ? "now-playing-controls-btn-active" : "btn-glass"}`}
            >
              {rate}x
            </button>
          ))}
          {playRegion !== null && (
            <>
              <span className="now-playing-controls-sep">|</span>
              <button
                type="button"
                title="Repetir apenas a região (cut in/out)"
                onClick={(): void => onLoopRegionChange(!loopRegion)}
                className={`now-playing-controls-btn ${loopRegion ? "now-playing-controls-btn-accent" : "btn-glass"}`}
              >
                Repetir região
              </button>
            </>
          )}
        </div>
      </div>
      <div className="now-playing-controls">
        <div className="now-playing-controls-row">
          <div className="now-playing-controls-group now-playing-controls-group-edit">
            <span className="now-playing-controls-label">Edição</span>
            <button
              type="button"
              title="Fade in"
              onClick={(): void => setFadeIn(!fadeIn)}
              className={`now-playing-controls-btn ${fadeIn ? "now-playing-controls-btn-active" : "btn-glass"}`}
            >
              Fade in
            </button>
            {(fadeIn || fadeOut) && (
              <span className="now-playing-controls-fade-presets">
                {FADE_DURATION_PRESETS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    title={`Duração do fade: ${sec}s`}
                    onClick={(): void => {
                      if (fadeIn) onFadeDurationChange("in", sec);
                      if (fadeOut) onFadeDurationChange("out", sec);
                    }}
                    className={`now-playing-controls-btn px-1 py-0.5 ${(fadeIn && fadeInSec === sec) || (fadeOut && fadeOutSec === sec) ? "now-playing-controls-btn-active" : "btn-glass"}`}
                  >
                    {sec}s
                  </button>
                ))}
              </span>
            )}
            <button
              type="button"
              title="Fade out"
              onClick={(): void => setFadeOut(!fadeOut)}
              className={`now-playing-controls-btn ${fadeOut ? "now-playing-controls-btn-active" : "btn-glass"}`}
            >
              Fade out
            </button>
            <button
              type="button"
              title="Cut in: início do trecho na posição atual"
              onClick={handleCutIn}
              className={`now-playing-controls-btn ${playRegion !== null ? "now-playing-controls-btn-active" : "btn-glass"}`}
            >
              Cut in
            </button>
            <button
              type="button"
              title="Cut out: fim do trecho na posição atual"
              onClick={handleCutOut}
              className={`now-playing-controls-btn ${playRegion !== null ? "now-playing-controls-btn-active" : "btn-glass"}`}
            >
              Cut out
            </button>
            {playRegion !== null && (
              <button
                type="button"
                title="Limpar região de corte"
                onClick={handleClearRegion}
                className="now-playing-controls-btn btn-glass"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

    </GlassCard>
  );
}

