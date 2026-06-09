import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  PiggyBank,
  RefreshCcw,
  Target,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { I18nProvider, useI18n, type Language, type TranslationKey } from "./i18n";
import { loadLocalAppDocument } from "./services/localDataService";
import { cloneModel } from "./services/modelService";
import { createDefaultAppDocument } from "./services/storageService";
import type { SavingsModel } from "./types";
import { AccountsView } from "./views/accounts/AccountsView";
import { BudgetView } from "./views/budget/BudgetView";
import { DashboardView } from "./views/dashboard/DashboardView";
import { ProjectionView } from "./views/projection/ProjectionView";
import { SalaryView } from "./views/salary/SalaryView";
import { SimulationView } from "./views/simulation/SimulationView";

type View = "dashboard" | "accounts" | "salary" | "projection" | "simulation" | "budget";

type NavItem = {
  id: View;
  labelKey: TranslationKey;
  icon: LucideIcon;
};

type AppShellProps = {
  language: Language;
  setLanguage: (language: Language) => void;
  baselineModel: SavingsModel;
  model: SavingsModel;
  setModel: (model: SavingsModel) => void;
};

function AppShell({ language, setLanguage, baselineModel, model, setModel }: AppShellProps) {
  const { t } = useI18n();
  const [view, setView] = useState<View>("dashboard");

  const nav = useMemo<NavItem[]>(
    () => [
      { id: "dashboard", labelKey: "nav.dashboard", icon: BarChart3 },
      { id: "accounts", labelKey: "nav.accounts", icon: WalletCards },
      { id: "salary", labelKey: "nav.salary", icon: BriefcaseBusiness },
      { id: "projection", labelKey: "nav.projection", icon: Target },
      { id: "simulation", labelKey: "nav.simulation", icon: TrendingUp },
      { id: "budget", labelKey: "nav.budget", icon: BriefcaseBusiness },
    ],
    [],
  );

  const renderView = () => {
    if (view === "dashboard") return <DashboardView model={model} />;
    if (view === "accounts") return <AccountsView model={model} setModel={setModel} />;
    if (view === "salary") return <SalaryView model={model} setModel={setModel} />;
    if (view === "projection") return <ProjectionView model={model} setModel={setModel} />;
    if (view === "simulation") return <SimulationView model={model} setModel={setModel} />;
    return <BudgetView model={model} setModel={setModel} />;
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <PiggyBank size={24} aria-hidden="true" />
          <span>{t("app.brand")}</span>
        </div>

        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            const label = t(item.labelKey);
            return (
              <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)} title={label}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-actions">
          <select className="language-select" value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label="Language">
            <option value="fr">{t("language.fr")}</option>
            <option value="en">{t("language.en")}</option>
          </select>
          <button onClick={() => setModel(cloneModel(baselineModel))} title={t("actions.reset")}>
            <RefreshCcw size={18} aria-hidden="true" />
            <span>{t("actions.reset")}</span>
          </button>
        </div>
      </aside>

      {renderView()}
    </div>
  );
}

export function App() {
  const initialDocument = createDefaultAppDocument();
  const [language, setLanguage] = useState<Language>(initialDocument.language);
  const [baselineModel, setBaselineModel] = useState<SavingsModel>(initialDocument.model);
  const [model, setModel] = useState<SavingsModel>(initialDocument.model);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const localDocument = await loadLocalAppDocument();
      if (!localDocument || cancelled) return;
      setLanguage(localDocument.language);
      setBaselineModel(cloneModel(localDocument.model));
      setModel(cloneModel(localDocument.model));
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      <AppShell
        language={language}
        setLanguage={setLanguage}
        baselineModel={baselineModel}
        model={model}
        setModel={setModel}
      />
    </I18nProvider>
  );
}
