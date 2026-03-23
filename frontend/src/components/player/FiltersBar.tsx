"use client";

import React from "react";
import { GlassCard } from "@/components/ui/GlassCard";

type FiltersBarProps = {
  bpmRange?: { min?: number; max?: number };
  onClear(): void;
};

export function FiltersBar(props: FiltersBarProps): React.ReactElement {
  const { bpmRange, onClear } = props;

  const bpmLabel =
    bpmRange !== undefined && (bpmRange.min !== undefined || bpmRange.max !== undefined)
      ? `${bpmRange.min ?? 40}–${bpmRange.max ?? 180} BPM`
      : "BPM";

  const hasActiveFilters =
    bpmRange !== undefined && (bpmRange.min !== undefined || bpmRange.max !== undefined);

  return (
    <GlassCard className="filters-bar">
      <div className="filters-bar-inner">
        <span className="filters-bar-section-label">Filtros</span>
        <div className="filters-bar-chips">
          <button
            type="button"
            className={`filters-bar-chip${hasActiveFilters ? " filters-bar-chip-active" : ""}`}
          >
            <span className="filters-bar-chip-icon" aria-hidden>♩</span>
            {bpmLabel}
          </button>
          <button
            type="button"
            className="filters-bar-chip"
          >
            <span className="filters-bar-chip-icon" aria-hidden>☰</span>
            Playlists
          </button>
        </div>
      </div>
      {hasActiveFilters && (
        <button
          type="button"
          className="filters-bar-clear"
          onClick={onClear}
        >
          Limpar
        </button>
      )}
    </GlassCard>
  );
}
