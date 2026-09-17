// Public Apps Script endpoint used by both production and test-sheet modes.
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxarYvAp5e5W3gv0ZRkkZpVykrNokP_A54W6nyHD9cAvk8pbxZUdx94ke3TILpW-Zy4/exec";

// Mirrors LocalAdapter so the view and rules remain independent of storage.
export class GoogleSheetsAdapter {
  constructor(sheetName) {
    this.sheetName = sheetName;
  }

  async load() {
    const data = await this.#request("load");
    return {
      ...data,
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      weeklyAdjustments: normalizeWeeklyAdjustments(data.weeklyAdjustments),
    };
  }

  async saveSession(session) {
    return this.#request("saveSession", { session });
  }

  async deleteSession(id) {
    return this.#request("deleteSession", { id });
  }

  async setWeeklyAdjustment(weekKey, minutes) {
    return this.#request("setWeeklyAdjustment", { weekKey, minutes });
  }

  async #request(action, payload = {}) {
    if (!GOOGLE_APPS_SCRIPT_URL) {
      throw new Error("החיבור ל-Google Sheets עדיין לא הוגדר. לבדיקה השתמשו ב-data=fakelocal.");
    }

    let response;
    try {
      response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, sheet: this.sheetName, ...payload }),
      });
    } catch (error) {
      throw new Error("לא ניתן להתחבר ל-Google Sheets. ודאו שה-Web App פורסם עם גישה ל-Anyone.");
    }

    if (!response.ok) throw new Error("Google Sheets החזיר שגיאת תקשורת.");

    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error("Google Sheets החזיר תשובה לא תקינה. ייתכן שנדרשת פריסה מחדש של Apps Script.");
    }
    if (result.error) throw new Error(result.error);
    return result.data ?? result;
  }
}

// Sheets serializes date cells as locale-specific strings. Convert them to the
// same local-calendar key used by the app so saved allowances survive reloads.
export function normalizeWeeklyAdjustments(adjustments = {}) {
  return Object.fromEntries(Object.entries(adjustments ?? {}).map(([rawKey, minutes]) => [normalizeWeekKey(rawKey), minutes]));
}

function normalizeWeekKey(rawKey) {
  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(rawKey);
  if (isoMatch) return isoMatch[1];

  const dateMatch = /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{4})/.exec(rawKey);
  if (!dateMatch) return rawKey;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, monthName, day, year] = dateMatch;
  return `${year}-${String(months.indexOf(monthName) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
