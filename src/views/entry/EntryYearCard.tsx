import { CalendarDays, PiggyBank } from "lucide-react";
import { sum } from "../../calculations";
import { useI18n } from "../../i18n";
import { DecimalInput } from "../../shared/components/DecimalInput";
import type { YearEntries } from "../../types";

type EntryYearCardProps = {
  row: YearEntries;
  onChangeMonth: (year: number, monthIndex: number, nextValue: number) => void;
  onChangeInterest: (year: number, nextValue: number) => void;
};

export function EntryYearCard({ row, onChangeMonth, onChangeInterest }: EntryYearCardProps) {
  const { t, formatCurrencyPrecise, formatMonth } = useI18n();
  const yearTotal = sum(row.months) + row.interest;

  return (
    <section className="year-card">
      <div className="year-card-head">
        <div>
          <p className="year-card-label">{row.year}</p>
          <strong>{formatCurrencyPrecise(yearTotal)}</strong>
        </div>
        <div className="year-card-meta">
          <span>
            <CalendarDays size={14} aria-hidden="true" />
            {t("entry.monthlyMovements")}
          </span>
          <span>
            <PiggyBank size={14} aria-hidden="true" />
            {t("account.interests")}
          </span>
        </div>
      </div>

      <div className="month-grid">
        {row.months.map((value, monthIndex) => (
          <label className="month-field" key={`${row.year}-${monthIndex}`}>
            <span>{formatMonth(monthIndex, "short")}</span>
            <DecimalInput value={value} onCommit={(nextValue) => onChangeMonth(row.year, monthIndex, nextValue)} />
          </label>
        ))}
      </div>

      <div className="year-card-foot">
        <label className="field">
          <span>{t("account.interests")}</span>
          <DecimalInput value={row.interest} onCommit={(nextValue) => onChangeInterest(row.year, nextValue)} />
        </label>
        <div className="year-total-box">
          <span>{t("common.total")}</span>
          <strong>{formatCurrencyPrecise(yearTotal)}</strong>
        </div>
      </div>
    </section>
  );
}
