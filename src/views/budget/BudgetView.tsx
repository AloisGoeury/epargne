import { BriefcaseBusiness, Calculator, Coins, PiggyBank, Plus, Target, WalletCards } from "lucide-react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import {
  averageMonthlySalary,
  averageMonthlySavings,
  budgetAvailableForSavings,
  budgetExpenses,
  budgetGapToTarget,
  budgetIncome,
  budgetSankeyData,
  budgetTree,
  currentYearSavingsRate,
} from "../../calculations";
import type { BudgetTreeNode } from "../../calculations";
import { useI18n } from "../../i18n";
import { removeBudgetBranchFromPlan, updateBudgetPlanCategory } from "../../services/modelService";
import { DecimalInput } from "../../shared/components/DecimalInput";
import { KpiCard } from "../../shared/components/KpiCard";
import { ViewHeader } from "../../shared/components/ViewHeader";
import type { BudgetPlan, SavingsModel } from "../../types";

type BudgetViewProps = {
  model: SavingsModel;
  budget: BudgetPlan;
  setBudget: (budget: BudgetPlan) => void;
  onSaveBudget: () => void;
  budgetDirty: boolean;
  incomeLocked?: boolean;
};

function BudgetSankeyNode({
  x,
  y,
  width,
  height,
  payload,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: { name?: string; fill?: string };
}) {
  const label = payload.name ?? "";
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill={payload.fill ?? "#94a3b8"} fillOpacity={0.9} />
      <text x={x + width + 8} y={y + Math.max(14, height / 2)} fontSize={12} fill="#172033">
        {label}
      </text>
    </g>
  );
}

function BudgetCategoryEditor({
  budget,
  setBudget,
  category,
}: {
  budget: BudgetPlan;
  setBudget: (budget: BudgetPlan) => void;
  category: BudgetTreeNode;
}) {
  const { t, formatCurrency } = useI18n();

  const addChild = () => {
    setBudget({
      ...budget,
      categories: [...budget.categories, { id: `budget-${Date.now()}`, label: t("budget.newSubCategory"), amount: 0, parentId: category.id }],
    });
  };

  return (
    <>
      <div className="budget-row" style={{ paddingLeft: `${category.depth * 18}px` }}>
        <label className="field">
          <span>{category.depth === 0 ? t("budget.category") : t("budget.subCategory")}</span>
          <input value={category.label} onChange={(event) => setBudget(updateBudgetPlanCategory(budget, category.id, (item) => ({ ...item, label: event.target.value })))} />
        </label>
        <label className="field">
          <span>{t("budget.directAmount")}</span>
          <DecimalInput value={category.amount} onCommit={(nextValue) => setBudget(updateBudgetPlanCategory(budget, category.id, (item) => ({ ...item, amount: nextValue })))} />
          {category.children.length > 0 ? <small className="field-help">{t("budget.branchTotal", { amount: formatCurrency(category.total) })}</small> : null}
        </label>
        <div className="budget-row-actions">
          <button className="action-button compact" onClick={addChild}>
            <Plus size={16} aria-hidden="true" />
            <span>{t("actions.addSubCategory")}</span>
          </button>
          <button className="link-button danger" onClick={() => setBudget(removeBudgetBranchFromPlan(budget, category.id))}>
            {t("actions.delete")}
          </button>
        </div>
      </div>
      {category.children.map((child) => (
        <BudgetCategoryEditor key={child.id} budget={budget} setBudget={setBudget} category={child} />
      ))}
    </>
  );
}

