// All the tunable numbers for the credit economy live here so they're easy to
// rebalance without hunting through server actions.
export const ECONOMY = {
  STARTING_CREDITS: 20,
  CREDITS_PER_SUBMISSION: 1,
  // Flat per-challenge posting cost, independent of item count or target
  // responses per item — simple and predictable regardless of dataset size.
  CHALLENGE_POST_COST: 5,
  DEFAULT_TARGET_RESPONSES_PER_ITEM: 10,
  DEFAULT_TIME_LIMIT_SECONDS: 30,
  MIN_TARGET_RESPONSES_PER_ITEM: 1,
  // Raised well past a typical "small dataset" cap on purpose — the flat
  // posting cost means a creator should be able to ask for mass responses
  // (tens of thousands) on a single item without hitting an arbitrary wall.
  MAX_TARGET_RESPONSES_PER_ITEM: 50_000,

  // Video/webcam recording (deferred in the original spec, now scoped in):
  // hard-capped short so hosting cost and privacy exposure stay bounded.
  MIN_VIDEO_SECONDS: 2,
  MAX_VIDEO_SECONDS: 6,
  DEFAULT_VIDEO_SECONDS: 4,
  MAX_VIDEO_UPLOAD_BYTES: 8 * 1024 * 1024,
} as const;

export class InsufficientCreditsError extends Error {
  constructor(public needed: number, public have: number) {
    super(`Need ${needed} credits, have ${have}.`);
    this.name = "InsufficientCreditsError";
  }
}
