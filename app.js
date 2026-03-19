// ══════════════════════════════════════════════════
//  NovaTEch BD — App Engine v4.1
//  Firebase + FCM Push + Live GPS + Offline Sync
// ══════════════════════════════════════════════════

// ✅ FCM VAPID Key (Web Push certificates)
window._fcmVapidKey = 'BJZOWoD-PFRtGEPsh42RtzH3IjO8n3fPRTiHt0othEkV77DJiGoXY4QMzw0Gu3GchoVUDRNe8If_ckE8Nd1e2Ss';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set, push, get, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

const FC={apiKey:"AIzaSyAHdK7zelJcBFc8fOFSgH8G_6jEjZdNoSI",authDomain:"novatech-bd-10421.firebaseapp.com",databaseURL:"https://novatech-bd-10421-default-rtdb.firebaseio.com",projectId:"novatech-bd-10421",storageBucket:"novatech-bd-10421.firebasestorage.app",messagingSenderId:"1098950143887",appId:"1:1098950143887:web:bb7014007540c878b165fa"};
const app=initializeApp(FC);
const auth=getAuth(app);
const db=getDatabase(app);
const storage=getStorage(app);
window._firebaseDB=db; // analytics.js এর জন্য

// ══════════════════════════════════════════════════
//  FILE UPLOAD FUNCTIONS
// ══════════════════════════════════════════════════
const DRIVE_URL="https://script.google.com/macros/s/AKfycbxWsrApHOr-OkTV-i6VrVfDYQz-KM-yZWA45DDt3pTLvDPs_UpoYyYhF5fWLP0UqopJ/exec";

async function uploadImageToFirebase(file,path){
  try{
    const r=sRef(storage,path+'/'+Date.now()+'_'+file.name);
    await uploadBytes(r,file);
    return await getDownloadURL(r);
  }catch(e){showToast('ছবি আপলোড ব্যর্থ: '+e.message,true);return null;}
}
async function uploadDocToDrive(file){
  try{
    showToast('আপলোড হচ্ছে...');
    const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file);});
    const resp=await fetch(DRIVE_URL,{method:'POST',body:JSON.stringify({file:base64,mimeType:file.type,fileName:file.name})});
    const data=await resp.json();
    if(data.success){showToast('ডকুমেন্ট আপলোড সফল ✓');return data.url;}
    showToast('আপলোড ব্যর্থ',true);return null;
  }catch(e){showToast('আপলোড ব্যর্থ: '+e.message,true);return null;}
}
// কর্মীর ছবি preview
window.previewWorkerPhoto=(input)=>{
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const prev=$('nuPhotoPreview'),icon=$('nuPhotoIcon');
    if(prev){prev.src=e.target.result;prev.style.display='block';}
    if(icon)icon.style.display='none';
  };
  reader.readAsDataURL(file);
  window._pendingWorkerPhoto=file;
};

// কর্মীর ডকুমেন্ট list
window._pendingWorkerDocs=[];
window.addWorkerDoc=(input)=>{
  const files=Array.from(input.files);
  files.forEach(f=>{
    window._pendingWorkerDocs.push(f);
  });
  renderPendingDocs();
  input.value='';
};
function renderPendingDocs(){
  const el=$('nuDocList');if(!el)return;
  el.innerHTML=window._pendingWorkerDocs.map((f,i)=>`
    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--card);border-radius:7px;padding:7px 10px;margin-bottom:5px;">
      <div style="font-size:12px">📄 ${f.name}</div>
      <button onclick="removeWorkerDoc(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;">✕</button>
    </div>`).join('');
}
window.removeWorkerDoc=(i)=>{
  window._pendingWorkerDocs.splice(i,1);
  renderPendingDocs();
};

window.previewCustPhoto=(input)=>{
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const prev=$('custPhotoPreview'),icon=$('custPhotoIcon');
    if(prev){prev.src=e.target.result;prev.style.display='block';}
    if(icon)icon.style.display='none';
  };
  reader.readAsDataURL(file);
  window._pendingCustPhoto=file;
};

window.uploadProfilePhoto=async(input)=>{
  const file=input.files[0];if(!file)return;
  showToast('প্রোফাইল ছবি আপলোড হচ্ছে...');
  const url=await uploadImageToFirebase(file,'profiles');
  if(url){
    await update(ref(db,'users/'+CU.uid),{photoURL:url});
    const img=$('profilePhoto'),icon=$('profilePhotoIcon');
    if(img){img.src=url;img.style.display='block';}
    if(icon)icon.style.display='none';
    showToast('প্রোফাইল ছবি আপডেট ✓');
  }
};
window.uploadSalePhoto=async(input)=>{
  const file=input.files[0];if(!file)return;
  showToast('ছবি আপলোড হচ্ছে...');
  const url=await uploadImageToFirebase(file,'sale-photos');
  if(url){
    window._pendingSalePhoto=url;
    const prev=$('salePhotoPreview');
    if(prev){prev.src=url;prev.style.display='block';}
    showToast('ছবি যুক্ত হয়েছে ✓');
  }
};
window.uploadDocument=async(input,uid)=>{
  const file=input.files[0];if(!file)return;
  const url=await uploadDocToDrive(file);
  if(url){
    await push(ref(db,'documents/'+(uid||CU.uid)),{name:file.name,url,type:file.type,uploadedBy:CN,ts:Date.now()});
    showToast('ডকুমেন্ট সংরক্ষিত ✓');
  }
};

let CU=null,CR=null,CN=null;
let allSales={},allExpenses={},allProducts={},allUsers={},allAllowances={},allCustomers={},allRoutes={},allRouteRequests={},allStock={},allStockAssign={},allAttendance={},allLeaves={},allSalaries={},allCommConfig={},allNotices={},allTeams={},allSMSConfig={};
let filterMode='today',payShop=null,activeRouteId=null,routeFilter='all',currentOTId=null;
let pendingSaleData=null,pendingOTP=null,pendingSaleId=null;

const $=id=>document.getElementById(id);
const bn=n=>'৳'+Math.round(n||0).toLocaleString('bn-BD');
const today=()=>new Date().toISOString().split('T')[0];
const fmtDate=d=>new Date(d).toLocaleDateString('bn-BD',{day:'numeric',month:'short'});
const fmtTime=ts=>new Date(ts).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'});
const genOTP=()=>Math.floor(100000+Math.random()*900000).toString();

function showToast(msg,err){const t=$('toast');t.textContent=msg;t.className='toast'+(err?' err':'')+' show';setTimeout(()=>t.className='toast',2800);}
function loader(s){$('loader').style.display=s?'flex':'none';}

// AUTH
window.doLogin=async()=>{
  const em=$('loginEmail').value.trim(),ps=$('loginPass').value;
  if(!em||!ps){showErr('ইমেইল ও পাসওয়ার্ড দিন');return;}
  loader(true);
  try{await signInWithEmailAndPassword(auth,em,ps);}
  catch(e){loader(false);showErr('ইমেইল বা পাসওয়ার্ড ভুল!');}
};
window.doLogout=async()=>{await signOut(auth);};
function showErr(m){const e=$('authErr');e.textContent=m;e.style.display='block';}

onAuthStateChanged(auth,async user=>{
  if(user){
    loader(true);CU=user;
    const snap=await get(ref(db,'users/'+user.uid));
    if(snap.exists()){
      const p=snap.val();CR=p.role;CN=p.name;
      // Suspended বা Fired user — সাথে সাথে logout
      if(p.status==='suspended'||p.status==='fired'){
        await signOut(auth);loader(false);
        $('authScreen').style.display='flex';$('appScreen').style.display='none';
        const e=$('authErr');if(e){e.textContent=p.status==='suspended'?'❌ আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে।':'❌ আপনাকে বহিষ্কার করা হয়েছে।';e.style.display='block';}
        return;
      }
    }
    else{CR='admin';CN=user.email;await set(ref(db,'users/'+user.uid),{name:user.email,email:user.email,role:'admin',status:'active'});}
    initApp();
  }else{
    CU=null;$('loader').style.display='none';
    $('authScreen').style.display='flex';$('appScreen').style.display='none';
  }
});

function initApp(){
  $('authScreen').style.display='none';$('appScreen').style.display='block';
  $('userName').textContent=CN;
  const rb=$('roleBadge');
  rb.textContent=CR==='admin'?'অ্যাডমিন':CR==='manager'?'ম্যানেজার':'কর্মী';
  rb.className='role-badge role-'+CR;
  $('profitCard').style.display=CR==='admin'?'block':'none';
  buildNav();
  // Set default dates
  [$('sDate'),$('eDate'),$('stDate'),$('leaveFrom'),$('leaveTo'),$('otDate')].forEach(el=>{if(el)el.value=today();});
  initShiftPreview();
  // Worker এর জন্য কর্মী তৈরি ফর্ম লুকাও
  const cuForm=$('createUserForm');
  if(cuForm&&CR==='worker')cuForm.style.display='none';
  loadDriveConfig();
  // AI Config লোড
  get(ref(db,'aiConfig')).then(snap=>{
    if(!snap.exists())return;
    const d=snap.val();
    const key=d.apiKey||d.anthropicApiKey||'';
    const el=$('anthropicApiKey');
    if(el&&key)el.value=key;
    // cache করা
    if(key)window._ntAIKey=key;
    const status=$('aiConfigStatus');
    if(status&&key)status.innerHTML='<div style="font-size:11px;color:var(--green);margin-top:6px">✅ সংরক্ষিত আছে · Claude AI সক্রিয়</div>';
  });

  onValue(ref(db,'sales'),s=>{allSales=s.val()||{};refreshDash();renderSaleList();renderDue();if(CR==='admin')renderReport();renderProfile();});
  onValue(ref(db,'expenses'),s=>{allExpenses=s.val()||{};refreshDash();renderExpList();if(CR==='admin')renderReport();});
  onValue(ref(db,'products'),s=>{allProducts=s.val()||{};loadProductSelects();if(CR==='admin')renderProdChips();});
  onValue(ref(db,'users'),s=>{allUsers=s.val()||{};if(CR==='admin'||CR==='manager')renderUserList();loadAllWorkerSelects();});
  onValue(ref(db,'allowances'),s=>{allAllowances=s.val()||{};renderMyAllowance();if(CR!=='worker')renderAllowList();});
  onValue(ref(db,'customers'),s=>{allCustomers=s.val()||{};renderCustomers();loadCustomerSelect();loadBroadcastRoutes();});
  onValue(ref(db,'routes'),s=>{allRoutes=s.val()||{};renderRouteChips();loadRouteSelects();renderVisitList();});
  onValue(ref(db,'stock'),s=>{allStock=s.val()||{};renderStock();});
  onValue(ref(db,'stockAssign'),s=>{allStockAssign=s.val()||{};renderStock();});
  onValue(ref(db,'attendance'),s=>{allAttendance=s.val()||{};renderAttendance();checkLateAlert();});
  onValue(ref(db,'leaves'),s=>{allLeaves=s.val()||{};renderLeaves();});
  onValue(ref(db,'salaries'),s=>{allSalaries=s.val()||{};renderSalary();});
  onValue(ref(db,'commConfig'),s=>{allCommConfig=s.val()||getDefaultSlabs();renderCommSlabs();renderSalary();});
  onValue(ref(db,'notices'),s=>{allNotices=s.val()||{};renderNoticeBoard();});
  onValue(ref(db,'teams'),s=>{allTeams=s.val()||{};renderTeams();});
  onValue(ref(db,'smsConfig'),s=>{allSMSConfig=s.val()||{};loadSMSConfig();});
  onValue(ref(db,'routeRequests'),s=>{allRouteRequests=s.val()||{};renderRouteRequests();});

  loader(false);showPage('dash');

  // ✅ নতুন ফিচার সক্রিয় করি
  initFCMPushNotification();
  initOfflineSync();
  if(CR==='worker') initLiveGPS();
}

// ════════════════════════════════════════════════════════════
// ✅ FEATURE 1: FCM PUSH NOTIFICATION
// ════════════════════════════════════════════════════════════
let _fcmMessaging = null;

async function initFCMPushNotification() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    // অনুমতি চাই
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }
    if (Notification.permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const VAPID_KEY = window._fcmVapidKey;
    if (!VAPID_KEY) { console.warn('VAPID Key নেই'); return; }

    // Firebase Messaging শুরু
    _fcmMessaging = getMessaging(app);

    // FCM Token নিই
    const token = await getToken(_fcmMessaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg
    });

    if (token) {
      // Token Firebase-এ সেভ করি
      await set(ref(db, 'fcmTokens/' + CU.uid), {
        token, name: CN, role: CR, ts: Date.now()
      });
      window._fcmToken = token;
      console.log('✅ FCM Token সেভ হয়েছে');
    }

    // Foreground message (অ্যাপ খোলা থাকলে)
    onMessage(_fcmMessaging, payload => {
      showToast('🔔 ' + (payload.notification?.title || 'নতুন বিজ্ঞপ্তি'));
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--accent);border-radius:12px;padding:12px 18px;z-index:999;max-width:360px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.4);';
      banner.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--accent)">${payload.notification?.title||'NovaTEch BD'}</div><div style="font-size:12px;color:var(--text);margin-top:4px">${payload.notification?.body||''}</div>`;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 5000);
    });

    // SW message শুনি
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'NOTIFICATION_CLICK') {
        const page = e.data?.data?.page;
        if (page && typeof showPage === 'function') showPage(page);
      }
      if (e.data?.type === 'SYNC_OFFLINE_SALES') syncOfflineSales();
    });

    console.log('✅ FCM Push Notification সক্রিয়');
  } catch(e) { console.warn('FCM init error:', e.message); }
}

// Admin/Manager যেকোনো কর্মীকে notification পাঠাতে পারবেন
window.sendPushToWorker = async function(uid, title, body, page='dash') {
  try {
    const tokenSnap = await get(ref(db, 'fcmTokens/' + uid));
    const tokenData = tokenSnap.val();
    if (!tokenData?.token) { showToast('কর্মীর notification token নেই', true); return; }
    // Firebase-এ notification queue-এ রাখি — Firebase Functions দিয়ে পাঠানো হবে
    await push(ref(db, 'notificationQueue'), {
      to: tokenData.token, uid, title, body,
      data: { page }, ts: Date.now(), sentBy: CN
    });
    showToast('✅ Notification পাঠানো হয়েছে');
  } catch(e) { showToast('Notification পাঠানো ব্যর্থ: ' + e.message, true); }
};

// ════════════════════════════════════════════════════════════
// ✅ FEATURE 2: LIVE GPS TRACKING (কর্মীদের জন্য)
// ════════════════════════════════════════════════════════════
let _gpsWatchId = null;
let _gpsLastLog = 0;
const GPS_INTERVAL_MS = 5 * 60 * 1000; // প্রতি ৫ মিনিট

function initLiveGPS() {
  if (!navigator.geolocation) return;
  if (_gpsWatchId) return; // ইতিমধ্যে চালু

  _gpsWatchId = navigator.geolocation.watchPosition(
    async pos => {
      const now = Date.now();
      if (now - _gpsLastLog < GPS_INTERVAL_MS) return; // ৫ মিনিটের আগে আবার লগ না
      _gpsLastLog = now;
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      try {
        // কর্মীর লাইভ লোকেশন আপডেট
        await set(ref(db, 'liveLocations/' + CU.uid), {
          lat, lng, accuracy: Math.round(accuracy),
          name: CN, role: CR,
          ts: now, date: today()
        });
        // ৫ মিনিটের গ্র্যানুলার লগ (ইতিহাসের জন্য)
        await push(ref(db, 'gpsTrail/' + CU.uid + '/' + today().replace(/-/g,'_')), {
          lat, lng, ts: now
        });
      } catch(e) { console.warn('GPS log error:', e.message); }
    },
    err => console.warn('GPS watch error:', err.message),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
  console.log('✅ Live GPS tracking started');
}

// GPS বন্ধ করার ফাংশন (চেক-আউটের পরে)
window.stopLiveGPS = function() {
  if (_gpsWatchId) { navigator.geolocation.clearWatch(_gpsWatchId); _gpsWatchId = null; }
  // অফলাইন মার্ক করি
  if (CU?.uid) set(ref(db, 'liveLocations/' + CU.uid + '/online'), false).catch(()=>{});
};

// Manager/Admin-এর জন্য লাইভ ম্যাপ
window.renderLiveMap = function() {
  const el = document.getElementById('liveMapContainer');
  if (!el) return;
  onValue(ref(db, 'liveLocations'), snap => {
    const locs = snap.val() || {};
    const workers = Object.entries(locs).filter(([uid]) => uid !== CU.uid);
    if (!workers.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">কোনো কর্মী অনলাইন নেই</div>'; return; }
    el.innerHTML = workers.map(([uid, d]) => {
      const minsAgo = Math.round((Date.now() - d.ts) / 60000);
      const mapUrl = `https://www.google.com/maps?q=${d.lat},${d.lng}`;
      const isRecent = minsAgo < 10;
      return `<div style="background:var(--card);border:1px solid ${isRecent?'var(--green)':'var(--border)'};border-radius:12px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:13px;font-weight:700">${d.name} <span style="font-size:10px;color:${isRecent?'var(--green)':'var(--muted)'}">● ${minsAgo} মিনিট আগে</span></div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">📍 ${d.lat?.toFixed(4)}, ${d.lng?.toFixed(4)} · ±${d.accuracy}m</div>
        </div>
        <a href="${mapUrl}" target="_blank" style="padding:6px 12px;background:rgba(74,158,255,.15);border:1px solid var(--blue);border-radius:8px;color:var(--blue);font-size:11px;font-weight:700;text-decoration:none">🗺️ ম্যাপ</a>
      </div>`;
    }).join('');
  });
};

// ════════════════════════════════════════════════════════════
// ✅ FEATURE 3: OFFLINE SYNC (IndexedDB)
// ════════════════════════════════════════════════════════════
const OFFLINE_DB_NAME = 'novatech-offline';
const OFFLINE_DB_VER = 1;
let _offlineDB = null;

async function getOfflineDB() {
  if (_offlineDB) return _offlineDB;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pendingSales'))
        db.createObjectStore('pendingSales', { keyPath: 'localId', autoIncrement: true });
      if (!db.objectStoreNames.contains('pendingExpenses'))
        db.createObjectStore('pendingExpenses', { keyPath: 'localId', autoIncrement: true });
    };
    req.onsuccess = e => { _offlineDB = e.target.result; resolve(_offlineDB); };
    req.onerror = () => reject(req.error);
  });
}

