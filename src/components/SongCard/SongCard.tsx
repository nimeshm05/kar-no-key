import type { SongResult } from "@/lib/songs/searchSongs";
import "./SongCard.css";

type SongCardProps = {
  song: SongResult;
  isSelected?: boolean;
  onSelect?: (song: SongResult) => void;
  durationLabel?: string | null;
  lyricsStatus?: "available" | "unavailable" | null;
};

export default function SongCard({
  song,
  isSelected = false,
  onSelect,
  durationLabel,
  lyricsStatus = null,
}: SongCardProps) {
  const cardClasses = [
    "song-card",
    isSelected && "song-card--selected",
    onSelect && "song-card--interactive",
  ]
    .filter(Boolean)
    .join(" ");

  function handleClick() {
    onSelect?.(song);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!onSelect) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(song);
    }
  }

  const subtitle = song.channel ?? song.artist;

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
        {song.thumbnail_url ? (
          <img
            className="song-card__image"
            src={song.thumbnail_url}
            alt=""
          />
        ) : (
          <div className="song-card__placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="song-card__info">
        <div className="song-card__details">
          <p className="song-card__title text-button-label">{song.title}</p>
          {subtitle ? (
            <p className="song-card__subtitle text-button-label">{subtitle}</p>
          ) : null}
        </div>
        <div className="song-card__meta">
          {durationLabel ? (
            <span className="song-card__duration text-button-label">{durationLabel}</span>
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
        {onSelect ? (
          <div className="song-card__hover-action" aria-hidden="true">
            <span className="song-card__hover-label text-button-label">select song</span>
            <span className="song-card__hover-icon" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
