const DB_NAME = "unimate_hybrid_v1";
const DB_VERSION = 1;
const RECORD_STORE = "records";
const META_STORE = "meta";
const COLLECTION_INDEX = "by_collection";

let dbPromise = null;

export function isIndexedDbAvailable() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

export function openIndexedDb() {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let request;
    try {
      request = window.indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      dbPromise = null;
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORD_STORE)) {
        const store = db.createObjectStore(RECORD_STORE, { keyPath: "key" });
        store.createIndex(COLLECTION_INDEX, "collection", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      resolve(null);
    };
    request.onblocked = () => {
      dbPromise = null;
      resolve(null);
    };
  });
  return dbPromise;
}

export const recordStorageKey = (collection, id) => `${collection}::${id}`;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

export async function idbGetAll() {
  const db = await openIndexedDb();
  if (!db) return [];
  const transaction = db.transaction(RECORD_STORE, "readonly");
  const rows = await requestToPromise(transaction.objectStore(RECORD_STORE).getAll());
  return Array.isArray(rows) ? rows : [];
}

export async function idbGetCollection(collection) {
  const db = await openIndexedDb();
  if (!db) return [];
  const transaction = db.transaction(RECORD_STORE, "readonly");
  const index = transaction.objectStore(RECORD_STORE).index(COLLECTION_INDEX);
  const rows = await requestToPromise(index.getAll(collection));
  return Array.isArray(rows) ? rows : [];
}

export async function idbPutMany(entries = []) {
  const db = await openIndexedDb();
  if (!db || !entries.length) return 0;
  const transaction = db.transaction(RECORD_STORE, "readwrite");
  const store = transaction.objectStore(RECORD_STORE);
  entries.forEach(({ collection, record }) => {
    if (!collection || !record || !record.id) return;
    store.put({
      key: recordStorageKey(collection, record.id),
      collection,
      id: record.id,
      updatedAt: record.updatedAt || new Date().toISOString(),
      data: record,
    });
  });
  await transactionDone(transaction);
  return entries.length;
}

export async function idbDeleteMany(entries = []) {
  const db = await openIndexedDb();
  if (!db || !entries.length) return 0;
  const transaction = db.transaction(RECORD_STORE, "readwrite");
  const store = transaction.objectStore(RECORD_STORE);
  entries.forEach(({ collection, id }) => {
    if (!collection || !id) return;
    store.delete(recordStorageKey(collection, id));
  });
  await transactionDone(transaction);
  return entries.length;
}

export async function idbGetMeta(key) {
  const db = await openIndexedDb();
  if (!db) return null;
  const transaction = db.transaction(META_STORE, "readonly");
  const row = await requestToPromise(transaction.objectStore(META_STORE).get(key));
  return row ? row.value : null;
}

export async function idbSetMeta(key, value) {
  const db = await openIndexedDb();
  if (!db) return false;
  const transaction = db.transaction(META_STORE, "readwrite");
  transaction.objectStore(META_STORE).put({ key, value, updatedAt: new Date().toISOString() });
  await transactionDone(transaction);
  return true;
}

export async function idbEstimateBytes() {
  const rows = await idbGetAll();
  try {
    return new Blob([JSON.stringify(rows)]).size;
  } catch {
    return JSON.stringify(rows).length;
  }
}

export async function idbClearAll() {
  const db = await openIndexedDb();
  if (!db) return false;
  const transaction = db.transaction([RECORD_STORE, META_STORE], "readwrite");
  transaction.objectStore(RECORD_STORE).clear();
  transaction.objectStore(META_STORE).clear();
  await transactionDone(transaction);
  return true;
}
