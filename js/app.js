import { LocalAdapter } from "./adapters/local-adapter.js";
import { GoogleSheetsAdapter } from "./adapters/google-sheets-adapter.js";
import { evaluateWeek, getWeekStart, localDateKey, weekKey } from "./rules.js";

const MAX_ENTRY_MINUTES = 5 * 60;
const params = new URLSearchParams(window.location.search);
const isParent = params.get("mode") === "parent";
const dataMode = params.get("data");
const isFakeSheetMode = ["fakesheet", "fakedata"].includes(dataMode);
const adapter = dataMode === "fakelocal"
  ? new LocalAdapter()
  : new GoogleSheetsAdapter(isFakeSheetMode ? "fakedata" : "production");
const state = { data: null, referenceDate: new Date(), pendingDeleteId: null };

const elements = Object.fromEntries([
  "loading", "error-panel", "app-content", "week-range", "mode-badge", "remaining-time",
  "weekly-status-title", "used-time", "limit-detail", "progress-ring", "today-status",
  "today-detail", "violations-panel", "violations-list", "parent-panel", "session-form",
  "session-id", "start-time", "end-time", "session-note", "form-title", "cancel-edit",
  "form-message", "session-submit", "adjustment-form", "adjustment-minutes", "adjustment-submit", "history-list", "session-count",
  "delete-dialog", "confirm-delete", "previous-week", "current-week", "next-week", "period-label",
].map((id) => [id, document.getElementById(id)]));

// Boots the app only after its selected adapter has returned the shared data shape.
async function init() {
  const dataLabel = dataMode === "fakelocal"
    ? "דמו מקומי"
    : isFakeSheetMode ? "גיליון בדיקה" : "נתונים אמיתיים";
  elements["mode-badge"].textContent = `${isParent ? "מצב הורה ✏️" : "תצוגת ילד 👀"} · ${dataLabel}`;
  elements["parent-panel"].classList.toggle("hidden", !isParent);
  setDefaultTimes();
  bindEvents();
  try {
    state.data = await adapter.load();
    render();
    elements.loading.classList.add("hidden");
    elements["app-content"].classList.remove("hidden");
  } catch (error) {
    showFatalError(error.message);
  }
}

// Recomputes the selected week so every view derives from one rules result.
function render() {
  const key = weekKey(state.referenceDate);
  const adjustment = Number(state.data.weeklyAdjustments[key] ?? 0);
  const result = evaluateWeek(state.data.sessions, state.referenceDate, adjustment);
  renderHeader(result, adjustment);
  renderViolations(result.violations);
  renderHistory(result);
}

