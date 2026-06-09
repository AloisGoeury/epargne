import type { Account, BudgetCategory, BudgetPlan, SalaryYear, SimulationEvent, SavingsModel, YearEntries } from "./types";

export const monthNames = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

export const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const eurPrecise = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const percent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const sum = (values: number[]) => values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);

export const yearTotal = (row: YearEntries) => sum(row.months) + (row.interest || 0);

export const accountDeposits = (account: Account) => sum(account.entries.map((row) => sum(row.months)));

export const accountInterests = (account: Account) => sum(account.entries.map((row) => row.interest || 0));

export const accountBookBalance = (account: Account) => account.startBalance + accountDeposits(account) + accountInterests(account);

export const accountBalance = (account: Account) => account.currentValue ?? accountBookBalance(account);

export const accountValuationGap = (account: Account) => accountBalance(account) - accountBookBalance(account);

export const totalSavings = (model: SavingsModel) => sum(model.accounts.map(accountBalance));

export const totalStartingBalance = (model: SavingsModel) => sum(model.accounts.map((account) => account.startBalance));

export const totalDeposits = (model: SavingsModel) => sum(model.accounts.map(accountDeposits));

export const totalGains = (model: SavingsModel) =>
  sum(model.accounts.map((account) => accountBalance(account) - account.startBalance - accountDeposits(account)));

