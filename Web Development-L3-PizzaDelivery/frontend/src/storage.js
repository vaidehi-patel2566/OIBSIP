const DRAFT = "forno_draft";
const BUILDER = "forno_builder";

function read(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function saveDraft(draft) {
  sessionStorage.setItem(DRAFT, JSON.stringify(draft));
}

export function readDraft() {
  return read(DRAFT);
}

export function saveBuilder(state) {
  sessionStorage.setItem(BUILDER, JSON.stringify(state));
}

export function readBuilder() {
  return read(BUILDER);
}

export function clearOrderSession() {
  sessionStorage.removeItem(DRAFT);
  sessionStorage.removeItem(BUILDER);
}
