"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppMenuBar } from "@/components/layout/AppMenuBar";
import { ControlPanel } from "@/components/layout/ControlPanel";
import { FooterBar } from "@/components/layout/FooterBar";
import { ScenesSidebar } from "@/components/layout/ScenesSidebar";
import { resumeAudioContext, getOrCreateMediaGraph } from "@/lib/audio/audio-engine";
import {
  fetchTrackMarkers,
  getTrackMarkersExportUrl,
  saveTrackMarkers,
  scanTracks
} from "@/lib/api/tracks-api";
import { BroadcastBlock } from "./BroadcastBlock";
import { FiltersBar } from "./FiltersBar";
import { PadGrid, type SlotData, SLOT_PALETTE } from "./PadGrid";
import type {
  BankId,
  PlaylistItem,
  SceneFolder,
  SceneItem,
  TrackMarkerViewModel,
  TrackViewModel
} from "@/types/player";
import type { PlayRegion } from "./WaveformFromEngine";

type TouchpadViewProps = {
  initialTracks: TrackViewModel[];
  bpmRange?: { min?: number; max?: number };
};

type UpdateStatus = "idle" | "checking" | "downloading" | "installing" | "installed" | "error";

type UpdaterDownloadEvent =
  | { event: "Started"; data: { contentLength: number } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" }
  | { event: string; data?: Record<string, unknown> };

function isTauriDesktopRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function sortSlots(slots: SlotData[]): SlotData[] {
  return [...slots].sort((a, b) => {
    const ci = (s: SlotData): number => {
      const idx = SLOT_PALETTE.indexOf(s.color);
      return idx === -1 ? SLOT_PALETTE.length : idx;
    };
    const cd = ci(a) - ci(b);
    if (cd !== 0) return cd;
    return (a.track?.title ?? "").localeCompare(b.track?.title ?? "");
  });
}

export function TouchpadView(props: TouchpadViewProps): React.ReactElement {
  const { initialTracks, bpmRange } = props;
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const setAudioRef = useCallback((el: HTMLAudioElement | null) => {
    (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = el;
    if (el !== null) {
      el.muted = false;
    }
    setAudioElement(el);
  }, []);
  const [broadcastVolume, setBroadcastVolume] = useState(75);
  const [scanning, setScanning] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string | undefined>(
    initialTracks.length > 0 ? initialTracks[0].id : undefined
  );
  const [playingTrackId, setPlayingTrackId] = useState<string | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState<"off" | "one" | "all">("off");
  const [playRegion, setPlayRegion] = useState<PlayRegion>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopRegion, setLoopRegion] = useState(false);
  const [cutActive, setCutActive] = useState(false);
  const [activeBank, setActiveBank] = useState<BankId>("B");
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneItem[]>(() => [
    { id: "pre-a", label: "Pre-Game-A", bankId: "A", status: "idle" },
    { id: "pre-b", label: "Pre-Game-B", bankId: "B", status: "idle", parentId: "folder-pregame" },
    { id: "pre-c", label: "Pre-Game-C", bankId: "B", status: "stopped", parentId: "folder-pregame" },
    { id: "pre-d", label: "Pre-Game-D", bankId: "B", status: "stopped", parentId: "folder-pregame" },
    { id: "america", label: "America", bankId: "B", status: "idle" },
    { id: "weekend", label: "Weekend", bankId: "B", status: "stopped" },
  ]);
  const [sceneFolders, setSceneFolders] = useState<SceneFolder[]>(() => [
    { id: "folder-pregame", label: "Pre-Game", bankId: "B" },
  ]);
  const [liveTrackId, setLiveTrackId] = useState<string | null>(null);
  const [monitorTrackId, setMonitorTrackId] = useState<string | null>(null);
  const [broadcastDeviceId, setBroadcastDeviceId] = useState("default");
  const [monitorDeviceId, setMonitorDeviceId] = useState("none");
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stereo, setStereo] = useState(true);
  const [volumeNorm, setVolumeNorm] = useState(false);
  const [instantReplay, setInstantReplay] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [allowAudioAnalyser, setAllowAudioAnalyser] = useState(false);
  const [trackMarkers, setTrackMarkers] = useState<TrackMarkerViewModel[]>([]);
  const [cartucheiraSlots, setCartucheiraSlots] = useState<SlotData[]>([]);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const updateModalVisible =
    updateStatus === "downloading"
    || updateStatus === "installing"
    || updateStatus === "installed"
    || updateStatus === "error";

  const closeOverlay = useCallback((): void => {
    setLeftSidebarOpen(false);
  }, []);

  useEffect(() => {
    document.body.style.overflow = leftSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [leftSidebarOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && leftSidebarOpen) closeOverlay();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [leftSidebarOpen, closeOverlay]);

  useEffect(() => {
    let cancelled = false;

    const runDesktopUpdateCheck = async (): Promise<void> => {
      if (!isTauriDesktopRuntime()) return;
      setUpdateStatus("checking");
      setUpdateMessage("A verificar se existe uma nova versao...");
      setUpdateProgress(null);

      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const availableUpdate = await check();
        if (cancelled || availableUpdate === null) {
          setUpdateStatus("idle");
          return;
        }

        setUpdateVersion(availableUpdate.version);
        setUpdateStatus("downloading");
        setUpdateMessage(`Atualizacao ${availableUpdate.version} encontrada. A transferir...`);

        let downloadedBytes = 0;
        let totalBytes = 0;
        await availableUpdate.downloadAndInstall((event: UpdaterDownloadEvent): void => {
          if (cancelled) return;

          switch (event.event) {
            case "Started": {
              const contentLength = event.data?.contentLength;
              totalBytes = typeof contentLength === "number" ? contentLength : 0;
              downloadedBytes = 0;
              setUpdateProgress(0);
              break;
            }
            case "Progress": {
              const chunkLength = event.data?.chunkLength;
              if (typeof chunkLength === "number") {
                downloadedBytes += chunkLength;
              }
              if (totalBytes > 0) {
                const progressValue = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
                setUpdateProgress(progressValue);
              }
              break;
            }
            case "Finished":
              setUpdateStatus("installing");
              setUpdateProgress(100);
              setUpdateMessage("Pacote transferido. A instalar atualizacao...");
              break;
            default:
              break;
          }
        });

        if (cancelled) return;
        setUpdateStatus("installed");
        setUpdateMessage("Atualizacao instalada com sucesso. Reinicie o app para concluir.");
      } catch (error: unknown) {
        if (cancelled) return;
        console.error("Falha ao atualizar o app:", error);
        setUpdateStatus("error");
        setUpdateMessage("Nao foi possivel atualizar agora. O app vai continuar normalmente.");
      }
    };

    void runDesktopUpdateCheck();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Procura uma track em initialTracks ou nos slots da cartucheira. */
  const findTrack = useCallback((trackId: string): TrackViewModel | undefined => {
    return initialTracks.find((t) => t.id === trackId)
      ?? cartucheiraSlots.find((s) => s.track?.id === trackId)?.track
      ?? undefined;
  }, [initialTracks, cartucheiraSlots]);

  const activeTrack = useMemo(
    () => activeTrackId !== undefined ? findTrack(activeTrackId) : undefined,
    [findTrack, activeTrackId]
  );

  const getStreamUrl = useCallback((trackId: string): string => {
    return findTrack(trackId)?.streamUrl ?? "";
  }, [findTrack]);

  // Ao trocar a faixa ativa, preparar o áudio para a onda (wavesurfer usa o mesmo elemento)
  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null || activeTrackId === undefined) return;
    const url = getStreamUrl(activeTrackId);
    if (url.length === 0) return;
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }
  }, [activeTrackId, getStreamUrl]);

  useEffect(() => {
    if (activeTrackId === undefined) {
      setTrackMarkers([]);
      return;
    }
    fetchTrackMarkers(activeTrackId)
      .then(setTrackMarkers)
      .catch(() => setTrackMarkers([]));
  }, [activeTrackId]);

  const handleAddMarker = useCallback(
    (ratio: number, label: string): void => {
      if (activeTrackId === undefined) return;
      const next: TrackMarkerViewModel[] = [...trackMarkers, { position: ratio, label }].sort(
        (a, b) => a.position - b.position
      );
      setTrackMarkers(next);
      saveTrackMarkers(activeTrackId, next).catch(() => {
        setTrackMarkers(trackMarkers);
      });
    },
    [activeTrackId, trackMarkers]
  );

  const handleClearMarkers = useCallback((): void => {
    if (activeTrackId === undefined) return;
    setTrackMarkers([]);
    saveTrackMarkers(activeTrackId, []).catch(() => {});
  }, [activeTrackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.volume = broadcastVolume / 100;
  }, [audioElement, broadcastVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.loop = repeatMode === "one" && !loopRegion;
  }, [repeatMode, loopRegion]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null) return;
    const onPlay = (): void => setIsPlaying(true);
    const onPause = (): void => setIsPlaying(false);
    const onEnded = (): void => {
      setIsPlaying(false);
      setPlayingTrackId(undefined);
    };
    const onTimeUpdate = (): void => {
      const t = audio.currentTime;
      setCurrentTime(t);
      // Parar ou repetir região ao fim do trecho
      if (playRegion !== null && t >= playRegion.end) {
        if (loopRegion) {
          audio.currentTime = playRegion.start;
        } else {
          audio.pause();
        }
      }
    };
    const onLoadedMetadata = (): void => setDuration(audio.duration);
    const onDurationChange = (): void => setDuration(audio.duration);
    const onError = (): void => {
      console.error("Audio load error", audio.error?.message ?? "unknown");
      setIsPlaying(false);
      setPlayingTrackId(undefined);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("error", onError);
    };
  }, [playRegion, loopRegion]);

  const handleSeek = useCallback((ratio: number): void => {
    const audio = audioRef.current;
    if (audio === null) return;
    const dur = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : activeTrack !== undefined ? activeTrack.durationMs / 1000 : 0;
    if (dur <= 0) return;
    audio.currentTime = ratio * dur;
    setCurrentTime(audio.currentTime);
  }, [activeTrack]);

  const handleClear = useCallback((): void => {
    // TODO: limpar filtros quando houver estado de filtro
  }, []);

  const handlePlayToggle = useCallback((trackId: string): void => {
    const audio = audioRef.current;
    if (audio === null) return;
    resumeAudioContext().catch(() => {});
    getOrCreateMediaGraph(audio);
    setAllowAudioAnalyser(true);

    // Determinar saída correta ANTES do play
    const targetSink =
      trackId === liveTrackId
        ? broadcastDeviceId
        : trackId === monitorTrackId
          ? (monitorDeviceId === "none" ? "default" : monitorDeviceId)
          : broadcastDeviceId;
    if (typeof audio.setSinkId === "function") {
      audio.setSinkId(targetSink).catch(() => {});
    }

    const playPromise = (): void => {
      audio.play().catch((err: unknown) => {
        console.error("Playback failed:", err);
      });
    };
    if (playingTrackId === trackId) {
      if (isPlaying) {
        audio.pause();
      } else {
        playPromise();
      }
      return;
    }
    const streamUrl = getStreamUrl(trackId);
    audio.src = streamUrl;
    setPlayingTrackId(trackId);
    setActiveTrackId(trackId);
    // Se houver região (cut in), iniciar no início da região
    const region = trackId === activeTrackId ? playRegion : null;
    if (region !== null && region.start > 0) {
      audio.currentTime = region.start;
    }
    playPromise();
  }, [playingTrackId, isPlaying, activeTrackId, playRegion, liveTrackId, monitorTrackId, broadcastDeviceId, monitorDeviceId]);

  const handleScan = useCallback(async (): Promise<void> => {
    setScanning(true);
    try {
      await scanTracks();
      router.refresh();
    } catch (e) {
      console.error("Erro ao escanear:", e);
    } finally {
      setScanning(false);
    }
  }, [router]);

  const handlePlayPause = useCallback((): void => {
    const audio = audioRef.current;
    if (audio === null) return;
    if (isPlaying) {
      audio.pause();
    } else {
      if (activeTrackId !== undefined) setPlayingTrackId(activeTrackId);
      resumeAudioContext().catch(() => {});
      audio.play().catch((err: unknown) => {
        console.error("Playback failed:", err);
      });
    }
  }, [isPlaying, activeTrackId]);

  const handleCutToggle = useCallback((): void => {
    if (cutActive) {
      setPlayRegion(null);
      setCutActive(false);
    } else {
      const dur = duration > 0 ? duration : activeTrack !== undefined ? activeTrack.durationMs / 1000 : 0;
      if (dur > 0) {
        setPlayRegion({ start: currentTime, end: dur });
      }
      setCutActive(true);
    }
  }, [cutActive, currentTime, duration, activeTrack]);

  const handleAddPage = useCallback((parentId?: string): void => {
    const newId = `scene-${Date.now()}`;
    setScenes((prev) => [
      ...prev,
      { id: newId, label: `Nova cena ${prev.filter((s) => s.bankId === activeBank).length + 1}`, bankId: activeBank, status: "idle", parentId: parentId ?? null },
    ]);
    setActiveSceneId(newId);
  }, [activeBank]);

  const handleAddFolder = useCallback((): void => {
    const newId = `folder-${Date.now()}`;
    setSceneFolders((prev) => [
      ...prev,
      { id: newId, label: `Nova cena ${prev.filter((f) => f.bankId === activeBank).length + 1}`, bankId: activeBank },
    ]);
  }, [activeBank]);

  const handleRemoveSelected = useCallback((): void => {
    if (activeSceneId == null) return;
    setScenes((prev) => prev.filter((s) => s.id !== activeSceneId));
    setActiveSceneId(null);
  }, [activeSceneId]);

  const handleRemoveScene = useCallback((sceneId: string): void => {
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    setActiveSceneId((prev) => (prev === sceneId ? null : prev));
  }, []);

  const handleRemoveFolder = useCallback((folderId: string): void => {
    setSceneFolders((prev) => prev.filter((f) => f.id !== folderId));
    setScenes((prev) => prev.filter((s) => s.parentId !== folderId));
    setActiveSceneId(null);
  }, []);

  const handleSceneLabelChange = useCallback((sceneId: string, label: string): void => {
    setScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, label } : s))
    );
  }, []);

  const handleFolderLabelChange = useCallback((folderId: string, label: string): void => {
    setSceneFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, label } : f))
    );
  }, []);

  const handleCreatePlaylist = useCallback((name: string): void => {
    const id = `pl-${Date.now()}`;
    setPlaylists((prev) => [...prev, { id, name }]);
    setCurrentPlaylistId(id);
  }, []);

  const playingTrack = useMemo(
    () => (playingTrackId !== undefined ? findTrack(playingTrackId) : undefined),
    [findTrack, playingTrackId]
  );
  const playingIndex = useMemo(
    () => (playingTrackId !== undefined ? initialTracks.findIndex((t) => t.id === playingTrackId) : -1),
    [initialTracks, playingTrackId]
  );
  const nextTrack = useMemo(
    () => (playingIndex >= 0 && playingIndex < initialTracks.length - 1 ? initialTracks[playingIndex + 1] : undefined),
    [initialTracks, playingIndex]
  );
  const prevTrack = useMemo(
    () => (playingIndex > 0 ? initialTracks[playingIndex - 1] : undefined),
    [initialTracks, playingIndex]
  );
  const playlistDurationSec = useMemo(
    () => initialTracks.reduce((acc, t) => acc + t.durationMs / 1000, 0),
    [initialTracks]
  );


  const handleSkip = useCallback((): void => {
    if (nextTrack === undefined) return;
    const audio = audioRef.current;
    if (audio === null) return;
    audio.src = getStreamUrl(nextTrack.id);
    setPlayingTrackId(nextTrack.id);
    setActiveTrackId(nextTrack.id);
    audio.play().catch(() => {});
  }, [nextTrack, getStreamUrl]);

  const handlePrevious = useCallback((): void => {
    if (prevTrack === undefined) return;
    const audio = audioRef.current;
    if (audio === null) return;
    audio.src = getStreamUrl(prevTrack.id);
    setPlayingTrackId(prevTrack.id);
    setActiveTrackId(prevTrack.id);
    audio.play().catch(() => {});
  }, [prevTrack, getStreamUrl]);

  /** Saída efetiva: faixa em Live → transmissão; faixa em Monitor → monitor; senão transmissão. */
  const effectiveSinkId =
    playingTrackId === liveTrackId
      ? broadcastDeviceId
      : playingTrackId === monitorTrackId
        ? (monitorDeviceId === "none" ? "default" : monitorDeviceId)
        : broadcastDeviceId;

  const applySink = useCallback(
    (deviceId: string): void => {
      const audio = audioRef.current;
      if (audio === null) return;
      if (typeof audio.setSinkId !== "function") return;
      audio.setSinkId(deviceId).catch((err: unknown) => {
        const isAbort = err instanceof Error && err.name === "AbortError";
        if (!isAbort) {
          console.error("setSinkId failed:", deviceId, err);
        }
      });
    },
    []
  );

  useEffect(() => {
    applySink(effectiveSinkId);
  }, [effectiveSinkId, applySink]);

  const handleBroadcastDeviceChange = useCallback((deviceId: string): void => {
    setBroadcastDeviceId(deviceId);
  }, []);

  const handleMonitorDeviceChange = useCallback((deviceId: string): void => {
    setMonitorDeviceId(deviceId);
  }, []);

  // Para e volta ao início, mas NÃO limpa activeTrackId (usado internamente)
  const stopAudio = useCallback((): void => {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setPlayingTrackId(undefined);
  }, []);

  const handleSelect = useCallback((trackId: string): void => {
    const audio = audioRef.current;
    if (trackId === activeTrackId) {
      // Mesmo track: toggle play/pause
      if (audio !== null) {
        if (isPlaying) {
          audio.pause();
        } else {
          setPlayingTrackId(trackId);
          resumeAudioContext().catch(() => {});
          getOrCreateMediaGraph(audio);
          setAllowAudioAnalyser(true);
          audio.play().catch(() => {});
        }
      }
      return;
    }
    // Track diferente: parar, trocar src, e preparar
    stopAudio();
    setActiveTrackId(trackId);
    if (audio !== null) {
      const url = getStreamUrl(trackId);
      if (url.length > 0) {
        audio.src = url;
        audio.load();
      }
    }
  }, [activeTrackId, isPlaying, stopAudio, getStreamUrl]);

  // Apenas seleciona a track ativa sem dar play (usado pelos slots do PadGrid)
  const handleActivate = useCallback((trackId: string): void => {
    if (trackId === activeTrackId) return;
    stopAudio();
    setActiveTrackId(trackId);
    const audio = audioRef.current;
    if (audio !== null) {
      const url = getStreamUrl(trackId);
      if (url.length > 0) {
        audio.src = url;
        audio.load();
      }
    }
  }, [activeTrackId, stopAudio, getStreamUrl]);

  // Reset completo: para + limpa waveform (troca de banco/playlist/cena)
  const resetAudio = useCallback((): void => {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setPlayingTrackId(undefined);
    setActiveTrackId(undefined);
  }, []);

  // Ao trocar banco, playlist ou cena: parar tudo e limpar waveform
  useEffect(() => { resetAudio(); }, [activeBank]);        // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { resetAudio(); }, [currentPlaylistId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { resetAudio(); }, [activeSceneId]);     // eslint-disable-line react-hooks/exhaustive-deps

  const handleLiveTrackToggle = useCallback((trackId: string): void => {
    const turningOff = liveTrackId === trackId;
    setLiveTrackId(turningOff ? null : trackId);
    setMonitorTrackId((prev) => (prev === trackId ? null : prev));

    if (turningOff) {
      stopAudio();
      return;
    }
    // Ligar Live: preparar do início, rotear para broadcast e dar play
    const audio = audioRef.current;
    if (audio === null) return;
    const url = findTrack(trackId)?.streamUrl ?? "";
    audio.pause();
    audio.src = url;
    audio.currentTime = 0;
    if (typeof audio.setSinkId === "function") {
      audio.setSinkId(broadcastDeviceId).catch(() => {});
    }
    setActiveTrackId(trackId);
    setPlayingTrackId(trackId);
    resumeAudioContext().catch(() => {});
    getOrCreateMediaGraph(audio);
    setAllowAudioAnalyser(true);
    audio.play().catch((err: unknown) => {
      console.error("Live playback failed:", err);
    });
  }, [liveTrackId, stopAudio, findTrack, broadcastDeviceId]);

  const handleMonitorTrackToggle = useCallback((trackId: string): void => {
    const turningOff = monitorTrackId === trackId;
    setMonitorTrackId(turningOff ? null : trackId);
    setLiveTrackId((prev) => (prev === trackId ? null : prev));

    if (turningOff) {
      stopAudio();
      return;
    }
    // Ligar Monitor: preparar do início, rotear para monitor e dar play
    const audio = audioRef.current;
    if (audio === null) return;
    const url = findTrack(trackId)?.streamUrl ?? "";
    audio.pause();
    audio.src = url;
    audio.currentTime = 0;
    const sink = monitorDeviceId === "none" ? "default" : monitorDeviceId;
    if (typeof audio.setSinkId === "function") {
      audio.setSinkId(sink).catch(() => {});
    }
    setActiveTrackId(trackId);
    setPlayingTrackId(trackId);
    resumeAudioContext().catch(() => {});
    getOrCreateMediaGraph(audio);
    setAllowAudioAnalyser(true);
    audio.play().catch((err: unknown) => {
      console.error("Monitor playback failed:", err);
    });
  }, [monitorTrackId, stopAudio, findTrack, monitorDeviceId]);

  const handleAddSlot = useCallback((track: TrackViewModel): void => {
    setCartucheiraSlots((prev) =>
      sortSlots([...prev, { track, color: SLOT_PALETTE[prev.length % SLOT_PALETTE.length] }])
    );
  }, []);

  const handleCartucheiraAssign = useCallback((slotIndex: number, track: TrackViewModel): void => {
    setCartucheiraSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = { ...next[slotIndex], track };
      return sortSlots(next);
    });
  }, []);

  const handleCartucheiraClear = useCallback((slotIndex: number): void => {
    const removedTrackId = cartucheiraSlots[slotIndex]?.track?.id;
    if (removedTrackId !== undefined && (removedTrackId === playingTrackId || removedTrackId === activeTrackId)) {
      resetAudio();
    }
    setCartucheiraSlots((prev) => prev.filter((_, i) => i !== slotIndex));
  }, [cartucheiraSlots, playingTrackId, activeTrackId, resetAudio]);

  const handleCartucheiraColor = useCallback((slotIndex: number, color: string): void => {
    setCartucheiraSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = { ...next[slotIndex], color };
      return sortSlots(next);
    });
  }, []);

  const touchpadViewClass =
    `touchpad-view layout-app h-full min-h-0 w-full ${leftSidebarOpen ? "touchpad-view--left-open" : ""}`.trim();

  return (
    <div className={touchpadViewClass}>
      <div className="touchpad-view-overlay" onClick={closeOverlay} onKeyDown={(e): void => { if (e.key === "Escape") closeOverlay(); }} role="button" tabIndex={-1} aria-label="Fechar menu" />
      {updateModalVisible && (
        <div className="updater-overlay" role="alertdialog" aria-modal="true" aria-live="polite">
          <div className="updater-modal glass-surface">
            <h2 className="updater-title">Atualizando o MJC Player</h2>
            <p className="updater-message">{updateMessage}</p>
            {updateVersion !== null && (
              <p className="updater-version">Versao alvo: {updateVersion}</p>
            )}

            {(updateStatus === "downloading" || updateStatus === "installing") && (
              <div className="updater-progress-wrap">
                <div className="updater-progress-bar">
                  <span
                    className="updater-progress-fill"
                    style={{ width: `${updateProgress ?? 100}%` }}
                  />
                </div>
                <span className="updater-progress-label">
                  {updateProgress !== null ? `${updateProgress}%` : "A preparar..."}
                </span>
              </div>
            )}

            {(updateStatus === "installed" || updateStatus === "error") && (
              <button
                type="button"
                className="updater-close-btn"
                onClick={(): void => setUpdateStatus("idle")}
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      )}
      <ScenesSidebar
        activeBank={activeBank}
        activeSceneId={activeSceneId}
        scenes={scenes}
        folders={sceneFolders}
        onBankChange={setActiveBank}
        onSceneSelect={setActiveSceneId}
        onSceneLabelChange={handleSceneLabelChange}
        onFolderLabelChange={handleFolderLabelChange}
        onAddFolder={handleAddFolder}
        onAddSceneToFolder={(folderId) => handleAddPage(folderId)}
        onRemoveScene={handleRemoveScene}
        onRemoveFolder={handleRemoveFolder}
      />
      <div className="layout-main">
        <AppMenuBar
          onScan={handleScan}
          scanning={scanning}
          playlists={playlists}
          currentPlaylistId={currentPlaylistId}
          onSelectPlaylist={setCurrentPlaylistId}
          onCreatePlaylist={handleCreatePlaylist}
          broadcastDeviceId={broadcastDeviceId}
          onBroadcastDeviceChange={handleBroadcastDeviceChange}
          monitorDeviceId={monitorDeviceId}
          onMonitorDeviceChange={handleMonitorDeviceChange}
        />
        <div className="layout-body">
          <ControlPanel
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            volumePercent={broadcastVolume}
            onVolumeChange={setBroadcastVolume}
            trackMarkersExportUrl={activeTrack ? getTrackMarkersExportUrl(activeTrack.id) : undefined}
            markers={trackMarkers}
            onClearMarkers={handleClearMarkers}
            activeTrackId={activeTrackId}
            liveTrackId={liveTrackId}
            monitorTrackId={monitorTrackId}
            onLiveToggle={handleLiveTrackToggle}
            onMonitorToggle={handleMonitorTrackToggle}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onStop={stopAudio}
            onNext={handleSkip}
            onPrevious={handlePrevious}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
            instantReplay={instantReplay}
            onReplayToggle={(): void => setInstantReplay(!instantReplay)}
            centerContent={
              <BroadcastBlock
                track={activeTrack}
                streamUrl={activeTrack?.streamUrl}
                audioElement={audioElement}
                allowAudioAnalyser={allowAudioAnalyser}
                currentTime={currentTime}
                duration={duration}
                playRegion={playRegion}
                onSeek={handleSeek}
                markers={trackMarkers}
                onAddMarker={handleAddMarker}
                pixelsPerSecond={100}
                activeTrackId={activeTrackId ?? undefined}
                liveTrackId={liveTrackId}
                monitorTrackId={monitorTrackId}
                volumePercent={broadcastVolume}
              />
            }
          />
          <div className="touchpad-view-content">
            <audio ref={setAudioRef} className="touchpad-view-audio hidden" crossOrigin="anonymous" preload="metadata" />
          <FiltersBar bpmRange={bpmRange} onClear={handleClear} />

          <section className="touchpad-view-pad-section">
            <PadGrid
              tracks={initialTracks}
              activeTrackId={activeTrackId}
              playingTrackId={playingTrackId}
              isPlaying={isPlaying}
              liveTrackId={liveTrackId}
              monitorTrackId={monitorTrackId}
              monitorDeviceId={monitorDeviceId}
              onActivate={handleActivate}
              onLiveToggle={handleLiveTrackToggle}
              onMonitorToggle={handleMonitorTrackToggle}
              slots={cartucheiraSlots}
              onAddSlot={handleAddSlot}
              onAssignSlot={handleCartucheiraAssign}
              onClearSlot={handleCartucheiraClear}
              onColorSlot={handleCartucheiraColor}
              onRefreshTracks={() => router.refresh()}
            />
          </section>
          </div>
        </div>
      </div>
      <footer className="layout-footer glass-surface footer-shadow section-divider-top">
        <div className="footer-main">
          <FooterBar
            soundsCount={initialTracks.length}
            totalDurationSec={playlistDurationSec}
            stereo={stereo}
            onStereoToggle={(): void => setStereo(!stereo)}
            volumeNorm={volumeNorm}
            onVolumeNormToggle={(): void => setVolumeNorm(!volumeNorm)}
            statusConnected={true}
          />
        </div>
      </footer>
    </div>
  );
}
