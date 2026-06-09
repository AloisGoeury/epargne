import { initialModel } from "../data";
import type { Language } from "../i18n";
import type { SavingsModel } from "../types";
import { cloneModel } from "./modelService";

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

declare global {
  interface Window {
    showOpenFilePicker?: (options?: { multiple?: boolean; types?: FilePickerAcceptType[] }) => Promise<JsonFileHandle[]>;
    showSaveFilePicker?: (options?: { suggestedName?: string; types?: FilePickerAcceptType[] }) => Promise<JsonFileHandle>;
  }
}

export type PersistedAppDocument = {
  version: 1;
  language: Language;
  model: SavingsModel;
};

const defaultDocumentName = "epargne-data.json";
const jsonPickerTypes: FilePickerAcceptType[] = [
  {
    description: "Savings JSON",
    accept: {
      "application/json": [".json"],
    },
  },
];

export const createDefaultAppDocument = (): PersistedAppDocument => ({
  version: 1,
  language: "fr",
  model: cloneModel(initialModel),
});

export const createAppDocument = (model: SavingsModel, language: Language): PersistedAppDocument => ({
  version: 1,
  language,
  model,
});

const isSavingsModel = (value: unknown): value is SavingsModel =>
  typeof value === "object" && value !== null && Array.isArray((value as SavingsModel).accounts) && Array.isArray((value as SavingsModel).salary);

export const parseAppDocument = (raw: string): PersistedAppDocument => {
  const parsed = JSON.parse(raw) as PersistedAppDocument | SavingsModel;

  if (isSavingsModel(parsed)) {
    return {
      version: 1,
      language: "fr",
      model: parsed,
    };
  }

  if (!parsed || typeof parsed !== "object" || !("model" in parsed) || !isSavingsModel(parsed.model)) {
    throw new Error("Invalid JSON document");
  }

  return {
    version: 1,
    language: parsed.language === "en" ? "en" : "fr",
    model: parsed.model,
  };
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
