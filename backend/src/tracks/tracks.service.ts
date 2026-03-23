import { Inject, Injectable, NotFoundException } from "@nestjs/common";

export type LibraryInfoDto = {
  path: string;
  trackCount: number;
};
import type { Track } from "@prisma/client";
import { promises as fs } from "fs";
import * as path from "path";
import type { FilterTracksDto } from "./dto/filter-tracks.dto";
import type { CacheTrackDto, CachedTrackInfoDto } from "./dto/cache-track.dto";
import type { TrackMarkerItemDto } from "./dto/track-marker.dto";
import { TrackResponseDto } from "./dto/track-response.dto";
import type { MusicFileMetadata } from "./scanner/music-scanner.service";
import { MusicScannerService } from "./scanner/music-scanner.service";
import { TRACKS_REPOSITORY_TOKEN } from "./tracks.constants";
import type { TracksRepository } from "./tracks.repository";

const COVERS_DIR = "data/covers";
const CACHE_DIR = "data/cache";
const CACHE_COVERS_DIR = "data/cache/covers";
const CACHE_MANIFEST = "data/cache/manifest.json";

type CacheManifestEntry = {
  onlineId: string;
  fileName: string;
  audioFile: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  year?: number;
  durationMs: number;
  hasCover: boolean;
  cachedAt: string;
};
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

@Injectable()
export class TracksService {
  constructor(
    @Inject(TRACKS_REPOSITORY_TOKEN)
    private readonly repository: TracksRepository,
    private readonly scanner: MusicScannerService
  ) {}

  async findAll(filters: FilterTracksDto): Promise<TrackResponseDto[]> {
    const tracks = await this.repository.findAll(filters);
    return tracks.map(TracksService.toDto);
  }

  async findOne(id: string): Promise<TrackResponseDto> {
    const track = await this.repository.findById(id);
    if (track === null) {
      throw new NotFoundException(`Track with id ${id} not found`);
    }

    return TracksService.toDto(track);
  }

  async getFallbackTracks(): Promise<TrackResponseDto[]> {
    const tracks = await this.repository.findAll({});
    // Retorna os 2 primeiros tracks como fallback
    return tracks.slice(0, 2).map(TracksService.toDto);
  }

  /** Caminho absoluto do arquivo de capa ou null se não houver. */
  async getCoverPath(id: string): Promise<string | null> {
    const track = await this.repository.findById(id);
    if (track === null || track.coverImagePath === null) return null;
    const absolute = path.join(process.cwd(), track.coverImagePath);
    return absolute;
  }

  /** Caminho absoluto do arquivo de áudio para streaming (dentro do diretório de músicas). */
  async getAudioPath(id: string): Promise<string | null> {
    const track = await this.repository.findById(id);
    if (track === null) return null;
    const musicRoot =
      process.env.MUSIC_ROOT_DIRECTORY !== undefined &&
      process.env.MUSIC_ROOT_DIRECTORY.length > 0
        ? process.env.MUSIC_ROOT_DIRECTORY
        : path.join(process.cwd(), "music");
    const absolute = path.resolve(track.filePath);
    if (!absolute.startsWith(path.resolve(musicRoot))) return null;
    return absolute;
  }

  async scanAndSync(): Promise<TrackResponseDto[]> {
    const files = await this.scanner.scan();
    const tracks = await this.repository.syncFromScan(files);
    const filesByPath = new Map<string, MusicFileMetadata>(
      files.map((f) => [f.filePath, f])
    );
    const coversDir = path.join(process.cwd(), COVERS_DIR);
    try {
      await fs.mkdir(coversDir, { recursive: true });
    } catch {
      // ignora falha ao criar pasta de capas; segue sem capas
    }
    for (const track of tracks) {
      const file = filesByPath.get(track.filePath);
      if (file?.picture === undefined) continue;
      try {
        const ext = MIME_TO_EXT[file.picture.format] ?? "jpg";
        const coverFileName = `${track.id}.${ext}`;
        const coverPath = path.join(coversDir, coverFileName);
        await fs.writeFile(coverPath, file.picture.data);
        const relativePath = path.join(COVERS_DIR, coverFileName);
        await this.repository.updateCoverPath(track.id, relativePath);
      } catch {
        // ignora falha em uma capa; segue para a próxima
      }
    }
    const updatedTracks = await Promise.all(
      tracks.map((t) => this.repository.findById(t.id))
    );
    return updatedTracks
      .filter((t): t is Track => t !== null)
      .map(TracksService.toDto);
  }

