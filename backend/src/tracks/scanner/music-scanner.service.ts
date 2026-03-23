import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import * as mm from "music-metadata";

export type MusicFileMetadata = {
  filePath: string;
  fileName: string;
  title: string;
  artist: string;
  album: string;
  bpm?: number;
  durationMs: number;
  coverImagePath?: string;
  /** Picture extraída do metadado (capa do álbum) para salvar após upsert */
  picture?: { data: Buffer; format: string };
};

const SUPPORTED_EXTENSIONS = [".mp3", ".wav", ".flac", ".m4a"] as const;

@Injectable()
export class MusicScannerService {
  private readonly rootDirectory: string;

  constructor() {
    const base = process.env.MUSIC_ROOT_DIRECTORY;
    const raw =
      base !== undefined && base.length > 0 ? base : path.join(process.cwd(), "music");
    this.rootDirectory = path.resolve(raw);
  }

  getRootDirectory(): string {
    return this.rootDirectory;
  }

  async scan(): Promise<MusicFileMetadata[]> {
    let audioFiles: string[];
    try {
      audioFiles = await this.walkDirectory(this.rootDirectory);
    } catch {
      return [];
    }

    const results = await Promise.all(
      audioFiles.map(async (filePath): Promise<MusicFileMetadata | null> => {
        try {
          const parsed = await mm.parseFile(filePath);
          const title = parsed.common.title ?? path.basename(filePath);
          const artist = parsed.common.artist ?? "Unknown Artist";
          const album = parsed.common.album ?? "Unknown Album";
          const bpm = parsed.common.bpm !== undefined ? Number(parsed.common.bpm) : undefined;
          const durationSeconds = parsed.format.duration ?? 0;
          const durationMs = Math.round(durationSeconds * 1000);

          const picture = parsed.common.picture?.[0];
          const metadata: MusicFileMetadata = {
            filePath,
            fileName: path.basename(filePath),
            title,
            artist,
            album,
            bpm,
            durationMs,
            picture:
              picture !== undefined
                ? { data: picture.data, format: picture.format }
                : undefined
          };

          return metadata;
        } catch {
          return null;
        }
      })
    );

    return results.filter((r): r is MusicFileMetadata => r !== null);
  }

  private async walkDirectory(directory: string): Promise<string[]> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const nestedFiles = await this.walkDirectory(fullPath);
        files.push(...nestedFiles);
      } else if (this.isSupportedAudioFile(fullPath)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private isSupportedAudioFile(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number]);
  }
}

