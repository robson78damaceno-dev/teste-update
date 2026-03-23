"use client";

import React from "react";
import type { TrackViewModel } from "@/types/player";

function formatPlaylistDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type BottomNowPlayingBarProps = {
  nowPlaying: TrackViewModel | undefined;
  nextTrack: TrackViewModel | undefined;
  playlistDurationSec: number;
  onSkip(): void;
  monitorMode: boolean;
  onMonitorToggle(): void;
};

export function BottomNowPlayingBar(props: BottomNowPlayingBarProps): React.ReactElement {
  const { nowPlaying, nextTrack, playlistDurationSec, onSkip, monitorMode, onMonitorToggle } = props;

  return (
    <div className="bottom-now-playing-bar glass-surface section-divider-top">
      <div className="bottom-now-playing-bar-left">
        <button
          type="button"
          onClick={onMonitorToggle}
          className={`bottom-now-playing-bar-monitor-btn ${monitorMode ? "bottom-now-playing-bar-monitor-btn-on" : "bottom-now-playing-bar-monitor-btn-off"}`}
        >
          Modo Monitor
        </button>
        <div className="bottom-now-playing-bar-tracks">
          <p className="bottom-now-playing-bar-line">
            A tocar:{" "}
            <span className="bottom-now-playing-bar-now-value">
              {nowPlaying !== undefined ? `${nowPlaying.artist} – ${nowPlaying.title}` : "—"}
            </span>
          </p>
          <p className="bottom-now-playing-bar-line">
            A seguir: <span className="bottom-now-playing-bar-next-value">{nextTrack !== undefined ? `${nextTrack.artist} – ${nextTrack.title}` : "—"}</span>
          </p>
        </div>
      </div>
      <div className="bottom-now-playing-bar-right">
        <button
          type="button"
          onClick={onSkip}
          className="bottom-now-playing-bar-skip"
        >
          <span className="bottom-now-playing-bar-skip-icon" aria-hidden>▶▶</span>
          <span className="bottom-now-playing-bar-skip-label">Saltar</span>
        </button>
        <span className="bottom-now-playing-bar-duration">
          Playlist: {formatPlaylistDuration(playlistDurationSec)}
        </span>
        <button type="button" className="bottom-now-playing-bar-customize-btn btn-glass">
          Personalizar ▾
        </button>
      </div>
    </div>
  );
}
