/** Tipos do domínio do player (faixas, cenas, bancos, playlists). */

export type TrackViewModel = {
  id: string;
  title: string;
  artist: string;
  album: string;
  bpm?: number;
  durationMs: number;
  coverImageUrl?: string;
  streamUrl?: string;
};

export type BankId =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J"
  | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T"
  | "U" | "V" | "W" | "X" | "Y" | "Z";

export type SceneStatus = "playing" | "paused" | "stopped" | "idle";

export type SceneItem = {
  id: string;
  label: string;
  bankId: BankId;
  status: SceneStatus;
  /** ID da pasta-pai (null = raiz do banco). */
  parentId?: string | null;
};

/** Pasta de cenas (submenu colapsável). */
export type SceneFolder = {
  id: string;
  label: string;
  bankId: BankId;
  /** ID da pasta-pai (null = raiz do banco). */
  parentId?: string | null;
};

export type PlaylistItem = {
  id: string;
  name: string;
};

export type TrackMarkerViewModel = {
  position: number;
  label: string;
};
