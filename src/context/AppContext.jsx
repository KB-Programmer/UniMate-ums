import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  loadData, saveData, sanitizeData, getStorageInfo, StorageQuotaError, BACKUP_KEY,
  COLLECTIONS, refreshDerivedCollections, initializeHybridStorage, persistHybridChanges, weekKeyFor,
} from "../lib/storageService";
import { createSnapshot, loadBackups, deleteSnapshot, clearSnapshots, mergeData } from "../lib/backupService";
import { buildReminders, sendBrowserNotification } from "../lib/notificationService";
import { emptyData } from "../lib/sampleData";
import { uid } from "../lib/utils";
import { MODULES } from "../lib/importExport";
import { useToast } from "./ToastContext";

const AppContext = createContext(null);

function mergeBootData(current, incoming) {
  const next = { ...incoming };
  const settings = { ...(incoming.settings || {}), ...(current.settings || {}) };
  COLLECTIONS.forEach((collection) => {
    const byId = new Map();
    (Array.isArray(incoming[collection]) ? incoming[collection] : []).forEach((item) => {
      if (item && item.id) byId.set(item.id, item);
    });
    (Array.isArray(current[collection]) ? current[collection] : []).forEach((item) => {
      if (!item || !item.id) return;
      const existing = byId.get(item.id);
      if (!existing || String(item.updatedAt || "") > String(existing.updatedAt || "")) byId.set(item.id, item);
    });
    next[collection] = Array.from(byId.values());
  });
  next.settings = settings;
  return refreshDerivedCollections(next);
}

