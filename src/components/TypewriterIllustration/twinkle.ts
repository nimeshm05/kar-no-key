export const KEY_FILL = "rgb(255, 255, 255)";
export const TWINKLE_FILL = "rgb(115, 184, 166)";

export const KEY_CIRCLE_IDS = [
  "Vector_11",
  "Vector_13",
  "Vector_15",
  "Vector_17",
  "Vector_19",
  "Vector_21",
  "Vector_23",
  "Vector_25",
  "Vector_27",
  "Vector_29",
  "Vector_31",
  "Vector_33",
  "Vector_35",
  "Vector_37",
  "Vector_39",
] as const;

export type KeyCircleId = (typeof KEY_CIRCLE_IDS)[number];

export const TWINKLE_WAIT_MS = {
  min: 1500,
  max: 4000,
} as const;

export const TWINKLE_FLASH_MS = {
  min: 80,
  max: 200,
} as const;

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function randomWaitMs() {
  return randomBetween(TWINKLE_WAIT_MS.min, TWINKLE_WAIT_MS.max);
}

export function randomFlashMs() {
  return randomBetween(TWINKLE_FLASH_MS.min, TWINKLE_FLASH_MS.max);
}
