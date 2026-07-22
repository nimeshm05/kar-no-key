import { useCallback, useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/amplitude";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { submitPhraseProgress } from "@/lib/supabase/functions";

const SUBMIT_DEBOUNCE_MS = 250;
const TYPING_IDLE_MS = 1500;

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
  const typingActiveStartedAtRef = useRef<number | null>(null);
  const typingAccumulatedMsRef = useRef(0);
  const typingIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTypedTextRef = useRef(typedText);

  const flushTypingMsDelta = useCallback(() => {
    const now = Date.now();

    if (typingActiveStartedAtRef.current != null) {
      typingAccumulatedMsRef.current += Math.max(
        0,
        now - typingActiveStartedAtRef.current,
      );
      typingActiveStartedAtRef.current = null;
    }

    const delta = Math.floor(typingAccumulatedMsRef.current);
    typingAccumulatedMsRef.current = 0;
    return delta;
  }, []);

  const markTypingActivity = useCallback(() => {
    const now = Date.now();

    if (typingActiveStartedAtRef.current == null) {
      typingActiveStartedAtRef.current = now;
    }

    if (typingIdleTimerRef.current) {
      clearTimeout(typingIdleTimerRef.current);
    }

    typingIdleTimerRef.current = setTimeout(() => {
      if (typingActiveStartedAtRef.current != null) {
        typingAccumulatedMsRef.current += Math.max(
          0,
          Date.now() - typingActiveStartedAtRef.current,
        );
        typingActiveStartedAtRef.current = null;
      }
    }, TYPING_IDLE_MS);
  }, []);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onScoreUpdate]);

  useEffect(() => {
    typedTextRef.current = typedText;

    if (typedText !== prevTypedTextRef.current && isPlaying) {
      markTypingActivity();
    }

    prevTypedTextRef.current = typedText;
  }, [typedText, isPlaying, markTypingActivity]);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);

  useEffect(() => {
    return () => {
      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
      }
    };
  }, []);

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
      const typingMsDelta = flushTypingMsDelta();

      try {
        const { data, error } = await submitPhraseProgress(activePlayerId, {
          phrase_index: phraseIndex,
          typed_text: text,
          finalize,
          typing_ms_delta: typingMsDelta,
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
          trackEvent(AnalyticsEvent.PhraseFinalized, {
            phrase_index: phraseIndex,
            points_awarded: data.points_awarded,
            score: data.score,
            phrases_completed: data.phrases_completed,
            source_screen: "game",
          });
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
  }, [playerId, isPlaying, activePhraseIndex, typedText, flushTypingMsDelta]);

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
      const typingMsDelta = flushTypingMsDelta();

      try {
        const { data, error } = await submitPhraseProgress(activePlayerId, {
          phrase_index: phraseIndex,
          typed_text: text,
          finalize: true,
          typing_ms_delta: typingMsDelta,
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
        trackEvent(AnalyticsEvent.PhraseFinalized, {
          phrase_index: phraseIndex,
          points_awarded: data.points_awarded,
          score: data.score,
          phrases_completed: data.phrases_completed,
          source_screen: "game",
        });
      } finally {
        inFlightRef.current = false;

        const pending = pendingSubmitRef.current;
        pendingSubmitRef.current = null;

        if (pending) {
          const pendingTypingMs = flushTypingMsDelta();
          const { data, error } = await submitPhraseProgress(activePlayerId, {
            phrase_index: pending.phraseIndex,
            typed_text: pending.typedText,
            finalize: false,
            typing_ms_delta: pendingTypingMs,
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
  }, [activePhraseIndex, flushTypingMsDelta]);
}
