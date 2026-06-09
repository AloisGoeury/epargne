import { parseAppDocument, type PersistedAppDocument } from "./storageService";

const localDocumentPath = "/__local-data__/epargne-data.json";

export const loadLocalAppDocument = async (): Promise<PersistedAppDocument | null> => {
  try {
    const response = await fetch(localDocumentPath, { cache: "no-store" });
    if (!response.ok) return null;
    return parseAppDocument(await response.text());
  } catch {
    return null;
  }
};
