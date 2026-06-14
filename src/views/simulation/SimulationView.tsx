import { Calculator, Coins, Landmark, PiggyBank, Plus, Target, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  averageMonthlySavings,
  projectionSeries,
  simulationImpactSummary,
  simulationMonthlyRows,
  simulationProjectionSeries,
} from "../../calculations";
import { useI18n } from "../../i18n";
import { updateSimulationEvent } from "../../services/modelService";
import { DecimalInput } from "../../shared/components/DecimalInput";
import { KpiCard } from "../../shared/components/KpiCard";
import { ViewHeader } from "../../shared/components/ViewHeader";
import type { SavingsModel, SimulationEvent } from "../../types";

type SimulationViewProps = {
  model: SavingsModel;
  setModel: (model: SavingsModel) => void;
  onSave?: () => void;
};

export function SimulationView({ model, setModel, onSave }: SimulationViewProps) {
  const { t, formatCurrency, formatCurrencyPrecise, formatMonth } = useI18n();
  const baseline = projectionSeries(model, averageMonthlySavings(model));
  const scenario = simulationProjectionSeries(model);
  const summary = simulationImpactSummary(model);
  const monthlyRows = simulationMonthlyRows(model).slice(0, 24);
  const defaultRentAmount = model.budget.categories.find((category) => category.id === "rent")?.amount ?? 0;

  const addEvent = (type: SimulationEvent["type"]) => {
    const base = {
      id: `${type}-${Date.now()}`,
      year: new Date().getFullYear() + 1,
      month: 1,
      label:
        type === "salary_raise"
          ? t("simulation.newSalaryRaise")
          : type === "expense"
            ? t("simulation.newExpense")
            : t("simulation.newPropertyProject"),
    };

    const nextEvent: SimulationEvent =
      type === "salary_raise"
        ? { ...base, type, deltaMonthlySalary: 200, savedShare: 0.4 }
        : type === "expense"
          ? { ...base, type, amount: 150, recurringMonths: 12 }
          : { ...base, type, downPayment: 30000, monthlyPayment: 1100, recurringMonths: 240, removeRent: true, rentAmount: defaultRentAmount };

    setModel({ ...model, simulationEvents: [...model.simulationEvents, nextEvent] });
  };

  const removeEvent = (eventId: string) => {
    setModel({ ...model, simulationEvents: model.simulationEvents.filter((event) => event.id !== eventId) });
  };

  return (
    <main className="view">
      <ViewHeader
        eyebrow={t("simulation.eyebrow")}
        title={t("simulation.title")}
        actions={
          onSave ? (
            <button className="action-button" onClick={onSave}>
              <span>{t("simulation.saveScenario")}</span>
            </button>
          ) : undefined
        }
      />

      <div className="kpi-grid">
        <KpiCard label={t("simulation.projectedMonthlyBase")} value={formatCurrency(summary.annualBaseSavings / 12)} icon={Coins} tone="blue" />
        <KpiCard label={t("simulation.monthlyImpact")} value={formatCurrency(summary.recurringMonthlyDelta)} icon={TrendingUp} tone="amber" />
        <KpiCard label={t("simulation.oneOffOutflows")} value={formatCurrency(summary.oneOffOutflows)} icon={Landmark} tone="red" />
        <KpiCard label={t("simulation.firstYearSavings")} value={formatCurrency(summary.firstYearContribution)} icon={PiggyBank} tone="green" />
      </div>

      <div className="simulation-actions">
        <button className="action-button" onClick={() => addEvent("salary_raise")}>
          <Plus size={16} aria-hidden="true" />
          <span>{t("simulation.salaryRaise")}</span>
        </button>
        <button className="action-button" onClick={() => addEvent("expense")}>
          <Plus size={16} aria-hidden="true" />
          <span>{t("simulation.expense")}</span>
        </button>
        <button className="action-button" onClick={() => addEvent("property_purchase")}>
          <Plus size={16} aria-hidden="true" />
          <span>{t("simulation.propertyProject")}</span>
        </button>
      </div>

      <div className="dashboard-grid">
        <section className="panel large">
          <div className="panel-title">
            <h2>{t("simulation.comparedProjection")}</h2>
            <Target size={19} aria-hidden="true" />
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={baseline.map((row, index) => ({ ...row, scenario: scenario[index]?.value ?? row.value }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" minTickGap={24} />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} width={48} />
              <Tooltip formatter={(value) => formatCurrencyPrecise(Number(value))} />
              <Line dataKey="value" name={t("simulation.currentProjection")} stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line dataKey="scenario" name={t("simulation.simulatedProjection")} stroke="#059669" strokeWidth={2} dot={false} />
              <Line dataKey="target" name={t("projection.targetLine")} stroke="#dc2626" strokeWidth={2} strokeDasharray="6 6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>{t("simulation.nextTwoYears")}</h2>
            <Calculator size={19} aria-hidden="true" />
          </div>
          <div className="mini-table">
            {monthlyRows.map((row) => (
              <div key={row.key}>
                <span>
                  {formatMonth(row.monthIndex)} {row.year}
                </span>
                <strong>{formatCurrency(row.contribution)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="group-stack">
        {model.simulationEvents.map((event) => (
          <section className="panel" key={event.id}>
            <div className="event-head">
              <h2>{event.label}</h2>
              <button className="link-button danger" onClick={() => removeEvent(event.id)}>
                {t("actions.delete")}
              </button>
            </div>
            <div className="form-grid three">
              <label className="field">
                <span>{t("common.label")}</span>
                <input value={event.label} onChange={(evt) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, label: evt.target.value })))} />
              </label>
              <label className="field">
                <span>{t("common.year")}</span>
                <DecimalInput
                  value={event.year}
                  inputMode="numeric"
                  onCommit={(nextValue) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, year: Math.round(nextValue) })))}
                />
              </label>
              <label className="field">
                <span>{t("common.month")}</span>
                <DecimalInput
                  value={event.month}
                  inputMode="numeric"
                  onCommit={(nextValue) =>
                    setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, month: Math.max(1, Math.min(12, Math.round(nextValue))) })))
                  }
                />
              </label>
              {event.type === "salary_raise" ? (
                <>
                  <label className="field">
                    <span>{t("simulation.netSalaryIncrease")}</span>
                    <DecimalInput
                      value={event.deltaMonthlySalary}
                      onCommit={(nextValue) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, deltaMonthlySalary: nextValue })))}
                    />
                  </label>
                  <label className="field">
                    <span>{t("simulation.savedShare")}</span>
                    <DecimalInput value={event.savedShare} onCommit={(nextValue) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, savedShare: nextValue })))} />
                    <small className="field-help">{t("simulation.savedShareHelp")}</small>
                  </label>
                </>
              ) : null}
              {event.type === "expense" ? (
                <>
                  <label className="field">
                    <span>{t("simulation.monthlyExpense")}</span>
                    <DecimalInput value={event.amount} onCommit={(nextValue) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, amount: nextValue })))} />
                  </label>
                  <label className="field">
                    <span>{t("simulation.durationMonths")}</span>
                    <DecimalInput
                      value={event.recurringMonths}
                      inputMode="numeric"
                      onCommit={(nextValue) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, recurringMonths: Math.max(1, Math.round(nextValue)) })))}
                    />
                  </label>
                </>
              ) : null}
              {event.type === "property_purchase" ? (
                <>
                  <label className="field">
                    <span>{t("simulation.downPayment")}</span>
                    <DecimalInput value={event.downPayment} onCommit={(nextValue) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, downPayment: nextValue })))} />
                  </label>
                  <label className="field">
                    <span>{t("simulation.monthlyPayment")}</span>
                    <DecimalInput value={event.monthlyPayment} onCommit={(nextValue) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, monthlyPayment: nextValue })))} />
                  </label>
                  <label className="field">
                    <span>{t("simulation.durationMonths")}</span>
                    <DecimalInput
                      value={event.recurringMonths}
                      inputMode="numeric"
                      onCommit={(nextValue) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, recurringMonths: Math.max(1, Math.round(nextValue)) })))}
                    />
                  </label>
                  <label className="field">
                    <span>{t("simulation.removeRent")}</span>
                    <select
                      className="select"
                      value={event.removeRent ? "yes" : "no"}
                      onChange={(evt) =>
                        setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, removeRent: evt.target.value === "yes" })))
                      }
                    >
                      <option value="yes">{t("common.yes")}</option>
                      <option value="no">{t("common.no")}</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("simulation.rentAmount")}</span>
                    <DecimalInput
                      value={event.rentAmount ?? 0}
                      onCommit={(nextValue) => setModel(updateSimulationEvent(model, event.id, (item) => ({ ...item, rentAmount: nextValue })))}
                    />
                    <small className="field-help">{t("simulation.rentAmountHelp")}</small>
                  </label>
                </>
              ) : null}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
