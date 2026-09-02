import assert from "node:assert/strict";
import { GoogleSheetsAdapter } from "../js/adapters/google-sheets-adapter.js";

// Captures requests without contacting the deployed spreadsheet during unit tests.
const requests = [];
globalThis.fetch = async (url, options) => {
  requests.push({ url, options, body: JSON.parse(options.body) });

  return {
    ok: true,
    async json() {
      return { data: { sessions: [], weeklyAdjustments: {} } };
    },
  };
};

// Verifies that the shared adapter contract maps to the Apps Script action names.
const adapter = new GoogleSheetsAdapter("fakedata");
await adapter.load();
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

console.log("All Google Sheets adapter tests passed.");