export const monthlySavings = (model: SavingsModel) => {
  const byMonth = new Map<string, { key: string; year: number; month: string; savings: number; cumulative: number; salary: number }>();

  for (const account of model.accounts) {
    for (const row of account.entries) {
      row.months.forEach((value, monthIndex) => {
        const key = `${row.year}-${String(monthIndex + 1).padStart(2, "0")}`;
        const current = byMonth.get(key) ?? {
          key,
          year: row.year,
          month: monthNames[monthIndex],
          savings: 0,
          cumulative: 0,
          salary: 0,
        };
        current.savings += value || 0;
        byMonth.set(key, current);
      });
    }
  }

  for (const row of model.salary) {
    row.months.forEach((value, monthIndex) => {
      const key = `${row.year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const current = byMonth.get(key) ?? {
        key,
        year: row.year,
        month: monthNames[monthIndex],
        savings: 0,
        cumulative: 0,
        salary: 0,
      };
      current.salary += value || 0;
      byMonth.set(key, current);
    });
  }

  let cumulative = 0;
  return [...byMonth.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((row) => {
      cumulative += row.savings;
      return { ...row, cumulative };
    });
};

export const activeMonthlySavings = (model: SavingsModel) => monthlySavings(model).filter((row) => row.savings !== 0 || row.salary !== 0);

export const averageMonthlySavings = (model: SavingsModel) => {
  const rows = activeMonthlySavings(model).filter((row) => row.savings !== 0);
  return rows.length ? sum(rows.map((row) => row.savings)) / rows.length : 0;
};

export const currentYearSavingsRate = (model: SavingsModel) => {
  const currentYear = Math.max(...model.salary.filter((row) => sum(row.months) > 0).map((row) => row.year));
  const savings = monthlySavings(model).filter((row) => row.year === currentYear);
  const salary = model.salary.find((row) => row.year === currentYear);
  const salaryTotal = salary ? sum(salary.months) : 0;
  const savingsTotal = sum(savings.map((row) => row.savings));
  return salaryTotal ? savingsTotal / salaryTotal : 0;
};

export const requiredMonthlySavings = (model: SavingsModel) => {
  const annualRate = model.annualReturn || 0;
  const months = Math.max(1, model.projectionYears * 12);
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  const current = totalSavings(model);
  const target = model.projectionTarget;

  if (monthlyRate === 0) {
    return Math.max(0, (target - current) / months);
  }

  const futureCurrent = current * Math.pow(1 + monthlyRate, months);
  const annuityFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
  return Math.max(0, (target - futureCurrent) / annuityFactor);
};

export const projectionSeries = (model: SavingsModel, monthlyPayment = averageMonthlySavings(model)) => {
  const monthlyRate = Math.pow(1 + model.annualReturn, 1 / 12) - 1;
  let value = totalSavings(model);
  return Array.from({ length: model.projectionYears + 1 }, (_, index) => {
    if (index > 0) {
      for (let month = 0; month < 12; month += 1) {
        value = value * (1 + monthlyRate) + monthlyPayment;
      }
    }
    return {
      year: new Date().getFullYear() + index,
      value: Math.round(value),
      target: model.projectionTarget,
    };
  });
};

export const salaryTotal = (rows: SalaryYear[]) => sum(rows.map((row) => sum(row.months)));

export const latestMonthlySalary = (model: SavingsModel) => {
  const months = model.salary
    .flatMap((row) => row.months.map((value, index) => ({ key: `${row.year}-${index}`, value })))
    .filter((row) => row.value > 0);
  return months.length ? months[months.length - 1].value : 0;
};

export const averageMonthlySalary = (model: SavingsModel) => {
  const values = model.salary.flatMap((row) => row.months).filter((value) => value > 0);
  return values.length ? sum(values) / values.length : 0;
};

export const budgetIncome = (model: SavingsModel) => model.budget.monthlyIncomeOverride ?? latestMonthlySalary(model) ?? averageMonthlySalary(model);

export const budgetExpenses = (budget: BudgetPlan) => sum(budget.categories.map((category) => category.amount));

export const budgetAvailableForSavings = (model: SavingsModel) => budgetIncome(model) - budgetExpenses(model.budget);

export const budgetGapToTarget = (model: SavingsModel) => budgetAvailableForSavings(model) - (model.budget.targetSavings ?? 0);

export type BudgetTreeNode = BudgetCategory & {
  children: BudgetTreeNode[];
  depth: number;
  total: number;
};

const categoryChildren = (categories: BudgetCategory[], parentId?: string) =>
  categories
    .filter((category) => category.parentId === parentId)
    .sort((left, right) => left.label.localeCompare(right.label, "fr"));

const buildBudgetNode = (category: BudgetCategory, categories: BudgetCategory[], depth: number): BudgetTreeNode => {
  const children = categoryChildren(categories, category.id).map((child) => buildBudgetNode(child, categories, depth + 1));
  return {
    ...category,
    children,
    depth,
    total: category.amount + sum(children.map((child) => child.total)),
  };
};

export const budgetTree = (budget: BudgetPlan) => categoryChildren(budget.categories).map((category) => buildBudgetNode(category, budget.categories, 0));

export const flattenBudgetTree = (nodes: BudgetTreeNode[]): BudgetTreeNode[] =>
  nodes.flatMap((node) => [node, ...flattenBudgetTree(node.children)]);

type SankeyNode = { name: string; fill?: string };
type SankeyLink = { source: number; target: number; value: number };

const budgetPalette = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#ec4899"];

type BudgetSankeyLabels = {
  income: string;
  savings: string;
  expenses: string;
  deficit: string;
  directSuffix: string;
};

const defaultBudgetSankeyLabels: BudgetSankeyLabels = {
  income: "Revenu",
  savings: "Epargne",
  expenses: "Depenses",
  deficit: "Deficit",
  directSuffix: "direct",
};

export const budgetSankeyData = (model: SavingsModel, labels: BudgetSankeyLabels = defaultBudgetSankeyLabels) => {
  const income = budgetIncome(model);
  const expenses = budgetExpenses(model.budget);
  const savings = Math.max(0, budgetAvailableForSavings(model));
  const overspend = Math.max(0, expenses - income);
  const roots = budgetTree(model.budget);

  const nodes: SankeyNode[] = [
    { name: labels.income, fill: "#2563eb" },
    { name: labels.savings, fill: "#059669" },
    { name: labels.expenses, fill: "#b45309" },
  ];
  const links: SankeyLink[] = [];
  const nodeIndex = new Map<string, number>([
    ["income", 0],
    ["savings", 1],
    ["expenses", 2],
  ]);
  const colorByRoot = new Map<string, string>();

  roots.forEach((root, index) => {
    colorByRoot.set(root.id, budgetPalette[index % budgetPalette.length]);
  });

  if (savings > 0) {
    links.push({ source: nodeIndex.get("income")!, target: nodeIndex.get("savings")!, value: savings });
  }

  if (expenses > 0) {
    links.push({ source: nodeIndex.get("income")!, target: nodeIndex.get("expenses")!, value: expenses });
  }

  if (overspend > 0) {
    const overspendIndex = nodes.push({ name: labels.deficit, fill: "#dc2626" }) - 1;
    nodeIndex.set("overspend", overspendIndex);
    links.push({ source: nodeIndex.get("expenses")!, target: overspendIndex, value: overspend });
  }

  const ensureNode = (key: string, name: string, fill?: string) => {
    const existing = nodeIndex.get(key);
    if (existing !== undefined) return existing;
    const index = nodes.push({ name, fill }) - 1;
    nodeIndex.set(key, index);
    return index;
  };

  const walk = (node: BudgetTreeNode, parentIndex: number, rootId: string) => {
    const color = colorByRoot.get(rootId);
    const currentIndex = ensureNode(`cat:${node.id}`, node.label, color);
    if (node.total > 0) {
      links.push({ source: parentIndex, target: currentIndex, value: node.total });
    }

    if (node.amount > 0 && node.children.length > 0) {
      const selfIndex = ensureNode(`self:${node.id}`, `${node.label} ${labels.directSuffix}`, color);
      links.push({ source: currentIndex, target: selfIndex, value: node.amount });
    }

    node.children.forEach((child) => walk(child, currentIndex, rootId));
  };

  roots.forEach((root) => walk(root, nodeIndex.get("expenses")!, root.id));

  return { nodes, links, roots };
};

const projectionStartYear = () => new Date().getFullYear();

const eventStartKey = (event: SimulationEvent) => event.year * 12 + (event.month - 1);

const propertyPurchaseMonthlyDelta = (event: Extract<SimulationEvent, { type: "property_purchase" }>) => {
  const rentOffset = event.removeRent ? event.rentAmount ?? 0 : 0;
  return rentOffset - event.monthlyPayment;
};

const eventMonthlyContributionDelta = (event: SimulationEvent, key: number) => {
  const start = eventStartKey(event);
  if (key < start) return 0;

  if (event.type === "salary_raise") {
    return event.deltaMonthlySalary * event.savedShare;
  }

  if (event.type === "expense") {
    return key < start + event.recurringMonths ? -event.amount : 0;
  }

  return key < start + event.recurringMonths ? propertyPurchaseMonthlyDelta(event) : 0;
};

const eventCapitalDelta = (event: SimulationEvent, key: number) => {
  const start = eventStartKey(event);
  if (key !== start) return 0;
  if (event.type === "property_purchase") return -event.downPayment;
  return 0;
};

export const monthlySimulationBaseSavings = (model: SavingsModel) => {
  const budgetFreeCash = budgetAvailableForSavings(model);
  return budgetFreeCash > 0 ? budgetFreeCash : averageMonthlySavings(model);
};

export const simulationMonthlyRows = (model: SavingsModel) => {
  const startYear = projectionStartYear();
  const baseSavings = monthlySimulationBaseSavings(model);
  const totalMonths = model.projectionYears * 12;
  const rows: Array<{
    key: string;
    year: number;
    monthIndex: number;
    month: string;
    baseSavings: number;
    delta: number;
    contribution: number;
    capitalEvent: number;
  }> = [];

  for (let index = 0; index < totalMonths; index += 1) {
    const year = startYear + Math.floor(index / 12);
    const monthIndex = index % 12;
    const absoluteKey = year * 12 + monthIndex;
    const delta = sum(model.simulationEvents.map((event) => eventMonthlyContributionDelta(event, absoluteKey)));
    const capitalEvent = sum(model.simulationEvents.map((event) => eventCapitalDelta(event, absoluteKey)));
    rows.push({
      key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      year,
      monthIndex,
      month: monthNames[monthIndex],
      baseSavings,
      delta,
      contribution: baseSavings + delta,
      capitalEvent,
    });
  }

  return rows;
};

export const simulationProjectionSeries = (model: SavingsModel) => {
  const monthlyRate = Math.pow(1 + model.annualReturn, 1 / 12) - 1;
  const scenarioRows = simulationMonthlyRows(model);
  let value = totalSavings(model);
  const annualRows: Array<{ year: number; value: number; target: number }> = [
    { year: projectionStartYear(), value: Math.round(value), target: model.projectionTarget },
  ];

  scenarioRows.forEach((row) => {
    value = value * (1 + monthlyRate) + row.contribution + row.capitalEvent;
    if (row.monthIndex === 11) {
      annualRows.push({
        year: row.year,
        value: Math.round(value),
        target: model.projectionTarget,
      });
    }
  });

  return annualRows;
};

export const simulationImpactSummary = (model: SavingsModel) => {
  const monthlyRows = simulationMonthlyRows(model);
  return {
    annualBaseSavings: monthlySimulationBaseSavings(model) * 12,
    oneOffOutflows: sum(
      model.simulationEvents.map((event) => {
        if (event.type === "property_purchase") return event.downPayment;
        return 0;
      }),
    ),
    recurringMonthlyDelta: sum(
      model.simulationEvents.map((event) => {
        if (event.type === "salary_raise") return event.deltaMonthlySalary * event.savedShare;
        if (event.type === "expense") return -event.amount;
        return propertyPurchaseMonthlyDelta(event);
      }),
    ),
    firstYearContribution: sum(monthlyRows.slice(0, 12).map((row) => row.contribution)),
  };
};
