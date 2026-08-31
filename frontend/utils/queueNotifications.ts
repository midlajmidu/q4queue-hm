/**
 * utils/queueNotifications.ts
 *
 * Sound utility for the Customer Token Page.
 * Fires audio alerts when the user's turn is approaching or called.
 */

const STORAGE_KEY = "queue_sounds_enabled";
const SOUND_FILE = "/sounds/warm-marimba.wav";

// ── User preference storage ─────────────────────────────────────────────────

export function getSoundsEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setSoundsEnabled(enabled: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}

// ── Sound ───────────────────────────────────────────────────────────────────

export function playNotificationSound(): void {
    if (typeof window === "undefined") return;
    const audio = new Audio(SOUND_FILE);
    audio.volume = 1.0;
    audio.play().catch(() => { /* silently ignore autoplay block */ });
}

// ── Milestone trigger state ─────────────────────────────────────────────────

export type MilestoneState = {
    five: boolean;
    two: boolean;
    turn: boolean;
};

export function freshMilestoneState(): MilestoneState {
    return { five: false, two: false, turn: false };
}

/**
 * Check snapshot data and play sound if a milestone is crossed.
 * Mutates `triggered` in-place.
 */
export function checkAndNotifyMilestone(
    myTokenNumber: number,
    currentServing: number,
    triggered: MilestoneState
): void {
    if (!getSoundsEnabled()) return;

    const remaining = myTokenNumber - currentServing;

    if (remaining <= 0 && !triggered.turn) {
        triggered.turn = true;
        playNotificationSound();
    } else if (remaining <= 2 && remaining > 0 && !triggered.two) {
        triggered.two = true;
        playNotificationSound();
    } else if (remaining <= 5 && remaining > 2 && !triggered.five) {
        triggered.five = true;
        playNotificationSound();
    }
}