async function saveToOfflineQueue(store, data) {
  const db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).add({ ...data, _savedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllOfflineItems(store) {
  const db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearOfflineStore(store) {
  const db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function initOfflineSync() {
  // নেটওয়ার্ক স্ট্যাটাস দেখাই
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    const badge = document.getElementById('offlineStatusBadge');
    if (!badge) return;
    badge.style.display = isOnline ? 'none' : 'flex';
    if (isOnline) syncOfflineSales(); // নেট ফিরলে সিঙ্ক
  };
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  // SW-এর SYNC_OFFLINE_SALES message শুনি
  navigator.serviceWorker?.addEventListener('message', e => {
    if (e.data?.type === 'SYNC_OFFLINE_SALES') syncOfflineSales();
  });
}

// অফলাইন অবস্থায় বিক্রয় সেভ করা
window.saveOfflineSale = async function(saleData) {
  await saveToOfflineQueue('pendingSales', saleData);
  showToast('📵 অফলাইনে সেভ হয়েছে — নেট ফিরলে সিঙ্ক হবে');
  // Background sync request
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-offline-sales');
  } catch(e) {}
};

// নেট ফিরলে offline queue Firebase-এ পাঠাই
async function syncOfflineSales() {
  if (!navigator.onLine || !CU?.uid) return;
  try {
    const pending = await getAllOfflineItems('pendingSales');
    if (!pending.length) return;
    let synced = 0;
    for (const sale of pending) {
      const { localId, _savedAt, ...saleData } = sale;
      await push(ref(db, 'sales'), { ...saleData, syncedAt: Date.now() });
      synced++;
    }
    await clearOfflineStore('pendingSales');
    if (synced > 0) showToast(`✅ ${synced}টি অফলাইন বিক্রয় সিঙ্ক হয়েছে`);
  } catch(e) { console.warn('Offline sync error:', e.message); }
}
window.syncOfflineSales = syncOfflineSales;

function buildNav(){
  // পুরানো top nav (hidden, backward compat)
  const tabs=[
    {id:'dash',label:'🏠 ড্যাশ',r:['admin','manager','worker']},
    {id:'sale',label:'🛍 বিক্রয়',r:['admin','manager','worker']},
    {id:'due',label:'🏦 বাকি',r:['admin','manager','worker']},
    {id:'profile',label:'👤 প্রোফাইল',r:['admin','manager','worker']},
  ];
  $('mainNav').innerHTML=tabs.filter(t=>t.r.includes(CR))
    .map(t=>`<button class="nav-btn" data-page="${t.id}" onclick="showPage('${t.id}')">${t.label}</button>`).join('');

  // ══ Drawer মেনু সংজ্ঞা ══
  // প্রতিটি গ্রুপে items আছে, কিছুতে subItems (সাব-মেনু)
  const drawerGroups = [
    // ── সবার জন্য
    { ico:'🏪', lbl:'কাস্টমার', page:'cust', r:['admin','manager','worker'] },
    { ico:'🗺️', lbl:'রুট', page:'route', r:['admin','manager','worker'] },
    { ico:'💸', lbl:'খরচ', page:'exp', r:['admin','manager','worker'] },
    { ico:'📦', lbl:'স্টক', page:'stock', r:['admin','manager','worker'] },
    { ico:'⏰', lbl:'উপস্থিতি', page:'att', r:['admin','manager','worker'] },
    // ── সাব-মেনু: রিপোর্ট
    {
      ico:'📊', lbl:'রিপোর্ট', r:['admin','manager'],
      sub: {
        title:'📊 রিপোর্ট বেছে নিন',
        items: [
          { ico:'🤖', lbl:'AI রিপোর্ট', desc:'Claude AI বিশ্লেষণ', page:'enterprise' },
          { ico:'📈', lbl:'বিক্রয় রিপোর্ট', desc:'বিস্তারিত বিক্রয়', page:'report', sub:'sales' },
          { ico:'🏪', lbl:'কাস্টমার রিপোর্ট', desc:'দোকান ভিত্তিক', page:'report', sub:'shop' },
          { ico:'🛍', lbl:'পণ্য রিপোর্ট', desc:'পণ্য ভিত্তিক', page:'report', sub:'prod' },
          { ico:'🗺️', lbl:'রুট রিপোর্ট', desc:'রুট ভিত্তিক', page:'report', sub:'route' },
          { ico:'💸', lbl:'খরচ রিপোর্ট', desc:'ব্যয়ের বিশ্লেষণ', page:'report', sub:'exp' },
          { ico:'📅', lbl:'দৈনিক রিপোর্ট', desc:'দিনের সারসংক্ষেপ', page:'folders', sub:'daily' },
          { ico:'📆', lbl:'মাসিক রিপোর্ট', desc:'মাসের সারসংক্ষেপ', page:'folders', sub:'monthly' },
        ]
      }
    },
    // ── সাব-মেনু: HR ও পেমেন্ট
    {
      ico:'💰', lbl:'HR', r:['admin','manager'],
      sub: {
        title:'💰 HR ও পেমেন্ট',
        items: [
          { ico:'💵', lbl:'বেতন', desc:'বেতন হিসাব', page:'salary' },
          { ico:'🚗', lbl:'ভাতা', desc:'ভ্রমণ ভাতা', page:'allow' },
          { ico:'👥', lbl:'টিম', desc:'টিম ব্যবস্থাপনা', page:'teams' },
        ]
      }
    },
    // ── সাব-মেনু: সেটিংস (Admin only)
    {
      ico:'⚙️', lbl:'সেটিংস', r:['admin'],
      sub: {
        title:'⚙️ সেটিংস',
        items: [
          { ico:'🔧', lbl:'অ্যাডমিন', desc:'সিস্টেম সেটিংস', page:'admin' },
          { ico:'🗂️', lbl:'ফোল্ডার', desc:'ফাইল ম্যানেজার', page:'folders' },
        ]
      }
    },
    // ── Worker-এর জন্য অতিরিক্ত
    { ico:'🛒', lbl:'অর্ডার', page:'order', r:['worker','manager','admin'] },
    { ico:'📋', lbl:'টাস্ক', page:'tasks', r:['worker','manager','admin'] },
    { ico:'💬', lbl:'চ্যাট', page:'chat', r:['worker','manager','admin'] },
  ];

  // Role অনুযায়ী ফিল্টার করি
  const visible = drawerGroups.filter(g => !g.r || g.r.includes(CR));

  // Drawer grid রেন্ডার
  const grid = $('drawerGrid');
  if (!grid) return;
  grid.innerHTML = visible.map((g, i) => {
    const hasSub = !!g.sub;
    return `<div class="drawer-item${hasSub?' has-sub':''}" id="ditem-${i}"
      onclick="${hasSub ? `openSubMenu(${i})` : `navTo('${g.page}');closeDrawer()`}"
    >
      <span class="di-ico">${g.ico}</span>
      <span class="di-lbl">${g.lbl}${hasSub?'<br><span style="font-size:9px;opacity:.5">▾</span>':''}</span>
    </div>`;
  }).join('');

  // Global reference সেভ করি (openSubMenu-এর জন্য)
  window._drawerGroups = visible;
}

// Drawer খোলা/বন্ধ
window.toggleDrawer = function() {
  const drawer = $('navDrawer');
  const overlay = $('drawerOverlay');
  const isOpen = drawer.classList.contains('open');
  if (isOpen) closeDrawer();
  else {
    closeSubMenu();
    drawer.classList.add('open');
    overlay.classList.add('open');
  }
};
window.closeDrawer = function() {
  $('navDrawer')?.classList.remove('open');
  $('drawerOverlay')?.classList.remove('open');
  setTimeout(closeSubMenu, 320);
};

// সাব-মেনু খোলা
window.openSubMenu = function(idx) {
  const group = window._drawerGroups[idx];
  if (!group?.sub) return;

  // active state
  document.querySelectorAll('.drawer-item').forEach(el => el.classList.remove('active'));
  document.getElementById('ditem-' + idx)?.classList.add('active');

  // sub panel
  const panel = $('subMenuPanel');
  const title = $('subMenuTitle');
  const sgrid = $('subMenuGrid');
  if (!panel || !title || !sgrid) return;

  title.textContent = group.sub.title;
  sgrid.innerHTML = group.sub.items.map(item => `
    <div class="sub-item" onclick="navToSub('${item.page}','${item.sub||''}');closeDrawer()">
      <span class="sub-ico">${item.ico}</span>
      <div class="sub-info">
        <div class="sub-lbl">${item.lbl}</div>
        <div class="sub-desc">${item.desc}</div>
      </div>
    </div>
  `).join('');

  panel.classList.add('open');
  // Drawer scroll to sub
  setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
};

window.closeSubMenu = function() {
  $('subMenuPanel')?.classList.remove('open');
  document.querySelectorAll('.drawer-item').forEach(el => el.classList.remove('active'));
};

// Page navigate
window.navTo = function(page) {
  showPage(page);
  setActiveTab(page);
};
window.navToSub = function(page, sub) {
  showPage(page);
  setActiveTab(page);
  // Sub-section scroll করি
  if (sub) {
    setTimeout(() => {
      const sectionMap = {
        sales: 'workerReport', shop: 'shopReport', prod: 'prodReport',
        route: 'routeReport', exp: 'expReport',
        daily: () => { if(typeof renderFolderTab==='function') renderFolderTab('daily'); },
        monthly: () => { if(typeof renderFolderTab==='function') renderFolderTab('monthly'); },
      };
      const target = sectionMap[sub];
      if (typeof target === 'function') { target(); return; }
      if (target) {
        const el = $(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 350);
  }
};

// Bottom tab active state
window.setActiveTab = function(page) {
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const tabMap = { dash:'bnav-dash', sale:'bnav-sale', due:'bnav-due', profile:'bnav-profile' };
  const btnId = tabMap[page];
  if (btnId) $( btnId)?.classList.add('active');
  else $('bnav-more')?.classList.add('active');
};

window.showPage=id=>{
  const restricted={
    'report':['admin'],
    'admin':['admin'],
    'folders':['admin'],
    'salary':['admin','manager'],
    'teams':['admin','manager'],
    'allow':['admin','manager'],
    'enterprise':['admin','manager'],
  };
  if(restricted[id]&&!restricted[id].includes(CR)){
    showToast('এই পেজ দেখার অনুমতি নেই!',true);
    id='dash';
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  $('page-'+id)?.classList.add('active');
  document.querySelector(`[data-page="${id}"]`)?.classList.add('active');
  // Bottom tab active
  if(typeof setActiveTab==='function') setActiveTab(id);
  if(id==='report')renderReport();
  if(id==='enterprise'&&typeof window.renderEnterpriseDashboard==='function'){
    setTimeout(window.renderEnterpriseDashboard,300);
    setTimeout(()=>{if(typeof window.renderAIManager==='function')window.renderAIManager();},500);
  }
  if(id==='salary')renderSalary();
  if(id==='profile')renderProfile();
  if(id==='folders')renderFolderTab('workers');
  if(id==='att')renderAttendance();
  if(id==='teams')renderTeams();
};

window.setFilter=(f,btn)=>{
  filterMode=f;
  document.querySelectorAll('#page-dash .fb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');refreshDash();
};

function getFilteredSales(){
  const now=new Date();
  return Object.values(allSales).filter(s=>{
    if(CR==='worker'&&s.uid!==CU.uid)return false;
    if(filterMode==='today')return s.date===today();
    if(filterMode==='week'){const st=new Date(now);st.setDate(now.getDate()-now.getDay());return new Date(s.date)>=st;}
    if(filterMode==='month'){const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}
    return true;
  });
}

function refreshDash(){
  const sales=getFilteredSales();
  const exps=Object.values(allExpenses).filter(e=>{
    if(CR==='worker'&&e.uid!==CU.uid)return false;
    if(filterMode==='today')return e.date===today();
    if(filterMode==='month'){const d=new Date(e.date);return d.getMonth()===new Date().getMonth();}
    return true;
  });
  $('dSale').textContent=bn(sales.reduce((s,i)=>s+(i.total||0),0));
  $('dProfit').textContent=bn(sales.reduce((s,i)=>s+(i.profit||0),0));
  $('dExp').textContent=bn(exps.reduce((s,i)=>s+(i.amount||0),0));
  $('dDue').textContent=bn(Object.values(allSales).reduce((s,i)=>s+(CR==='worker'&&i.uid!==CU.uid?0:(i.due||0)),0));
  // Target
  renderMyTarget();
  if(activeRouteId&&allRoutes[activeRouteId]){
    const rc=Object.values(allCustomers).filter(c=>c.routeId===activeRouteId);
    const vi=Object.values(allSales).filter(s=>s.uid===CU.uid&&s.date===today()&&s.routeId===activeRouteId).map(s=>s.shopId);
    $('activeRouteBanner').style.display='block';
    $('activeRouteName').textContent=allRoutes[activeRouteId].name;
    $('activeRouteVisits').textContent=rc.filter(c=>!vi.includes(c.id)).length;
  }
  const el=$('dashSales');
  const list=sales.slice(-6).reverse();
  el.innerHTML=list.length?list.map(s=>saleCard(s)).join(''):'<div class="empty"><div class="ic">📭</div>কোনো বিক্রয় নেই</div>';
}

// TARGET
function renderMyTarget(){
  const sal=allSalaries[CU.uid];
  const target=sal?.monthlyTarget||0;
  if(!target)return;
  const now=new Date();
  const mySales=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===CU.uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const achieved=mySales.reduce((a,b)=>a+(b.total||0),0);
  const pct=Math.min((achieved/target*100),100).toFixed(0);
  const color=pct>=100?'var(--green)':pct>=60?'var(--accent)':'var(--red)';
  const el=$('myTargetCard');
  if(el)el.innerHTML=`<div class="target-card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600">🎯 মাসিক টার্গেট</span><span class="target-pct" style="color:${color}">${pct}%</span></div><div style="font-size:11px;color:var(--muted);margin-top:3px">${bn(achieved)} / ${bn(target)}</div><div class="tbar"><div class="tbar-fill" style="width:${pct}%;background:${color}"></div></div></div>`;
}

// NOTICE BOARD
function renderNoticeBoard(){
  const el=$('noticeBoard');if(!el)return;
  const now=Date.now();
  const canManage=(CR==='admin'||CR==='manager');

  // ✅ মেয়াদ শেষ নোটিশ Firebase থেকে মুছি
  Object.entries(allNotices).forEach(([id,n])=>{
    if(n.expiresAt && n.expiresAt < now) remove(ref(db,'notices/'+id));
  });

  const relevant=Object.entries(allNotices).filter(([,n])=>{
    if(n.expiresAt && n.expiresAt < now) return false; // মেয়াদ শেষ
    if(n.target==='all')return true;
    if(n.target==='worker'&&CR==='worker')return true;
    if(n.target==='manager'&&(CR==='manager'||CR==='admin'))return true;
    if(CR==='admin')return true;
    return false;
  }).sort((a,b)=>b[1].ts-a[1].ts).slice(0,5);

  if(!relevant.length){el.innerHTML='';return;}
  el.innerHTML=relevant.map(([id,n])=>{
    const left=n.expiresAt?Math.max(0,Math.ceil((n.expiresAt-now)/3600000)):null;
    const timeTag=left!==null
      ? (left<=1?`<span style="color:var(--red);font-size:10px">⏰ ${Math.ceil((n.expiresAt-now)/60000)} মিনিট বাকি</span>`
        :left<=24?`<span style="color:var(--accent);font-size:10px">⏰ ${left} ঘণ্টা বাকি</span>`
        :`<span style="font-size:10px;color:var(--muted)">⏰ ${Math.ceil(left/24)} দিন বাকি</span>`)
      :'';
    const delBtn=canManage
      ?`<button onclick="deleteNotice('${id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0 2px;float:right;" title="মুছুন">✕</button>`
      :'';
    return `<div class="notice-card" style="position:relative;">
      ${delBtn}
      <div class="nt">📢 ${n.title}</div>
      <div class="nb">${n.body}</div>
      <div class="nd" style="display:flex;gap:8px;align-items:center;margin-top:5px;">
        <span>${fmtDate(new Date(n.ts).toISOString().split('T')[0])} · ${n.sentBy||''}</span>
        ${timeTag}
      </div>
    </div>`;
  }).join('');
}

// ✅ নোটিশ ডিলেট
window.deleteNotice=async(id)=>{
  if(CR!=='admin'&&CR!=='manager'){showToast('অনুমতি নেই!',true);return;}
  await remove(ref(db,'notices/'+id));
  showToast('নোটিশ মুছে গেছে');
};

window.sendNotice=async()=>{
  if(CR!=='admin'&&CR!=='manager'){showToast('অনুমতি নেই!',true);return;}
  const title=$('noticeTitle').value.trim(),body=$('noticeBody').value.trim(),target=$('noticeTarget').value;
  if(!title||!body){showToast('শিরোনাম ও বার্তা দিন!',true);return;}
  // ✅ মেয়াদ হিসাব
  const expireVal=$('noticeExpire')?.value;
  let expiresAt=null;
  if(expireVal&&expireVal!=='never'){
    const hours=parseInt(expireVal);
    expiresAt=Date.now()+(hours*3600000);
  }
  await push(ref(db,'notices'),{title,body,target,sentBy:CN,ts:Date.now(),expiresAt});
  $('noticeTitle').value='';$('noticeBody').value='';
  showToast('✅ নোটিশ পাঠানো হয়েছে');
};

// LATE ALERT
function checkLateAlert(){
  if(CR==='worker')return;
  const cutoff=new Date();cutoff.setHours(10,0,0,0);
  const lateToday=Object.values(allAttendance).filter(a=>{
    if(a.date!==today()||!a.checkIn)return false;
    return new Date(a.checkIn)>cutoff;
  });
  const banner=$('lateAlertBanner');
  if(lateToday.length>0&&banner){
    banner.innerHTML=`<div class="warn-box" style="margin-bottom:12px">⚠️ <b>${lateToday.length} জন কর্মী</b> আজ সকাল ১০টার পরে উপস্থিত হয়েছেন: ${lateToday.map(a=>a.name).join(', ')}</div>`;
  }
  // Check 3 late in month
  const now=new Date();
  Object.entries(allUsers).filter(([,u])=>u.role==='worker').forEach(([uid,u])=>{
    const monthLate=Object.values(allAttendance).filter(a=>{
      if(a.uid!==uid||!a.checkIn)return false;
      const d=new Date(a.date);
      if(d.getMonth()!==now.getMonth()||d.getFullYear()!==now.getFullYear())return false;
      const co=new Date(a.date+'T10:00:00');
      return new Date(a.checkIn)>co;
    });
    if(monthLate.length>=3){
      // Send warning via SMS if configured
      const phone=u.phone||u.waNum;
      if(phone&&allSMSConfig?.apiKey){
        const msg=allSMSConfig.lateTemplate||'NovaTEch BD: আপনি এই মাসে ৩ বার দেরিতে উপস্থিত হয়েছেন।';
        sendSMSAlphaNet(phone,msg);
      }
    }
  });
}

// SMS
function sendSMSAlphaNet(phone,msg){
  if(!allSMSConfig?.apiKey){console.log('SMS Config নেই');return;}
  const num=phone.replace(/\D/g,'');
  const url=`https://api.alphanetkbd.com/api/v2/sending/messages?apikey=${allSMSConfig.apiKey}&msg=${encodeURIComponent(msg)}&to=${num}&from=${allSMSConfig.senderId||'NOVATECH'}`;
  fetch(url).then(r=>r.json()).then(d=>console.log('SMS sent:',d)).catch(e=>console.log('SMS error:',e));
}

window.saveSMSConfig=async()=>{
  const apiKey=$('smsApiKey').value.trim(),senderId=$('smsSenderId').value.trim();
  const billTemplate=$('smsBillTemplate').value,lateTemplate=$('smsLateTemplate').value;
  const otpEnabled=$('otpToggle').checked;
  await set(ref(db,'smsConfig'),{apiKey,senderId,billTemplate,lateTemplate,otpEnabled,updatedBy:CN,ts:Date.now()});
  showToast('SMS কনফিগ সেভ ✓');
};
function loadSMSConfig(){
  if(!allSMSConfig)return;
  if($('smsApiKey')&&allSMSConfig.apiKey)$('smsApiKey').value=allSMSConfig.apiKey;
  if($('smsSenderId')&&allSMSConfig.senderId)$('smsSenderId').value=allSMSConfig.senderId;
  if($('smsBillTemplate')&&allSMSConfig.billTemplate)$('smsBillTemplate').value=allSMSConfig.billTemplate;
  if($('smsLateTemplate')&&allSMSConfig.lateTemplate)$('smsLateTemplate').value=allSMSConfig.lateTemplate;
  if($('otpToggle'))$('otpToggle').checked=allSMSConfig.otpEnabled!==false;
  updateOTPStatus();
}
function updateOTPStatus(){
  const on=$('otpToggle')?.checked;
  const lbl=$('otpStatusLabel');
  if(lbl)lbl.textContent=on?'✅ OTP চালু':'❌ OTP বন্ধ';
  if(lbl)lbl.style.color=on?'var(--green)':'var(--red)';
}

// CUSTOMERS
const BIZ=['ইলেকট্রনিক ও টেলিকম','ইলেকট্রনিক','টেলিকম','মুদি+টেলিকম','অন্যান্য'];
function renderCustomers(){
  const q=($('custSearch')?.value||'').toLowerCase();
  let list=Object.entries(allCustomers);
  // কর্মী শুধু তার activeRoute এর কাস্টমার দেখবে
  if(CR==='worker'){
    if(activeRouteId)list=list.filter(([,c])=>c.routeId===activeRouteId);
    else if(routeFilter!=='all')list=list.filter(([,c])=>c.routeId===routeFilter);
  } else {
    if(routeFilter!=='all')list=list.filter(([,c])=>c.routeId===routeFilter);
  }
  if(q)list=list.filter(([,c])=>(c.name||'').toLowerCase().includes(q)||(c.owner||'').toLowerCase().includes(q));
  const el=$('custList');
  el.innerHTML=list.length?list.map(([id,c])=>{
    const biz=parseInt(c.bizType||0),route=allRoutes[c.routeId];
    const lastOrders=Object.values(allSales).filter(s=>s.shopId===id).sort((a,b)=>b.ts-a.ts);
    const lastOrder=lastOrders[0];
    const custDue=Object.values(allSales).filter(s=>s.shopId===id&&s.due>0).reduce((a,s)=>a+s.due,0);
    return`<div class="cust-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="font-size:14px;font-weight:700" onclick="viewCustSalesHistory('${id}')" style="cursor:pointer">🏪 ${c.name}</div>
        ${custDue>0?`<span style="font-size:11px;background:rgba(232,93,74,.2);color:var(--red);border-radius:5px;padding:2px 6px">বাকি ${bn(custDue)}</span>`:''}
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">👤 ${c.owner||''} ${route?'· 🗺️ '+route.name:''}</div>
      ${c.waNum?`<div style="font-size:11px;color:var(--muted)">📱 ${c.waNum}</div>`:''}
      <span class="biz-tag biz-${biz}">${BIZ[biz]}</span>
      ${lastOrder?`<div style="font-size:11px;color:var(--muted);margin-top:4px">সর্বশেষ: ${fmtDate(lastOrder.date)} · ${bn(lastOrder.total)}</div>`:''}
      <div class="cust-actions">
        ${c.waNum?`<button class="cact wa" onclick="openWA('${c.waNum}')">📲 WA</button>`:''}
        ${c.lat&&c.lng?`<button class="cact mp" onclick="openMap(${c.lat},${c.lng})">📍 ম্যাপ</button>`:''}
        <button class="cact bl" onclick="viewCust('${id}')">👁 বিস্তারিত</button>
        <button class="cact" style="background:rgba(74,158,255,.15);color:var(--blue)" onclick="viewCustSalesHistory('${id}')">📋 ইতিহাস</button>
      </div>
    </div>`;
  }).join(''):'<div class="empty"><div class="ic">🏪</div>কোনো কাস্টমার নেই</div>';
}

function renderRouteRequests(){
  if(CR==='worker')return;
  const reqs=Object.entries(allRouteRequests||{}).filter(([,r])=>r.status==='pending');
  const body=$('routeRequestBody');if(!body)return;
  if(!reqs.length){body.innerHTML='<div class="empty">কোনো আবেদন নেই</div>';return;}
  body.innerHTML=reqs.map(([id,r])=>`
    <div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid var(--border)">
      <div style="font-size:14px;font-weight:600">🗺️ ${r.name}</div>
      <div style="font-size:12px;color:var(--muted)">আবেদনকারী: ${r.requestedByName} · ${fmtDate(r.ts)}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button onclick="approveRoute('${id}')" style="flex:1;padding:8px;background:rgba(46,204,138,.2);border:1px solid var(--green);color:var(--green);border-radius:8px;cursor:pointer;font-family:inherit">✅ অনুমোদন</button>
        <button onclick="rejectRoute('${id}')" style="flex:1;padding:8px;background:rgba(232,93,74,.2);border:1px solid var(--red);color:var(--red);border-radius:8px;cursor:pointer;font-family:inherit">❌ বাতিল</button>
      </div>
    </div>`).join('');
}
function renderRouteChips(){
  const el=$('routeChips');if(!el)return;
  const canDelete=(CR==='admin'||CR==='manager');
  el.innerHTML=`<button class="fb ${routeFilter==='all'?'active':''}" onclick="filterByRoute('all',this)">সব</button>`+
    Object.entries(allRoutes).map(([id,r])=>`
      <div style="display:inline-flex;align-items:center;gap:2px;margin:3px;">
        <button class="fb ${routeFilter===id?'active':''}" onclick="filterByRoute('${id}',this)" style="border-radius:${canDelete?'18px 0 0 18px':'18px'};margin:0;">🗺️ ${r.name}</button>
        ${canDelete?`<button onclick="deleteRoute('${id}','${r.name.replace(/'/g,"\'")}')" style="padding:5px 8px;border:1px solid var(--border);border-left:none;border-radius:0 18px 18px 0;background:rgba(239,68,68,.1);color:var(--red);cursor:pointer;font-size:12px;line-height:1;" title="রুট মুছুন">✕</button>`:''}
      </div>`).join('');
}
window.filterByRoute=(id,btn)=>{routeFilter=id;document.querySelectorAll('#routeChips .fb').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderCustomers();};

// ✅ রুট ডিলেট
window.deleteRoute=async(id,name)=>{
  if(CR!=='admin'&&CR!=='manager'){showToast('অনুমতি নেই!',true);return;}
  // এই রুটে কাস্টমার আছে কিনা দেখি
  const custInRoute=Object.values(allCustomers).filter(c=>c.routeId===id);
  if(custInRoute.length>0){
    if(!confirm(`"${name}" রুটে ${custInRoute.length}টি কাস্টমার আছে। রুট মুছলে কাস্টমারগুলো রুটহীন হয়ে যাবে। তবুও মুছবেন?`))return;
  } else {
    if(!confirm(`"${name}" রুটটি মুছে ফেলবেন?`))return;
  }
  await remove(ref(db,'routes/'+id));
  if(routeFilter===id){routeFilter='all';}
  showToast(`✅ "${name}" রুট মুছে গেছে`);
  if(typeof window.auditLog==='function') window.auditLog('delete_route',`রুট মুছেছেন: ${name}`);
};

function loadRouteSelects(){
  ['cRoute','todayRoute'].forEach(sid=>{
    const sel=$(sid);if(!sel)return;
    const cur=sel.value;
    sel.innerHTML='<option value="">-- রুট --</option>'+Object.entries(allRoutes).map(([id,r])=>`<option value="${id}">🗺️ ${r.name}</option>`).join('');
    sel.value=cur;
  });
}
function loadCustomerSelect(){
  const sel=$('sShopSel');if(!sel)return;
  sel.innerHTML='<option value="">-- কাস্টমার --</option>'+
    Object.entries(allCustomers).map(([id,c])=>`<option value="${id}">${c.name} (${c.owner||''})</option>`).join('')+
    '<option value="__m__">✏️ ম্যানুয়াল</option>';
}
function loadBroadcastRoutes(){
  const sel=$('broadcastTarget');if(!sel)return;
  sel.innerHTML='<option value="all">সকল কাস্টমার</option>'+
    Object.entries(allRoutes).map(([id,r])=>`<option value="${id}">🗺️ ${r.name} রুট</option>`).join('');
}

window.getGPS=()=>{
  if(!navigator.geolocation){showToast('GPS সাপোর্ট নেই, Map থেকে নিন',true);return;}
  showToast('📡 GPS খুঁজছে...');
  navigator.geolocation.getCurrentPosition(
    p=>{
      const lat=p.coords.latitude.toFixed(7);
      const lng=p.coords.longitude.toFixed(7);
      $('cLat').value=lat;
      $('cLng').value=lng;
      showGPSPreview(lat,lng);
      showToast('📍 GPS পাওয়া গেছে ✓');
    },
    err=>{
      let msg='GPS পাওয়া যায়নি';
      if(err.code===1)msg='GPS permission দেননি — Map থেকে নিন';
      else if(err.code===2)msg='GPS signal নেই — Map থেকে নিন';
      showToast(msg,true);
    },
    {enableHighAccuracy:true,timeout:10000,maximumAge:0}
  );
};

function showGPSPreview(lat,lng){
  const map=$('gpsPreviewMap');
  const frame=$('gpsMapFrame');
  const display=$('gpsCoordDisplay');
  if(!map||!frame)return;
  frame.src=`https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
  if(display)display.textContent=`✅ লোকেশন: ${lat}, ${lng}`;
  map.style.display='block';
}

window.openGoogleMapPicker=()=>{
  $('gpsPickLat').value=$('cLat').value||'';
  $('gpsPickLng').value=$('cLng').value||'';
  $('gpsPickPreview').style.display='none';
  openMo('gpsPickerMo');
};

window.previewGPSPick=()=>{
  const lat=parseFloat($('gpsPickLat').value);
  const lng=parseFloat($('gpsPickLng').value);
  if(!lat||!lng||isNaN(lat)||isNaN(lng)){showToast('সঠিক Latitude ও Longitude দিন!',true);return;}
  if(lat<20||lat>27){showToast('Latitude সঠিক নয় (বাংলাদেশ: 20–27)',true);return;}
  if(lng<88||lng>93){showToast('Longitude সঠিক নয় (বাংলাদেশ: 88–93)',true);return;}
  const frame=$('gpsPickFrame');
  frame.src=`https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
  $('gpsPickPreview').style.display='block';
  showToast('প্রিভিউ লোড হচ্ছে...');
};

window.confirmGPSPick=()=>{
  const lat=parseFloat($('gpsPickLat').value);
  const lng=parseFloat($('gpsPickLng').value);
  if(!lat||!lng||isNaN(lat)||isNaN(lng)){showToast('Latitude ও Longitude দিন!',true);return;}
  $('cLat').value=lat.toFixed(7);
  $('cLng').value=lng.toFixed(7);
  showGPSPreview(lat.toFixed(7),lng.toFixed(7));
  closeMo('gpsPickerMo');
  showToast('✅ লোকেশন সেট হয়েছে!');
};
window.addCustomer=async()=>{
  const name=$('cName').value.trim(),owner=$('cOwner').value.trim(),bizType=$('cBiz').value,routeId=$('cRoute').value;
  if(!name||!owner||!routeId){showToast('নাম, মালিক ও রুট দিন!',true);return;}
  loader(true);
  try{
    // ছবি আপলোড (থাকলে)
    let photoURL=null;
    if(window._pendingCustPhoto){
      photoURL=await uploadImageToFirebase(window._pendingCustPhoto,'customers');
      window._pendingCustPhoto=null;
    }
    await push(ref(db,'customers'),{
      name,owner,bizType,routeId,
      waNum:$('cWa').value.trim(),
      smsNum:$('cSms').value.trim(),
      lat:parseFloat($('cLat').value)||null,
      lng:parseFloat($('cLng').value)||null,
      note:$('cNote').value.trim(),
      photoURL,
      addedBy:CU.uid,addedByName:CN,ts:Date.now()
    });
    ['cName','cOwner','cWa','cSms','cLat','cLng','cNote'].forEach(id=>{const el=$(id);if(el)el.value='';});
    // photo preview রিসেট
    const prev=$('custPhotoPreview'),icon=$('custPhotoIcon');
    if(prev){prev.src='';prev.style.display='none';}
    if(icon)icon.style.display='block';
    closeMo('custMo');showToast(name+' যোগ হয়েছে ✓');
  }catch(e){showToast('সংরক্ষণ ব্যর্থ: '+e.message,true);}
  finally{loader(false);}
};
window.addRoute=async()=>{
  const name=$('rName').value.trim();
  if(!name){showToast('রুটের নাম দিন!',true);return;}
  try{
    if(CR==='worker'){
      await push(ref(db,'routeRequests'),{name,desc:$('rDesc')?.value.trim()||'',requestedBy:CU.uid,requestedByName:CN,status:'pending',ts:Date.now()});
      if($('rName'))$('rName').value='';
      if($('rDesc'))$('rDesc').value='';
      closeMo('routeMo');
      showToast('রুটের আবেদন পাঠানো হয়েছে ✓');
    } else {
      const newRef=await push(ref(db,'routes'),{name,desc:$('rDesc')?.value.trim()||'',addedBy:CU.uid,addedByName:CN,status:'active',ts:Date.now()});
      if($('rName'))$('rName').value='';
      if($('rDesc'))$('rDesc').value='';
      closeMo('routeMo');
      showToast('✅ '+name+' রুট যোগ হয়েছে!');
    }
  }catch(err){
    showToast('সংরক্ষণ ব্যর্থ: '+err.message,true);
    console.error('Route add error:',err);
  }
};
// ✅ কাস্টমার ডিলেট (Admin ও Manager)
window.deleteCustomer=async(id,name)=>{
  if(CR!=='admin'&&CR!=='manager'){showToast('শুধু Admin ও Manager মুছতে পারবে!',true);return;}
  if(!confirm(`"${name}" কাস্টমারটি সম্পূর্ণ মুছে ফেলবেন?

তার বিক্রয় রেকর্ড থাকবে কিন্তু কাস্টমার তালিকা থেকে সরে যাবে।`))return;
  await remove(ref(db,'customers/'+id));
  closeMo('custDetailMo');
  showToast(`✅ "${name}" কাস্টমার মুছে গেছে`);
  if(typeof window.auditLog==='function') window.auditLog('delete_customer',`কাস্টমার মুছেছেন: ${name}`);
};

window.approveRoute=async(id,name)=>{
  const snap=await get(ref(db,'routeRequests/'+id));
  if(!snap.exists())return;
  const d=snap.val();
  await push(ref(db,'routes'),{name:d.name,desc:d.desc||'',addedBy:d.requestedBy,addedByName:d.requestedByName,status:'active',ts:Date.now()});
  await update(ref(db,'routeRequests/'+id),{status:'approved'});
  showToast(d.name+' রুট অনুমোদিত ✓');
};
window.rejectRoute=async(id)=>{
  await update(ref(db,'routeRequests/'+id),{status:'rejected'});
  showToast('রুট আবেদন বাতিল');
};
window.openWA=num=>window.open('https://wa.me/88'+num.replace(/\D/g,''),'_blank');
window.openMap=(lat,lng)=>window.open(`https://www.google.com/maps?q=${lat},${lng}`,'_blank');

window.viewCustSalesHistory=custId=>{
  const custSales=Object.values(allSales).filter(s=>s.shopId===custId).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const cust=allCustomers[custId];
  const mo=$('custSaleHistoryMo');
  const body=$('custSaleHistoryBody');
  if(!mo||!body)return;
  $('custSaleHistoryTitle').textContent=(cust?.name||'কাস্টমার')+' — বিক্রয় ইতিহাস';
  body.innerHTML=custSales.length?custSales.map(s=>`
    <div style="background:var(--surface);border-radius:10px;padding:10px;margin-bottom:8px;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;font-weight:600">🛍 ${s.product}</span>
        <span style="font-size:14px;font-weight:700;color:var(--accent)">${bn(s.total)}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">
        📅 ${fmtDate(s.date)} · ${s.qty} পিস · 👤 ${s.workerName||'–'}
        ${s.due>0?`<span style="color:var(--red)"> · বাকি: ${bn(s.due)}</span>`:''}
      </div>
    </div>`).join(''):'<div class="empty">কোনো বিক্রয় নেই</div>';
  openMo('custSaleHistoryMo');
};
window.viewCust=id=>{
  const c=allCustomers[id];if(!c)return;
  const route=allRoutes[c.routeId];
  const cs=Object.values(allSales).filter(s=>s.shopId===id).sort((a,b)=>b.ts-a.ts);
  const totalSale=cs.reduce((a,b)=>a+(b.total||0),0);
  const totalDue=cs.reduce((a,b)=>a+(b.due||0),0);
  $('cdTitle').textContent='🏪 '+c.name;
  // ✅ Delete বাটন শুধু Admin ও Manager দেখবে
  const delRow=$('cdDeleteRow'),delBtn=$('cdDeleteBtn');
  if(delRow&&delBtn){
    if(CR==='admin'||CR==='manager'){
      delRow.style.display='block';
      delBtn.onclick=()=>window.deleteCustomer(id,c.name);
    } else {
      delRow.style.display='none';
    }
  }

  const photoSection=`
    <div style="text-align:center;margin-bottom:12px">
      <div style="position:relative;display:inline-block;">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:32px;overflow:hidden;margin:0 auto;">
          ${c.photoURL?`<img src="${c.photoURL}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;">`:'🏪'}
        </div>
        ${(CR==='admin'||CR==='manager')?`<div onclick="document.getElementById('custEditPhotoInput').click()" style="position:absolute;bottom:0;right:0;background:var(--accent);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid var(--card);cursor:pointer;">📷</div>`:''}
      </div>
      <input type="file" id="custEditPhotoInput" accept="image/*" style="display:none" onchange="updateCustPhoto(this,'${id}')">
      <div style="font-size:16px;font-weight:700;margin-top:8px">${c.name}</div>
    </div>`;

  const locationSection=c.lat&&c.lng?`
    <div style="background:var(--card);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:10px;">
      <div style="padding:11px 13px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:600">📍 লোকেশন</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${parseFloat(c.lat).toFixed(5)}, ${parseFloat(c.lng).toFixed(5)}</div>
        </div>
        <button onclick="openMap(${c.lat},${c.lng})" style="padding:7px 12px;background:var(--accent);border:none;border-radius:8px;color:#000;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">
          🗺️ Maps এ দেখুন
        </button>
      </div>
      <iframe
        src="https://maps.google.com/maps?q=${c.lat},${c.lng}&z=17&output=embed"
        width="100%" height="180" style="border:none;display:block;"
        allowfullscreen loading="lazy">
      </iframe>
    </div>`
  :`<div style="background:var(--card);border-radius:10px;padding:12px;border:1px dashed var(--border);margin-bottom:10px;text-align:center;">
      <div style="font-size:12px;color:var(--muted)">📍 লোকেশন যোগ করা হয়নি</div>
      ${(CR==='admin'||CR==='manager')?`<button onclick="editCustLocation('${id}')" style="margin-top:8px;padding:6px 14px;background:rgba(74,158,255,.15);border:1px solid var(--blue);color:var(--blue);border-radius:8px;font-family:inherit;font-size:12px;cursor:pointer;">+ লোকেশন যোগ করুন</button>`:''}
    </div>`;

  $('cdBody').innerHTML=`
    ${photoSection}
    <div style="background:var(--card);border-radius:10px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;margin-bottom:6px">👤 ${c.owner||'-'}</div>
      <div style="font-size:13px;margin-bottom:6px">🗺️ রুট: ${route?route.name:'-'}</div>
      <div style="font-size:13px;margin-bottom:6px">📱 WA: ${c.waNum||'-'}</div>
      <div style="font-size:13px">📨 SMS: ${c.smsNum||'-'}</div>
    </div>
    <div class="g2" style="margin-bottom:10px">
      <div class="sum-card c-sale"><div class="lbl">মোট বিক্রয়</div><div class="val" style="font-size:16px">${bn(totalSale)}</div></div>
      <div class="sum-card c-due"><div class="lbl">বাকি</div><div class="val" style="font-size:16px;color:${totalDue>0?'var(--red)':'var(--green)'}">${bn(totalDue)}</div></div>
    </div>
    ${locationSection}
    <div class="sec">সর্বশেষ অর্ডার</div>
    ${cs.slice(0,5).map(s=>`
      <div class="ec">
        <div class="ei">
          <div class="shop">${s.product} × ${s.qty}</div>
          <div class="prod">👤 ${s.workerName||''}</div>
          <div class="dt">📅 ${fmtDate(s.date)}</div>
        </div>
        <div class="ea">
          <div class="sale">${bn(s.total)}</div>
          ${s.due>0?`<div style="font-size:11px;color:var(--red)">বাকি ${bn(s.due)}</div>`:''}
        </div>
      </div>`).join('')||'<div class="empty">কোনো অর্ডার নেই</div>'}
    <button onclick="viewCustSalesHistory('${id}')" style="width:100%;margin-top:10px;padding:10px;background:rgba(74,158,255,.1);border:1px solid var(--blue);color:var(--blue);border-radius:10px;font-family:inherit;font-size:13px;cursor:pointer;">
      📋 সম্পূর্ণ বিক্রয় ইতিহাস
    </button>
  `;
  openMo('custDetailMo');
};

// কাস্টমারের ছবি আপডেট
window.updateCustPhoto=async(input,custId)=>{
  const file=input.files[0];if(!file)return;
  showToast('ছবি আপলোড হচ্ছে...');
  const url=await uploadImageToFirebase(file,'customers');
  if(url){
    await update(ref(db,'customers/'+custId),{photoURL:url});
    showToast('✅ দোকানের ছবি আপডেট হয়েছে!');
    // প্রোফাইল রিফ্রেশ
    viewCust(custId);
  }
};

// কাস্টমারের লোকেশন আপডেট
window.editCustLocation=id=>{
  $('gpsPickLat').value='';
  $('gpsPickLng').value='';
  $('gpsPickPreview').style.display='none';
  window._editCustLocationId=id;
  // confirm বাটনের text পরিবর্তন
  const confirmBtn=document.querySelector('#gpsPickerMo button[onclick="confirmGPSPick()"]');
  if(confirmBtn)confirmBtn.textContent='✅ লোকেশন আপডেট করুন';
  openMo('gpsPickerMo');
};

// confirmGPSPick override — কাস্টমার আপডেটের জন্য
const _origConfirmGPS=window.confirmGPSPick;
window.confirmGPSPick=async()=>{
  const lat=parseFloat($('gpsPickLat').value);
  const lng=parseFloat($('gpsPickLng').value);
  if(!lat||!lng||isNaN(lat)||isNaN(lng)){showToast('Latitude ও Longitude দিন!',true);return;}
  // কাস্টমার লোকেশন edit mode
  if(window._editCustLocationId){
    await update(ref(db,'customers/'+window._editCustLocationId),{lat,lng});
    window._editCustLocationId=null;
    closeMo('gpsPickerMo');
    showToast('✅ লোকেশন আপডেট হয়েছে!');
    return;
  }
  // নতুন কাস্টমার add mode
  $('cLat').value=lat.toFixed(7);
  $('cLng').value=lng.toFixed(7);
  showGPSPreview(lat.toFixed(7),lng.toFixed(7));
  closeMo('gpsPickerMo');
  showToast('✅ লোকেশন সেট হয়েছে!');
};

// SMS BROADCAST
window.openSMSBroadcast=()=>{loadBroadcastRoutes();openMo('smsBroadcastMo');};
window.sendBroadcast=async()=>{
  if(!allSMSConfig?.apiKey){showToast('SMS API Key সেট করুন!',true);return;}
  const target=$('broadcastTarget').value;
  const msg=$('broadcastMsg').value.trim();
  if(!msg){showToast('বার্তা লিখুন!',true);return;}
  let custs=Object.values(allCustomers);
  if(target!=='all')custs=custs.filter(c=>c.routeId===target);
  let sent=0;
  custs.forEach(c=>{
    const num=c.smsNum||c.waNum;
    if(num){sendSMSAlphaNet(num,'NovaTEch BD: '+msg);sent++;}
  });
  $('broadcastMsg').value='';closeMo('smsBroadcastMo');
  showToast(`${sent} জন কাস্টমারকে SMS পাঠানো হচ্ছে...`);
};

// ROUTE VISIT
window.startRoute=async()=>{
  const rid=$('todayRoute').value;if(!rid){showToast('রুট বেছে নিন!',true);return;}
  activeRouteId=rid;
  await set(ref(db,'workerStatus/'+CU.uid+'/activeRoute'),{routeId:rid,date:today(),startedAt:Date.now()});
  showToast('রুট শুরু ✓');renderVisitList();refreshDash();
};
function renderVisitList(){
  const el=$('visitList');if(!el)return;
  if(!activeRouteId){el.innerHTML='<div class="empty"><div class="ic">🗺️</div>রুট সেট করুন</div>';return;}
  const rc=Object.entries(allCustomers).filter(([,c])=>c.routeId===activeRouteId);
  if(!rc.length){el.innerHTML='<div class="empty"><div class="ic">🏪</div>এই রুটে দোকান নেই</div>';return;}
  const vi=Object.values(allSales).filter(s=>s.uid===CU.uid&&s.date===today()&&s.routeId===activeRouteId).map(s=>s.shopId);
  el.innerHTML=rc.map(([id,c])=>{
    const done=vi.includes(id);
    return`<div class="visit-card"><div class="${done?'vs-done':'vs-pending'}"></div><div style="flex:1"><div style="font-size:13px;font-weight:600">${c.name}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">👤 ${c.owner||''}</div></div><div style="text-align:right">${done?'<span style="color:var(--green);font-size:11px">✓ ভিজিট</span>':`<button style="padding:5px 10px;border:1px solid var(--accent);border-radius:7px;background:rgba(245,166,35,.1);color:var(--accent);font-family:inherit;font-size:11px;cursor:pointer;" onclick="quickVisit('${id}')">📝 বিক্রয়</button>`}${c.lat&&c.lng?`<div style="font-size:10px;color:var(--accent);cursor:pointer;margin-top:3px" onclick="openMap(${c.lat},${c.lng})">📍 ম্যাপ</div>`:''}</div></div>`;
  }).join('');
}
window.quickVisit=id=>{$('sShopSel').value=id;sShopSelChange();showPage('sale');};

// SALE
function loadProductSelects(){
  const sel=$('sProd');if(!sel)return;
  sel.innerHTML='<option value="">-- প্রোডাক্ট --</option>'+
    Object.entries(allProducts).map(([id,p])=>`<option value="${id}" data-sell="${p.sellPrice||0}" data-buy="${p.buyPrice||0}" data-disc="${p.maxDisc||0}">${p.name}</option>`).join('');
}
function sShopSelChange(){$('sShopManualRow').style.display=$('sShopSel').value==='__m__'?'block':'none';}
$('sShopSel')?.addEventListener('change',sShopSelChange);
$('sProd')?.addEventListener('change',function(){
  const o=this.options[this.selectedIndex];
  if(o?.dataset.sell){$('sSell').value=o.dataset.sell;$('maxDiscLabel').textContent=o.dataset.disc||0;$('sDisc').max=o.dataset.disc||0;}
  calcSaleSummary();
  updateSMSInfo();
});
['sQty','sSell','sDisc'].forEach(id=>$(id)?.addEventListener('input',()=>{calcSaleSummary();updateSMSInfo();}));
$('sPay')?.addEventListener('change',function(){$('partRow').style.display=this.value==='partial'?'block':'none';});

function updateSMSInfo(){
  const shopId=$('sShopSel').value;
  const c=allCustomers[shopId];
  const si=$('smsInfo');
  if(si)si.style.display=(c?.smsNum&&allSMSConfig?.apiKey)?'block':'none';
}

function calcSaleSummary(){
  const qty=parseFloat($('sQty').value)||0,sell=parseFloat($('sSell').value)||0,disc=parseFloat($('sDisc').value)||0;
  const prod=allProducts[$('sProd').value],buy=prod?(prod.buyPrice||0):0;
  const da=sell*qty*disc/100,total=sell*qty-da,profit=(sell-buy)*qty-da;
  const el=$('saleSummary');
  if(!qty||!sell){el.innerHTML='';return;}
  el.innerHTML=`<span style="color:var(--muted)">মোট: </span><b style="color:var(--blue)">${bn(total)}</b>${disc>0?` · <span style="color:var(--muted)">ছাড়: </span><b style="color:var(--red)">${bn(da)} (${disc}%)</b>`:''}${CR==='admin'?` · <span style="color:var(--muted)">লাভ: </span><b style="color:var(--green)">${bn(profit)}</b>`:''}`;
}

// ✅ FIX: বিক্রয়ে কর্মীর স্টক স্বয়ংক্রিয়ভাবে কমানোর ফাংশন
async function deductWorkerStock(uid, prodId, prodName, soldQty) {
  try {
    // কর্মীর বরাদ্দকৃত স্টক খুঁজি যেখানে এখনো বিক্রি হয়নি
    const assigns = Object.entries(allStockAssign)
      .filter(([,s]) => s.uid === uid && s.prodId === prodId)
      .sort((a,b) => a[1].ts - b[1].ts); // পুরানো আগে
    let toDeduct = soldQty;
    for (const [key, assign] of assigns) {
      if (toDeduct <= 0) break;
      const currentQty = assign.qty;
      if (currentQty <= 0) continue;
      const deduct = Math.min(currentQty, toDeduct);
      await update(ref(db, 'stockAssign/' + key), { qty: currentQty - deduct, lastSaleDeduct: Date.now() });
      toDeduct -= deduct;
    }
    // গুদামের মোট স্টক থেকেও কমাই (যদি কর্মী ডিরেক্ট বিক্রি করে)
    if (toDeduct > 0) {
      const stocks = Object.entries(allStock)
        .filter(([,s]) => s.prodId === prodId && s.qty > 0)
        .sort((a,b) => a[1].ts - b[1].ts);
      for (const [key, stock] of stocks) {
        if (toDeduct <= 0) break;
        const deduct = Math.min(stock.qty, toDeduct);
        await update(ref(db, 'stock/' + key), { qty: stock.qty - deduct });
        toDeduct -= deduct;
      }
    }
  } catch(e) { console.warn('Stock deduct error:', e.message); }
}

window.addSale=async()=>{
  const shopSelVal=$('sShopSel').value,shopId=shopSelVal!=='__m__'&&shopSelVal?shopSelVal:null;
  const shop=shopId?(allCustomers[shopId]?.name||''):($('sShopManual').value.trim()||'');
  const prodId=$('sProd').value,qty=parseFloat($('sQty').value),sell=parseFloat($('sSell').value);
  const disc=parseFloat($('sDisc').value)||0,date=$('sDate').value,pay=$('sPay').value,part=parseFloat($('sPart').value)||0;
  if(!shop||!prodId||!qty||!sell||!date){showToast('সব তথ্য দিন!',true);return;}
  const prod=allProducts[prodId];
  if(disc>(prod?.maxDisc||0)){showToast(`সর্বোচ্চ ছাড় ${prod?.maxDisc||0}%`,true);return;}
  const da=sell*qty*disc/100,total=sell*qty-da,profit=((sell-(prod?.buyPrice||0))*qty)-da;
  let due=pay==='due'?total:pay==='partial'?total-part:0;
  const photoUrl=window._pendingSalePhoto||null;
  const saleData={date,shop,shopId,product:prod.name,productId:prodId,qty,sellPrice:sell,disc,total,profit,payStatus:pay,due,uid:CU.uid,workerName:CN,routeId:activeRouteId||null,ts:Date.now(),otpConfirmed:false,photoUrl};
  window._pendingSalePhoto=null;

  const cust=allCustomers[shopId];
  const smsNum=cust?.smsNum||cust?.waNum;
  const hasAPI=!!(allSMSConfig?.apiKey);
  const otpEnabled=allSMSConfig?.otpEnabled!==false; // default true

  // Build bill SMS text
  const billMsg=(allSMSConfig?.billTemplate||
`NovaTEch BD
দোকান: {shop}
পণ্য: {product} x {qty} পিস
ডিসকাউন্ট: {disc}%
মোট: {total}
{otp_line}`)
    .replace('{shop}',shop)
    .replace('{product}',prod.name)
    .replace('{qty}',qty)
    .replace('{disc}',disc)
    .replace('{total}','৳'+Math.round(total));

  if(smsNum&&hasAPI&&otpEnabled){
    // OTP flow
    const otp=genOTP();
    pendingSaleData=saleData;pendingOTP=otp;
    const smsWithOTP=billMsg.replace('{otp_line}','OTP: '+otp+'\nOTP দিয়ে বিল নিশ্চিত করুন।');
    sendSMSAlphaNet(smsNum,smsWithOTP);
    $('otpSection').style.display='block';
    $('sentOTPDisplay').textContent=otp;
    $('otpInput').value='';
    showToast('📱 OTP SMS পাঠানো হয়েছে!');
    window.scrollTo(0,($('otpSection').offsetTop||0)-80);
  } else if(smsNum&&hasAPI&&!otpEnabled){
    // Bill SMS without OTP
    const smsNoOTP=billMsg.replace('{otp_line}','ধন্যবাদ আমাদের সাথে ব্যবসার জন্য।');
    sendSMSAlphaNet(smsNum,smsNoOTP);
    await push(ref(db,'sales'),{...saleData,otpConfirmed:true,otpSkipped:false,smsSent:true});
    await deductWorkerStock(CU.uid,prodId,prod.name,qty); // ✅ FIX: স্টক কর্তন
    clearSaleForm();showToast('✅ বিক্রয় সংরক্ষিত + SMS পাঠানো হয়েছে');renderVisitList();
  } else {
    // No SMS
    await push(ref(db,'sales'),saleData);
    await deductWorkerStock(CU.uid,prodId,prod.name,qty); // ✅ FIX: স্টক কর্তন
    clearSaleForm();showToast('✅ বিক্রয় সংরক্ষিত');renderVisitList();
  }
};

window.confirmOTP=async()=>{
  const entered=$('otpInput').value.trim();
  if(!entered){showToast('OTP লিখুন!',true);return;}
  if(entered===pendingOTP){
    const saleData={...pendingSaleData,otpConfirmed:true};
    await push(ref(db,'sales'),saleData);
    // ✅ FIX: OTP নিশ্চিত হলে স্টক কমাও
    await deductWorkerStock(CU.uid,saleData.productId,saleData.product,saleData.qty);
    pendingSaleData=null;pendingOTP=null;
    $('otpSection').style.display='none';
    clearSaleForm();showToast('বিক্রয় OTP নিশ্চিত ✓');renderVisitList();
  }else{
    showToast('OTP ভুল! আবার চেষ্টা করুন',true);
  }
};
window.skipOTP=async()=>{
  if(!pendingSaleData)return;
  const saleData={...pendingSaleData,otpConfirmed:false,otpSkipped:true};
  await push(ref(db,'sales'),saleData);
  // ✅ FIX: OTP ছাড়া সংরক্ষণেও স্টক কমাও
  await deductWorkerStock(CU.uid,saleData.productId,saleData.product,saleData.qty);
  pendingSaleData=null;pendingOTP=null;
  $('otpSection').style.display='none';
  clearSaleForm();showToast('বিক্রয় সংরক্ষিত (OTP ছাড়া)');renderVisitList();
};
function clearSaleForm(){
  $('sQty').value='';$('sSell').value='';$('sDisc').value='';$('sPart').value='';$('saleSummary').innerHTML='';
}
function renderSaleList(){
  let list=Object.values(allSales);
  if(CR==='worker')list=list.filter(s=>s.uid===CU.uid);
  list.sort((a,b)=>(b.ts||0)-(a.ts||0));
  $('saleList').innerHTML=list.length?list.map(s=>saleCard(s)).join(''):'<div class="empty"><div class="ic">📭</div>কোনো বিক্রয় নেই</div>';
}
function saleCard(s){
  const statusTag=s.otpConfirmed?`<span class="confirmed-tag">✓ OTP নিশ্চিত</span>`:s.otpSkipped?`<span class="pending-tag">OTP ছাড়া</span>`:'';
  return`<div class="ec"><div class="ei"><div class="shop">${s.shop}</div><div class="prod">🛍 ${s.product} × ${s.qty} পিস ${s.disc>0?`· ছাড়: ${s.disc}%`:''}</div><div class="dt">📅 ${fmtDate(s.date)} · <span class="wtag">${s.workerName||''}</span></div>${statusTag}</div><div class="ea"><div class="sale">${bn(s.total)}</div>${CR==='admin'?`<div style="font-size:11px;color:var(--green);margin-top:2px">+${bn(s.profit)}</div>`:''}${s.due>0?`<div class="due-tag">বাকি ${bn(s.due)}</div>`:''}</div></div>`;
}

// EXPENSE
window.addExpense=async()=>{
  const date=$('eDate').value,type=$('eType').value,amount=parseFloat($('eAmt').value);
  if(!date||!amount){showToast('তথ্য দিন!',true);return;}
  const status=(CR==='worker'&&amount>250)?'pending':'approved';
  await push(ref(db,'expenses'),{date,type,amount,note:$('eNote').value.trim(),uid:CU.uid,workerName:CN,status,ts:Date.now()});
  $('eAmt').value='';$('eNote').value='';
  showToast(status==='pending'?'খরচ আবেদন পাঠানো হয়েছে (অনুমোদন লাগবে) ✓':'খরচ সংরক্ষিত ✓');
};
window.approveExpense=async(id)=>{
  await update(ref(db,'expenses/'+id),{status:'approved',approvedBy:CN,approvedAt:Date.now()});
  showToast('খরচ অনুমোদিত ✓');
};
window.rejectExpense=async(id)=>{
  await update(ref(db,'expenses/'+id),{status:'rejected',rejectedBy:CN,rejectedAt:Date.now()});
  showToast('খরচ বাতিল');
};
function renderExpList(){
  let list=Object.entries(allExpenses);
  if(CR==='worker')list=list.filter(([,e])=>e.uid===CU.uid);
  list.sort(([,a],[,b])=>(b.ts||0)-(a.ts||0));
  $('expList').innerHTML=list.length?list.map(([id,e])=>{
    const isPending=e.status==='pending';
    const canApprove=(CR==='admin'||CR==='manager')&&isPending;
    return `<div class="ec" style="${isPending?'border-left:3px solid var(--accent)':''}">
      <div class="ei">
        <div class="shop">${e.type} ${isPending?'<span style="font-size:10px;background:var(--accent);color:#000;border-radius:4px;padding:1px 5px">অপেক্ষমান</span>':''}</div>
        <div class="prod">${e.note||''} · <span class="wtag">${e.workerName||''}</span></div>
        <div class="dt">📅 ${fmtDate(e.date)}</div>
      </div>
      <div class="ea">
        <div class="sale" style="color:var(--red)">${bn(e.amount)}</div>
        ${canApprove?`<div style="display:flex;gap:4px;margin-top:4px">
          <button onclick="approveExpense('${id}')" style="font-size:10px;padding:3px 7px;background:rgba(46,204,138,.2);border:1px solid var(--green);color:var(--green);border-radius:5px;cursor:pointer">✅</button>
          <button onclick="rejectExpense('${id}')" style="font-size:10px;padding:3px 7px;background:rgba(232,93,74,.2);border:1px solid var(--red);color:var(--red);border-radius:5px;cursor:pointer">❌</button>
        </div>`:''}
      </div>
    </div>`;
  }).join(''):'<div class="empty"><div class="ic">💸</div>কোনো খরচ নেই</div>';
}

// ALLOWANCE
function renderMyAllowance(){
  const t=today();
  const my=Object.values(allAllowances).filter(a=>a.uid===CU.uid&&a.from<=t&&a.to>=t);
  $('myAllowance').innerHTML=my.length?my.map(a=>`<div class="al-card"><div style="font-size:13px;font-weight:600">${a.type} ভাতা</div><div style="font-size:11px;color:var(--muted);margin-top:2px">📅 ${fmtDate(a.from)} – ${fmtDate(a.to)}</div><div style="font-size:18px;font-weight:700;color:var(--green);margin-top:3px">${bn(a.amount)}/দিন</div></div>`).join(''):'<div class="empty">আজকের ভাতা নেই</div>';
}
function loadAllWorkerSelects(){
  ['alWorker','salWorker','asWorker','teamLeader','addTeamMember','addTeamSel'].forEach(sid=>{
    const sel=$(sid);if(!sel)return;
    if(sid==='addTeamSel'){
      sel.innerHTML='<option value="">-- টিম --</option>'+Object.entries(allTeams).map(([id,t])=>`<option value="${id}">${t.name}</option>`).join('');
      return;
    }
    sel.innerHTML='<option value="">-- বেছে নিন --</option>'+
      Object.entries(allUsers).filter(([,u])=>u.role==='worker'||u.role==='manager').map(([uid,u])=>`<option value="${uid}">${u.name} (${u.role==='worker'?'কর্মী':'ম্যানেজার'})</option>`).join('');
  });
}
window.addAllowance=async()=>{
  const uid=$('alWorker').value,type=$('alType').value,from=$('alFrom').value,to=$('alTo').value,amount=parseFloat($('alAmt').value);
  if(!uid||!from||!to||!amount){showToast('তথ্য দিন!',true);return;}
  await push(ref(db,'allowances'),{uid,type,from,to,amount,workerName:allUsers[uid]?.name,ts:Date.now()});
  $('alAmt').value='';showToast('ভাতা সংরক্ষিত ✓');
};
function renderAllowList(){
  const list=Object.entries(allAllowances).sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));
  $('allowList').innerHTML=list.length?list.map(([id,a])=>`<div class="al-card" style="display:flex;justify-content:space-between"><div><div style="font-size:13px;font-weight:600">👤 ${a.workerName||''}</div><div style="font-size:11px;color:var(--muted)">🚗 ${a.type} · ${fmtDate(a.from)} – ${fmtDate(a.to)}</div><div style="font-size:17px;font-weight:700;color:var(--green)">${bn(a.amount)}/দিন</div></div><button class="del-btn" onclick="delAllow('${id}')">মুছুন</button></div>`).join(''):'<div class="empty">নেই</div>';
}
window.delAllow=async id=>{if(!confirm('মুছবেন?'))return;await remove(ref(db,'allowances/'+id));};

// DUE
function renderDue(){
  // সকল বাকি — কর্মীও সব দেখবে
  const dm={};
  Object.values(allSales).forEach(s=>{
    if(s.due>0){
      if(!dm[s.shop])dm[s.shop]={total:0,workers:new Set(),custId:s.shopId};
      dm[s.shop].total+=s.due;
      if(s.workerName)dm[s.shop].workers.add(s.workerName);
    }
  });
  const canPay=true; // ✅ কর্মীরাও পেমেন্ট গ্রহণ করতে পারবে
  $('dueList').innerHTML=Object.keys(dm).length?Object.keys(dm).map(shop=>{
    const d=dm[shop];
    const cust=d.custId?allCustomers[d.custId]:null;
    const custInfo=cust?`<div style="font-size:11px;color:var(--muted);margin-top:2px">📱 ${cust.waNum||cust.smsNum||'–'} ${cust.owner?'· '+cust.owner:''}</div>`:'';
    const workerInfo=`<div style="font-size:11px;color:var(--blue);margin-top:2px">👤 ${[...d.workers].join(', ')||'–'}</div>`;
    return `<div class="due-card">
      <div style="font-size:14px;font-weight:600">🏪 ${shop}</div>
      ${custInfo}${workerInfo}
      <div style="font-size:20px;font-weight:700;color:var(--purple);margin:4px 0">${bn(d.total)}</div>
      <button class="pay-btn" onclick="openPayMo('${shop}',${d.total})">💰 পেমেন্ট গ্রহণ</button>
    </div>`;
  }).join(''):'<div class="empty" style="margin-top:40px"><div class="ic">🎉</div>কোনো বাকি নেই!</div>';
  // কর্মীর নিজের বাকির সারসংক্ষেপ
  const myDueEl=$('myDueSummary');
  if(myDueEl&&CR==='worker'){
    const myDue=Object.values(allSales).filter(s=>s.uid===CU.uid&&s.due>0).reduce((a,s)=>a+s.due,0);
    myDueEl.innerHTML=myDue>0?`<div style="background:rgba(232,93,74,.1);border:1px solid var(--red);border-radius:10px;padding:12px;margin-bottom:12px"><div style="font-size:13px;font-weight:600;color:var(--red)">⚠️ আমার দেওয়া বাকি: ${bn(myDue)}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">এই বাকি তোলা না হলে কমিশন যোগ হবে না</div></div>`:'';
  }
}
window.openPayMo=(shop,due)=>{payShop=shop;$('pmShop').value=shop;$('pmDue').value=due;$('pmPay').value='';openMo('payMo');};
window.collectPay=async()=>{
  const pay=parseFloat($('pmPay').value);if(!pay||pay<=0){showToast('পরিমাণ লিখুন!',true);return;}
  let rem=pay;const updates={};
  const paidSaleIds=[];
  Object.entries(allSales).forEach(([id,s])=>{
    if(s.shop===payShop&&s.due>0&&rem>0){
      const r=Math.min(s.due,rem);
      updates['sales/'+id+'/due']=s.due-r;
      // ✅ কে পেমেন্ট নিলো রেকর্ড করি
      updates['sales/'+id+'/lastPayBy']=CN;
      updates['sales/'+id+'/lastPayRole']=CR;
      updates['sales/'+id+'/lastPayAt']=Date.now();
      paidSaleIds.push(id);
      rem-=r;
    }
  });
  // ✅ পেমেন্ট লগ রাখি
  await push(ref(db,'paymentLogs'),{
    shop:payShop,amount:pay,collectedBy:CN,
    collectedByUid:CU.uid,role:CR,
    ts:Date.now(),date:today()
  });
  await update(ref(db),updates);
  closeMo('payMo');
  showToast('✅ পেমেন্ট গ্রহণ হয়েছে — '+bn(pay));
};

// STOCK
window.addStock=async()=>{
  const prodId=$('stProd').value,qty=parseInt($('stQty').value),date=$('stDate').value;
  if(!prodId||!qty||!date){showToast('তথ্য দিন!',true);return;}
  await push(ref(db,'stock'),{prodId,prodName:allProducts[prodId].name,qty,date,note:$('stNote').value.trim(),addedBy:CU.uid,addedByName:CN,ts:Date.now()});
  $('stQty').value='';$('stNote').value='';showToast('স্টক যোগ ✓');
};
window.assignStock=async()=>{
  const uid=$('asWorker').value,prodId=$('asProd').value,qty=parseInt($('asQty').value);
  if(!uid||!prodId||!qty){showToast('তথ্য দিন!',true);return;}
  const ti=Object.values(allStock).filter(s=>s.prodId===prodId).reduce((a,b)=>a+b.qty,0);
  const ta=Object.values(allStockAssign).filter(s=>s.prodId===prodId).reduce((a,b)=>a+b.qty,0);
  if(qty>(ti-ta)){showToast(`মাত্র ${ti-ta} পিস আছে!`,true);return;}
  await push(ref(db,'stockAssign'),{uid,workerName:allUsers[uid]?.name,prodId,prodName:allProducts[prodId].name,qty,date:today(),assignedBy:CN,ts:Date.now()});
  $('asQty').value='';showToast('বরাদ্দ ✓');
};
function renderStock(){
  // Worker এর জন্য stock assign ফর্ম লুকাও
  const stockAssignForm=$('stockAssignForm');
  if(stockAssignForm)stockAssignForm.style.display=(CR==='worker'?'none':'block');
  const af=$('stockAddForm'),asf=$('stockAssignForm');
  if(af)af.style.display=CR==='worker'?'none':'block';
  if(asf)asf.style.display=CR==='worker'?'none':'block';
  // Load selects
  ['stProd','asProd'].forEach(sid=>{const sel=$(sid);if(!sel)return;sel.innerHTML='<option value="">-- প্রোডাক্ট --</option>'+Object.entries(allProducts).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('');});
  const pm={};
  Object.values(allProducts).forEach(p=>{pm[p.name]={in:0,assigned:0,sold:0};});
  Object.values(allStock).forEach(s=>{if(!pm[s.prodName])pm[s.prodName]={in:0,assigned:0,sold:0};pm[s.prodName].in+=s.qty;});
  Object.values(allStockAssign).forEach(s=>{if(!pm[s.prodName])pm[s.prodName]={in:0,assigned:0,sold:0};pm[s.prodName].assigned+=s.qty;});
  Object.values(allSales).forEach(s=>{if(!pm[s.product])pm[s.product]={in:0,assigned:0,sold:0};pm[s.product].sold+=s.qty;});
  $('stockSummary').innerHTML=Object.entries(pm).map(([name,s])=>{const av=s.in-s.assigned,low=av<=5&&s.in>0;return`<div class="stock-card${low?' low':''}"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:13px;font-weight:600">📦 ${name}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">আসা: ${s.in} · বিতরণ: ${s.assigned} · বিক্রয়: ${s.sold}</div></div><div style="text-align:right"><div style="font-size:26px;font-weight:700;color:${low?'var(--red)':'var(--green)'};">${av}</div><div style="font-size:10px;color:var(--muted)">গুদামে</div></div></div>${low?'<div style="font-size:11px;color:var(--red);margin-top:5px">⚠️ স্টক কম!</div>':''}</div>`}).join('')||'<div class="empty">স্টক নেই</div>';
  const we=$('workerStockList');if(!we)return;
  if(CR==='worker'){
    const ma={};
    Object.values(allStockAssign).filter(s=>s.uid===CU.uid).forEach(s=>{ma[s.prodName]=(ma[s.prodName]||0)+s.qty;});
    Object.values(allSales).filter(s=>s.uid===CU.uid).forEach(s=>{if(ma[s.product])ma[s.product]-=s.qty;});
    we.innerHTML=Object.entries(ma).length?Object.entries(ma).map(([n,q])=>`<div class="al-card"><div style="font-size:13px;font-weight:600">📦 ${n}</div><div style="font-size:22px;font-weight:700;color:${q<=2?'var(--red)':'var(--green)'};margin:4px 0">${q} পিস</div></div>`).join(''):'<div class="empty">আপনার কাছে স্টক নেই</div>';
  }else{
    const wm={};
    Object.values(allStockAssign).forEach(s=>{if(!wm[s.workerName])wm[s.workerName]={};wm[s.workerName][s.prodName]=(wm[s.workerName][s.prodName]||0)+s.qty;});
    Object.values(allSales).forEach(s=>{if(s.workerName&&wm[s.workerName]&&wm[s.workerName][s.product])wm[s.workerName][s.product]-=s.qty;});
    we.innerHTML=Object.entries(wm).length?Object.entries(wm).map(([wn,prods])=>`<div class="al-card"><div style="font-size:13px;font-weight:600">👤 ${wn}</div>${Object.entries(prods).map(([pn,q])=>`<div style="display:flex;justify-content:space-between;margin-top:5px;padding:5px 8px;background:var(--surface);border-radius:7px;"><span style="font-size:12px">📦 ${pn}</span><span style="font-size:13px;font-weight:700;color:${q<=2?'var(--red)':'var(--green)'}"> ${q} পিস</span></div>`).join('')}</div>`).join(''):'<div class="empty">কোনো বরাদ্দ নেই</div>';
  }
}

// ATTENDANCE
window.checkIn=async()=>{
  const existing=Object.entries(allAttendance).find(([,a])=>a.uid===CU.uid&&a.date===today());
  if(existing){showToast('আজ ইতিমধ্যে চেক-ইন হয়েছে!',true);return;}
  const now=Date.now();
  const cutoff=new Date();cutoff.setHours(10,0,0,0);
  const isLate=now>cutoff.getTime();
  await push(ref(db,'attendance'),{uid:CU.uid,name:CN,date:today(),checkIn:now,checkOut:null,isLate,ts:now});
  showToast(isLate?'চেক-ইন ✓ (দেরিতে)':'চেক-ইন ✓');
};
window.checkOut=async()=>{
  const existing=Object.entries(allAttendance).find(([,a])=>a.uid===CU.uid&&a.date===today());
  if(!existing){showToast('আগে চেক-ইন করুন!',true);return;}
  const [,attData]=existing;
  if(!attData.checkIn){showToast('আগে চেক-ইন করুন!',true);return;}
  const [id,att]=existing;
  if(att.checkOut){showToast('ইতিমধ্যে চেক-আউট!',true);return;}
  const checkOut=Date.now();
  const hours=(checkOut-att.checkIn)/3600000;
  const sal=allSalaries[CU.uid];
  // Use shift end time to determine OT
  const shiftEnd=sal?.shiftEnd||'17:50';
  const [eh,em]=shiftEnd.split(':').map(Number);
  const todayShiftEnd=new Date();todayShiftEnd.setHours(eh,em,0,0);
  const isOT=checkOut>todayShiftEnd.getTime();
  const otHours=isOT?((checkOut-todayShiftEnd.getTime())/3600000).toFixed(2):0;
  await update(ref(db,'attendance/'+id),{checkOut,totalHours:hours.toFixed(2),isOT,otHours,otApproved:false});
  showToast(`চেক-আউট ✓ (${hours.toFixed(1)} ঘণ্টা)${isOT?` · ওভারটাইম: ${otHours} ঘণ্টা (অনুমোদন লাগবে)`:''}`);
};
function renderAttendance(){
  const asd=$('attStatusDisplay');
  if(asd){
    const td=Object.values(allAttendance).find(a=>a.uid===CU.uid&&a.date===today());
    if(!td)asd.innerHTML='<div style="font-size:13px;color:var(--muted)">আজ চেক-ইন হয়নি</div>';
    else if(!td.checkOut)asd.innerHTML=`<div style="font-size:13px;color:var(--green);font-weight:600">✅ কাজে আছেন ${td.isLate?'<span style="color:var(--red)">(দেরিতে)</span>':''}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">চেক-ইন: ${fmtTime(td.checkIn)}</div>`;
    else asd.innerHTML=`<div style="font-size:13px;color:var(--muted)">আজকের কাজ শেষ (${td.totalHours} ঘণ্টা)</div>`;
  }
  const ml=$('myAttList');
  if(ml){
    const myList=Object.values(allAttendance).filter(a=>a.uid===CU.uid).sort((a,b)=>b.ts-a.ts).slice(0,10);
    ml.innerHTML=myList.length?myList.map(a=>`<div class="att-card${a.isLate?' att-late':''}"><div style="display:flex;justify-content:space-between"><span style="font-size:13px;font-weight:600">📅 ${fmtDate(a.date)} ${a.isLate?'⚠️ দেরিতে':''}</span><span style="font-size:13px;color:var(--blue)">${a.totalHours||'–'} ঘণ্টা</span></div>${a.checkIn?`<div style="font-size:11px;color:var(--muted);margin-top:3px">ইন: ${fmtTime(a.checkIn)} ${a.checkOut?'· আউট: '+fmtTime(a.checkOut):'· চলছে'}</div>`:''}</div>`).join(''):'<div class="empty">উপস্থিতি নেই</div>';
  }
  if(CR!=='worker'){
    const aas=$('allAttSection');if(aas)aas.style.display='block';
    // Late alerts this month
    const now=new Date();
    const lateMap={};
    Object.values(allAttendance).forEach(a=>{
      const d=new Date(a.date);
      if(d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()&&a.isLate){
        lateMap[a.uid]=(lateMap[a.uid]||{name:a.name,count:0});
        lateMap[a.uid].count++;
      }
    });
    const ll=$('lateAlertList');
    if(ll)ll.innerHTML=Object.values(lateMap).length?Object.values(lateMap).filter(l=>l.count>0).map(l=>`<div class="alert-card"><div class="an">⚠️ ${l.name} · ${l.count} বার দেরিতে ${l.count>=3?'🔴 সতর্কতা!':''}</div></div>`).join(''):'<div class="empty">কোনো লেট অ্যালার্ট নেই</div>';
    // All attendance today
    const aal=$('allAttList');
    if(aal){
      const tl=Object.values(allAttendance).filter(a=>a.date===today());
      aal.innerHTML=tl.length?tl.map(a=>`<div class="att-card${a.isLate?' att-late':''}"><div style="display:flex;justify-content:space-between"><span style="font-size:13px;font-weight:600">👤 ${a.name} ${a.isLate?'⚠️':''}</span>${a.isOT&&!a.otApproved?`<button style="font-size:10px;padding:3px 8px;border:1px solid var(--accent);border-radius:5px;background:none;color:var(--accent);cursor:pointer;" onclick="openOTApproval('${Object.keys(allAttendance).find(k=>allAttendance[k]===a)}')">OT অনুমোদন</button>`:''}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${a.checkIn?'ইন: '+fmtTime(a.checkIn):''} ${a.checkOut?'· আউট: '+fmtTime(a.checkOut):'· কাজে আছেন'}</div></div>`).join(''):'<div class="empty">আজ কেউ চেক-ইন করেনি</div>';
    }
  }
}
window.openOTApproval=id=>{
  const a=allAttendance[id];if(!a)return;currentOTId=id;
  $('otBody').innerHTML=`<div class="al-card"><div style="font-size:14px;font-weight:600">👤 ${a.name}</div><div style="font-size:13px;color:var(--muted);margin-top:4px">মোট: ${a.totalHours} ঘণ্টা · ওভারটাইম: ${a.otHours} ঘণ্টা</div></div>`;
  openMo('overtimeMo');
};
window.approveOT=async()=>{if(!currentOTId)return;await update(ref(db,'attendance/'+currentOTId),{otApproved:true,otApprovedBy:CN});closeMo('overtimeMo');showToast('ওভারটাইম অনুমোদিত ✓');};
window.rejectOT=async()=>{if(!currentOTId)return;await update(ref(db,'attendance/'+currentOTId),{otApproved:false,isOT:false});closeMo('overtimeMo');showToast('ওভারটাইম বাতিল');};

// LEAVE
window.applyLeave=async()=>{
  const type=$('leaveType').value,from=$('leaveFrom').value,to=$('leaveTo').value,reason=$('leaveReason').value.trim();
  if(!from||!to){showToast('তারিখ দিন!',true);return;}
  await push(ref(db,'leaves'),{uid:CU.uid,name:CN,type,from,to,reason,status:'pending',ts:Date.now()});
  $('leaveReason').value='';showToast('আবেদন পাঠানো ✓');
};
function renderLeaves(){
  const ll=$('leaveList');
  if(ll){
    const my=Object.entries(allLeaves).filter(([,l])=>l.uid===CU.uid).sort((a,b)=>b[1].ts-a[1].ts);
    ll.innerHTML=my.length?my.map(([,l])=>`<div class="leave-card" style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border);margin-bottom:7px;"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600">${l.type}</span><span style="font-size:10px;padding:2px 8px;border-radius:5px;font-weight:600;" class="ls-${l.status}">${l.status==='pending'?'অপেক্ষায়':l.status==='approved'?'অনুমোদিত':'বাতিল'}</span></div><div style="font-size:11px;color:var(--muted);margin-top:4px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} ${l.reason?'· '+l.reason:''}</div></div>`).join(''):'<div class="empty">কোনো আবেদন নেই</div>';
  }
  const pl=$('pendingLeaves');
  if(pl&&CR!=='worker'){
    const pending=Object.entries(allLeaves).filter(([,l])=>l.status==='pending');
    pl.innerHTML=pending.length?pending.map(([id,l])=>`<div style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border);margin-bottom:7px;"><div style="font-size:13px;font-weight:600">👤 ${l.name} · ${l.type}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} · ${l.reason||''}</div><div class="g2" style="margin-top:8px"><button style="padding:7px;border:1px solid var(--green);border-radius:7px;background:rgba(46,204,138,.1);color:var(--green);font-family:inherit;font-size:11px;cursor:pointer;" onclick="approveLeave('${id}')">✅ অনুমোদন</button><button style="padding:7px;border:1px solid var(--red);border-radius:7px;background:rgba(232,93,74,.1);color:var(--red);font-family:inherit;font-size:11px;cursor:pointer;" onclick="rejectLeave('${id}')">❌ বাতিল</button></div></div>`).join(''):'<div class="empty">কোনো অপেক্ষমাণ নেই</div>';
  }
}
window.approveLeave=async id=>{await update(ref(db,'leaves/'+id),{status:'approved',approvedBy:CN});showToast('ছুটি অনুমোদিত ✓');};
window.rejectLeave=async id=>{await update(ref(db,'leaves/'+id),{status:'rejected'});showToast('ছুটি বাতিল');};

// SALARY & COMMISSION
function getDefaultSlabs(){
  return{slabs:[{min:0,max:6000,rate:0},{min:6001,max:12000,rate:2},{min:12001,max:16000,rate:2.5},{min:16001,max:20000,rate:3},{min:20001,max:30000,rate:3.5},{min:30001,max:999999,rate:4}],extraPer1000:0.1};
}
function calcCommission(dailySale,config){
  const cfg=config||getDefaultSlabs();
  if(!dailySale||dailySale<=0)return 0;
  const slab=cfg.slabs.find(s=>dailySale>=s.min&&dailySale<=s.max);
  if(!slab||slab.rate===0)return 0;
  let rate=slab.rate;
  if(slab.max===999999&&dailySale>30000)rate+=Math.floor((dailySale-30000)/1000)*(cfg.extraPer1000||0.1);
  return dailySale*rate/100;
}
// SHIFT PREVIEW
function initShiftPreview(){
  const updatePreview=()=>{
    const s=$('salShiftStart')?.value,e=$('salShiftEnd')?.value;
    if(!s||!e)return;
    const [sh,sm]=s.split(':').map(Number),[eh,em]=e.split(':').map(Number);
    const hours=((eh*60+em)-(sh*60+sm))/60;
    const prev=$('shiftPreview');
    if(prev&&hours>0)prev.textContent=`শিফট: ${s} — ${e} (${hours.toFixed(2)} ঘণ্টা) · ওভারটাইম: ${e} এর পরে`;
  };
  $('salShiftStart')?.addEventListener('change',updatePreview);
  $('salShiftEnd')?.addEventListener('change',updatePreview);
}

window.setSalary=async()=>{
  const uid=$('salWorker').value,basic=parseFloat($('salBasic').value),target=parseFloat($('salTarget').value)||0;
  const shiftStart=$('salShiftStart').value||'10:00',shiftEnd=$('salShiftEnd').value||'17:50';
  if(!uid||!basic){showToast('তথ্য দিন!',true);return;}
  const [sh,sm]=shiftStart.split(':').map(Number),[eh,em]=shiftEnd.split(':').map(Number);
  const shiftHours=((eh*60+em)-(sh*60+sm))/60;
  await set(ref(db,'salaries/'+uid),{basic,shiftStart,shiftEnd,shiftHours:shiftHours.toFixed(2),monthlyTarget:target,workerName:allUsers[uid]?.name,setBy:CN,ts:Date.now()});
  showToast('বেতন সেট ✓');
};

// OT APPLICATION
window.applyOT=async()=>{
  const date=$('otDate').value,start=$('otStart').value,end=$('otEnd').value,reason=$('otReason').value.trim();
  if(!date||!start||!end){showToast('সব তথ্য দিন!',true);return;}
  const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
  const hours=((eh*60+em)-(sh*60+sm))/60;
  if(hours<=0){showToast('সময় সঠিক নয়!',true);return;}
  await push(ref(db,'otRequests'),{uid:CU.uid,name:CN,date,start,end,hours:hours.toFixed(2),reason,status:'pending',ts:Date.now()});
  $('otReason').value='';showToast(`ওভারটাইম আবেদন পাঠানো হয়েছে (${hours.toFixed(1)} ঘণ্টা) ✓`);
};

// GOOGLE DRIVE CONFIG
function renderCommSlabs(){
  const cfg=allCommConfig||getDefaultSlabs();
  const el=$('commSlabs');if(!el)return;
  const slabs=cfg.slabs||getDefaultSlabs().slabs;
  el.innerHTML=`<table style="width:100%;border-collapse:collapse;"><tr style="font-size:11px;color:var(--muted);"><th style="text-align:left;padding:6px;">বিক্রয় পরিমাণ</th><th style="text-align:right;padding:6px;">কমিশন %</th></tr>${slabs.map(s=>`<tr style="border-top:1px solid var(--border)"><td style="padding:8px 6px;font-size:12px;">${s.max===999999?bn(s.min)+'+':bn(s.min)+' – '+bn(s.max)}</td><td style="padding:8px 6px;font-size:14px;font-weight:700;text-align:right;color:${s.rate===0?'var(--muted)':'var(--accent)'};">${s.rate}%</td></tr>`).join('')}</table><div style="font-size:11px;color:var(--muted);margin-top:6px;padding:6px;">৩০,০০০+ এর পর প্রতি হাজারে ${cfg.extraPer1000||0.1}% বেশি</div>`;
  // Worker রিসেট বাটন দেখবে না
  const resetBtn=$('commResetBtn');
  if(resetBtn)resetBtn.style.display=(CR==='worker'?'none':'block');
}
window.resetCommSlabs=async()=>{await set(ref(db,'commConfig'),getDefaultSlabs());showToast('ডিফল্ট কমিশন ✓');};

function renderSalary(){
  // Worker আলাদা ভিউ
  const workerView=$('workerSalaryView');
  const adminForms=['setSalaryForm','otRequestForm'];
  if(CR==='worker'){
    if(workerView)workerView.style.display='block';
    adminForms.forEach(id=>{const el=$(id);if(el)el.style.display='none';});
    // Worker salary detail
    const sal=allSalaries[CU?.uid];
    const det=$('workerSalaryDetail');
    if(det&&sal){
      const now=new Date();
      const mySales=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===CU.uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
      const dailyMap={};
      mySales.filter(s=>s.payStatus==='paid'||(s.payStatus==='due'&&s.due===0)).forEach(s=>{dailyMap[s.date]=(dailyMap[s.date]||0)+s.total;});
      const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,allCommConfig),0);
      const attDays=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===CU.uid&&d.getMonth()===now.getMonth();}).length;
      det.innerHTML=`
        <div class="rb"><div class="rr"><span class="rn">💵 মূল বেতন</span><span class="rv">${bn(sal.basic)}/মাস</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">🏆 কমিশন (এই মাস)</span><span class="rv" style="color:var(--accent)">${bn(comm)}</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">📅 উপস্থিতি</span><span class="rv">${attDays} দিন</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">🎯 মাসিক টার্গেট</span><span class="rv">${bn(sal.monthlyTarget||0)}</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">⏰ শিফট</span><span class="rv">${sal.shiftStart||'10:00'} – ${sal.shiftEnd||'17:50'}</span></div></div>`;
    } else if(det){
      det.innerHTML='<div class="empty">বেতন তথ্য নেই</div>';
    }
    // Worker কমিশন স্ল্যাব দেখবে
    const cfg=allCommConfig||getDefaultSlabs();
    const cw=$('commSlabsWorker');
    if(cw){
      const slabs=cfg.slabs||getDefaultSlabs().slabs;
      cw.innerHTML=`<table style="width:100%;border-collapse:collapse;"><tr style="font-size:11px;color:var(--muted);"><th style="text-align:left;padding:6px;">বিক্রয়</th><th style="text-align:right;padding:6px;">কমিশন %</th></tr>${slabs.map(s=>`<tr style="border-top:1px solid var(--border)"><td style="padding:8px 6px;font-size:12px;">${s.max===999999?bn(s.min)+'+':bn(s.min)+' – '+bn(s.max)}</td><td style="padding:8px 6px;font-size:14px;font-weight:700;text-align:right;color:${s.rate===0?'var(--muted)':'var(--accent)'};">${s.rate}%</td></tr>`).join('')}</table>`;
    }
  } else {
    if(workerView)workerView.style.display='none';
    adminForms.forEach(id=>{const el=$(id);if(el)el.style.display='block';});
    renderCommSlabs();
  }
  // Worker নিজের salary শুধু দেখতে পারবে (existing)
  if(CR==='worker'){
    const el=$('salarySummary');if(!el)return;
    const sal=allSalaries[CU.uid];
    if(!sal){el.innerHTML='<div class="empty">বেতন তথ্য নেই</div>';return;}
    const now=new Date();
    const myS=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===CU.uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()&&s.payStatus==='paid';});
    const dailyMap={};myS.forEach(s=>{dailyMap[s.date]=(dailyMap[s.date]||0)+s.total;});
    const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,allCommConfig),0);
    const att=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===CU.uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
    const basic=sal.basic||0,earnedBasic=(basic/26)*att;
    const net=earnedBasic+comm;
    el.innerHTML='<div class="salary-card"><div style="font-size:14px;font-weight:700">👤 আমার বেতন</div><div style="font-size:11px;color:var(--muted);margin-top:2px">উপস্থিতি: '+att+' দিন · শিফট: '+(sal.shiftStart||'10:00')+' — '+(sal.shiftEnd||'17:50')+'</div><div style="font-size:12px;color:var(--muted);margin-top:6px;background:var(--surface);border-radius:8px;padding:8px;"><div style="display:flex;justify-content:space-between;"><span>মূল বেতন:</span><span>'+bn(earnedBasic)+'</span></div><div style="display:flex;justify-content:space-between;margin-top:4px"><span>কমিশন:</span><span style="color:var(--accent)">'+bn(comm)+'</span></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><span style="font-size:13px;font-weight:600">নেট বেতন</span><span style="font-size:20px;font-weight:700;color:var(--green)">'+bn(net)+'</span></div></div>';
    return;
  }
  const now=new Date();
  const el=$('salarySummary');if(!el)return;
  const workers=Object.entries(allUsers).filter(([,u])=>u.role==='worker'||u.role==='manager');
  if(!workers.length){el.innerHTML='<div class="empty">কোনো কর্মী নেই</div>';return;}
  const monthSales={};
  Object.values(allSales).forEach(s=>{
    const d=new Date(s.date);
    if(d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()&&s.payStatus==='paid'){
      if(!monthSales[s.uid])monthSales[s.uid]={};
      monthSales[s.uid][s.date]=(monthSales[s.uid][s.date]||0)+s.total;
    }
  });
  const monthAllow={};
  Object.values(allAllowances).forEach(a=>{
    const from=new Date(a.from),to=new Date(a.to);
    let days=0;
    for(let d=new Date(from);d<=to;d.setDate(d.getDate()+1)){
      if(d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()&&d.getDay()!==5)days++;
    }
    monthAllow[a.uid]=(monthAllow[a.uid]||0)+(a.amount*days);
  });
  const monthAtt={};
  Object.values(allAttendance).forEach(a=>{
    const d=new Date(a.date);
    if(d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()){
      if(!monthAtt[a.uid])monthAtt[a.uid]={days:0,otHours:0};
      if(a.checkIn)monthAtt[a.uid].days++;
      if(a.isOT&&a.otApproved)monthAtt[a.uid].otHours+=parseFloat(a.otHours||0);
    }
  });
  el.innerHTML=workers.map(([uid,u])=>{
    const sal=allSalaries[uid];
    const basic=sal?.basic||0,shiftH=parseFloat(sal?.shiftHours)||8,target=sal?.monthlyTarget||0;
    const shiftDisplay=sal?.shiftStart&&sal?.shiftEnd?`${sal.shiftStart} — ${sal.shiftEnd}`:`${shiftH} ঘণ্টা`;
    const att=monthAtt[uid]||{days:0,otHours:0};
    const perDay=basic/26;
    const earnedBasic=perDay*att.days;
    const dailySalesMap=monthSales[uid]||{};
    const totalComm=Object.values(dailySalesMap).reduce((sum,s)=>sum+calcCommission(s,allCommConfig),0);
    const perHour=basic/(26*shiftH);
    const otPay=att.otHours*perHour*1.5;
    const allowance=monthAllow[uid]||0;
    const totalSaleAmt=Object.values(dailySalesMap).reduce((a,b)=>a+b,0);
    const net=earnedBasic+totalComm+otPay+allowance;
    const targetPct=target>0?Math.min((totalSaleAmt/target*100),100).toFixed(0):0;
    return`<div class="salary-card"><div style="font-size:14px;font-weight:700">👤 ${u.name}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${u.role==='worker'?'কর্মী':'ম্যানেজার'} · শিফট: ${shiftDisplay} · উপস্থিতি: ${att.days} দিন</div>${target>0?`<div style="font-size:11px;color:var(--blue);margin-top:4px">🎯 টার্গেট: ${bn(totalSaleAmt)} / ${bn(target)} (${targetPct}%)</div>`:''}
    <div style="font-size:12px;color:var(--muted);margin-top:6px;background:var(--surface);border-radius:8px;padding:8px;">
      <div style="display:flex;justify-content:space-between;"><span>মূল বেতন:</span><span>${bn(earnedBasic)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px"><span>কমিশন (বিক্রয়: ${bn(totalSaleAmt)}):</span><span style="color:var(--accent)">${bn(totalComm)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px"><span>ওভারটাইম:</span><span>${bn(otPay)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px"><span>ভাতা:</span><span>${bn(allowance)}</span></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><span style="font-size:13px;font-weight:600">নেট বেতন</span><span class="salary-total">${bn(net)}</span></div></div>`;
  }).join('');
}

