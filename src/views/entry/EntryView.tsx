import { useEffect, useState } from "react";
import { ArrowUpFromLine, CalendarRange, Plus, WalletCards } from "lucide-react";
import { accountBalance, accountDeposits, accountInterests, sum } from "../../calculations";
import { useI18n } from "../../i18n";
import { updateAccount } from "../../services/modelService";
import { KpiCard } from "../../shared/components/KpiCard";
import { ViewHeader } from "../../shared/components/ViewHeader";
import type { SavingsModel } from "../../types";
import { EntryYearCard } from "./EntryYearCard";

type EntryViewProps = {
  model: SavingsModel;
  setModel: (model: SavingsModel) => void;
};

export function EntryView({ model, setModel }: EntryViewProps) {
  const { t, formatCurrencyPrecise } = useI18n();
  const [accountId, setAccountId] = useState(model.accounts[0]?.id ?? "");
  const [showAllYears, setShowAllYears] = useState(false);
  const account = model.accounts.find((item) => item.id === accountId) ?? model.accounts[0];

  useEffect(() => {
    if (!model.accounts.some((item) => item.id === accountId)) {
      setAccountId(model.accounts[0]?.id ?? "");
    }
  }, [accountId, model.accounts]);

  if (!account) return null;

  const currentYear = new Date().getFullYear();
  const visibleEntries = showAllYears
    ? account.entries
    : account.entries.filter((row) => sum(row.months) !== 0 || row.interest !== 0 || Math.abs(row.year - currentYear) <= 1);

  const changeMonth = (year: number, monthIndex: number, value: number) => {
    setModel(
      updateAccount(model, account.id, (item) => ({
        ...item,
        entries: item.entries.map((row) =>
          row.year === year
            ? {
                ...row,
                months: row.months.map((month, index) => (index === monthIndex ? value : month)),
              }
            : row,
        ),
      })),
    );
  };

  const changeInterest = (year: number, value: number) => {
    setModel(
      updateAccount(model, account.id, (item) => ({
        ...item,
        entries: item.entries.map((row) => (row.year === year ? { ...row, interest: value } : row)),
      })),
    );
  };

  return (
    <main className="view">
      <ViewHeader
        eyebrow={t("entry.eyebrow")}
        title={t("entry.title")}
        actions={
          <select value={account.id} onChange={(event) => setAccountId(event.target.value)} className="select">
            {model.accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        }
      />

      <section className="entry-panel">
        <div className="entry-summary">
          <KpiCard label={t("entry.balance")} value={formatCurrencyPrecise(accountBalance(account))} icon={WalletCards} tone="blue" />
          <KpiCard label={t("account.deposits")} value={formatCurrencyPrecise(accountDeposits(account))} icon={ArrowUpFromLine} tone="green" />
          <KpiCard label={t("account.interests")} value={formatCurrencyPrecise(accountInterests(account))} icon={Plus} tone="amber" />
        </div>

        <section className="entry-account-overview">
          <div>
            <p className="entry-account-name">{account.name}</p>
            <span>{account.institution ?? account.type}</span>
          </div>
          <div className="entry-account-actions">
            <div className="entry-account-total">
              <CalendarRange size={16} aria-hidden="true" />
              <strong>{visibleEntries.length}</strong>
              <span>{t("entry.yearBlocks")}</span>
            </div>
            <button className="action-button compact" onClick={() => setShowAllYears((value) => !value)}>
              {showAllYears ? t("entry.showLess") : t("entry.showAllYears")}
            </button>
          </div>
        </section>

        <div className="year-card-list">
          {visibleEntries.map((row) => (
            <EntryYearCard key={row.year} row={row} onChangeMonth={changeMonth} onChangeInterest={changeInterest} />
          ))}
        </div>
      </section>
    </main>
  );
}
