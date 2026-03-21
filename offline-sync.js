// ════════════════════════════════════════════════════════════
// ✅ FEATURE 3: OFFLINE SYNC (IndexedDB)
// ════════════════════════════════════════════════════════════
const OFFLINE_DB_NAME = 'novatech-offline';
const OFFLINE_DB_VER = 2; // ✅ version বাড়ালাম — expense store যোগ
let _offlineDB = null;

async function getOfflineDB() {
  if (_offlineDB) return _offlineDB;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VER);
    req.onupgradeneeded = e => {
      const window._db = e.target.result;
      if (!window._db.objectStoreNames.contains('pendingSales'))
        window._db.createObjectStore('pendingSales', { keyPath: 'localId' });
      if (!window._db.objectStoreNames.contains('pendingExpenses'))
        window._db.createObjectStore('pendingExpenses', { keyPath: 'localId' });
      // ✅ synced store — duplicate check-এর জন্য
      if (!window._db.objectStoreNames.contains('syncedIds'))
        window._db.createObjectStore('syncedIds', { keyPath: 'id' });
    };
    req.onsuccess = e => { _offlineDB = e.target.result; resolve(_offlineDB); };
    req.onerror = () => reject(req.error);
  });
}

async function saveToOfflineQueue(store, data) {
  const window._db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = window._db.transaction(store, 'readwrite');
    tx.objectStore(store).put({ ...data, _savedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllOfflineItems(store) {
  const window._db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = window._db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearOfflineStore(store) {
  const window._db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = window._db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// ✅ synced id check — duplicate বন্ধ করতে
async function isAlreadySynced(localId) {
  const window._db = await getOfflineDB();
  return new Promise(resolve => {
    const tx = window._db.transaction('syncedIds', 'readonly');
    const req = tx.objectStore('syncedIds').get(String(localId));
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => resolve(false);
  });
}
async function markAsSynced(localId) {
  const window._db = await getOfflineDB();
  return new Promise(resolve => {
    const tx = window._db.transaction('syncedIds', 'readwrite');
    tx.objectStore('syncedIds').put({ id: String(localId), ts: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

// ✅ Pending count badge আপডেট
async function updateOfflineBadge() {
  try {
    const sales = await getAllOfflineItems('pendingSales');
    const exps  = await getAllOfflineItems('pendingExpenses');
    const total = sales.length + exps.length;
    const badge = document.getElementById('offlineStatusBadge');
    if (!badge) return;
    if (total > 0 && !navigator.onLine) {
      badge.style.display = 'flex';
      badge.innerHTML = `<span>📵</span> অফলাইন — ${total}টি pending`;
    } else if (!navigator.onLine) {
      badge.style.display = 'flex';
      badge.innerHTML = `<span>📵</span> অফলাইন`;
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {}
}

function initOfflineSync() {
  const updateOnlineStatus = () => {
    updateOfflineBadge();
    if (navigator.onLine) {
      syncOfflineSales();
      syncOfflineExpenses();
    }
  };
  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  navigator.serviceWorker?.addEventListener('message', e => {
    if (e.data?.type === 'SYNC_OFFLINE_SALES') {
      syncOfflineSales();
      syncOfflineExpenses();
    }
  });
  // শুরুতে badge update করি
  updateOfflineBadge();
}

// ✅ অফলাইনে বিক্রয় সেভ
window.saveOfflineSale = async function(saleData) {
  // ✅ Offline Invoice নম্বর — sync হলে proper নম্বর পাবে
  const localId = 'offline-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
  const offlineInvoiceNo = `NTB-OFFLINE-${Date.now().toString().slice(-6)}`;
  await saveToOfflineQueue('pendingSales', {
    ...saleData,
    localId,
    invoiceNo: offlineInvoiceNo,
    _isOffline: true,
  });
  await updateOfflineBadge();
  window.showToast('📵 অফলাইনে সেভ হয়েছে — নেট ফিরলে সিঙ্ক হবে');
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-offline-sales');
  } catch(e) {}
};

// ✅ অফলাইনে খরচ সেভ
window.saveOfflineExpense = async function(expData) {
  const localId = 'offline-exp-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
  await saveToOfflineQueue('pendingExpenses', { ...expData, localId, _isOffline: true });
  await updateOfflineBadge();
  window.showToast('📵 অফলাইনে সেভ হয়েছে — নেট ফিরলে সিঙ্ক হবে');
};

// ✅ নেট ফিরলে বিক্রয় sync — duplicate বন্ধ
async function syncOfflineSales() {
  if (!navigator.onLine || !window.CU?.uid) return;
  try {
    const pending = await getAllOfflineItems('pendingSales');
    if (!pending.length) return;
    let synced = 0;
    for (const sale of pending) {
      const { localId, _savedAt, _isOffline, ...saleData } = sale;

      // ✅ আগে push হয়েছে কিনা check
      const alreadySynced = await isAlreadySynced(localId);
      if (alreadySynced) continue;

      try {
        // ✅ proper invoice নম্বর assign করি
        const _year = new Date().getFullYear();
        const _snap = await window._get(window._ref(window._db, 'invoiceCounter'));
        const _count = (_snap.exists() ? (_snap.val()||0) : 0) + 1;
        await window._set(window._ref(window._db, 'invoiceCounter'), _count);
        const properInvoiceNo = `NTB-${_year}-${String(_count).padStart(4,'0')}`;

        await window._push(window._ref(window._db, 'sales'), {
          ...saleData,
          invoiceNo: properInvoiceNo,
          syncedAt: Date.now(),
          _offlineLocalId: localId,
        });
        await markAsSynced(localId);
        synced++;
      } catch(e) {
        console.warn('Sale sync error:', e.message);
      }
    }
    await clearOfflineStore('pendingSales');
    await updateOfflineBadge();
    if (synced > 0) window.showToast(`✅ ${synced}টি অফলাইন বিক্রয় সিঙ্ক হয়েছে`);
  } catch(e) { console.warn('Offline sync error:', e.message); }
}
window.syncOfflineSales = syncOfflineSales;

// ✅ নেট ফিরলে খরচ sync
async function syncOfflineExpenses() {
  if (!navigator.onLine || !window.CU?.uid) return;
  try {
    const pending = await getAllOfflineItems('pendingExpenses');
    if (!pending.length) return;
    let synced = 0;
    for (const exp of pending) {
      const { localId, _savedAt, _isOffline, ...expData } = exp;
      const alreadySynced = await isAlreadySynced(localId);
      if (alreadySynced) continue;
      try {
        await window._push(window._ref(window._db, 'expenses'), { ...expData, syncedAt: Date.now() });
        await markAsSynced(localId);
        synced++;
      } catch(e) {
        console.warn('Expense sync error:', e.message);
      }
    }
    await clearOfflineStore('pendingExpenses');
    await updateOfflineBadge();
    if (synced > 0) window.showToast(`✅ ${synced}টি অফলাইন খরচ সিঙ্ক হয়েছে`);
  } catch(e) { console.warn('Offline expense sync error:', e.message); }
}
window.syncOfflineExpenses = syncOfflineExpenses;

