"use client";

import React, { useEffect, useRef, useState } from "react";
import type { TrackViewModel } from "@/types/player";

type CartucheiraBarProps = {
  slots: (TrackViewModel | null)[];
  tracks: TrackViewModel[];
  onAssign(slotIndex: number, track: TrackViewModel): void;
  onClear(slotIndex: number): void;
  activeTrackId?: string;
  playingTrackId?: string;
  isPlaying: boolean;
  onPlayToggle(trackId: string): void;
};

export function CartucheiraBar(props: CartucheiraBarProps): React.ReactElement {
  const { slots, tracks, onAssign, onClear, activeTrackId, playingTrackId, isPlaying, onPlayToggle } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlotIndex, setPickerSlotIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const openPicker = (slotIndex: number): void => {
    setPickerSlotIndex(slotIndex);
    setPickerOpen(true);
    setSearchQuery("");
  };

  const closePicker = (): void => {
    setPickerOpen(false);
    setPickerSlotIndex(null);
  };

  const handleAssign = (track: TrackViewModel): void => {
    if (pickerSlotIndex !== null) {
      onAssign(pickerSlotIndex, track);
    }
    closePicker();
  };

  useEffect(() => {
    if (pickerOpen && searchRef.current !== null) {
      searchRef.current.focus();
    }
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") closePicker();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [pickerOpen]);

  const filteredTracks = tracks.filter((t) => {
    if (searchQuery.length === 0) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
  });

  return (
    <>
      <div className="cartucheira-bar glass-surface section-divider">
        <span className="cartucheira-bar-label">Cartucheiras</span>
        <div className="cartucheira-slots">
          {slots.map((slot, index) => {
            if (slot === null) {
              return (
                <button
                  key={index}
                  type="button"
                  className="cartucheira-slot cartucheira-slot-empty"
                  onClick={() => openPicker(index)}
                  aria-label={`Slot ${index + 1}: vazio — clique para adicionar faixa`}
                >
                  <span className="cartucheira-slot-empty-icon" aria-hidden>+</span>
                  <span className="cartucheira-slot-empty-label">Vazio</span>
                </button>
              );
            }

            const isTrackPlaying = slot.id === playingTrackId && isPlaying;
            const isActive = slot.id === activeTrackId;

            return (
              <div
                key={index}
                className={`cartucheira-slot cartucheira-slot-filled pad-grid-cell group${isTrackPlaying ? " track-card-playing" : isActive ? " track-card-selected" : ""}`}
              >
                <div className="cartucheira-slot-info">
                  <span className="cartucheira-slot-artist">{slot.artist}</span>
                  <span className="cartucheira-slot-title">{slot.title}</span>
                  <span className="cartucheira-slot-duration">{formatDuration(slot.durationMs)}</span>
                </div>
                <div className="cartucheira-slot-actions">
                  <button
                    type="button"
                    className={`track-card-play-btn ${isTrackPlaying ? "track-card-play-btn-playing" : isActive ? "track-card-play-btn-selected" : "track-card-play-btn-default"}`}
                    onClick={(e) => { e.stopPropagation(); onPlayToggle(slot.id); }}
                    aria-label={isTrackPlaying ? "Pausar" : "Reproduzir"}
                  >
                    <span className="track-card-play-icon" aria-hidden>{isTrackPlaying ? "❚❚" : "▶"}</span>
                  </button>
                  <button
                    type="button"
                    className="cartucheira-slot-clear-btn"
                    onClick={(e) => { e.stopPropagation(); onClear(index); }}
                    aria-label="Remover faixa do slot"
                    title="Remover faixa"
                  >
                    <span aria-hidden>×</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pickerOpen && (
        <div
          className="track-picker-overlay"
          onClick={closePicker}
          role="presentation"
        >
          <div
            className="track-picker-modal glass-card"
            role="dialog"
            aria-modal
            aria-label="Selecionar faixa"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="track-picker-header">
              <span className="track-picker-title">Selecionar faixa</span>
              <button
                type="button"
                className="track-picker-close-btn"
                onClick={closePicker}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="track-picker-search-wrap">
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar artista ou título..."
                className="track-picker-search input-glass"
                aria-label="Pesquisar faixas"
              />
            </div>
            <div className="track-picker-list">
              {filteredTracks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  className="track-picker-item"
                  onClick={() => handleAssign(track)}
                >
                  <span className="track-picker-item-artist">{track.artist}</span>
                  <span className="track-picker-item-title">{track.title}</span>
                  <span className="track-picker-item-duration">{formatDuration(track.durationMs)}</span>
                </button>
              ))}
              {filteredTracks.length === 0 && (
                <p className="track-picker-empty">Nenhuma faixa encontrada.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return "–";
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
