import type { SavingsModel } from "./types";

const emptyMonths = () => Array.from({ length: 12 }, () => 0);

const year = (yearValue: number, months: number[] = [], interest = 0) => ({
  year: yearValue,
  months: [...months, ...Array.from({ length: Math.max(0, 12 - months.length) }, () => 0)].slice(0, 12),
  interest,
});

const years = (rows: Array<ReturnType<typeof year>>) => {
  const existing = new Map(rows.map((row) => [row.year, row]));
  return Array.from({ length: 20 }, (_, index) => {
    const yearValue = 2024 + index;
    return existing.get(yearValue) ?? year(yearValue, emptyMonths(), 0);
  });
};

export const initialModel: SavingsModel = {
  goal: 300000,
  projectionTarget: 650000,
  annualReturn: 0.04,
  projectionYears: 35,
  accounts: [
    {
      id: "livret-a",
      name: "Livret A",
      type: "cash",
      institution: "Banque",
      startBalance: 8000,
      cap: 22950,
      entries: years([
        year(2024, [300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300], 180),
        year(2025, [350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350], 220),
        year(2026, [400, 400, 400, 400, 400, 400], 0),
      ]),
      currentValue: 12800,
    },
    {
      id: "broker-cash",
      name: "Broker - Especes",
      type: "cash",
      institution: "Broker",
      bucket: "Compte especes",
      startBalance: 1200,
      entries: years([
        year(2024, [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150], 35),
        year(2025, [200, 150, 200, 150, 200, 150, 200, 150, 200, 150, 200, 150], 48),
        year(2026, [200, 200, 200, 200, 200, 200], 0),
      ]),
      currentValue: 2150,
    },
    {
      id: "broker-portfolio",
      name: "Broker - ETF",
      type: "investment",
      institution: "Broker",
      bucket: "ETF Monde",
      startBalance: 2500,
      entries: years([
        year(2024, [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200], 0),
        year(2025, [250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250], 0),
        year(2026, [300, 300, 300, 300, 300, 300], 0),
      ]),
      currentValue: 9050,
    },
    {
      id: "employee-plan",
      name: "Participation",
      type: "employee",
      institution: "Entreprise",
      startBalance: 0,
      expectedReturn: 0.08,
      entries: years([
        year(2024, [0, 0, 0, 0, 0, 0, 0, 900, 0, 0, 0, 0], 25),
        year(2025, [0, 0, 0, 0, 0, 0, 0, 1100, 0, 0, 0, 0], 42),
        year(2026, emptyMonths(), 0),
      ]),
      currentValue: 2067,
    },
    {
      id: "assurance-vie",
      name: "Assurance vie",
      type: "insurance",
      institution: "Assurance",
      startBalance: 10000,
      cap: 9999999999,
      entries: years([
        year(2024, [250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250], 320),
        year(2025, [300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300], 410),
        year(2026, [350, 350, 350, 350, 350, 350], 0),
      ]),
      currentValue: 18100,
      actualBalances: years([
        year(2025, [14120, 14460, 14790, 15110, 15420, 15730, 16020, 16360, 16680, 17010, 17410, 17720], 17720),
        year(2026, [18050, 18410, 18790, 19120, 19490, 19860], 19860),
      ]),
    },
  ],
  salary: [
    { year: 2024, months: [2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200, 2200] },
    { year: 2025, months: [2350, 2350, 2350, 2350, 2350, 2350, 2350, 2350, 2350, 2350, 2350, 2350] },
    { year: 2026, months: [2450, 2450, 2450, 2450, 2450, 2450, 0, 0, 0, 0, 0, 0] },
    ...Array.from({ length: 17 }, (_, index) => ({ year: 2027 + index, months: emptyMonths() })),
  ],
  budget: {
    categories: [
      { id: "housing", label: "Logement", amount: 950 },
      { id: "rent", label: "Loyer", amount: 760, parentId: "housing" },
      { id: "home-insurance", label: "Assurance habitation", amount: 25, parentId: "housing" },
      { id: "electricity", label: "Electricite", amount: 70, parentId: "housing" },
      { id: "food", label: "Alimentation", amount: 0 },
      { id: "groceries", label: "Courses", amount: 280, parentId: "food" },
      { id: "eating-out", label: "Restaurants", amount: 90, parentId: "food" },
      { id: "transport", label: "Transport", amount: 120 },
      { id: "subscriptions", label: "Abonnements", amount: 45 },
      { id: "health", label: "Sante", amount: 40 },
      { id: "leisure", label: "Loisirs", amount: 0 },
      { id: "sports", label: "Sport", amount: 45, parentId: "leisure" },
      { id: "trips", label: "Sorties", amount: 70, parentId: "leisure" },
      { id: "shopping", label: "Shopping", amount: 60, parentId: "leisure" },
      { id: "other", label: "Autres", amount: 110 },
    ],
  },
  simulationEvents: [
    {
      id: "salary-raise-2027",
      type: "salary_raise",
      label: "Augmentation annuelle",
      year: 2027,
      month: 1,
      deltaMonthlySalary: 180,
      savedShare: 0.5,
    },
    {
      id: "property-2031",
      type: "property_purchase",
      label: "Achat residence principale",
      year: 2031,
      month: 4,
      downPayment: 35000,
      monthlyPayment: 1150,
      recurringMonths: 240,
    },
  ],
};