// TEAMS
window.createTeam=async()=>{
  const name=$('teamName').value.trim(),leaderId=$('teamLeader').value;
  if(!name){showToast('টিমের নাম দিন!',true);return;}
  await push(ref(db,'teams'),{name,leaderId,leaderName:leaderId?allUsers[leaderId]?.name:'',members:[],createdBy:CN,ts:Date.now()});
  $('teamName').value='';showToast(name+' টিম তৈরি ✓');
};
window.addTeamMember=async()=>{
  const teamId=$('addTeamSel').value,uid=$('addTeamMember').value;
  if(!teamId||!uid){showToast('টিম ও কর্মী বেছে নিন!',true);return;}
  const team=allTeams[teamId];
  const members=team.members||[];
  if(members.includes(uid)){showToast('ইতিমধ্যে সদস্য!',true);return;}
  await update(ref(db,'teams/'+teamId),{members:[...members,uid]});
  showToast('সদস্য যোগ ✓');
};
function renderTeams(){
  const el=$('teamList');if(!el)return;
  el.innerHTML=Object.entries(allTeams).length?Object.entries(allTeams).map(([id,t])=>`
    <div class="team-card">
      <div class="tn">👥 ${t.name}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px">লিডার: ${t.leaderName||'নেই'}</div>
      <div style="margin-top:8px">${(t.members||[]).map(uid=>allUsers[uid]?`<span class="wtag" style="margin:2px;display:inline-block">👤 ${allUsers[uid].name}</span>`:'').join('')||'<span style="font-size:11px;color:var(--muted)">সদস্য নেই</span>'}</div>
      <button class="del-btn" onclick="deleteTeam('${id}')">টিম মুছুন</button>
    </div>`).join(''):'<div class="empty">কোনো টিম নেই</div>';
}
window.deleteTeam=async id=>{if(!confirm('টিম মুছবেন?'))return;await remove(ref(db,'teams/'+id));};

