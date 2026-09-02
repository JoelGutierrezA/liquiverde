export const OPTIMIZATION_SCORE_MIN = 0;
export const OPTIMIZATION_SCORE_MAX = 100;
export const OPTIMIZATION_DECIMALS = 2;
export const WEIGHT_SUM_TOLERANCE = 0.000001;
export const COMPARISON_TOLERANCE = 0.000001;

export const OPTIMIZATION_PRESETS = {
  savings: {
    economic: 0.8,
    sustainability: 0.2,
  },
  balanced: {
    economic: 0.5,
    sustainability: 0.5,
  },
  sustainable: {
    economic: 0.3,
    sustainability: 0.7,
  },
} as const;
