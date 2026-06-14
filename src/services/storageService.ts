import { initialModel } from "../data";
import type { Language } from "../i18n";
import type { AppProfile, BudgetPlan, ProfileKind, SavingsModel } from "../types";
import { cloneBudget, cloneModel } from "./modelService";

type FilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

export type JsonFileHandle = {
  kind: "file";
  name: string;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
  getFile: () => Promise<File>;
};

export type PersistedAppDocument = {
  version: 2;
  language: Language;
  activeProfileId: string;
  profiles: AppProfile[];
};

declare global {
  interface Window {
    showOpenFilePicker?: (options?: { multiple?: boolean; types?: FilePickerAcceptType[] }) => Promise<JsonFileHandle[]>;
    showSaveFilePicker?: (options?: { suggestedName?: string; types?: FilePickerAcceptType[] }) => Promise<JsonFileHandle>;
  }
}

export const sharedContributionCategoryId = "shared-contribution";
export const sharedContributionCategoryLabel = "Compte commun";
const sharedContributionAliases = [sharedContributionCategoryLabel, "Shared account"].map((value) => value.toLowerCase());

const defaultDocumentName = "epargne-data.json";
const jsonPickerTypes: FilePickerAcceptType[] = [
  {
    description: "Savings JSON",
    accept: {
      "application/json": [".json"],
    },
  },
];

const emptyMonths = () => Array.from({ length: 12 }, () => 0);

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isSavingsModel = (value: unknown): value is SavingsModel =>
  typeof value === "object" && value !== null && Array.isArray((value as SavingsModel).accounts) && Array.isArray((value as SavingsModel).salary);

const findSharedContributionCategory = (budget: BudgetPlan) =>
  budget.categories.find((category) => category.id === sharedContributionCategoryId || sharedContributionAliases.includes(category.label.trim().toLowerCase()));

const ensureBudgetCategory = (budget: BudgetPlan, id: string, label: string): BudgetPlan => {
  if (findSharedContributionCategory(budget)) return cloneBudget(budget);
  return {
    ...cloneBudget(budget),
    categories: [...budget.categories, { id, label, amount: 0 }],
  };
};

const createSharedBaseModel = (): SavingsModel => ({
  ...cloneModel(initialModel),
  accounts: [],
  salary: initialModel.salary.map((row) => ({ year: row.year, months: emptyMonths() })),
  simulationEvents: [],
  budget: cloneBudget(initialModel.budget),
});

const normalizePersonalModel = (model: SavingsModel, contributionCategoryId = sharedContributionCategoryId) => ({
  ...cloneModel(model),
  budget: ensureBudgetCategory(model.budget, contributionCategoryId, sharedContributionCategoryLabel),
});

const normalizeProfile = (profile: AppProfile): AppProfile => {
  const kind: ProfileKind = profile.kind === "shared" ? "shared" : "personal";
  const basePreferences = {
    hideSavings: kind === "shared",
    hideAccounts: kind === "shared",
  };

  if (kind === "shared") {
    return {
      ...profile,
      kind,
      preferences: { ...basePreferences, ...profile.preferences },
      model: cloneModel(profile.model),
      memberIds: [...(profile.memberIds ?? [])],
      sharedContributionCategoryId: undefined,
    };
  }

  const existingSharedCategory = findSharedContributionCategory(profile.model.budget);
  const contributionCategoryId = existingSharedCategory?.id || profile.sharedContributionCategoryId || sharedContributionCategoryId;
  return {
    ...profile,
    kind,
    preferences: { ...basePreferences, ...profile.preferences },
    sharedContributionCategoryId: contributionCategoryId,
    model: normalizePersonalModel(profile.model, contributionCategoryId),
    memberIds: undefined,
  };
};