  async getLibraryInfo(): Promise<LibraryInfoDto> {
    const trackCount = await this.repository.countAll();
    return {
      path: this.scanner.getRootDirectory(),
      trackCount,
    };
  }

  async deleteTrack(id: string): Promise<void> {
    const track = await this.repository.findById(id);
    if (track === null) {
      throw new NotFoundException(`Track with id ${id} not found`);
    }
    if (track.coverImagePath !== null) {
      const coverAbsolute = path.join(process.cwd(), track.coverImagePath);
      try {
        await fs.unlink(coverAbsolute);
      } catch {
        // ignore if file doesn't exist
      }
    }
    await this.repository.deleteById(id);
  }

  async getMarkers(trackId: string): Promise<TrackMarkerItemDto[]> {
    const track = await this.repository.findById(trackId);
    if (track === null) {
      throw new NotFoundException(`Track with id ${trackId} not found`);
    }
    const markers = await this.repository.getMarkers(trackId);
    return markers.map((m) => ({ position: m.position, label: m.label }));
  }

  async setMarkers(trackId: string, markers: TrackMarkerItemDto[]): Promise<TrackMarkerItemDto[]> {
    const track = await this.repository.findById(trackId);
    if (track === null) {
      throw new NotFoundException(`Track with id ${trackId} not found`);
    }
    const input = markers.map((m) => ({ position: m.position, label: m.label }));
    const result = await this.repository.setMarkers(trackId, input);
    return result.map((m) => ({ position: m.position, label: m.label }));
  }

  /** Retorna conteúdo texto com faixa, duração e marcadores (para export .txt). */
  async getMarkersExport(trackId: string): Promise<string> {
    const track = await this.repository.findById(trackId);
    if (track === null) {
      throw new NotFoundException(`Track with id ${trackId} not found`);
    }
    const markers = await this.repository.getMarkers(trackId);
    const durationSec = track.durationMs / 1000;
    const min = Math.floor(durationSec / 60);
    const sec = Math.floor(durationSec % 60);
    const durationStr = `${min}:${sec.toString().padStart(2, "0")}`;
    const lines: string[] = [
      `# Marcadores - ${track.title} - ${track.artist}`,
      `# Faixa: ${track.fileName}`,
      `# Duração: ${durationStr}`,
      "",
      "# Posição (0-1) | Tempo | Etiqueta"
    ];
    for (const m of markers) {
      const timeSec = m.position * durationSec;
      const tm = Math.floor(timeSec / 60);
      const ts = Math.floor(timeSec % 60);
      const timeStr = `${tm}:${ts.toString().padStart(2, "0")}`;
      lines.push(`${m.position.toFixed(3)} ${timeStr} ${m.label}`);
    }
    return lines.join("\n");
  }

  /* ─── Cache (offline) ─── */

  private async readManifest(): Promise<CacheManifestEntry[]> {
    const manifestPath = path.join(process.cwd(), CACHE_MANIFEST);
    try {
      const data = await fs.readFile(manifestPath, "utf-8");
      return JSON.parse(data) as CacheManifestEntry[];
    } catch {
      return [];
    }
  }

  private async writeManifest(entries: CacheManifestEntry[]): Promise<void> {
    const manifestPath = path.join(process.cwd(), CACHE_MANIFEST);
    await fs.writeFile(manifestPath, JSON.stringify(entries, null, 2), "utf-8");
  }

