"use client";

import { useEffect, useRef, type ReactNode } from "react";
import "./PhraseTypingArea.css";

type PhraseTypingAreaProps = {
  phraseText: string;
  typedText: string;
  onTypedTextChange: (value: string) => void;
  isLocked: boolean;
};

function normalizeChar(char: string): string {
  return char.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function renderPhraseOverlay(expected: string, typed: string) {
  const chars: ReactNode[] = [];

  for (let index = 0; index < expected.length; index += 1) {
    const expectedChar = expected[index];
    const typedChar = typed[index];
    const isSpace = expectedChar === " ";

    let className = "phrase-typing-area__char";

    if (typedChar !== undefined) {
      const matches =
        isSpace
          ? typedChar === " "
          : normalizeChar(typedChar) === normalizeChar(expectedChar);

      className += matches
        ? " phrase-typing-area__char--correct"
        : " phrase-typing-area__char--incorrect";
    } else {
      className += " phrase-typing-area__char--pending";
    }

    chars.push(
      <span key={`${index}-${expectedChar}`} className={className}>
        {expectedChar}
      </span>,
    );
  }

  return chars;
}

export default function PhraseTypingArea({
  phraseText,
  typedText,
  onTypedTextChange,
  isLocked,
}: PhraseTypingAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLocked) {
      inputRef.current?.focus();
    }
  }, [phraseText, isLocked]);

  return (
    <div className="phrase-typing-area">
      <div className="phrase-typing-area__display" aria-hidden="true">
        {renderPhraseOverlay(phraseText, typedText)}
      </div>
      <input
        ref={inputRef}
        className="phrase-typing-area__input"
        type="text"
        value={typedText}
        onChange={(event) => onTypedTextChange(event.target.value)}
        disabled={isLocked}
        aria-label="Type the current lyric phrase"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  );
}
