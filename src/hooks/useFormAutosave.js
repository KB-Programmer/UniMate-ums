import { useCallback, useEffect, useRef, useState } from "react";
import { clearDraft, loadDraft, saveDraft } from "../lib/draftService";

export const AUTOSAVE_DELAY_MS = 120000;

export function useFormAutosave({
  key, open, form, tagsText, initial, buildPayload, canSave, persist, onRestore, deps = [],
}) {
  const [status, setStatus] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [draftInfo, setDraftInfo] = useState(null);

  const recordIdRef = useRef(initial?.id || null);
  const signatureRef = useRef("");
  const payloadRef = useRef(null);
  const timerRef = useRef(null);
  const draftTimerRef = useRef(null);
  const statusTimerRef = useRef(null);
  const formRef = useRef(form);
  const tagsRef = useRef(tagsText);
  const openRef = useRef(open);
  const restoredKeyRef = useRef(null);
  const saveNowRef = useRef(() => {});

  const persistRef = useRef(persist);
  const buildRef = useRef(buildPayload);
  const canSaveRef = useRef(canSave);
  const restoreRef = useRef(onRestore);

  formRef.current = form;
  tagsRef.current = tagsText;
  openRef.current = open;
  persistRef.current = persist;
  buildRef.current = buildPayload;
  canSaveRef.current = canSave;
  restoreRef.current = onRestore;

  useEffect(() => {
    if (!open) restoredKeyRef.current = null;
    recordIdRef.current = initial?.id || null;
    signatureRef.current = "";
    payloadRef.current = null;
    clearTimeout(timerRef.current);
    clearTimeout(draftTimerRef.current);
    clearTimeout(statusTimerRef.current);
    setStatus("idle");
    setDraftInfo(null);
  }, [initial?.id, open]);

  useEffect(() => {
    if (!open || restoredKeyRef.current === key) return;
    const draft = loadDraft(key);
    restoredKeyRef.current = key;
    if (!draft) return;
    if (initial && draft.id !== initial.id) return;
    restoreRef.current?.(draft.form, draft.tagsText || "", draft);
    recordIdRef.current = draft.id || initial?.id || null;
    setDraftInfo({ savedAt: draft.savedAt || Date.now() });
    setStatus("restored");
  }, [open, key, initial?.id]);

  const saveNow = useCallback(() => {
    const currentForm = formRef.current;
    const currentTags = tagsRef.current;
    const payload = payloadRef.current || buildRef.current?.({ form: currentForm, tagsText: currentTags });
    if (!payload || !canSaveRef.current?.(payload, { form: currentForm, tagsText: currentTags })) return;
    clearTimeout(timerRef.current);
    clearTimeout(draftTimerRef.current);
    clearTimeout(statusTimerRef.current);
    setStatus("saving");
    try {
      const saved = persistRef.current(payload, recordIdRef.current);
      if (saved?.id) recordIdRef.current = saved.id;
      payloadRef.current = null;
      signatureRef.current = JSON.stringify({ form: currentForm, tagsText: currentTags });
      clearDraft(key);
      setStatus("saved");
      setLastSavedAt(Date.now());
      statusTimerRef.current = setTimeout(() => setStatus("idle"), 2500);
    } catch {
      saveDraft(key, { id: recordIdRef.current, form: currentForm, tagsText: currentTags });
      setStatus("error");
    }
  }, [key]);

  saveNowRef.current = saveNow;

  const markSubmitted = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(draftTimerRef.current);
    clearTimeout(statusTimerRef.current);
    payloadRef.current = null;
    signatureRef.current = "";
    clearDraft(key);
    setStatus("idle");
  }, [key]);

  useEffect(() => {
    if (!open) return undefined;
    const payload = buildRef.current?.({ form, tagsText });
    if (!payload || !canSaveRef.current?.(payload, { form, tagsText })) {
      setStatus("idle");
      return undefined;
    }
    const signature = JSON.stringify({ form, tagsText });
    if (signature === signatureRef.current) return undefined;
    signatureRef.current = signature;
    payloadRef.current = payload;
    setStatus("dirty");
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => saveDraft(key, { id: recordIdRef.current, form, tagsText }), 500);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveNowRef.current(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key, ...deps]);

  useEffect(() => () => {
    if (openRef.current && payloadRef.current) saveNowRef.current();
  }, []);

  return { status, lastSavedAt, draftInfo, flush: saveNow, markSubmitted };
}
