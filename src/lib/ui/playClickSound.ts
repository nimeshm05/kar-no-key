const CLICK_SOUND_SRC =
  "/click-effects/universfield-interface-click-124476.mp3";
const POOL_SIZE = 4;

let pool: HTMLAudioElement[] | null = null;
let poolIndex = 0;

function getPool(): HTMLAudioElement[] | null {
  if (typeof Audio === "undefined") {
    return null;
  }

  if (!pool) {
    pool = Array.from({ length: POOL_SIZE }, () => {
      const audio = new Audio(CLICK_SOUND_SRC);
      audio.preload = "auto";
      return audio;
    });
  }

  return pool;
}

export function playClickSound(): void {
  const audioPool = getPool();
  if (!audioPool) {
    return;
  }

  const audio = audioPool[poolIndex];
  poolIndex = (poolIndex + 1) % audioPool.length;

  try {
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore autoplay / decode failures.
    });
  } catch {
    // Ignore Audio API errors.
  }
}
