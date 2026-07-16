"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePendulumRotations } from "@/components/TypewriterIllustration/usePendulumRotations";
import {
  NAME_PAGE_DECORATIONS,
  NAME_PAGE_PENDULUMS,
  SEARCH_PAGE_DECORATIONS,
  SEARCH_PAGE_PENDULUMS,
  type NoteDecoration,
} from "./decorations";
import { MUSIC_NOTES } from "./musicNotes";
import "./MusicNoteDecorations.css";

const MotionG = motion.g;

type MusicNoteDecorationsProps = {
  variant?: "landing" | "search";
};

function getDecorations(variant: MusicNoteDecorationsProps["variant"]): NoteDecoration[] {
  return variant === "search" ? SEARCH_PAGE_DECORATIONS : NAME_PAGE_DECORATIONS;
}

function getPendulums(variant: MusicNoteDecorationsProps["variant"]) {
  return variant === "search" ? SEARCH_PAGE_PENDULUMS : NAME_PAGE_PENDULUMS;
}

export default function MusicNoteDecorations({
  variant = "landing",
}: MusicNoteDecorationsProps) {
  const reduceMotion = useReducedMotion();
  const decorations = getDecorations(variant);
  const pendulums = getPendulums(variant);
  const p = usePendulumRotations(pendulums, reduceMotion);

  return (
    <div className="music-note-decorations" aria-hidden="true">
      {decorations.map((decoration) => {
        const note = MUSIC_NOTES[decoration.noteId];

        if (!note) {
          return null;
        }

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
              <MotionG {...p(decoration.id)}>
                <path
                  className="music-note-decoration-path"
                  d={note.pathD}
                  strokeWidth={note.strokeWidth}
                />
              </MotionG>
            </svg>
          </div>
        );
      })}
    </div>
  );
}
