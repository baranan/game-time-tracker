import assert from "node:assert/strict";
import { evaluateWeek, getWeekStart, weekKey } from "../js/rules.js";

// Builds deterministic local-time sessions without depending on the test machine timezone.
function session(id, start, end) {
  return { id, start: new Date(start).toISOString(), end: new Date(end).toISOString(), note: "" };
}

// Verifies Sunday-based week boundaries and the normal five-hour allowance.
const wednesday = new Date("2026-09-02T12:00:00");
assert.equal(getWeekStart(wednesday).getDay(), 0);
assert.equal(weekKey(wednesday), "2026-08-30");

// Verifies weekday daily excess and weekly totals.
const weekdayResult = evaluateWeek([
  session("a", "2026-09-01T15:00:00", "2026-09-01T15:40:00"),
  session("b", "2026-09-01T17:00:00", "2026-09-01T17:30:00"),
], wednesday, 0);
assert.equal(weekdayResult.usedMinutes, 70);
assert.ok(weekdayResult.violations.some((item) => item.includes("10 דקות")));

// Verifies weekend block and break rules while retaining the entered time.
const friday = new Date("2026-09-04T20:00:00");
const weekendResult = evaluateWeek([
  session("c", "2026-09-04T10:00:00", "2026-09-04T11:10:00"),
  session("d", "2026-09-04T11:40:00", "2026-09-04T12:10:00"),
], friday, 0);
assert.ok(weekendResult.warningsBySession.get("c").some((item) => item.includes("10 דקות")));
assert.ok(weekendResult.warningsBySession.get("d").some((item) => item.includes("30 דקות")));

// Verifies that the required weekend break is enforced across Friday midnight.
const midnightResult = evaluateWeek([
  session("f", "2026-09-04T23:00:00", "2026-09-04T23:40:00"),
  session("g", "2026-09-05T00:10:00", "2026-09-05T00:40:00"),
], friday, 0);
assert.ok(midnightResult.warningsBySession.get("g").some((item) => item.includes("30 דקות")));

// Verifies week-specific allowance adjustments and over-limit reporting.
const adjusted = evaluateWeek([
  session("e", "2026-08-30T10:00:00", "2026-08-30T15:30:00"),
], wednesday, 60);
assert.equal(adjusted.limitMinutes, 360);
assert.equal(adjusted.remainingMinutes, 30);

console.log("All rule tests passed.");
