"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TrackViewModel } from "@/types/player";
import type { TrackDto } from "@/lib/api/tracks-api";
import {
  getTrackCoverUrl,
  getTrackStreamUrl,
  fetchCachedTrackIds,
  fetchCachedTracksAsDto,
  cacheOnlineTrack,
  getCachedStreamUrl,
  getCachedCoverUrl,
  removeCachedTrack,
} from "@/lib/api/tracks-api";
import { fetchMjcSongs, getMjcSongsBaseUrl } from "@/lib/api/mjc-songs-api";

/* ─────────────────────────────────────
   SVG Icons
───────────────────────────────────── */
function IconPlay(): React.ReactElement {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden>
      <path d="M1.5 1.2L9 6L1.5 10.8V1.2Z" />
    </svg>
  );
}
function IconStop(): React.ReactElement {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <rect x="1.5" y="1.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconPlus(): React.ReactElement {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M5.5 1.5v8M1.5 5.5h8" />
    </svg>
  );
}
function IconDownload(): React.ReactElement {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M5.5 1v8M2.5 6.5l3 2.5 3-2.5M1 12h9" />
    </svg>
  );
}
function IconTrash(): React.ReactElement {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1.5 3.5h8M4 3.5V2.5h3v1M3 3.5l.5 7.5h4l.5-7.5" />
    </svg>
  );
}
function IconCopy(): React.ReactElement {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3.5" width="6" height="8" rx="1.2" />
      <path d="M1.5 9.5V2h6.5" />
    </svg>
  );
}
function IconRefresh(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <path d="M2 7A5 5 0 1 1 7 12M2 4.5V7H4.5" />
    </svg>
  );
}
function IconCheck(): React.ReactElement {
  return (
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 4.5L4 7.5L10 1" />
    </svg>
  );
}
function IconSearch(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <circle cx="6" cy="6" r="4.5" />
      <path d="M9.5 9.5L13 13" />
    </svg>
  );
}
function IconLocal(): React.ReactElement {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1.5 10.5V4a1 1 0 0 1 1-1h3.5l1.5 1.5h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1Z" />
      <path d="M6 8.5L7.5 6l1.5 2.5H6Z" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
  );
}
function IconOnline(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <circle cx="7" cy="7" r="5.5" />
      <path d="M7 1.5c-1.8 1.5-3 3.2-3 5.5s1.2 4 3 5.5M7 1.5c1.8 1.5 3 3.2 3 5.5s-1.2 4-3 5.5M1.5 7h11" />
    </svg>
  );
}
function IconLibraries(): React.ReactElement {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="1" y="4" width="13" height="8" rx="1.5" />
      <path d="M4 4V3a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1" />
      <path d="M5.5 8h4M7.5 6v4" />
    </svg>
  );
}

function IconStar(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
      <path d="M6 1l1.5 3.2L11 4.6 8.5 7l.6 3.4L6 8.8 2.9 10.4l.6-3.4L1 4.6l3.5-.4Z" />
    </svg>
  );
}
function IconStarFilled(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M6 1l1.5 3.2L11 4.6 8.5 7l.6 3.4L6 8.8 2.9 10.4l.6-3.4L1 4.6l3.5-.4Z" />
    </svg>
  );
}
function IconFilter(): React.ReactElement {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M1 2h10L7 6.5V10L5 11V6.5L1 2Z" />
    </svg>
  );
}

/* ─────────────────────────────────────
   Types
───────────────────────────────────── */
type CatalogTab = "online" | "local";
type SortField = "title" | "artist" | "duration" | "bpm";
type SortDir = "asc" | "desc";

type CatalogModalProps = {
  isOpen: boolean;
  onClose(): void;
  localTracks: TrackViewModel[];
  monitorDeviceId?: string;
  onSelectTrack(track: TrackViewModel): void;
  onRefreshTracks?(): void;
  /** Quando true, mostra apenas a aba Online (sem Local/Gerir). */
  onlineOnly?: boolean;
};

/* ─────────────────────────────────────
   Helpers
───────────────────────────────────── */
function IconSortAsc(): React.ReactElement {
  return (
    <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" aria-hidden>
      <path d="M4 1L7.5 6H0.5L4 1Z" />
    </svg>
  );
}
function IconSortDesc(): React.ReactElement {
  return (
    <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" aria-hidden>
      <path d="M4 9L0.5 4H7.5L4 9Z" />
    </svg>
  );
}

function sortTracks<T extends { title: string; artist: string; durationMs: number; bpm?: number }>(
  tracks: T[],
  field: SortField,
  dir: SortDir,
): T[] {
  const m = dir === "asc" ? 1 : -1;
  return [...tracks].sort((a, b) => {
    switch (field) {
      case "title": return m * a.title.localeCompare(b.title);
      case "artist": return m * a.artist.localeCompare(b.artist);
      case "duration": return m * (a.durationMs - b.durationMs);
      case "bpm": return m * ((a.bpm ?? 0) - (b.bpm ?? 0));
      default: return 0;
    }
  });
}

