export const BASE_WEEKLY_LIMIT_MINUTES = 5 * 60;
export const DAILY_WEEKDAY_LIMIT_MINUTES = 60;
export const MAX_WEEKEND_BLOCK_MINUTES = 60;
export const MIN_WEEKEND_BREAK_MINUTES = 60;

// Returns the Sunday at 00:00 in the browser's local timezone.
export function getWeekStart(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

// Uses a local calendar key, avoiding UTC date shifts around midnight.
export function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function weekKey(date) {
  return localDateKey(getWeekStart(date));
}

export function durationMinutes(session) {
  return Math.max(0, (new Date(session.end) - new Date(session.start)) / 60000);
}

// Calculates all limits and attaches session-specific warnings without blocking storage.
export function evaluateWeek(allSessions, referenceDate, adjustmentMinutes = 0) {
  const start = getWeekStart(referenceDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const sessions = allSessions
    .filter((session) => new Date(session.start) >= start && new Date(session.start) < end)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const warningsBySession = new Map(sessions.map((session) => [session.id, []]));
  const violations = [];
  const byDay = new Map();

  for (const session of sessions) {
    const startTime = new Date(session.start);
    const minutes = durationMinutes(session);
    const key = localDateKey(startTime);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(session);

    if (minutes <= 0) {
      warningsBySession.get(session.id).push("שעת הסיום חייבת להיות אחרי שעת ההתחלה");
    }
    if ([5, 6].includes(startTime.getDay()) && minutes > MAX_WEEKEND_BLOCK_MINUTES) {
      const over = Math.ceil(minutes - MAX_WEEKEND_BLOCK_MINUTES);
      warningsBySession.get(session.id).push(`המשחק ארוך ב-${over} דקות מהמותר למקטע`);
      violations.push(`ב-${formatDayLabel(key)} מקטע משחק עבר את המותר ב-${over} דקות.`);
    }
  }

  for (const [key, daySessions] of byDay) {
    const day = new Date(`${key}T12:00:00`).getDay();
    const total = daySessions.reduce((sum, session) => sum + durationMinutes(session), 0);
    if (day <= 4 && total > DAILY_WEEKDAY_LIMIT_MINUTES) {
      const over = Math.ceil(total - DAILY_WEEKDAY_LIMIT_MINUTES);
      violations.push(`ב-${formatDayLabel(key)} הייתה חריגה יומית של ${over} דקות.`);
      daySessions.forEach((session) => warningsBySession.get(session.id).push("היום עבר את המכסה היומית"));
    }

  }

  // Checks consecutive entries globally so a Friday-to-Saturday break is not missed.
  for (let index = 1; index < sessions.length; index += 1) {
    const previous = sessions[index - 1];
    const current = sessions[index];
    const gap = (new Date(current.start) - new Date(previous.end)) / 60000;
    const currentDay = new Date(current.start).getDay();
    const previousDay = new Date(previous.start).getDay();
    if (gap < 0) {
      warningsBySession.get(current.id).push("הרשומה חופפת למשחק הקודם");
      violations.push(`יש חפיפה בין משחקים ב-${formatDayLabel(localDateKey(new Date(current.start)))}.`);
    } else if ([5, 6].includes(currentDay) && [5, 6].includes(previousDay) && gap < MIN_WEEKEND_BREAK_MINUTES) {
      const missing = Math.ceil(MIN_WEEKEND_BREAK_MINUTES - gap);
      warningsBySession.get(current.id).push(`חסרות ${missing} דקות הפסקה`);
      violations.push(`חסרות ${missing} דקות הפסקה בין שני מקטעי סוף שבוע.`);
    }
  }

  const usedMinutes = sessions.reduce((sum, session) => sum + durationMinutes(session), 0);
  const limitMinutes = Math.max(0, BASE_WEEKLY_LIMIT_MINUTES + adjustmentMinutes);
  const overWeekly = Math.max(0, usedMinutes - limitMinutes);
  if (overWeekly > 0) violations.unshift(`המכסה השבועית עברה ב-${Math.ceil(overWeekly)} דקות.`);

  const todayKey = localDateKey(referenceDate);
  const todayMinutes = (byDay.get(todayKey) ?? []).reduce((sum, session) => sum + durationMinutes(session), 0);
  return { sessions, usedMinutes, limitMinutes, remainingMinutes: limitMinutes - usedMinutes, todayMinutes, warningsBySession, violations };
}

// Produces a compact Hebrew day label for status messages.
function formatDayLabel(key) {
  return new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "numeric" }).format(new Date(`${key}T12:00:00`));
}
