import assert from "node:assert/strict";
import { formatClock, parseLocalDateTime, toDateInput, toTimeInput } from "../js/date-time.js";

const afternoon = new Date(2026, 8, 17, 13, 5);
assert.equal(formatClock(afternoon), "13:05");
assert.equal(toDateInput(afternoon), "2026-09-17");
assert.equal(toTimeInput(afternoon), "13:05");

const parsed = parseLocalDateTime("2026-09-17", "23:45");
assert.ok(parsed);
assert.equal(parsed.getFullYear(), 2026);
assert.equal(parsed.getMonth(), 8);
assert.equal(parsed.getDate(), 17);
assert.equal(parsed.getHours(), 23);
assert.equal(parsed.getMinutes(), 45);

assert.equal(parseLocalDateTime("2026-09-17", "1:05"), null);
assert.equal(parseLocalDateTime("2026-09-17", "24:00"), null);
assert.equal(parseLocalDateTime("2026-02-30", "13:00"), null);

console.log("All date/time tests passed.");
