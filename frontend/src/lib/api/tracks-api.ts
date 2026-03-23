export type TrackDto = {
  id: string;
  filePath: string;
  fileName: string;
  title: string;
  artist: string;
  album: string;
  bpm?: number;
  genre?: string;
  year?: number;
  durationMs: number;
  coverImagePath?: string;
};

const API_BASE_URL_ENV_KEY = "NEXT_PUBLIC_API_BASE_URL" as const;

export function getApiBaseUrl(): string {
  const baseUrl = process.env[API_BASE_URL_ENV_KEY];
  if (baseUrl === undefined || baseUrl.length === 0) {
    throw new Error(`Missing environment variable ${API_BASE_URL_ENV_KEY}`);
  }
  return baseUrl.replace(/\/$/, "");
}

/** URL da capa da faixa (GET /tracks/:id/cover). */
export function getTrackCoverUrl(id: string): string {
  return `${getApiBaseUrl()}/tracks/${id}/cover`;
}

/** URL para streaming de áudio (GET /tracks/:id/stream). */
export function getTrackStreamUrl(id: string): string {
  return `${getApiBaseUrl()}/tracks/${id}/stream`;
}

const FETCH_TIMEOUT_MS = 5000;

export async function fetchTracks(): Promise<TrackDto[]> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/tracks`, {
      cache: "no-store",
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch tracks: ${response.status}`);
    }

    const payload = (await response.json()) as TrackDto[];
    return payload;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/** Dispara o scan no backend e retorna as faixas indexadas. */
export async function scanTracks(): Promise<TrackDto[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tracks/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  if (!response.ok) {
    throw new Error(`Scan falhou: ${response.status}`);
  }
  return (await response.json()) as TrackDto[];
}

export type LibraryInfoDto = {
  path: string;
  trackCount: number;
};

export async function getLibraryInfo(): Promise<LibraryInfoDto> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tracks/library-info`, { cache: "no-store" });
  if (!response.ok) throw new Error(`getLibraryInfo falhou: ${response.status}`);
  return (await response.json()) as LibraryInfoDto;
}

export async function deleteTrack(id: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tracks/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    throw new Error(`deleteTrack falhou: ${response.status}`);
  }
}

export type TrackMarkerDto = { position: number; label: string };

export async function fetchTrackMarkers(trackId: string): Promise<TrackMarkerDto[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tracks/${trackId}/markers`, {
    cache: "no-store"
  });
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Marcadores: ${response.status}`);
  }
  return (await response.json()) as TrackMarkerDto[];
}

export async function saveTrackMarkers(
  trackId: string,
  markers: TrackMarkerDto[]
): Promise<TrackMarkerDto[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tracks/${trackId}/markers`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markers })
  });
  if (!response.ok) {
    throw new Error(`Guardar marcadores: ${response.status}`);
  }
  return (await response.json()) as TrackMarkerDto[];
}

/** URL para descarregar o ficheiro .txt de marcadores da faixa. */
export function getTrackMarkersExportUrl(trackId: string): string {
  return `${getApiBaseUrl()}/tracks/${trackId}/markers/export`;
}

/* ─── Cache offline ─── */

export type CachedTrackInfoDto = {
  onlineId: string;
  fileName: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  year?: number;
  durationMs: number;
  cachedAt: string;
  hasCover: boolean;
};

/** Lista os IDs das faixas em cache offline. */
export async function fetchCachedTrackIds(): Promise<Set<string>> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/tracks/cached`, { cache: "no-store" });
    if (!response.ok) return new Set();
    const list = (await response.json()) as CachedTrackInfoDto[];
    return new Set(list.map((t) => t.onlineId));
  } catch {
    return new Set();
  }
}

/** Busca faixas em cache como TrackDto (para exibir quando offline). */
export async function fetchCachedTracksAsDto(): Promise<TrackDto[]> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/tracks/cached`, { cache: "no-store" });
    if (!response.ok) return [];
    const list = (await response.json()) as CachedTrackInfoDto[];
    return list.map((c) => ({
      id: c.onlineId,
      filePath: "",
      fileName: c.fileName,
      title: c.title,
      artist: c.artist,
      album: c.album,
      genre: c.genre,
      year: c.year,
      durationMs: c.durationMs,
      coverImagePath: c.hasCover ? getCachedCoverUrl(c.onlineId) : undefined,
    }));
  } catch {
    return [];
  }
}

/** Solicita ao backend que faça cache de uma faixa online. */
export async function cacheOnlineTrack(data: {
  sourceUrl: string;
  onlineId: string;
  fileName: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  year?: number;
  durationMs: number;
  coverUrl?: string;
}): Promise<CachedTrackInfoDto> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tracks/cache`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Cache falhou: ${response.status}`);
  }
  return (await response.json()) as CachedTrackInfoDto;
}

/** URL de streaming de uma faixa em cache offline. */
export function getCachedStreamUrl(onlineId: string): string {
  return `${getApiBaseUrl()}/tracks/cache/${onlineId}/stream`;
}

/** URL da capa de uma faixa em cache offline. */
export function getCachedCoverUrl(onlineId: string): string {
  return `${getApiBaseUrl()}/tracks/cache/${onlineId}/cover`;
}

/** Remove uma faixa do cache offline. */
export async function removeCachedTrack(onlineId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/tracks/cache/${onlineId}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Remover cache falhou: ${response.status}`);
  }
}