export function AppProvider({ children }) {
  const [data, setData] = useState(() => loadData());
  const [backups, setBackups] = useState(() => loadBackups());
  const [storage, setStorage] = useState(() => getStorageInfo(null));
  const [storageReady, setStorageReady] = useState(false);
  const [storageMode, setStorageMode] = useState("localStorage");
  const dataRef = useRef(data);
  const persistedRef = useRef(null);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const commit = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return refreshDerivedCollections({ ...next, updatedAt: new Date().toISOString() });
    });
  }, []);

  /* Hybrid storage boot: LocalStorage first for instant UI, IndexedDB for structured records */
  useEffect(() => {
    let cancelled = false;
    initializeHybridStorage(dataRef.current).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setData((prev) => mergeBootData(prev, result.data));
        persistedRef.current = result.data;
      }
      setStorageMode(result.available ? "hybrid" : "localStorage");
      setStorageReady(true);
      setStorage(getStorageInfo(result.data));
      if (result.warning) toastRef.current.warning("Storage mode", result.warning);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Persist IndexedDB changes + LocalStorage mirror with debounce and quota recovery */
  useEffect(() => {
    if (!storageReady) return undefined;
    const timer = setTimeout(async () => {
      const payload = { ...data, updatedAt: data.updatedAt || new Date().toISOString() };
      try {
        const result = await persistHybridChanges(payload, persistedRef.current || {});
        persistedRef.current = payload;
        setStorageMode(result.idb ? "hybrid" : "localStorage");
        if (result.mirrorError instanceof StorageQuotaError) {
          try {
            const existing = loadBackups();
            window.localStorage.setItem(BACKUP_KEY, JSON.stringify(existing.slice(0, 1)));
            saveData(payload);
            setBackups(existing.slice(0, 1));
            toastRef.current.warning("Storage space recovered", "Older automatic backups were removed to save your latest changes.");
          } catch {
            toastRef.current.warning("Local mirror is full", "Your changes are saved in IndexedDB. Export your data, then remove old backups in Settings → Data.");
          }
        } else if (result.mirrorError) {
          toastRef.current.warning("Local mirror unavailable", "Your changes are saved in IndexedDB. Check browser privacy settings for LocalStorage.");
        }
      } catch (error) {
        toastRef.current.error("Could not save data", "Your latest change may not be saved. Export your data immediately.");
      }
      setStorage(getStorageInfo(payload));
    }, 300);
    return () => clearTimeout(timer);
  }, [data, storageReady]);

  /* Debounced automatic internal backups */
  useEffect(() => {
    if (!data.settings?.autoBackupEnabled) return undefined;
    const timer = setTimeout(() => {
      const result = createSnapshot(data, "Automatic backup", data.settings.maxBackups);
      if (result.created) {
        setBackups(result.backups);
        setStorage(getStorageInfo(data));
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [data]);

  /* Generate in-app and browser reminders at most every 30 seconds */
  useEffect(() => {
    const scan = () => {
      if (!dataRef.current.settings?.notificationsEnabled) return;
      const delivered = buildReminders(dataRef.current);
      if (!delivered.length) return;
      const now = new Date().toISOString();
      const notifications = delivered.map(({ notification }) => ({
        id: uid("ntf"), title: notification.title,
        message: notification.message, type: notification.category.toLowerCase().replace(/\s+/g, "-"),
        sourceType: notification.sourceType, sourceId: notification.sourceId,
        createdAt: now, readAt: null,
      }));
      setData((prev) => ({ ...prev, notifications: [...notifications, ...(prev.notifications || [])], updatedAt: now }));
      if (dataRef.current.settings?.browserNotifications) {
        delivered.forEach(({ notification }) => {
          sendBrowserNotification(notification.title, notification.message, `${notification.sourceType}-${notification.sourceId}`);
        });
      }
    };
    const initial = setTimeout(scan, 5000);
    const interval = setInterval(scan, 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  const addItem = useCallback(
    (collection, values) => {
      const now = new Date().toISOString();
      const record = { id: uid(collection.slice(0, 3)), createdAt: now, updatedAt: now, ...values };
      commit((prev) => ({ ...prev, [collection]: [record, ...(prev[collection] || [])] }));
      return record;
    },
    [commit]
  );

  const updateItem = useCallback(
    (collection, id, patch) => {
      commit((prev) => ({
        ...prev,
        [collection]: (prev[collection] || []).map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
        ),
      }));
    },
    [commit]
  );

  const deleteItem = useCallback(
    (collection, id) => {
      commit((prev) => ({ ...prev, [collection]: (prev[collection] || []).filter((item) => item.id !== id) }));
    },
    [commit]
  );

  const deleteMany = useCallback(
    (collection, ids) => {
      const set = new Set(ids);
      commit((prev) => ({ ...prev, [collection]: (prev[collection] || []).filter((item) => !set.has(item.id)) }));
    },
    [commit]
  );

  const bulkAdd = useCallback(
    (collection, records) => {
      const now = new Date().toISOString();
      const withIds = records.map((record) => ({
        ...record, id: record.id || uid(collection.slice(0, 3)), createdAt: record.createdAt || now, updatedAt: now,
      }));
      commit((prev) => ({ ...prev, [collection]: [...withIds, ...(prev[collection] || [])] }));
      return withIds.length;
    },
    [commit]
  );

  const importModule = useCallback(
    (moduleKey, records) => {
      const mod = MODULES[moduleKey];
      if (!mod) return 0;
      return bulkAdd(mod.collection, records.map((r) => (mod.type ? { ...r, type: mod.type } : r)));
    },
    [bulkAdd]
  );

  const addNotification = useCallback(
    (payload, { dedupe = true } = {}) => {
      const now = new Date().toISOString();
      commit((prev) => {
        const list = prev.notifications || [];
        if (dedupe && payload.sourceType && payload.sourceId) {
          const exists = list.some(
            (n) => n.sourceType === payload.sourceType && n.sourceId === payload.sourceId && n.title === payload.title
          );
          if (exists) return prev;
        }
        return {
          ...prev,
          notifications: [{ id: uid("ntf"), createdAt: now, readAt: null, type: "system", ...payload }, ...list].slice(0, 200),
        };
      });
    },
    [commit]
  );

  const markNotificationRead = useCallback(
    (id) => updateItem("notifications", id, { readAt: new Date().toISOString() }),
    [updateItem]
  );
  const markAllNotificationsRead = useCallback(() => {
    const now = new Date().toISOString();
    commit((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((n) => (n.readAt ? n : { ...n, readAt: now })),
    }));
  }, [commit]);
  const deleteNotification = useCallback((id) => deleteItem("notifications", id), [deleteItem]);
  const clearNotifications = useCallback(() => {
    commit((prev) => ({ ...prev, notifications: [] }));
  }, [commit]);

  const setActiveWeek = useCallback(
    (weekStart) => updateSettingsSafe({ activeWeekStart: weekStart }),
    []
  );

  function updateSettingsSafe(patch) {
    commit((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }

  const setTimetableMode = useCallback(
    (mode) => updateSettingsSafe({ timetableMode: mode === "permanent" ? "permanent" : "weekly" }),
    []
  );

  const addTimetableClass = useCallback(
    (values, weekStart) => {
      const now = new Date().toISOString();
      const record = { id: uid("cls"), createdAt: now, updatedAt: now, ...values };
      commit((prev) => {
        if (prev.settings?.timetableMode === "permanent") {
          return { ...prev, permanentTimetable: [record, ...(prev.permanentTimetable || [])] };
        }
        const key = weekStart || prev.settings?.activeWeekStart || weekKeyFor();
        const plans = [...(prev.weeklyTimetables || [])];
        const index = plans.findIndex((plan) => plan.weekStart === key);
        if (index < 0) {
          plans.push({ id: uid("wpl"), weekStart: key, label: "", classes: [], createdAt: now, updatedAt: now });
        } else {
          plans[index] = { ...plans[index], classes: [record, ...(plans[index].classes || [])], updatedAt: now };
        }
        return { ...prev, weeklyTimetables: plans, settings: { ...prev.settings, activeWeekStart: key } };
      });
      return record;
    },
    [commit]
  );

  const updateTimetableClass = useCallback(
    (id, patch, weekStart) => {
      commit((prev) => {
        const apply = (list) => (list || []).map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
        );
        if (prev.settings?.timetableMode === "permanent") {
          return { ...prev, permanentTimetable: apply(prev.permanentTimetable) };
        }
        const key = weekStart || prev.settings?.activeWeekStart || weekKeyFor();
        return {
          ...prev,
          weeklyTimetables: (prev.weeklyTimetables || []).map((plan) =>
            plan.weekStart === key ? { ...plan, classes: apply(plan.classes), updatedAt: new Date().toISOString() } : plan
          ),
        };
      });
    },
    [commit]
  );

  const deleteTimetableClass = useCallback(
    (id, weekStart) => {
      commit((prev) => {
        if (prev.settings?.timetableMode === "permanent") {
          return { ...prev, permanentTimetable: (prev.permanentTimetable || []).filter((item) => item.id !== id) };
        }
        const key = weekStart || prev.settings?.activeWeekStart || weekKeyFor();
        return {
          ...prev,
          weeklyTimetables: (prev.weeklyTimetables || []).map((plan) =>
            plan.weekStart === key
              ? { ...plan, classes: (plan.classes || []).filter((item) => item.id !== id), updatedAt: new Date().toISOString() }
              : plan
          ),
        };
      });
    },
    [commit]
  );

  const createWeekPlan = useCallback(
    (weekStart, { sourceWeekStart = null, label = "" } = {}) => {
      let created = null;
      commit((prev) => {
        const plans = [...(prev.weeklyTimetables || [])];
        if (plans.some((plan) => plan.weekStart === weekStart)) return prev;
        const source = sourceWeekStart ? plans.find((plan) => plan.weekStart === sourceWeekStart) : null;
        const now = new Date().toISOString();
        created = {
          id: uid("wpl"), weekStart, label,
          classes: (source?.classes || []).map((item) => ({ ...item, id: uid("cls"), createdAt: now, updatedAt: now })),
          createdAt: now, updatedAt: now,
        };
        plans.push(created);
        return { ...prev, weeklyTimetables: plans };
      });
      return created;
    },
    [commit]
  );

  const renameWeekPlan = useCallback(
    (weekStart, label) => {
      commit((prev) => ({
        ...prev,
        weeklyTimetables: (prev.weeklyTimetables || []).map((plan) =>
          plan.weekStart === weekStart ? { ...plan, label: String(label || ""), updatedAt: new Date().toISOString() } : plan
        ),
      }));
    },
    [commit]
  );

  const deleteWeekPlan = useCallback(
    (weekStart) => {
      commit((prev) => ({
        ...prev,
        weeklyTimetables: (prev.weeklyTimetables || []).filter((plan) => plan.weekStart !== weekStart),
      }));
    },
    [commit]
  );

  const updateSettings = useCallback((patch) => updateSettingsSafe(patch), []);

  const refreshBackups = useCallback(() => setBackups(loadBackups()), []);

  const backupNow = useCallback(
    (reason = "Manual backup") => {
      const result = createSnapshot(dataRef.current, reason, dataRef.current.settings?.maxBackups || 5);
      setBackups(result.backups || loadBackups());
      if (result.created) {
        addNotification({ title: "Internal backup created", message: `${reason} · ${new Date().toLocaleString()}`, type: "system" });
      }
      return result;
    },
    [addNotification]
  );

  const deleteBackupSnapshot = useCallback((id) => {
    setBackups(deleteSnapshot(id));
  }, []);

  const clearAllBackups = useCallback(() => {
    clearSnapshots();
    setBackups([]);
  }, []);

  const restoreData = useCallback(
    (incoming, mode = "replace") => {
      const safety = createSnapshot(dataRef.current, "Safety snapshot before restore", dataRef.current.settings?.maxBackups || 5);
      let result;
      if (mode === "merge") {
        const merged = mergeData(dataRef.current, incoming);
        commit(merged.data);
        result = { mode, added: merged.added, skipped: merged.skipped, safetyCreated: safety.created };
      } else {
        const next = sanitizeData(incoming);
        commit(next);
        result = { mode: "replace", added: null, skipped: null, safetyCreated: safety.created };
      }
      setBackups(loadBackups());
      addNotification({
        title: mode === "merge" ? "Backup merged" : "Backup restored",
        message: mode === "merge" ? "New records were merged from the selected backup." : "All workspace data was restored from the selected backup.",
        type: "system",
      });
      return result;
    },
    [commit, addNotification]
  );

  const resetAllData = useCallback(() => {
    createSnapshot(dataRef.current, "Safety snapshot before reset", dataRef.current.settings?.maxBackups || 5);
    const settings = { ...dataRef.current.settings, sampleData: false };
    commit(emptyData(settings));
    setBackups(loadBackups());
    addNotification({ title: "Workspace reset", message: "All records were removed. Your appearance and study preferences were kept.", type: "system" });
  }, [commit, addNotification]);

  const clearSampleData = useCallback(() => {
    createSnapshot(dataRef.current, "Safety snapshot before clearing sample data", dataRef.current.settings?.maxBackups || 5);
    const settings = { ...dataRef.current.settings, sampleData: false };
    const fresh = emptyData(settings);
    commit(fresh);
    setBackups(loadBackups());
    addNotification({ title: "Sample data cleared", message: "Your workspace is now empty and ready for your own semester.", type: "system" });
  }, [commit, addNotification]);

  const unreadCount = useMemo(() => (data.notifications || []).filter((n) => !n.readAt).length, [data.notifications]);

  const value = useMemo(
    () => ({
      data, setData, commit, addItem, updateItem, deleteItem, deleteMany, bulkAdd, importModule,
      addNotification, markNotificationRead, markAllNotificationsRead, deleteNotification, clearNotifications,
      updateSettings, backups, refreshBackups, backupNow, deleteBackupSnapshot, clearAllBackups, restoreData,
      resetAllData, clearSampleData, storage, storageReady, storageMode, unreadCount,
      setActiveWeek, setTimetableMode, addTimetableClass, updateTimetableClass, deleteTimetableClass,
      createWeekPlan, renameWeekPlan, deleteWeekPlan,
    }),
    [
      data, commit, addItem, updateItem, deleteItem, deleteMany, bulkAdd, importModule, addNotification,
      markNotificationRead, markAllNotificationsRead, deleteNotification, clearNotifications, updateSettings,
      backups, refreshBackups, backupNow, deleteBackupSnapshot, clearAllBackups, restoreData, resetAllData,
      clearSampleData, storage, storageReady, storageMode, unreadCount,
      setActiveWeek, setTimetableMode, addTimetableClass, updateTimetableClass, deleteTimetableClass,
      createWeekPlan, renameWeekPlan, deleteWeekPlan,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
