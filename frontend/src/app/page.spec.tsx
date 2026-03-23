import { render, screen } from "@testing-library/react";
import type { TrackDto } from "@/lib/api/tracks-api";
import Home from "./page";

vi.mock("@/lib/api/tracks-api", () => ({
  fetchTracks: vi.fn()
}));

describe("Home page", () => {
  it("renders header and tracks loaded from API", async () => {
    const tracks: TrackDto[] = [
      {
        id: "1",
        filePath: "music/track-1.mp3",
        fileName: "track-1.mp3",
        title: "Turn Down For What",
        artist: "W.D Zyro",
        album: "Live Session",
        bpm: 128,
        durationMs: 252000
      }
    ];

    const { fetchTracks } = await import("@/lib/api/tracks-api");
    (fetchTracks as unknown as jest.Mock).mockResolvedValue(tracks);

    const { findByText } = render(await Home());

    expect(screen.getByText("MJC Player")).toBeInTheDocument();
    expect(await findByText("Turn Down For What")).toBeInTheDocument();
  });
});

