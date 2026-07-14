import type { PendulumConfig } from "@/components/TypewriterIllustration/pendulum";

export type NoteDecoration = {
  id: string;
  noteId: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  rotation: number;
  width: number;
};

export const NAME_PAGE_DECORATIONS: NoteDecoration[] = [
  {
    id: "name-note-1",
    noteId: "music_2",
    top: "27%",
    right: "4%",
    rotation: 6,
    width: 22,
  },
  {
    id: "name-note-2",
    noteId: "music_4",
    top: "37.58%",
    left: "15.15%",
    rotation: 12,
    width: 24,
  },
  {
    id: "name-note-3",
    noteId: "music_3",
    top: "33.4%",
    right: "15.81%",
    rotation: -5,
    width: 24,
  },
  {
    id: "name-note-4",
    noteId: "music",
    top: "62.83%",
    left: "13.56%",
    rotation: -8,
    width: 28,
  },
  {
    id: "name-note-5",
    noteId: "music-2_2",
    top: "48.98%",
    right: "23.79%",
    rotation: 8,
    width: 32,
  },
  {
    id: "name-note-6",
    noteId: "music_5",
    top: "26.27%",
    left: "24.6%",
    rotation: -10,
    width: 18,
  },
  {
    id: "name-note-7",
    noteId: "music_6",
    top: "52.95%",
    left: "23.08%",
    rotation: 15,
    width: 20,
  },
  {
    id: "name-note-8",
    noteId: "music-2",
    top: "60.29%",
    right: "15.81%",
    rotation: -12,
    width: 38,
  },
];

export const NAME_PAGE_PENDULUMS: PendulumConfig[] = [
  { id: "name-note-1", origin: "center center", amplitude: 10, repeatDelay: 0.25, delay: 0 },
  { id: "name-note-2", origin: "center center", amplitude: 11, repeatDelay: 0.3, delay: 0.1 },
  { id: "name-note-3", origin: "center center", amplitude: 9, repeatDelay: 0.22, delay: 0.2 },
  { id: "name-note-4", origin: "center center", amplitude: 12, repeatDelay: 0.28, delay: 0.05 },
  { id: "name-note-5", origin: "center center", amplitude: 10, repeatDelay: 0.26, delay: 0.15 },
  { id: "name-note-6", origin: "center center", amplitude: 8, repeatDelay: 0.2, delay: 0.12 },
  { id: "name-note-7", origin: "center center", amplitude: 11, repeatDelay: 0.32, delay: 0.18 },
  { id: "name-note-8", origin: "center center", amplitude: 9, repeatDelay: 0.24, delay: 0.08 },
];
