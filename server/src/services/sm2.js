// SM-2 Spaced Repetition Algorithm
// Rating scale: 0=Again, 1=Hard, 2=Good, 3=Easy (mapped from user input)

const RATING = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

/**
 * Calculate next review schedule using SM-2.
 * @param {object} progress - Current card progress state
 * @param {number} rating - 0=Again, 1=Hard, 2=Good, 3=Easy
 * @returns {object} Updated progress fields
 */
function calculateNextReview(progress, rating) {
  let { ease_factor, interval_days, repetitions } = progress;

  // SM-2 uses quality score 0-5; map our 4-level scale
  // Again=0, Hard=2, Good=3, Easy=5
  const qualityMap = { 0: 0, 1: 2, 2: 3, 3: 5 };
  const q = qualityMap[rating];

  if (q < 3) {
    // Failed recall — reset
    repetitions = 0;
    interval_days = 1;
  } else {
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
    repetitions += 1;
  }

  // Update ease factor (min 1.3)
  ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval_days);

  return {
    ease_factor: Math.round(ease_factor * 1000) / 1000,
    interval_days,
    repetitions,
    next_review_date: nextReviewDate.toISOString().split('T')[0],
    last_rating: rating,
    last_reviewed_at: new Date().toISOString(),
  };
}

/**
 * Returns whether a card is due for review today.
 */
function isDue(progress) {
  const today = new Date().toISOString().split('T')[0];
  return progress.next_review_date <= today;
}

/**
 * Returns a new progress object for a brand-new card.
 */
function newProgress(cardId) {
  return {
    card_id: cardId,
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    next_review_date: new Date().toISOString().split('T')[0],
    last_rating: null,
    last_reviewed_at: null,
  };
}

module.exports = { calculateNextReview, isDue, newProgress, RATING };