export const createPersonalProfile = (name: string, model: SavingsModel = cloneModel(initialModel), language: Language = "fr"): AppProfile => {
  const label = language === "en" ? "Shared account" : sharedContributionCategoryLabel;
  return normalizeProfile({
    id: makeId(),
    name,
    kind: "personal",
    preferences: {
      hideSavings: false,
      hideAccounts: false,
    },
    sharedContributionCategoryId,
    model: {
      ...cloneModel(model),
      budget: ensureBudgetCategory(model.budget, sharedContributionCategoryId, label),
    },
  });
};

export const createSharedProfile = (name: string, memberIds: string[]): AppProfile =>
  normalizeProfile({
    id: makeId(),
    name,
    kind: "shared",
    preferences: {
      hideSavings: true,
      hideAccounts: true,
    },
    memberIds,
    model: createSharedBaseModel(),
  });

const createDocumentFromModel = (model: SavingsModel, language: Language): PersistedAppDocument => {
  const profile = createPersonalProfile(language === "en" ? "Me" : "Moi", model, language);
  return {
    version: 2,
    language,
    activeProfileId: profile.id,
    profiles: [profile],
  };
};

export const createDefaultAppDocument = (): PersistedAppDocument => createDocumentFromModel(cloneModel(initialModel), "fr");

export const deriveSharedBudgetIncome = (profiles: AppProfile[], profile: AppProfile) =>
  (profile.memberIds ?? []).reduce((total, memberId) => {
    const member = profiles.find((candidate) => candidate.id === memberId && candidate.kind === "personal");
    if (!member) return total;
    const categoryId = member.sharedContributionCategoryId || sharedContributionCategoryId;
    const category = member.model.budget.categories.find((item) => item.id === categoryId);
    return total + (category?.amount ?? 0);
  }, 0);

export const parseAppDocument = (raw: string): PersistedAppDocument => {
  const parsed = JSON.parse(raw) as PersistedAppDocument | { version: 1; language?: Language; model: SavingsModel } | SavingsModel;

  if (isSavingsModel(parsed)) {
    return createDocumentFromModel(parsed, "fr");
  }

  if (parsed && typeof parsed === "object" && "profiles" in parsed && Array.isArray(parsed.profiles)) {
    const profiles = parsed.profiles.map(normalizeProfile);
    const activeProfileId = profiles.some((profile) => profile.id === parsed.activeProfileId) ? parsed.activeProfileId : profiles[0]?.id;
    if (!activeProfileId) {
      throw new Error("Invalid JSON document");
    }
    return {
      version: 2,
      language: parsed.language === "en" ? "en" : "fr",
      activeProfileId,
      profiles,
    };
  }

  if (!parsed || typeof parsed !== "object" || !("model" in parsed) || !isSavingsModel(parsed.model)) {
    throw new Error("Invalid JSON document");
  }

  return createDocumentFromModel(parsed.model, parsed.language === "en" ? "en" : "fr");
};

export const readAppDocumentFile = async (file: File) => parseAppDocument(await file.text());

export const openAppDocument = async () => {
  if (!window.showOpenFilePicker) return null;

  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: jsonPickerTypes,
  });
  const file = await handle.getFile();

  return {
    handle,
    fileName: handle.name,
    document: await readAppDocumentFile(file),
  };
};

export const saveAppDocumentToHandle = async (handle: JsonFileHandle, document: PersistedAppDocument) => {
  const writable = await handle.createWritable();
  await writable.write(`${JSON.stringify(document, null, 2)}\n`);
  await writable.close();
};

const downloadJson = (appDocument: PersistedAppDocument, fileName = defaultDocumentName) => {
  const blob = new Blob([`${JSON.stringify(appDocument, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

export const saveAppDocumentAs = async (document: PersistedAppDocument) => {
  if (!window.showSaveFilePicker) {
    downloadJson(document);
    return null;
  }

  const handle = await window.showSaveFilePicker({
    suggestedName: defaultDocumentName,
    types: jsonPickerTypes,
  });
  await saveAppDocumentToHandle(handle, document);
  return handle;
};
