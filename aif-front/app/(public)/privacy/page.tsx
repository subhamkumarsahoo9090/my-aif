import type { Metadata } from "next";
import LegalDocument from "@/components/legal/LegalDocument";
import { pageMetadata } from "@/config/projectmanager";

export const metadata: Metadata = pageMetadata("/privacy");

export default function PrivacyPage() {
  return (
    <LegalDocument
      kicker="AIF Client Portal"
      title="Privacy Policy"
      intro="This portal shows an investor only their own fund records. This policy explains what that record contains, who can open it, and how to ask for a correction."
      updated="6 October 2026"
      otherHref="/terms"
      otherLabel="Terms & Conditions"
      sections={[
        {
          id: "who",
          title: "Who this policy covers",
          paragraphs: [
            "The AIF Client Portal is a private view of an investor’s alternative investment fund account. It is not a public website for browsing other people’s investments.",
            "This policy applies to investors who sign in, and to the fund staff who maintain those accounts.",
          ],
        },
        {
          id: "information",
          title: "Information on your account",
          paragraphs: ["When the fund creates your account, the portal can hold the details needed to identify you and show your investment:"],
          points: [
            "Name, date of birth, father’s and mother’s names, occupation, marital status, annual income, address, email, and mobile number.",
            "PAN, trading code, and KRA and FATCA status.",
            "Nominee names and relationships.",
            "Bank account details used for the investment, including account number, IFSC, and account type.",
            "Ledger entries, allotted units, scheme or ISIN details, and the statements issued to you.",
          ],
        },
        {
          id: "use",
          title: "Why we use it",
          paragraphs: ["We use this information so you can sign in and see your own position. In particular, the portal uses it to:"],
          points: [
            "Show portfolio value, capital movements, holdings, and issued statements.",
            "Match an allotment file to the right investor by PAN when the fund adds holdings.",
            "Let authorised staff keep the client record, compliance flags, and statement history up to date.",
            "Record important staff actions, such as creating a client or committing an import, in the audit trail.",
          ],
        },
        {
          id: "access",
          title: "Who can see it",
          paragraphs: [
            "After you sign in, the portal shows the account tied to your trading code. It does not offer a way to open another investor’s ledger, holdings, or statements.",
            "Fund administrators can open client records according to their role. A super admin can also manage staff, roles, schedules, and platform settings. Staff do not receive a copy of your password.",
          ],
        },
        {
          id: "security",
          title: "How access is protected",
          paragraphs: [
            "Sign-in uses your email or mobile and your password. A session ends after a period of inactivity, and you can sign out at any time.",
            "Keep the password private. If the fund gave you a starting password, change it before you rely on the account. Tell the fund office if you think someone else has used your sign-in.",
          ],
        },
        {
          id: "retention",
          title: "How long it is kept",
          paragraphs: [
            "Investor records, ledger entries, holdings, and statements are kept for as long as the fund needs them to administer your account and to meet its record-keeping duties.",
            "If your relationship with the fund ends, the office decides what must still be retained. The portal is not a place to delete regulatory records on your own.",
          ],
        },
        {
          id: "corrections",
          title: "Corrections and questions",
          paragraphs: [
            "Profile, bank, and nominee details are maintained by the fund. If something on your screen is wrong, contact the office with your trading code and the correction you need. Do not send a password or a full card number by email.",
            "We do not sell investor information, and this portal does not carry third-party advertising.",
          ],
        },
      ]}
    />
  );
}
