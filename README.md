# AIF Client Portal

Wealth Discovery investor portal. The site is in `aif-front` (Next.js, http://localhost:3000). The API is in `aif-back` (http://localhost:8089).

```bash
cd aif-front && npm run dev
cd aif-back && npm run dev
```

## Admin reports

http://localhost:3000/admin/reports is the staff screen for issuing an investor statement. The sidebar label is **Reports**. Admin and super admin can open it when the Reports module is allowed for their role.

It is not a downloadable report of the whole fund. Staff pick one client and record a statement for that client. The page has two parts.

### 1. Generate statement

The form asks for:

| Field | What it does |
| --- | --- |
| Client | Trading code of one investor. The list comes from the client master. |
| Statement type | Capital account, Holdings, or Portfolio. This chooses the PDF body and the file name. |
| Period | Free text, for example `Q2 FY 2026-27`. It is printed on the statement. |
| Schedule | Daily, weekly, or monthly. Used only by **Schedule delivery**. |

**Generate PDF record** (`mode: manual`):

1. The browser sends `POST /api/admin/reports` with the client, type, period, and mode.
2. The API checks that the trading code exists. If it does not, the request is rejected.
3. A statement row is saved on that investor: id, period, issue date, and a file name such as `TC24018-Capital-account.pdf`.
4. A delivery-history row is saved with status `generated`, and an audit entry is written (`Statement generated`).
5. The browser then downloads the PDF. Capital account lists the ledger, Holdings lists the units, and Portfolio lists the valuation totals. The file is built from the client’s current records when it is opened, so it is not stored as a separate file.
6. Delivery history shows **Download PDF** on each generated row. The investor can also preview or download it on http://localhost:3000/statements.

**Schedule delivery** (`mode: scheduled`):

This does not create a statement, does not build a PDF, and does not send email. It stores a history row with status `scheduled` and the chosen frequency (daily, weekly, or monthly), plus an audit entry (`Statement scheduled`). Nothing runs later on that schedule. It is a record that staff asked for a repeat delivery.

Both buttons require a client, a statement type, and a period.

### 2. Delivery history

The page loads `GET /api/admin/reports` and lists every generate and schedule action: client name, statement type, period, mode, frequency, status, and date. Newest rows are first. A generated row has **Download PDF**. A scheduled row does not, because no file was created. The same rows are kept with the platform state, so they remain after a restart.

A generated statement also appears on that client’s **Reports** and **Statements** tabs in Client 360. Only a generated statement appears on the investor’s own Statements page. A scheduled row stays in delivery history and does not show up there.
