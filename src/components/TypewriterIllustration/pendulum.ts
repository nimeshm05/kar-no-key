export type PendulumConfig = {
  id: string;
  origin: string;
  amplitude?: number;
  repeatDelay?: number;
  delay?: number;
};

export function createConfigById(configs: PendulumConfig[]) {
  return Object.fromEntries(configs.map((config) => [config.id, config])) as Record<
    string,
    PendulumConfig
  >;
}

export function getInitialRestingAngle(config: PendulumConfig) {
  return -(config.amplitude ?? 10);
}

export function getOppositeRestingAngle(config: PendulumConfig, current: number) {
  const amplitude = config.amplitude ?? 10;
  return current > 0 ? -amplitude : amplitude;
}

export const MUSIC_NOTE_PENDULUMS: PendulumConfig[] = [
  { id: "music", origin: "14px 171px", amplitude: 10, repeatDelay: 0.25, delay: 0 },
  { id: "music_2", origin: "436px 36px", amplitude: 11, repeatDelay: 0.3, delay: 0.1 },
  { id: "music_3", origin: "489px 99px", amplitude: 9, repeatDelay: 0.22, delay: 0.2 },
  { id: "music-2", origin: "486px 322px", amplitude: 12, repeatDelay: 0.28, delay: 0.05 },
  { id: "music_4", origin: "52px 306px", amplitude: 10, repeatDelay: 0.26, delay: 0.15 },
  { id: "music_5", origin: "74px 25px", amplitude: 8, repeatDelay: 0.2, delay: 0.12 },
  { id: "music-2_2", origin: "503px 211px", amplitude: 11, repeatDelay: 0.32, delay: 0.18 },
  { id: "music_6", origin: "195px 394px", amplitude: 9, repeatDelay: 0.24, delay: 0.08 },
];
