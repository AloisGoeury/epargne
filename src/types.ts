export type MonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type YearEntries = {
  year: number;
  months: number[];
  interest: number;
};

export type AccountType = "cash" | "investment" | "employee" | "insurance";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  bucket?: string;
  startBalance: number;
  currentValue?: number;
  cap?: number;
  expectedReturn?: number;
  entries: YearEntries[];
  actualBalances?: YearEntries[];
};

export type SalaryYear = {
  year: number;
  months: number[];
};

export type BudgetCategory = {
  id: string;
  label: string;
  amount: number;
  parentId?: string;
};

export type BudgetPlan = {
  monthlyIncomeOverride?: number;
  categories: BudgetCategory[];
  targetSavings?: number;
};

export type ProfileKind = "personal" | "shared";

export type ProfilePreferences = {
  hideSavings: boolean;
  hideAccounts: boolean;
};

export type SimulationEvent =
  | {
      id: string;
      type: "salary_raise";
      label: string;
      year: number;
      month: number;
      deltaMonthlySalary: number;
      savedShare: number;
    }
  | {
      id: string;
      type: "expense";
      label: string;
      year: number;
      month: number;
      amount: number;
      recurringMonths: number;
    }
  | {
      id: string;
      type: "property_purchase";
      label: string;
      year: number;
      month: number;
      downPayment: number;
      monthlyPayment: number;
      recurringMonths: number;
      removeRent?: boolean;
      rentAmount?: number;
    };

export type SavingsModel = {
  goal: number;
  projectionTarget: number;
  annualReturn: number;
  projectionYears: number;
  accounts: Account[];
  salary: SalaryYear[];
  budget: BudgetPlan;
  simulationEvents: SimulationEvent[];
};

export type AppProfile = {
  id: string;
  name: string;
  kind: ProfileKind;
  preferences: ProfilePreferences;
  model: SavingsModel;
  memberIds?: string[];
  sharedContributionCategoryId?: string;
};
