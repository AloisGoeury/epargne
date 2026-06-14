import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

const outputPath = path.resolve(process.cwd(), ".local/epargne-data.json");

const args = process.argv.slice(2);
const workbookArg = args.find((arg) => !arg.startsWith("--")) ?? "Epargne_Finale.xlsx";
const profileArg = args.find((arg) => arg.startsWith("--profile="))?.slice("--profile=".length).trim() || null;
const documentArg = args.find((arg) => arg.startsWith("--document="))?.slice("--document=".length).trim() || null;
const workbookPath = path.resolve(process.cwd(), workbookArg);
const documentPath = documentArg ? path.resolve(process.cwd(), documentArg) : outputPath;

const emptyMonths = () => Array.from({ length: 12 }, () => 0);

const fallbackModel = {
  goal: 300000,
  projectionTarget: 650000,
  annualReturn: 0.04,
  projectionYears: 35,
  accounts: [],
  salary: Array.from({ length: 20 }, (_, index) => ({
    year: 2024 + index,
    months: emptyMonths(),
  })),
  budget: {
    categories: [
      { id: "housing", label: "Logement", amount: 950 },
      { id: "rent", label: "Loyer", amount: 760, parentId: "housing" },
      { id: "home-insurance", label: "Assurance habitation", amount: 25, parentId: "housing" },
      { id: "electricity", label: "Electricite", amount: 70, parentId: "housing" },
      { id: "food", label: "Alimentation", amount: 0 },
      { id: "groceries", label: "Courses", amount: 280, parentId: "food" },
      { id: "eating-out", label: "Restaurants", amount: 90, parentId: "food" },
      { id: "transport", label: "Transport", amount: 120 },
      { id: "subscriptions", label: "Abonnements", amount: 45 },
      { id: "health", label: "Sante", amount: 40 },
      { id: "leisure", label: "Loisirs", amount: 0 },
      { id: "sports", label: "Sport", amount: 45, parentId: "leisure" },
      { id: "trips", label: "Sorties", amount: 70, parentId: "leisure" },
      { id: "shopping", label: "Shopping", amount: 60, parentId: "leisure" },
      { id: "other", label: "Autres", amount: 110 },
    ],
  },
  simulationEvents: [
    {
      id: "salary-raise-2027",
      type: "salary_raise",
      label: "Augmentation annuelle",
      year: 2027,
      month: 1,
      deltaMonthlySalary: 180,
      savedShare: 0.5,
    },
    {
      id: "property-2031",
      type: "property_purchase",
      label: "Achat residence principale",
      year: 2031,
      month: 4,
      downPayment: 35000,
      monthlyPayment: 1150,
      recurringMonths: 240,
    },
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const sharedContributionCategoryId = "shared-contribution";
const sharedContributionCategoryLabelByLanguage = {
  fr: "Compte commun",
  en: "Shared account",
};
const sharedContributionAliases = ["Compte commun", "Shared account"].map((value) => value.toLowerCase());

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const makeYears = (rows) => {
  const byYear = new Map(rows.map((row) => [row.year, row]));
  return Array.from({ length: 20 }, (_, index) => {
    const year = 2024 + index;
    return byYear.get(year) ?? { year, months: emptyMonths(), interest: 0 };
  });
};

const getNumber = (cell) => {
  const value = cell.value;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(",", ".")) || 0;
  if (value && typeof value === "object" && "result" in value) {
    const result = value.result;
    return typeof result === "number" ? result : Number(result) || 0;
  }
  return 0;
};

const getText = (cell) => {
  const value = cell.value;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "result" in value) return String(value.result ?? "");
  return "";
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const readYearBlock = (sheet, startRow, interestColumn) => {
  const rows = [];

  for (let rowIndex = startRow; rowIndex < startRow + 20; rowIndex += 1) {
    const year = getNumber(sheet.getCell(rowIndex, 1));
    if (!year) continue;
    rows.push({
      year,
      months: Array.from({ length: 12 }, (_, monthIndex) => getNumber(sheet.getCell(rowIndex, monthIndex + 2))),
      interest: interestColumn ? getNumber(sheet.getCell(rowIndex, interestColumn)) : 0,
    });
  }

  return makeYears(rows);
};

const readLegacyAccount = (sheet) => ({
  id: slugify(getText(sheet.getCell("B1")) || sheet.name),
  name: getText(sheet.getCell("B1")) || sheet.name,
  institution: sheet.name.includes("Livret") ? "Epargne reglementee" : sheet.name.includes("Participation") ? "Entreprise" : "Assurance vie",
  type: sheet.name.includes("Participation") ? "employee" : sheet.name.includes("Assurance") ? "insurance" : "cash",
  startBalance: getNumber(sheet.getCell("D1")),
  currentValue: getNumber(sheet.getCell("G1")) || undefined,
  cap: getNumber(sheet.getCell("J1")) || undefined,
  expectedReturn: sheet.name === "Participation" ? getNumber(sheet.getCell("J1")) || undefined : undefined,
  entries: readYearBlock(sheet, 5, 14),
});

const lastNonZeroInColumn = (sheet, column, startRow, endRow) => {
  let last = 0;
  for (let row = startRow; row <= endRow; row += 1) {
    const value = getNumber(sheet.getCell(row, column));
    if (value !== 0) last = value;
  }
  return last || undefined;
};

const readLegacyTradeRepublic = (sheet) => {
  const cashEntries = readYearBlock(sheet, 5);
  const cashInterests = readYearBlock(sheet, 78, 14);
  const entries = cashEntries.map((row, index) => ({
    year: row.year,
    months: row.months,
    interest: cashInterests[index]?.interest ?? 0,
  }));

  return [
    {
      id: "trade-republic-compte",
      name: "Trade Republic - Compte",
      institution: "Trade Republic",
      bucket: "Compte especes",
      type: "cash",
      startBalance: getNumber(sheet.getCell("D1")),
      currentValue: lastNonZeroInColumn(sheet, 14, 52, 71),
      cap: getNumber(sheet.getCell("E50")) || undefined,
      entries,
    },
    {
      id: "trade-republic-bourse",
      name: "Trade Republic - Bourse",
      institution: "Trade Republic",
      bucket: "Bourse",
      type: "investment",
      startBalance: 0,
      currentValue: getNumber(sheet.getCell("N123")) || undefined,
      entries: readYearBlock(sheet, 28),
    },
    {
      id: "trade-republic-pea",
      name: "Trade Republic - PEA",
      institution: "Trade Republic",
      bucket: "PEA",
      type: "investment",
      startBalance: 0,
      currentValue: getNumber(sheet.getCell("N172")) || undefined,
      entries: readYearBlock(sheet, 128),
    },
  ];
};

const importFromManagedWorkbook = (workbook, fallback) => {
  const accountsSheet = workbook.getWorksheet("Comptes");
  const movementsSheet = workbook.getWorksheet("Mouvements");
  const projectionSheet = workbook.getWorksheet("Projection");
  const salarySheet = workbook.getWorksheet("Salaire");

  if (!accountsSheet || !movementsSheet) return null;

  const accountRows = accountsSheet.getSheetValues().slice(2).filter(Boolean);
  const movementRows = movementsSheet.getSheetValues().slice(2).filter(Boolean);
  const movementMap = new Map();

  for (const row of movementRows) {
    const accountId = String(row[1] ?? "");
    const year = Number(row[4] ?? 0);
    if (!accountId || !year) continue;
    const entry = {
      year,
      months: Array.from({ length: 12 }, (_, index) => Number(row[index + 5] ?? 0)),
      interest: Number(row[17] ?? 0),
    };
    movementMap.set(accountId, [...(movementMap.get(accountId) ?? []), entry]);
  }

  const accounts = accountRows.map((row) => ({
    id: String(row[1] ?? ""),
    institution: String(row[2] ?? "") || undefined,
    bucket: String(row[3] ?? "") || undefined,
    name: String(row[4] ?? ""),
    type: String(row[5] ?? "cash"),
    startBalance: Number(row[6] ?? 0),
    currentValue: Number(row[10] ?? 0) || undefined,
    cap: Number(row[11] ?? 0) || undefined,
    entries: makeYears(movementMap.get(String(row[1] ?? "")) ?? []),
  }));

  const salary =
    salarySheet &&
    makeYears(
      Array.from({ length: 20 }, (_, index) => {
        const rowIndex = 2 + index;
        const year = getNumber(salarySheet.getCell(rowIndex, 1));
        return year
          ? {
              year,
              months: Array.from({ length: 12 }, (_, monthIndex) => getNumber(salarySheet.getCell(rowIndex, monthIndex + 2))),
              interest: 0,
            }
          : undefined;
      }).filter(Boolean),
    ).map(({ year, months }) => ({ year, months }));

  return {
    goal: projectionSheet ? getNumber(projectionSheet.getCell("B4")) || fallback.goal : fallback.goal,
    projectionTarget: projectionSheet ? getNumber(projectionSheet.getCell("B3")) || fallback.projectionTarget : fallback.projectionTarget,
    annualReturn: projectionSheet ? getNumber(projectionSheet.getCell("B1")) || fallback.annualReturn : fallback.annualReturn,
    projectionYears: projectionSheet ? getNumber(projectionSheet.getCell("B2")) || fallback.projectionYears : fallback.projectionYears,
    accounts: accounts.length ? accounts : fallback.accounts,
    salary: salary || fallback.salary,
    budget: fallback.budget,
    simulationEvents: fallback.simulationEvents,
  };
};

const importWorkbook = (workbook, fallback) => {
  const managed = importFromManagedWorkbook(workbook, fallback);
  if (managed) return managed;

  const legacySheetNames = ["Livret Jeune", "Livret A", "Participation", "Assurance Vie"];
  const accounts = legacySheetNames.map((name) => workbook.getWorksheet(name)).filter(Boolean).map(readLegacyAccount);

  const tradeSheet = workbook.getWorksheet("Trade Republique");
  if (tradeSheet) accounts.splice(2, 0, ...readLegacyTradeRepublic(tradeSheet));

  const savings = workbook.getWorksheet("Mise en épargne");
  const projection = workbook.getWorksheet("Projections");
  const salarySheet = workbook.getWorksheet("Salaire");

  const salary = salarySheet
    ? makeYears(
        Array.from({ length: 20 }, (_, index) => {
          const rowIndex = 5 + index;
          const year = getNumber(salarySheet.getCell(rowIndex, 1));
          return year
            ? {
                year,
                months: Array.from({ length: 12 }, (_, monthIndex) => getNumber(salarySheet.getCell(rowIndex, monthIndex + 2))),
                interest: 0,
              }
            : undefined;
        }).filter(Boolean),
      ).map(({ year, months }) => ({ year, months }))
    : fallback.salary;

  return {
    goal: savings ? getNumber(savings.getCell("C1")) || fallback.goal : fallback.goal,
    projectionTarget: projection ? getNumber(projection.getCell("B6")) || fallback.projectionTarget : fallback.projectionTarget,
    annualReturn: projection ? getNumber(projection.getCell("B1")) || fallback.annualReturn : fallback.annualReturn,
    projectionYears: projection ? getNumber(projection.getCell("B3")) || fallback.projectionYears : fallback.projectionYears,
    accounts: accounts.length ? accounts : fallback.accounts,
    salary,
    budget: fallback.budget,
    simulationEvents: fallback.simulationEvents,
  };
};

const findSharedContributionCategory = (budget) =>
  budget.categories.find((category) => category.id === sharedContributionCategoryId || sharedContributionAliases.includes(category.label.trim().toLowerCase()));

const ensureSharedContributionCategory = (budget, language) => {
  if (findSharedContributionCategory(budget)) {
    return clone(budget);
  }

  return {
    ...clone(budget),
    categories: [
      ...budget.categories,
      {
        id: sharedContributionCategoryId,
        label: sharedContributionCategoryLabelByLanguage[language] ?? sharedContributionCategoryLabelByLanguage.fr,
        amount: 0,
      },
    ],
  };
};

const createPersonalProfile = (name, model, language) => ({
  id: makeId(),
  name,
  kind: "personal",
  preferences: {
    hideSavings: false,
    hideAccounts: false,
  },
  sharedContributionCategoryId,
  model: {
    ...clone(model),
    budget: ensureSharedContributionCategory(model.budget, language),
  },
});

const createDocumentFromModel = (model, language = "fr") => {
  const profile = createPersonalProfile(language === "en" ? "Me" : "Moi", model, language);
  return {
    version: 2,
    language,
    activeProfileId: profile.id,
    profiles: [profile],
  };
};

const isSavingsModel = (value) =>
  typeof value === "object" && value !== null && Array.isArray(value.accounts) && Array.isArray(value.salary);

const normalizeDocument = (raw) => {
  if (raw && typeof raw === "object" && Array.isArray(raw.profiles)) {
    const language = raw.language === "en" ? "en" : "fr";
    const profiles = raw.profiles.map((profile) => {
      if (profile.kind === "shared") {
        return {
          ...clone(profile),
          preferences: {
            hideSavings: true,
            hideAccounts: true,
            ...(profile.preferences ?? {}),
          },
          memberIds: [...(profile.memberIds ?? [])],
        };
      }

      return {
        ...clone(profile),
        kind: "personal",
        preferences: {
          hideSavings: false,
          hideAccounts: false,
          ...(profile.preferences ?? {}),
        },
        sharedContributionCategoryId: findSharedContributionCategory(profile.model.budget)?.id || profile.sharedContributionCategoryId || sharedContributionCategoryId,
        model: {
          ...clone(profile.model),
          budget: ensureSharedContributionCategory(profile.model.budget, language),
        },
      };
    });

    const activeProfileId = profiles.some((profile) => profile.id === raw.activeProfileId) ? raw.activeProfileId : profiles[0]?.id;
    if (!activeProfileId) {
      return createDocumentFromModel(fallbackModel, language);
    }

    return {
      version: 2,
      language,
      activeProfileId,
      profiles,
    };
  }

  if (isSavingsModel(raw)) {
    return createDocumentFromModel(raw, "fr");
  }

  if (raw && typeof raw === "object" && isSavingsModel(raw.model)) {
    return createDocumentFromModel(raw.model, raw.language === "en" ? "en" : "fr");
  }

  return createDocumentFromModel(fallbackModel, "fr");
};

const readExistingDocument = async () => {
  try {
    const raw = JSON.parse(await fs.readFile(documentPath, "utf8"));
    return normalizeDocument(raw);
  } catch {
    return null;
  }
};

const resolveTargetProfile = (document) => {
  const personalProfiles = document.profiles.filter((profile) => profile.kind === "personal");
  if (personalProfiles.length === 0) {
    return null;
  }

  if (profileArg) {
    const normalized = profileArg.toLowerCase();
    const explicit = personalProfiles.find((profile) => profile.id === profileArg || profile.name.toLowerCase() === normalized);
    if (!explicit) {
      throw new Error(`No personal profile matches "${profileArg}".`);
    }
    return explicit;
  }

  const active = personalProfiles.find((profile) => profile.id === document.activeProfileId);
  return active ?? personalProfiles[0];
};

const mergeImportedModel = (currentModel, importedModel) => ({
  ...clone(currentModel),
  goal: importedModel.goal,
  projectionTarget: importedModel.projectionTarget,
  annualReturn: importedModel.annualReturn,
  projectionYears: importedModel.projectionYears,
  accounts: importedModel.accounts,
  salary: importedModel.salary,
});

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(workbookPath);

const existingDocument = await readExistingDocument();
const baseDocument = existingDocument ?? createDocumentFromModel(fallbackModel, "fr");
const targetProfile = resolveTargetProfile(baseDocument) ?? createPersonalProfile(baseDocument.language === "en" ? "Imported" : "Importe", fallbackModel, baseDocument.language);
const importedModel = importWorkbook(workbook, targetProfile.model ?? fallbackModel);

let nextDocument;
if (existingDocument) {
  const hasTarget = baseDocument.profiles.some((profile) => profile.id === targetProfile.id);
  nextDocument = {
    ...baseDocument,
    activeProfileId: baseDocument.activeProfileId,
    profiles: hasTarget
      ? baseDocument.profiles.map((profile) =>
          profile.id === targetProfile.id
            ? {
                ...profile,
                model: mergeImportedModel(profile.model, importedModel),
              }
            : profile,
        )
      : [
          ...baseDocument.profiles,
          {
            ...targetProfile,
            model: mergeImportedModel(targetProfile.model, importedModel),
          },
        ],
  };
} else {
  const createdProfile = {
    ...targetProfile,
    model: mergeImportedModel(targetProfile.model, importedModel),
  };
  nextDocument = {
    version: 2,
    language: baseDocument.language,
    activeProfileId: createdProfile.id,
    profiles: [createdProfile],
  };
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(nextDocument, null, 2)}\n`, "utf8");

console.log(
  `Wrote ${path.relative(process.cwd(), outputPath)} from ${path.relative(process.cwd(), workbookPath)} into profile "${targetProfile.name}" using ${path.relative(process.cwd(), documentPath)} as base`,
);
