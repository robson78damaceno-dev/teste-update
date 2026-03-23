export class TrackResponseDto {
  readonly id: string;
  readonly filePath: string;
  readonly fileName: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string;
  readonly bpm?: number;
  readonly durationMs: number;
  readonly coverImagePath?: string;

  constructor(params: {
    id: string;
    filePath: string;
    fileName: string;
    title: string;
    artist: string;
    album: string;
    bpm?: number;
    durationMs: number;
    coverImagePath?: string;
  }) {
    this.id = params.id;
    this.filePath = params.filePath;
    this.fileName = params.fileName;
    this.title = params.title;
    this.artist = params.artist;
    this.album = params.album;
    this.bpm = params.bpm;
    this.durationMs = params.durationMs;
    this.coverImagePath = params.coverImagePath;
  }
}

