import type { Track } from "@prisma/client";
import type { FilterTracksDto } from "./dto/filter-tracks.dto";
import { MusicScannerService, type MusicFileMetadata } from "./scanner/music-scanner.service";
import { TRACKS_REPOSITORY_TOKEN } from "./tracks.constants";
import type { TracksRepository } from "./tracks.repository";
import { TracksService } from "./tracks.service";

class InMemoryTracksRepository implements TracksRepository {
  private readonly tracks: Track[];

  constructor(tracks: Track[]) {
    this.tracks = tracks;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findAll(_filters: FilterTracksDto): Promise<Track[]> {
    return this.tracks;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findById(id: string): Promise<Track | null> {
    return this.tracks.find((track) => track.id === id) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async syncFromScan(files: MusicFileMetadata[]): Promise<Track[]> {
    if (files.length === 0) {
      return [];
    }

    return this.tracks;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateCoverPath(id: string, coverImagePath: string): Promise<Track> {
    const track = this.tracks.find((t) => t.id === id);
    if (track === undefined) throw new Error("Track not found");
    return { ...track, coverImagePath };
  }
}

class StubMusicScannerService extends MusicScannerService {
  private readonly files: MusicFileMetadata[];

  constructor(files: MusicFileMetadata[]) {
    super();
    this.files = files;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async scan(): Promise<MusicFileMetadata[]> {
    return this.files;
  }
}

const baseTrack: Track = {
  id: "track-1",
  filePath: "music/track-1.mp3",
  fileName: "track-1.mp3",
  title: "Track One",
  artist: "Artist",
  album: "Album",
  bpm: 128,
  durationMs: 180000,
  coverImagePath: null,
  isFallback: false,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe("TracksService", () => {
  it("should return all tracks as DTOs", async () => {
    const repository = new InMemoryTracksRepository([baseTrack]);
    const scanner = new StubMusicScannerService([]);
    const service = new TracksService(repository, scanner);

    const results = await service.findAll({});

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: baseTrack.id,
      title: baseTrack.title,
      artist: baseTrack.artist,
      durationMs: baseTrack.durationMs
    });
  });

  it("should throw when track is not found", async () => {
    const repository = new InMemoryTracksRepository([]);
    const scanner = new StubMusicScannerService([]);
    const service = new TracksService(repository, scanner);

    await expect(service.findOne("missing-id")).rejects.toHaveProperty("status", 404);
  });

  it("should delegate scanAndSync to scanner and repository", async () => {
    const files: MusicFileMetadata[] = [
      {
        filePath: "music/track-1.mp3",
        fileName: "track-1.mp3",
        title: "Track One",
        artist: "Artist",
        album: "Album",
        bpm: 120,
        durationMs: 1000
      }
    ];

    const repository = new InMemoryTracksRepository([baseTrack]);
    const scanner = new StubMusicScannerService(files);

    const service = new TracksService(repository, scanner);

    const results = await service.scanAndSync();

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(baseTrack.id);
  });
}

