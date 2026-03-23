import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class FilterTracksDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(40)
  @Max(300)
  bpmMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(40)
  @Max(300)
  bpmMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMinMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationMaxMs?: number;
}

