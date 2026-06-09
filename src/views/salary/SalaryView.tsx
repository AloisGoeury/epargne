import { BriefcaseBusiness, CalendarRange, Calculator } from "lucide-react";
import { averageMonthlySalary, latestMonthlySalary, salaryTotal, sum } from "../../calculations";
import { useI18n } from "../../i18n";
import { DecimalInput } from "../../shared/components/DecimalInput";
import { KpiCard } from "../../shared/components/KpiCard";
import { ViewHeader } from "../../shared/components/ViewHeader";
import type { SalaryYear, SavingsModel } from "../../types";

type SalaryViewProps = {
  model: SavingsModel;
  setModel: (model: SavingsModel) => void;
};

function visibleSalaryRows(rows: SalaryYear[]) {
  const currentYear = new Date().getFullYear();
  return rows.filter((row) => sum(row.months) !== 0 || Math.abs(row.year - currentYear) <= 1);
}

export function SalaryView({ model, setModel }: SalaryViewProps) {
  const { t, formatCurrencyPrecise, formatMonth } = useI18n();
  const rows = visibleSalaryRows(model.salary);

  const updateMonth = (year: number, monthIndex: number, nextValue: number) => {
    setModel({
      ...model,
      salary: model.salary.map((row) =>
        row.year === year
          ? {
              ...row,
              months: row.months.map((value, index) => (index === monthIndex ? nextValue : value)),
            }
          : row,
      ),
    });
  };

  return (
    <main className="view">
      <ViewHeader eyebrow={t("salary.eyebrow")} title={t("salary.title")} />

      <section className="entry-panel">
        <div className="entry-summary">
          <KpiCard label={t("salary.latestMonthly")} value={formatCurrencyPrecise(latestMonthlySalary(model))} icon={BriefcaseBusiness} tone="blue" />
          <KpiCard label={t("salary.averageMonthly")} value={formatCurrencyPrecise(averageMonthlySalary(model))} icon={Calculator} tone="green" />
          <KpiCard label={t("salary.total")} value={formatCurrencyPrecise(salaryTotal(model.salary))} icon={CalendarRange} tone="amber" />
        </div>

        <section className="entry-account-overview">
          <div>
            <p className="entry-account-name">{t("salary.overviewTitle")}</p>
            <span>{t("salary.overviewSubtitle")}</span>
          </div>
          <div className="entry-account-actions">
            <div className="entry-account-total">
              <CalendarRange size={16} aria-hidden="true" />
              <strong>{rows.length}</strong>
              <span>{t("entry.yearBlocks")}</span>
            </div>
          </div>
        </section>

        <div className="year-card-list">
          {rows.map((row) => {
            const total = sum(row.months);
            return (
              <section className="year-card" key={row.year}>
                <div className="year-card-head">
                  <div>
                    <p className="year-card-label">{row.year}</p>
                    <strong>{formatCurrencyPrecise(total)}</strong>
                  </div>
                  <div className="year-card-meta">
                    <span>
                      <BriefcaseBusiness size={14} aria-hidden="true" />
                      {t("salary.monthlyNet")}
                    </span>
                  </div>
                </div>

                <div className="month-grid">
                  {row.months.map((value, monthIndex) => (
                    <label className="month-field" key={`${row.year}-${monthIndex}`}>
                      <span>{formatMonth(monthIndex, "short")}</span>
                      <DecimalInput value={value} onCommit={(nextValue) => updateMonth(row.year, monthIndex, nextValue)} />
                    </label>
                  ))}
                </div>

                <div className="year-card-foot">
                  <div />
                  <div className="year-total-box">
                    <span>{t("common.total")}</span>
                    <strong>{formatCurrencyPrecise(total)}</strong>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
