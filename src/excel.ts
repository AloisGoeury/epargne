import ExcelJS from "exceljs";
import {
  accountBalance,
  accountBookBalance,
  accountDeposits,
  accountInterests,
  accountValuationGap,
  monthNames,
  totalGains,
  totalSavings,
} from "./calculations";
import type { Account, SavingsModel, YearEntries } from "./types";

const legacySheetNames = ["Livret Jeune", "Livret A", "Participation", "Assurance Vie"];

const getNumber = (cell: ExcelJS.Cell): number => {
  const value = cell.value;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(",", ".")) || 0;
  if (value && typeof value === "object" && "result" in value) {
    const result = value.result;
    return typeof result === "number" ? result : Number(result) || 0;
  }
  return 0;
};

const getText = (cell: ExcelJS.Cell): string => {
  const value = cell.value;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && "result" in value) return String(value.result ?? "");
  return "";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const makeYears = (rows: YearEntries[]) => {
  const byYear = new Map(rows.map((row) => [row.year, row]));
  return Array.from({ length: 20 }, (_, index) => {
    const year = 2024 + index;
    return byYear.get(year) ?? { year, months: Array.from({ length: 12 }, () => 0), interest: 0 };
  });
};

const readYearBlock = (sheet: ExcelJS.Worksheet, startRow: number, interestColumn?: number) => {
  const rows: YearEntries[] = [];

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

const readLegacyAccount = (sheet: ExcelJS.Worksheet): Account => ({
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

const lastNonZeroInColumn = (sheet: ExcelJS.Worksheet, column: number, startRow: number, endRow: number) => {
  let last = 0;
  for (let row = startRow; row <= endRow; row += 1) {
    const value = getNumber(sheet.getCell(row, column));
    if (value !== 0) last = value;
  }
  return last || undefined;
};

const readLegacyTradeRepublic = (sheet: ExcelJS.Worksheet): Account[] => {
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

const importFromManagedWorkbook = (workbook: ExcelJS.Workbook, fallback: SavingsModel): SavingsModel | null => {
  const accountsSheet = workbook.getWorksheet("Comptes");
  const movementsSheet = workbook.getWorksheet("Mouvements");
  const projectionSheet = workbook.getWorksheet("Projection");
  const salarySheet = workbook.getWorksheet("Salaire");

  if (!accountsSheet || !movementsSheet) return null;

  const accountRows = accountsSheet.getSheetValues().slice(2).filter(Boolean) as Array<Array<string | number>>;
  const movementRows = movementsSheet.getSheetValues().slice(2).filter(Boolean) as Array<Array<string | number>>;

  const movementMap = new Map<string, YearEntries[]>();
  for (const row of movementRows) {
    const accountId = String(row[1] ?? "");
    const year = Number(row[4] ?? 0);
    if (!accountId || !year) continue;
    const entry: YearEntries = {
      year,
      months: Array.from({ length: 12 }, (_, index) => Number(row[index + 5] ?? 0)),
      interest: Number(row[17] ?? 0),
    };
    movementMap.set(accountId, [...(movementMap.get(accountId) ?? []), entry]);
  }

  const accounts: Account[] = accountRows.map((row) => ({
    id: String(row[1] ?? ""),
    institution: String(row[2] ?? "") || undefined,
    bucket: String(row[3] ?? "") || undefined,
    name: String(row[4] ?? ""),
    type: String(row[5] ?? "cash") as Account["type"],
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
      }).filter((row): row is YearEntries => Boolean(row)),
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

export const importModelFromExcel = async (file: File, fallback: SavingsModel): Promise<SavingsModel> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const managed = importFromManagedWorkbook(workbook, fallback);
  if (managed) return managed;

  const accounts = legacySheetNames
    .map((name) => workbook.getWorksheet(name))
    .filter((sheet): sheet is ExcelJS.Worksheet => Boolean(sheet))
    .map(readLegacyAccount);

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
        }).filter((row): row is YearEntries => Boolean(row)),
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

const setMoneyFormat = (worksheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromCol: number, toCol: number) => {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let col = fromCol; col <= toCol; col += 1) {
      worksheet.getCell(row, col).numFmt = "#,##0.00 [$€-fr-FR]";
    }
  }
};

export const exportModelToExcel = async (model: SavingsModel) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Epargne App";
  workbook.created = new Date();

  const dashboard = workbook.addWorksheet("Synthese");
  dashboard.columns = [{ width: 28 }, { width: 18 }, { width: 24 }, { width: 18 }];
  dashboard.addRows([
    ["Indicateur", "Valeur", "Indicateur", "Valeur"],
    ["Epargne totale", totalSavings(model), "Objectif long terme", model.goal],
    ["Progression objectif", totalSavings(model) / model.goal, "Gains cumules", totalGains(model)],
    ["Versements", model.accounts.reduce((total, account) => total + accountDeposits(account), 0), "Interets saisis", model.accounts.reduce((total, account) => total + accountInterests(account), 0)],
  ]);
  dashboard.getRow(1).font = { bold: true };
  dashboard.getCell("B3").numFmt = "0.00%";
  setMoneyFormat(dashboard, 2, 4, 2, 4);

  const accountsSheet = workbook.addWorksheet("Comptes");
  accountsSheet.columns = [
    { header: "ID", width: 26 },
    { header: "Institution", width: 20 },
    { header: "Poche", width: 18 },
    { header: "Compte", width: 28 },
    { header: "Type", width: 14 },
    { header: "Solde depart", width: 16 },
    { header: "Versements", width: 16 },
    { header: "Interets", width: 16 },
    { header: "Solde calcule", width: 16 },
    { header: "Valeur actuelle", width: 16 },
    { header: "Ecart valorisation", width: 18 },
    { header: "Plafond", width: 16 },
  ];
  accountsSheet.getRow(1).font = { bold: true };
  model.accounts.forEach((account) => {
    accountsSheet.addRow([
      account.id,
      account.institution ?? "",
      account.bucket ?? "",
      account.name,
      account.type,
      account.startBalance,
      accountDeposits(account),
      accountInterests(account),
      accountBookBalance(account),
      accountBalance(account),
      accountValuationGap(account),
      account.cap ?? "",
    ]);
  });
  setMoneyFormat(accountsSheet, 2, model.accounts.length + 5, 6, 12);

  const movements = workbook.addWorksheet("Mouvements");
  movements.columns = [
    { header: "Compte ID", width: 26 },
    { header: "Institution", width: 20 },
    { header: "Poche", width: 18 },
    { header: "Annee", width: 10 },
    ...monthNames.map((month) => ({ header: month, width: 13 })),
    { header: "Interets", width: 13 },
    { header: "Total", width: 13 },
  ];
  movements.getRow(1).font = { bold: true };
  model.accounts.forEach((account) => {
    account.entries.forEach((row) => {
      movements.addRow([
        account.id,
        account.institution ?? "",
        account.bucket ?? "",
        row.year,
        ...row.months,
        row.interest,
        row.months.reduce((a, b) => a + b, 0) + row.interest,
      ]);
    });
  });
  setMoneyFormat(movements, 2, model.accounts.length * 20 + 5, 5, 18);

  const tradeSheet = workbook.addWorksheet("Trade Republic");
  tradeSheet.columns = [
    { header: "Poche", width: 18 },
    { header: "Annee", width: 10 },
    ...monthNames.map((month) => ({ header: month, width: 12 })),
    { header: "Interets", width: 12 },
    { header: "Total", width: 12 },
    { header: "Valeur actuelle", width: 16 },
  ];
  tradeSheet.getRow(1).font = { bold: true };
  model.accounts
    .filter((account) => account.institution === "Trade Republic")
    .forEach((account) => {
      account.entries.forEach((row, index) => {
        tradeSheet.addRow([
          account.bucket ?? account.name,
          row.year,
          ...row.months,
          row.interest,
          row.months.reduce((a, b) => a + b, 0) + row.interest,
          index === 0 ? accountBalance(account) : "",
        ]);
      });
    });
  setMoneyFormat(tradeSheet, 2, 80, 3, 17);

  const salary = workbook.addWorksheet("Salaire");
  salary.columns = [{ header: "Annee", width: 10 }, ...monthNames.map((month) => ({ header: month, width: 13 })), { header: "Total", width: 13 }];
  salary.getRow(1).font = { bold: true };
  model.salary.forEach((row) => salary.addRow([row.year, ...row.months, row.months.reduce((a, b) => a + b, 0)]));
  setMoneyFormat(salary, 2, model.salary.length + 5, 2, 14);

  const projection = workbook.addWorksheet("Projection");
  projection.columns = [{ width: 28 }, { width: 18 }];
  projection.addRows([
    ["Taux annuel", model.annualReturn],
    ["Nombre d'annees", model.projectionYears],
    ["Objectif projection", model.projectionTarget],
    ["Objectif actuel", model.goal],
  ]);
  projection.getCell("B1").numFmt = "0.00%";
  setMoneyFormat(projection, 3, 4, 2, 2);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `epargne-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};