function renderHeader(result, adjustment) {
  const weekStart = getWeekStart(state.referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const isCurrentWeek = weekKey(state.referenceDate) === weekKey(new Date());
  elements["week-range"].textContent = `${formatDate(weekStart)} עד ${formatDate(weekEnd)}`;
  elements["next-week"].disabled = isCurrentWeek;
  elements["current-week"].classList.toggle("hidden", isCurrentWeek);
  elements["remaining-time"].textContent = formatMinutes(Math.max(0, result.remainingMinutes));
  elements["weekly-status-title"].textContent = result.remainingMinutes >= 0 ? "הכול במסלול!" : `חריגה של ${formatMinutes(-result.remainingMinutes)}`;
  elements["used-time"].textContent = `${formatMinutes(result.usedMinutes)} נוצלו מתוך ${formatMinutes(result.limitMinutes)}`;
  elements["limit-detail"].textContent = adjustment === 0
    ? "המכסה הרגילה: 5 שעות"
    : `המכסה שונתה השבוע ב-${formatSignedMinutes(adjustment)}`;
  const progress = result.limitMinutes === 0 ? 1 : Math.min(1, result.usedMinutes / result.limitMinutes);
  elements["progress-ring"].style.setProperty("--progress", `${progress * 360}deg`);

  const today = new Date().getDay();
  elements["period-label"].textContent = isCurrentWeek ? "היום" : "השבוע שנבחר";
  elements["today-status"].textContent = isCurrentWeek
    ? `${formatMinutes(result.todayMinutes)} משחק היום`
    : `${formatMinutes(result.usedMinutes)} משחק בסך הכול`;
  if (!isCurrentWeek) {
    elements["today-detail"].textContent = `${result.sessions.length} מקטעי משחק נרשמו בשבוע הזה`;
  } else if (today <= 4) {
    const remaining = 60 - result.todayMinutes;
    elements["today-detail"].textContent = remaining >= 0
      ? `נשארו היום ${formatMinutes(remaining)}`
      : `חריגה יומית של ${formatMinutes(-remaining)}`;
  } else {
    elements["today-detail"].textContent = "בסוף השבוע: עד שעה בכל מקטע ושעה הפסקה";
  }
}

function renderViolations(violations) {
  elements["violations-panel"].classList.toggle("hidden", violations.length === 0);
  elements["violations-list"].replaceChildren(...violations.map((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
}

function renderHistory(result) {
  const newestFirst = [...result.sessions].sort((a, b) => new Date(b.start) - new Date(a.start));
  elements["session-count"].textContent = `${newestFirst.length} משחקים`;
  if (newestFirst.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "עדיין לא נרשם זמן משחק השבוע 🎲";
    elements["history-list"].replaceChildren(empty);
    return;
  }

  elements["history-list"].replaceChildren(...newestFirst.map((session) => createHistoryItem(session, result.warningsBySession.get(session.id) ?? [])));
}

function createHistoryItem(session, warnings) {
  const item = document.createElement("article");
  item.className = `history-item${warnings.length ? " has-warning" : ""}`;
  const start = new Date(session.start);
  const end = new Date(session.end);
  const info = document.createElement("div");
  const date = document.createElement("div");
  date.className = "history-date";
  date.textContent = new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(start);
  const time = document.createElement("div");
  time.className = "history-time";
  time.textContent = `${formatClock(start)}–${formatClock(end)}`;
  info.append(date, time);
  if (session.note) {
    const note = document.createElement("p");
    note.className = "history-note";
    note.textContent = session.note;
    info.append(note);
  }
  if (warnings.length) {
    const warning = document.createElement("p");
    warning.className = "history-warning";
    warning.textContent = `⚠ ${warnings.join(" · ")}`;
    info.append(warning);
  }

  const duration = document.createElement("div");
  duration.className = "history-duration";
  duration.textContent = formatMinutes((end - start) / 60000);
  item.append(info, duration);
  if (isParent) item.append(createActions(session));
  return item;
}

function createActions(session) {
  const actions = document.createElement("div");
  actions.className = "item-actions";
  const edit = makeButton("עריכה", "icon-button", () => beginEdit(session));
  const remove = makeButton("מחיקה", "icon-button delete", () => {
    state.pendingDeleteId = session.id;
    elements["delete-dialog"].showModal();
  });
  actions.append(edit, remove);
  return actions;
}

function makeButton(label, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

// Shows the entry immediately, then rolls it back if remote persistence fails.
async function handleSessionSubmit(event) {
  event.preventDefault();
  const start = new Date(elements["start-time"].value);
  const end = new Date(elements["end-time"].value);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    showFormMessage("שעת הסיום חייבת להיות אחרי שעת ההתחלה.", true);
    return;
  }

  if ((end - start) / 60000 > MAX_ENTRY_MINUTES) {
    showFormMessage("לא ניתן לשמור משחק ארוך מ-5 שעות. כנראה נפלה טעות בשעות.", true);
    return;
  }

  const session = {
    id: elements["session-id"].value || crypto.randomUUID(),
    start: start.toISOString(),
    end: end.toISOString(),
    note: elements["session-note"].value.trim(),
  };

  const previousSessions = state.data.sessions.map((item) => ({ ...item }));
  const existingIndex = state.data.sessions.findIndex((item) => item.id === session.id);
  if (existingIndex >= 0) state.data.sessions[existingIndex] = session;
  else state.data.sessions.push(session);

  setSessionSaving(true);
  showFormMessage("שומר בגיליון…");
  render();

  try {
    await adapter.saveSession(session);
    resetForm();
    showFormMessage("זמן המשחק נשמר. חריגות, אם יש, מוצגות למעלה.");
  } catch (error) {
    state.data.sessions = previousSessions;
    render();
    showFormMessage(`השמירה נכשלה: ${error.message}`, true);
  } finally {
    setSessionSaving(false);
  }
}

// Prevents duplicate submissions and makes the remote save state unmistakable.
function setSessionSaving(isSaving) {
  elements["session-submit"].disabled = isSaving;
  elements["session-submit"].setAttribute("aria-busy", String(isSaving));
  elements["session-submit"].textContent = isSaving ? "שומר…" : "שמירה";
}

async function handleAdjustmentSubmit(event) {
  event.preventDefault();
  const deltaMinutes = Number(elements["adjustment-minutes"].value);
  if (!Number.isFinite(deltaMinutes) || deltaMinutes === 0) {
    showFormMessage("יש להזין מספר דקות חיובי או שלילי.", true);
    return;
  }

  const key = weekKey(state.referenceDate);
  const previousAdjustment = Number(state.data.weeklyAdjustments[key] ?? 0);
  const updatedAdjustment = previousAdjustment + deltaMinutes;
  if (updatedAdjustment < -300 || updatedAdjustment > 600) {
    showFormMessage("השינוי המצטבר חייב להיות בין ‎-300 ל-600 דקות.", true);
    return;
  }

  state.data.weeklyAdjustments[key] = updatedAdjustment;
  setAdjustmentSaving(true);
  showFormMessage("מעדכן את המכסה…");
  render();

  try {
    await adapter.setWeeklyAdjustment(key, updatedAdjustment);
    elements["adjustment-minutes"].value = 0;
    showFormMessage(`המכסה עודכנה. השינוי המצטבר הוא ${formatSignedMinutes(updatedAdjustment)}.`);
  } catch (error) {
    state.data.weeklyAdjustments[key] = previousAdjustment;
    render();
    showFormMessage(`עדכון המכסה נכשל: ${error.message}`, true);
  } finally {
    setAdjustmentSaving(false);
  }
}

// Keeps repeated allowance changes unambiguous while the sheet update is pending.
function setAdjustmentSaving(isSaving) {
  elements["adjustment-submit"].disabled = isSaving;
  elements["adjustment-submit"].setAttribute("aria-busy", String(isSaving));
  elements["adjustment-submit"].textContent = isSaving ? "מעדכן…" : "עדכון מכסה";
}

function beginEdit(session) {
  elements["session-id"].value = session.id;
  elements["start-time"].value = toDateTimeLocal(new Date(session.start));
  elements["end-time"].value = toDateTimeLocal(new Date(session.end));
  elements["session-note"].value = session.note ?? "";
  elements["form-title"].textContent = "עריכת זמן משחק";
  elements["cancel-edit"].classList.remove("hidden");
  elements["parent-panel"].scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  elements["session-form"].reset();
  elements["session-id"].value = "";
  elements["form-title"].textContent = "הוספת זמן משחק";
  elements["cancel-edit"].classList.add("hidden");
  setDefaultTimes();
}

function setDefaultTimes() {
  const end = new Date(state.referenceDate);
  end.setSeconds(0, 0);
  const start = new Date(end.getTime() - 60 * 60000);
  elements["start-time"].value = toDateTimeLocal(start);
  elements["end-time"].value = toDateTimeLocal(end);
}

function bindEvents() {
  elements["previous-week"].addEventListener("click", () => changeWeek(-1));
  elements["next-week"].addEventListener("click", () => changeWeek(1));
  elements["current-week"].addEventListener("click", selectCurrentWeek);
  if (isParent) {
    elements["session-form"].addEventListener("submit", handleSessionSubmit);
    elements["adjustment-form"].addEventListener("submit", handleAdjustmentSubmit);
    elements["cancel-edit"].addEventListener("click", resetForm);
    elements["confirm-delete"].addEventListener("click", async () => {
      if (!state.pendingDeleteId) return;

      const deletedId = state.pendingDeleteId;
      const previousSessions = state.data.sessions.map((item) => ({ ...item }));
      state.pendingDeleteId = null;
      state.data.sessions = state.data.sessions.filter((item) => item.id !== deletedId);
      render();

      try {
        await adapter.deleteSession(deletedId);
        showFormMessage("הרשומה נמחקה.");
      } catch (error) {
        state.data.sessions = previousSessions;
        render();
        showFormMessage(`המחיקה נכשלה: ${error.message}`, true);
      }
    });
  }
}

// Moves through Sunday-based weeks without allowing navigation beyond the current week.
function changeWeek(offset) {
  const candidate = new Date(state.referenceDate);
  candidate.setDate(candidate.getDate() + offset * 7);
  if (weekKey(candidate) > weekKey(new Date())) return;
  state.referenceDate = candidate;
  elements["adjustment-minutes"].value = 0;
  if (isParent) resetForm();
  render();
}

function selectCurrentWeek() {
  state.referenceDate = new Date();
  elements["adjustment-minutes"].value = 0;
  if (isParent) resetForm();
  render();
}

function showFormMessage(text, isError = false) {
  elements["form-message"].textContent = text;
  elements["form-message"].classList.toggle("is-error", isError);
}

function showFatalError(message) {
  elements.loading.classList.add("hidden");
  elements["error-panel"].classList.remove("hidden");
  elements["error-panel"].textContent = message;
}

function formatMinutes(rawMinutes) {
  const minutes = Math.max(0, Math.round(rawMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours} ש׳ ו-${rest} דק׳`;
  if (hours) return `${hours} שעות`;
  return `${rest} דקות`;
}

function formatSignedMinutes(minutes) {
  return `${minutes > 0 ? "+" : ""}${minutes} דקות`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" }).format(date);
}

function formatClock(date) {
  return new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

function toDateTimeLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

init();

// Exported for lightweight browser/Node-independent checks of local date formatting.
export { formatMinutes, toDateTimeLocal, localDateKey };
