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

export const saveLocalAppDocument = async (document: PersistedAppDocument): Promise<boolean> => {
  try {
    const response = await fetch(localDocumentPath, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(document),
    });

    return response.ok;
  } catch {
    return false;
  }
};
