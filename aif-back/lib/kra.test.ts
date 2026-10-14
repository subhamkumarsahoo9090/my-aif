import assert from "node:assert/strict";
import test from "node:test";
import { complianceFromPayload, kraDob, kraVerifiedFromPayload } from "./kra.js";

test("date of birth is sent as day/month/year", () => {
  assert.equal(kraDob("1978-07-01"), "01/07/1978");
  assert.equal(kraDob("01/07/1978"), "01/07/1978");
  assert.equal(kraDob("1978/07/01"), "");
});

test("KRA is verified only when APP_STATUS is 07", () => {
  assert.equal(kraVerifiedFromPayload({ success: true, kyc: { APP_STATUS: "07" } }), true);
  assert.equal(kraVerifiedFromPayload({ success: true, kyc: { APP_STATUS: "02" } }), false);
  assert.equal(kraVerifiedFromPayload({ success: false }), null);
  assert.equal(kraVerifiedFromPayload(null), null);
});

test("FATCA is ticked when APP_FATCA_APPLICABLE_FLAG has any value", () => {
  assert.equal(complianceFromPayload({ success: true, kyc: { APP_STATUS: "07", APP_FATCA_APPLICABLE_FLAG: "N" } })?.fatca, true);
  assert.equal(complianceFromPayload({ success: true, kyc: { APP_STATUS: "07", APP_FATCA_APPLICABLE_FLAG: "Y" } })?.fatca, true);
  assert.equal(complianceFromPayload({ success: true, kyc: { APP_STATUS: "07", APP_FATCA_APPLICABLE_FLAG: "" } })?.fatca, false);
  assert.equal(complianceFromPayload({ success: true, kyc: { APP_STATUS: "07" } })?.fatca, false);
});
