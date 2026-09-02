// Creates useful sample entries in the current local week so the demo never becomes stale.
export function createFakeData(now = new Date()) {
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const at = (dayOffset, hour, minute = 0) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };

  // Only past sample sessions are included to keep "today" understandable.
  const sessions = [];
  const yesterdayOffset = Math.max(0, Math.min(6, now.getDay() - 1));
  if (now.getDay() > 0) {
    sessions.push({ id: "demo-1", start: at(yesterdayOffset, 16), end: at(yesterdayOffset, 16, 45), note: "מרוץ עם חברים" });
  }
  if (now.getDay() >= 2) {
    sessions.push({ id: "demo-2", start: at(1, 18, 10), end: at(1, 18, 50), note: "שלב חדש" });
  }

  // Previous-week entries make week navigation immediately testable.
  sessions.push(
    { id: "demo-old-1", start: at(-6, 17), end: at(-6, 17, 50), note: "משחק בנייה" },
    { id: "demo-old-2", start: at(-2, 10), end: at(-2, 10, 55), note: "משחק עם בן דוד" },
    { id: "demo-old-3", start: at(-1, 14), end: at(-1, 14, 45), note: "טורניר" },
  );

  return { sessions, weeklyAdjustments: {} };
}
