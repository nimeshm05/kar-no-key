import "./AwardSection.css";
import type { AwardEntry } from "@/lib/supabase/functions";

type AwardSectionProps = {
  title: string;
  description: string;
  entries: AwardEntry[];
  formatMetric?: (metric: number) => string;
};

const STAR_BY_RANK: Record<number, string> = {
  1: "/icons/star-gold.svg",
  2: "/icons/star-silver.svg",
  3: "/icons/star-bronze.svg",
};

export default function AwardSection({
  title,
  description,
  entries,
  formatMetric = (metric) => String(metric),
}: AwardSectionProps) {
  return (
    <section className="award-section">
      <header className="award-section__header">
        <h2 className="award-section__title text-heading-2">{title}</h2>
        <p className="award-section__description text-body">{description}</p>
      </header>

      <div className="award-section__table">
        <div className="award-section__table-header">
          <span className="award-section__col-players text-body">Players</span>
          <span className="award-section__col-score text-body">Score</span>
        </div>

        <ul className="award-section__rows">
          {entries.map((entry) => {
            const isTopThree = entry.rank <= 3;
            const starSrc = STAR_BY_RANK[entry.rank];
            const rowClass = [
              "award-section__row",
              "text-body-regular",
              isTopThree
                ? "award-section__row--top"
                : "award-section__row--muted",
            ].join(" ");

            return (
              <li key={`${title}-${entry.player_id}`} className={rowClass}>
                <span className="award-section__player">
                  <span className="award-section__rank-slot" aria-hidden="true">
                    {starSrc ? (
                      <img
                        className="award-section__star"
                        src={starSrc}
                        alt=""
                        width={24}
                        height={24}
                      />
                    ) : null}
                  </span>
                  <span className="award-section__name">
                    {entry.display_name.toLowerCase()}
                  </span>
                </span>
                <span className="award-section__metric">
                  {formatMetric(entry.metric)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
