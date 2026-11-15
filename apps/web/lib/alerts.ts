import type { Analysis, Frame } from '@agent/lib/contracts';
export type AlertRecord = {
  id: string;
  createdAt: string;
  skill: string;
  analysis: Analysis;
  frames: Frame[];
  review: 'pending' | 'confirmed' | 'dismissed';
};
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('lookout-evidence', 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore('alerts', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function writeAlert(record: AlertRecord) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('alerts', 'readwrite');
      tx.objectStore('alerts').put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function readAlerts(): Promise<AlertRecord[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction('alerts').objectStore('alerts').getAll();
      req.onsuccess = () =>
        resolve(
          req.result.sort((a: AlertRecord, b: AlertRecord) =>
            b.createdAt.localeCompare(a.createdAt),
          ),
        );
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