  async cacheOnlineTrack(dto: CacheTrackDto): Promise<CachedTrackInfoDto> {
    const cacheDir = path.join(process.cwd(), CACHE_DIR);
    const coversDir = path.join(process.cwd(), CACHE_COVERS_DIR);
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.mkdir(coversDir, { recursive: true });

    const manifest = await this.readManifest();
    const existing = manifest.find((e) => e.onlineId === dto.onlineId);
    if (existing) {
      return {
        onlineId: existing.onlineId,
        fileName: existing.fileName,
        title: existing.title,
        artist: existing.artist,
        album: existing.album,
        genre: existing.genre,
        year: existing.year,
        durationMs: existing.durationMs,
        cachedAt: existing.cachedAt,
        hasCover: existing.hasCover,
      };
    }

    // Download audio
    const ext = path.extname(dto.fileName) || ".mp3";
    const safeId = dto.onlineId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const audioFileName = `${safeId}${ext}`;
    const audioPath = path.join(cacheDir, audioFileName);

    const audioRes = await fetch(dto.sourceUrl);
    if (!audioRes.ok) {
      throw new Error(`Failed to download audio: ${audioRes.status}`);
    }
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    await fs.writeFile(audioPath, audioBuffer);

    // Download cover if available
    let hasCover = false;
    if (dto.coverUrl) {
      try {
        const coverRes = await fetch(dto.coverUrl);
        if (coverRes.ok) {
          const contentType = coverRes.headers.get("content-type") ?? "";
          const coverExt = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
          const coverPath = path.join(coversDir, `${safeId}${coverExt}`);
          const coverBuffer = Buffer.from(await coverRes.arrayBuffer());
          await fs.writeFile(coverPath, coverBuffer);
          hasCover = true;
        }
      } catch {
        // ignore cover download failure
      }
    }

    const entry: CacheManifestEntry = {
      onlineId: dto.onlineId,
      fileName: dto.fileName,
      audioFile: audioFileName,
      title: dto.title,
      artist: dto.artist,
      album: dto.album,
      genre: dto.genre,
      year: dto.year,
      durationMs: dto.durationMs,
      hasCover,
      cachedAt: new Date().toISOString(),
    };

    manifest.push(entry);
    await this.writeManifest(manifest);

    return {
      onlineId: entry.onlineId,
      fileName: entry.fileName,
      title: entry.title,
      artist: entry.artist,
      album: entry.album,
      genre: entry.genre,
      year: entry.year,
      durationMs: entry.durationMs,
      cachedAt: entry.cachedAt,
      hasCover: entry.hasCover,
    };
  }

  async getCachedTracks(): Promise<CachedTrackInfoDto[]> {
    const manifest = await this.readManifest();
    return manifest.map((e) => ({
      onlineId: e.onlineId,
      fileName: e.fileName,
      title: e.title,
      artist: e.artist,
      album: e.album,
      genre: e.genre,
      year: e.year,
      durationMs: e.durationMs,
      cachedAt: e.cachedAt,
      hasCover: e.hasCover,
    }));
  }

  async getCachedAudioPath(onlineId: string): Promise<string | null> {
    const manifest = await this.readManifest();
    const entry = manifest.find((e) => e.onlineId === onlineId);
    if (!entry) return null;
    const audioPath = path.join(process.cwd(), CACHE_DIR, entry.audioFile);
    try {
      await fs.stat(audioPath);
      return audioPath;
    } catch {
      return null;
    }
  }

  async getCachedCoverPath(onlineId: string): Promise<string | null> {
    const manifest = await this.readManifest();
    const entry = manifest.find((e) => e.onlineId === onlineId);
    if (!entry || !entry.hasCover) return null;
    const safeId = onlineId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const coversDir = path.join(process.cwd(), CACHE_COVERS_DIR);
    for (const ext of [".jpg", ".png", ".webp"]) {
      const coverPath = path.join(coversDir, `${safeId}${ext}`);
      try {
        await fs.stat(coverPath);
        return coverPath;
      } catch {
        continue;
      }
    }
    return null;
  }

  async removeCachedTrack(onlineId: string): Promise<void> {
    const manifest = await this.readManifest();
    const entry = manifest.find((e) => e.onlineId === onlineId);
    if (!entry) return;

    // Remove audio file
    const audioPath = path.join(process.cwd(), CACHE_DIR, entry.audioFile);
    try { await fs.unlink(audioPath); } catch { /* ignore */ }

    // Remove cover files
    const safeId = onlineId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const coversDir = path.join(process.cwd(), CACHE_COVERS_DIR);
    for (const ext of [".jpg", ".png", ".webp"]) {
      try { await fs.unlink(path.join(coversDir, `${safeId}${ext}`)); } catch { /* ignore */ }
    }

    // Update manifest
    await this.writeManifest(manifest.filter((e) => e.onlineId !== onlineId));
  }

  private static toDto(track: Track): TrackResponseDto {
    return new TrackResponseDto({
      id: track.id,
      filePath: track.filePath,
      fileName: track.fileName,
      title: track.title,
      artist: track.artist,
      album: track.album,
      bpm: track.bpm ?? undefined,
      durationMs: track.durationMs,
      coverImagePath: track.coverImagePath ?? undefined
    });
  }
}

