import { useEffect, useMemo, useState } from "react";
import { BarChart3, BriefcaseBusiness, ChevronDown, PiggyBank, RefreshCcw, Settings2, Target, TrendingUp, WalletCards, type LucideIcon } from "lucide-react";
import { I18nProvider, useI18n, type Language, type TranslationKey } from "./i18n";
import { loadLocalAppDocument, saveLocalAppDocument } from "./services/localDataService";
import { cloneBudget, cloneModel } from "./services/modelService";
import {
  createDefaultAppDocument,
  createPersonalProfile,
  createSharedProfile,
  deriveSharedBudgetIncome,
  openAppDocument,
  saveAppDocumentAs,
  saveAppDocumentToHandle,
  type JsonFileHandle,
} from "./services/storageService";
import type { AppProfile, BudgetPlan, SavingsModel } from "./types";
import { AccountsView } from "./views/accounts/AccountsView";
import { BudgetView } from "./views/budget/BudgetView";
import { DashboardView } from "./views/dashboard/DashboardView";
import { ProfilesView } from "./views/profiles/ProfilesView";
import { ProjectionView } from "./views/projection/ProjectionView";
import { SalaryView } from "./views/salary/SalaryView";
import { SimulationView } from "./views/simulation/SimulationView";

type View = "dashboard" | "accounts" | "salary" | "projection" | "simulation" | "budget" | "profiles";

type NavItem = {
  id: View;
  labelKey: TranslationKey;
  icon: LucideIcon;
};

type ProfileCreatorState = {
  name: string;
  kind: "personal" | "shared";
  hideSavings: boolean;
  hideAccounts: boolean;
  memberIds: string[];
};

const viewAllowedForProfile = (profile: AppProfile, view: View) => {
  if (view === "budget" || view === "profiles") return true;
  if (view === "accounts") return !profile.preferences.hideAccounts;
  if (view === "salary") return profile.kind === "personal" && !profile.preferences.hideSavings;
  return !profile.preferences.hideSavings;
};

const sanitizeBudgetForProfile = (budget: BudgetPlan, profile: AppProfile) => {
  if (profile.kind !== "shared") return cloneBudget(budget);
  const nextBudget = cloneBudget(budget);
  delete nextBudget.monthlyIncomeOverride;
  return nextBudget;
};

