# AIF Client Portal

Investor and admin frontend for the Wealth Discovery AIF portal. The API lives in `aif-back`.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The API is expected at `http://localhost:8089`.

## Admin reports

[http://localhost:3000/admin/reports](http://localhost:3000/admin/reports) is where fund staff issue an investor statement. Admin and super admin can open it when the Reports module is allowed for their role.

The page has two parts.

**Generate statement.** Pick a client, a statement type (Capital account, Holdings, or Portfolio), and a period such as `Q2 FY 2026-27`. The schedule field is Daily, Weekly, or Monthly.

- **Generate PDF record** saves a statement on that investor’s account and starts the PDF download in the browser. Capital account lists the ledger, Holdings lists the units, and Portfolio lists the valuation totals. The investor can also preview or download it on [http://localhost:3000/statements](http://localhost:3000/statements). The file is built from the client’s current records when it is opened.
- **Schedule delivery** does not create a file and does not send email. It stores a delivery row with status `scheduled` and the chosen frequency, so staff can see that a repeat delivery was requested.

**Delivery history.** Lists each generate and schedule action: client, statement type, period, mode, frequency, status, and date. A generated row has **Download PDF**. A scheduled row does not, because no file was created. A new row is also written to the audit trail.

Both actions need a client, a statement type, and a period. If the trading code is not on file, the request is rejected.
