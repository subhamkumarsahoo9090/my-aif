import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/terms");

export default function TermsPage() {
  return (
    <LegalDocument
      kicker="AIF Client Portal"
      title="Terms & Conditions"
      intro="These terms cover use of the private portal where an investor reviews their own fund account. They do not replace the fund documents that govern your investment."
      updated="6 October 2026"
      otherHref="/privacy"
      otherLabel="Privacy Policy"
      sections={[
        {
          id: "portal",
          title: "What the portal is",
          paragraphs: [
            "The AIF Client Portal lets an investor sign in and review the records the fund keeps for that investor: portfolio value, ledger entries, holdings, profile and compliance status, and issued statements.",
            "It is an information window onto your account. It is not a stock exchange, a public offer of units, or a place to place trades.",
          ],
        },
        {
          id: "access",
          title: "Who may sign in",
          paragraphs: [
            "Use of the portal is limited to investors who have been given an account, and to fund staff authorised to administer those accounts.",
            "You may use only the account issued to you. Do not try to open another investor’s trading code, and do not share your sign-in with anyone else.",
          ],
        },
        {
          id: "password",
          title: "Your sign-in",
          paragraphs: [
            "You are responsible for the password on your account. If you were given a starting password, change it and do not reuse it on other websites.",
            "The session closes after inactivity. Sign out on a shared computer. Tell the fund office promptly if you believe the account has been used without your permission.",
          ],
        },
        {
          id: "records",
          title: "What the figures mean",
          paragraphs: [
            "Values, units, ledger rows, and statements are shown from the records maintained for your account, including files the fund imports and the latest NAV used for valuation.",
            "They are provided so you can follow your account. They are not investment advice, a promise of future performance, or a substitute for the fund’s offer documents, contribution agreement, or a statement the fund has formally issued to you.",
            "If a screen and an issued statement disagree, ask the fund office before you rely on the screen.",
          ],
        },
        {
          id: "conduct",
          title: "Acceptable use",
          paragraphs: ["When you use the portal, you agree not to:"],
          points: [
            "Attempt to view, copy, or change another investor’s information.",
            "Probe, disrupt, or overload the portal, or try to bypass sign-in.",
            "Upload or submit anything unlawful, or use the portal to mislead the fund or another investor.",
            "Treat downloaded statements as something you may publish or sell.",
          ],
        },
        {
          id: "staff",
          title: "Fund staff",
          paragraphs: [
            "Authorised staff may create and update client records, import ledger and holding files, issue or schedule statements, and record those actions for audit.",
            "Staff access follows the role assigned to them. A higher role is required for staff administration, the audit trail, schedules, and platform settings.",
          ],
        },
        {
          id: "availability",
          title: "Availability and ending access",
          paragraphs: [
            "The portal is provided so investors can review their records. It may be unavailable during maintenance or because of a fault. A missing page is not a change to your investment.",
            "The fund may suspend an account that is misused, or close portal access when the investor relationship ends. Closing the sign-in does not, by itself, close the underlying investment.",
          ],
        },
        {
          id: "law",
          title: "Which terms govern the investment",
          paragraphs: [
            "Your commitment to the fund is governed by the fund documents you signed, not by this page. These terms govern only use of the portal.",
            "They are governed by the laws of India. Subject to any right you have to approach a regulator, the courts at New Delhi have jurisdiction over disputes about use of the portal.",
            "We may update this page when the portal changes. The date at the top is the latest version. Continuing to sign in after an update means you accept the revised terms for use of the portal.",
          ],
        },
      ]}
    />
  );
}
