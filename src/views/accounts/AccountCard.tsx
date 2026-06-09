import { Landmark } from "lucide-react";
import {
  accountBalance,
  accountBookBalance,
  accountDeposits,
  accountInterests,
  accountValuationGap,
} from "../../calculations";
import { useI18n } from "../../i18n";
import { updateAccount } from "../../services/modelService";
import { DecimalInput } from "../../shared/components/DecimalInput";
import type { Account, SavingsModel } from "../../types";

type AccountCardProps = {
  account: Account;
  model: SavingsModel;
  setModel: (model: SavingsModel) => void;
};

function AccountMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function AccountCard({ account, model, setModel }: AccountCardProps) {
  const { t, formatCurrency, formatCurrencyPrecise } = useI18n();
  const balance = accountBalance(account);
  const bookBalance = accountBookBalance(account);
  const valuationGap = accountValuationGap(account);
  const capProgress = account.cap && account.cap < 100000000 ? balance / account.cap : 0;

  return (
    <section className="account-card">
      <div className="account-title">
        <Landmark size={20} aria-hidden="true" />
        <div>
          <h2>{account.bucket || account.name}</h2>
          {account.bucket ? <p className="account-subtitle">{account.name}</p> : null}
        </div>
      </div>

      <strong className="balance">{formatCurrencyPrecise(balance)}</strong>

      <dl>
        <AccountMetric label={t("account.startBalance")} value={formatCurrencyPrecise(account.startBalance)} />
        <AccountMetric label={t("account.deposits")} value={formatCurrencyPrecise(accountDeposits(account))} />
        <AccountMetric label={t("account.interests")} value={formatCurrencyPrecise(accountInterests(account))} />
        <AccountMetric label={t("account.bookBalance")} value={formatCurrencyPrecise(bookBalance)} />
      </dl>

      {account.cap && account.cap < 100000000 ? (
        <div className="cap-block">
          <div>
            <span>{t("account.cap")}</span>
            <strong>{formatCurrency(account.cap)}</strong>
          </div>
          <div className="progress-track small">
            <div style={{ width: `${Math.min(capProgress * 100, 100)}%` }} />
          </div>
        </div>
      ) : null}

      {account.currentValue !== undefined ? (
        <label className="field">
          <span>{t("account.currentValue")}</span>
          <DecimalInput
            value={account.currentValue}
            onCommit={(nextValue) =>
              setModel(updateAccount(model, account.id, (item) => ({ ...item, currentValue: nextValue })))
            }
          />
        </label>
      ) : null}

      {account.currentValue !== undefined ? (
        <div className="note-box">
          <span>{t("account.valuationGap")}</span>
          <strong>{formatCurrencyPrecise(valuationGap)}</strong>
          <p>{t("account.valuationGapHelp")}</p>
        </div>
      ) : null}
    </section>
  );
}
