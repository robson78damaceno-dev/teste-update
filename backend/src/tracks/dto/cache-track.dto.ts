import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

export class CacheTrackDto {
  @IsString()
  readonly sourceUrl: string;

  @IsString()
  readonly onlineId: string;

  @IsString()
  readonly fileName: string;

  @IsString()
  readonly title: string;

  @IsString()
  readonly artist: string;

  @IsString()
  readonly album: string;

  @IsOptional()
  @IsString()
  readonly genre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly year?: number;

  @Type(() => Number)
  @IsInt()
  readonly durationMs: number;

  @IsOptional()
  @IsString()
  readonly coverUrl?: string;
}

export class CachedTrackInfoDto {
  readonly onlineId: string;
  readonly fileName: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string;
  readonly genre?: string;
  readonly year?: number;
  readonly durationMs: number;
  readonly cachedAt: string;
  readonly hasCover: boolean;
}
