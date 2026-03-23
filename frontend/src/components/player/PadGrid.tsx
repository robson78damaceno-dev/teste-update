"use client";

import React, { useEffect, useRef, useState } from "react";
import type { TrackViewModel } from "@/types/player";
import { CatalogModal } from "./CatalogModal";

export type SlotData = {
  track: TrackViewModel | null;
  color: string;
};

export const SLOT_PALETTE = [
  "#00BDFF", // cyan
  "#00E676", // green
  "#FFD600", // yellow
  "#FF6D00", // orange
  "#F44336", // red
  "#E040FB", // purple
  "#FF4081", // pink
  "#FFFFFF", // white
];

export const DEFAULT_SLOT: SlotData = { track: null, color: SLOT_PALETTE[0] };

type PadGridProps = {
  tracks: TrackViewModel[];
  activeTrackId?: string;
  playingTrackId?: string;
  isPlaying: boolean;
  liveTrackId?: string | null;
  monitorTrackId?: string | null;
  monitorDeviceId?: string;
  onActivate(trackId: string): void;
  onLiveToggle(trackId: string): void;
  onMonitorToggle(trackId: string): void;
  slots: SlotData[];
  onAddSlot(track: TrackViewModel): void;
  onAssignSlot(slotIndex: number, track: TrackViewModel): void;
  onClearSlot(slotIndex: number): void;
  onColorSlot(slotIndex: number, color: string): void;
  onRefreshTracks?(): void;
};

