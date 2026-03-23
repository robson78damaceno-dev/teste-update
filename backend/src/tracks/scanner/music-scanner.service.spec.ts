import * as fs from "fs/promises";
import * as mm from "music-metadata";
import { MusicScannerService } from "./music-scanner.service";

jest.mock("fs/promises");
jest.mock("music-metadata");

const mockedFs = fs as unknown as {
  readdir: jest.Mock;
};

const mockedMm = mm as unknown as {
  parseFile: jest.Mock;
};

describe("MusicScannerService", () => {
  beforeEach(() => {
    mockedFs.readdir.mockReset();
    mockedMm.parseFile.mockReset();
  });

  it("should scan supported audio files and map metadata", async () => {
    mockedFs.readdir.mockResolvedValue([
      {
        name: "track-1.mp3",
        isDirectory: () => false
      }
    ]);

    mockedMm.parseFile.mockResolvedValue({
      common: {
        title: "Track One",
        artist: "Artist",
        album: "Album",
        bpm: 128
      },
      format: {
        duration: 180
      }
    });

    const service = new MusicScannerService();
    const results = await service.scan();

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      fileName: "track-1.mp3",
      title: "Track One",
      artist: "Artist",
      album: "Album",
      bpm: 128,
      durationMs: 180000
    });
  });
});

