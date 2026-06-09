import { useI18n } from "../../i18n";
import { ViewHeader } from "../../shared/components/ViewHeader";
import type { Account, SavingsModel } from "../../types";
import { AccountCard } from "./AccountCard";

type AccountsViewProps = {
  model: SavingsModel;
  setModel: (model: SavingsModel) => void;
};

export function AccountsView({ model, setModel }: AccountsViewProps) {
  const { t } = useI18n();
  const groupedAccounts = model.accounts.reduce<Map<string, Account[]>>((groups, account) => {
    const key = account.institution || t("common.other");
    groups.set(key, [...(groups.get(key) ?? []), account]);
    return groups;
  }, new Map());

  return (
    <main className="view">
      <ViewHeader eyebrow={t("accounts.eyebrow")} title={t("accounts.title")} />

      <div className="group-stack">
        {[...groupedAccounts.entries()].map(([group, accounts]) => (
          <section className="account-group" key={group}>
            <div className="panel-title">
              <h2>{group}</h2>
            </div>
            <div className="account-grid">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} model={model} setModel={setModel} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
