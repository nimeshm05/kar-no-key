import { useEffect, useRef } from "react";
import { submitPhraseProgress } from "@/lib/supabase/functions";

const SUBMIT_DEBOUNCE_MS = 250;

type UsePhraseScoringOptions = {
  playerId: string | null;
  isPlaying: boolean;
  activePhraseIndex: number;
  typedText: string;
  onScoreUpdate: (
    playerId: string,
    score: number,
    phrasesCompleted: number,
  ) => void;
};

export function usePhraseScoring({
  playerId,
  isPlaying,
  activePhraseIndex,
  typedText,
  onScoreUpdate,
}: UsePhraseScoringOptions) {
  const onScoreUpdateRef = useRef(onScoreUpdate);
  const typedTextRef = useRef(typedText);
  const prevActivePhraseIndexRef = useRef(activePhraseIndex);
  const finalizedPhrasesRef = useRef<Set<number>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingSubmitRef = useRef<{ phraseIndex: number; typedText: string } | null>(
    null,
  );
  const playerIdRef = useRef(playerId);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onScoreUpdate]);

  useEffect(() => {
    typedTextRef.current = typedText;
  }, [typedText]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    async function runSubmit(
      phraseIndex: number,
      text: string,
      finalize: boolean,
    ) {
      const activePlayerId = playerIdRef.current;

      if (!activePlayerId) {
        return;
      }

      if (inFlightRef.current) {
        pendingSubmitRef.current = { phraseIndex, typedText: text };
        return;
      }

      inFlightRef.current = true;

      try {
        const { data, error } = await submitPhraseProgress(activePlayerId, {
          phrase_index: phraseIndex,
          typed_text: text,
          finalize,
        });

        if (error || !data || "error" in data) {
          return;
        }

        if (data.points_awarded > 0 || finalize) {
          onScoreUpdateRef.current(
            activePlayerId,
            data.score,
            data.phrases_completed,
          );
        }

        if (finalize) {
          finalizedPhrasesRef.current.add(phraseIndex);
        }
      } finally {
        inFlightRef.current = false;

        const pending = pendingSubmitRef.current;
        pendingSubmitRef.current = null;

        if (pending) {
          void runSubmit(pending.phraseIndex, pending.typedText, false);
        }
      }
    }

    if (!playerId || !isPlaying || activePhraseIndex < 0) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void runSubmit(activePhraseIndex, typedText, false);
    }, SUBMIT_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [playerId, isPlaying, activePhraseIndex, typedText]);

  useEffect(() => {
    async function finalizePhrase(phraseIndex: number, text: string) {
      const activePlayerId = playerIdRef.current;

      if (!activePlayerId) {
        return;
      }

      if (inFlightRef.current) {
        pendingSubmitRef.current = { phraseIndex, typedText: text };
        return;
      }

      inFlightRef.current = true;

      try {
        const { data, error } = await submitPhraseProgress(activePlayerId, {
          phrase_index: phraseIndex,
          typed_text: text,
          finalize: true,
        });

        if (error || !data || "error" in data) {
          return;
        }

        onScoreUpdateRef.current(
          activePlayerId,
          data.score,
          data.phrases_completed,
        );
        finalizedPhrasesRef.current.add(phraseIndex);
      } finally {
        inFlightRef.current = false;

        const pending = pendingSubmitRef.current;
        pendingSubmitRef.current = null;

        if (pending) {
          const { data, error } = await submitPhraseProgress(activePlayerId, {
            phrase_index: pending.phraseIndex,
            typed_text: pending.typedText,
            finalize: false,
          });

          if (!error && data && !("error" in data) && data.points_awarded > 0) {
            onScoreUpdateRef.current(
              activePlayerId,
              data.score,
              data.phrases_completed,
            );
          }
        }
      }
    }

    const previousPhraseIndex = prevActivePhraseIndexRef.current;

    if (
      previousPhraseIndex >= 0 &&
      activePhraseIndex > previousPhraseIndex &&
      !finalizedPhrasesRef.current.has(previousPhraseIndex)
    ) {
      void finalizePhrase(previousPhraseIndex, typedTextRef.current);
    }

    prevActivePhraseIndexRef.current = activePhraseIndex;
  }, [activePhraseIndex]);
}
