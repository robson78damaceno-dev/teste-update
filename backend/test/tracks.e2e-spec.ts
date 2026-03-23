import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { Track } from "@prisma/client";
import type { FilterTracksDto } from "../src/tracks/dto/filter-tracks.dto";
import { TracksController } from "../src/tracks/tracks.controller";
import type { MusicFileMetadata } from "../src/tracks/scanner/music-scanner.service";
import { MusicScannerService } from "../src/tracks/scanner/music-scanner.service";
import { TRACKS_REPOSITORY_TOKEN } from "../src/tracks/tracks.constants";
import type { TracksRepository } from "../src/tracks/tracks.repository";
import { TracksService } from "../src/tracks/tracks.service";

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
  async syncFromScan(_files: MusicFileMetadata[]): Promise<Track[]> {
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
  createdAt: new Date(),
  updatedAt: new Date()
};

describe("TracksController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const repository = new InMemoryTracksRepository([baseTrack]);
    const scanner = new StubMusicScannerService([]);

    const moduleRef = await Test.createTestingModule({
      controllers: [TracksController],
      providers: [
        TracksService,
        {
          provide: TRACKS_REPOSITORY_TOKEN,
          useValue: repository
        },
        {
          provide: MusicScannerService,
          useValue: scanner
        }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /tracks should return list of tracks", async () => {
    const response = await request(app.getHttpServer()).get("/tracks").expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: baseTrack.id,
      title: baseTrack.title
    });
  });

  it("POST /tracks/scan should trigger scan and return tracks", async () => {
    const response = await request(app.getHttpServer())
      .post("/tracks/scan")
      .send({})
      .expect(201);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(baseTrack.id);
  });
});

