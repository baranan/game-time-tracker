import assert from "node:assert/strict";
import { GoogleSheetsAdapter, normalizeWeeklyAdjustments } from "../js/adapters/google-sheets-adapter.js";

// Captures requests without contacting the deployed spreadsheet during unit tests.
const requests = [];
globalThis.fetch = async (url, options) => {
  requests.push({ url, options, body: JSON.parse(options.body) });

  return {
    ok: true,
    async json() {
      return {
        data: {
          sessions: [],
          weeklyAdjustments: {
            "Sun Aug 30 2026 00:00:00 GMT+0300 (Israel Daylight Time)": 30,
          },
        },
      };
    },
  };
};

// Verifies that the shared adapter contract maps to the Apps Script action names.
const adapter = new GoogleSheetsAdapter("fakedata");
const loaded = await adapter.load();
assert.equal(loaded.weeklyAdjustments["2026-08-30"], 30);
await adapter.saveSession({ id: "test", start: "2026-09-02T10:00:00.000Z", end: "2026-09-02T10:30:00.000Z", note: "" });
await adapter.deleteSession("test");
await adapter.setWeeklyAdjustment("2026-08-30", 30);

assert.deepEqual(requests.map((request) => request.body.action), [
  "load",
  "saveSession",
  "deleteSession",
  "setWeeklyAdjustment",
]);
assert.ok(requests.every((request) => request.body.sheet === "fakedata"));
assert.ok(requests.every((request) => request.options.headers["Content-Type"] === "text/plain;charset=utf-8"));
assert.ok(requests.every((request) => request.url.endsWith("/exec")));

assert.deepEqual(normalizeWeeklyAdjustments({
  "2026-09-06T00:00:00.000Z": 15,
  "Sun Aug 30 2026 00:00:00 GMT+0300 (שעון ישראל (קיץ))": 30,
}), {
  "2026-09-06": 15,
  "2026-08-30": 30,
});

console.log("All Google Sheets adapter tests passed.");
