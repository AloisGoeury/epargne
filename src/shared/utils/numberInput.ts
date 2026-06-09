export const numberValue = (value: string) => {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/[._](?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  if (normalized === "") return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const decimalInputValue = (value: number | undefined) => {
  if (value === undefined) return "";
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 6, useGrouping: false });
};
