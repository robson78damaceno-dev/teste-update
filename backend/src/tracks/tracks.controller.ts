import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Post,
  Query,
  Res,
  StreamableFile
} from "@nestjs/common";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { type Response } from "express";
import { CacheTrackDto, type CachedTrackInfoDto } from "./dto/cache-track.dto";
import { FilterTracksDto } from "./dto/filter-tracks.dto";
import { SetTrackMarkersDto } from "./dto/track-marker.dto";
import { TrackResponseDto } from "./dto/track-response.dto";
import { TracksService, type LibraryInfoDto } from "./tracks.service";

@Controller("tracks")
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  async findAll(@Query() filters: FilterTracksDto): Promise<TrackResponseDto[]> {
    return this.tracksService.findAll(filters);
  }

  @Get("fallback")
  async getFallbackTracks(): Promise<TrackResponseDto[]> {
    return this.tracksService.getFallbackTracks();
  }

  @Get("library-info")
  async getLibraryInfo(): Promise<LibraryInfoDto> {
    return this.tracksService.getLibraryInfo();
  }

  /* ─── Cache (offline) ─── */

  @Get("cached")
  async getCachedTracks(): Promise<CachedTrackInfoDto[]> {
    return this.tracksService.getCachedTracks();
  }

  @Post("cache")
  async cacheTrack(@Body() body: CacheTrackDto): Promise<CachedTrackInfoDto> {
    return this.tracksService.cacheOnlineTrack(body);
  }

  @Get("cache/:onlineId/stream")
  async streamCachedAudio(
    @Param("onlineId") onlineId: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile | void> {
    const audioPath = await this.tracksService.getCachedAudioPath(onlineId);
    if (audioPath === null) {
      res.status(404).end();
      return;
    }
    try {
      await stat(audioPath);
    } catch {
      res.status(404).end();
      return;
    }
    const ext = audioPath.slice(audioPath.lastIndexOf(".") + 1).toLowerCase();
    const mime =
      ext === "mp3"
        ? "audio/mpeg"
        : ext === "wav"
          ? "audio/wav"
          : ext === "flac"
            ? "audio/flac"
            : ext === "m4a"
              ? "audio/mp4"
              : "application/octet-stream";
    res.set({ "Content-Type": mime });
    return new StreamableFile(createReadStream(audioPath));
  }

  @Get("cache/:onlineId/cover")
  async getCachedCover(
    @Param("onlineId") onlineId: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile | void> {
    const coverPath = await this.tracksService.getCachedCoverPath(onlineId);
    if (coverPath === null) {
      res.status(404).end();
      return;
    }
    try {
      await stat(coverPath);
    } catch {
      res.status(404).end();
      return;
    }
    const ext = coverPath.slice(coverPath.lastIndexOf(".") + 1).toLowerCase();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    res.set({ "Content-Type": mime });
    return new StreamableFile(createReadStream(coverPath));
  }

  @Delete("cache/:onlineId")
  @HttpCode(204)
  async removeCachedTrack(@Param("onlineId") onlineId: string): Promise<void> {
    return this.tracksService.removeCachedTrack(onlineId);
  }

  /* ─── Tracks by ID ─── */

  @Get(":id/cover")
  async getCover(
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile | void> {
    const coverPath = await this.tracksService.getCoverPath(id);
    if (coverPath === null) {
      res.status(404).end();
      return;
    }
    try {
      await stat(coverPath);
    } catch {
      res.status(404).end();
      return;
    }
    const ext = coverPath.slice(coverPath.lastIndexOf(".") + 1).toLowerCase();
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    res.set({ "Content-Type": mime });
    return new StreamableFile(createReadStream(coverPath));
  }

  @Get(":id/stream")
  async streamAudio(
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile | void> {
    const audioPath = await this.tracksService.getAudioPath(id);
    if (audioPath === null) {
      res.status(404).end();
      return;
    }
    try {
      await stat(audioPath);
    } catch {
      res.status(404).end();
      return;
    }
    const ext = audioPath.slice(audioPath.lastIndexOf(".") + 1).toLowerCase();
    const mime =
      ext === "mp3"
        ? "audio/mpeg"
        : ext === "wav"
          ? "audio/wav"
          : ext === "flac"
            ? "audio/flac"
            : ext === "m4a"
              ? "audio/mp4"
              : "application/octet-stream";
    res.set({ "Content-Type": mime });
    return new StreamableFile(createReadStream(audioPath));
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<TrackResponseDto> {
    return this.tracksService.findOne(id);
  }

  @Get(":id/markers")
  async getMarkers(@Param("id") id: string) {
    return this.tracksService.getMarkers(id);
  }

  @Put(":id/markers")
  async setMarkers(
    @Param("id") id: string,
    @Body() body: SetTrackMarkersDto
  ) {
    return this.tracksService.setMarkers(id, body.markers);
  }

  @Get(":id/markers/export")
  async getMarkersExport(
    @Param("id") id: string,
    @Res() res: Response
  ): Promise<void> {
    const track = await this.tracksService.findOne(id);
    const content = await this.tracksService.getMarkersExport(id);
    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="marcadores-${track.title.replace(/[^a-z0-9_-]/gi, "_")}.txt"`
    });
    res.send(content);
  }

  @Delete(":id")
  @HttpCode(204)
  async deleteTrack(@Param("id") id: string): Promise<void> {
    return this.tracksService.deleteTrack(id);
  }

  @Post("scan")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async scan(@Body() _body: Record<string, never>): Promise<TrackResponseDto[]> {
    return this.tracksService.scanAndSync();
  }
}

