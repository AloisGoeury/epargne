import { Area, AreaChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Calculator, PiggyBank, Save, Target, WalletCards } from "lucide-react";
import {
  accountBalance,
  activeMonthlySavings,
  averageMonthlySavings,
  currentYearSavingsRate,
  totalSavings,
} from "../../calculations";
import { useI18n } from "../../i18n";
import { KpiCard } from "../../shared/components/KpiCard";
import { ViewHeader } from "../../shared/components/ViewHeader";
import type { SavingsModel } from "../../types";

const colors = ["#2563eb", "#059669", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

export function DashboardView({ model }: { model: SavingsModel }) {
  const { t, formatCurrency, formatCurrencyPrecise, formatPercent } = useI18n();
  const total = totalSavings(model);
  const monthly = activeMonthlySavings(model);
  const chartRows = monthly.filter((row) => row.savings !== 0 || row.cumulative !== 0).slice(-36);
  const allocation = model.accounts.map((account) => ({ name: account.name, value: Math.max(0, accountBalance(account)) }));
  const progress = model.goal ? total / model.goal : 0;

  return (
    <main className="view">
      <ViewHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        actions={
          <div className="goal-pill">
            <Target size={18} aria-hidden="true" />
            <span>{formatPercent(progress)}</span>
          </div>
        }
      />

      <div className="kpi-grid">
        <KpiCard label={t("dashboard.totalSavings")} value={formatCurrencyPrecise(total)} icon={PiggyBank} tone="blue" />
        <KpiCard label={t("dashboard.longTermGoal")} value={formatCurrency(model.goal)} icon={Target} tone="green" />
        <KpiCard label={t("dashboard.averageDeposit")} value={formatCurrency(averageMonthlySavings(model))} icon={Save} tone="amber" />
        <KpiCard label={t("dashboard.savingsRate")} value={formatPercent(currentYearSavingsRate(model))} icon={Calculator} tone="red" />
      </div>

      <section className="progress-band">
        <div>
          <span>{t("dashboard.goalReached")}</span>
          <strong>
            {formatCurrencyPrecise(total)} / {formatCurrency(model.goal)}
          </strong>
        </div>
        <div className="progress-track">
          <div style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel large">
          <div className="panel-title">
            <h2>{t("dashboard.monthlyEvolution")}</h2>
            <BarChart3 size={19} aria-hidden="true" />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartRows}>
              <defs>
                <linearGradient id="savings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="key" minTickGap={28} tickFormatter={(value) => String(value).slice(2)} />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} width={42} />
              <Tooltip formatter={(value) => formatCurrencyPrecise(Number(value))} />
              <Area dataKey="cumulative" name={t("dashboard.cumulative")} stroke="#2563eb" fill="url(#savings)" strokeWidth={2} />
              <Bar dataKey="savings" name={t("dashboard.deposit")} fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>{t("dashboard.allocation")}</h2>
            <WalletCards size={19} aria-hidden="true" />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={62} outerRadius={102} paddingAngle={3}>
                {allocation.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrencyPrecise(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend-list">
            {allocation.map((row, index) => (
              <div key={row.name}>
                <span style={{ background: colors[index % colors.length] }} />
                <p>{row.name}</p>
                <strong>{formatCurrencyPrecise(row.value)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