function AppShell({
  language,
  setLanguage,
  activeProfile,
  profileOptions,
  activeModel,
  baselineModel,
  budgetDraft,
  budgetDirty,
  incomeLocked,
  onChangeProfile,
  onOpenDocument,
  onSaveDocument,
  onSaveBudget,
  onSaveSimulation,
  onCreateProfile,
  setBudgetDraft,
  setModel,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  activeProfile: AppProfile;
  profileOptions: AppProfile[];
  activeModel: SavingsModel;
  baselineModel: SavingsModel;
  budgetDraft: BudgetPlan;
  budgetDirty: boolean;
  incomeLocked: boolean;
  onChangeProfile: (profileId: string) => void;
  onOpenDocument: () => void;
  onSaveDocument: () => void;
  onSaveBudget: () => void;
  onSaveSimulation: () => void;
  onCreateProfile: (profile: ProfileCreatorState) => void;
  setBudgetDraft: (budget: BudgetPlan) => void;
  setModel: (model: SavingsModel) => void;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<View>("dashboard");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const nav = useMemo<NavItem[]>(
    () => {
      const items: NavItem[] = [
        { id: "dashboard", labelKey: "nav.dashboard", icon: BarChart3 },
        { id: "accounts", labelKey: "nav.accounts", icon: WalletCards },
        { id: "salary", labelKey: "nav.salary", icon: BriefcaseBusiness },
        { id: "projection", labelKey: "nav.projection", icon: Target },
        { id: "simulation", labelKey: "nav.simulation", icon: TrendingUp },
        { id: "budget", labelKey: "nav.budget", icon: BriefcaseBusiness },
        { id: "profiles", labelKey: "nav.profiles", icon: Settings2 },
      ];
      return items.filter((item) => viewAllowedForProfile(activeProfile, item.id));
    },
    [activeProfile],
  );

  useEffect(() => {
    if (!nav.some((item) => item.id === view)) {
      setView(nav[0]?.id ?? "budget");
    }
  }, [nav, view]);

  const renderView = () => {
    if (view === "dashboard") return <DashboardView model={activeModel} />;
    if (view === "accounts") return <AccountsView model={activeModel} setModel={setModel} />;
    if (view === "salary") return <SalaryView model={activeModel} setModel={setModel} />;
    if (view === "projection") return <ProjectionView model={activeModel} setModel={setModel} />;
    if (view === "simulation") return <SimulationView model={activeModel} setModel={setModel} onSave={onSaveSimulation} />;
    if (view === "profiles") {
      return (
        <ProfilesView
          profiles={profileOptions}
          activeProfileId={activeProfile.id}
          onActivateProfile={onChangeProfile}
          onCreateProfile={onCreateProfile}
          onOpenDocument={onOpenDocument}
          onSaveDocument={onSaveDocument}
        />
      );
    }
    return (
      <BudgetView
        model={activeModel}
        budget={budgetDraft}
        setBudget={setBudgetDraft}
        onSaveBudget={onSaveBudget}
        budgetDirty={budgetDirty}
        incomeLocked={incomeLocked}
      />
    );
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

      <div className="content-shell">
        <div className="app-toolbar">
          <div />
          <div className="toolbar-group">
            <div className="profile-menu-shell">
              <button className="profile-trigger" onClick={() => setShowProfileMenu((value) => !value)} type="button">
                <div className="profile-trigger-copy">
                  <strong>{activeProfile.name}</strong>
                  <span>{activeProfile.kind === "shared" ? t("profile.shared") : t("profile.personal")}</span>
                </div>
                <ChevronDown size={16} aria-hidden="true" />
              </button>

              {showProfileMenu ? (
                <div className="profile-menu">
                  {profileOptions.map((profile) => (
                    <button
                      key={profile.id}
                      className={`profile-menu-item ${profile.id === activeProfile.id ? "active" : ""}`}
                      onClick={() => {
                        onChangeProfile(profile.id);
                        setShowProfileMenu(false);
                      }}
                      type="button"
                    >
                      <strong>{profile.name}</strong>
                      <span>{profile.kind === "shared" ? t("profile.shared") : t("profile.personal")}</span>
                    </button>
                  ))}
                  <button
                    className="profile-menu-item manage"
                    onClick={() => {
                      setView("profiles");
                      setShowProfileMenu(false);
                    }}
                    type="button"
                  >
                    <strong>{t("profile.manage")}</strong>
                    <span>{t("profile.manageHelp")}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {renderView()}
      </div>
    </div>
  );
}

export function App() {
  const initialDocument = createDefaultAppDocument();
  const [language, setLanguage] = useState<Language>(initialDocument.language);
  const [document, setDocument] = useState(initialDocument);
  const [fileHandle, setFileHandle] = useState<JsonFileHandle | null>(null);
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, BudgetPlan>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const localDocument = await loadLocalAppDocument();
      if (!localDocument || cancelled) return;
      setLanguage(localDocument.language);
      setDocument(localDocument);
      setBudgetDrafts({});
      setFileHandle(null);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeProfile = useMemo(
    () => document.profiles.find((profile) => profile.id === document.activeProfileId) ?? document.profiles[0],
    [document],
  );

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setDocument((current) => ({
      ...current,
      language: nextLanguage,
    }));
  };

  const sharedIncome = useMemo(
    () => (activeProfile.kind === "shared" ? deriveSharedBudgetIncome(document.profiles, activeProfile) : null),
    [activeProfile, document.profiles],
  );

  const budgetDraft = budgetDrafts[activeProfile.id] ?? cloneBudget(activeProfile.model.budget);
  const sanitizedDraft = sanitizeBudgetForProfile(budgetDraft, activeProfile);
  const budgetDirty = JSON.stringify(sanitizedDraft) !== JSON.stringify(sanitizeBudgetForProfile(activeProfile.model.budget, activeProfile));

  const activeModel = useMemo(() => {
    const model = cloneModel(activeProfile.model);
    if (activeProfile.kind === "shared") {
      model.budget = {
        ...model.budget,
        monthlyIncomeOverride: sharedIncome ?? 0,
      };
    }
    return model;
  }, [activeProfile, sharedIncome]);

  const baselineModel = useMemo(() => activeProfile.model, [activeProfile]);

  const exportDocument = async (nextDocument = document) => {
    if (fileHandle) {
      await saveAppDocumentToHandle(fileHandle, nextDocument);
      return;
    }

    const nextHandle = await saveAppDocumentAs(nextDocument);
    if (nextHandle) {
      setFileHandle(nextHandle);
    }
  };

  const persistDocument = async (nextDocument = document) => {
    const savedLocally = await saveLocalAppDocument(nextDocument);
    if (savedLocally) {
      return;
    }

    await exportDocument(nextDocument);
  };

  const updateActiveProfile = (updater: (profile: AppProfile) => AppProfile) => {
    setDocument((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => (profile.id === current.activeProfileId ? updater(profile) : profile)),
    }));
  };

  const setModel = (model: SavingsModel) => {
    updateActiveProfile((profile) => ({
      ...profile,
      model:
        profile.kind === "shared"
          ? {
              ...cloneModel(model),
              budget: sanitizeBudgetForProfile(model.budget, profile),
            }
          : cloneModel(model),
    }));
  };

  const setBudgetDraft = (budget: BudgetPlan) => {
    setBudgetDrafts((current) => ({
      ...current,
      [activeProfile.id]: sanitizeBudgetForProfile(budget, activeProfile),
    }));
  };

  const changeProfile = (profileId: string) => {
    setDocument((current) => ({
      ...current,
      activeProfileId: profileId,
    }));
  };

  const openDocument = async () => {
    const opened = await openAppDocument();
    if (!opened) return;
    setDocument(opened.document);
    setLanguage(opened.document.language);
    setFileHandle(opened.handle);
    setBudgetDrafts({});
  };

  const saveDocument = async () => {
    await exportDocument(document);
  };

  const saveBudget = async () => {
    const nextBudget = sanitizeBudgetForProfile(budgetDraft, activeProfile);
    const nextDocument = {
      ...document,
      profiles: document.profiles.map((profile) =>
        profile.id === activeProfile.id
          ? {
              ...profile,
              model: {
                ...profile.model,
                budget: nextBudget,
              },
            }
          : profile,
      ),
    };

    setDocument(nextDocument);
    setBudgetDrafts((current) => ({
      ...current,
      [activeProfile.id]: nextBudget,
    }));
    await persistDocument(nextDocument);
  };

  const saveSimulation = async () => {
    await persistDocument(document);
  };

  const createProfile = (draft: ProfileCreatorState) => {
    const profile =
      draft.kind === "shared"
        ? {
            ...createSharedProfile(draft.name.trim(), draft.memberIds),
            preferences: {
              hideSavings: draft.hideSavings,
              hideAccounts: draft.hideAccounts,
            },
          }
        : {
            ...createPersonalProfile(draft.name.trim(), undefined, language),
            preferences: {
              hideSavings: draft.hideSavings,
              hideAccounts: draft.hideAccounts,
            },
          };

    const nextDocument = {
      ...document,
      activeProfileId: profile.id,
      profiles: [...document.profiles, profile],
    };

    setDocument(nextDocument);
    void persistDocument(nextDocument);
  };

  return (
    <I18nProvider language={language} setLanguage={changeLanguage}>
      <AppShell
        language={language}
        setLanguage={changeLanguage}
        activeProfile={activeProfile}
        profileOptions={document.profiles}
        activeModel={activeModel}
        baselineModel={baselineModel}
        budgetDraft={activeProfile.kind === "shared" ? { ...sanitizedDraft, monthlyIncomeOverride: sharedIncome ?? 0 } : sanitizedDraft}
        budgetDirty={budgetDirty}
        incomeLocked={activeProfile.kind === "shared"}
        onChangeProfile={changeProfile}
        onOpenDocument={() => void openDocument()}
        onSaveDocument={() => void saveDocument()}
        onSaveBudget={() => void saveBudget()}
        onSaveSimulation={() => void saveSimulation()}
        onCreateProfile={createProfile}
        setBudgetDraft={setBudgetDraft}
        setModel={setModel}
      />
    </I18nProvider>
  );
}
