import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { TracksModule } from "./tracks/tracks.module";

@Module({
  imports: [PrismaModule, TracksModule],
  controllers: [],
  providers: []
})
export class AppModule {}