const FAVORITES_KEY = "mjc-favorites";
function loadFavorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[]); }
  catch { return new Set(); }
}
function saveFavorites(ids: Set<string>): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "–";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function trackDtoToViewModel(dto: TrackDto): TrackViewModel {
  return {
    id: dto.id,
    title: dto.title,
    artist: dto.artist,
    album: dto.album,
    bpm: dto.bpm,
    durationMs: dto.durationMs,
    coverImageUrl: dto.coverImagePath !== undefined ? getTrackCoverUrl(dto.id) : undefined,
    streamUrl: getTrackStreamUrl(dto.id),
  };
}

function trackDtoToViewModelOnline(dto: TrackDto): TrackViewModel {
  return {
    id: dto.id,
    title: dto.title,
    artist: dto.artist,
    album: dto.album,
    bpm: dto.bpm,
    durationMs: dto.durationMs,
    coverImageUrl: dto.coverImagePath,
    streamUrl: `${getMjcSongsBaseUrl()}${dto.filePath}`,
  };
}

/* ─────────────────────────────────────
   CatalogModal (main)
───────────────────────────────────── */
export function CatalogModal(props: CatalogModalProps): React.ReactElement | null {
  const {
    isOpen,
    onClose,
    localTracks,
    monitorDeviceId = "none",
    onSelectTrack,
    onRefreshTracks,
    onlineOnly = false,
  } = props;

  const [activeTab, setActiveTab] = useState<CatalogTab>("online");
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  /* favorites */
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => loadFavorites());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const toggleFavorite = (trackId: string): void => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId); else next.add(trackId);
      saveFavorites(next);
      return next;
    });
  };

  /* sort */
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const toggleSort = (field: SortField): void => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  /* advanced filters */
  const [showFilters, setShowFilters] = useState(false);
  const [bpmMin, setBpmMin] = useState<number | null>(null);
  const [bpmMax, setBpmMax] = useState<number | null>(null);
  const [durationFilter, setDurationFilter] = useState<string | null>(null); // "<2" | "2-5" | "5-10" | ">10"
  const hasActiveFilters = bpmMin !== null || bpmMax !== null || durationFilter !== null;
  const clearFilters = (): void => { setBpmMin(null); setBpmMax(null); setDurationFilter(null); };

  /* preview */
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(0.8);
  const previewBarRef = useRef<HTMLDivElement | null>(null);

  /* cover tooltip */
  const [coverTooltip, setCoverTooltip] = useState<{ url: string; x: number; y: number } | null>(null);
  const coverTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const handleCoverEnter = (e: React.MouseEvent, url: string | undefined): void => {
    if (!url) return;
    coverTooltipTimer.current = setTimeout(() => {
      const modal = modalRef.current;
      if (!modal) return;
      const mr = modal.getBoundingClientRect();
      const tr = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = Math.min(tr.right + 8 - mr.left, mr.width - 216);
      const y = Math.min(tr.top - mr.top, mr.height - 216);
      setCoverTooltip({ url, x: Math.max(0, x), y: Math.max(0, y) });
    }, 300);
  };

  const handleCoverLeave = (): void => {
    if (coverTooltipTimer.current) clearTimeout(coverTooltipTimer.current);
    coverTooltipTimer.current = null;
    setCoverTooltip(null);
  };

  /* online */
  const [onlineTracks, setOnlineTracks] = useState<TrackDto[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineOffline, setOnlineOffline] = useState(false); // true = showing cached fallback
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [cachingIds, setCachingIds] = useState<Set<string>>(new Set());

  /* local (cached) */
  const [localCachedTracks, setLocalCachedTracks] = useState<TrackViewModel[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  /* focus search on tab change */
  useEffect(() => {
    setSearchQuery("");
    setTimeout(() => searchRef.current?.focus(), 60);
  }, [activeTab]);

  /* load online tracks */
  const loadOnlineTracks = useCallback(async () => {
    if (onlineTracks.length > 0) return;
    setOnlineLoading(true);
    setOnlineError(null);
    setOnlineOffline(false);
    try {
      const [songs, cached] = await Promise.all([
        fetchMjcSongs(),
        fetchCachedTrackIds(),
      ]);
      setOnlineTracks(songs);
      setCachedIds(cached);
    } catch {
      // Online API indisponível — tentar mostrar faixas em cache
      try {
        const cachedTracks = await fetchCachedTracksAsDto();
        if (cachedTracks.length > 0) {
          setOnlineTracks(cachedTracks);
          setCachedIds(new Set(cachedTracks.map((t) => t.id)));
          setOnlineOffline(true);
        } else {
          setOnlineError("API online indisponível e sem faixas em cache.");
        }
      } catch {
        setOnlineError("API online indisponível e sem faixas em cache.");
      }
    } finally {
      setOnlineLoading(false);
    }
  }, [onlineTracks.length]);

  /* load local cached tracks */
  const loadLocalCached = useCallback(async () => {
    setLocalLoading(true);
    try {
      const cached = await fetchCachedTracksAsDto();
      setLocalCachedTracks(cached.map((dto) => ({
        id: dto.id,
        title: dto.title,
        artist: dto.artist,
        album: dto.album,
        bpm: dto.bpm,
        durationMs: dto.durationMs,
        coverImageUrl: dto.coverImagePath !== undefined ? getCachedCoverUrl(dto.id) : undefined,
        streamUrl: getCachedStreamUrl(dto.id),
      })));
    } catch {
      setLocalCachedTracks([]);
    } finally {
      setLocalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === "online") void loadOnlineTracks();
    if (activeTab === "local") void loadLocalCached();
  }, [isOpen, activeTab, loadOnlineTracks, loadLocalCached]);

  /* escape */
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent): void => {
      if (e.key === "Escape") confirmDeleteId !== null ? setConfirmDeleteId(null) : onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, onClose, confirmDeleteId]);

  /* preview */
  const stopPreview = (): void => {
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audio.ontimeupdate = null;
      audio.onloadedmetadata = null;
      audio.onended = null;
    }
    setPreviewTrackId(null);
    setPreviewProgress(0);
    setPreviewDuration(0);
  };

  const handlePreview = (e: React.MouseEvent, trackId: string, streamUrl: string): void => {
    e.stopPropagation();
    if (previewTrackId === trackId) { stopPreview(); return; }
    if (!previewAudioRef.current) previewAudioRef.current = new Audio();
    const audio = previewAudioRef.current;
    audio.pause();
    audio.src = streamUrl;
    audio.volume = previewVolume;
    audio.ontimeupdate = () => {
      if (audio.duration > 0) setPreviewProgress(audio.currentTime / audio.duration);
    };
    audio.onloadedmetadata = () => setPreviewDuration(audio.duration * 1000);
    audio.onended = () => stopPreview();
    const sink = monitorDeviceId === "none" ? "default" : monitorDeviceId;
    const doPlay = (): void => { void audio.play().catch(() => {}); setPreviewTrackId(trackId); };
    const sinkable = audio as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    if (typeof sinkable.setSinkId === "function") void sinkable.setSinkId(sink).then(doPlay).catch(doPlay);
    else doPlay();
  };

  const handlePreviewSeek = (e: React.MouseEvent<HTMLDivElement>): void => {
    const audio = previewAudioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setPreviewProgress(ratio);
  };

  const handlePreviewVolume = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = parseFloat(e.target.value);
    setPreviewVolume(v);
    if (previewAudioRef.current) previewAudioRef.current.volume = v;
  };

  /* cache offline */
  const handleCache = async (e: React.MouseEvent, track: TrackDto): Promise<void> => {
    e.stopPropagation();
    if (cachedIds.has(track.id)) {
      // Already cached → remove from cache
      setCachingIds((p) => new Set(p).add(track.id));
      try {
        await removeCachedTrack(track.id);
        setCachedIds((p) => { const s = new Set(p); s.delete(track.id); return s; });
      } catch { /* silent */ } finally {
        setCachingIds((p) => { const s = new Set(p); s.delete(track.id); return s; });
      }
      return;
    }
    const sourceUrl = `${getMjcSongsBaseUrl()}${track.filePath}`;
    const fileName = track.fileName.length > 0 ? track.fileName : `${track.artist} - ${track.title}.mp3`;
    setCachingIds((p) => new Set(p).add(track.id));
    try {
      await cacheOnlineTrack({
        sourceUrl,
        onlineId: track.id,
        fileName,
        title: track.title,
        artist: track.artist,
        album: track.album,
        genre: track.genre,
        year: track.year,
        durationMs: track.durationMs,
        coverUrl: track.coverImagePath,
      });
      setCachedIds((p) => new Set(p).add(track.id));
    } catch { /* silent */ } finally {
      setCachingIds((p) => { const s = new Set(p); s.delete(track.id); return s; });
    }
  };

  /* delete cached track */
  const handleDeleteCached = async (trackId: string): Promise<void> => {
    setDeletingIds((p) => new Set(p).add(trackId));
    try {
      await removeCachedTrack(trackId);
      setLocalCachedTracks((p) => p.filter((t) => t.id !== trackId));
      setCachedIds((p) => { const s = new Set(p); s.delete(trackId); return s; });
      setConfirmDeleteId(null);
    } catch { /* silent */ } finally {
      setDeletingIds((p) => { const s = new Set(p); s.delete(trackId); return s; });
    }
  };

  if (!isOpen) return null;

  const q = searchQuery.toLowerCase();
  const matchesDuration = (ms: number): boolean => {
    if (!durationFilter) return true;
    const min = ms / 60000;
    switch (durationFilter) {
      case "<2": return min < 2;
      case "2-5": return min >= 2 && min < 5;
      case "5-10": return min >= 5 && min < 10;
      case ">10": return min >= 10;
      default: return true;
    }
  };
  const matchesBpm = (bpm?: number): boolean => {
    if (bpmMin === null && bpmMax === null) return true;
    const v = bpm ?? 0;
    if (bpmMin !== null && v < bpmMin) return false;
    if (bpmMax !== null && v > bpmMax) return false;
    return true;
  };
  const filteredLocal = sortTracks(
    localCachedTracks.filter(
      (t) =>
        (q.length === 0 || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || (t.album ?? "").toLowerCase().includes(q))
        && (!showFavoritesOnly || favoriteIds.has(t.id))
        && matchesDuration(t.durationMs) && matchesBpm(t.bpm)
    ),
    sortField, sortDir,
  );
  const filteredOnline = sortTracks(
    onlineTracks.filter(
      (t) =>
        (q.length === 0 || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q))
        && (!showFavoritesOnly || favoriteIds.has(t.id))
        && matchesDuration(t.durationMs) && matchesBpm(t.bpm)
    ),
    sortField, sortDir,
  );
  const trackCount = activeTab === "local" ? filteredLocal.length : filteredOnline.length;

  return (
    <div className="catalog-overlay cm-overlay" onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className="cm-modal"
        role="dialog"
        aria-modal
        aria-label="Catálogo de media"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <header className="cm-header">
          {/* Tab bar */}
          <nav className="cm-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "online"}
              type="button"
              className={`cm-tab${activeTab === "online" ? " cm-tab-active" : ""}`}
              onClick={() => setActiveTab("online")}
            >
              <span className="cm-tab-icon"><IconOnline /></span>
              Online
              <span className={`cm-tab-status-dot${onlineOffline ? " cm-tab-status-dot-offline" : ""}`} aria-hidden />
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "local"}
              type="button"
              className={`cm-tab${activeTab === "local" ? " cm-tab-active" : ""}`}
              onClick={() => setActiveTab("local")}
            >
              <span className="cm-tab-icon"><IconLocal /></span>
              Local
            </button>

            {/* Right side inline */}
            <div className="cm-header-right">
              <div className="cm-search-wrap">
                <span className="cm-search-icon"><IconSearch /></span>
                <input
                  ref={searchRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar…"
                  className="cm-search"
                  aria-label="Pesquisar faixas"
                />
              </div>
              <button
                type="button"
                className={`cm-filter-pill${showFavoritesOnly ? " cm-filter-pill-active" : ""}`}
                onClick={() => setShowFavoritesOnly((v) => !v)}
                title={showFavoritesOnly ? "Mostrar todas" : "Apenas favoritos"}
              >
                <IconStarFilled /> Favoritos
              </button>
              <button
                type="button"
                className={`cm-filter-pill${showFilters || hasActiveFilters ? " cm-filter-pill-active-cyan" : ""}`}
                onClick={() => setShowFilters((v) => !v)}
                title="Filtros avançados"
              >
                <IconFilter /> Filtros
              </button>
              <span className="cm-count">{trackCount} <span className="cm-count-label">faixa{trackCount !== 1 ? "s" : ""}</span></span>
              <button type="button" className="cm-close" onClick={onClose} aria-label="Fechar">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M1 1l10 10M11 1L1 11" />
                </svg>
              </button>
            </div>
          </nav>
        </header>

        {/* ── Filters panel ── */}
        {showFilters && (
          <div className="cm-filters">
            <div className="cm-filters-group">
              <span className="cm-filters-label">Duração</span>
              <div className="cm-filters-pills">
                {(["<2", "2-5", "5-10", ">10"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`cm-fpill${durationFilter === v ? " cm-fpill-active" : ""}`}
                    onClick={() => setDurationFilter(durationFilter === v ? null : v)}
                  >
                    {v === "<2" ? "< 2 min" : v === "2-5" ? "2–5 min" : v === "5-10" ? "5–10 min" : "> 10 min"}
                  </button>
                ))}
              </div>
            </div>
            <div className="cm-filters-group">
              <span className="cm-filters-label">BPM</span>
              <div className="cm-filters-bpm">
                <input
                  type="number"
                  placeholder="Min"
                  value={bpmMin ?? ""}
                  onChange={(e) => setBpmMin(e.target.value.length > 0 ? Number(e.target.value) : null)}
                  className="cm-filters-input"
                  min={0}
                  max={300}
                />
                <span className="cm-filters-sep">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={bpmMax ?? ""}
                  onChange={(e) => setBpmMax(e.target.value.length > 0 ? Number(e.target.value) : null)}
                  className="cm-filters-input"
                  min={0}
                  max={300}
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button type="button" className="cm-filters-clear" onClick={clearFilters}>
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* ── Body ── */}
        <div className="cm-body">
          <div className="cm-list-header">
            <span className="cm-lh-num">#</span>
            <span className="cm-lh-cover" />
            <button type="button" className={`cm-sort-btn${sortField === "title" ? " cm-sort-btn-active" : ""}`} onClick={() => toggleSort("title")}>
              Titulo {sortField === "title" && (sortDir === "asc" ? <IconSortAsc /> : <IconSortDesc />)}
            </button>
            <button type="button" className={`cm-sort-btn cm-sort-btn-r${sortField === "duration" ? " cm-sort-btn-active" : ""}`} onClick={() => toggleSort("duration")}>
              Durac. {sortField === "duration" && (sortDir === "asc" ? <IconSortAsc /> : <IconSortDesc />)}
            </button>
            <div className="cm-lh-actions">
              <button type="button" className={`cm-sort-btn cm-sort-btn-sm${sortField === "bpm" ? " cm-sort-btn-active" : ""}`} onClick={() => toggleSort("bpm")}>
                BPM {sortField === "bpm" && (sortDir === "asc" ? <IconSortAsc /> : <IconSortDesc />)}
              </button>
            </div>
          </div>

          {activeTab === "online" && (
            <OnlineContent
              tracks={filteredOnline}
              loading={onlineLoading}
              error={onlineError}
              offlineMode={onlineOffline}
              previewTrackId={previewTrackId}
              downloadingIds={downloadingIds}
              cachedIds={cachedIds}
              cachingIds={cachingIds}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onPreview={handlePreview}
              onCache={(e, t) => void handleCache(e, t)}
              onSelect={(t) => { stopPreview(); onSelectTrack(t); onClose(); }}
              onCoverEnter={handleCoverEnter}
              onCoverLeave={handleCoverLeave}
            />
          )}

          {activeTab === "local" && (
            localLoading ? (
              <div className="cm-empty">
                <div className="cm-spinner" aria-label="A carregar" />
                <p className="cm-empty-title">A carregar faixas locais…</p>
              </div>
            ) : (
              <TrackList
                tracks={filteredLocal}
                mode="local"
                previewTrackId={previewTrackId}
                deletingIds={deletingIds}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onPreview={handlePreview}
                onSelect={(t) => { stopPreview(); onSelectTrack(t); onClose(); }}
                onCoverEnter={handleCoverEnter}
                onCoverLeave={handleCoverLeave}
                emptyIcon={<LocalEmptyIcon />}
                emptyTitle="Nenhuma faixa em cache"
                emptyDesc="Faça download de faixas na aba Online para ficarem disponíveis aqui."
              />
            )
          )}
        </div>

        {/* ── Cover tooltip ── */}
        {coverTooltip !== null && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverTooltip.url}
            alt=""
            className="cm-cover-tooltip"
            style={{ left: coverTooltip.x, top: coverTooltip.y }}
          />
        )}

        {/* ── Preview mini-player bar ── */}
        {previewTrackId !== null && (() => {
          const pt = localCachedTracks.find((t) => t.id === previewTrackId)
            ?? (onlineTracks.find((t) => t.id === previewTrackId)
              ? trackDtoToViewModelOnline(onlineTracks.find((t) => t.id === previewTrackId)!)
              : null);
          if (!pt) return null;
          return (
            <div className="cm-preview-bar" ref={previewBarRef}>
              <div className="cm-preview-progress" onClick={handlePreviewSeek} role="progressbar" aria-valuenow={Math.round(previewProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="cm-preview-progress-fill" style={{ width: `${previewProgress * 100}%` }} />
              </div>
              <div className="cm-preview-content">
                <div className="cm-preview-cover">
                  {pt.coverImageUrl !== undefined ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pt.coverImageUrl} alt="" className="cm-preview-cover-img" />
                  ) : (
                    <svg width="12" height="14" viewBox="0 0 16 18" fill="currentColor" opacity="0.3" aria-hidden><path d="M6 3v8.5A2.5 2.5 0 1 1 3.5 9H5V3h7v3H6Z" /></svg>
                  )}
                </div>
                <div className="cm-preview-info">
                  <span className="cm-preview-title">{pt.title}</span>
                  <span className="cm-preview-artist">{pt.artist}</span>
                </div>
                <span className="cm-preview-time">
                  {formatDuration(previewProgress * previewDuration)} / {formatDuration(previewDuration)}
                </span>
                <button type="button" className="cm-btn cm-btn-stop cm-preview-play" onClick={(e) => handlePreview(e, pt.id, pt.streamUrl ?? "")} aria-label="Parar preview">
                  <IconStop />
                </button>
                <div className="cm-preview-vol">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" opacity="0.4" aria-hidden><path d="M2 6h2.5L8 3v10L4.5 10H2V6Z" /><path d="M10.5 4.5a4.5 4.5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  <input type="range" min="0" max="1" step="0.01" value={previewVolume} onChange={handlePreviewVolume} className="cm-preview-vol-slider" aria-label="Volume" />
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Confirm delete */}
      {confirmDeleteId !== null && (
        <ConfirmDelete
          title={localCachedTracks.find((t) => t.id === confirmDeleteId)?.title ?? "esta faixa"}
          isDeleting={deletingIds.has(confirmDeleteId)}
          onConfirm={() => void handleDeleteCached(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────
   TrackList (used by both Local & Libraries)
───────────────────────────────────── */
type TrackListProps = {
  tracks: TrackViewModel[];
  mode: "local" | "library";
  previewTrackId: string | null;
  deletingIds?: Set<string>;
  copiedTrackId?: string | null;
  favoriteIds?: Set<string>;
  onToggleFavorite?(id: string): void;
  onPreview(e: React.MouseEvent, id: string, url: string): void;
  onSelect(t: TrackViewModel): void;
  onRequestDelete?(id: string): void;
  onCopyPath?(id: string, path: string): void;
  onCoverEnter?(e: React.MouseEvent, url: string | undefined): void;
  onCoverLeave?(): void;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDesc?: string;
};

function TrackList(props: TrackListProps): React.ReactElement {
  const {
    tracks, mode, previewTrackId, deletingIds = new Set(), copiedTrackId,
    favoriteIds = new Set(), onToggleFavorite,
    onPreview, onSelect, onRequestDelete, onCopyPath,
    onCoverEnter, onCoverLeave,
    emptyIcon, emptyTitle = "Nenhuma faixa", emptyDesc,
  } = props;

  if (tracks.length === 0) {
    return (
      <div className="cm-empty">
        {emptyIcon && <div className="cm-empty-icon">{emptyIcon}</div>}
        <p className="cm-empty-title">{emptyTitle}</p>
        {emptyDesc && <p className="cm-empty-desc">{emptyDesc}</p>}
      </div>
    );
  }

  return (
    <div className="cm-list">
      {tracks.map((track, idx) => {
        const isPrev = previewTrackId === track.id;
        const isDel = deletingIds.has(track.id);
        const isCopied = copiedTrackId === track.id;
        const isFav = favoriteIds.has(track.id);
        const url = track.streamUrl ?? "";

        return (
          <div
            key={track.id}
            className={`cm-row${isPrev ? " cm-row-previewing" : ""}`}
          >
            <span className="cm-row-num">{idx + 1}</span>

            {/* Cover + play overlay */}
            <div
              className="cm-row-cover"
              onClick={(e) => url.length > 0 ? onPreview(e, track.id, url) : undefined}
              role={url.length > 0 ? "button" : undefined}
              tabIndex={url.length > 0 ? 0 : undefined}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && url.length > 0) onPreview(e as unknown as React.MouseEvent, track.id, url); }}
              onMouseEnter={(e) => onCoverEnter?.(e, track.coverImageUrl)}
              onMouseLeave={onCoverLeave}
              aria-label={isPrev ? "Parar preview" : "Preview"}
              title={isPrev ? "Parar preview" : "Preview"}
            >
              {track.coverImageUrl !== undefined ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.coverImageUrl} alt="" className="cm-row-cover-img" />
              ) : (
                <div className="cm-row-cover-placeholder">
                  <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" opacity="0.25" aria-hidden>
                    <path d="M6 3v8.5A2.5 2.5 0 1 1 3.5 9H5V3h7v3H6Z" />
                  </svg>
                </div>
              )}
              <div className={`cm-row-play-overlay${isPrev ? " cm-row-play-overlay-active" : ""}`}>
                {isPrev ? <IconStop /> : <IconPlay />}
              </div>
            </div>

            {/* Info */}
            <div className="cm-row-info">
              <span className="cm-row-title">{track.title}</span>
              <span className="cm-row-sub">{track.artist.length > 0 ? track.artist : "—"}</span>
              <div className="cm-row-tags">
                {track.album !== undefined && track.album.length > 0 && (
                  <span className="cm-tag">{track.album}</span>
                )}
                {track.bpm !== undefined && (
                  <span className="cm-tag cm-tag-bpm">{track.bpm} BPM</span>
                )}
              </div>
            </div>

            <span className="cm-row-dur">{formatDuration(track.durationMs)}</span>

            {/* Actions */}
            <div className="cm-row-actions">
              {onToggleFavorite !== undefined && (
                <button
                  type="button"
                  className={`cm-btn${isFav ? " cm-btn-starred" : " cm-btn-star"}`}
                  onClick={() => onToggleFavorite(track.id)}
                  data-tooltip={isFav ? "Remover dos favoritos" : "Favoritar"}
                  aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  {isFav ? <IconStarFilled /> : <IconStar />}
                </button>
              )}
              {url.length > 0 && (
                <button
                  type="button"
                  className={`cm-btn${isPrev ? " cm-btn-stop" : " cm-btn-play"}`}
                  onClick={(e) => onPreview(e, track.id, url)}
                  data-tooltip={isPrev ? "Parar" : "Preview"}
                  aria-label={isPrev ? "Parar preview" : "Preview"}
                >
                  {isPrev ? <IconStop /> : <IconPlay />}
                </button>
              )}
              <button
                type="button"
                className="cm-btn cm-btn-add"
                onClick={() => onSelect(track)}
                data-tooltip="Adicionar ao slot"
                aria-label="Adicionar ao slot"
              >
                <IconPlus />
              </button>
              {mode === "local" && onCopyPath !== undefined && (
                <button
                  type="button"
                  className={`cm-btn${isCopied ? " cm-btn-copied" : " cm-btn-copy"}`}
                  onClick={() => onCopyPath(track.id, track.streamUrl ?? track.title)}
                  data-tooltip="Copiar caminho"
                  aria-label="Copiar caminho do ficheiro"
                >
                  {isCopied ? <IconCheck /> : <IconCopy />}
                </button>
              )}
              {mode === "local" && onRequestDelete !== undefined && (
                <button
                  type="button"
                  className="cm-btn cm-btn-del"
                  onClick={() => onRequestDelete(track.id)}
                  disabled={isDel}
                  data-tooltip="Remover"
                  aria-label="Remover da biblioteca"
                >
                  <IconTrash />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────
   OnlineContent
───────────────────────────────────── */
type OnlineContentProps = {
  tracks: TrackDto[];
  loading: boolean;
  error: string | null;
  offlineMode?: boolean;
  previewTrackId: string | null;
  downloadingIds: Set<string>;
  cachedIds: Set<string>;
  cachingIds: Set<string>;
  favoriteIds?: Set<string>;
  onToggleFavorite?(id: string): void;
  onPreview(e: React.MouseEvent, id: string, url: string): void;
  onCache(e: React.MouseEvent, track: TrackDto): void;
  onSelect(t: TrackViewModel): void;
  onCoverEnter?(e: React.MouseEvent, url: string | undefined): void;
  onCoverLeave?(): void;
};

function OnlineContent(p: OnlineContentProps): React.ReactElement {
  const { tracks, loading, error, offlineMode = false, previewTrackId, downloadingIds, cachedIds, cachingIds, favoriteIds = new Set(), onToggleFavorite, onPreview, onCache, onSelect, onCoverEnter, onCoverLeave } = p;

  if (loading) return (
    <div className="cm-empty">
      <div className="cm-spinner" aria-label="A carregar" />
      <p className="cm-empty-title">A carregar faixas online…</p>
    </div>
  );

  if (error !== null) return (
    <div className="cm-empty">
      <OnlineEmptyIcon />
      <p className="cm-empty-title">Não foi possível carregar</p>
      <p className="cm-empty-desc">{error}</p>
    </div>
  );

  if (tracks.length === 0) return (
    <div className="cm-empty">
      <OnlineEmptyIcon />
      <p className="cm-empty-title">Nenhuma faixa online encontrada</p>
    </div>
  );

  return (
    <div className="cm-list">
      {offlineMode && (
        <div className="cm-offline-banner">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <circle cx="7" cy="7" r="5.5" />
            <path d="M7 4.5v3M7 9.5h.01" />
          </svg>
          Sem ligação à API — a mostrar {tracks.length} faixa{tracks.length !== 1 ? "s" : ""} em cache offline
        </div>
      )}
      {tracks.map((track, idx) => {
        const isCached = cachedIds.has(track.id);
        const isCaching = cachingIds.has(track.id);
        const streamUrl = isCached
          ? getCachedStreamUrl(track.id)
          : `${getMjcSongsBaseUrl()}${track.filePath}`;
        const isPrev = previewTrackId === track.id;
        const isFav = favoriteIds.has(track.id);
        const vm: TrackViewModel = isCached
          ? {
              ...trackDtoToViewModelOnline(track),
              streamUrl: getCachedStreamUrl(track.id),
              coverImageUrl: track.coverImagePath !== undefined ? getCachedCoverUrl(track.id) : undefined,
            }
          : trackDtoToViewModelOnline(track);

        return (
          <div
            key={track.id}
            className={`cm-row${isPrev ? " cm-row-previewing" : ""}${isCached ? " cm-row-cached" : ""}`}
          >
            <span className="cm-row-num">{idx + 1}</span>

            <div
              className="cm-row-cover"
              onClick={(e) => onPreview(e, track.id, streamUrl)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPreview(e as unknown as React.MouseEvent, track.id, streamUrl); }}
              onMouseEnter={(e) => onCoverEnter?.(e, track.coverImagePath)}
              onMouseLeave={onCoverLeave}
              aria-label={isPrev ? "Parar preview" : "Preview"}
            >
              {track.coverImagePath !== undefined ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={track.coverImagePath} alt="" className="cm-row-cover-img" />
              ) : (
                <div className="cm-row-cover-placeholder">
                  <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" opacity="0.25" aria-hidden>
                    <path d="M6 3v8.5A2.5 2.5 0 1 1 3.5 9H5V3h7v3H6Z" />
                  </svg>
                </div>
              )}
              <div className={`cm-row-play-overlay${isPrev ? " cm-row-play-overlay-active" : ""}`}>
                {isPrev ? <IconStop /> : <IconPlay />}
              </div>
            </div>

            <div className="cm-row-info">
              <span className="cm-row-title">
                {track.title}
                {isCached && <span className="cm-cached-badge" title="Disponível offline">OFFLINE</span>}
              </span>
              <span className="cm-row-sub">{track.artist.length > 0 ? track.artist : "—"}</span>
              <div className="cm-row-tags">
                {track.album.length > 0 && <span className="cm-tag">{track.album}</span>}
                {track.genre !== undefined && track.genre.length > 0 && <span className="cm-tag cm-tag-genre">{track.genre}</span>}
                {track.durationMs > 0 && <span className="cm-tag">{formatDuration(track.durationMs)}</span>}
              </div>
            </div>

            <span className="cm-row-dur">{formatDuration(track.durationMs)}</span>

            <div className="cm-row-actions">
              {onToggleFavorite !== undefined && (
                <button
                  type="button"
                  className={`cm-btn${isFav ? " cm-btn-starred" : " cm-btn-star"}`}
                  onClick={() => onToggleFavorite(track.id)}
                  data-tooltip={isFav ? "Remover dos favoritos" : "Favoritar"}
                >
                  {isFav ? <IconStarFilled /> : <IconStar />}
                </button>
              )}
              <button
                type="button"
                className={`cm-btn${isPrev ? " cm-btn-stop" : " cm-btn-play"}`}
                onClick={(e) => onPreview(e, track.id, streamUrl)}
                data-tooltip={isPrev ? "Parar" : "Preview"}
              >
                {isPrev ? <IconStop /> : <IconPlay />}
              </button>
              <button
                type="button"
                className="cm-btn cm-btn-add"
                onClick={() => onSelect(vm)}
                data-tooltip="Adicionar ao slot"
              >
                <IconPlus />
              </button>
              <button
                type="button"
                className={`cm-btn${isCaching ? " cm-btn-loading" : isCached ? " cm-btn-cached" : " cm-btn-dl"}`}
                onClick={(e) => onCache(e, track)}
                disabled={isCaching}
                data-tooltip={isCaching ? "A guardar…" : isCached ? "Remover cache" : "Offline"}
              >
                {isCaching ? <span className="cm-spinner-xs" aria-hidden /> : isCached ? <IconCheck /> : <IconDownload />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────
   ConfirmDelete
───────────────────────────────────── */
function ConfirmDelete({ title, isDeleting, onConfirm, onCancel }: {
  title: string;
  isDeleting: boolean;
  onConfirm(): void;
  onCancel(): void;
}): React.ReactElement {
  return (
    <div className="cm-confirm-overlay" onClick={onCancel} role="presentation">
      <div
        className="cm-confirm"
        role="alertdialog"
        aria-modal
        aria-labelledby="cm-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cm-confirm-icon-wrap">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M3 6h16M8 6V4h6v2M9 6l.5 12h3l.5-12" />
          </svg>
        </div>
        <h3 id="cm-confirm-title" className="cm-confirm-title">Remover faixa da biblioteca?</h3>
        <p className="cm-confirm-body">
          <strong>{title}</strong> será removida do índice. O ficheiro de áudio no disco não será eliminado.
        </p>
        <div className="cm-confirm-actions">
          <button type="button" className="cm-confirm-btn cm-confirm-btn-cancel" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </button>
          <button type="button" className="cm-confirm-btn cm-confirm-btn-del" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? <><span className="cm-spinner-xs" aria-hidden /> A remover…</> : "Remover"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   Empty state illustrations
───────────────────────────────────── */
function LocalEmptyIcon(): React.ReactElement {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" aria-hidden>
      <path d="M7 42V16a4 4 0 0 1 4-4h12l4 4h18a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4Z" />
      <path d="M22 32.5L28 26l6 6.5H22Z" fill="currentColor" opacity="0.4" stroke="none" />
    </svg>
  );
}
function OnlineEmptyIcon(): React.ReactElement {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.25" aria-hidden>
      <circle cx="24" cy="24" r="20" />
      <path d="M24 4c-6 5-10 11-10 20s4 15 10 20M24 4c6 5 10 11 10 20s-4 15-10 20M4 24h40" />
    </svg>
  );
}
