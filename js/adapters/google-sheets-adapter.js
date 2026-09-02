// Public Apps Script endpoint used by both production and test-sheet modes.
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxarYvAp5e5W3gv0ZRkkZpVykrNokP_A54W6nyHD9cAvk8pbxZUdx94ke3TILpW-Zy4/exec";

// Mirrors LocalAdapter so the view and rules remain independent of storage.
export class GoogleSheetsAdapter {
  constructor(sheetName) {
    this.sheetName = sheetName;
  }

  async load() {
    return this.#request("load");
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
