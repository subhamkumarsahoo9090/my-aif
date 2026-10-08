export type SessionUser = {
  name: string;
  email: string;
  mobile: string;
  clientCode: string;
};

export type LedgerType = "debit" | "credit";

export type LedgerRow = {
  id: string;
  date: string;
  type: LedgerType;
  amount: number;
  balance: number;
  narration: string;
};

export type Holding = {
  id: string;
  identifier: string;
  name: string;
  quantity: number;
  averageCost: number;
  marketValue: number;
  pnl: number;
  srNo?: string;
  allotmentDate?: string;
  allotteeName?: string;
  pan?: string;
};

export type StatementMeta = {
  id: string;
  period: string;
  issuedOn: string;
  fileName: string;
  statementType?: string;
};

export type PortfolioMetrics = {
  totalPortfolioValue: number;
  investedCapital: number;
  currentValuation: number;
  realizedPnl: number;
  unrealizedPnl: number;
};

export type ClientStatus = "active" | "inactive";

export type AdminRole = "admin" | "superadmin";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

export type Nominee = {
  name: string;
  relationship: string;
};

export type BankAccount = {
  accountNumber: string;
  ifsccode: string;
  accountHolderName: string;
  upiId: string;
  bankCity: string;
  bankName: string;
  micrCode: string;
  accountType: string;
  isPrimary: boolean;
  dpOrderId: string;
};

export type InvestorProfile = {
  tradingCode: string;
  fullName: string;
  dateOfBirth: string;
  pan: string;
  mobile: string;
  email: string;
  fatherName: string;
  motherName: string;
  occupation: string;
  maritalStatus: string;
  annualIncome: string;
  address: string;
  nomineeName: string;
  nomineeRelationship: string;
  nominees: Nominee[];
  kra: boolean;
  fatca: boolean;
  status: ClientStatus;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  banks: BankAccount[];
};

export type PortalData = {
  profile: InvestorProfile;
  metrics: PortfolioMetrics;
  ledger: LedgerRow[];
  holdings: Holding[];
  statements: StatementMeta[];
};
