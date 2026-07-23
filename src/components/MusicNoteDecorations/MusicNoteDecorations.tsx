"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePendulumRotations } from "@/components/TypewriterIllustration/usePendulumRotations";
import {
  GAME_PAGE_DECORATIONS,
  NAME_PAGE_DECORATIONS,
  NAME_PAGE_PENDULUMS,
  SEARCH_PAGE_DECORATIONS,
  SEARCH_PAGE_PENDULUMS,
  type NoteDecoration,
} from "./decorations";
import { MUSIC_NOTES } from "./musicNotes";
import "./MusicNoteDecorations.css";

const MotionG = motion.g;

const PULSE_PERIOD_SEC = 3;

type MusicNoteDecorationsProps = {
  variant?: "landing" | "search" | "game";
  /** When true, stroke color pulse runs (game variant). Frozen when false. */
  isAnimating?: boolean;
};

function getDecorations(variant: MusicNoteDecorationsProps["variant"]): NoteDecoration[] {
  if (variant === "search") {
    return SEARCH_PAGE_DECORATIONS;
  }
  if (variant === "game") {
    return GAME_PAGE_DECORATIONS;
  }
  return NAME_PAGE_DECORATIONS;
}

function getPendulums(variant: MusicNoteDecorationsProps["variant"]) {
  return variant === "search" ? SEARCH_PAGE_PENDULUMS : NAME_PAGE_PENDULUMS;
}

function pulseDelayForIndex(index: number, total: number): string {
  if (total <= 1) {
    return "0s";
  }

  // Negative delays place each note mid-cycle so the initial/frozen frame
  // lands in the darker half (neutral-400 → black).
  const phase = (index / total) * PULSE_PERIOD_SEC * 0.45;
  return `-${phase.toFixed(3)}s`;
}

export default function MusicNoteDecorations({
  variant = "landing",
  isAnimating = false,
}: MusicNoteDecorationsProps) {
  const reduceMotion = useReducedMotion();
  const decorations = getDecorations(variant);
  const isGame = variant === "game";
  const pendulums = isGame ? [] : getPendulums(variant);
  const p = usePendulumRotations(pendulums, reduceMotion || isGame);

  const rootClasses = [
    "music-note-decorations",
    isGame && "music-note-decorations--game",
    isGame && isAnimating && !reduceMotion && "music-note-decorations--animating",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClasses} aria-hidden="true">
      {decorations.map((decoration, index) => {
        const note = MUSIC_NOTES[decoration.noteId];

        if (!note) {
          return null;
        }

        const pathClassName = [
          "music-note-decoration-path",
          isGame && "music-note-decoration-path--pulse",
        ]
          .filter(Boolean)
          .join(" ");

        const path = (
          <path
            className={pathClassName}
            d={note.pathD}
            strokeWidth={note.strokeWidth}
            style={
              isGame
                ? {
                    ["--note-pulse-delay" as string]: pulseDelayForIndex(
                      index,
                      decorations.length,
                    ),
                  }
                : undefined
            }
          />
        );

        return (
          <div
            key={decoration.id}
            className="music-note-decoration"
            style={{
              top: decoration.top,
              right: decoration.right,
              bottom: decoration.bottom,
              left: decoration.left,
              width: `${decoration.width}px`,
              transform: `rotate(${decoration.rotation}deg)`,
            }}
          >
            <svg
              className="music-note-decoration-svg"
              viewBox={note.viewBox}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isGame ? path : <MotionG {...p(decoration.id)}>{path}</MotionG>}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
