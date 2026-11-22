import { DRAFT_PREFIX } from "./storageService";

const draftKey = (key) => `${DRAFT_PREFIX}${key}`;

export function saveDraft(key, payload) {
  try {
    localStorage.setItem(draftKey(key), JSON.stringify({ ...payload, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(draftKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.form ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(draftKey(key));
  } catch {
    return false;
  }
  return true;
}

export function listDrafts() {
  const drafts = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(DRAFT_PREFIX)) continue;
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      if (parsed?.form) drafts.push({ key: key.slice(DRAFT_PREFIX.length), ...parsed });
    }
  } catch {
    return drafts;
  }
  return drafts;
}
