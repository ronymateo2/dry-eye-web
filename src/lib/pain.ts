export function painColor(score: number): string {
  if (score >= 7) return "var(--pain-high)";
  if (score >= 4) return "var(--pain-mid)";
  return "var(--pain-low)";
}

export function painGradient(score: number): string {
  const pct = score * 10;
  const bg = "#252014";
  if (score === 0) return bg;
  if (score <= 3) return `linear-gradient(to right, #5cb85a ${pct}%, ${bg} ${pct}%)`;
  if (score <= 6) return `linear-gradient(to right, #5cb85a 0%, #e0932a ${pct}%, ${bg} ${pct}%)`;
  return `linear-gradient(to right, #5cb85a 0%, #e0932a 40%, #cc3f30 ${pct}%, ${bg} ${pct}%)`;
}

export function qualityColor(score: number): string {
  if (score >= 7) return "var(--pain-low)";
  if (score >= 4) return "var(--pain-mid)";
  return "var(--pain-high)";
}

export function qualityGradient(score: number): string {
  const pct = score * 10;
  const bg = "#252014";
  if (score === 0) return bg;
  if (score <= 3) return `linear-gradient(to right, #cc3f30 ${pct}%, ${bg} ${pct}%)`;
  if (score <= 6) return `linear-gradient(to right, #cc3f30 0%, #e0932a ${pct}%, ${bg} ${pct}%)`;
  return `linear-gradient(to right, #cc3f30 0%, #e0932a 40%, #5cb85a ${pct}%, ${bg} ${pct}%)`;
}