export function PadGrid(props: PadGridProps): React.ReactElement {
  const {
    tracks, activeTrackId, playingTrackId, isPlaying,
    liveTrackId, monitorTrackId, monitorDeviceId = "none",
    onActivate, onLiveToggle, onMonitorToggle,
    slots, onAddSlot, onAssignSlot, onClearSlot, onColorSlot,
    onRefreshTracks,
  } = props;

  /* ── Modal state ── */
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSlotIndex, setCatalogSlotIndex] = useState<number | null>(null);
  const [contextMenuSlot, setContextMenuSlot] = useState<{ index: number; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [confirmClearSlot, setConfirmClearSlot] = useState<number | null>(null);
  const confirmClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmPopoverRef = useRef<HTMLDivElement | null>(null);

  /* ── Open / close catalog ── */
  const openCatalog = (slotIndex?: number): void => {
    setCatalogSlotIndex(slotIndex ?? null);
    setCatalogOpen(true);
  };

  const closeCatalog = (): void => {
    setCatalogOpen(false);
    setCatalogSlotIndex(null);
  };

  const handleCatalogSelect = (track: TrackViewModel): void => {
    if (catalogSlotIndex !== null) {
      onAssignSlot(catalogSlotIndex, track);
    } else {
      onAddSlot(track);
    }
    closeCatalog();
  };

  /* ── Close context menu on click-outside / Escape ── */
  useEffect(() => {
    if (contextMenuSlot === null) return;
    const handleClick = (e: MouseEvent): void => {
      if (contextMenuRef.current?.contains(e.target as Node)) return;
      setContextMenuSlot(null);
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setContextMenuSlot(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenuSlot]);

  /* ── Close confirm popover on click-outside / Escape ── */
  useEffect(() => {
    if (confirmClearSlot === null) return;
    const handleClick = (e: MouseEvent): void => {
      if (confirmPopoverRef.current?.contains(e.target as Node)) return;
      setConfirmClearSlot(null);
    };
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setConfirmClearSlot(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [confirmClearSlot]);

  return (
    <>
      <div className="pad-grid track-grid">
        {/* ── Filled / empty slots ── */}
        {slots.map((slot, index) => {
          const { track, color } = slot;

          if (track === null) {
            return (
              <button
                key={`slot-${index}`}
                type="button"
                className="pad-grid-cell slot-cell slot-cell-empty"
                onClick={() => openCatalog(index)}
                aria-label={`Slot ${index + 1}: vazio`}
              >
                <span className="slot-cell-add-ring" aria-hidden>
                  <svg width="32" height="32" viewBox="0 0 16 16" fill="none" shapeRendering="geometricPrecision">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                    <line x1="8" y1="4.5" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="slot-cell-empty-label">Adicionar</span>
              </button>
            );
          }

          const isTrackPlaying = track.id === playingTrackId && isPlaying;
          const isActive = track.id === activeTrackId;
          const isLive = track.id === liveTrackId;
          const isMonitor = track.id === monitorTrackId;

          return (
            <div
              key={`slot-${index}`}
              role="button"
              tabIndex={0}
              style={{ "--slot-color": color } as React.CSSProperties}
              className={`pad-grid-cell slot-cell slot-cell-filled${isTrackPlaying ? " slot-cell-playing" : isActive ? " slot-cell-active" : ""}`}
              onClick={() => onActivate(track.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(track.id); } }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenuSlot({ index, x: e.clientX, y: e.clientY });
              }}
            >
              <div className="slot-cell-cover">
                {track.coverImageUrl !== undefined ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.coverImageUrl} alt="" className="slot-cell-cover-image" />
                ) : (
                  <div className="slot-cell-cover-placeholder">♪</div>
                )}
              </div>
              <div className="slot-cell-info">
                <span className="slot-cell-artist">{track.artist.length > 0 ? track.artist : "—"}</span>
                <span className="slot-cell-title">{track.title}</span>
                <span className="slot-cell-duration">{formatDuration(track.durationMs)}</span>
              </div>

              {isLive && <span className="slot-cell-badge slot-cell-badge-live">LIVE</span>}
              {isMonitor && <span className="slot-cell-badge slot-cell-badge-monitor">MON</span>}

              <button
                type="button"
                className="slot-cell-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirmClearTimerRef.current !== null) clearTimeout(confirmClearTimerRef.current);
                  setConfirmClearSlot(confirmClearSlot === index ? null : index);
                  confirmClearTimerRef.current = setTimeout(() => setConfirmClearSlot(null), 5000);
                }}
                title="Remover faixa"
                aria-label="Remover faixa"
              >
                <span className="slot-cell-clear-btn-inner">
                  <span className="slot-cell-clear-btn-ping" aria-hidden />
                  <span className="slot-cell-clear-btn-badge" aria-hidden>×</span>
                </span>
              </button>

              {confirmClearSlot === index && (
                <div
                  ref={confirmPopoverRef}
                  className="slot-confirm-popover"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="slot-confirm-popover-text">Remover faixa?</span>
                  <div className="slot-confirm-popover-actions">
                    <button
                      type="button"
                      className="slot-confirm-popover-btn slot-confirm-popover-btn-cancel"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirmClearTimerRef.current !== null) clearTimeout(confirmClearTimerRef.current);
                        setConfirmClearSlot(null);
                      }}
                    >
                      Não
                    </button>
                    <button
                      type="button"
                      className="slot-confirm-popover-btn slot-confirm-popover-btn-confirm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirmClearTimerRef.current !== null) clearTimeout(confirmClearTimerRef.current);
                        setConfirmClearSlot(null);
                        onClearSlot(index);
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Context menu: slot colors ── */}
        {contextMenuSlot !== null && (
          <div
            ref={contextMenuRef}
            className="slot-context-menu"
            style={{ left: contextMenuSlot.x, top: contextMenuSlot.y }}
            role="menu"
            aria-label="Cor do slot"
          >
            <span className="slot-context-menu-label">Cor do slot</span>
            <div className="slot-context-menu-swatches">
              {SLOT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`slot-color-swatch${slots[contextMenuSlot.index]?.color === c ? " slot-color-swatch-active" : ""}`}
                  style={{ background: c }}
                  onClick={() => { onColorSlot(contextMenuSlot.index, c); setContextMenuSlot(null); }}
                  title={c}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Add new slot button ── */}
        <button
          type="button"
          className="pad-grid-cell slot-cell slot-cell-empty slot-cell-add-new"
          onClick={() => openCatalog()}
          aria-label="Adicionar novo slot"
        >
          <span className="slot-cell-add-ring" aria-hidden>
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" shapeRendering="geometricPrecision">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
              <line x1="8" y1="4.5" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
          <span className="slot-cell-empty-label">Novo slot</span>
        </button>
      </div>

      {/* ── Enhanced Catalog Modal ── */}
      <CatalogModal
        isOpen={catalogOpen}
        onClose={closeCatalog}
        localTracks={tracks}
        monitorDeviceId={monitorDeviceId}
        onSelectTrack={handleCatalogSelect}
        onRefreshTracks={onRefreshTracks}
        onlineOnly
      />
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
