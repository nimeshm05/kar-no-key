import type { SongResult } from "@/lib/songs/searchSongs";
import "./SongCard.css";

type SongCardProps = {
  song?: SongResult;
  isSelected?: boolean;
  onSelect?: (song: SongResult) => void;
  durationLabel?: string | null;
  lyricsStatus?: "available" | "unavailable" | null;
  isLoading?: boolean;
};

export default function SongCard({
  song,
  isSelected = false,
  onSelect,
  durationLabel,
  lyricsStatus = null,
  isLoading = false,
}: SongCardProps) {
  if (isLoading) {
    return (
      <div className="song-card song-card--loading" aria-hidden="true">
        <div className="song-card__thumbnail song-card__thumbnail--skeleton" />
        <div className="song-card__info">
          <div className="song-card__details">
            <div className="song-card__skeleton-title" />
          </div>
          <div className="song-card__meta">
            <div className="song-card__skeleton-meta" />
            <div className="song-card__skeleton-meta" />
          </div>
        </div>
      </div>
    );
  }

  if (!song) {
    return null;
  }

  const selected = song;

  const cardClasses = [
    "song-card",
    isSelected && "song-card--selected",
    onSelect && "song-card--interactive",
  ]
    .filter(Boolean)
    .join(" ");

  function handleClick() {
    onSelect?.(selected);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!onSelect) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(selected);
    }
  }

  const subtitle = selected.channel ?? selected.artist;

  return (
    <div
      className={cardClasses}
      onClick={onSelect ? handleClick : undefined}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? isSelected : undefined}
    >
      <div className="song-card__thumbnail">
        {selected.thumbnail_url ? (
          <img
            className="song-card__image"
            src={selected.thumbnail_url}
            alt=""
          />
        ) : (
          <div className="song-card__placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="song-card__info">
        <div className="song-card__details">
          <p className="song-card__title text-button-label">{selected.title}</p>
        </div>
        <div className="song-card__meta">
          {subtitle ? (
            <span className="song-card__subtitle text-button-label">
              {subtitle}
            </span>
          ) : null}
          {durationLabel ? (
            <span className="song-card__duration text-button-label">
              {durationLabel}
            </span>
          ) : null}
          {lyricsStatus ? (
            <span
              className={[
                "song-card__lyrics-badge",
                "text-button-label",
                lyricsStatus === "available"
                  ? "song-card__lyrics-badge--available"
                  : "song-card__lyrics-badge--unavailable",
              ].join(" ")}
            >
              {lyricsStatus === "available" ? "lyrics available" : "no lyrics"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
