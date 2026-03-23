import { IsArray, IsNumber, IsString, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class TrackMarkerItemDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  position: number;

  @IsString()
  label: string;
}

export class SetTrackMarkersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackMarkerItemDto)
  markers: TrackMarkerItemDto[];
}
