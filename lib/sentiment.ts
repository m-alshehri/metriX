export const sentiments = [
  "very_positive",
  "positive",
  "neutral",
  "negative",
  "very_negative",
] as const;
export type Sentiment = (typeof sentiments)[number];
