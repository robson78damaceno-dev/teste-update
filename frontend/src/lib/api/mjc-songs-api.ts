import type { TrackDto } from "./tracks-api";

function getMjcSongsBase(): string {
  return (
    process.env.NEXT_PUBLIC_MJC_SONGS_API_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getMjcSongsBaseUrl(): string {
  return getMjcSongsBase();
}

type MjcSongDto = {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  genre: string;
  year: number | null;
  audioUrl: string;
  coverUrl?: string;
};

/** Converte "mm:ss" ou "m:ss" para milissegundos. */
function parseDurationMs(duration: string): number {
  if (duration.length === 0) return 0;
  const [min, sec] = duration.split(":").map(Number);
  return ((min ?? 0) * 60 + (sec ?? 0)) * 1000;
}

/** URL de streaming para uma faixa da API MJC Songs. */
export function getMjcSongStreamUrl(track: TrackDto): string {
  return `${getMjcSongsBase()}${track.filePath}`;
}

/** Busca todas as faixas da API MJC Songs e mapeia para TrackDto. */
export async function fetchMjcSongs(): Promise<TrackDto[]> {
  const base = getMjcSongsBase();
  const response = await fetch(`${base}/api/songs`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`fetchMjcSongs falhou: ${response.status}`);
  }

  const songs = (await response.json()) as MjcSongDto[];

  return songs.map((s) => ({
    id: String(s.id),
    filePath: s.audioUrl,
    fileName: s.audioUrl.split("/").pop() ?? "",
    title: s.title,
    artist: s.artist,
    album: s.album,
    genre: s.genre.length > 0 ? s.genre : undefined,
    year: s.year ?? undefined,
    durationMs: parseDurationMs(s.duration),
    coverImagePath: s.coverUrl ? `${base}${s.coverUrl}` : undefined,
  }));
}
