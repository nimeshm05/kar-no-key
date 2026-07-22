import type { AwardEntry, AwardsSnapshot } from "./types.ts";
import { computeAccuracy, computeWpm } from "./scoring.ts";

export type PlayerRaceStats = {
  player_id: string;
  display_name: string;
  score: number;
  phrases_completed: number;
  correct_chars: number;
  attempted_chars: number;
  typing_ms: number;
  avg_phrase_completion_ms: number | null;
};

function compareNumberDesc(a: number, b: number): number {
  return b - a;
}

function rankBy(
  players: PlayerRaceStats[],
  getMetric: (player: PlayerRaceStats) => number,
  tieBreakers: Array<(player: PlayerRaceStats) => number>,
): AwardEntry[] {
  const sorted = [...players].sort((left, right) => {
    const metricDiff = compareNumberDesc(getMetric(left), getMetric(right));
    if (metricDiff !== 0) {
      return metricDiff;
    }

    for (const getTie of tieBreakers) {
      const tieDiff = compareNumberDesc(getTie(left), getTie(right));
      if (tieDiff !== 0) {
        return tieDiff;
      }
    }

    return left.display_name.localeCompare(right.display_name);
  });

  return sorted.map((player, index) => ({
    player_id: player.player_id,
    display_name: player.display_name,
    metric: getMetric(player),
    rank: index + 1,
  }));
}

export function buildAwardsSnapshot(players: PlayerRaceStats[]): AwardsSnapshot {
  const withComputed = players.map((player) => {
    const wpm = computeWpm(player.correct_chars, player.typing_ms);
    const accuracy = computeAccuracy(player.correct_chars, player.attempted_chars);
    return { ...player, wpm, accuracy };
  });

  const champions = rankBy(
    withComputed,
    (player) => player.score,
    [
      (player) => player.phrases_completed,
      (player) => player.wpm,
      (player) =>
        player.avg_phrase_completion_ms == null
          ? 0
          : -player.avg_phrase_completion_ms,
    ],
  );

  const sharpshooters = rankBy(
    withComputed,
    (player) => player.phrases_completed,
    [
      (player) => player.accuracy,
      (player) =>
        player.avg_phrase_completion_ms == null
          ? 0
          : -player.avg_phrase_completion_ms,
    ],
  );

  const speedDemons = rankBy(
    withComputed,
    (player) => Math.round(player.wpm * 10) / 10,
    [
      (player) => player.accuracy,
      (player) => player.phrases_completed,
    ],
  );

  return {
    champions,
    sharpshooters,
    speed_demons: speedDemons,
  };
}

export function playerMetricsForPersist(player: PlayerRaceStats): {
  wpm: number;
  accuracy: number;
} {
  return {
    wpm: computeWpm(player.correct_chars, player.typing_ms),
    accuracy: computeAccuracy(player.correct_chars, player.attempted_chars),
  };
}
