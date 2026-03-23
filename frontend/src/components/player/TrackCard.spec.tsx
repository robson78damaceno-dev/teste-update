import { render, screen, fireEvent } from "@testing-library/react";
import { TrackCard } from "./TrackCard";
import type { TrackViewModel } from "@/types/player";

const baseTrack: TrackViewModel = {
  id: "1",
  title: "Track One",
  artist: "Artist",
  album: "Album",
  bpm: 128,
  durationMs: 180000
};

const defaultTrackCardProps = {
  track: baseTrack,
  isActive: false,
  isPlaying: false,
  isLive: false,
  isMonitor: false,
  onPlayToggle: (): void => {},
  onSelect: (): void => {},
  onLiveToggle: (): void => {},
  onMonitorToggle: (): void => {},
};

describe("TrackCard", () => {
  it("renders basic metadata", () => {
    render(<TrackCard {...defaultTrackCardProps} />);

    expect(screen.getByText("Track One")).toBeInTheDocument();
    expect(screen.getByText("Artist")).toBeInTheDocument();
    expect(screen.getByText("3:00")).toBeInTheDocument();
  });

  it("calls onPlayToggle when play button is clicked", () => {
    const onPlayToggle = vi.fn();
    render(<TrackCard {...defaultTrackCardProps} onPlayToggle={onPlayToggle} />);

    const playButton = screen.getByRole("button", { name: /reproduzir/i });
    fireEvent.click(playButton);

    expect(onPlayToggle).toHaveBeenCalledWith(baseTrack.id);
  });

  it("calls onSelect and onPlayToggle when card is clicked", () => {
    const onSelect = vi.fn();
    const onPlayToggle = vi.fn();
    render(<TrackCard {...defaultTrackCardProps} onSelect={onSelect} onPlayToggle={onPlayToggle} />);

    const card = screen.getByText("Track One").closest(".track-card");
    expect(card).toBeInTheDocument();
    fireEvent.click(card!);

    expect(onSelect).toHaveBeenCalledWith(baseTrack.id);
    expect(onPlayToggle).toHaveBeenCalledWith(baseTrack.id);
  });
});
