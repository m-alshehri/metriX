export type DailyMetric = {
  metric_date: string;
  mentions: number;
  engagement: number;
  views: number;
  negative: number;
};
export function comparePeriods(
  rows: DailyMetric[],
  days: number,
  now = new Date(),
) {
  const end = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const currentStart = end - days * 86400000,
    previousStart = currentStart - days * 86400000;
  const empty = () => ({ mentions: 0, engagement: 0, views: 0, negative: 0 });
  const current = empty(),
    previous = empty();
  for (const row of rows) {
    const timestamp = Date.parse(`${row.metric_date}T00:00:00Z`);
    const target =
      timestamp >= currentStart && timestamp < end
        ? current
        : timestamp >= previousStart && timestamp < currentStart
          ? previous
          : null;
    if (target)
      for (const key of Object.keys(target) as (keyof typeof target)[])
        target[key] += Number(row[key] || 0);
  }
  return { current, previous };
}
export function percentChange(current: number, previous: number) {
  return previous ? ((current - previous) / previous) * 100 : null;
}
