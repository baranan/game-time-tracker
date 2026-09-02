import assert from "node:assert/strict";
import { LocalAdapter } from "../js/adapters/local-adapter.js";
import { weekKey } from "../js/rules.js";

// Emulates the small localStorage surface used by the offline adapter.
class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

// Exercises the same CRUD interface that the future Google adapter implements.
const adapter = new LocalAdapter(new MemoryStorage());
const initial = await adapter.load();
assert.ok(Array.isArray(initial.sessions));
assert.ok(new Set(initial.sessions.map((item) => weekKey(new Date(item.start)))).size >= 2);

const added = { id: "test", start: "2026-09-01T10:00:00.000Z", end: "2026-09-01T10:30:00.000Z", note: "test" };
await adapter.saveSession(added);
assert.equal((await adapter.load()).sessions.find((item) => item.id === "test").note, "test");

const edited = { ...added, note: "edited" };
await adapter.saveSession(edited);
assert.equal((await adapter.load()).sessions.find((item) => item.id === "test").note, "edited");

await adapter.setWeeklyAdjustment("2026-08-30", 45);
assert.equal((await adapter.load()).weeklyAdjustments["2026-08-30"], 45);

await adapter.deleteSession("test");
assert.equal((await adapter.load()).sessions.some((item) => item.id === "test"), false);

console.log("All local adapter tests passed.");
