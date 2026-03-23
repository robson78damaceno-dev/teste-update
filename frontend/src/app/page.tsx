import React from "react";
import { TouchpadView } from "@/components/player/TouchpadView";
import type { TrackViewModel } from "@/types/player";
import { fetchMjcSongs, getMjcSongStreamUrl } from "@/lib/api/mjc-songs-api";

export default async function Home(): Promise<React.ReactElement> {
  let tracks: TrackViewModel[] = [];

  try {
    const apiTracks = await fetchMjcSongs();
    tracks = apiTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      durationMs: t.durationMs,
      coverImageUrl: t.coverImagePath,
      streamUrl: getMjcSongStreamUrl(t),
    }));
  } catch {
    tracks = [];
  }

  return (
    <TouchpadView
      initialTracks={tracks}
      bpmRange={{ min: 120, max: 132 }}
    />
  );
}
