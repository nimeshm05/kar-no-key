export type LyricPhrase = {
  index: number;
  text: string;
  start_ms: number;
  end_ms: number;
};

export type PhraseProgressRow = {
  scored_char_indices: number[];
  attempted_char_indices: number[];
  phrase_bonus_awarded: boolean;
  finalized: boolean;
};

export type ScorePhraseResult = {
  scoredCharIndices: number[];
  attemptedCharIndices: number[];
  pointsAwarded: number;
  phraseBonusAwarded: boolean;
  finalized: boolean;
  phrasesCompletedDelta: number;
  correctCharsDelta: number;
  attemptedCharsDelta: number;
};

export type AwardEntry = {
  player_id: string;
  display_name: string;
  metric: number;
  rank: number;
};

export type AwardsSnapshot = {
  champions: AwardEntry[];
  sharpshooters: AwardEntry[];
  speed_demons: AwardEntry[];
};