// PROFILE
function renderProfile(){
  $('pName').textContent=CN;
  const uData=allUsers[CU?.uid];
  const img=$('profilePhoto'),icon=$('profilePhotoIcon');
  if(uData?.photoURL&&img){
    img.src=uData.photoURL;
    img.style.display='block';
    img.style.position='relative';
    img.style.zIndex='1';
    if(icon)icon.style.display='none';
  } else {
    if(img)img.style.display='none';
    if(icon)icon.style.display='block';
  }
  $('pRole').textContent=CR==='admin'?'অ্যাডমিন':CR==='manager'?'ম্যানেজার':'কর্মী';
  $('pEditName').value=CN;
  const now=new Date();
  const mySales=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===CU.uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const mySaleTotal=mySales.filter(s=>s.payStatus==='paid').reduce((a,b)=>a+(b.total||0),0);
  $('pSale').textContent=bn(mySaleTotal);
  // কমিশন: শুধু পরিশোধিত বিক্রয় (বাকি উঠে গেলেও যোগ হবে)
  const dailyMap={};
  mySales.filter(s=>s.payStatus==='paid'||(s.payStatus==='due'&&s.due===0)).forEach(s=>{dailyMap[s.date]=(dailyMap[s.date]||0)+s.total;});
  const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,allCommConfig),0);
  $('pComm').textContent=bn(comm);
  // Target
  const sal=allSalaries[CU.uid];
  const target=sal?.monthlyTarget||0;
  const ptp=$('myTargetProfile');
  if(ptp&&target){
    const pct=Math.min((mySaleTotal/target*100),100).toFixed(0);
    const color=pct>=100?'var(--green)':pct>=60?'var(--accent)':'var(--red)';
    ptp.innerHTML=`<div class="target-card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between"><span style="font-size:13px;font-weight:600">🎯 মাসিক টার্গেট</span><span style="font-size:22px;font-weight:700;color:${color}">${pct}%</span></div><div style="font-size:11px;color:var(--muted)">${bn(mySaleTotal)} / ${bn(target)}</div><div class="tbar"><div class="tbar-fill" style="width:${pct}%;background:${color}"></div></div></div>`;
  }
  // Performance
  const pr=$('perfReport');
  const allWorkerSales={};
  Object.values(allSales).filter(s=>{const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).forEach(s=>{allWorkerSales[s.uid]=(allWorkerSales[s.uid]||0)+s.total;});
  const maxSale=Math.max(...Object.values(allWorkerSales),1);
  const myRank=Object.values(allWorkerSales).sort((a,b)=>b-a).indexOf(allWorkerSales[CU.uid]||0)+1;
  const attCount=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===CU.uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
  if(pr)pr.innerHTML=`
    <div class="rb"><div class="rr"><span class="rn">📊 এই মাসের বিক্রয়</span><span class="rv">${bn(mySaleTotal)}</span></div><div class="bar-t"><div class="bar-f" style="width:${((allWorkerSales[CU.uid]||0)/maxSale*100).toFixed(0)}%"></div></div></div>
    <div class="rb"><div class="rr"><span class="rn">🏆 দলে র‍্যাংক</span><span class="rv">${myRank} নম্বর</span></div></div>
    <div class="rb"><div class="rr"><span class="rn">📅 উপস্থিতি</span><span class="rv">${attCount} দিন</span></div></div>
    <div class="rb"><div class="rr"><span class="rn">💰 কমিশন</span><span class="rv" style="color:var(--accent)">${bn(comm)}</span></div></div>`;
}
window.updateProfile=async()=>{
  const name=$('pEditName').value.trim(),wa=$('pEditWa').value.trim(),pass=$('pEditPass').value;
  if(!name){showToast('নাম দিন!',true);return;}
  await update(ref(db,'users/'+CU.uid),{name,waNum:wa});
  if(pass&&pass.length>=6){try{await updatePassword(CU,pass);}catch(e){showToast('পাসওয়ার্ড আপডেট ব্যর্থ',true);}}
  CN=name;$('userName').textContent=name;showToast('প্রোফাইল আপডেট ✓');
};

