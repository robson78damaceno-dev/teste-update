import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MusicScannerService } from "./scanner/music-scanner.service";
import { TracksController } from "./tracks.controller";
import { TRACKS_REPOSITORY_TOKEN } from "./tracks.constants";
import { PrismaTracksRepository } from "./tracks.repository";
import { TracksService } from "./tracks.service";

@Module({
  imports: [PrismaModule],
  controllers: [TracksController],
  providers: [
    TracksService,
    MusicScannerService,
    {
      provide: TRACKS_REPOSITORY_TOKEN,
      useClass: PrismaTracksRepository
    }
  ]
})
export class TracksModule {}

