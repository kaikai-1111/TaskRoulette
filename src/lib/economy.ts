// All the tunable numbers for the credit economy live here so they're easy to
// rebalance without hunting through server actions.
export const ECONOMY = {
  STARTING_CREDITS: 100,
  CREDITS_PER_SUBMISSION: 1,
  // Flat per-challenge posting cost, independent of item count or target
  // responses per item — simple and predictable regardless of dataset size.
  CHALLENGE_POST_COST: 5,
  DEFAULT_TARGET_RESPONSES_PER_ITEM: 10,
  DEFAULT_TIME_LIMIT_SECONDS: 30,
  // A challenge's timeLimitSeconds is stored as 0 to mean "no limit" — a real
  // time limit is never zero, so it's an unambiguous sentinel with no schema
  // change needed. Bounds below apply only when a limit is actually set.
  NO_TIME_LIMIT: 0,
  MIN_TIME_LIMIT_SECONDS: 5,
  MAX_TIME_LIMIT_SECONDS: 3600,
  // Same trick for responses: a stored target of 0 means "keep collecting
  // until the creator takes it down". A real target is never zero.
  NO_RESPONSE_LIMIT: 0,
  MIN_TARGET_RESPONSES_PER_ITEM: 1,
  // Raised well past a typical "small dataset" cap on purpose — the flat
  // posting cost means a creator should be able to ask for mass responses
  // (tens of thousands) on a single item without hitting an arbitrary wall.
  MAX_TARGET_RESPONSES_PER_ITEM: 50_000,

  // Survey limits — bounded so one card stays answerable and stored answers stay small.
  MAX_SURVEY_QUESTIONS: 25,
  MAX_SURVEY_OPTIONS: 12,
  MAX_SURVEY_TEXT_ANSWER_CHARS: 2000,

  // "Rate it" bounds: min/max are whole numbers in 0..MAX_RATING_VALUE with max above min.
  MAX_RATING_VALUE: 100,
  MAX_RATING_COMMENT_CHARS: 500,
  MAX_RATING_LABEL_CHARS: 30,

  // Video/webcam recording (deferred in the original spec, now scoped in):
  // hard-capped short so hosting cost and privacy exposure stay bounded.
  MIN_VIDEO_SECONDS: 2,
  MAX_VIDEO_SECONDS: 6,
  DEFAULT_VIDEO_SECONDS: 4,
  MAX_VIDEO_UPLOAD_BYTES: 8 * 1024 * 1024,

  // Tokens: the second currency. Earned alongside credits for every answer
  // and from daily awards; spent on paid models and power-ups.
  TOKENS_PER_SUBMISSION: 1,
  // The daily claim alternates tokens / credits (see claimDailyAward) and
  // sometimes also drops a bonus power-up.
  DAILY_AWARD_TOKENS: 5,
  DAILY_AWARD_CREDITS: 10,
  DAILY_POWERUP_DROP_CHANCE: 0.2,

  // Hosted models. One constant to change when the cap should grow.
  MAX_MODEL_BYTES: 500 * 1024 * 1024,
  MAX_MODEL_PRICE_TOKENS: 100_000,
  MAX_MODEL_NAME_CHARS: 80,
  MAX_MODEL_DESCRIPTION_CHARS: 4000,

  // Creator-uploaded challenge item images (bounding box / point / labeling).
  MAX_IMAGE_UPLOAD_BYTES: 10 * 1024 * 1024,
} as const;

export function hasResponseLimit(targetResponsesPerItem: number): boolean {
  return targetResponsesPerItem !== ECONOMY.NO_RESPONSE_LIMIT;
}

// "12 / 50 responses" for a capped challenge, "12 responses · no limit" otherwise.
export function responseProgress(responses: number, itemCount: number, perItem: number): string {
  const noun = responses === 1 ? "response" : "responses";
  return hasResponseLimit(perItem)
    ? `${responses} / ${itemCount * perItem} ${noun}`
    : `${responses} ${noun} · no limit`;
}

export class InsufficientCreditsError extends Error {
  constructor(public needed: number, public have: number) {
    super(`Need ${needed} credits, have ${have}.`);
    this.name = "InsufficientCreditsError";
  }
}
