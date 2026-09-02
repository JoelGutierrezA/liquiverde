export const SCORE_MIN = 0;
export const SCORE_MAX = 100;
export const SCORE_DECIMALS = 2;

export const SUSTAINABILITY_WEIGHTS = {
  economic: 0.4,
  environmental: 0.4,
  social: 0.2,
} as const;

export const ENVIRONMENTAL_WEIGHTS = {
  carbon: 0.6,
  localProduct: 0.2,
  recyclablePackaging: 0.2,
} as const;

export const SOCIAL_WEIGHTS = {
  base: 0.8,
  fairTrade: 0.2,
} as const;
