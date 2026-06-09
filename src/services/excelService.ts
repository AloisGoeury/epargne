import type { SavingsModel } from "../types";

export const importSavingsModelFromExcel = async (file: File, currentModel: SavingsModel) => {
  const { importModelFromExcel } = await import("../excel");
  return importModelFromExcel(file, currentModel);
};

export const exportSavingsModelToExcel = async (model: SavingsModel) => {
  const { exportModelToExcel } = await import("../excel");
  await exportModelToExcel(model);
};