// REPORT
function renderReport(){
  const sales=Object.values(allSales),exps=Object.values(allExpenses);
  const ts=sales.reduce((s,i)=>s+(i.total||0),0),tp=sales.reduce((s,i)=>s+(i.profit||0),0),te=exps.reduce((s,i)=>s+(i.amount||0),0);
  $('rNet').textContent=bn(tp-te);$('rSale').textContent=bn(ts);
  $('rNet').style.color=(tp-te)>=0?'var(--green)':'var(--red)';
  const wm={};sales.forEach(s=>{wm[s.workerName||'?']=(wm[s.workerName||'?']||0)+s.total;});
  const maxW=Math.max(...Object.values(wm),1);
  $('workerReport').innerHTML=Object.entries(wm).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="rb"><div class="rr"><span class="rn">👤 ${n}</span><span class="rv">${bn(v)}</span></div><div class="bar-t"><div class="bar-f" style="width:${(v/maxW*100).toFixed(0)}%"></div></div></div>`).join('')||'<div class="empty">নেই</div>';
  const sm={};sales.forEach(s=>{sm[s.shop]=(sm[s.shop]||0)+s.total;});
  const maxS=Math.max(...Object.values(sm),1);
  $('shopReport').innerHTML=Object.entries(sm).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,v])=>`<div class="rb"><div class="rr"><span class="rn">🏪 ${n}</span><span class="rv">${bn(v)}</span></div><div class="bar-t"><div class="bar-f" style="width:${(v/maxS*100).toFixed(0)}%"></div></div></div>`).join('')||'<div class="empty">নেই</div>';
  const pm={};sales.forEach(s=>{pm[s.product]=(pm[s.product]||0)+s.qty;});
  const maxP=Math.max(...Object.values(pm),1);
  $('prodReport').innerHTML=Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="rb"><div class="rr"><span class="rn">🛍 ${n}</span><span class="rv">${v} পিস</span></div><div class="bar-t"><div class="bar-f" style="width:${(v/maxP*100).toFixed(0)}%"></div></div></div>`).join('')||'<div class="empty">নেই</div>';
  const rm={};sales.forEach(s=>{if(s.routeId&&allRoutes[s.routeId]){const rn=allRoutes[s.routeId].name;rm[rn]=(rm[rn]||0)+s.total;}});
  const maxR=Math.max(...Object.values(rm),1);
  $('routeReport').innerHTML=Object.entries(rm).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="rb"><div class="rr"><span class="rn">🗺️ ${n}</span><span class="rv">${bn(v)}</span></div><div class="bar-t"><div class="bar-f" style="width:${(v/maxR*100).toFixed(0)}%"></div></div></div>`).join('')||'<div class="empty">নেই</div>';
  const em={};exps.forEach(e=>{em[e.type]=(em[e.type]||0)+e.amount;});
  $('expReport').innerHTML=Object.entries(em).sort((a,b)=>b[1]-a[1]).map(([t,v])=>`<div class="ec"><div class="ei"><div class="shop">${t}</div></div><div class="ea"><div class="sale" style="color:var(--red)">${bn(v)}</div></div></div>`).join('')||'<div class="empty">নেই</div>';
}
window.exportPDF=()=>{
  const now=new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
  const sales=Object.values(allSales),exps=Object.values(allExpenses);
  const ts=sales.reduce((s,i)=>s+(i.total||0),0),tp=sales.reduce((s,i)=>s+(i.profit||0),0),te=exps.reduce((s,i)=>s+(i.amount||0),0);
  const html=`<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:20px;max-width:800px;margin:0 auto;}h1{color:#f5a623;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;}.total{font-size:18px;font-weight:bold;color:#2ecc8a;}</style></head><body><h1>NovaTEch BD - মাসিক রিপোর্ট</h1><p>তারিখ: ${now}</p><table><tr><th>মোট বিক্রয়</th><th>মোট লাভ</th><th>মোট খরচ</th><th>নিট লাভ</th></tr><tr><td>${bn(ts)}</td><td>${bn(tp)}</td><td>${bn(te)}</td><td class="total">${bn(tp-te)}</td></tr></table><h3>বিক্রয় তালিকা</h3><table><tr><th>তারিখ</th><th>শপ</th><th>পণ্য</th><th>পরিমাণ</th><th>ছাড়%</th><th>মোট</th><th>কর্মী</th><th>OTP</th></tr>${sales.slice(-100).map(s=>`<tr><td>${s.date}</td><td>${s.shop}</td><td>${s.product}</td><td>${s.qty}</td><td>${s.disc||0}%</td><td>${bn(s.total)}</td><td>${s.workerName||''}</td><td>${s.otpConfirmed?'✓':s.otpSkipped?'বাদ':'-'}</td></tr>`).join('')}</table></body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
};

