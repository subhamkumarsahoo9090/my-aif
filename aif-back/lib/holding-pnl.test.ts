import assert from "node:assert/strict";
import test from "node:test";
import { completedOneYear, eligiblePnl, planHoldingImport, plusOneYear } from "./holding-pnl.js";

const existing = {
  identifier: "INF2KLC22021",
  pan: "BNAPA9443F",
  allotmentDate: "2026-01-30",
  quantity: 75,
  costNav: 100000,
};

test("an identical PAN, date, and units row is skipped and keeps its saved NAV", () => {
  const [plan] = planHoldingImport([existing], [{ ...existing, costNav: undefined }], 110000);
  assert.equal(plan.status, "skip");
  assert.equal(plan.costNav, undefined);
});

test("a mixed file skips the saved row and binds the current NAV only to the new row", () => {
  const plans = planHoldingImport(
    [existing],
    [
      { identifier: "INF2KLC22021", pan: "bnapa9443f", allotmentDate: "2026-01-30", quantity: 75 },
      { identifier: "INF2KLC22021", pan: "BNAPA9443F", allotmentDate: "2026-04-28", quantity: 68 },
    ],
    100000,
  );
  assert.deepEqual(plans, [
    { status: "skip" },
    { status: "insert", costNav: 100000 },
  ]);
});

test("a repeated row inside one file is inserted once", () => {
  const row = { identifier: "INF2KLC22021", pan: "BNAPA9443F", allotmentDate: "2026-04-28", quantity: 68 };
  const plans = planHoldingImport([], [row, row], 100000);
  assert.equal(plans[0].status, "insert");
  assert.equal(plans[1].status, "skip");
});

test("a new row fails when no NAV is available and nothing is priced", () => {
  const [plan] = planHoldingImport([], [{ ...existing, costNav: undefined }], null);
  assert.deepEqual(plan, { status: "fail", reason: "No NAV has been saved yet." });
});

test("a duplicate still skips when no NAV is available", () => {
  const [plan] = planHoldingImport([existing], [existing], null);
  assert.equal(plan.status, "skip");
});

test("one full year is measured from the holding date", () => {
  assert.equal(plusOneYear("2020-01-30"), "2021-01-30");
  assert.equal(completedOneYear("2020-01-30", "2021-01-29"), false);
  assert.equal(completedOneYear("2020-01-30", "2021-01-30"), true);
  assert.equal(plusOneYear("2024-02-29"), "2025-02-28");
});

test("current profit is current NAV minus each purchase NAV after one year", () => {
  const lots = [
    { identifier: "INF2KLC22021", allotmentDate: "2021-01-10", quantity: 50, costNav: 100 },
    { identifier: "INF2KLC22021", allotmentDate: "2022-05-15", quantity: 40, costNav: 101 },
    { identifier: "INF2KLC22021", allotmentDate: "2023-05-16", quantity: 30, costNav: 102 },
    { identifier: "INF2KLC22021", allotmentDate: "2024-05-17", quantity: 20, costNav: 103 },
    { identifier: "INF2KLC22021", allotmentDate: "2025-05-18", quantity: 0, costNav: 104 },
    { identifier: "INF2KLC22021", allotmentDate: "2026-05-19", quantity: 10, costNav: 105 },
  ];
  const currentNav = 105;
  assert.equal(
    eligiblePnl(lots, currentNav, "2026-10-14"),
    50 * currentNav - 50 * 100 + 40 * currentNav - 40 * 101 + 30 * currentNav - 30 * 102 + 20 * currentNav - 20 * 103,
  );
});
