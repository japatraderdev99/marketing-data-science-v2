/** Convert period string ('7d' | '30d' | '90d') to ISO date range */
export function usePeriodDates(period: string) {
  const end = new Date();
  const start = new Date();

  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  start.setDate(end.getDate() - days);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    days,
  };
}