// ADMIN
window.addProduct=async()=>{
  const name=$('npName').value.trim(),buy=parseFloat($('npBuy').value)||0,sell=parseFloat($('npSell').value)||0,disc=parseFloat($('npDisc').value)||0;
  if(!name){showToast('নাম দিন!',true);return;}
  await push(ref(db,'products'),{name,buyPrice:buy,sellPrice:sell,maxDisc:disc});
  $('npName').value='';$('npBuy').value='';$('npSell').value='';$('npDisc').value='';showToast(name+' যোগ ✓');
};
function renderProdChips(){
  $('prodChips').innerHTML=Object.entries(allProducts).map(([id,p])=>`<span class="prod-chip">${p.name} ক্রয়:${bn(p.buyPrice)} বিক্রয়:${bn(p.sellPrice)} ছাড়:${p.maxDisc||0}%<button class="chip-del" onclick="delProd('${id}')">✕</button></span>`).join('');
}
window.delProd=async id=>{if(!confirm('মুছবেন?'))return;await remove(ref(db,'products/'+id));};

window.createUser=async()=>{
  if(CR==='worker'){showToast('আপনার এই অনুমতি নেই!',true);return;}
  const name=$('nuName').value.trim(),email=$('nuEmail').value.trim(),pass=$('nuPass').value,role=$('nuRole').value;
  if(!name||!email||!pass){showToast('নাম, ইমেইল ও পাসওয়ার্ড দিন!',true);return;}
  loader(true);
  try{
    const ce=CU.email,cp=prompt('আপনার পাসওয়ার্ড নিশ্চিত করুন:');
    if(!cp){loader(false);return;}

    // ছবি আপলোড
    let photoURL=null;
    if(window._pendingWorkerPhoto){
      photoURL=await uploadImageToFirebase(window._pendingWorkerPhoto,'profiles');
      window._pendingWorkerPhoto=null;
    }

    // ডকুমেন্ট আপলোড (Google Drive)
    const docLinks=[];
    for(const doc of (window._pendingWorkerDocs||[])){
      const url=await uploadDocToDrive(doc);
      if(url)docLinks.push({name:doc.name,url,type:doc.type,uploadedAt:Date.now()});
    }
    window._pendingWorkerDocs=[];
    renderPendingDocs();

    const cred=await createUserWithEmailAndPassword(auth,email,pass);
    await set(ref(db,'users/'+cred.user.uid),{
      name,email,role,photoURL,
      phone:$('nuPhone').value.trim(),
      waNum:$('nuWa').value.trim(),
      age:$('nuAge').value,
      address:$('nuAddress').value.trim(),
      documents:docLinks,
      createdBy:CN,createdAt:today(),status:'active'
    });
    await signOut(auth);
    await signInWithEmailAndPassword(auth,ce,cp);
    ['nuName','nuEmail','nuPass','nuPhone','nuWa','nuAge','nuAddress'].forEach(id=>{const el=$(id);if(el)el.value='';});
    // photo reset
    const prev=$('nuPhotoPreview'),icon=$('nuPhotoIcon');
    if(prev){prev.src='';prev.style.display='none';}
    if(icon)icon.style.display='block';
    showToast('✅ '+name+' তৈরি হয়েছে!');
  }catch(e){loader(false);showToast('সমস্যা: '+e.message,true);}
};

function renderUserList(){
  $('userList').innerHTML=Object.entries(allUsers).map(([uid,u])=>`
    <div style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border);margin-bottom:7px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:13px;font-weight:600">${u.name} <span class="role-badge role-${u.role}">${u.role}</span>${u.status==='suspended'?'<span style="color:var(--red);font-size:10px"> 🔴 স্থগিত</span>':u.status==='fired'?'<span style="color:var(--red);font-size:10px"> ❌ বহিষ্কৃত</span>':''}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${u.email} ${u.phone?'· '+u.phone:''}</div>
        </div>
        <button style="font-size:10px;padding:4px 8px;border:1px solid var(--blue);border-radius:6px;background:none;color:var(--blue);cursor:pointer;" onclick="viewWorkerProfile('${uid}')">প্রোফাইল</button>
      </div>
      ${u.uid!==CU.uid?`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        <button onclick="suspendUser('${uid}')" style="font-size:10px;padding:4px 8px;border:1px solid var(--accent);border-radius:6px;background:none;color:var(--accent);cursor:pointer;">⏸ স্থগিত</button>
        <button onclick="fireUser('${uid}')" style="font-size:10px;padding:4px 8px;border:1px solid var(--red);border-radius:6px;background:none;color:var(--red);cursor:pointer;">❌ বহিষ্কার</button>
        <button onclick="deleteUser('${uid}')" style="font-size:10px;padding:4px 8px;border:1px solid var(--red);border-radius:6px;background:rgba(232,93,74,.1);color:var(--red);cursor:pointer;">🗑 মুছুন</button>
      </div>`:''}
    </div>`).join('')||'<div class="empty">কেউ নেই</div>';
}

window.suspendUser=async uid=>{if(!confirm('এই কর্মীকে স্থগিত করবেন?'))return;await update(ref(db,'users/'+uid),{status:'suspended'});showToast('কর্মী স্থগিত ✓');};
window.fireUser=async uid=>{if(!confirm('এই কর্মীকে বহিষ্কার করবেন?'))return;await update(ref(db,'users/'+uid),{status:'fired'});showToast('কর্মী বহিষ্কৃত ✓');};
window.deleteUser=async uid=>{if(!confirm('এই কর্মীকে সম্পূর্ণ মুছবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।'))return;await remove(ref(db,'users/'+uid));showToast('কর্মী মুছে গেছে');};

window.viewWorkerProfile=uid=>{
  const u=allUsers[uid];if(!u)return;
  const now=new Date();
  const ws=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const wst=ws.reduce((a,b)=>a+(b.total||0),0);
  const sal=allSalaries[uid];
  const att=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const lateCount=att.filter(a=>a.isLate).length;
  $('wpTitle').textContent='👤 '+u.name;

  const docs=u.documents||[];
  const docsHTML=docs.length?docs.map(d=>`
    <a href="${d.url}" target="_blank" style="display:flex;align-items:center;gap:8px;background:var(--surface);border-radius:8px;padding:8px 10px;margin-bottom:5px;text-decoration:none;color:var(--text);border:1px solid var(--border);">
      <span style="font-size:18px">📄</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.name}</div>
        <div style="font-size:10px;color:var(--muted)">Google Drive এ দেখুন →</div>
      </div>
    </a>`).join(''):'<div style="font-size:12px;color:var(--muted)">কোনো ডকুমেন্ট নেই</div>';

  $('wpBody').innerHTML=`
    <div style="text-align:center;margin-bottom:12px">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:28px;overflow:hidden;margin:0 auto 8px;">
        ${u.photoURL?`<img src="${u.photoURL}" style="width:72px;height:72px;object-fit:cover;">`:'👤'}
      </div>
      <div style="font-size:15px;font-weight:700">${u.name}</div>
      <span class="role-badge role-${u.role}">${u.role}</span>
    </div>
    <div style="background:var(--card);border-radius:10px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;margin-bottom:4px">📧 ${u.email}</div>
      <div style="font-size:13px;margin-bottom:4px">📱 ${u.phone||'-'} · WA: ${u.waNum||'-'}</div>
      <div style="font-size:13px;margin-bottom:4px">🏠 ${u.address||'-'}</div>
      <div style="font-size:12px;color:var(--muted)">যোগদান: ${u.createdAt||'-'} · স্ট্যাটাস: ${u.status||'active'}</div>
    </div>
    <div class="sum-grid">
      <div class="sum-card c-sale"><div class="lbl">এই মাসের বিক্রয়</div><div class="val" style="font-size:16px">${bn(wst)}</div></div>
      <div class="sum-card"><div class="lbl">উপস্থিতি</div><div class="val" style="font-size:16px;color:var(--blue)">${att.length} দিন</div></div>
    </div>
    ${lateCount>0?`<div class="warn-box">⚠️ এই মাসে ${lateCount} বার দেরিতে এসেছে</div>`:''}
    <div style="background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--border);margin-top:8px;">
      <div style="font-size:12px;color:var(--muted)">মূল বেতন: ${sal?bn(sal.basic):'সেট হয়নি'}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">মাসিক টার্গেট: ${sal?.monthlyTarget?bn(sal.monthlyTarget):'সেট হয়নি'}</div>
    </div>
    <div style="background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--border);margin-top:8px;">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">📁 ডকুমেন্টস</div>
      ${docsHTML}
      <label style="display:flex;align-items:center;gap:8px;background:var(--surface);border:1px dashed var(--border);border-radius:8px;padding:9px;cursor:pointer;margin-top:8px;" onclick="document.getElementById('wpDocInput').click()">
        <span>➕</span><span style="font-size:12px">নতুন ডকুমেন্ট যোগ করুন</span>
      </label>
      <input type="file" id="wpDocInput" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none" onchange="uploadWorkerDoc(this,'${uid}')">
    </div>`;
  openMo('workerProfileMo');
};

window.uploadWorkerDoc=async(input,uid)=>{
  const file=input.files[0];if(!file)return;
  const url=await uploadDocToDrive(file);
  if(url){
    const user=allUsers[uid];
    const docs=user?.documents||[];
    docs.push({name:file.name,url,type:file.type,uploadedAt:Date.now(),uploadedBy:CN});
    await update(ref(db,'users/'+uid),{documents:docs});
    showToast('✅ ডকুমেন্ট যোগ হয়েছে!');
    viewWorkerProfile(uid);
  }
};

window.downloadSalesPDF=()=>{
  const sales=Object.values(allSales).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const total=sales.reduce((s,i)=>s+(i.total||0),0);
  const rows=sales.map(s=>`<tr><td>${fmtDate(s.date)}</td><td>${s.shop}</td><td>${s.product}</td><td>${s.qty}</td><td>${bn(s.total)}</td><td>${s.payStatus==='paid'?'পরিশোধ':s.payStatus==='due'?'বাকি':'আংশিক'}</td><td>${s.workerName||''}</td></tr>`).join('');
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>বিক্রয় রিপোর্ট</title>
  <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f5a623;color:#000}h2{color:#333}.total{font-size:16px;font-weight:bold;margin-top:10px}</style></head>
  <body><h2>📊 বিক্রয় রিপোর্ট — NovaTEch BD</h2><p>মোট রেকর্ড: ${sales.length} | প্রিন্ট: ${new Date().toLocaleDateString('bn-BD')}</p>
  <table><tr><th>তারিখ</th><th>দোকান</th><th>পণ্য</th><th>পরিমাণ</th><th>মোট</th><th>পেমেন্ট</th><th>কর্মী</th></tr>${rows}</table>
  <div class="total">মোট বিক্রয়: ${bn(total)}</div></body></html>`);
  w.document.close();setTimeout(()=>w.print(),500);
};
window.downloadExpensesPDF=()=>{
  const exps=Object.values(allExpenses).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const total=exps.reduce((s,i)=>s+(i.amount||0),0);
  const rows=exps.map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${e.type}</td><td>${e.note||''}</td><td>${bn(e.amount)}</td><td>${e.workerName||''}</td><td>${e.status==='pending'?'অপেক্ষমান':e.status==='rejected'?'বাতিল':'অনুমোদিত'}</td></tr>`).join('');
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>খরচ রিপোর্ট</title>
  <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#e85d4a;color:#fff}h2{color:#333}.total{font-size:16px;font-weight:bold;margin-top:10px}</style></head>
  <body><h2>💸 খরচ রিপোর্ট — NovaTEch BD</h2><p>মোট রেকর্ড: ${exps.length} | প্রিন্ট: ${new Date().toLocaleDateString('bn-BD')}</p>
  <table><tr><th>তারিখ</th><th>ধরন</th><th>নোট</th><th>পরিমাণ</th><th>কর্মী</th><th>অবস্থা</th></tr>${rows}</table>
  <div class="total">মোট খরচ: ${bn(total)}</div></body></html>`);
  w.document.close();setTimeout(()=>w.print(),500);
};
// ── সুন্দর confirm modal দেখিয়ে reset করার helper
function showResetConfirm({ title, body, onConfirm }) {
  // যদি আগের modal থাকে সরাই
  const old = document.getElementById('_resetConfirmMo');
  if (old) old.remove();

  const mo = document.createElement('div');
  mo.id = '_resetConfirmMo';
  mo.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:flex-end;justify-content:center;';
  mo.innerHTML = `
    <div style="background:var(--surface);border-radius:20px 20px 0 0;width:100%;max-width:430px;padding:22px 20px 32px;border-top:1px solid var(--border);">
      <div style="font-size:28px;text-align:center;margin-bottom:10px;">⚠️</div>
      <div style="font-size:16px;font-weight:700;color:#fff;text-align:center;margin-bottom:8px;">${title}</div>
      <div style="font-size:13px;color:var(--muted);text-align:center;line-height:1.6;margin-bottom:20px;">${body}</div>
      <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:10px 14px;font-size:12px;color:#f87171;margin-bottom:18px;">
        🔴 এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। ডেটা Archive-এ সংরক্ষিত থাকবে।
      </div>
      <button id="_resetConfirmBtn" style="width:100%;padding:14px;background:var(--red);border:none;border-radius:12px;color:#fff;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">
        ✅ হ্যাঁ, রিসেট করুন
      </button>
      <button onclick="document.getElementById('_resetConfirmMo').remove()" style="width:100%;padding:12px;background:none;border:1px solid var(--border);border-radius:12px;color:var(--muted);font-family:inherit;font-size:14px;cursor:pointer;">
        বাতিল করুন
      </button>
    </div>`;
  document.body.appendChild(mo);
  document.getElementById('_resetConfirmBtn').onclick = async () => {
    mo.remove();
    await onConfirm();
  };
}

window.resetAllSales = async () => {
  if (CR !== 'admin') { showToast('শুধু Admin করতে পারবে!', true); return; }
  showResetConfirm({
    title: 'সকলের বিক্রয় রিসেট',
    body: `মোট <b style="color:#fff">${Object.keys(allSales).length}টি</b> বিক্রয় রেকর্ড মুছে যাবে।<br>সব কর্মীর বিক্রয় শূন্য হবে।`,
    onConfirm: async () => {
      try {
        loader(true);
        // ✅ Archive করি — ভবিষ্যতে দেখার জন্য
        await set(ref(db, 'salesArchive/' + today()), allSales);
        // ✅ মূল ডেটা মুছি
        await remove(ref(db, 'sales'));
        // ✅ Audit log
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_sales', `${Object.keys(allSales).length}টি বিক্রয় রিসেট করা হয়েছে`);
        loader(false);
        showToast('✅ সকলের বিক্রয় রিসেট হয়েছে');
      } catch(e) { loader(false); showToast('রিসেট ব্যর্থ: ' + e.message, true); }
    }
  });
};

window.resetAllExpenses = async () => {
  if (CR !== 'admin') { showToast('শুধু Admin করতে পারবে!', true); return; }
  showResetConfirm({
    title: 'সকলের খরচ রিসেট',
    body: `মোট <b style="color:#fff">${Object.keys(allExpenses).length}টি</b> খরচ রেকর্ড মুছে যাবে।<br>সব কর্মীর খরচের হিসাব শূন্য হবে।`,
    onConfirm: async () => {
      try {
        loader(true);
        // ✅ Archive করি
        await set(ref(db, 'expensesArchive/' + today()), allExpenses);
        // ✅ মূল ডেটা মুছি
        await remove(ref(db, 'expenses'));
        // ✅ Allowances-ও reset করব কিনা জিজ্ঞেস করি না — শুধু expenses
        // ✅ Audit log
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_expenses', `${Object.keys(allExpenses).length}টি খরচ রিসেট করা হয়েছে`);
        loader(false);
        showToast('✅ সকলের খরচ রিসেট হয়েছে');
      } catch(e) { loader(false); showToast('রিসেট ব্যর্থ: ' + e.message, true); }
    }
  });
};
window.openMo=id=>$(id).classList.add('open');
window.closeMo=id=>$(id).classList.remove('open');

// ══ ENTERPRISE DASHBOARD PRINT ══
window.printEnterpriseDashboard=()=>{
  const el=document.getElementById('enterpriseDashboard');
  if(!el||!el.innerHTML.trim()){showToast('আগে ড্যাশবোর্ড লোড করুন!',true);return;}
  const w=window.open('','_blank');
  if(!w)return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>NovaTEch BD — Enterprise Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body{font-family:'Hind Siliguri',Arial,sans-serif;padding:24px;color:#1a202c;max-width:900px;margin:0 auto;}
    h1{color:#1E3A8A;font-size:20px;margin-bottom:4px;}
    .sub{color:#64748b;font-size:12px;margin-bottom:20px;}
    .sec{font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:18px 0 8px;}
    .form-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px;}
    .sum-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
    .sum-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:13px;}
    .lbl{font-size:11px;color:#64748b;margin-bottom:4px;}
    .val{font-size:20px;font-weight:700;}
    canvas{max-width:100%;}
    .rb{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:7px;}
    .ai-card{background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1px solid #BFDBFE;border-radius:10px;padding:16px;}
    @media print{body{padding:10px;}button{display:none!important;}}
  </style></head><body>
  <h1>🏢 NovaTEch BD — Enterprise Analytics Report</h1>
  <div class="sub">তৈরির তারিখ: ${new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
  ${el.innerHTML}
  </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),800);
};

// ══ DRIVE CONFIG ══
window.saveDriveConfig=async()=>{
  const apiKey=$('driveApiKey')?.value.trim(),folderId=$('driveFolderId')?.value.trim();
  if(!apiKey||!folderId){showToast('API Key ও Folder ID দিন!',true);return;}
  await set(ref(db,'driveConfig'),{apiKey,folderId,updatedBy:CN,ts:Date.now()});
  showToast('Google Drive কনফিগ সেভ ✓');
  loadDriveConfig();
};
function loadDriveConfig(){
  get(ref(db,'driveConfig')).then(snap=>{
    if(!snap.exists())return;
    const d=snap.val();
    const el=$('driveApiKey');const el2=$('driveFolderId');
    if(el&&d.apiKey)el.value=d.apiKey;
    if(el2&&d.folderId)el2.value=d.folderId;
    const status=$('driveConfigStatus');
    if(status)status.innerHTML=`<div style="font-size:11px;color:var(--green);margin-top:6px">✅ সংরক্ষিত আছে · শেষ আপডেট: ${d.updatedBy||'–'}</div>`;
  });
}
// AI Debug log helper
function aiLog(msg, type='info') {
  const log=$('aiDebugLog');
  if(!log)return;
  const colors={info:'#7c8099',ok:'#2ecc8a',err:'#e85d4a',warn:'#f5a623'};
  const time=new Date().toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  log.innerHTML+=`<div style="color:${colors[type]||colors.info};margin-bottom:2px">[${time}] ${msg}</div>`;
  log.scrollTop=log.scrollHeight;
}

function aiProgress(pct, text) {
  const bar=$('aiProgressBar'),txt=$('aiProgressText'),wrap=$('aiSaveProgress');
  if(wrap)wrap.style.display='block';
  if(bar)bar.style.width=pct+'%';
  if(txt)txt.textContent=text;
}

function aiStatus(msg, type='ok') {
  const el=$('aiConfigStatus');
  if(!el)return;
  const configs={
    ok:{bg:'rgba(46,204,138,.1)',border:'var(--green)',color:'var(--green)',icon:'✅'},
    err:{bg:'rgba(232,93,74,.1)',border:'var(--red)',color:'var(--red)',icon:'❌'},
    warn:{bg:'rgba(245,166,35,.1)',border:'var(--accent)',color:'var(--accent)',icon:'⚠️'},
    info:{bg:'rgba(74,158,255,.1)',border:'var(--blue)',color:'var(--blue)',icon:'ℹ️'},
  };
  const c=configs[type]||configs.info;
  el.innerHTML=`<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:10px;font-size:12px;color:${c.color}">${c.icon} ${msg}</div>`;
}

window.toggleAIKeyVisibility=()=>{
  const inp=$('anthropicApiKey'),btn=$('aiKeyToggle');
  if(!inp)return;
  inp.type=inp.type==='password'?'text':'password';
  if(btn)btn.textContent=inp.type==='password'?'👁':'🙈';
};

window.toggleAIDebug=()=>{
  const log=$('aiDebugLog');
  if(log)log.style.display=log.style.display==='none'?'block':'none';
};

window.saveAIConfig=window.saveAIConfigDebug=async()=>{
  const apiKey=($('anthropicApiKey')?.value||'').trim();

  // Debug log রিসেট
  const log=$('aiDebugLog');if(log){log.innerHTML='';log.style.display='block';}
  aiLog('শুরু হচ্ছে...');

  // ১. Validation
  if(!apiKey){
    aiStatus('API Key দিন! Input ফাঁকা আছে।','err');
    aiLog('❌ API Key ফাঁকা','err');
    showToast('API Key দিন!',true);
    return;
  }
  aiLog(`Key পাওয়া গেছে: ${apiKey.slice(0,15)}...`,'ok');
  aiProgress(20,'Key যাচাই করা হচ্ছে...');

  if(!apiKey.startsWith('sk-ant-')){
    aiStatus('API Key সঠিক নয়! "sk-ant-" দিয়ে শুরু হওয়া উচিত।','err');
    aiLog('❌ Key format ভুল — sk-ant- দিয়ে শুরু হওয়া উচিত','err');
    showToast('⚠️ API Key সঠিক নয়!',true);
    return;
  }
  aiLog('✅ Key format সঠিক','ok');
  aiProgress(40,'Firebase এ সেভ হচ্ছে...');

  // ২. Firebase সেভ
  try{
    await set(ref(db,'aiConfig'),{
      apiKey,
      anthropicApiKey:apiKey,
      updatedBy:CN||'admin',
      ts:Date.now()
    });
    window._ntAIKey=apiKey; // cache
    aiLog('✅ Firebase এ সেভ হয়েছে','ok');
    aiProgress(60,'Claude API পরীক্ষা করা হচ্ছে...');
  }catch(e){
    aiStatus(`Firebase সেভ ব্যর্থ: ${e.message}`,'err');
    aiLog('❌ Firebase error: '+e.message,'err');
    showToast('Firebase সেভ ব্যর্থ!',true);
    return;
  }

  // ৩. Claude API Test
  try{
    aiLog('Claude API call করছি...');
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':apiKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({
        model:'claude-haiku-4-5-20251001',
        max_tokens:20,
        messages:[{role:'user',content:'বাংলায় বলো: কাজ করছি'}]
      })
    });

    aiLog(`HTTP Status: ${resp.status}`);
    const data=await resp.json();
    aiLog('Response: '+JSON.stringify(data).slice(0,100));
    aiProgress(100,'সম্পন্ন!');

    if(data.content?.[0]?.text){
      const reply=data.content[0].text;
      aiLog('✅ Claude বলছে: '+reply,'ok');
      aiStatus(`সংরক্ষিত ও সক্রিয়! Claude বলছে: "${reply}"`, 'ok');
      showToast('✅ Claude AI সংযুক্ত!');
      // Auto engine শুরু
      if(typeof window.startAIAutoEngine==='function')window.startAIAutoEngine();
    } else if(data.error) {
      aiLog('❌ API Error: '+data.error.message,'err');
      aiStatus(`Key সেভ হয়েছে কিন্তু API Error: ${data.error.message}`, 'warn');
      showToast('Key সেভ — API Error: '+data.error.message,true);
    } else {
      aiLog('⚠️ অজানা response: '+JSON.stringify(data),'warn');
      aiStatus('Key সেভ হয়েছে কিন্তু response অস্বাভাবিক', 'warn');
    }
  }catch(e){
    aiLog('❌ Network error: '+e.message,'err');
    aiStatus(`Key সেভ হয়েছে। নেটওয়ার্ক সমস্যায় test করা যায়নি: ${e.message}`, 'warn');
    showToast('Key সেভ হয়েছে (test ব্যর্থ)',true);
  }

  setTimeout(()=>{
    const wrap=$('aiSaveProgress');
    if(wrap)wrap.style.display='none';
  },3000);
};

