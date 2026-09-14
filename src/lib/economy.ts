// All the tunable numbers for the credit economy live here so they're easy to
// rebalance without hunting through server actions.
export const ECONOMY = {
  STARTING_CREDITS: 20,
  CREDITS_PER_SUBMISSION: 1,
  CREDIT_COST_PER_RESPONSE: 1,
  DEFAULT_TARGET_RESPONSES_PER_ITEM: 10,
  DEFAULT_TIME_LIMIT_SECONDS: 30,
  MIN_TARGET_RESPONSES_PER_ITEM: 1,
  MAX_TARGET_RESPONSES_PER_ITEM: 500,

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
