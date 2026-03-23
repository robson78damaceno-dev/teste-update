"use client";

import React from "react";
import type { TrackViewModel } from "@/types/player";

type TrackCardProps = {
  track: TrackViewModel;
  isActive: boolean;
  isPlaying: boolean;
  isLive: boolean;
  isMonitor: boolean;
  onSelect(trackId: string): void;
  onLiveToggle(trackId: string): void;
  onMonitorToggle(trackId: string): void;
};

export function TrackCard(props: TrackCardProps): React.ReactElement {
  const { track, isActive, isPlaying, isLive, isMonitor, onSelect, onLiveToggle, onMonitorToggle } = props;

  const handleSelect = (): void => {
    onSelect(track.id);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect();
    }
  };

  const handleLiveClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    onLiveToggle(track.id);
  };

  const handleMonitorClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    onMonitorToggle(track.id);
  };

  const isPlayingStyle = isPlaying;
  const isSelectedStyle = isActive && !isPlaying;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleCardKeyDown}
      className={`track-card pad-grid-cell group ${
        isPlayingStyle
          ? "track-card-playing"
          : isSelectedStyle
            ? "track-card-selected"
            : ""
      }`}
    >
      <div className="track-card-cover">
        {track.coverImageUrl !== undefined ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.coverImageUrl}
            alt=""
            className="track-card-cover-image"
          />
        ) : (
          <div className="track-card-cover-placeholder">
            ♪
          </div>
        )}
      </div>
      <div className="track-card-info">
        <span className={`track-card-artist ${isPlayingStyle ? "text-dark" : "text-white"}`}>
          {track.artist}
        </span>
        <span className={`track-card-title ${isPlayingStyle ? "text-dark opacity-90" : isSelectedStyle ? "text-white" : "text-primary"}`}>
          {track.title}
        </span>
        <span className={`track-card-duration ${isPlayingStyle ? "text-dark opacity-70" : isSelectedStyle ? "text-white opacity-90" : "text-muted"}`}>
          {formatDuration(track.durationMs)}
        </span>
      </div>
      <div className="track-card-actions">
        <button
          type="button"
          aria-label={isLive ? "Desativar Live" : "Enviar para Live"}
          onClick={handleLiveClick}
          title="Live"
          className={`track-card-live-btn ${isLive ? "track-card-live-btn-on" : "track-card-live-btn-off"}`}
        >
          <span className="track-card-live-label" aria-hidden>Live</span>
        </button>
        <button
          type="button"
          aria-label={isMonitor ? "Desativar Monitor" : "Enviar para Monitor"}
          onClick={handleMonitorClick}
          title="Monitor"
          className={`track-card-monitor-btn ${isMonitor ? "track-card-monitor-btn-on" : "track-card-monitor-btn-off"}`}
        >
          <span className="track-card-monitor-icon" aria-hidden>🎧</span>
        </button>
      </div>
    </div>
  );
}

function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return "–";
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