// ══ THEME ══
window.toggleTheme=()=>{
  const html=document.documentElement;
  const isDark=html.getAttribute('data-theme')!=='light';
  html.setAttribute('data-theme',isDark?'light':'dark');
  localStorage.setItem('nt-theme',isDark?'light':'dark');
};

// ══ PRINT CUSTOMER SHEET ══
window.printCustomerSheet=()=>{
  const custs=Object.values(allCustomers);
  if(!custs.length){showToast('কোনো কাস্টমার নেই!',true);return;}
  const now=new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
  const html='<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:16px;font-size:12px;}h1{color:#1E3A8A;font-size:16px;}table{width:100%;border-collapse:collapse;}th{background:#1E3A8A;color:#fff;padding:8px;}td{padding:7px;border-bottom:1px solid #e2e8f0;}</style></head><body><h1>NovaTEch BD - কাস্টমার তালিকা</h1><p>'+now+'</p><table><tr><th>#</th><th>দোকান</th><th>মালিক</th><th>রুট</th><th>ফোন</th></tr>'+custs.map((c,i)=>'<tr><td>'+(i+1)+'</td><td>'+c.name+'</td><td>'+(c.owner||'-')+'</td><td>'+(allRoutes[c.routeId]?.name||'-')+'</td><td>'+(c.smsNum||c.waNum||'-')+'</td></tr>').join('')+'</table></body></html>';
  const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
};

// ══ P&L ══
window.refreshPL=()=>{
  const el=$('plContent');if(!el)return;
  const vat=parseFloat($('vatRate')?.value)||0,gst=parseFloat($('gstRate')?.value)||0;
  const sales=Object.values(allSales),exps=Object.values(allExpenses);
  const totalRev=sales.reduce((a,b)=>a+(b.total||0),0);
  const totalProfit=sales.reduce((a,b)=>a+(b.profit||0),0);
  const totalExp=exps.reduce((a,b)=>a+(b.amount||0),0);
  const vatAmt=totalRev*vat/100,gstAmt=totalRev*gst/100;
  const netProfit=totalProfit-totalExp-vatAmt-gstAmt;
  const rows=[
    {label:'মোট বিক্রয় (Revenue)',val:totalRev,color:'var(--blue)'},
    {label:'মোট লাভ (Gross Profit)',val:totalProfit,color:'var(--green)'},
    {label:'মোট খরচ (Expense)',val:-totalExp,color:'var(--red)'},
    ...(vat>0?[{label:'VAT ('+vat+'%)',val:-vatAmt,color:'var(--accent)'}]:[]),
    ...(gst>0?[{label:'GST ('+gst+'%)',val:-gstAmt,color:'var(--purple)'}]:[]),
    {label:'নিট মুনাফা (Net Profit)',val:netProfit,color:netProfit>=0?'var(--green)':'var(--red)',bold:true}
  ];
  el.innerHTML=rows.map(r=>'<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:'+(r.bold?'2px solid var(--border)':'1px solid transparent')+'">'+'<span style="font-size:12px;'+(r.bold?'font-weight:700':'')+'">'+r.label+'</span>'+'<span style="font-size:'+(r.bold?'16':'13')+'px;font-weight:'+(r.bold?'700':'500')+';color:'+r.color+';">'+(r.val>=0?'+':'')+bn(Math.abs(r.val))+'</span></div>').join('');
};

// ══ INVOICE ══
window.generateInvoice=(saleId)=>{
  const s=allSales[saleId];if(!s)return;
  const ic=$('invoiceContent');if(!ic)return;
  ic.innerHTML='<div style="font-family:Arial;padding:16px;color:#1a202c;">'
    +'<div style="background:#1E3A8A;color:#fff;padding:16px;border-radius:8px;margin-bottom:16px;"><h2 style="margin:0;font-size:18px">NovaTEch BD</h2><p style="margin:4px 0 0;font-size:11px;opacity:.8">ইনভয়েস</p></div>'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:16px;"><div><div style="font-size:12px;color:#64748b">দোকান</div><div style="font-weight:600">'+s.shop+'</div></div><div style="text-align:right"><div style="font-size:12px;color:#64748b">তারিখ</div><div style="font-weight:600">'+fmtDate(s.date)+'</div></div></div>'
    +'<table style="width:100%;border-collapse:collapse;font-size:13px;"><tr style="background:#1E3A8A;color:#fff;"><th style="padding:8px;text-align:left">পণ্য</th><th style="padding:8px">পরিমাণ</th><th style="padding:8px">মূল্য</th><th style="padding:8px">মোট</th></tr>'
    +'<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">'+s.product+'</td><td style="padding:8px;text-align:center">'+s.qty+'</td><td style="padding:8px;text-align:right">'+bn(s.sellPrice)+'</td><td style="padding:8px;text-align:right">'+bn(s.qty*s.sellPrice)+'</td></tr></table>'
    +(s.disc>0?'<div style="text-align:right;font-size:12px;color:#ef4444;margin-top:8px">ডিসকাউন্ট ('+s.disc+'%): -'+bn(s.qty*s.sellPrice*s.disc/100)+'</div>':'')
    +'<div style="text-align:right;font-size:18px;font-weight:700;color:#059669;margin-top:8px;padding-top:8px;border-top:2px solid #e2e8f0">মোট: '+bn(s.total)+'</div>'
    +(s.due>0?'<div style="text-align:right;font-size:13px;color:#ef4444;margin-top:4px">বাকি: '+bn(s.due)+'</div>':'')
    +'<div style="text-align:center;margin-top:16px;font-size:10px;color:#94a3b8;">NovaTEch BD</div></div>';
  openMo('invoiceMo');
};

window.shareInvoiceWA=()=>{
  const el=$('invoiceContent');if(!el)return;
  const txt=el.innerText.replace(/\s+/g,' ').trim();
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
};

// ══ INIT THEME ══
(()=>{const t=localStorage.getItem('nt-theme');if(t)document.documentElement.setAttribute('data-theme',t);})();

// ══ MISSING FUNCTIONS (cross-file bridge) ══

// syncGlobals — analytics.js এর জন্য global variables

// ══════════════════════════════════════════════════
//  FOLDER / REPORT SYSTEM (Admin only)
// ══════════════════════════════════════════════════
let currentFolderTab='workers';
let currentFolderItem=null;

window.switchFolderTab=(tab,btn)=>{
  currentFolderTab=tab;
  currentFolderItem=null;
  document.querySelectorAll('[id^="ftab-"]').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderFolderTab(tab);
};

function renderFolderTab(tab){
  const el=$('foldersContent');if(!el)return;
  if(tab==='workers')renderWorkerFolders();
  else if(tab==='customers')renderCustomerFolders();
  else if(tab==='daily')renderDailyReport();
  else if(tab==='monthly')renderMonthlyReport();
}

