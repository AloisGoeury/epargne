import { Calculator, Target } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { averageMonthlySavings, projectionSeries, requiredMonthlySavings } from "../../calculations";
import { useI18n } from "../../i18n";
import { DecimalInput } from "../../shared/components/DecimalInput";
import { ViewHeader } from "../../shared/components/ViewHeader";
import type { SavingsModel } from "../../types";

type ProjectionViewProps = {
  model: SavingsModel;
  setModel: (model: SavingsModel) => void;
};

export function ProjectionView({ model, setModel }: ProjectionViewProps) {
  const { t, formatCurrencyPrecise, formatPercent } = useI18n();
  const required = requiredMonthlySavings(model);
  const average = averageMonthlySavings(model);
  const chart = projectionSeries(model, average);
  const chartRequired = projectionSeries(model, required);
  const ratePreview = formatPercent(model.annualReturn);

  return (
    <main className="view">
      <ViewHeader eyebrow={t("projection.eyebrow")} title={t("projection.title")} />

      <div className="projection-grid">
        <section className="panel">
          <div className="form-grid">
            <label className="field">
              <span>{t("projection.currentGoal")}</span>
              <DecimalInput value={model.goal} onCommit={(nextValue) => setModel({ ...model, goal: nextValue })} />
            </label>
            <label className="field">
              <span>{t("projection.targetGoal")}</span>
              <DecimalInput value={model.projectionTarget} onCommit={(nextValue) => setModel({ ...model, projectionTarget: nextValue })} />
            </label>
            <label className="field">
              <span>{t("projection.annualRate")}</span>
              <DecimalInput value={model.annualReturn} onCommit={(nextValue) => setModel({ ...model, annualReturn: nextValue })} />
              <small className="field-help">{t("projection.rateHelp", { preview: ratePreview })}</small>
            </label>
            <label className="field">
              <span>{t("projection.years")}</span>
              <DecimalInput
                value={model.projectionYears}
                inputMode="numeric"
                onCommit={(nextValue) => setModel({ ...model, projectionYears: Math.max(1, Math.round(nextValue)) })}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>{t("projection.requiredDeposit")}</h2>
            <Calculator size={19} aria-hidden="true" />
          </div>
          <div className="projection-number">{formatCurrencyPrecise(required)}</div>
          <div className="comparison">
            <span>{t("projection.currentAverage")}</span>
            <strong>{formatCurrencyPrecise(average)}</strong>
          </div>
        </section>
      </div>

      <section className="panel large">
        <div className="panel-title">
          <h2>{t("projection.path")}</h2>
          <Target size={19} aria-hidden="true" />
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chart.map((row, index) => ({ ...row, required: chartRequired[index]?.value ?? row.value }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" minTickGap={24} />
            <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} width={48} />
            <Tooltip formatter={(value) => formatCurrencyPrecise(Number(value))} />
            <Line dataKey="value" name={t("projection.currentAverage")} stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line dataKey="required" name={t("projection.requiredLine")} stroke="#059669" strokeWidth={2} dot={false} />
            <Line dataKey="target" name={t("projection.targetLine")} stroke="#dc2626" strokeWidth={2} strokeDasharray="6 6" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </main>
  );
}
