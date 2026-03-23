import { Injectable } from "@nestjs/common";
import type { Track, TrackMarker } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { FilterTracksDto } from "./dto/filter-tracks.dto";
import type { MusicFileMetadata } from "./scanner/music-scanner.service";

export type MarkerInput = { position: number; label: string };

export interface TracksRepository {
  findAll(filters: FilterTracksDto): Promise<Track[]>;
  findById(id: string): Promise<Track | null>;
  syncFromScan(files: MusicFileMetadata[]): Promise<Track[]>;
  updateCoverPath(id: string, coverImagePath: string): Promise<Track>;
  deleteById(id: string): Promise<void>;
  countAll(): Promise<number>;
  getMarkers(trackId: string): Promise<TrackMarker[]>;
  setMarkers(trackId: string, markers: MarkerInput[]): Promise<TrackMarker[]>;
}

@Injectable()
export class PrismaTracksRepository implements TracksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FilterTracksDto): Promise<Track[]> {
    const where: Record<string, unknown> = {};

    if (filters.search !== undefined && filters.search.trim().length > 0) {
      const search = filters.search.trim();
      where.OR = [
        { title: { contains: search } },
        { artist: { contains: search } },
        { album: { contains: search } }
      ];
    }

    if (filters.bpmMin !== undefined || filters.bpmMax !== undefined) {
      where.bpm = {};
      if (filters.bpmMin !== undefined) {
        (where.bpm as { gte?: number }).gte = filters.bpmMin;
      }
      if (filters.bpmMax !== undefined) {
        (where.bpm as { lte?: number }).lte = filters.bpmMax;
      }
    }

    if (filters.durationMinMs !== undefined || filters.durationMaxMs !== undefined) {
      where.durationMs = {};
      if (filters.durationMinMs !== undefined) {
        (where.durationMs as { gte?: number }).gte = filters.durationMinMs;
      }
      if (filters.durationMaxMs !== undefined) {
        (where.durationMs as { lte?: number }).lte = filters.durationMaxMs;
      }
    }

    return this.prisma.track.findMany({
      where,
      orderBy: [{ artist: "asc" }, { album: "asc" }, { title: "asc" }]
    });
  }

  async findById(id: string): Promise<Track | null> {
    return this.prisma.track.findUnique({
      where: { id }
    });
  }

  async syncFromScan(files: MusicFileMetadata[]): Promise<Track[]> {
    const upsertedTracks: Track[] = [];

    for (const file of files) {
      const track = await this.prisma.track.upsert({
        where: { filePath: file.filePath },
        update: {
          fileName: file.fileName,
          title: file.title,
          artist: file.artist,
          album: file.album,
          bpm: file.bpm,
          durationMs: file.durationMs,
          coverImagePath: file.coverImagePath
        },
        create: {
          filePath: file.filePath,
          fileName: file.fileName,
          title: file.title,
          artist: file.artist,
          album: file.album,
          bpm: file.bpm,
          durationMs: file.durationMs,
          coverImagePath: file.coverImagePath
        }
      });

      upsertedTracks.push(track);
    }

    return upsertedTracks;
  }

  async updateCoverPath(id: string, coverImagePath: string): Promise<Track> {
    return this.prisma.track.update({
      where: { id },
      data: { coverImagePath }
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.track.delete({ where: { id } });
  }

  async countAll(): Promise<number> {
    return this.prisma.track.count();
  }

  async getMarkers(trackId: string): Promise<TrackMarker[]> {
    return this.prisma.trackMarker.findMany({
      where: { trackId },
      orderBy: { position: "asc" }
    });
  }

  async setMarkers(trackId: string, markers: MarkerInput[]): Promise<TrackMarker[]> {
    await this.prisma.trackMarker.deleteMany({ where: { trackId } });
    if (markers.length === 0) return [];
    await this.prisma.trackMarker.createMany({
      data: markers.map((m) => ({
        trackId,
        position: m.position,
        label: m.label
      }))
    });
    return this.getMarkers(trackId);
  }
}