// ── কর্মী ফোল্ডার ──
function renderWorkerFolders(){
  const el=$('foldersContent');if(!el)return;
  const workers=Object.entries(allUsers).sort((a,b)=>(a[1].name||'').localeCompare(b[1].name||''));
  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${workers.map(([uid,u])=>`
        <div onclick="openWorkerFolder('${uid}')" style="background:var(--card);border-radius:12px;padding:14px;border:1px solid var(--border);cursor:pointer;text-align:center;transition:border-color .2s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 8px;overflow:hidden;">
            ${u.photoURL?`<img src="${u.photoURL}" style="width:48px;height:48px;object-fit:cover;">`:'👤'}
          </div>
          <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.name}</div>
          <span class="role-badge role-${u.role}" style="font-size:9px">${u.role}</span>
        </div>`).join('')}
    </div>`;
}

window.openWorkerFolder=(uid)=>{
  const u=allUsers[uid];if(!u)return;
  const el=$('foldersContent');if(!el)return;
  const now=new Date();

  // এই মাসের ডেটা
  const mSales=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const mExp=Object.values(allExpenses).filter(e=>{const d=new Date(e.date);return e.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const allWorkerSales=Object.values(allSales).filter(s=>s.uid===uid);

  const totalSale=mSales.reduce((a,s)=>a+(s.total||0),0);
  const totalProfit=mSales.reduce((a,s)=>a+(s.profit||0),0);
  const totalExp=mExp.reduce((a,e)=>a+(e.amount||0),0);
  const totalDue=mSales.reduce((a,s)=>a+(s.due||0),0);
  const allTimeSale=allWorkerSales.reduce((a,s)=>a+(s.total||0),0);

  // কমিশন হিসাব (বাকি মুক্ত বিক্রয়)
  const dailyCommMap={};
  mSales.filter(s=>s.payStatus==='paid'||(s.payStatus==='due'&&s.due===0))
    .forEach(s=>{dailyCommMap[s.date]=(dailyCommMap[s.date]||0)+s.total;});
  const earnedComm=Object.values(dailyCommMap).reduce((a,v)=>a+calcCommission(v,allCommConfig),0);
  const pendingCommSales=mSales.filter(s=>s.due>0);
  const pendingCommAmt=pendingCommSales.reduce((a,s)=>a+s.total,0);
  const pendingComm=Object.entries(
    pendingCommSales.reduce((m,s)=>{m[s.date]=(m[s.date]||0)+s.total;return m;},{})
  ).reduce((a,[,v])=>a+calcCommission(v,allCommConfig),0);

  const sal=allSalaries[uid];

  // উপস্থিতি এই মাস
  const mAtt=Object.values(allAttendance).filter(a=>{
    const d=new Date(a.date);return a.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const lateCount=mAtt.filter(a=>a.isLate).length;
  const totalHours=mAtt.reduce((a,att)=>a+parseFloat(att.totalHours||0),0);
  const otDays=mAtt.filter(a=>a.isOT).length;

  // OT requests
  const myOT=Object.values(allAttendance).filter(a=>a.uid===uid&&a.isOT&&!a.otApproved);

  const docs=u.documents||[];

  // ৭ দিনের চার্ট
  const dailyMap={};
  mSales.forEach(s=>{dailyMap[s.date]=(dailyMap[s.date]||0)+s.total;});
  const days=Object.keys(dailyMap).sort().slice(-7);
  const maxVal=Math.max(...days.map(d=>dailyMap[d]),1);

  // কাস্টমারওয়ারি বিক্রয়
  const custMap={};
  mSales.forEach(s=>{custMap[s.shop]=(custMap[s.shop]||0)+s.total;});
  const topCusts=Object.entries(custMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

  el.innerHTML=`
    <button onclick="renderWorkerFolders()" style="margin-bottom:12px;background:none;border:none;color:var(--blue);cursor:pointer;font-family:inherit;font-size:13px;">← সব কর্মী</button>

    <!-- প্রোফাইল হেডার -->
    <div style="background:var(--card);border-radius:14px;padding:16px;border:1px solid var(--border);margin-bottom:10px;text-align:center">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 8px;overflow:hidden;">
        ${u.photoURL?`<img src="${u.photoURL}" style="width:72px;height:72px;object-fit:cover;">`:'👤'}
      </div>
      <div style="font-size:17px;font-weight:700">${u.name}</div>
      <span class="role-badge role-${u.role}">${u.role}</span>
      <div style="font-size:11px;color:var(--muted);margin-top:5px">
        📧 ${u.email}<br>
        📱 ${u.phone||'-'} · WA: ${u.waNum||'-'}<br>
        🏠 ${u.address||'-'}<br>
        🗓 যোগদান: ${u.createdAt||'-'} · স্ট্যাটাস: <span style="color:${u.status==='active'?'var(--green)':'var(--red)'}">${u.status||'active'}</span>
      </div>
    </div>

    <!-- এই মাসের সারসংক্ষেপ -->
    <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px;padding-left:2px">📅 এই মাসের সারসংক্ষেপ</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div class="sum-card c-sale"><div class="lbl">বিক্রয়</div><div class="val">${bn(totalSale)}</div></div>
      <div class="sum-card" style="border-color:var(--green)"><div class="lbl">লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>
      <div class="sum-card" style="border-color:var(--red)"><div class="lbl">খরচ</div><div class="val" style="color:var(--red)">${bn(totalExp)}</div></div>
      <div class="sum-card" style="border-color:var(--purple)"><div class="lbl">বাকি</div><div class="val" style="color:var(--purple)">${bn(totalDue)}</div></div>
    </div>

    <!-- কমিশন সেকশন -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">💎 কমিশন বিবরণ</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="background:rgba(46,204,138,.1);border:1px solid var(--green);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:11px;color:var(--muted)">✅ অর্জিত কমিশন</div>
          <div style="font-size:18px;font-weight:700;color:var(--green);margin-top:3px">${bn(earnedComm)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">পরিশোধিত বিক্রয় থেকে</div>
        </div>
        <div style="background:rgba(232,93,74,.1);border:1px solid var(--red);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:11px;color:var(--muted)">⏳ অপেক্ষমান কমিশন</div>
          <div style="font-size:18px;font-weight:700;color:var(--accent);margin-top:3px">${bn(pendingComm)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">বাকি তুললে যোগ হবে</div>
        </div>
      </div>
      ${pendingCommSales.length>0?`<div style="margin-top:8px;font-size:11px;color:var(--muted);text-align:center">⚠️ ${pendingCommSales.length}টি বিক্রয়ে বাকি আছে (${bn(pendingCommAmt)})</div>`:''}
    </div>

    <!-- বেতন ও কর্মঘণ্টা -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">💰 বেতন ও কর্মঘণ্টা</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
        <div style="background:var(--surface);border-radius:8px;padding:8px">
          <div style="color:var(--muted);font-size:10px">মূল বেতন</div>
          <div style="font-weight:700;margin-top:2px">${sal?bn(sal.basic):'সেট হয়নি'}</div>
        </div>
        <div style="background:var(--surface);border-radius:8px;padding:8px">
          <div style="color:var(--muted);font-size:10px">মাসিক টার্গেট</div>
          <div style="font-weight:700;margin-top:2px">${sal?bn(sal.monthlyTarget||0):'–'}</div>
        </div>
        <div style="background:var(--surface);border-radius:8px;padding:8px">
          <div style="color:var(--muted);font-size:10px">শিফট সময়</div>
          <div style="font-weight:700;margin-top:2px">${sal?.shiftStart||'–'} – ${sal?.shiftEnd||'–'}</div>
        </div>
        <div style="background:var(--surface);border-radius:8px;padding:8px">
          <div style="color:var(--muted);font-size:10px">মোট কর্মঘণ্টা</div>
          <div style="font-weight:700;margin-top:2px">${totalHours.toFixed(1)} ঘণ্টা</div>
        </div>
      </div>
      ${sal?`<div style="margin-top:8px;background:var(--surface);border-radius:8px;padding:8px">
        <div style="font-size:11px;color:var(--muted)">টার্গেট অর্জন</div>
        <div style="background:var(--border);border-radius:4px;height:8px;margin-top:4px;overflow:hidden">
          <div style="background:${totalSale>=(sal.monthlyTarget||0)?'var(--green)':'var(--accent)'};height:100%;border-radius:4px;width:${Math.min((totalSale/(sal.monthlyTarget||1)*100),100).toFixed(0)}%"></div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px">${bn(totalSale)} / ${bn(sal.monthlyTarget||0)} (${Math.min((totalSale/(sal.monthlyTarget||1)*100),100).toFixed(0)}%)</div>
      </div>`:''}
    </div>

    <!-- উপস্থিতি -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">⏰ উপস্থিতি ও সময়</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;font-size:12px">
        <div style="background:rgba(46,204,138,.1);border-radius:8px;padding:8px">
          <div style="font-size:20px;font-weight:700;color:var(--green)">${mAtt.length}</div>
          <div style="color:var(--muted);font-size:10px">উপস্থিতি</div>
        </div>
        <div style="background:rgba(232,93,74,.1);border-radius:8px;padding:8px">
          <div style="font-size:20px;font-weight:700;color:var(--red)">${lateCount}</div>
          <div style="color:var(--muted);font-size:10px">দেরিতে</div>
        </div>
        <div style="background:rgba(74,158,255,.1);border-radius:8px;padding:8px">
          <div style="font-size:20px;font-weight:700;color:var(--blue)">${otDays}</div>
          <div style="color:var(--muted);font-size:10px">ওভারটাইম</div>
        </div>
      </div>
      <!-- উপস্থিতি ক্যালেন্ডার -->
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:3px">
        ${mAtt.sort((a,b)=>a.date.localeCompare(b.date)).map(a=>`
          <div title="${a.date} | ইন: ${a.checkIn?fmtTime(a.checkIn):'–'} | আউট: ${a.checkOut?fmtTime(a.checkOut):'চলছে'}" style="width:28px;height:28px;border-radius:6px;background:${a.isLate?'rgba(232,93,74,.3)':'rgba(46,204,138,.3)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;cursor:default;border:1px solid ${a.isLate?'var(--red)':'var(--green)'}">
            ${a.date.slice(8)}
          </div>`).join('')}
      </div>
      ${mAtt.length>0?`<div style="font-size:10px;color:var(--muted);margin-top:6px">🟢 সময়মতো &nbsp; 🔴 দেরিতে</div>`:''}
    </div>

    <!-- চার্ট -->
    ${days.length>0?`<div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">📈 শেষ ${days.length} দিনের বিক্রয়</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:80px">
        ${days.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="font-size:8px;color:var(--muted)">${bn(dailyMap[d]).replace('৳','')}</div>
          <div style="width:100%;background:var(--accent);border-radius:4px 4px 0 0;height:${Math.max(4,(dailyMap[d]/maxVal*60))}px"></div>
          <div style="font-size:8px;color:var(--muted)">${d.slice(8)}</div>
        </div>`).join('')}
      </div>
    </div>`:''}

    <!-- সেরা কাস্টমার -->
    ${topCusts.length>0?`<div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px">🏆 শীর্ষ কাস্টমার (এই মাস)</div>
      ${topCusts.map(([shop,total],i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <span>${i===0?'🥇':i===1?'🥈':'🥉'} ${shop}</span>
        <span style="color:var(--accent);font-weight:600">${bn(total)}</span>
      </div>`).join('')}
    </div>`:''}

    <!-- বিক্রয় লিস্ট -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px">🛍 বিক্রয় তালিকা — ${mSales.length}টি</div>
      ${mSales.slice(0,15).map(s=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div>
          <div style="font-weight:600">${s.shop}</div>
          <div style="color:var(--muted);font-size:11px">${s.product} × ${s.qty} · ${fmtDate(s.date)}</div>
          ${s.photoUrl?`<a href="${s.photoUrl}" target="_blank" style="font-size:10px;color:var(--blue)">📷 ছবি দেখুন</a>`:''}
        </div>
        <div style="text-align:right">
          <div style="color:var(--accent)">${bn(s.total)}</div>
          ${s.due>0?`<div style="font-size:10px;color:var(--red)">বাকি ${bn(s.due)}</div>`:`<div style="font-size:10px;color:var(--green)">✅</div>`}
        </div>
      </div>`).join('')||'<div class="empty">কোনো বিক্রয় নেই</div>'}
      ${mSales.length>15?`<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:6px">আরো ${mSales.length-15}টি</div>`:''}
    </div>

    <!-- খরচ লিস্ট -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px">💸 খরচ তালিকা — ${mExp.length}টি</div>
      ${mExp.map(e=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div>
          <div style="font-weight:600">${e.type}</div>
          <div style="color:var(--muted);font-size:11px">${e.note||''} · ${fmtDate(e.date)}</div>
        </div>
        <div>
          <div style="color:var(--red)">${bn(e.amount)}</div>
          <div style="font-size:10px;color:${e.status==='approved'?'var(--green)':e.status==='rejected'?'var(--red)':'var(--accent)'}">${e.status==='approved'?'✅':e.status==='rejected'?'❌':'⏳'}</div>
        </div>
      </div>`).join('')||'<div class="empty">কোনো খরচ নেই</div>'}
    </div>

    <!-- ডকুমেন্টস -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px">📁 ডকুমেন্টস — ${docs.length}টি</div>
      ${docs.map(d=>`<a href="${d.url}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:9px;background:var(--surface);border-radius:8px;margin-bottom:5px;text-decoration:none;color:var(--text);border:1px solid var(--border)">
        <span style="font-size:20px">📄</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.name}</div>
          <div style="font-size:10px;color:var(--muted)">${d.uploadedBy||''} · Google Drive →</div>
        </div>
      </a>`).join('')||'<div style="font-size:12px;color:var(--muted)">কোনো ডকুমেন্ট নেই</div>'}
    </div>

    <!-- সার্বিক পরিসংখ্যান -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px">📊 সার্বিক পরিসংখ্যান (সব সময়)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
        <div style="background:var(--surface);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:var(--accent)">${bn(allTimeSale)}</div>
          <div style="color:var(--muted);font-size:10px">মোট বিক্রয় (সব সময়)</div>
        </div>
        <div style="background:var(--surface);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:var(--blue)">${allWorkerSales.length}</div>
          <div style="color:var(--muted);font-size:10px">মোট অর্ডার</div>
        </div>
      </div>
    </div>

    <!-- PDF বাটন -->
    <button onclick="printWorkerReport('${uid}')" style="width:100%;padding:13px;background:rgba(74,158,255,.15);border:1px solid var(--blue);color:var(--blue);border-radius:12px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px;">
      📄 সম্পূর্ণ রিপোর্ট PDF
    </button>`;

  el.innerHTML=`
    <button onclick="renderWorkerFolders()" style="margin-bottom:12px;background:none;border:none;color:var(--blue);cursor:pointer;font-family:inherit;font-size:13px;">← ফিরে যান</button>
    <!-- হেডার -->
    <div style="background:var(--card);border-radius:14px;padding:16px;border:1px solid var(--border);margin-bottom:10px;text-align:center">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 8px;overflow:hidden;">
        ${u.photoURL?`<img src="${u.photoURL}" style="width:64px;height:64px;object-fit:cover;">`:'👤'}
      </div>
      <div style="font-size:16px;font-weight:700">${u.name}</div>
      <span class="role-badge role-${u.role}">${u.role}</span>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">📧 ${u.email} · 📱 ${u.phone||'-'}</div>
      <div style="font-size:11px;color:var(--muted)">🏠 ${u.address||'-'} · যোগদান: ${u.createdAt||'-'}</div>
    </div>
    <!-- এই মাসের সারসংক্ষেপ -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div class="sum-card c-sale"><div class="lbl">বিক্রয়</div><div class="val">${bn(totalSale)}</div></div>
      <div class="sum-card" style="border-color:var(--green)"><div class="lbl">লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>
      <div class="sum-card" style="border-color:var(--red)"><div class="lbl">খরচ</div><div class="val" style="color:var(--red)">${bn(totalExp)}</div></div>
      <div class="sum-card" style="border-color:var(--purple)"><div class="lbl">বাকি</div><div class="val" style="color:var(--purple)">${bn(totalDue)}</div></div>
    </div>
    <!-- বেতন তথ্য -->
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">💰 বেতন ও কর্মঘণ্টা</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
        <div>মূল বেতন: <b>${sal?bn(sal.basic):'–'}</b></div>
        <div>উপস্থিতি: <b>${att.length} দিন</b></div>
        <div>শিফট: <b>${sal?.shiftStart||'–'} – ${sal?.shiftEnd||'–'}</b></div>
        <div>টার্গেট: <b>${sal?bn(sal.monthlyTarget||0):'–'}</b></div>
      </div>
    </div>
    <!-- ৭ দিনের বিক্রয় চার্ট -->
    ${days.length>0?`<div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">📈 শেষ ${days.length} দিনের বিক্রয়</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:80px">
        ${days.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="width:100%;background:var(--accent);border-radius:4px 4px 0 0;height:${Math.max(4,(dailyMap[d]/maxVal*70))}px;min-height:4px"></div>
          <div style="font-size:8px;color:var(--muted);text-align:center">${d.slice(8)}</div>
        </div>`).join('')}
      </div>
    </div>`:''}
    <!-- বিক্রয় লিস্ট -->
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🛍 এই মাসের বিক্রয় (${mSales.length}টি)</div>
      ${mSales.slice(0,10).map(s=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div><div style="font-weight:600">${s.shop}</div><div style="color:var(--muted)">${s.product} × ${s.qty} · ${fmtDate(s.date)}</div></div>
        <div style="text-align:right"><div style="color:var(--accent)">${bn(s.total)}</div>${s.due>0?`<div style="color:var(--red);font-size:10px">বাকি ${bn(s.due)}</div>`:''}</div>
      </div>`).join('')||'<div class="empty">কোনো বিক্রয় নেই</div>'}
      ${mSales.length>10?`<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:6px">আরো ${mSales.length-10}টি আছে</div>`:''}
    </div>
    <!-- খরচ লিস্ট -->
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">💸 এই মাসের খরচ (${mExp.length}টি)</div>
      ${mExp.slice(0,5).map(e=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div><div style="font-weight:600">${e.type}</div><div style="color:var(--muted)">${e.note||''} · ${fmtDate(e.date)}</div></div>
        <div style="color:var(--red)">${bn(e.amount)}</div>
      </div>`).join('')||'<div class="empty">কোনো খরচ নেই</div>'}
    </div>
    <!-- ডকুমেন্টস -->
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">📁 ডকুমেন্টস (${docs.length}টি)</div>
      ${docs.map(d=>`<a href="${d.url}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface);border-radius:8px;margin-bottom:5px;text-decoration:none;color:var(--text);border:1px solid var(--border)">
        <span style="font-size:18px">📄</span>
        <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.name}</div>
        <div style="font-size:10px;color:var(--muted)">Drive এ দেখুন →</div></div>
      </a>`).join('')||'<div style="font-size:12px;color:var(--muted)">কোনো ডকুমেন্ট নেই</div>'}
    </div>
    <!-- PDF রিপোর্ট -->
    <button onclick="printWorkerReport('${uid}')" style="width:100%;padding:12px;background:rgba(74,158,255,.15);border:1px solid var(--blue);color:var(--blue);border-radius:12px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">
      📄 সম্পূর্ণ রিপোর্ট PDF ডাউনলোড
    </button>`;
};

// ── কাস্টমার ফোল্ডার ──
function renderCustomerFolders(){
  const el=$('foldersContent');if(!el)return;
  const custs=Object.entries(allCustomers).sort((a,b)=>(a[1].name||'').localeCompare(b[1].name||''));
  el.innerHTML=`
    <div style="margin-bottom:10px">
      <input class="inp" placeholder="🔍 কাস্টমার খুঁজুন..." oninput="filterCustomerFolders(this.value)" style="margin:0">
    </div>
    <div id="custFolderGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${custs.map(([id,c])=>{
        const due=Object.values(allSales).filter(s=>s.shopId===id&&s.due>0).reduce((a,s)=>a+s.due,0);
        const orders=Object.values(allSales).filter(s=>s.shopId===id).length;
        return`<div onclick="openCustomerFolder('${id}')" style="background:var(--card);border-radius:12px;padding:12px;border:1px solid ${due>0?'var(--red)':'var(--border)'};cursor:pointer;text-align:center">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 6px;overflow:hidden;">
            ${c.photoURL?`<img src="${c.photoURL}" style="width:48px;height:48px;object-fit:cover;">`:'🏪'}
          </div>
          <div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</div>
          <div style="font-size:10px;color:var(--muted)">${orders} অর্ডার</div>
          ${due>0?`<div style="font-size:10px;color:var(--red);font-weight:600">বাকি ${bn(due)}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
}

window.filterCustomerFolders=(q)=>{
  const grid=$('custFolderGrid');if(!grid)return;
  const custs=Object.entries(allCustomers).filter(([,c])=>!q||(c.name||'').toLowerCase().includes(q.toLowerCase()));
  grid.innerHTML=custs.map(([id,c])=>{
    const due=Object.values(allSales).filter(s=>s.shopId===id&&s.due>0).reduce((a,s)=>a+s.due,0);
    const orders=Object.values(allSales).filter(s=>s.shopId===id).length;
    return`<div onclick="openCustomerFolder('${id}')" style="background:var(--card);border-radius:12px;padding:12px;border:1px solid ${due>0?'var(--red)':'var(--border)'};cursor:pointer;text-align:center">
      <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 6px;overflow:hidden;">
        ${c.photoURL?`<img src="${c.photoURL}" style="width:48px;height:48px;object-fit:cover;">`:'🏪'}
      </div>
      <div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</div>
      <div style="font-size:10px;color:var(--muted)">${orders} অর্ডার</div>
      ${due>0?`<div style="font-size:10px;color:var(--red);font-weight:600">বাকি ${bn(due)}</div>`:''}
    </div>`;
  }).join('');
};

window.openCustomerFolder=(custId)=>{
  const c=allCustomers[custId];if(!c)return;
  const el=$('foldersContent');if(!el)return;
  const route=allRoutes[c.routeId];
  const cs=Object.values(allSales).filter(s=>s.shopId===custId).sort((a,b)=>b.ts-a.ts);
  const totalSale=cs.reduce((a,s)=>a+(s.total||0),0);
  const totalDue=cs.reduce((a,s)=>a+(s.due||0),0);
  const totalOrders=cs.length;

  // মাসওয়ারি ক্রয়
  const monthMap={};
  cs.forEach(s=>{const m=s.date?.slice(0,7);if(m)monthMap[m]=(monthMap[m]||0)+s.total;});
  const months=Object.keys(monthMap).sort().slice(-6);

  el.innerHTML=`
    <button onclick="renderCustomerFolders()" style="margin-bottom:12px;background:none;border:none;color:var(--blue);cursor:pointer;font-family:inherit;font-size:13px;">← ফিরে যান</button>
    <div style="background:var(--card);border-radius:14px;padding:16px;border:1px solid var(--border);margin-bottom:10px;text-align:center">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 8px;overflow:hidden;">
        ${c.photoURL?`<img src="${c.photoURL}" style="width:64px;height:64px;object-fit:cover;">`:'🏪'}
      </div>
      <div style="font-size:16px;font-weight:700">${c.name}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">👤 ${c.owner||'-'} · 🗺️ ${route?route.name:'-'}</div>
      <div style="font-size:12px;color:var(--muted)">📱 ${c.waNum||'-'}</div>
      ${c.note?`<div style="font-size:11px;color:var(--muted);margin-top:4px">${c.note}</div>`:''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
      <div class="sum-card c-sale"><div class="lbl">মোট বিক্রয়</div><div class="val" style="font-size:14px">${bn(totalSale)}</div></div>
      <div class="sum-card c-due"><div class="lbl">বাকি</div><div class="val" style="font-size:14px">${bn(totalDue)}</div></div>
      <div class="sum-card"><div class="lbl">অর্ডার</div><div class="val" style="font-size:14px;color:var(--blue)">${totalOrders}</div></div>
    </div>
    ${c.lat&&c.lng?`<div style="border-radius:12px;overflow:hidden;border:1px solid var(--border);margin-bottom:10px">
      <iframe src="https://maps.google.com/maps?q=${c.lat},${c.lng}&z=16&output=embed" width="100%" height="150" style="border:none;display:block;" loading="lazy"></iframe>
      <div style="padding:8px 12px;background:var(--card);font-size:11px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--muted)">📍 ${parseFloat(c.lat).toFixed(5)}, ${parseFloat(c.lng).toFixed(5)}</span>
        <button onclick="openMap(${c.lat},${c.lng})" style="font-size:11px;padding:4px 10px;background:var(--accent);border:none;border-radius:6px;color:#000;cursor:pointer;font-family:inherit">Maps খুলুন</button>
      </div>
    </div>`:''}
    ${months.length>0?`<div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">📈 মাসওয়ারি ক্রয়</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:70px">
        ${months.map(m=>{const maxM=Math.max(...months.map(x=>monthMap[x]),1);return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="width:100%;background:var(--blue);border-radius:3px 3px 0 0;height:${Math.max(4,monthMap[m]/maxM*60)}px"></div>
          <div style="font-size:8px;color:var(--muted)">${m.slice(5)}</div>
        </div>`}).join('')}
      </div>
    </div>`:''}
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🛍 ক্রয় ইতিহাস</div>
      ${cs.slice(0,15).map(s=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div>
          <div style="font-weight:600">${s.product} × ${s.qty}</div>
          <div style="color:var(--muted);font-size:11px">📅 ${fmtDate(s.date)} · 👤 ${s.workerName||'–'}</div>
        </div>
        <div style="text-align:right">
          <div style="color:var(--accent)">${bn(s.total)}</div>
          ${s.due>0?`<div style="font-size:10px;color:var(--red)">বাকি ${bn(s.due)}</div>`:'<div style="font-size:10px;color:var(--green)">✅ পরিশোধ</div>'}
        </div>
      </div>`).join('')||'<div class="empty">কোনো অর্ডার নেই</div>'}
    </div>`;
};

// ── দৈনিক রিপোর্ট ──
function renderDailyReport(){
  const el=$('foldersContent');if(!el)return;
  const today_str=today();
  // তারিখ selector
  const allDates=[...new Set(Object.values(allSales).map(s=>s.date).filter(Boolean))].sort().reverse().slice(0,30);

  el.innerHTML=`
    <div style="margin-bottom:10px">
      <label style="font-size:12px;color:var(--muted)">তারিখ সিলেক্ট করুন</label>
      <select class="inp" id="dailyDateSel" onchange="renderDailyForDate(this.value)" style="margin-top:4px">
        ${allDates.map(d=>`<option value="${d}" ${d===today_str?'selected':''}>${d}</option>`).join('')}
      </select>
    </div>
    <div id="dailyReportContent"></div>`;
  renderDailyForDate(allDates[0]||today_str);
}

window.renderDailyForDate=(date)=>{
  const el=$('dailyReportContent');if(!el)return;
  const daySales=Object.values(allSales).filter(s=>s.date===date);
  const dayExp=Object.values(allExpenses).filter(e=>e.date===date);
  const totalSale=daySales.reduce((a,s)=>a+(s.total||0),0);
  const totalProfit=daySales.reduce((a,s)=>a+(s.profit||0),0);
  const totalExp=dayExp.reduce((a,e)=>a+(e.amount||0),0);
  const netProfit=totalProfit-totalExp;

  // কর্মীওয়ারি বিক্রয়
  const workerMap={};
  daySales.forEach(s=>{
    if(!workerMap[s.uid])workerMap[s.uid]={name:s.workerName||'–',total:0,orders:0};
    workerMap[s.uid].total+=s.total||0;
    workerMap[s.uid].orders++;
  });

  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div class="sum-card c-sale"><div class="lbl">মোট বিক্রয়</div><div class="val">${bn(totalSale)}</div></div>
      <div class="sum-card" style="border-color:var(--green)"><div class="lbl">লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>
      <div class="sum-card" style="border-color:var(--red)"><div class="lbl">খরচ</div><div class="val" style="color:var(--red)">${bn(totalExp)}</div></div>
      <div class="sum-card" style="border-color:${netProfit>=0?'var(--green)':'var(--red)'}"><div class="lbl">নিট লাভ</div><div class="val" style="color:${netProfit>=0?'var(--green)':'var(--red)'}">${bn(netProfit)}</div></div>
    </div>
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">👤 কর্মীওয়ারি বিক্রয়</div>
      ${Object.values(workerMap).sort((a,b)=>b.total-a.total).map(w=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
          <div><div style="font-weight:600">${w.name}</div><div style="color:var(--muted);font-size:11px">${w.orders}টি অর্ডার</div></div>
          <div style="color:var(--accent);font-weight:700">${bn(w.total)}</div>
        </div>`).join('')||'<div class="empty">কোনো বিক্রয় নেই</div>'}
    </div>
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🛍 বিক্রয় তালিকা (${daySales.length}টি)</div>
      ${daySales.map(s=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div><div style="font-weight:600">${s.shop}</div><div style="color:var(--muted)">${s.product}×${s.qty} · ${s.workerName||'–'}</div></div>
        <div style="text-align:right"><div style="color:var(--accent)">${bn(s.total)}</div>${s.due>0?`<div style="font-size:10px;color:var(--red)">বাকি ${bn(s.due)}</div>`:''}</div>
      </div>`).join('')||'<div class="empty">কোনো বিক্রয় নেই</div>'}
    </div>
    ${dayExp.length>0?`<div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border)">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">💸 খরচ তালিকা</div>
      ${dayExp.map(e=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div><div>${e.type}</div><div style="color:var(--muted)">${e.workerName||'–'}</div></div>
        <div style="color:var(--red)">${bn(e.amount)}</div>
      </div>`).join('')}
    </div>`:''}`;
};

// ── মাসিক রিপোর্ট ──
function renderMonthlyReport(){
  const el=$('foldersContent');if(!el)return;
  const now=new Date();
  const months=[];
  for(let i=0;i<6;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:`${d.getFullYear()} - ${d.getMonth()+1} মাস`});
  }
  el.innerHTML=`
    <div style="margin-bottom:10px">
      <select class="inp" id="monthlyMonthSel" onchange="renderMonthlyForMonth(this.value)" style="margin:0">
        ${months.map(m=>`<option value="${m.key}">${m.label}</option>`).join('')}
      </select>
    </div>
    <div id="monthlyReportContent"></div>`;
  renderMonthlyForMonth(months[0].key);
}

window.renderMonthlyForMonth=(month)=>{
  const el=$('monthlyReportContent');if(!el)return;
  const mSales=Object.values(allSales).filter(s=>s.date?.startsWith(month));
  const mExp=Object.values(allExpenses).filter(e=>e.date?.startsWith(month));
  const totalSale=mSales.reduce((a,s)=>a+(s.total||0),0);
  const totalProfit=mSales.reduce((a,s)=>a+(s.profit||0),0);
  const totalExp=mExp.reduce((a,e)=>a+(e.amount||0),0);

  // কর্মীওয়ারি
  const wm={};mSales.forEach(s=>{wm[s.uid]={name:s.workerName||'–',total:(wm[s.uid]?.total||0)+s.total,orders:(wm[s.uid]?.orders||0)+1};});
  // প্রোডাক্টওয়ারি
  const pm={};mSales.forEach(s=>{pm[s.product]=(pm[s.product]||0)+s.qty;});
  // দৈনিক চার্ট
  const dm={};mSales.forEach(s=>{dm[s.date]=(dm[s.date]||0)+s.total;});
  const days=Object.keys(dm).sort();
  const maxD=Math.max(...days.map(d=>dm[d]),1);

  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div class="sum-card c-sale"><div class="lbl">মোট বিক্রয়</div><div class="val">${bn(totalSale)}</div></div>
      <div class="sum-card" style="border-color:var(--green)"><div class="lbl">মোট লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>
      <div class="sum-card" style="border-color:var(--red)"><div class="lbl">মোট খরচ</div><div class="val" style="color:var(--red)">${bn(totalExp)}</div></div>
      <div class="sum-card" style="border-color:var(--blue)"><div class="lbl">অর্ডার</div><div class="val" style="color:var(--blue)">${mSales.length}টি</div></div>
    </div>
    ${days.length>0?`<div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">📈 দৈনিক বিক্রয়</div>
      <div style="display:flex;align-items:flex-end;gap:2px;height:70px;overflow-x:auto">
        ${days.map(d=>`<div style="flex:0 0 auto;width:${Math.max(16,280/days.length)}px;display:flex;flex-direction:column;align-items:center;gap:1px">
          <div style="width:100%;background:var(--accent);border-radius:2px 2px 0 0;height:${Math.max(3,dm[d]/maxD*60)}px"></div>
          <div style="font-size:7px;color:var(--muted)">${d.slice(8)}</div>
        </div>`).join('')}
      </div>
    </div>`:''}
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">👤 কর্মীওয়ারি বিক্রয়</div>
      ${Object.values(wm).sort((a,b)=>b.total-a.total).map(w=>`
        <div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
            <span style="font-weight:600">${w.name}</span><span style="color:var(--accent)">${bn(w.total)}</span>
          </div>
          <div style="background:var(--surface);border-radius:4px;height:6px;overflow:hidden">
            <div style="background:var(--accent);height:100%;border-radius:4px;width:${(w.total/Math.max(...Object.values(wm).map(x=>x.total),1)*100).toFixed(0)}%"></div>
          </div>
        </div>`).join('')||'<div class="empty">নেই</div>'}
    </div>
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border)">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🛍 সেরা পণ্য</div>
      ${Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([p,q])=>`
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
          <span>${p}</span><span style="color:var(--blue);font-weight:600">${q} পিস</span>
        </div>`).join('')||'<div class="empty">নেই</div>'}
    </div>`;
};

// কর্মীর PDF রিপোর্ট
window.printWorkerReport=(uid)=>{
  const u=allUsers[uid];if(!u)return;
  const now=new Date();
  const mSales=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const mExp=Object.values(allExpenses).filter(e=>{const d=new Date(e.date);return e.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const totalSale=mSales.reduce((a,s)=>a+(s.total||0),0);
  const totalProfit=mSales.reduce((a,s)=>a+(s.profit||0),0);
  const totalExp=mExp.reduce((a,e)=>a+(e.amount||0),0);
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${u.name} — রিপোর্ট</title>
  <style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{color:#f5a623}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #ddd;padding:7px;font-size:12px}th{background:#f5a623;color:#000}.summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:10px 0}.box{background:#f9f9f9;border-radius:8px;padding:10px;text-align:center}.box-val{font-size:18px;font-weight:bold;color:#f5a623}</style>
  </head><body>
  <h1>📊 ${u.name} — মাসিক রিপোর্ট</h1>
  <p>মাস: ${now.getFullYear()}-${now.getMonth()+1} | রিপোর্ট তৈরি: ${new Date().toLocaleDateString('bn-BD')}</p>
  <p>📧 ${u.email} | 📱 ${u.phone||'-'} | ভূমিকা: ${u.role}</p>
  <div class="summary">
    <div class="box"><div>মোট বিক্রয়</div><div class="box-val">৳${Math.round(totalSale).toLocaleString()}</div></div>
    <div class="box"><div>লাভ</div><div class="box-val" style="color:green">৳${Math.round(totalProfit).toLocaleString()}</div></div>
    <div class="box"><div>খরচ</div><div class="box-val" style="color:red">৳${Math.round(totalExp).toLocaleString()}</div></div>
  </div>
  <h3>বিক্রয় তালিকা</h3>
  <table><tr><th>তারিখ</th><th>দোকান</th><th>পণ্য</th><th>পরিমাণ</th><th>মোট</th><th>স্ট্যাটাস</th></tr>
  ${mSales.map(s=>`<tr><td>${s.date}</td><td>${s.shop}</td><td>${s.product}</td><td>${s.qty}</td><td>৳${Math.round(s.total)}</td><td>${s.payStatus}</td></tr>`).join('')}
  </table>
  <h3>খরচ তালিকা</h3>
  <table><tr><th>তারিখ</th><th>ধরন</th><th>নোট</th><th>পরিমাণ</th></tr>
  ${mExp.map(e=>`<tr><td>${e.date}</td><td>${e.type}</td><td>${e.note||''}</td><td>৳${Math.round(e.amount)}</td></tr>`).join('')}
  </table>
  </body></html>`);
  w.document.close();setTimeout(()=>w.print(),500);
};

function syncGlobals(){
  window.allSales=allSales; window.allExpenses=allExpenses;
  window.allProducts=allProducts; window.allUsers=allUsers;
  window.allRoutes=allRoutes; window.allSalaries=allSalaries;
  window.allAttendance=allAttendance; window.allCustomers=allCustomers;
  window.allAllowances=allAllowances; window.allCommConfig=allCommConfig;
  window.CR=CR; window.CU=CU; window.CN=CN;
}

// updateLowStockBanner
function updateLowStockBanner(){
  const banner=$('lowStockBanner');if(!banner)return;
  const pm={};
  Object.values(allStock).forEach(s=>{pm[s.prodName]=(pm[s.prodName]||0)+s.qty;});
  Object.values(allStockAssign).forEach(s=>{pm[s.prodName]=(pm[s.prodName]||0)-s.qty;});
  const low=Object.entries(pm).filter(([,q])=>q<=5&&q>=0);
  if(low.length){
    banner.style.display='block';
    banner.innerHTML='⚠️ কম স্টক: '+low.map(([n,q])=>'<b>'+n+'</b> ('+q+' পিস)').join(', ');
  }else{banner.style.display='none';}
}

// exportSalaryPDF
window.exportSalaryPDF=()=>{
  const now=new Date().toLocaleDateString('bn-BD',{month:'long',year:'numeric'});
  const workers=Object.entries(allUsers).filter(([,u])=>u.role==='worker'||u.role==='manager');
  const nowD=new Date();
  const html='<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:20px;}h1{color:#1E3A8A;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;font-size:12px;}th{background:#1E3A8A;color:#fff;}</style></head><body>'
    +'<h1>NovaTEch BD — বেতন বিবরণী</h1><p>'+now+'</p>'
    +'<table><tr><th>নাম</th><th>ভূমিকা</th><th>মূল বেতন</th><th>উপস্থিতি</th><th>বিক্রয়</th><th>কমিশন</th><th>ভাতা</th><th>নেট বেতন</th></tr>'
    +workers.map(([uid,u])=>{
      const sal=allSalaries[uid],basic=sal?.basic||0,shiftH=parseFloat(sal?.shiftHours)||8;
      const att=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===uid&&d.getMonth()===nowD.getMonth()&&d.getFullYear()===nowD.getFullYear();}).length;
      const sale=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===nowD.getMonth()&&d.getFullYear()===nowD.getFullYear()&&s.payStatus==='paid';}).reduce((a,b)=>a+(b.total||0),0);
      const dailyMap={};
      Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===nowD.getMonth()&&d.getFullYear()===nowD.getFullYear()&&s.payStatus==='paid';}).forEach(s=>{dailyMap[s.date]=(dailyMap[s.date]||0)+s.total;});
      const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,allCommConfig),0);
      const allow=Object.values(allAllowances).filter(a=>{const t=today();return a.uid===uid&&a.from<=t&&a.to>=t;}).reduce((a,b)=>a+(b.amount||0),0);
      const earnedBasic=(basic/26)*att;
      const net=earnedBasic+comm+allow;
      return '<tr><td>'+u.name+'</td><td>'+u.role+'</td><td>'+Math.round(basic).toLocaleString()+'</td><td>'+att+' দিন</td><td>'+Math.round(sale).toLocaleString()+'</td><td>'+Math.round(comm).toLocaleString()+'</td><td>'+Math.round(allow).toLocaleString()+'</td><td><b>'+Math.round(net).toLocaleString()+'</b></td></tr>';
    }).join('')
    +'</table></body></html>';
  const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
};

// ══ AI CHAT ══
window.sendAIChat=async()=>{
  const input=document.getElementById('aiChatInput');
  const msgs=document.getElementById('aiChatMessages');
  if(!input||!msgs)return;
  const msg=input.value.trim();if(!msg)return;
  input.value='';
  msgs.innerHTML+='<div style="background:var(--blue);color:#fff;border-radius:12px 12px 2px 12px;padding:8px 12px;font-size:13px;max-width:80%;align-self:flex-end;margin-left:auto;margin-bottom:6px">'+msg+'</div>';
  msgs.scrollTop=msgs.scrollHeight;
  const tid='t'+Date.now();
  msgs.innerHTML+='<div id="'+tid+'" style="background:var(--card);border-radius:2px 12px 12px 12px;padding:8px 12px;font-size:13px;max-width:80%;margin-bottom:6px">🤖 ভাবছি...</div>';
  msgs.scrollTop=msgs.scrollHeight;
  const apiKey=localStorage.getItem('nt-ai-key')||'';
  if(!apiKey){document.getElementById(tid).textContent='❌ Admin → AI Config এ API Key দিন।';return;}
  try{
    const ctx='ব্যবসার ডেটা: বিক্রয়='+Object.values(allSales||{}).length+'টি, কর্মী='+Object.keys(allUsers||{}).length+'জন। প্রশ্ন: '+msg;
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:[{role:'user',content:ctx}]})
    });
    const data=await res.json();
    const reply=data.content?.[0]?.text||'উত্তর পাওয়া যায়নি';
    const el=document.getElementById(tid);
    if(el)el.innerHTML='<span style="color:var(--accent);font-weight:600">🤖 AI:</span> '+reply.replace(/\n/g,'<br>');
  }catch(e){const el=document.getElementById(tid);if(el)el.textContent='❌ সমস্যা: '+e.message;}
  msgs.scrollTop=msgs.scrollHeight;
};

// ✅ FIX: switchFolderTab duplicate removed — original at line ~1904 is used
