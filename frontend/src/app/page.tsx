 "use client";

import React, { useEffect, useMemo, useState } from "react";
import { TouchpadView } from "@/components/player/TouchpadView";
import type { TrackViewModel } from "@/types/player";
import { fetchMjcSongs, getMjcSongStreamUrl } from "@/lib/api/mjc-songs-api";

function mapToViewModels(tracks: Awaited<ReturnType<typeof fetchMjcSongs>>): TrackViewModel[] {
  return tracks.map((t) => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    durationMs: t.durationMs,
    coverImageUrl: t.coverImagePath,
    streamUrl: getMjcSongStreamUrl(t),
  }));
}

export default function Home(): React.ReactElement {
  const [tracks, setTracks] = useState<TrackViewModel[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadTracks = async (): Promise<void> => {
      try {
        const apiTracks = await fetchMjcSongs();
        if (!cancelled) {
          setTracks(mapToViewModels(apiTracks));
        }
      } catch {
        if (!cancelled) {
          setTracks([]);
        }
      }
    };

    void loadTracks();
    return () => {
      cancelled = true;
    };
  }, []);

  const bpmRange = useMemo(() => ({ min: 120, max: 132 }), []);

  return (
    <TouchpadView
      initialTracks={tracks}
      bpmRange={bpmRange}
    />
  );
}