export function BudgetView({ model, budget, setBudget, onSaveBudget, budgetDirty, incomeLocked = false }: BudgetViewProps) {
  const { t, formatCurrency, formatCurrencyPrecise, formatPercent } = useI18n();
  const budgetModel = { ...model, budget };
  const income = budgetIncome(budgetModel);
  const expenses = budgetExpenses(budget);
  const available = budgetAvailableForSavings(budgetModel);
  const gap = budgetGapToTarget(budgetModel);
  const categoryTree = budgetTree(budget);
  const sankeyData = budgetSankeyData(budgetModel, {
    income: t("budget.sankeyIncome"),
    savings: t("budget.sankeySavings"),
    expenses: t("budget.sankeyExpenses"),
    deficit: t("budget.sankeyDeficit"),
    directSuffix: t("budget.sankeyDirectSuffix"),
  });

  const addCategory = () => {
    setBudget({
      ...budget,
      categories: [...budget.categories, { id: `budget-${Date.now()}`, label: t("budget.newCategory"), amount: 0 }],
    });
  };

  return (
    <main className="view">
      <ViewHeader
        eyebrow={t("budget.eyebrow")}
        title={t("budget.title")}
        actions={
          <button className="action-button" onClick={onSaveBudget} disabled={!budgetDirty}>
            <span>{t("budget.saveBudget")}</span>
          </button>
        }
      />

      <div className="kpi-grid">
        <KpiCard label={t("budget.monthlyIncome")} value={formatCurrency(income)} icon={BriefcaseBusiness} tone="blue" />
        <KpiCard label={t("budget.monthlyExpenses")} value={formatCurrency(expenses)} icon={WalletCards} tone="red" />
        <KpiCard label={t("budget.savingsCapacity")} value={formatCurrency(available)} icon={PiggyBank} tone="green" />
        <KpiCard label={t("budget.gapToTarget")} value={formatCurrency(gap)} icon={Target} tone="amber" />
      </div>

      <div className="projection-grid">
        <section className="panel">
          <div className="form-grid">
            <label className="field">
              <span>{t("budget.selectedMonthlyIncome")}</span>
              <DecimalInput
                value={budget.monthlyIncomeOverride ?? averageMonthlySalary(budgetModel)}
                disabled={incomeLocked}
                onCommit={(nextValue) =>
                  setBudget({
                    ...budget,
                    monthlyIncomeOverride: nextValue,
                  })
                }
              />
              <small className="field-help">{incomeLocked ? t("budget.incomeSharedHelp") : t("budget.incomeHelp")}</small>
            </label>
            <label className="field">
              <span>{t("budget.monthlySavingsTarget")}</span>
              <DecimalInput
                value={budget.targetSavings ?? averageMonthlySavings(budgetModel)}
                onCommit={(nextValue) =>
                  setBudget({
                    ...budget,
                    targetSavings: nextValue,
                  })
                }
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>{t("budget.quickRead")}</h2>
            <Calculator size={19} aria-hidden="true" />
          </div>
          <div className="mini-table">
            <div>
              <span>{t("budget.observedAverageDeposit")}</span>
              <strong>{formatCurrency(averageMonthlySavings(budgetModel))}</strong>
            </div>
            <div>
              <span>{t("budget.observedSavingsRate")}</span>
              <strong>{formatPercent(currentYearSavingsRate(budgetModel))}</strong>
            </div>
            <div>
              <span>{t("budget.availableBudget")}</span>
              <strong>{formatCurrency(available)}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="panel large">
        <div className="panel-title">
          <h2>{t("budget.flows")}</h2>
          <Coins size={19} aria-hidden="true" />
        </div>
        <ResponsiveContainer width="100%" height={420}>
          <Sankey
            data={sankeyData}
            nodePadding={24}
            nodeWidth={14}
            sort={false}
            margin={{ top: 10, right: 140, bottom: 10, left: 10 }}
            link={{ stroke: "#cbd5e1", strokeOpacity: 0.35 }}
            node={(props) => <BudgetSankeyNode {...props} />}
          >
            <Tooltip formatter={(value) => formatCurrencyPrecise(Number(value))} />
          </Sankey>
        </ResponsiveContainer>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>{t("budget.categories")}</h2>
          <button className="action-button compact" onClick={addCategory}>
            <Plus size={16} aria-hidden="true" />
            <span>{t("actions.add")}</span>
          </button>
        </div>
        <div className="budget-list">
          {categoryTree.map((category) => (
            <BudgetCategoryEditor key={category.id} budget={budget} setBudget={setBudget} category={category} />
          ))}
        </div>
      </section>
    </main>
  );
}
