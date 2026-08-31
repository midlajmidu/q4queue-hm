/**
 * Reusable sound utility for queue alerts.
 * Uses the project ringtone. Silently swallows autoplay-block errors.
 */

const SOUND_FILE = "/sounds/warm-marimba.wav";

export function playQueueSound(): void {
    if (typeof window === "undefined") return;
    const audio = new Audio(SOUND_FILE);
    audio.volume = 1.0;
    audio.play().catch(() => { /* browser may block autoplay */ });
}
