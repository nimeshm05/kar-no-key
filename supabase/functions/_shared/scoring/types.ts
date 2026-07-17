export type LyricPhrase = {
  index: number;
  text: string;
  start_ms: number;
  end_ms: number;
};

export type PhraseProgressRow = {
  scored_char_indices: number[];
  phrase_bonus_awarded: boolean;
  finalized: boolean;
};

export type ScorePhraseResult = {
  scoredCharIndices: number[];
  pointsAwarded: number;
  phraseBonusAwarded: boolean;
  finalized: boolean;
  phrasesCompletedDelta: number;
};
