import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set, push, get, onValue, update, remove, runTransaction, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ══════════════════════════════════════════════════
//  NovaTEch BD — App Engine v4.1
//  Firebase + Push + Live GPS + Offline Sync
// ══════════════════════════════════════════════════

// ✅ Production console সুরক্ষা — sensitive info leak বন্ধ
(function(){
  const _origLog=console.log,_origWarn=console.warn,_origInfo=console.info;
  const _filter=args=>args.map(a=>{
    if(typeof a==='string'&&(a.includes('sk-ant-')||a.includes('AIza')||a.includes('apiKey')))
      return '[HIDDEN]';
    return a;
  });
  console.log=(...a)=>_origLog(..._filter(a));
  console.warn=(...a)=>_origWarn(..._filter(a));
  console.info=(...a)=>_origInfo(..._filter(a));
})();

// ✅ utils.js থেকে san, validateImage, validateDoc, validateMultiDocs, checkPhone লোড হয়
// window.san / window.validateImage / window.validateDoc ইত্যাদি ব্যবহার করা হচ্ছে
// ✅ utils.js fallback — utils.js load না হলেও কাজ করবে
const san = (str) => {
  if(window.san) return window.san(str);
  if(str==null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
};
const validateImage = (f) => window.validateImage ? window.validateImage(f) : true;
const validateDoc = (f) => window.validateDoc ? window.validateDoc(f) : true;
const validateMultiDocs = (f) => window.validateMultiDocs ? window.validateMultiDocs(f) : true;

// [imports moved to top]

// ✅ FCM VAPID Key — import এর পরে
window._fcmVapidKey = 'BJZOWoD-PFRtGEPsh42RtzH3IjO8n3fPRTiHt0othEkV77DJiGoXY4QMzw0Gu3GchoVUDRNe8If_ckE8Nd1e2Ss';

const FC={apiKey:"AIzaSyAHdK7zelJcBFc8fOFSgH8G_6jEjZdNoSI",authDomain:"novatech-bd-10421.firebaseapp.com",databaseURL:"https://novatech-bd-10421-default-rtdb.firebaseio.com",projectId:"novatech-bd-10421",storageBucket:"novatech-bd-10421.firebasestorage.app",messagingSenderId:"1098950143887",appId:"1:1098950143887:web:bb7014007540c878b165fa"};
const app=initializeApp(FC);
const auth=getAuth(app);
const db=getDatabase(app);
// const storage = removed (Cloudinary ব্যবহার করা হচ্ছে)
window._firebaseDB=db; // analytics.js এর জন্য

// ══════════════════════════════════════════════════
//  FILE UPLOAD FUNCTIONS
// ══════════════════════════════════════════════════
const DRIVE_URL="https://script.google.com/macros/s/AKfycbxWsrApHOr-OkTV-i6VrVfDYQz-KM-yZWA45DDt3pTLvDPs_UpoYyYhF5fWLP0UqopJ/exec";

// ✅ Cloudinary — বিনামূল্যে ছবি আপলোড
const CLOUDINARY_CLOUD = 'dp4toadml';
const CLOUDINARY_PRESET = 'novatech_upload';

// ✅ File validation → utils.js এ আছে (window.validateImage / validateDoc / validateMultiDocs)

async function uploadImageToFirebase(file, path){
  if (!validateImage(file)) return null; // ✅ validation
  try {
    // Cloudinary Unsigned Upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    formData.append('folder', 'novatech/' + path);

    showToast('ছবি আপলোড হচ্ছে...');
    const resp = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      { method: 'POST', body: formData }
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.secure_url) {
      return data.secure_url;
    }
    throw new Error(data.error?.message || 'Unknown error');
  } catch(e) {
    console.error('Cloudinary upload error:', e.message);
    showToast('ছবি আপলোড ব্যর্থ: ' + e.message, true);
    return null;
  }
}
async function uploadDocToDrive(file){
  if (!validateDoc(file)) return null; // ✅ validation
  try{
    showToast('আপলোড হচ্ছে...');
    const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file);});
    const resp=await fetch(DRIVE_URL,{method:'POST',body:JSON.stringify({file:base64,mimeType:file.type,fileName:file.name})});
    const data=await resp.json();
    if(data.success){
      showToast('ডকুমেন্ট আপলোড সফল ✓');
      // ✅ fileId সেভ করি যাতে পরে মুছতে পারি
      return {url:data.url, fileId:data.fileId||null};
    }
    showToast('আপলোড ব্যর্থ',true);return null;
  }catch(e){showToast('আপলোড ব্যর্থ: '+e.message,true);return null;}
}
// কর্মীর ছবি preview
window.previewWorkerPhoto=(input)=>{
  const file=input.files[0];if(!file)return;
  if (!validateImage(file)) { input.value=''; return; } // ✅ validation
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
  const newFiles=Array.from(input.files);
  // ✅ নতুন ফাইল + আগেরগুলো মিলিয়ে মোট validation
  const allFiles=[...window._pendingWorkerDocs, ...newFiles];
  if(!validateMultiDocs(allFiles)){ input.value=''; return; }
  newFiles.forEach(f=>{ window._pendingWorkerDocs.push(f); });
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
  if (!validateImage(file)) { input.value=''; return; } // ✅ validation
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
  if (!validateImage(file)) { input.value=''; return; } // ✅ validation
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
  if (!validateImage(file)) { input.value=''; return; } // ✅ validation
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
  if (!validateDoc(file)) { input.value=''; return; } // ✅ validation
  const result=await uploadDocToDrive(file);
  if(result){
    const docUrl = typeof result==='object' ? result.url : result;
    await push(ref(db,'documents/'+(uid||CU.uid)),{name:file.name,url:docUrl,type:file.type,uploadedBy:CN,ts:Date.now()});
    showToast('ডকুমেন্ট সংরক্ষিত ✓');
  }
};

let CU=null,CR=null,CN=null;
let allSales={},allExpenses={},allPaymentLogs={},allProducts={},allUsers={},allAllowances={},allCustomers={},allRoutes={},allRouteRequests={},allStock={},allStockAssign={},allAttendance={},allLeaves={},allSalaries={},allCommConfig={},allNotices={},allTeams={},allSMSConfig={},allDeleteRequests={},allWorkerStatus={},allPhoneEditRequests={};
let filterMode='today',payShop=null,activeRouteId=null,routeFilter='all',currentOTId=null;
let pendingSaleData=null,pendingOTP=null,pendingSaleId=null,pendingOTPExpiry=0;
const _unsubs = []; // ✅ Firebase listener cleanup — logout এ সব বন্ধ হবে

// ✅ Sales Cache — allSales বদলালে একবার compute করি
let _sc = {
  arr: [],          // সব বিক্রয় array
  byShop: {},       // shopId → [sales]
  byUid: {},        // uid → [sales]
  byDate: {},       // date → [sales]
  dueByShop: {},    // shopName → total due
  totalByShop: {},  // shopId → total sale amount
  thisMonth: [],    // এই মাসের বিক্রয়
  today: [],        // আজকের বিক্রয়
};

function computeSalesCache() {
  const now = new Date();
  const todayStr = new Date().toISOString().split('T')[0];
  const curMonth = now.getMonth(), curYear = now.getFullYear();

  _sc.arr = Object.entries(allSales).map(([id,s]) => ({...s, _id:id}));
  _sc.byShop = {};
  _sc.byUid = {};
  _sc.byDate = {};
  _sc.dueByShop = {};
  _sc.totalByShop = {};
  _sc.thisMonth = [];
  _sc.today = [];

  _sc.arr.forEach(s => {
    // by shopId
    if (s.shopId) {
      if (!_sc.byShop[s.shopId]) _sc.byShop[s.shopId] = [];
      _sc.byShop[s.shopId].push(s);
    }
    // by uid
    if (s.uid) {
      if (!_sc.byUid[s.uid]) _sc.byUid[s.uid] = [];
      _sc.byUid[s.uid].push(s);
    }
    // by date
    if (s.date) {
      if (!_sc.byDate[s.date]) _sc.byDate[s.date] = [];
      _sc.byDate[s.date].push(s);
    }
    // due by shop name
    if (s.due > 0) {
      _sc.dueByShop[s.shop] = (_sc.dueByShop[s.shop]||0) + s.due;
    }
    // total by shopId
    if (s.shopId) {
      _sc.totalByShop[s.shopId] = (_sc.totalByShop[s.shopId]||0) + (s.total||0);
    }
    // this month
    if (s.date) {
      const d = new Date(s.date);
      if (d.getMonth()===curMonth && d.getFullYear()===curYear) _sc.thisMonth.push(s);
    }
    // today
    if (s.date === todayStr) _sc.today.push(s);
  });
}

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
window.doLogout=async()=>{
  // ✅ সব Firebase listener বন্ধ করি
  _unsubs.forEach(fn => { try{ fn(); }catch(e){} });
  _unsubs.length = 0;
  // ✅ সব data reset করি
  allSales={};allExpenses={};allPaymentLogs={};allProducts={};allUsers={};
  allAllowances={};allCustomers={};allRoutes={};allAttendance={};allLeaves={};
  allSalaries={};allNotices={};allTeams={};allSMSConfig={};allDeleteRequests={};
  allWorkerStatus={};allPhoneEditRequests={};
  CU=null;CR=null;CN=null;
  await signOut(auth);
};
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
  // ✅ লাভ কার্ড লুকালে বিক্রয় কার্ড full width নেবে
  const saleCard = document.querySelector('.sum-card.c-sale');
  if(saleCard) saleCard.style.gridColumn = CR==='admin' ? '' : '1 / -1';
  // ✅ পুরানো cached key সাফ করি
  localStorage.removeItem('nt-ai-key');
  delete window._ntAIKey;
  buildNav();
  // Set default dates
  [$('sDate'),$('eDate'),$('stDate'),$('leaveFrom'),$('leaveTo'),$('otDate')].forEach(el=>{if(el)el.value=today();});
  initShiftPreview();
  // Worker এর জন্য কর্মী তৈরি ফর্ম লুকাও
  const cuForm=$('createUserForm');
  if(cuForm&&CR==='worker')cuForm.style.display='none';
  loadDriveConfig();
  // AI Config লোড — শুধু Admin, key window-এ রাখা হবে না
  if(CR==='admin'){
    get(ref(db,'aiConfig')).then(snap=>{
      if(!snap.exists())return;
      const d=snap.val();
      const key=d.apiKey||d.anthropicApiKey||'';
      const el=$('anthropicApiKey');
      if(el&&key)el.value='•'.repeat(Math.min(key.length,20)); // masked দেখাই
      const status=$('aiConfigStatus');
      if(status&&key)status.innerHTML='<div style="font-size:11px;color:var(--green);margin-top:6px">✅ সংরক্ষিত আছে · Claude AI সক্রিয়</div>';
      // ✅ key window-এ রাখি না — শুধু 'ready' signal
      window._ntAIReady=true;
    });
  }

  // ✅ সব listener unsubscribe function রাখি — logout এ বন্ধ করব
  _unsubs.push(
    // ✅ ROLE-BASED QUERY: Worker শুধু নিজের sales পাবে, Admin/Manager সব পাবে
    onValue(
      CR==='worker'
        ? query(ref(db,'sales'), orderByChild('uid'), equalTo(CU.uid))
        : ref(db,'sales'),
      s=>{
        allSales=s.val()||{};
        computeSalesCache();syncGlobals();refreshDash();renderSaleList();renderDue();
        if(CR==='admin')renderReport();
        renderProfile();
        if(CR==='worker'&&typeof window._wdSetPeriod==='function'){
          clearTimeout(window._wdDueTimer);
          window._wdDueTimer=setTimeout(()=>window._wdSetPeriod(window._wdPeriod||'1'),300);
        }
        if(typeof window.drawDashboardCharts==='function') setTimeout(window.drawDashboardCharts,200);
      }
    ),
    // ✅ ROLE-BASED QUERY: Worker শুধু নিজের expenses পাবে
    onValue(
      CR==='worker'
        ? query(ref(db,'expenses'), orderByChild('uid'), equalTo(CU.uid))
        : ref(db,'expenses'),
      s=>{allExpenses=s.val()||{};refreshDash();renderExpList();if(CR==='admin')renderReport();}
    ),
    onValue(ref(db,'products'),s=>{allProducts=s.val()||{};loadProductSelects();if(CR==='admin')renderProdChips();}),
    onValue(ref(db,'users'),s=>{allUsers=s.val()||{};window.allUsers=allUsers;syncGlobals();if(CR==='admin'||CR==='manager')renderUserList();loadAllWorkerSelects();}),
    onValue(ref(db,'allowances'),s=>{allAllowances=s.val()||{};renderMyAllowance();if(CR!=='worker')renderAllowList();}),
    onValue(ref(db,'customers'),s=>{allCustomers=s.val()||{};window.allCustomers=allCustomers;renderCustomers();loadCustomerSelect();loadBroadcastRoutes();}),
    onValue(ref(db,'routes'),s=>{allRoutes=s.val()||{};renderRouteChips();loadRouteSelects();renderVisitList();}),
    onValue(ref(db,'stock'),s=>{allStock=s.val()||{};renderStock();}),
    onValue(ref(db,'stockAssign'),s=>{allStockAssign=s.val()||{};renderStock();}),
    onValue(ref(db,'attendance'),s=>{allAttendance=s.val()||{};renderAttendance();checkLateAlert();}),
    onValue(ref(db,'leaves'),s=>{allLeaves=s.val()||{};renderLeaves();}),
    onValue(ref(db,'paymentLogs'),s=>{allPaymentLogs=s.val()||{};window.allPaymentLogs=allPaymentLogs;}),
    onValue(ref(db,'salaries'),s=>{allSalaries=s.val()||{};renderSalary();}),
    onValue(ref(db,'commConfig'),s=>{allCommConfig=s.val()||getDefaultSlabs();renderCommSlabs();renderSalary();}),
    onValue(ref(db,'notices'),s=>{allNotices=s.val()||{};renderNoticeBoard();}),
    onValue(ref(db,'teams'),s=>{allTeams=s.val()||{};renderTeams();}),
    onValue(ref(db,'smsConfig'),s=>{allSMSConfig=s.val()||{};loadSMSConfig();}),
    onValue(ref(db,'routeRequests'),s=>{allRouteRequests=s.val()||{};renderRouteRequests();}),
    onValue(ref(db,'deleteRequests'),s=>{
      allDeleteRequests=s.val()||{};
      if(CR==='admin') renderDeleteRequests();
    }),
    onValue(ref(db,'custEditRequests'),s=>{
      allPhoneEditRequests=s.val()||{};
      if(CR==='admin'||CR==='manager') renderPhoneEditRequests();
    }),
    onValue(ref(db,'workerStatus'),s=>{
      allWorkerStatus=s.val()||{};
      if(CR==='admin'||CR==='manager') renderWorkerRouteStatus();
    })
  );

  loader(false);
  // ✅ লগিন করলে প্রথমে প্রোফাইল দেখাবে
  showPage('profile');
  setActiveTab('profile');

  // ✅ features.js এর জন্য সব global expose করি
  syncGlobals();

  // ✅ FIX: AI Auto Engine - login এর সময় key থাকলে সাথে সাথে চালু হবে
  setTimeout(()=>{
    if(typeof window.startAIAutoEngine==='function') window.startAIAutoEngine();
  }, 2500);

  // ✅ Eruda — index.html এ page load এর সাথেই load হয়

  // ✅ নতুন ফিচার সক্রিয় করি
  initFCMPushNotification();
  initOfflineSync();
  if(CR==='worker') initLiveGPS();

  // ✅ মাসিক সতর্কতা — শুধু Admin
  if(CR==='admin') setTimeout(checkMonthlyAlerts, 1500);
}

// ════════════════════════════════════════════════════════════
// ✅ FEATURE 1: IN-APP NOTIFICATION SYSTEM
//    Firebase Realtime Database listener দিয়ে
//    Spark (Free) plan-এ সম্পূর্ণ কাজ করে
// ════════════════════════════════════════════════════════════
let _fcmMessaging = null;
let _lastNotifTs = Date.now(); // শুধু নতুন notification দেখাই

async function initFCMPushNotification() {
  try {
    if (!CU?.uid) return;

    // ✅ Firebase Database-এ নিজের notification path listen করি
    // ✅ BUG-03 FIX
    const _notifUnsub = onValue(ref(db, 'notifications/' + CU.uid), snap => {
      const data = snap.val();
      if (!data) return;

      // সব notification loop করি
      Object.entries(data).forEach(([id, notif]) => {
        // পুরানো notification skip করি
        if (!notif || notif.ts < _lastNotifTs) return;
        if (notif.read) return;

        // ✅ In-app notification দেখাই
        showInAppNotification(notif.title, notif.body, notif.page || 'dash');

        // ✅ Browser Push Notification (অ্যাপ background-এ থাকলে)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notif.title || 'NovaTEch BD 📒', {
            body: notif.body || '',
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            tag: 'novatech-' + id,
          });
        }

        // Read mark করি
        update(ref(db, 'notifications/' + CU.uid + '/' + id), { read: true });
      });
    });
    _unsubs.push(_notifUnsub); // ✅ BUG-03 FIX

    // ✅ Browser notification permission চাই
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(async () => {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') showToast('🔔 Notification চালু হয়েছে');
      }, 3000);
    }

    console.log('✅ In-app Notification সক্রিয়');
  } catch(e) { console.warn('Notification init error:', e.message); }
}

// ── In-app notification banner
function showInAppNotification(title, body, page) {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position:fixed;top:60px;left:50%;transform:translateX(-50%) translateY(-20px);
    background:var(--card);border:1px solid var(--accent);border-radius:14px;
    padding:13px 16px;z-index:999;max-width:360px;width:90%;
    box-shadow:0 8px 32px rgba(0,0,0,.5);
    opacity:0;transition:all .3s ease;cursor:pointer;
  `;
  banner.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <div style="font-size:22px;flex-shrink:0;">🔔</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;color:var(--accent);">${title || 'NovaTEch BD'}</div>
        <div style="font-size:12px;color:var(--text);margin-top:3px;">${body || ''}</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()"
        style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;flex-shrink:0;padding:0;">✕</button>
    </div>`;
  banner.onclick = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (page && typeof showPage === 'function') { showPage(page); setActiveTab(page); }
    banner.remove();
  };
  document.body.appendChild(banner);
  // Animate in
  requestAnimationFrame(() => {
    banner.style.opacity = '1';
    banner.style.transform = 'translateX(-50%) translateY(0)';
  });
  // Auto remove
  setTimeout(() => {
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 300);
  }, 5000);
}
window.showInAppNotification = showInAppNotification;

// ✅ Notification পাঠানোর ফাংশন — যেকোনো user-কে
window.sendNotificationTo = async function(uid, title, body, page = 'dash') {
  if (!uid) return;
  try {
    await push(ref(db, 'notifications/' + uid), {
      title, body, page,
      from: CN, fromUid: CU.uid,
      ts: Date.now(), read: false
    });
  } catch(e) { console.warn('Send notification error:', e.message); }
};

// ✅ সবাইকে বা role অনুযায়ী notification
window.sendNotificationToRole = async function(role, title, body, page = 'dash') {
  const targets = Object.entries(allUsers || {})
    .filter(([uid, u]) => (role === 'all' || u.role === role) && uid !== CU.uid);
  for (const [uid] of targets) {
    await window.sendNotificationTo(uid, title, body, page);
  }
};

// ✅ পুরানো sendPushToWorker compat
window.sendPushToWorker = async function(uid, title, body, page = 'dash') {
  await window.sendNotificationTo(uid, title, body, page);
  showToast('✅ Notification পাঠানো হয়েছে');
};

// ════════════════════════════════════════════════════════════
// ✅ FEATURE 2: LIVE GPS TRACKING (কর্মীদের জন্য)
// ════════════════════════════════════════════════════════════
let _gpsWatchId = null;
let _gpsLastLog = 0;
const GPS_INTERVAL_MS = 2 * 60 * 1000; // প্রতি ২ মিনিট — আরো accurate

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
  if (CU?.uid) set(ref(db, 'liveLocations/' + CU.uid + '/online'), false).catch(()=>{});
};
window.cleanOldGPSTrail = async () => {
  if (CR !== 'admin') return;
  if (!confirm('৩০ দিনের পুরনো GPS Trail মুছবেন?')) return;
  try {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const snap = await get(ref(db, 'gpsTrail'));
    if (!snap.exists()) { showToast('কোনো trail নেই'); return; }
    const updates = {}; let deleted = 0;
    snap.forEach(u => { u.forEach(d => { if (new Date(d.key.replace(/_/g,'-')) < cutoff) { updates['gpsTrail/'+u.key+'/'+d.key]=null; deleted++; } }); });
    if (deleted > 0) { await update(ref(db), updates); showToast(`✅ ${deleted}টি পুরনো GPS Trail মুছা হয়েছে`); }
    else showToast('৩০ দিনের পুরনো কোনো trail নেই');
  } catch(e) { showToast('সমস্যা: '+e.message, true); }
};

// Manager/Admin-এর জন্য লাইভ ম্যাপ
let _liveMapListener = null;
window.renderLiveMap = function() {
  const el = document.getElementById('liveMapContainer');
  if (!el) return;

  // পুরানো listener বন্ধ করি
  if (_liveMapListener) { _liveMapListener(); _liveMapListener = null; }

  // ✅ Real-time listener
  _liveMapListener = onValue(ref(db, 'liveLocations'), snap => {
    const locs = snap.val() || {};
    const now = Date.now();

    // Manager হলে শুধু তার টিমের কর্মী
    let entries = Object.entries(locs).filter(([uid]) => uid !== CU?.uid);
    if (CR === 'manager') {
      const myTeam = Object.values(allTeams||{}).find(t => t.leaderId === CU?.uid);
      const members = new Set(myTeam?.members || []);
      if (members.size) entries = entries.filter(([uid]) => members.has(uid));
    }

    if (!entries.length) {
      el.innerHTML = `<div style="text-align:center;padding:24px 16px;color:var(--muted);">
        <div style="font-size:32px;margin-bottom:8px;">📡</div>
        <div style="font-size:13px;">কোনো কর্মী এখন অনলাইন নেই</div>
        <div style="font-size:11px;margin-top:4px;opacity:.6;">কর্মীদের app চালু থাকলে এখানে দেখাবে</div>
      </div>`;
      return;
    }

    // ✅ Sort — সবচেয়ে সাম্প্রতিক আগে
    entries.sort((a,b) => (b[1].ts||0) - (a[1].ts||0));

    el.innerHTML = entries.map(([uid, d]) => {
      const minsAgo = Math.round((now - (d.ts||now)) / 60000);
      const isOnline = minsAgo < 10; // ১০ মিনিটের মধ্যে = অনলাইন
      const isRecent = minsAgo < 30;
      const mapUrl = `https://www.google.com/maps?q=${d.lat},${d.lng}&zoom=16`;
      const wazeUrl = `https://waze.com/ul?ll=${d.lat},${d.lng}&navigate=yes`;
      const statusColor = isOnline ? 'var(--green)' : isRecent ? 'var(--accent)' : 'var(--muted)';
      const statusText = isOnline ? '● অনলাইন' : minsAgo < 60 ? `${minsAgo} মিনিট আগে` : `${Math.round(minsAgo/60)} ঘণ্টা আগে`;

      return `<div style="background:var(--card);border:1px solid ${isOnline?'rgba(16,185,129,.3)':'var(--border-l)'};
          border-radius:12px;padding:12px;margin-bottom:8px;
          ${isOnline?'box-shadow:0 0 0 1px rgba(16,185,129,.1);':''}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <!-- Avatar -->
          <div style="width:38px;height:38px;border-radius:50%;
            background:linear-gradient(135deg,var(--primary),var(--blue));
            display:flex;align-items:center;justify-content:center;
            font-size:16px;flex-shrink:0;position:relative;">
            👷
            <div style="position:absolute;bottom:0;right:0;width:10px;height:10px;
              background:${statusColor};border-radius:50%;border:2px solid var(--card);"></div>
          </div>
          <!-- Info -->
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:var(--text);">${d.name||'–'}</div>
            <div style="font-size:10px;color:${statusColor};font-weight:600;">${statusText}</div>
          </div>
          <!-- Accuracy badge -->
          <div style="font-size:9px;color:var(--muted);background:var(--surface);
            padding:2px 7px;border-radius:6px;border:1px solid var(--border);">
            ±${d.accuracy||'?'}m
          </div>
        </div>

        <!-- Coordinates -->
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;
          background:var(--surface);border-radius:7px;padding:6px 8px;">
          📍 ${d.lat?.toFixed(5)||'–'}, ${d.lng?.toFixed(5)||'–'}
          ${d.date ? `· ${d.date}` : ''}
        </div>

        <!-- Action buttons -->
        <div style="display:flex;gap:6px;">
          <a href="${mapUrl}" target="_blank"
            style="flex:1;padding:7px;background:rgba(59,130,246,.12);border:1px solid var(--blue);
            border-radius:8px;color:var(--blue);font-size:11px;font-weight:700;
            text-decoration:none;text-align:center;">
            🗺️ Google Maps
          </a>
          <a href="${wazeUrl}" target="_blank"
            style="flex:1;padding:7px;background:rgba(139,92,246,.12);border:1px solid var(--purple);
            border-radius:8px;color:var(--purple);font-size:11px;font-weight:700;
            text-decoration:none;text-align:center;">
            🚗 Waze
          </a>
          <button onclick="showGPSTrail('${uid}','${d.name||''}')"
            style="flex:1;padding:7px;background:rgba(245,158,11,.12);border:1px solid var(--accent);
            border-radius:8px;color:var(--accent);font-size:11px;font-weight:700;
            cursor:pointer;font-family:inherit;">
            📈 Trail
          </button>
        </div>
      </div>`;
    }).join('');
  });
};

// ✅ কর্মীর আজকের GPS trail দেখানো
window.showGPSTrail = async function(uid, name) {
  const todayKey = today().replace(/-/g,'_');
  const snap = await get(ref(db, `gpsTrail/${uid}/${todayKey}`));
  if (!snap.exists()) { showToast('আজকের trail নেই',true); return; }
  const trail = Object.values(snap.val()).sort((a,b)=>a.ts-b.ts);

  // Google Maps directions URL বানাই
  if (trail.length === 1) {
    window.open(`https://www.google.com/maps?q=${trail[0].lat},${trail[0].lng}`,'_blank');
    return;
  }
  const origin = `${trail[0].lat},${trail[0].lng}`;
  const dest   = `${trail[trail.length-1].lat},${trail[trail.length-1].lng}`;
  const waypoints = trail.slice(1,-1).slice(0,8) // max 8 waypoints
    .map(p=>`${p.lat},${p.lng}`).join('|');
  const url = `https://www.google.com/maps/dir/${origin}/${waypoints?waypoints+'/':''}${dest}`;
  window.open(url,'_blank');
  showToast(`${name} — ${trail.length}টি location point`);
};

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
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pendingSales'))
        db.createObjectStore('pendingSales', { keyPath: 'localId' });
      if (!db.objectStoreNames.contains('pendingExpenses'))
        db.createObjectStore('pendingExpenses', { keyPath: 'localId' });
      // ✅ synced store — duplicate check-এর জন্য
      if (!db.objectStoreNames.contains('syncedIds'))
        db.createObjectStore('syncedIds', { keyPath: 'id' });
    };
    req.onsuccess = e => { _offlineDB = e.target.result; resolve(_offlineDB); };
    req.onerror = () => reject(req.error);
  });
}

async function saveToOfflineQueue(store, data) {
  const db = await getOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put({ ...data, _savedAt: Date.now() });
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

// ✅ synced id check — duplicate বন্ধ করতে
async function isAlreadySynced(localId) {
  const db = await getOfflineDB();
  return new Promise(resolve => {
    const tx = db.transaction('syncedIds', 'readonly');
    const req = tx.objectStore('syncedIds').get(String(localId));
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => resolve(false);
  });
}
async function markAsSynced(localId) {
  const db = await getOfflineDB();
  return new Promise(resolve => {
    const tx = db.transaction('syncedIds', 'readwrite');
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
  showToast('📵 অফলাইনে সেভ হয়েছে — নেট ফিরলে সিঙ্ক হবে');
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
  showToast('📵 অফলাইনে সেভ হয়েছে — নেট ফিরলে সিঙ্ক হবে');
};

// ✅ নেট ফিরলে বিক্রয় sync — duplicate বন্ধ
async function syncOfflineSales() {
  if (!navigator.onLine || !CU?.uid) return;
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
        let _count = 1;
        await runTransaction(ref(db,'invoiceCounter'),(cur)=>{_count=(cur||0)+1;return _count;});
        const properInvoiceNo = `NTB-${_year}-${String(_count).padStart(4,'0')}`;

        await push(ref(db, 'sales'), {
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
    if (synced > 0) showToast(`✅ ${synced}টি অফলাইন বিক্রয় সিঙ্ক হয়েছে`);
  } catch(e) { console.warn('Offline sync error:', e.message); }
}
window.syncOfflineSales = syncOfflineSales;

// ✅ নেট ফিরলে খরচ sync
async function syncOfflineExpenses() {
  if (!navigator.onLine || !CU?.uid) return;
  try {
    const pending = await getAllOfflineItems('pendingExpenses');
    if (!pending.length) return;
    let synced = 0;
    for (const exp of pending) {
      const { localId, _savedAt, _isOffline, ...expData } = exp;
      const alreadySynced = await isAlreadySynced(localId);
      if (alreadySynced) continue;
      try {
        await push(ref(db, 'expenses'), { ...expData, syncedAt: Date.now() });
        await markAsSynced(localId);
        synced++;
      } catch(e) {
        console.warn('Expense sync error:', e.message);
      }
    }
    await clearOfflineStore('pendingExpenses');
    await updateOfflineBadge();
    if (synced > 0) showToast(`✅ ${synced}টি অফলাইন খরচ সিঙ্ক হয়েছে`);
  } catch(e) { console.warn('Offline expense sync error:', e.message); }
}
window.syncOfflineExpenses = syncOfflineExpenses;

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

  // ══ Drawer মেনু সংজ্ঞা — গ্রুপ করা ══
  const drawerSections = [
    // ── গ্রুপ ১: বিক্রয় ও কাস্টমার
    {
      sectionTitle: '🛍 বিক্রয় ও কাস্টমার',
      items: [
        { ico:'🏪', lbl:'কাস্টমার', page:'cust', r:['admin','manager','worker'] },
        { ico:'🗺️', lbl:'রুট', page:'route', r:['admin','manager','worker'] },
        { ico:'🏦', lbl:'বাকি', page:'due', r:['admin','manager','worker'] },
        { ico:'🛒', lbl:'অর্ডার', page:'order', r:['worker','manager','admin'] },
      ]
    },
    // ── গ্রুপ ২: স্টক ও খরচ
    {
      sectionTitle: '📦 স্টক ও খরচ',
      items: [
        { ico:'📦', lbl:'স্টক', page:'stock', r:['admin','manager','worker'] },
        { ico:'💸', lbl:'খরচ', page:'exp', r:['admin','manager','worker'] },
      ]
    },
    // ── গ্রুপ ৩: কর্মী ব্যবস্থাপনা
    {
      sectionTitle: '👷 কর্মী ব্যবস্থাপনা',
      items: [
        { ico:'⏰', lbl:'উপস্থিতি', page:'att', r:['admin','manager','worker'] },
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
      ]
    },
    // ── গ্রুপ ৪: রিপোর্ট ও যোগাযোগ
    {
      sectionTitle: '📊 রিপোর্ট ও যোগাযোগ',
      items: [
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
        { ico:'📢', lbl:'নোটিশ', page:'notice', r:['admin','manager'] },
        { ico:'📋', lbl:'টাস্ক', page:'tasks', r:['worker','manager','admin'] },
        { ico:'💬', lbl:'চ্যাট', page:'chat', r:['worker','manager','admin'] },
      ]
    },
    // ── গ্রুপ ৫: সিস্টেম (Admin only)
    {
      sectionTitle: '⚙️ সিস্টেম',
      items: [
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
      ]
    },
  ];

  // সব item flat list বানাই — index tracking এর জন্য
  const allVisible = [];
  drawerSections.forEach(sec => {
    sec.items.filter(g => !g.r || g.r.includes(CR)).forEach(g => allVisible.push(g));
  });
  window._drawerGroups = allVisible;

  // Drawer রেন্ডার — section header সহ
  const grid = $('drawerGrid');
  if (!grid) return;

  let html = '';
  let globalIdx = 0;
  drawerSections.forEach(sec => {
    const secItems = sec.items.filter(g => !g.r || g.r.includes(CR));
    if (!secItems.length) return;

    // Section header
    html += `<div style="
      grid-column:1/-1;
      font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
      color:var(--muted);padding:10px 2px 4px;
      border-top:1px solid var(--border);margin-top:2px;
    ">${sec.sectionTitle}</div>`;

    // Items
    secItems.forEach(g => {
      const idx = globalIdx++;
      const hasSub = !!g.sub;
      const _chatBadge = g.page==='chat' ? `<span id="drawerChatBadge" style="position:absolute;top:4px;right:4px;background:var(--red);color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:100px;padding:0 4px;display:none;align-items:center;justify-content:center;"></span>` : '';
      html += `<div class="drawer-item${hasSub?' has-sub':''}" id="ditem-${idx}" style="position:relative;"
        onclick="${hasSub ? `openSubMenu(${idx})` : `navTo('${g.page}');closeDrawer()`}"
      >
        <span class="di-ico">${g.ico}</span>
        <span class="di-lbl">${g.lbl}${hasSub?'<br><span style="font-size:9px;opacity:.5">▾</span>':''}</span>
        ${_chatBadge}
      </div>`;
    });
  });

  grid.innerHTML = html;
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
  // features.js page গুলো inject হওয়ার আগে div না থাকলে retry করি
  const pg = document.getElementById('page-'+page);
  if(!pg && (page==='order'||page==='tasks'||page==='chat')) {
    // features.js এখনো inject করেনি — ৫০০ms পরে retry
    if(typeof injectFeaturesIfNeeded==='function') injectFeaturesIfNeeded();
    setTimeout(()=>{ showPage(page); setActiveTab(page); }, 500);
    return;
  }
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
  const tabMap = {
    dash:'bnav-dash', sale:'bnav-sale', due:'bnav-due', profile:'bnav-profile'
  };
  // ✅ "আরো" মেনু থেকে যাওয়া সব page
  const morePages = ['cust','route','stock','exp','att','salary','teams','allow',
    'report','notice','tasks','order','chat','ledger','admin','folders',
    'enterprise','archive','hr','commissions'];

  const btnId = tabMap[page];
  if (btnId) {
    $(btnId)?.classList.add('active');
  } else if (morePages.includes(page)) {
    $('bnav-more')?.classList.add('active');
  }
};

// ✅ Page History — Back বাটনের জন্য
let _pageHistory = ['dash'];
let _currentPage = 'dash';

window.goBack = function() {
  if (_pageHistory.length > 1) {
    _pageHistory.pop();
    const prev = _pageHistory[_pageHistory.length - 1];
    showPage(prev, true);
  } else {
    showPage('dash', true);
  }
};

window.showPage=function(id, isBack){
  const restricted={
    'report':['admin','manager'],
    'admin':['admin'],
    'folders':['admin','manager'],
    'salary':['admin','manager'],
    'teams':['admin','manager'],
    'allow':['admin','manager'],
    'enterprise':['admin','manager'],
    'notice':['admin','manager'],
  };
  if(restricted[id]&&!restricted[id].includes(CR)){
    showToast('এই পেজ দেখার অনুমতি নেই!',true);
    id='dash';
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  $('page-'+id)?.classList.add('active');
  document.querySelector(`[data-page="${id}"]`)?.classList.add('active');
  // ✅ History tracking (isBack parameter via window flag)
  isBack = isBack || false;
  if (!isBack) {
    if (_pageHistory[_pageHistory.length-1] !== id) _pageHistory.push(id);
    if (_pageHistory.length > 20) _pageHistory.shift();
  }
  _currentPage = id;
  const backBtn = document.getElementById('globalBackBtn');
  if (backBtn) backBtn.style.display = (_pageHistory.length > 1) ? 'flex' : 'none';
  // Bottom tab active
  if(typeof setActiveTab==='function') setActiveTab(id);
  if(id==='report'){
    renderReport();
    // ✅ Chart retry — analytics.js লোড না হলে বারবার চেষ্টা করে
    let _chartRetry = 0;
    function _tryDrawCharts() {
      if (typeof drawSalesTrendChart === 'function' &&
          typeof drawTopProductsChart === 'function' &&
          typeof drawTopShopsChart === 'function') {
        drawSalesTrendChart();
        drawTopProductsChart();
        drawTopShopsChart();
        if(typeof refreshPL==='function') refreshPL();
      } else if (_chartRetry < 10) {
        _chartRetry++;
        setTimeout(_tryDrawCharts, 300);
      }
    }
    setTimeout(_tryDrawCharts, 400);
  }
  if(id==='enterprise'&&typeof window.renderEnterpriseDashboard==='function'){
    setTimeout(window.renderEnterpriseDashboard,300);
    setTimeout(()=>{if(typeof window.renderAIManager==='function')window.renderAIManager();},500);
  }
  if(id==='dash') {
    setTimeout(refreshDash, 100);
    // ✅ Dashboard charts
    let _dcRetry=0;
    function _tryDashCharts(){
      if(typeof window.drawDashboardCharts==='function') window.drawDashboardCharts();
      else if(_dcRetry<8){_dcRetry++;setTimeout(_tryDashCharts,400);}
    }
    setTimeout(_tryDashCharts,300);
  }
  if(id==='salary')renderSalary();
  if(id==='ledger'){setTimeout(()=>{window.setLedgerPeriod('month');},200);}
  if(id==='profile')renderProfile();
  if(id==='folders')renderFolderTab('workers');
  if(id==='att')renderAttendance();
  if(id==='teams')renderTeams();
  // ✅ Sale page — customer select refresh (route filter)
  if(id==='sale') setTimeout(loadCustomerSelect, 100);
  // ✅ Route page — worker status দেখাও
  if(id==='route') { renderVisitList(); if(CR!=='worker') renderWorkerRouteStatus(); }
  // ✅ FIX: Order page — customer ও product select load
  if(id==='order'){
    // customers ready কিনা check করে load করি
    const _loadOrder = ()=>{
      if(typeof window.ftLoadOrderSelects==='function') window.ftLoadOrderSelects();
      if(typeof window.ftRenderOrders==='function') window.ftRenderOrders();
    };
    if(Object.keys(window.allCustomers||{}).length > 0){
      setTimeout(_loadOrder, 100);
    } else {
      // data না থাকলে ১ সেকেন্ড অপেক্ষা করি
      setTimeout(_loadOrder, 1000);
    }
  }
  if(id==='tasks'){
    const _loadTasks = ()=>{
      if(typeof window.ftLoadWorkerSelects==='function') window.ftLoadWorkerSelects();
      if(typeof window.ftRenderTasks==='function') window.ftRenderTasks();
    };
    if(Object.keys(window.allUsers||{}).length > 0){
      setTimeout(_loadTasks, 100);
    } else {
      setTimeout(_loadTasks, 1000);
    }
  }
  // ✅ FIX: Chat page
  if(id==='chat'){
    setTimeout(()=>{ if(typeof window.ftRenderConvList==='function') window.ftRenderConvList(); },300);
    setTimeout(()=>{ if(typeof window._ftMarkAllRead==='function') window._ftMarkAllRead(); },600);
  }
  if(id==='notice'){
    // notice পেজ নেই — admin পেজের notice section-এ scroll করি
    setTimeout(()=>{
      const el=document.getElementById('noticeTitle');
      if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}
    },400);
  }
};

window.setFilter=(f,btn)=>{
  filterMode=f;
  document.querySelectorAll('#page-dash .fb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');refreshDash();
};

function getFilteredSales(){
  const now=new Date();
  // ✅ Cache থেকে শুরু — Object.values() call নেই
  const base = CR==='worker' ? (_sc.byUid[CU?.uid]||[]) : _sc.arr;
  if(filterMode==='today'){
    const td=today();
    return base.filter(s=>s.date===td);
  }
  if(filterMode==='week'){
    const st=new Date(now);st.setDate(now.getDate()-6);st.setHours(0,0,0,0);
    return base.filter(s=>new Date(s.date)>=st);
  }
  if(filterMode==='month'){
    const m=now.getMonth(),y=now.getFullYear();
    return base.filter(s=>{const d=new Date(s.date);return d.getMonth()===m&&d.getFullYear()===y;});
  }
  return base;
}

function refreshDash(){
  const sales=getFilteredSales();
  const now=new Date();
  const exps=Object.values(allExpenses).filter(e=>{
    // ✅ Worker শুধু নিজের খরচ দেখবে, manager/admin সব দেখবে
    if(CR==='worker' && e.uid!==CU.uid) return false;
    // ✅ সব filter mode সঠিকভাবে প্রয়োগ
    if(filterMode==='today') return e.date===today();
    if(filterMode==='week'){
      const d=new Date(e.date);
      const ws=new Date(now);ws.setDate(now.getDate()-6);ws.setHours(0,0,0,0);
      return d>=ws;
    }
    if(filterMode==='month'){
      const d=new Date(e.date);
      return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    }
    return true; // 'all'
  });

  const totalSale   = sales.reduce((s,i)=>s+(i.total||0),0);
  const totalProfit = CR==='admin' ? sales.reduce((s,i)=>s+(i.profit||0),0) : 0;
  const totalExp    = exps.reduce((s,i)=>s+(i.amount||0),0);
  // ✅ Cache থেকে due নেওয়া — loop নেই
  const totalDue = CR==='worker'
    ? (_sc.byUid[CU.uid]||[]).reduce((a,s)=>a+(s.due||0),0)
    : _sc.arr.reduce((a,s)=>a+(s.due||0),0);

  $('dSale').textContent   = bn(totalSale);
  $('dProfit').textContent = CR==='admin' ? bn(totalProfit) : '—';
  $('dExp').textContent    = bn(totalExp);
  $('dDue').textContent    = bn(totalDue);

  // ── Trend badge: আজ vs গতকাল তুলনা ──
  function _setTrend(elId, current, prev) {
    const el = $(elId); if(!el) return;
    if(!prev || prev === 0) { el.textContent='—'; el.className='sc-trend neu'; return; }
    const pct = ((current - prev) / prev * 100).toFixed(0);
    if(current > prev) {
      el.textContent = '▲ '+Math.abs(pct)+'%';
      el.className = 'sc-trend up';
    } else if(current < prev) {
      el.textContent = '▼ '+Math.abs(pct)+'%';
      el.className = 'sc-trend down';
    } else {
      el.textContent = '→ ০%';
      el.className = 'sc-trend neu';
    }
  }

  // গতকালের ডেটা
  const yd = new Date(); yd.setDate(yd.getDate()-1);
  const ydStr = yd.toISOString().split('T')[0];
  const ydSales = (_sc.byDate[ydStr]||[]).filter(s=>CR!=='worker'||s.uid===CU?.uid);
  const ydExps  = Object.values(allExpenses).filter(e=>e.date===ydStr&&(CR!=='worker'||e.uid===CU.uid));
  const ydSale   = ydSales.reduce((a,b)=>a+(b.total||0),0);
  const ydProfit = CR==='admin' ? ydSales.reduce((a,b)=>a+(b.profit||0),0) : 0;
  const ydExp    = ydExps.reduce((a,b)=>a+(b.amount||0),0);

  // filterMode=today হলে trend দেখাই, বাকিতে লুকাই
  if(filterMode==='today') {
    _setTrend('trendSale', totalSale, ydSale);
    if(CR==='admin') _setTrend('trendProfit', totalProfit, ydProfit);
    _setTrend('trendExp', totalExp, ydExp);
    ['trendDue'].forEach(id=>{const el=$(id);if(el){el.textContent='সব সময়';el.className='sc-trend neu';}});
  } else {
    ['trendSale','trendProfit','trendExp','trendDue'].forEach(id=>{
      const el=$(id);if(el){el.textContent='';el.className='sc-trend';}
    });
  }

  // Target
  renderMyTarget();
  if(activeRouteId&&allRoutes[activeRouteId]){
    const rc=Object.values(allCustomers).filter(c=>c.routeId===activeRouteId);
    const vi=(_sc.byUid[CU?.uid]||[]).filter(s=>s.date===today()&&s.routeId===activeRouteId).map(s=>s.shopId);
    $('activeRouteBanner').style.display='block';
    $('activeRouteName').textContent=allRoutes[activeRouteId].name;
    $('activeRouteVisits').textContent=rc.filter(c=>!vi.includes(c.id)).length;
  }
  const el=$('dashSales');
  const list=sales.slice(-6).reverse();
  el.innerHTML=list.length?list.map(s=>saleCard(s)).join(''):'<div class="empty"><div class="ic">📭</div>কোনো বিক্রয় নেই</div>';

  // ✅ Sparkline — retry যদি analytics.js এখনো লোড না হয়
  let _spRetry = 0;
  function _trySpark() {
    if(typeof window.drawSparklines==='function') {
      window.drawSparklines();
    } else if(_spRetry < 8) {
      _spRetry++;
      setTimeout(_trySpark, 400);
    }
  }
  setTimeout(_trySpark, 200);

  // ✅ মাসিক progress — Admin only
  if(CR==='admin') renderMonthProgress();
}

// ── মাসিক progress card
function renderMonthProgress(){
  const el=$('dashMonthProgress');if(!el)return;
  const now=new Date();
  const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastDay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const daysPassed=now.getDate();
  const daysLeft=lastDay-daysPassed;
  const monthPct=Math.round(daysPassed/lastDay*100);

  const mSales=Object.values(allSales).filter(s=>s.date?.startsWith(monthKey));
  const mExps=Object.values(allExpenses).filter(e=>e.date?.startsWith(monthKey));
  const mTotal=mSales.reduce((a,b)=>a+(b.total||0),0);
  const mExp=mExps.reduce((a,b)=>a+(b.amount||0),0);
  const mDue=_sc.arr.reduce((a,s)=>a+(s.due||0),0);
  const workerCount=Object.values(allUsers).filter(u=>u.role==='worker'||u.role==='manager').length;
  const attendedToday=Object.values(allAttendance).filter(a=>a.date===today()).length;

  el.style.display='block';
  el.innerHTML=`
    <div style="background:var(--card);border-radius:var(--r);padding:13px;
      border:1px solid var(--border-l);box-shadow:var(--shadow-sm);">

      <!-- মাসের progress bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:12px;font-weight:700;color:var(--text);">
          📅 ${now.toLocaleString('bn-BD',{month:'long'})} মাস
        </div>
        <div style="font-size:11px;color:var(--muted);">
          ${daysLeft===0?'<span style="color:var(--red);font-weight:700;">আজই শেষ দিন!</span>':daysLeft+' দিন বাকি'}
        </div>
      </div>
      <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden;margin-bottom:12px;">
        <div style="width:${monthPct}%;height:100%;
          background:linear-gradient(90deg,var(--blue),var(--accent));border-radius:4px;">
        </div>
      </div>

      <!-- Stats row -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;">
        <div style="text-align:center;background:var(--surface);border-radius:8px;padding:7px 4px;">
          <div style="font-size:13px;font-weight:700;color:var(--blue);">৳${mTotal>=1000?Math.round(mTotal/1000)+'K':Math.round(mTotal)}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px;">বিক্রয়</div>
        </div>
        <div style="text-align:center;background:var(--surface);border-radius:8px;padding:7px 4px;">
          <div style="font-size:13px;font-weight:700;color:var(--red);">৳${mExp>=1000?Math.round(mExp/1000)+'K':Math.round(mExp)}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px;">খরচ</div>
        </div>
        <div style="text-align:center;background:var(--surface);border-radius:8px;padding:7px 4px;">
          <div style="font-size:13px;font-weight:700;color:${mDue>0?'var(--red)':'var(--green)'};">৳${mDue>=1000?Math.round(mDue/1000)+'K':Math.round(mDue)}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px;">বাকি</div>
        </div>
        <div style="text-align:center;background:var(--surface);border-radius:8px;padding:7px 4px;">
          <div style="font-size:13px;font-weight:700;color:${attendedToday<workerCount?'var(--accent)':'var(--green)'};">${attendedToday}/${workerCount}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px;">উপস্থিত</div>
        </div>
      </div>

      <!-- মাস শেষ সতর্কতা -->
      ${daysLeft<=2?`<div style="margin-top:10px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);
        border-radius:8px;padding:8px 10px;font-size:11px;color:var(--accent);font-weight:600;">
        ⚠️ মাস শেষ হচ্ছে! বেতন ও রিপোর্টের কাজ সেরে নিন।
      </div>`:''}

    </div>`;
}

// TARGET
function renderMyTarget(){
  const sal=allSalaries[CU.uid];
  const target=sal?.monthlyTarget||0;
  if(!target)return;
  const now=new Date();
  const mySales=(_sc.byUid[CU?.uid]||[]).filter(s=>{const d=new Date(s.date);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});
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
  // ✅ Notification পাঠাই
  if (window.sendNotificationToRole) {
    const role = target==='worker'?'worker':target==='manager'?'manager':'all';
    window.sendNotificationToRole(role, '📢 ' + title, body, 'dash');
  }
  showToast('✅ নোটিশ পাঠানো হয়েছে');
};

// ✅ নোটিশ পেজ রেন্ডার
function renderNoticePage(){
  // Admin/Manager না হলে ফর্ম লুকাই
  const form=$('noticeCreateForm');
  if(form) form.style.display=(CR==='admin'||CR==='manager')?'block':'none';

  const list=$('noticePageList');
  if(!list)return;
  const now=Date.now();

  // মেয়াদ শেষগুলো মুছি
  Object.entries(allNotices).forEach(([id,n])=>{
    if(n.expiresAt&&n.expiresAt<now) remove(ref(db,'notices/'+id));
  });

  const canManage=(CR==='admin'||CR==='manager');
  const notices=Object.entries(allNotices)
    .filter(([,n])=>!(n.expiresAt&&n.expiresAt<now))
    .sort((a,b)=>b[1].ts-a[1].ts);

  if(!notices.length){
    list.innerHTML='<div class="empty"><div class="ic">📭</div>কোনো সক্রিয় নোটিশ নেই</div>';
    return;
  }

  const targetLabel={all:'🌐 সকলের জন্য',worker:'👷 শুধু কর্মী',manager:'🧑‍💼 শুধু ম্যানেজার'};

  list.innerHTML=notices.map(([id,n])=>{
    const left=n.expiresAt?Math.max(0,Math.ceil((n.expiresAt-now)/3600000)):null;
    let timeTag='<span style="font-size:11px;color:var(--green)">♾️ মেয়াদহীন</span>';
    if(left!==null){
      if(left<=1) timeTag=`<span style="color:var(--red);font-size:11px">⏰ ${Math.ceil((n.expiresAt-now)/60000)} মিনিট বাকি</span>`;
      else if(left<=24) timeTag=`<span style="color:var(--accent);font-size:11px">⏰ ${left} ঘণ্টা বাকি</span>`;
      else timeTag=`<span style="color:var(--blue);font-size:11px">⏰ ${Math.ceil(left/24)} দিন বাকি</span>`;
    }
    return `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:10px;position:relative;">
      ${canManage?`<button onclick="deleteNotice('${id}')" style="position:absolute;top:10px;right:10px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:7px;color:var(--red);cursor:pointer;font-size:11px;font-weight:700;padding:4px 9px;">✕ মুছুন</button>`:''}
      <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;padding-right:60px">📢 ${n.title}</div>
      <div style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:10px">${n.body}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <span style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:11px;color:var(--muted)">${targetLabel[n.target]||n.target}</span>
        <span style="font-size:11px;color:var(--muted)">👤 ${n.sentBy||'Admin'}</span>
        <span style="font-size:11px;color:var(--muted)">📅 ${fmtDate(new Date(n.ts).toISOString().split('T')[0])}</span>
        ${timeTag}
      </div>
    </div>`;
  }).join('');
}

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
  fetch('https://api.alphanetkbd.com/api/v2/sending/messages',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({apikey:allSMSConfig.apiKey,msg,to:num,from:allSMSConfig.senderId||'NOVATECH'})
  }).then(r=>r.json()).then(d=>console.log('SMS:',d?.status||d)).catch(e=>console.log('SMS error:',e.message));
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
  if(q){
    const qNum=q.replace(/\D/g,'');
    list=list.filter(([id,c])=>{
      return (c.name||'').toLowerCase().includes(q)
          || (c.owner||'').toLowerCase().includes(q)
          || (qNum&&((c.waNum||'').replace(/\D/g,'').includes(qNum)||(c.smsNum||'').replace(/\D/g,'').includes(qNum)))
          || (c.uniqueId||'').toLowerCase().includes(q);
    });
  }
  const el=$('custList');
  el.innerHTML=list.length?list.map(([id,c])=>{
    const route=allRoutes[c.routeId];
    const lastOrder = (_sc.byShop[id]||[]).sort((a,b)=>(b.ts||0)-(a.ts||0))[0];
    const custDue   = (_sc.byShop[id]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
    const totalSale = _sc.totalByShop[id]||0;
    const biz=parseInt(c.bizType||0);

    return`<div class="cust-card" style="padding:0;overflow:hidden;">

      <!-- ✅ Profile Header -->
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
        background:linear-gradient(135deg,var(--card),var(--surface));
        cursor:pointer;" onclick="viewCust('${id}')">
        <!-- ছবি -->
        <div style="width:52px;height:52px;border-radius:50%;flex-shrink:0;overflow:hidden;
          background:linear-gradient(135deg,var(--accent),var(--blue));
          display:flex;align-items:center;justify-content:center;font-size:22px;
          border:2px solid var(--border-l);">
          ${c.photoURL?`<img src="${c.photoURL}" style="width:52px;height:52px;object-fit:cover;">`:'🏪'}
        </div>
        <!-- তথ্য -->
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <div style="font-size:14px;font-weight:700;color:var(--text);">${san(c.name)}</div>
            ${c.uniqueId?`<span style="font-size:9px;color:var(--muted);background:var(--surface);padding:1px 6px;border-radius:4px;border:1px solid var(--border);">${c.uniqueId}</span>`:''}
            ${custDue>0?`<span style="font-size:10px;background:rgba(239,68,68,.15);color:var(--red);
              border-radius:5px;padding:1px 7px;font-weight:700;">বাকি ${bn(custDue)}</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">
            👤 ${san(c.owner||'–')} ${route?'· 🗺️ '+san(route.name):''}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:1px;display:flex;gap:10px;flex-wrap:wrap;">
            ${c.waNum?`<span>📱 ${c.waNum}</span>`:''}
            ${c.smsNum&&c.smsNum!==c.waNum?`<span>☎️ ${c.smsNum}</span>`:''}
          </div>
        </div>
        <div style="font-size:18px;color:var(--muted);">›</div>
      </div>

      <!-- Stats row -->
      <div style="display:flex;border-top:1px solid var(--border);
        background:var(--surface);">
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:var(--blue);">${bn(totalSale)}</div>
          <div style="font-size:9px;color:var(--muted);">মোট বিক্রয়</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:${custDue>0?'var(--red)':'var(--green)'};">${custDue>0?bn(custDue):'পরিষ্কার ✅'}</div>
          <div style="font-size:9px;color:var(--muted);">বাকি</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;">
          <div style="font-size:12px;font-weight:700;color:var(--muted);">${lastOrder?fmtDate(lastOrder.date):'–'}</div>
          <div style="font-size:9px;color:var(--muted);">শেষ অর্ডার</div>
        </div>
      </div>

      <!-- Action buttons -->
      <div style="display:flex;gap:0;border-top:1px solid var(--border);">
        <button onclick="goToSaleWithCust('${id}')"
          style="flex:1;padding:9px 4px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            background:rgba(59,130,246,.1);border:none;border-right:1px solid var(--border);color:var(--blue);">
          🛍️ বিক্রয়
        </button>
        ${custDue>0?`<button onclick="openPayMo('${c.name}',${custDue})"
          style="flex:1;padding:9px 4px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            background:rgba(139,92,246,.1);border:none;border-right:1px solid var(--border);color:var(--purple);">
          💰 বাকি আদায়
        </button>`:''}
        ${c.waNum?`<button onclick="openWA('${c.waNum}')"
          style="flex:1;padding:9px 4px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            background:rgba(37,211,102,.1);border:none;border-right:1px solid var(--border);color:#25d366;">
          💬 WA
        </button>`:''}
        <button onclick="viewCust('${id}')"
          style="flex:1;padding:9px 4px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            background:var(--surface);border:none;color:var(--muted);">
          👁 বিস্তারিত
        </button>
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
  // ✅ UI-03: Custom dropdown data আপডেট করি
  // hidden select আপডেট (app.js logic এর জন্য)
  const sel=$('sShopSel');
  if(sel){
    const allCusts=Object.entries(allCustomers);
    let html='<option value="">-- কাস্টমার --</option>';
    html+=allCusts.map(([id,c])=>`<option value="${id}">${c.name}</option>`).join('');
    html+='<option value="__m__">✏️ ম্যানুয়াল</option>';
    sel.innerHTML=html;
  }
  // search input ও chip reset
  const inp=$('custSearchInput');
  if(inp)inp.value='';
  const chip=$('custSelectedChip');
  if(chip)chip.style.display='none';
  const clearBtn=$('custClearBtn');
  if(clearBtn)clearBtn.style.display='none';
  // dropdown render
  custBuildDropdown('');
}

// ✅ UI-03: Custom dropdown build করি
function custBuildDropdown(query){
  const list=$('custDropdownList');
  if(!list)return;
  const q=(query||'').toLowerCase().trim();
  const qNum=q.replace(/\D/g,'');
  const allCusts=Object.entries(allCustomers);

  // Route অনুযায়ী ভাগ করি
  let routeCusts=[], otherCusts=[];
  if(activeRouteId){
    routeCusts=allCusts.filter(([,c])=>c.routeId===activeRouteId);
    otherCusts=allCusts.filter(([,c])=>c.routeId!==activeRouteId);
  } else {
    otherCusts=allCusts;
  }

  // Search filter
  const filterFn=([id,c])=>{
    if(!q)return true;
    return (c.name||'').toLowerCase().includes(q)
        || (c.owner||'').toLowerCase().includes(q)
        || (qNum&&((c.waNum||'').replace(/\D/g,'').includes(qNum)||(c.smsNum||'').replace(/\D/g,'').includes(qNum)))
        || (c.uniqueId||'').toLowerCase().includes(q);
  };

  const filteredRoute=routeCusts.filter(filterFn);
  const filteredOther=otherCusts.filter(filterFn);

  // HTML build
  const makeItem=([id,c],isRoute=false)=>{
    const route=allRoutes[c.routeId];
    const phone=c.waNum||c.smsNum||'';
    const uid=c.uniqueId?`<span style="font-size:9px;color:var(--muted);background:var(--surface);padding:1px 5px;border-radius:4px;border:1px solid var(--border);margin-left:4px;">${c.uniqueId}</span>`:'';
    const dueTxt=(_sc.dueByShop&&_sc.dueByShop[c.name]>0)?`<span style="font-size:10px;color:var(--red);font-weight:600;margin-left:4px;">বাকি ${bn(_sc.dueByShop[c.name])}</span>`:'';
    return `<div onclick="custSelectItem('${id}')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s;"
      onmousedown="event.preventDefault()"
      onmouseover="this.style.background='var(--surface)'" onmouseout="this.style.background=''"
    >
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span style="font-size:13px;font-weight:600;color:var(--text);">${san(c.name)}</span>
        ${uid}${dueTxt}
        ${isRoute?'<span style="font-size:9px;color:var(--accent);background:rgba(96,165,250,.1);padding:1px 6px;border-radius:4px;border:1px solid rgba(96,165,250,.2);">📍 রুট</span>':''}
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;">
        ${c.owner?`<span>👤 ${san(c.owner)}</span>`:''}
        ${phone?`<span>📱 ${phone}</span>`:''}
        ${route?`<span>🗺️ ${san(route.name)}</span>`:''}
      </div>
    </div>`;
  };

  let html='';

  // রুটের দোকান আগে
  if(filteredRoute.length){
    const routeName=allRoutes[activeRouteId]?.name||'রুট';
    html+=`<div style="padding:6px 14px;font-size:10px;font-weight:700;color:var(--accent);letter-spacing:.06em;text-transform:uppercase;background:rgba(96,165,250,.05);">🗺️ ${san(routeName)} রুট</div>`;
    html+=filteredRoute.map(e=>makeItem(e,true)).join('');
  }

  // অন্যান্য
  if(filteredOther.length){
    if(filteredRoute.length){
      html+=`<div style="padding:6px 14px;font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;background:var(--bg);">অন্যান্য দোকান</div>`;
    }
    html+=filteredOther.map(e=>makeItem(e,false)).join('');
  }

  if(!filteredRoute.length&&!filteredOther.length){
    html=`<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">😕 কোনো কাস্টমার পাওয়া যায়নি</div>`;
  }

  list.innerHTML=html;
}

// ✅ Search filter
window.custSearchFilter = function(val){
  const clearBtn=$('custClearBtn');
  if(clearBtn)clearBtn.style.display=val?'block':'none';
  custBuildDropdown(val);
  custDropdownShow();
};

// ✅ Item select
window.custSelectItem = function(id){
  const c=allCustomers[id];
  if(!c)return;
  // hidden select আপডেট — app.js এর জন্য
  const sel=$('sShopSel');
  if(sel)sel.value=id;
  // search input clear
  const inp=$('custSearchInput');
  if(inp)inp.value='';
  const clearBtn=$('custClearBtn');
  if(clearBtn)clearBtn.style.display='none';
  // chip দেখাই
  const chip=$('custSelectedChip');
  const chipName=$('custSelectedName');
  const chipSub=$('custSelectedSub');
  if(chip){chip.style.display='flex';}
  if(chipName)chipName.textContent=c.name+(c.owner?' · '+c.owner:'');
  if(chipSub){
    const phone=c.waNum||c.smsNum||'';
    chipSub.textContent=phone+(c.uniqueId?' · ID: '+c.uniqueId:'');
  }
  // dropdown বন্ধ
  custDropdownHide();
  // manual row বন্ধ
  const mr=$('sShopManualRow');
  if(mr)mr.style.display='none';
  // app.js logic trigger — discount, SMS info ইত্যাদি
  sShopSelChange();
};

// ✅ Manual select
window.custSelectManual = function(){
  const sel=$('sShopSel');
  if(sel)sel.value='__m__';
  const mr=$('sShopManualRow');
  if(mr)mr.style.display='block';
  // chip লুকাই
  const chip=$('custSelectedChip');
  if(chip)chip.style.display='none';
  custDropdownHide();
  sShopSelChange();
};

// ✅ Dropdown show/hide
window.custDropdownShow = function(){
  const dd=$('custDropdown');
  if(!dd)return;
  // allCustomers ready না হলে wait করি
  if(!allCustomers||Object.keys(allCustomers).length===0){
    dd.style.display='block';
    const list=$('custDropdownList');
    if(list)list.innerHTML='<div style="padding:16px;text-align:center;color:var(--muted);font-size:13px;">⏳ লোড হচ্ছে...</div>';
    return;
  }
  dd.style.display='block';
  custBuildDropdown($('custSearchInput')?.value||'');
};
window.custDropdownHide = function(){
  const dd=$('custDropdown');
  if(dd)dd.style.display='none';
};

// ✅ Clear search
window.custClearSearch = function(){
  const sel=$('sShopSel');
  if(sel)sel.value='';
  const inp=$('custSearchInput');
  if(inp){inp.value='';inp.focus();}
  const chip=$('custSelectedChip');
  if(chip)chip.style.display='none';
  const clearBtn=$('custClearBtn');
  if(clearBtn)clearBtn.style.display='none';
  const mr=$('sShopManualRow');
  if(mr)mr.style.display='none';
  custDropdownShow();
};
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

// ✅ পুরনো কাস্টমারদের জন্য Unique ID migration
window.migrateCustUniqueIds = async () => {
  if(CR!=='admin'){showToast('শুধু Admin করতে পারবে!',true);return;}
  const entries = Object.entries(allCustomers).filter(([,c])=>!c.uniqueId);
  if(!entries.length){showToast('সব কাস্টমারের ID ইতিমধ্যে আছে ✓');return;}
  if(!confirm(entries.length+' জন কাস্টমারের ID তৈরি করবেন?'))return;
  loader(true);
  try{
    // ✅ counter থেকে শুরু করো
    const counterSnap = await get(ref(db,'custIdCounter'));
    let serial = counterSnap.exists() ? counterSnap.val() : 5171;
    for(const [id] of entries){
      serial++;
      await update(ref(db,'customers/'+id),{
        uniqueId:'NTB-C-'+String(serial).padStart(5,'0')
      });
    }
    // counter আপডেট করো
    await set(ref(db,'custIdCounter'), serial);
    showToast('✅ '+entries.length+' কাস্টমারের Unique ID তৈরি হয়েছে');
  }catch(e){showToast('Migration ব্যর্থ: '+e.message,true);}
  finally{loader(false);}
};
window.addCustomer=async()=>{
  const name=$('cName').value.trim(),owner=$('cOwner').value.trim(),bizType=$('cBiz').value,routeId=$('cRoute').value;
  if(!name||!owner||!routeId){showToast('নাম, মালিক ও রুট দিন!',true);return;}

  // ✅ Phone validation
  const rawSms=$('cSms').value.trim();
  const rawWa=$('cWa').value.trim();
  if(!rawSms){showToast('SMS নম্বর দিন!',true);return;}
  if(!window.checkPhone(rawSms,'SMS নম্বর'))return;
  if(rawWa && !window.checkPhone(rawWa,'WhatsApp নম্বর'))return;
  const smsNum=window.formatPhone(rawSms);
  const waNum=rawWa?window.formatPhone(rawWa):'';

  loader(true);
  try{
    // ✅ Unique Customer ID — Firebase atomic counter (always unique)
    const counterSnap = await get(ref(db,'custIdCounter'));
    const nextNum = (counterSnap.exists() ? counterSnap.val() : 5171) + 1;
    await set(ref(db,'custIdCounter'), nextNum);
    const uniqueId = 'NTB-C-' + String(nextNum).padStart(5,'0');

    // ছবি আপলোড (থাকলে)
    let photoURL=null;
    if(window._pendingCustPhoto){
      photoURL=await uploadImageToFirebase(window._pendingCustPhoto,'customers');
      window._pendingCustPhoto=null;
    }
    await push(ref(db,'customers'),{
      name,owner,bizType,routeId,
      waNum,
      smsNum,
      uniqueId,
      lat:parseFloat($('cLat').value)||null,
      lng:parseFloat($('cLng').value)||null,
      note:$('cNote').value.trim(),
      photoURL,
      addedBy:CU.uid,addedByName:CN,ts:Date.now()
    });
    ['cName','cOwner','cWa','cSms','cLat','cLng','cNote'].forEach(id=>{const el=$(id);if(el)el.value='';});
    const prev=$('custPhotoPreview'),icon=$('custPhotoIcon');
    if(prev){prev.src='';prev.style.display='none';}
    if(icon)icon.style.display='block';
    closeMo('custMo');showToast(name+' যোগ হয়েছে ✓ · ID: '+uniqueId);
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
  $('custSaleHistoryTitle').textContent=(cust?.name||'কাস্টমার')+(cust?.uniqueId?' ('+cust.uniqueId+')':'')+' — বিক্রয় ইতিহাস';
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
  $('cdTitle').textContent='🏪 '+c.name+(c.uniqueId?' ('+c.uniqueId+')':'');
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
      ${c.uniqueId?`<div style="font-size:10px;color:var(--muted);margin-bottom:8px;background:var(--surface);padding:5px 10px;border-radius:6px;text-align:center;">🔐 ID: <b style="color:var(--text);letter-spacing:1px;">${san(c.uniqueId)}</b></div>`:''}
      <div style="font-size:13px;margin-bottom:6px">👤 ${san(c.owner||'-')}</div>
      <div style="font-size:13px;margin-bottom:6px">🗺️ রুট: ${route?san(route.name):'-'}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:13px">📱 WA: ${san(c.waNum||'-')}</div>
        <button onclick="openCustEditModal('${id}')" style="font-size:10px;padding:3px 8px;background:rgba(59,130,246,.1);border:1px solid var(--blue);color:var(--blue);border-radius:6px;cursor:pointer;font-family:inherit;">✏️ সম্পাদনা</button>
      </div>
      <div style="font-size:13px">📨 SMS: ${san(c.smsNum||'-')}</div>
      ${c.note?`<div style="font-size:12px;color:var(--muted);margin-top:6px;">📝 ${san(c.note)}</div>`:''}
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

// ══════════════════════════════════════════════════
//  ✏️ Customer Edit Request System v2.0
//  সব field edit করা যাবে
//  সাথে সাথে effective → reject হলে rollback
// ══════════════════════════════════════════════════

// Edit Modal খোলা (সবাই পারবে)
window.openEditCustPhone = window.openCustEditModal = async (custId) => {
  const c = allCustomers[custId]; if (!c) return;
  window._editingCustId = custId;

  // Unique ID দেখানো
  const uid$ = $('custEditUniqueId');
  if (uid$) uid$.textContent = c.uniqueId
    ? `🔐 Customer ID: ${c.uniqueId} (পরিবর্তনযোগ্য নয়)`
    : '🔐 Customer ID: (পুরনো কাস্টমার — ID নেই)';

  // Route select populate
  const sel = $('ceRoute');
  if (sel) {
    sel.innerHTML = '<option value="">-- রুট --</option>' +
      Object.entries(allRoutes).map(([id,r]) =>
        `<option value="${id}" ${c.routeId===id?'selected':''}>${san(r.name)}</option>`
      ).join('');
  }

  // Current values বসানো
  if($('ceWa'))   $('ceWa').value   = c.waNum  || '';
  if($('ceSms'))  $('ceSms').value  = c.smsNum || '';
  if($('ceLat'))  $('ceLat').value  = c.lat    || '';
  if($('ceLng'))  $('ceLng').value  = c.lng    || '';
  if($('ceNote')) $('ceNote').value = c.note   || '';

  // Change preview লুকাও
  const prev = $('ceChangePreview');
  if(prev) prev.style.display = 'none';

  openMo('custEditMo');
};

// Auto GPS for edit modal
window.autoCEGPS = () => {
  if(!navigator.geolocation){ showToast('GPS সাপোর্ট নেই',true); return; }
  showToast('📍 GPS খুঁজছে...');
  navigator.geolocation.getCurrentPosition(
    pos => {
      if($('ceLat')) $('ceLat').value = pos.coords.latitude.toFixed(7);
      if($('ceLng')) $('ceLng').value = pos.coords.longitude.toFixed(7);
      showToast('✅ GPS পাওয়া গেছে');
    },
    () => showToast('GPS পাওয়া যায়নি',true),
    { timeout:12000, enableHighAccuracy:true }
  );
};

// Edit জমা দেওয়া
window.submitCustEdit = async () => {
  const custId = window._editingCustId; if (!custId) return;
  const c = allCustomers[custId]; if (!c) return;

  // নতুন values
  const rawWa  = ($('ceWa')?.value  || '').trim();
  const rawSms = ($('ceSms')?.value || '').trim();
  const routeId= $('ceRoute')?.value || c.routeId;
  const lat    = parseFloat($('ceLat')?.value) || null;
  const lng    = parseFloat($('ceLng')?.value) || null;
  const note   = ($('ceNote')?.value || '').trim();

  // Phone validation
  if(rawSms && !window.checkPhone(rawSms,'SMS নম্বর')) return;
  if(rawWa  && !window.checkPhone(rawWa, 'WhatsApp নম্বর')) return;

  const newSms = rawSms ? window.formatPhone(rawSms) : (c.smsNum||'');
  const newWa  = rawWa  ? window.formatPhone(rawWa)  : (c.waNum ||'');

  // কী কী বদলেছে বের করি
  const changes = {};
  const oldData = {};
  if (newSms !== (c.smsNum||''))       { changes.smsNum  = newSms;   oldData.smsNum  = c.smsNum||''; }
  if (newWa  !== (c.waNum ||''))       { changes.waNum   = newWa;    oldData.waNum   = c.waNum ||''; }
  if (routeId!== c.routeId)            { changes.routeId = routeId;  oldData.routeId = c.routeId; }
  if (lat    !== (c.lat||null))        { changes.lat     = lat;      oldData.lat     = c.lat||null; }
  if (lng    !== (c.lng||null))        { changes.lng     = lng;      oldData.lng     = c.lng||null; }
  if (note   !== (c.note||''))         { changes.note    = note;     oldData.note    = c.note||''; }

  if (!Object.keys(changes).length) { showToast('কোনো পরিবর্তন হয়নি',true); return; }

  try {
    loader(true);

    // ১. সাথে সাথে Firebase-এ আপডেট (optimistic)
    await update(ref(db,'customers/'+custId), changes);

    // ২. Request log
    await push(ref(db,'custEditRequests'), {
      custId,
      custName:        c.name,
      uniqueId:        c.uniqueId || '',
      changes,
      oldData,
      requestedBy:     CN,
      requestedByUid:  CU.uid,
      requestedByRole: CR,
      requestedAt:     Date.now(),
      status:          'pending',
    });

    // ৩. Notification
    if(CR==='worker'){
      window.sendNotificationToRole && window.sendNotificationToRole(
        'manager',
        '✏️ কাস্টমার তথ্য পরিবর্তনের আবেদন',
        `${CN} — "${c.name}" এর তথ্য পরিবর্তন করেছে। অনুমোদন করুন।`,
        'cust'
      );
    }

    closeMo('custEditMo');
    showToast('✅ পরিবর্তন কার্যকর হয়েছে · অনুমোদন পেন্ডিং');
    setTimeout(() => viewCustomer(custId), 400);

  } catch(e){ showToast('ব্যর্থ: '+e.message,true); }
  finally{ loader(false); }
};

// Approve
window.approvePhoneEditRequest = async (reqId) => {
  const req = allPhoneEditRequests[reqId]; if(!req) return;
  try{
    await update(ref(db,'custEditRequests/'+reqId),{
      status:       'approved',
      approvedBy:    CN,
      approvedByUid: CU.uid,
      approvedAt:    Date.now(),
    });
    showToast('✅ অনুমোদন করা হয়েছে');
    renderPhoneEditRequests();
  }catch(e){ showToast('ব্যর্থ: '+e.message,true); }
};

// Reject → rollback
window.rejectPhoneEditRequest = async (reqId) => {
  const req = allPhoneEditRequests[reqId]; if(!req) return;
  if(!confirm(`"${req.custName}" এর পরিবর্তন বাতিল করবেন?\nপূর্বের তথ্য ফিরে আসবে।`)) return;
  try{
    // Rollback — oldData দিয়ে restore
    await update(ref(db,'customers/'+req.custId), req.oldData);
    await update(ref(db,'custEditRequests/'+reqId),{
      status:       'rejected',
      rejectedBy:    CN,
      rejectedByUid: CU.uid,
      rejectedAt:    Date.now(),
    });
    window.sendNotificationTo && window.sendNotificationTo(
      req.requestedByUid,
      '❌ কাস্টমার তথ্য পরিবর্তন বাতিল',
      `"${req.custName}" এর তথ্য পরিবর্তনের আবেদন বাতিল। পূর্বের তথ্য ফিরে এসেছে।`,
      'cust'
    );
    showToast('❌ বাতিল · পূর্বের তথ্য ফিরে এসেছে');
    renderPhoneEditRequests();
  }catch(e){ showToast('ব্যর্থ: '+e.message,true); }
};

// Render — Admin/Manager
function renderPhoneEditRequests() {
  const sec   = document.getElementById('phoneEditReqSection');
  const el    = document.getElementById('phoneEditRequestList');
  const badge = document.getElementById('phoneEditReqBadge');
  if(!el||!sec) return;
  if(CR!=='admin'&&CR!=='manager'){sec.style.display='none';return;}

  const all = Object.entries(allPhoneEditRequests||{})
    .sort((a,b)=>(b[1].requestedAt||0)-(a[1].requestedAt||0));
  const pending = all.filter(([,r])=>r.status==='pending');
  const history = all.filter(([,r])=>r.status!=='pending').slice(0,10);

  sec.style.display = all.length?'block':'none';
  if(badge) badge.textContent = pending.length||'';

  const stTag = r => r.status==='approved'
    ? `<span style="font-size:9px;background:rgba(16,185,129,.15);color:var(--green);padding:2px 8px;border-radius:5px;border:1px solid var(--green);font-weight:700;">✅ অনুমোদিত</span>`
    : r.status==='rejected'
    ? `<span style="font-size:9px;background:rgba(239,68,68,.1);color:var(--red);padding:2px 8px;border-radius:5px;border:1px solid var(--red);font-weight:700;">❌ বাতিল</span>`
    : `<span style="font-size:9px;background:rgba(245,158,11,.15);color:var(--accent);padding:2px 8px;border-radius:5px;border:1px solid var(--accent);font-weight:700;">⏳ অপেক্ষমান</span>`;

  // পরিবর্তনের তালিকা সুন্দরভাবে দেখানো
  const fieldLabel = { smsNum:'📨 SMS', waNum:'📱 WA', routeId:'🗺️ রুট', lat:'📍 Lat', lng:'📍 Lng', note:'📝 নোট' };
  const changeRows = r => Object.entries(r.changes||{}).map(([k,v])=>{
    const old = r.oldData?.[k] ?? '—';
    const newVal = k==='routeId' ? (allRoutes[v]?.name||v) : (v||'—');
    const oldVal = k==='routeId' ? (allRoutes[old]?.name||old) : (old||'—');
    return `<div style="margin-bottom:3px;">
      <span style="color:var(--muted);">${fieldLabel[k]||k}:</span>
      <span style="color:var(--red);text-decoration:line-through;margin:0 5px;">${san(String(oldVal))}</span>
      <span style="color:var(--muted);">→</span>
      <span style="color:var(--green);margin-left:5px;font-weight:700;">${san(String(newVal))}</span>
    </div>`;
  }).join('');

  const card = (id,r,showActions) => `
    <div style="background:var(--card);border:1px solid ${r.status==='pending'?'rgba(245,158,11,.3)':r.status==='approved'?'rgba(16,185,129,.2)':'rgba(239,68,68,.2)'};border-radius:12px;padding:13px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <div style="font-size:13px;font-weight:700;">🏪 ${san(r.custName)} ${r.uniqueId?`<span style="font-size:10px;color:var(--muted);">(${r.uniqueId})</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px;">
            👤 ${san(r.requestedBy)} (${r.requestedByRole==='worker'?'কর্মী':'ম্যানেজার'}) · ${new Date(r.requestedAt).toLocaleString('bn-BD')}
          </div>
          ${r.approvedBy?`<div style="font-size:11px;color:var(--green);margin-top:2px;">✅ ${san(r.approvedBy)} · ${new Date(r.approvedAt).toLocaleString('bn-BD')}</div>`:''}
          ${r.rejectedBy?`<div style="font-size:11px;color:var(--red);margin-top:2px;">❌ ${san(r.rejectedBy)} · ${new Date(r.rejectedAt).toLocaleString('bn-BD')}</div>`:''}
        </div>
        ${stTag(r)}
      </div>
      <div style="background:var(--surface);border-radius:8px;padding:9px;margin-bottom:${showActions?'10px':'0'};font-size:12px;">
        ${changeRows(r)||'<span style="color:var(--muted);">তথ্য নেই</span>'}
      </div>
      ${showActions?`
      <div style="display:flex;gap:8px;">
        <button onclick="approvePhoneEditRequest('${id}')"
          style="flex:1;padding:8px;background:rgba(16,185,129,.12);border:1px solid var(--green);
          color:var(--green);border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;">✅ অনুমোদন</button>
        <button onclick="rejectPhoneEditRequest('${id}')"
          style="flex:1;padding:8px;background:rgba(239,68,68,.08);border:1px solid var(--red);
          color:var(--red);border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;">❌ বাতিল (rollback)</button>
      </div>`:''}
    </div>`;

  el.innerHTML =
    (pending.length ? pending.map(([id,r])=>card(id,r,true)).join('') : '') +
    (history.length ? `<div style="font-size:11px;color:var(--muted);margin:10px 0 6px;font-weight:600;">📋 সাম্প্রতিক ইতিহাস</div>`+history.map(([id,r])=>card(id,r,false)).join('') : '') +
    (!all.length ? '<div class="empty">কোনো আবেদন নেই</div>' : '');
}

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

  // ✅ Phone validation — ভুল নম্বর skip, valid গুলোতেই পাঠাও
  let sent=0, skipped=0;
  custs.forEach(c=>{
    const raw=c.smsNum||c.waNum;
    if(!raw){skipped++;return;}
    const num=window.formatPhone(raw);
    if(!window.validatePhone(num)){skipped++;return;}
    sendSMSAlphaNet(num,'NovaTEch BD: '+msg);
    sent++;
  });

  $('broadcastMsg').value='';closeMo('smsBroadcastMo');
  if(skipped>0){
    showToast(`${sent} জনকে SMS পাঠানো হচ্ছে · ${skipped} জন বাদ (ভুল/নেই নম্বর)`);
  } else {
    showToast(`${sent} জন কাস্টমারকে SMS পাঠানো হচ্ছে...`);
  }
};

// ROUTE VISIT
window.startRoute=async()=>{
  const rid=$('todayRoute').value;if(!rid){showToast('রুট বেছে নিন!',true);return;}
  activeRouteId=rid;
  window.activeRouteId=rid; // ✅ worker-dashboard এর জন্য
  await set(ref(db,'workerStatus/'+CU.uid+'/activeRoute'),{routeId:rid,date:today(),startedAt:Date.now()});
  loadCustomerSelect();
  showToast('রুট শুরু ✓ — এই রুটের দোকান আগে দেখাবে');
  renderVisitList();refreshDash();
  syncGlobals(); // ✅ worker-dashboard refresh
};

// ✅ Route select করলেই সবার জন্য ভিজিট তালিকা দেখাও
window.previewRoute = function(rid) {
  if(!rid) { renderVisitList(); return; }
  activeRouteId = rid;
  renderVisitList();
  loadCustomerSelect();
};
function renderVisitList(){
  const el=$('visitList');if(!el)return;
  if(!activeRouteId){el.innerHTML='<div class="empty"><div class="ic">🗺️</div>রুট সেট করুন</div>';return;}
  const rc=Object.entries(allCustomers).filter(([,c])=>c.routeId===activeRouteId);
  if(!rc.length){el.innerHTML='<div class="empty"><div class="ic">🏪</div>এই রুটে দোকান নেই</div>';return;}
  const vi=(_sc.byUid[CU?.uid]||[]).filter(s=>s.date===today()&&s.routeId===activeRouteId).map(s=>s.shopId);
  el.innerHTML=rc.map(([id,c])=>{
    const done=vi.includes(id);
    return`<div class="visit-card"><div class="${done?'vs-done':'vs-pending'}"></div><div style="flex:1"><div style="font-size:13px;font-weight:600">${san(c.name)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">👤 ${san(c.owner||'')}</div></div><div style="text-align:right">${done?'<span style="color:var(--green);font-size:11px">✓ ভিজিট</span>':`<button style="padding:5px 10px;border:1px solid var(--accent);border-radius:7px;background:rgba(245,166,35,.1);color:var(--accent);font-family:inherit;font-size:11px;cursor:pointer;" onclick="quickVisit('${id}')">📝 বিক্রয়</button>`}${c.lat&&c.lng?`<div style="font-size:10px;color:var(--accent);cursor:pointer;margin-top:3px" onclick="openMap(${c.lat},${c.lng})">📍 ম্যাপ</div>`:''}</div></div>`;
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

// ✅ বিক্রয় হলে Manager/Admin-কে notify করি
function notifySaleToManagers(shop, product, qty, total) {
  try {
    if (!window.sendNotificationTo) return;
    const msg = `${CN}: ${shop} — ${product} × ${qty} = ৳${Math.round(total).toLocaleString('bn-BD')}`;
    Object.entries(allUsers || {}).forEach(([uid, u]) => {
      if ((u.role === 'admin' || u.role === 'manager') && uid !== CU.uid) {
        window.sendNotificationTo(uid, '🛍 নতুন বিক্রয়', msg, 'dash');
      }
    });
  } catch(e) {}
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
  // ✅ Double-submit protection
  const btn = $('saleSaveBtn');
  if(btn?.disabled) return;
  if(btn){ btn.disabled=true; btn.textContent='⏳ সংরক্ষণ হচ্ছে...'; }
  const _resetBtn = () => { if(btn){ btn.disabled=false; btn.textContent='✅ বিক্রয় সংরক্ষণ + SMS OTP'; } };

  try {
  const shopSelVal=$('sShopSel').value,shopId=shopSelVal!=='__m__'&&shopSelVal?shopSelVal:null;
  const shop=shopId?(allCustomers[shopId]?.name||''):($('sShopManual').value.trim()||'');
  const prodId=$('sProd').value,qty=parseFloat($('sQty').value),sell=parseFloat($('sSell').value);
  const disc=parseFloat($('sDisc').value)||0,date=$('sDate').value,pay=$('sPay').value,part=parseFloat($('sPart').value)||0;
  if(!shop||!prodId||!qty||!sell||!date){showToast('সব তথ্য দিন!',true);_resetBtn();return;}
  const prod=allProducts[prodId];
  if(disc>(prod?.maxDisc||0)){showToast(`সর্বোচ্চ ছাড় ${prod?.maxDisc||0}%`,true);_resetBtn();return;}
  const da=sell*qty*disc/100,total=Math.round(sell*qty-da);
  const profit=Math.round(((sell-(prod?.buyPrice||0))*qty)-da);

  // ✅ আংশিক পেমেন্ট validation
  if(pay==='partial'){
    if(!part||part<=0){showToast('আংশিক পরিমাণ লিখুন!',true);_resetBtn();return;}
    if(part>=total){showToast('আংশিক পরিমাণ মোটের চেয়ে কম হতে হবে!',true);_resetBtn();return;}
  }

  // ✅ due সঠিকভাবে হিসাব
  let due=0;
  if(pay==='due') due=total;
  else if(pay==='partial') due=Math.round(total-part);
  else due=0; // নগদ
  const photoUrl=window._pendingSalePhoto||null;

  // ✅ Invoice নম্বর তৈরি — offline হলে temp নম্বর
  let invoiceNo;
  if(!navigator.onLine){
    invoiceNo = `NTB-OFFLINE-${Date.now().toString().slice(-6)}`;
  } else {
    try {
      const _year = new Date().getFullYear();
      let _newCount = 1;
      await runTransaction(ref(db,'invoiceCounter'),(cur)=>{_newCount=(cur||0)+1;return _newCount;});
      invoiceNo = `NTB-${_year}-${String(_newCount).padStart(4,'0')}`;
    } catch(e) {
      invoiceNo = `NTB-OFFLINE-${Date.now().toString().slice(-6)}`;
    }
  }

  const saleData={date,shop,shopId,product:prod.name,productId:prodId,qty,sellPrice:sell,disc,total,profit,payStatus:pay,due,uid:CU.uid,workerName:CN,routeId:activeRouteId||null,ts:Date.now(),otpConfirmed:false,photoUrl,invoiceNo};
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
    // OTP flow — অফলাইনে OTP পাঠানো যাবে না
    if(!navigator.onLine){
      await window.saveOfflineSale(saleData);
      clearSaleForm();renderVisitList();return;
    }
    const otp=genOTP();
    pendingSaleData=saleData;pendingOTP=otp;
    pendingOTPExpiry=Date.now()+(3*60*1000);
    const smsWithOTP=billMsg.replace('{otp_line}','OTP: '+otp+'\nOTP দিয়ে বিল নিশ্চিত করুন।');
    sendSMSAlphaNet(smsNum,smsWithOTP);
    $('otpSection').style.display='block';
    $('sentOTPDisplay').textContent='••••••'; // OTP লুকানো — কাস্টমারের ফোনে গেছে
    $('otpInput').value='';
    showToast('📱 OTP SMS পাঠানো হয়েছে!');
    window.scrollTo(0,($('otpSection').offsetTop||0)-80);
  } else if(smsNum&&hasAPI&&!otpEnabled){
    try {
      const smsNoOTP=billMsg.replace('{otp_line}','আমাদের সাথে যুক্ত হবার জন্য আপনাকে ধন্যবাদ।');
      sendSMSAlphaNet(smsNum,smsNoOTP);
      await push(ref(db,'sales'),{...saleData,otpConfirmed:true,otpSkipped:false,smsSent:true});
      await deductWorkerStock(CU.uid,prodId,prod.name,qty);
      notifySaleToManagers(shop,prod.name,qty,total);
      clearSaleForm();showToast('✅ বিক্রয় সংরক্ষিত + SMS পাঠানো হয়েছে');renderVisitList();
    } catch(e) {
      // ✅ offline fallback
      await window.saveOfflineSale(saleData);
      clearSaleForm();renderVisitList();
    }
  } else {
    try {
      await push(ref(db,'sales'),saleData);
      await deductWorkerStock(CU.uid,prodId,prod.name,qty);
      clearSaleForm();showToast('✅ বিক্রয় সংরক্ষিত');renderVisitList();
    } catch(e) {
      // ✅ offline fallback
      await window.saveOfflineSale(saleData);
      clearSaleForm();renderVisitList();
    }
  }
  } catch(e) {
    showToast('সমস্যা হয়েছে: '+e.message, true);
  } finally {
    _resetBtn(); // ✅ সবসময় button re-enable করো
  }
};

window.confirmOTP=async()=>{
  const entered=$('otpInput').value.trim();
  if(!entered){showToast('OTP লিখুন!',true);return;}
  if(Date.now()>pendingOTPExpiry){
    showToast('⏰ OTP মেয়াদ শেষ! নতুন বিক্রয় করুন।',true);
    pendingSaleData=null;pendingOTP=null;pendingOTPExpiry=0;
    $('otpSection').style.display='none';return;
  }
  if(entered===pendingOTP){
    const saleData={...pendingSaleData,otpConfirmed:true};
    await push(ref(db,'sales'),saleData);
    await deductWorkerStock(CU.uid,saleData.productId,saleData.product,saleData.qty);
    notifySaleToManagers(saleData.shop,saleData.product,saleData.qty,saleData.total);
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
  // ✅ UI-03: search reset
  if(typeof window.custClearSearch==='function') window.custClearSearch();
}
function renderSaleList(){
  let list=_sc.arr.slice();
  if(CR==='worker')list=list.filter(s=>s.uid===CU.uid);
  list.sort((a,b)=>(b.ts||0)-(a.ts||0));
  $('saleList').innerHTML=list.length?list.map(s=>saleCard(s)).join(''):'<div class="empty"><div class="ic">📭</div>কোনো বিক্রয় নেই</div>';
  // ✅ Admin-এর জন্য delete request section
  const delSec=$('deleteReqSection');
  if(delSec) delSec.style.display=CR==='admin'?'block':'none';
  if(CR==='admin') renderDeleteRequests();
}
function saleCard(s){
  const statusTag=s.otpConfirmed?`<span class="confirmed-tag">✓ OTP নিশ্চিত</span>`:s.otpSkipped?`<span class="pending-tag">OTP ছাড়া</span>`:'';
  const invTag=s.invoiceNo?`<span style="font-size:9px;color:var(--muted);background:var(--surface);padding:1px 6px;border-radius:4px;border:1px solid var(--border);margin-left:4px;">${s.invoiceNo}</span>`:'';
  const saleId=s._id||Object.keys(allSales).find(k=>allSales[k]===s)||'';
  const invoiceBtn=saleId?`<button onclick="generateInvoice('${saleId}')" style="font-size:10px;padding:3px 8px;background:rgba(59,130,246,.1);border:1px solid var(--blue);color:var(--blue);border-radius:6px;cursor:pointer;font-family:inherit;margin-top:5px;">🧾 Invoice</button>`:'';

  // ✅ Delete বাটন — Admin সরাসরি, Worker/Manager request পাঠাবে
  const deleteBtn = saleId ? (
    CR==='admin'
      ? `<button onclick="adminDeleteSale('${saleId}')" style="font-size:10px;padding:3px 8px;background:rgba(239,68,68,.1);border:1px solid var(--red);color:var(--red);border-radius:6px;cursor:pointer;font-family:inherit;margin-top:5px;margin-left:4px;">🗑️ মুছুন</button>`
      : `<button onclick="requestDeleteSale('${saleId}')" style="font-size:10px;padding:3px 8px;background:rgba(245,158,11,.1);border:1px solid var(--accent);color:var(--accent);border-radius:6px;cursor:pointer;font-family:inherit;margin-top:5px;margin-left:4px;">🗑️ মুছতে চাই</button>`
  ) : '';

  return`<div class="ec"><div class="ei">
    <div class="shop">${san(s.shop)} ${invTag}</div>
    <div class="prod">🛍 ${san(s.product)} × ${s.qty} পিস ${s.disc>0?`· ছাড়: ${s.disc}%`:''}</div>
    <div class="dt">📅 ${fmtDate(s.date)} · <span class="wtag">${san(s.workerName||'')}</span></div>
    ${statusTag}
    <div style="display:flex;flex-wrap:wrap;gap:0;">${invoiceBtn}${deleteBtn}</div>
  </div>
  <div class="ea">
    <div class="sale">${bn(s.total)}</div>
    ${CR==='admin'?`<div style="font-size:11px;color:var(--green);margin-top:2px">+${bn(s.profit)}</div>`:''}
    ${s.due>0?`<div class="due-tag">বাকি ${bn(s.due)}</div>`:''}
  </div></div>`;
}

// ══════════════════════════════════════════════
// ✅ বিক্রয় মুছে ফেলার সিস্টেম
// ══════════════════════════════════════════════

// Admin — সরাসরি delete
window.adminDeleteSale = async function(saleId) {
  const s = allSales[saleId]; if(!s) return;
  const confirmed = confirm(
    `⚠️ বিক্রয় মুছবেন?\n\n🏪 ${s.shop}\n📦 ${s.product} × ${s.qty}\n💰 ${Math.round(s.total).toLocaleString('bn-BD')} টাকা\n📅 ${s.date}\n\nএই কাজ ফেরানো যাবে না!`
  );
  if(!confirmed) return;

  try {
    // ✅ Audit log রাখি
    await push(ref(db,'auditLogs'),{
      action:'sale_deleted',
      saleId, saleData:s,
      deletedBy:CN, deletedByUid:CU.uid,
      role:CR, ts:Date.now()
    });
    await remove(ref(db,'sales/'+saleId));
    showToast('✅ বিক্রয় মুছে ফেলা হয়েছে');
  } catch(e) {
    showToast('মুছতে ব্যর্থ!',true);
  }
};

// Worker/Manager — delete request পাঠানো
window.requestDeleteSale = async function(saleId) {
  const s = allSales[saleId]; if(!s) return;

  // নিজের বিক্রয় কিনা check
  if(s.uid !== CU.uid && CR !== 'manager') {
    showToast('শুধু নিজের বিক্রয় মুছতে আবেদন করা যাবে!',true);
    return;
  }

  // কারণ জিজ্ঞেস করি
  const reason = prompt(`বিক্রয় মুছতে চাওয়ার কারণ লিখুন:\n\n🏪 ${s.shop} · ${s.product} × ${s.qty} · ৳${Math.round(s.total).toLocaleString('bn-BD')}`);
  if(!reason || !reason.trim()) { showToast('কারণ লিখুন!',true); return; }

  // আগে একই request আছে কিনা
  const existing = Object.values(allDeleteRequests||{}).find(r=>r.saleId===saleId&&r.status==='pending');
  if(existing) { showToast('এই বিক্রয়ের জন্য আবেদন ইতিমধ্যে আছে!',true); return; }

  await push(ref(db,'deleteRequests'),{
    saleId, saleData:s,
    reason:reason.trim(),
    requestedBy:CN, requestedByUid:CU.uid,
    role:CR, status:'pending',
    ts:Date.now(), date:today()
  });

  // Admin-কে notification
  Object.entries(allUsers||{}).forEach(([uid,u])=>{
    if(u.role==='admin' && uid!==CU.uid && window.sendNotificationTo)
      window.sendNotificationTo(uid,'🗑️ বিক্রয় মুছার আবেদন',
        `${CN}: ${s.shop} — ${s.product} (${reason.trim().slice(0,30)})`, 'sale');
  });
  showToast('✅ আবেদন পাঠানো হয়েছে — Admin অনুমোদন করবে');
};

// Admin — request অনুমোদন
window.approveDeleteRequest = async function(reqId) {
  const req = allDeleteRequests[reqId]; if(!req) return;
  const confirmed = confirm(`✅ অনুমোদন করবেন?\n\n🏪 ${req.saleData?.shop}\n📦 ${req.saleData?.product} × ${req.saleData?.qty}\n👤 আবেদনকারী: ${req.requestedBy}\n💬 কারণ: ${req.reason}`);
  if(!confirmed) return;
  try {
    await push(ref(db,'auditLogs'),{
      action:'sale_deleted_approved',
      saleId:req.saleId, saleData:req.saleData,
      deletedBy:CN, requestedBy:req.requestedBy,
      reason:req.reason, ts:Date.now()
    });
    await remove(ref(db,'sales/'+req.saleId));
    await update(ref(db,'deleteRequests/'+reqId),{status:'approved',approvedBy:CN,approvedAt:Date.now()});
    // কর্মীকে জানাই
    if(window.sendNotificationTo)
      window.sendNotificationTo(req.requestedByUid,'✅ বিক্রয় মুছার অনুমোদন',
        `${req.saleData?.shop} — ${req.saleData?.product} মুছে ফেলা হয়েছে।`,'sale');
    showToast('✅ বিক্রয় মুছে অনুমোদন দেওয়া হয়েছে');
  } catch(e){ showToast('ব্যর্থ!',true); }
};

// Admin — request বাতিল
window.rejectDeleteRequest = async function(reqId) {
  const req = allDeleteRequests[reqId]; if(!req) return;
  await update(ref(db,'deleteRequests/'+reqId),{status:'rejected',rejectedBy:CN,rejectedAt:Date.now()});
  if(window.sendNotificationTo)
    window.sendNotificationTo(req.requestedByUid,'❌ বিক্রয় মুছার আবেদন বাতিল',
      `${req.saleData?.shop} — ${req.saleData?.product} মুছার আবেদন বাতিল করা হয়েছে।`,'sale');
  showToast('আবেদন বাতিল করা হয়েছে');
};

// Delete requests render — Admin এর জন্য
function renderDeleteRequests() {
  const el = document.getElementById('deleteRequestList'); if(!el) return;
  const pending = Object.entries(allDeleteRequests||{})
    .filter(([,r])=>r.status==='pending')
    .sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));
  if(!pending.length){ el.innerHTML='<div class="empty">কোনো আবেদন নেই</div>'; return; }
  el.innerHTML = pending.map(([id,r])=>`
    <div style="background:var(--card);border:1px solid var(--border-l);border-radius:12px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <div style="font-size:13px;font-weight:700;">🗑️ ${r.saleData?.shop||'–'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">
            📦 ${r.saleData?.product} × ${r.saleData?.qty} · ৳${Math.round(r.saleData?.total||0).toLocaleString('bn-BD')}
          </div>
          <div style="font-size:11px;color:var(--muted);">📅 ${r.saleData?.date||''} · 👤 ${r.requestedBy||''}</div>
          <div style="font-size:11px;color:var(--accent);margin-top:3px;">💬 কারণ: ${r.reason||''}</div>
        </div>
        <span style="font-size:9px;background:rgba(245,158,11,.15);color:var(--accent);
          padding:2px 8px;border-radius:5px;border:1px solid var(--accent);font-weight:700;">অপেক্ষমান</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="approveDeleteRequest('${id}')"
          style="flex:1;padding:7px;background:rgba(239,68,68,.12);border:1px solid var(--red);
          color:var(--red);border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;">
          ✅ অনুমোদন (মুছুন)
        </button>
        <button onclick="rejectDeleteRequest('${id}')"
          style="flex:1;padding:7px;background:var(--surface);border:1px solid var(--border);
          color:var(--muted);border-radius:8px;cursor:pointer;font-family:inherit;font-size:12px;">
          ❌ বাতিল
        </button>
      </div>
    </div>`).join('');
}

// EXPENSE
window.addExpense=async()=>{
  const date=$('eDate').value,type=$('eType').value,amount=parseFloat($('eAmt').value);
  if(!date||!amount){showToast('তথ্য দিন!',true);return;}
  const status=(CR==='worker'&&amount>250)?'pending':'approved';
  const expData={date,type,amount,note:$('eNote').value.trim(),uid:CU.uid,workerName:CN,status,ts:Date.now()};
  try {
    await push(ref(db,'expenses'),expData);
    $('eAmt').value='';$('eNote').value='';
    showToast(status==='pending'?'খরচ আবেদন পাঠানো হয়েছে (অনুমোদন লাগবে) ✓':'খরচ সংরক্ষিত ✓');
  } catch(e) {
    // ✅ offline fallback
    await window.saveOfflineExpense(expData);
    $('eAmt').value='';$('eNote').value='';
  }
};
window.approveExpense=async(id)=>{
  const exp=allExpenses[id];
  await update(ref(db,'expenses/'+id),{status:'approved',approvedBy:CN,approvedAt:Date.now()});
  if(exp?.uid && window.sendNotificationTo)
    window.sendNotificationTo(exp.uid,'✅ খরচ অনুমোদিত',
      `আপনার "${exp.type}" খরচ (৳${Math.round(exp.amount||0)}) অনুমোদন করা হয়েছে।`,'exp');
  showToast('খরচ অনুমোদিত ✓');
};
window.rejectExpense=async(id)=>{
  const exp=allExpenses[id];
  await update(ref(db,'expenses/'+id),{status:'rejected',rejectedBy:CN,rejectedAt:Date.now()});
  if(exp?.uid && window.sendNotificationTo)
    window.sendNotificationTo(exp.uid,'❌ খরচ বাতিল',
      `আপনার "${exp.type}" খরচের আবেদন বাতিল করা হয়েছে।`,'exp');
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
  $('allowList').innerHTML=list.length?list.map(([id,a])=>`<div class="al-card" style="display:flex;justify-content:space-between"><div><div style="font-size:13px;font-weight:600">👤 ${san(a.workerName||'')}</div><div style="font-size:11px;color:var(--muted)">🚗 ${san(a.type)} · ${fmtDate(a.from)} – ${fmtDate(a.to)}</div><div style="font-size:17px;font-weight:700;color:var(--green)">${bn(a.amount)}/দিন</div></div><button class="del-btn" onclick="delAllow('${id}')">মুছুন</button></div>`).join(''):'<div class="empty">নেই</div>';
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
    const custInfo=cust?`<div style="font-size:11px;color:var(--muted);margin-top:2px">📱 ${cust.waNum||cust.smsNum||'–'} ${cust.owner?'· '+san(cust.owner):''}</div>`:'';
    const uniqueIdTag=cust?.uniqueId?`<span style="font-size:9px;color:var(--muted);background:var(--surface);padding:1px 6px;border-radius:4px;border:1px solid var(--border);margin-left:6px;">${cust.uniqueId}</span>`:'';
    const workerInfo=`<div style="font-size:11px;color:var(--blue);margin-top:2px">👤 ${[...d.workers].join(', ')||'–'}</div>`;
    return `<div class="due-card">
      <div style="font-size:14px;font-weight:600">🏪 ${san(shop)} ${uniqueIdTag}</div>
      ${custInfo}${workerInfo}
      <div style="font-size:20px;font-weight:700;color:var(--purple);margin:4px 0">${bn(d.total)}</div>
      <button class="pay-btn" onclick="openPayMo('${shop}',${d.total})">💰 পেমেন্ট গ্রহণ</button>
    </div>`;
  }).join(''):'<div class="empty" style="margin-top:40px"><div class="ic">🎉</div>কোনো বাকি নেই!</div>';
  // কর্মীর নিজের বাকির সারসংক্ষেপ
  const myDueEl=$('myDueSummary');
  if(myDueEl&&CR==='worker'){
    const myDue=(_sc.byUid[CU?.uid]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
    myDueEl.innerHTML=myDue>0?`<div style="background:rgba(232,93,74,.1);border:1px solid var(--red);border-radius:10px;padding:12px;margin-bottom:12px"><div style="font-size:13px;font-weight:600;color:var(--red)">⚠️ আমার দেওয়া বাকি: ${bn(myDue)}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">এই বাকি তোলা না হলে কমিশন যোগ হবে না</div></div>`:'';
  }
}
window.openPayMo=(shop,due)=>{payShop=shop;$('pmShop').value=shop;$('pmDue').value=due;$('pmPay').value='';openMo('payMo');};
window.collectPay=async()=>{
  const pay=parseFloat($('pmPay').value);
  if(!pay||pay<=0){showToast('পরিমাণ লিখুন!',true);return;}

  // ✅ মোট বাকি বের করি
  const totalDue=Object.values(allSales)
    .filter(s=>s.shop===payShop&&s.due>0)
    .reduce((a,s)=>a+s.due,0);
  if(pay>totalDue){
    showToast(`সর্বোচ্চ ${bn(totalDue)} পরিশোধ করা যাবে!`,true);return;
  }

  let rem=pay;const updates={};
  const paidSaleIds=[];
  Object.entries(allSales).forEach(([id,s])=>{
    if(s.shop===payShop&&s.due>0&&rem>0){
      const r=Math.min(s.due,rem);
      const newDue=Math.round(s.due-r);
      updates['sales/'+id+'/due']=newDue;
      // ✅ বাকি শূন্য হলে payStatus 'paid' করি
      if(newDue===0) updates['sales/'+id+'/payStatus']='paid';
      // ✅ কে পেমেন্ট নিলো রেকর্ড করি
      updates['sales/'+id+'/lastPayBy']=CN;
      updates['sales/'+id+'/lastPayRole']=CR;
      updates['sales/'+id+'/lastPayAt']=Date.now();
      paidSaleIds.push(id);
      rem-=r;
    }
  });
  // ✅ পেমেন্ট লগ — কোন কোন sale-এর বাকি আদায় হলো সেটা save
  await push(ref(db,'paymentLogs'),{
    shop:payShop, amount:pay, collectedBy:CN,
    collectedByUid:CU.uid, role:CR,
    saleIds:paidSaleIds,
    ts:Date.now(), date:today()
  });
  await update(ref(db),updates);
  // পেমেন্ট গ্রহণের notification — বিক্রয়কারী কর্মীদের জানাই
  if(window.sendNotificationTo){
    const notifiedWorkers=new Set();
    paidSaleIds.forEach(sid=>{
      const s=allSales[sid];
      if(s?.uid && s.uid!==CU.uid && !notifiedWorkers.has(s.uid)){
        notifiedWorkers.add(s.uid);
        window.sendNotificationTo(s.uid,'💰 পেমেন্ট গ্রহণ',
          `${payShop} থেকে ৳${Math.round(pay).toLocaleString('bn-BD')} পেমেন্ট নেওয়া হয়েছে।`,'due');
      }
    });
  }
  closeMo('payMo');
  showToast('✅ পেমেন্ট গ্রহণ হয়েছে — '+bn(pay));
  // ✅ পেমেন্ট Receipt দেখাই
  showPaymentReceipt(payShop, pay, paidSaleIds);
};

// ✅ পেমেন্ট Receipt দেখানো
function showPaymentReceipt(shop, amount, saleIds) {
  const ic=$('invoiceContent');if(!ic)return;
  const now=new Date();
  const timeStr=now.toLocaleString('bn-BD',{hour:'2-digit',minute:'2-digit',hour12:true});
  const dateStr=now.toISOString().split('T')[0];

  // কোন কোন বিক্রয়ের বাকি পরিশোধ হলো
  const relatedSales=saleIds.map(id=>allSales[id]).filter(Boolean);
  const salesHTML=relatedSales.map(s=>`
    <div style="display:flex;justify-content:space-between;font-size:11px;
      padding:4px 0;border-bottom:1px dashed #e2e8f0;color:#64748b;">
      <span>${s.product} × ${s.qty} (${fmtDate(s.date)})</span>
      <span style="color:#059669;">আদায় ✓</span>
    </div>`).join('');

  // Receipt নম্বর
  const receiptNo = `RCP-${now.getFullYear()}-${Date.now().toString().slice(-5)}`;

  ic.innerHTML=`
  <div style="font-family:'Hind Siliguri',Arial,sans-serif;padding:16px;color:#1a202c;max-width:400px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#065f46,#059669);color:#fff;
      padding:16px;border-radius:10px;margin-bottom:14px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;
        background:rgba(255,255,255,0.08);border-radius:50%;"></div>
      <div style="font-size:18px;font-weight:800;">💰 NovaTEch BD</div>
      <div style="font-size:11px;opacity:.75;margin-top:2px;">বাকি আদায়ের রশিদ</div>
      <div style="margin-top:10px;background:rgba(255,255,255,0.15);border-radius:6px;
        padding:6px 10px;display:inline-block;">
        <div style="font-size:10px;opacity:.75;">Receipt No.</div>
        <div style="font-size:15px;font-weight:800;letter-spacing:1px;">${receiptNo}</div>
      </div>
    </div>

    <!-- দোকান ও তারিখ -->
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;
      background:#f8fafc;border-radius:8px;padding:10px 12px;">
      <div>
        <div style="font-size:10px;color:#64748b;margin-bottom:2px;">দোকান</div>
        <div style="font-weight:700;font-size:14px;">${shop}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#64748b;margin-bottom:2px;">তারিখ ও সময়</div>
        <div style="font-weight:600;font-size:12px;">${fmtDate(dateStr)}</div>
        <div style="font-size:10px;color:#94a3b8;">${timeStr}</div>
      </div>
    </div>

    <!-- সম্পর্কিত বিক্রয় -->
    ${relatedSales.length?`<div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-size:10px;color:#64748b;font-weight:700;margin-bottom:6px;text-transform:uppercase;">আদায়কৃত বিক্রয়</div>
      ${salesHTML}
    </div>`:''}

    <!-- মোট আদায় -->
    <div style="background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:10px;
      padding:14px;text-align:center;margin-bottom:10px;">
      <div style="font-size:11px;color:#065f46;margin-bottom:4px;">মোট আদায়কৃত পরিমাণ</div>
      <div style="font-size:28px;font-weight:800;color:#059669;">${bn(amount)}</div>
      <div style="font-size:11px;color:#6ee7b7;margin-top:2px;">✅ সম্পূর্ণ পরিশোধ</div>
    </div>

    <!-- আদায়কারী -->
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;
      padding:8px 0;border-top:1px solid #e2e8f0;margin-bottom:8px;">
      <span>👤 আদায়কারী: <b>${CN}</b></span>
      <span>🔐 ${CR==='admin'?'অ্যাডমিন':CR==='manager'?'ম্যানেজার':'কর্মী'}</span>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:10px;color:#94a3b8;padding-top:8px;
      border-top:1px dashed #e2e8f0;">
      আমাদের সাথে যুক্ত হবার জন্য আপনাকে ধন্যবাদ
    </div>
  </div>`;
  openMo('invoiceMo');
}

// ✅ Worker Route Status — Admin/Manager দেখবে কোন কর্মী কোন route-এ
function renderWorkerRouteStatus() {
  const section = document.getElementById('workerRouteSection');
  const el = document.getElementById('workerRouteList');
  if(!section||!el) return;

  // Worker/Manager শুধু নিজের route দেখবে
  if(CR==='worker'){ section.style.display='none'; return; }
  section.style.display='block';

  const todayStr = today();

  // Manager হলে শুধু তার টিমের কর্মী
  let allowedUids = null;
  if(CR==='manager'){
    const myTeam=Object.values(allTeams||{}).find(t=>t.leaderId===CU?.uid);
    if(myTeam?.members?.length) allowedUids=new Set(myTeam.members);
  }

  // সব worker/manager status বের করি
  const workerEntries = Object.entries(allUsers||{})
    .filter(([uid,u])=>{
      if(u.role!=='worker'&&u.role!=='manager') return false;
      if(allowedUids && !allowedUids.has(uid)) return false;
      return true;
    });

  if(!workerEntries.length){
    el.innerHTML='<div class="empty">কোনো কর্মী নেই</div>';
    return;
  }

  el.innerHTML=workerEntries.map(([uid,u])=>{
    const status=allWorkerStatus[uid]?.activeRoute;
    const isToday=status?.date===todayStr;
    const route=isToday?allRoutes[status?.routeId]:null;

    // এই route-এ আজ কতটা ভিজিট হয়েছে
    const visitCount=isToday?(_sc.byUid[uid]||[]).filter(s=>s.date===todayStr&&s.routeId===status?.routeId).length:0;
    const totalShops=isToday?Object.values(allCustomers||{}).filter(c=>c.routeId===status?.routeId).length:0;

    // Check-in status
    const todayAtt=Object.values(allAttendance||{}).find(a=>a.uid===uid&&a.date===todayStr);
    const isCheckedIn=todayAtt&&!todayAtt.checkOut;
    const startTime=isToday&&status?.startedAt?new Date(status.startedAt).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'}):'';

    return`<div style="background:var(--card);border-radius:var(--r);border:1px solid var(--border-l);
      padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">

      <!-- ছবি -->
      <div style="position:relative;flex-shrink:0;">
        <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;
          background:linear-gradient(135deg,var(--primary),var(--blue));
          display:flex;align-items:center;justify-content:center;font-size:20px;
          border:2px solid var(--border-l);">
          ${u.photoURL?`<img src="${u.photoURL}" style="width:44px;height:44px;object-fit:cover;">`:'👤'}
        </div>
        <div style="position:absolute;bottom:1px;right:1px;width:10px;height:10px;
          background:${isCheckedIn?'var(--green)':isToday?'var(--accent)':'var(--muted)'};
          border-radius:50%;border:2px solid var(--card);"></div>
      </div>

      <!-- তথ্য -->
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;">${u.name}</div>
        ${isToday&&route?`
          <div style="font-size:11px;color:var(--blue);font-weight:600;margin-top:2px;">
            🗺️ ${route.name}
            ${startTime?`<span style="color:var(--muted);font-weight:400;"> · শুরু ${startTime}</span>`:''}
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">
            ✅ ${visitCount}/${totalShops} ভিজিট সম্পন্ন
          </div>
        `:`<div style="font-size:11px;color:var(--muted);margin-top:2px;">
          ${isCheckedIn?'চেক-ইন আছে কিন্তু রুট শুরু করেনি':'আজ রুট শুরু করেনি'}
        </div>`}
      </div>

      <!-- Progress -->
      ${isToday&&totalShops>0?`
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:16px;font-weight:800;color:${visitCount>=totalShops?'var(--green)':'var(--accent)'};">
            ${Math.round(visitCount/totalShops*100)}%
          </div>
          <div style="font-size:9px;color:var(--muted);">সম্পন্ন</div>
        </div>
      `:`<div style="font-size:18px;color:var(--muted);">–</div>`}
    </div>`;
  }).join('');
}
window.renderWorkerRouteStatus=renderWorkerRouteStatus;
window.goToSaleWithCust = function(custId) {
  showPage('sale'); setActiveTab('sale');
  setTimeout(() => {
    const sel = document.getElementById('sShopSel');
    if (!sel) return;
    Array.from(sel.options).forEach(o => { o.selected = o.value === custId; });
    if (typeof calcSaleSummary === 'function') calcSaleSummary();
    if (typeof updateSMSInfo === 'function') updateSMSInfo();
  }, 400);
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
  const prodName=allProducts[prodId].name;
  await push(ref(db,'stockAssign'),{uid,workerName:allUsers[uid]?.name,prodId,prodName,qty,date:today(),assignedBy:CN,ts:Date.now()});
  if(window.sendNotificationTo)
    window.sendNotificationTo(uid,'📦 স্টক বরাদ্দ',
      `আপনাকে ${prodName} — ${qty} পিস বরাদ্দ দেওয়া হয়েছে।`,'stock');
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
  Object.values(allProducts).forEach(p=>{pm[p.name]={in:0,assigned:0,sold:0,available:0};});

  // গুদামে মোট আসা
  Object.values(allStock).forEach(s=>{
    if(!pm[s.prodName])pm[s.prodName]={in:0,assigned:0,sold:0,available:0};
    pm[s.prodName].in+=s.qty||0;
  });

  // মোট বিক্রয়
  Object.values(allSales).forEach(s=>{
    if(!pm[s.product])pm[s.product]={in:0,assigned:0,sold:0,available:0};
    pm[s.product].sold+=s.qty||0;
  });

  // কর্মীদের বর্তমান বরাদ্দ (বিক্রয় বাদ দিয়ে নয়, raw assign)
  Object.values(allStockAssign).forEach(s=>{
    if(!pm[s.prodName])pm[s.prodName]={in:0,assigned:0,sold:0,available:0};
    pm[s.prodName].assigned+=s.qty||0;
  });

  // ✅ গুদামে প্রকৃত মজুদ = মোট আসা - মোট বিক্রয়
  Object.values(pm).forEach(p=>{
    p.available=Math.max(0, p.in - p.sold);
  });

  $('stockSummary').innerHTML=Object.entries(pm).map(([name,s])=>{
    const low=s.available<=5&&s.in>0;
    return`<div class="stock-card${low?' low':''}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:13px;font-weight:600">📦 ${name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">
            আসা: ${s.in} · বিক্রয়: ${s.sold} · বিতরণ: ${s.assigned}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:26px;font-weight:700;color:${low?'var(--red)':'var(--green)'};">${s.available}</div>
          <div style="font-size:10px;color:var(--muted)">গুদামে</div>
        </div>
      </div>
      ${low?'<div style="font-size:11px;color:var(--red);margin-top:5px">⚠️ স্টক কম!</div>':''}
    </div>`;
  }).join('')||'<div class="empty">স্টক নেই</div>';
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
    // ✅ Live GPS Map auto-load
    setTimeout(()=>{ if(typeof window.renderLiveMap==='function') window.renderLiveMap(); }, 300);
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
    if(ll)ll.innerHTML=Object.values(lateMap).length?Object.values(lateMap).filter(l=>l.count>0).map(l=>`<div class="alert-card"><div class="an">⚠️ ${san(l.name)} · ${l.count} বার দেরিতে ${l.count>=3?'🔴 সতর্কতা!':''}</div></div>`).join(''):'<div class="empty">কোনো লেট অ্যালার্ট নেই</div>';
    // All attendance today
    const aal=$('allAttList');
    if(aal){
      const tl=Object.values(allAttendance).filter(a=>a.date===today());
      aal.innerHTML=tl.length?tl.map(a=>`<div class="att-card${a.isLate?' att-late':''}"><div style="display:flex;justify-content:space-between"><span style="font-size:13px;font-weight:600">👤 ${san(a.name)} ${a.isLate?'⚠️':''}</span>${a.isOT&&!a.otApproved?`<button style="font-size:10px;padding:3px 8px;border:1px solid var(--accent);border-radius:5px;background:none;color:var(--accent);cursor:pointer;" onclick="openOTApproval('${Object.keys(allAttendance).find(k=>allAttendance[k]===a)}')">OT অনুমোদন</button>`:''}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${a.checkIn?'ইন: '+fmtTime(a.checkIn):''} ${a.checkOut?'· আউট: '+fmtTime(a.checkOut):'· কাজে আছেন'}</div></div>`).join(''):'<div class="empty">আজ কেউ চেক-ইন করেনি</div>';
    }
  }
}
window.openOTApproval=id=>{
  const a=allAttendance[id];if(!a)return;currentOTId=id;
  $('otBody').innerHTML=`<div class="al-card"><div style="font-size:14px;font-weight:600">👤 ${san(a.name)}</div><div style="font-size:13px;color:var(--muted);margin-top:4px">মোট: ${a.totalHours} ঘণ্টা · ওভারটাইম: ${a.otHours} ঘণ্টা</div></div>`;
  openMo('overtimeMo');
};
window.approveOT=async()=>{
  if(!currentOTId)return;
  const att=allAttendance[currentOTId];
  await update(ref(db,'attendance/'+currentOTId),{otApproved:true,otApprovedBy:CN});
  if(att?.uid && window.sendNotificationTo)
    window.sendNotificationTo(att.uid,'✅ ওভারটাইম অনুমোদিত',
      'আপনার ওভারটাইম আবেদন অনুমোদন করা হয়েছে।','salary');
  closeMo('overtimeMo');showToast('ওভারটাইম অনুমোদিত ✓');
};
window.rejectOT=async()=>{
  if(!currentOTId)return;
  const att=allAttendance[currentOTId];
  await update(ref(db,'attendance/'+currentOTId),{otApproved:false,isOT:false});
  if(att?.uid && window.sendNotificationTo)
    window.sendNotificationTo(att.uid,'❌ ওভারটাইম বাতিল',
      'আপনার ওভারটাইম আবেদন বাতিল করা হয়েছে।','salary');
  closeMo('overtimeMo');showToast('ওভারটাইম বাতিল');
};

// LEAVE
window.applyLeave=async()=>{
  const type=$('leaveType').value,from=$('leaveFrom').value,to=$('leaveTo').value,reason=$('leaveReason').value.trim();
  if(!from||!to){showToast('তারিখ দিন!',true);return;}
  await push(ref(db,'leaves'),{uid:CU.uid,name:CN,type,from,to,reason,status:'pending',ts:Date.now()});
  // Admin/Manager-কে notify করি
  if(window.sendNotificationToRole)
    window.sendNotificationToRole('manager','🏖️ ছুটির আবেদন',
      `${CN} ছুটির আবেদন করেছেন — ${type} (${from} – ${to})`,'att');
  $('leaveReason').value='';showToast('আবেদন পাঠানো ✓');
};
function renderLeaves(){
  const ll=$('leaveList');
  if(ll){
    const my=Object.entries(allLeaves).filter(([,l])=>l.uid===CU.uid).sort((a,b)=>b[1].ts-a[1].ts);
    ll.innerHTML=my.length?my.map(([,l])=>`<div class="leave-card" style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border);margin-bottom:7px;"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600">${san(l.type)}</span><span style="font-size:10px;padding:2px 8px;border-radius:5px;font-weight:600;" class="ls-${l.status}">${l.status==='pending'?'অপেক্ষায়':l.status==='approved'?'অনুমোদিত':'বাতিল'}</span></div><div style="font-size:11px;color:var(--muted);margin-top:4px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} ${l.reason?'· '+san(l.reason):''}</div></div>`).join(''):'<div class="empty">কোনো আবেদন নেই</div>';
  }
  const pl=$('pendingLeaves');
  if(pl&&CR!=='worker'){
    const pending=Object.entries(allLeaves).filter(([,l])=>l.status==='pending');
    pl.innerHTML=pending.length?pending.map(([id,l])=>`<div style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border);margin-bottom:7px;"><div style="font-size:13px;font-weight:600">👤 ${san(l.name)} · ${san(l.type)}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} · ${san(l.reason||'')}</div><div class="g2" style="margin-top:8px"><button style="padding:7px;border:1px solid var(--green);border-radius:7px;background:rgba(46,204,138,.1);color:var(--green);font-family:inherit;font-size:11px;cursor:pointer;" onclick="approveLeave('${id}')">✅ অনুমোদন</button><button style="padding:7px;border:1px solid var(--red);border-radius:7px;background:rgba(232,93,74,.1);color:var(--red);font-family:inherit;font-size:11px;cursor:pointer;" onclick="rejectLeave('${id}')">❌ বাতিল</button></div></div>`).join(''):'<div class="empty">কোনো অপেক্ষমাণ নেই</div>';
  }
}
window.approveLeave=async id=>{
  const lv=allLeaves?.[id];
  await update(ref(db,'leaves/'+id),{status:'approved',approvedBy:CN});
  if(lv?.uid && window.sendNotificationTo)
    window.sendNotificationTo(lv.uid,'✅ ছুটি অনুমোদিত','আপনার ছুটির আবেদন অনুমোদন করা হয়েছে।','att');
  showToast('ছুটি অনুমোদিত ✓');
};
window.rejectLeave=async id=>{
  const lv=allLeaves?.[id];
  await update(ref(db,'leaves/'+id),{status:'rejected',rejectedBy:CN});
  if(lv?.uid && window.sendNotificationTo)
    window.sendNotificationTo(lv.uid,'❌ ছুটি বাতিল',
      `আপনার "${lv.type}" ছুটির আবেদন (${lv.from} – ${lv.to}) বাতিল করা হয়েছে।`,'att');
  showToast('ছুটি বাতিল');
};

// SALARY & COMMISSION
function getDefaultSlabs(){
  return{slabs:[{min:0,max:6000,rate:0},{min:6001,max:12000,rate:2},{min:12001,max:16000,rate:2.5},{min:16001,max:20000,rate:3},{min:20001,max:30000,rate:3.5},{min:30001,max:999999,rate:4}],extraPer1000:0.1};
}

// ✅ কমিশন যোগ্য বিক্রয় — নগদ অথবা বাকি পুরোপুরি আদায় হয়েছে
function isCommEligible(s){
  return s.payStatus==='paid' || s.due===0 || (s.payStatus==='partial'&&s.due===0);
}

// ✅ দৈনিক বিক্রয় map বানানো — কমিশন হিসাবের জন্য
function buildDailyCommMap(sales){
  const map={};
  sales.filter(isCommEligible).forEach(s=>{
    map[s.date]=(map[s.date]||0)+(s.total||0);
  });
  return map;
}
function calcCommission(dailySale,config){
  const cfg=config||getDefaultSlabs();
  if(!dailySale||dailySale<=0)return 0;
  if(!cfg||!cfg.slabs||!Array.isArray(cfg.slabs))return 0;
  // ✅ সঠিক slab খুঁজি
  const slab=cfg.slabs.find(s=>dailySale>=s.min&&dailySale<=s.max);
  if(!slab||slab.rate===0)return 0;
  // ✅ শুধু slab rate ব্যবহার করি — extra rate নেই
  return Math.round(dailySale*slab.rate/100);
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
  const workerView=$('workerSalaryView');
  const adminForms=['setSalaryForm','otRequestForm'];
  const now=new Date();
  const curMonth=now.getMonth(), curYear=now.getFullYear();

  // ── Worker — শুধু নিজের বেতন
  if(CR==='worker'){
    if(workerView)workerView.style.display='block';
    adminForms.forEach(id=>{const el=$(id);if(el)el.style.display='none';});
    const sal=allSalaries[CU?.uid];
    const det=$('workerSalaryDetail');
    if(det&&sal){
      const mySales=(_sc.byUid[CU?.uid]||[]).filter(s=>{const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;});
      const comm=Math.round(Object.values(buildDailyCommMap(mySales)).reduce((a,v)=>a+calcCommission(v,allCommConfig||getDefaultSlabs()),0));
      const attDays=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===CU.uid&&d.getMonth()===curMonth;}).length;
      det.innerHTML=`
        <div class="rb"><div class="rr"><span class="rn">💵 মূল বেতন</span><span class="rv">${bn(sal.basic)}/মাস</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">🏆 কমিশন (এই মাস)</span><span class="rv" style="color:var(--accent)">${bn(comm)}</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">📅 উপস্থিতি</span><span class="rv">${attDays} দিন</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">🎯 মাসিক টার্গেট</span><span class="rv">${bn(sal.monthlyTarget||0)}</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">⏰ শিফট</span><span class="rv">${sal.shiftStart||'10:00'} – ${sal.shiftEnd||'17:50'}</span></div></div>
        <div style="margin-top:12px;">
          <button onclick="generateSalarySlip()" style="width:100%;padding:10px;background:linear-gradient(135deg,var(--primary),var(--blue));border:none;border-radius:10px;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">
            🧾 বেতন Slip দেখুন
          </button>
        </div>`;
    } else if(det){
      det.innerHTML='<div class="empty">বেতন তথ্য নেই</div>';
    }
    const cfg=allCommConfig||getDefaultSlabs();
    const cw=$('commSlabsWorker');
    if(cw){
      const slabs=cfg.slabs||getDefaultSlabs().slabs;
      cw.innerHTML=`<table style="width:100%;border-collapse:collapse;"><tr style="font-size:11px;color:var(--muted);"><th style="text-align:left;padding:6px;">বিক্রয়</th><th style="text-align:right;padding:6px;">কমিশন %</th></tr>${slabs.map(s=>`<tr style="border-top:1px solid var(--border)"><td style="padding:8px 6px;font-size:12px;">${s.max===999999?bn(s.min)+'+':bn(s.min)+' – '+bn(s.max)}</td><td style="padding:8px 6px;font-size:14px;font-weight:700;text-align:right;color:${s.rate===0?'var(--muted)':'var(--accent)'};">${s.rate}%</td></tr>`).join('')}</table>`;
    }
    // Worker-এর salary summary
    const el=$('salarySummary');if(!el)return;
    const sal2=allSalaries[CU.uid];
    if(!sal2){el.innerHTML='<div class="empty">বেতন তথ্য নেই</div>';return;}
    const myS=(_sc.byUid[CU.uid]||[]).filter(s=>{const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear&&isCommEligible(s);});
    const comm2=Math.round(Object.values(buildDailyCommMap(myS)).reduce((a,v)=>a+calcCommission(v,allCommConfig||getDefaultSlabs()),0));
    const att2=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===CU.uid&&d.getMonth()===curMonth&&d.getFullYear()===curYear;}).length;
    const earnedBasic2=Math.round((sal2.basic||0)/26*att2);
    const net2=earnedBasic2+comm2;
    el.innerHTML=`<div class="salary-card">
      <div style="font-size:14px;font-weight:700">👤 আমার বেতন সারসংক্ষেপ</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">উপস্থিতি: ${att2} দিন · শিফট: ${sal2.shiftStart||'10:00'} — ${sal2.shiftEnd||'17:50'}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px;background:var(--surface);border-radius:8px;padding:8px;">
        <div style="display:flex;justify-content:space-between;"><span>মূল বেতন:</span><span>${bn(earnedBasic2)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px"><span>কমিশন:</span><span style="color:var(--accent)">${bn(comm2)}</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
        <span style="font-size:13px;font-weight:600">নেট বেতন</span>
        <span style="font-size:20px;font-weight:700;color:var(--green)">${bn(net2)}</span>
      </div>
    </div>`;
    return;
  }

  // ── Manager — নিজের + টিমের বেতন
  if(CR==='manager'){
    if(workerView)workerView.style.display='block';
    adminForms.forEach(id=>{const el=$(id);if(el)el.style.display='none';});
    // নিজের salary detail
    const sal=allSalaries[CU?.uid];
    const det=$('workerSalaryDetail');
    if(det&&sal){
      const mySales=(_sc.byUid[CU?.uid]||[]).filter(s=>{const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;});
      const comm=Math.round(Object.values(buildDailyCommMap(mySales)).reduce((a,v)=>a+calcCommission(v,allCommConfig||getDefaultSlabs()),0));
      const attDays=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===CU.uid&&d.getMonth()===curMonth;}).length;
      det.innerHTML=`
        <div class="rb"><div class="rr"><span class="rn">💵 মূল বেতন</span><span class="rv">${bn(sal.basic)}/মাস</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">🏆 কমিশন</span><span class="rv" style="color:var(--accent)">${bn(comm)}</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">📅 উপস্থিতি</span><span class="rv">${attDays} দিন</span></div></div>
        <div style="margin-top:10px;">
          <button onclick="generateSalarySlip()" style="width:100%;padding:9px;background:linear-gradient(135deg,var(--primary),var(--blue));border:none;border-radius:10px;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">🧾 আমার বেতন Slip</button>
        </div>`;
    } else if(det){
      det.innerHTML='<div class="empty">বেতন তথ্য নেই</div>';
    }
    renderCommSlabs();
    // টিমের কর্মীদের বেতন
    const myTeam=Object.values(allTeams||{}).find(t=>t.leaderId===CU?.uid);
    const members=myTeam?.members||[];
    const el=$('salarySummary');if(!el)return;
    if(!members.length){el.innerHTML='<div class="empty">টিমে কোনো কর্মী নেই</div>';return;}
    _renderSalaryCards(el, members, now, curMonth, curYear);
    return;
  }

  // ── Admin — সবার বেতন
  if(workerView)workerView.style.display='none';
  adminForms.forEach(id=>{const el=$(id);if(el)el.style.display='block';});
  renderCommSlabs();
  const el=$('salarySummary');if(!el)return;
  const allWorkerUids=Object.entries(allUsers).filter(([,u])=>u.role==='worker'||u.role==='manager').map(([uid])=>uid);
  if(!allWorkerUids.length){el.innerHTML='<div class="empty">কোনো কর্মী নেই</div>';return;}
  _renderSalaryCards(el, allWorkerUids, now, curMonth, curYear);
}
// ✅ Salary cards helper — Admin ও Manager উভয় ব্যবহার করবে
function _renderSalaryCards(el, uids, now, curMonth, curYear) {
  // Pre-compute attendance
  const attByUid={}, otByUid={};
  Object.values(allAttendance).forEach(a=>{
    const d=new Date(a.date);
    if(d.getMonth()===curMonth&&d.getFullYear()===curYear){
      if(!attByUid[a.uid]) attByUid[a.uid]=0;
      attByUid[a.uid]++;
      if(a.isOT&&a.otApproved){
        if(!otByUid[a.uid]) otByUid[a.uid]=0;
        otByUid[a.uid]+=parseFloat(a.otHours||0);
      }
    }
  });
  // Allowances
  const allowByUid={};
  Object.values(allAllowances||{}).forEach(a=>{
    const from=new Date(a.from),to=new Date(a.to);
    let days=0;
    for(let d=new Date(from);d<=to;d.setDate(d.getDate()+1)){
      if(d.getMonth()===curMonth&&d.getFullYear()===curYear&&d.getDay()!==5) days++;
    }
    allowByUid[a.uid]=(allowByUid[a.uid]||0)+(a.amount*days);
  });

  el.innerHTML=uids.map(uid=>{
    const u=allUsers[uid];if(!u)return'';
    const sal=allSalaries[uid];
    const basic=sal?.basic||0, target=sal?.monthlyTarget||0;
    const shiftH=parseFloat(sal?.shiftHours)||8;
    const attDays=attByUid[uid]||0;
    const otHours=otByUid[uid]||0;
    const allowance=Math.round(allowByUid[uid]||0);
    const mySales=(_sc.byUid[uid]||[]).filter(s=>{const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear&&isCommEligible(s);});
    const totalSaleAmt=mySales.reduce((a,b)=>a+(b.total||0),0);
    const comm=Math.round(Object.values(buildDailyCommMap(mySales)).reduce((a,v)=>a+calcCommission(v,allCommConfig||getDefaultSlabs()),0));
    const earnedBasic=Math.round(basic/26*attDays);
    const otPay=Math.round(basic/(26*shiftH)*otHours*1.5);
    const net=earnedBasic+comm+otPay+allowance;
    const targetPct=target>0?Math.min((totalSaleAmt/target*100),100).toFixed(0):0;
    const targetColor=targetPct>=100?'var(--green)':targetPct>=60?'var(--accent)':'var(--red)';

    return`<div class="salary-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:14px;font-weight:700">👤 ${u.name}</div>
        <span class="role-badge role-${u.role}" style="font-size:9px;">${u.role==='worker'?'কর্মী':'ম্যানেজার'}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
        শিফট: ${sal?.shiftStart||'–'} – ${sal?.shiftEnd||'–'} · উপস্থিতি: ${attDays} দিন
      </div>
      ${target>0?`<div style="margin:6px 0 4px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:3px;">
          <span>🎯 ${bn(totalSaleAmt)} / ${bn(target)}</span>
          <span style="color:${targetColor};font-weight:700;">${targetPct}%</span>
        </div>
        <div style="background:var(--border);border-radius:3px;height:4px;overflow:hidden;">
          <div style="width:${targetPct}%;height:100%;background:${targetColor};border-radius:3px;"></div>
        </div>
      </div>`:''}
      <div style="font-size:12px;color:var(--muted);margin-top:6px;background:var(--surface);border-radius:8px;padding:8px;">
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>মূল বেতন (${attDays}/২৬ দিন):</span><span>${bn(earnedBasic)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>কমিশন:</span><span style="color:var(--accent)">${bn(comm)}</span></div>
        ${otPay>0?`<div style="display:flex;justify-content:space-between;padding:3px 0;"><span>ওভারটাইম:</span><span>${bn(otPay)}</span></div>`:''}
        ${allowance>0?`<div style="display:flex;justify-content:space-between;padding:3px 0;"><span>ভাতা:</span><span>${bn(allowance)}</span></div>`:''}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
        <span style="font-size:13px;font-weight:600;">নেট বেতন</span>
        <span class="salary-total">${bn(net)}</span>
      </div>
    </div>`;
  }).join('');
}

// TEAMS

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
  const now=new Date();
  const curMonth=now.getMonth(), curYear=now.getFullYear();
  const todayStr=today();
  const isManager=CR==='manager';

  // ✅ একবার attendance pre-compute
  const attByUid={}, onlineUid=new Set();
  Object.values(allAttendance).forEach(a=>{
    const d=new Date(a.date);
    if(d.getMonth()===curMonth&&d.getFullYear()===curYear)
      attByUid[a.uid]=(attByUid[a.uid]||0)+1;
    if(a.date===todayStr&&!a.checkOut) onlineUid.add(a.uid);
  });

  // Manager হলে শুধু তার টিম, Admin হলে সব
  let teamsToShow=Object.entries(allTeams);
  if(isManager){
    teamsToShow=teamsToShow.filter(([,t])=>t.leaderId===CU?.uid);
  }

  if(!teamsToShow.length){
    el.innerHTML='<div class="empty">কোনো টিম নেই</div>';return;
  }

  el.innerHTML=teamsToShow.map(([id,t])=>{
    const members=t.members||[];
    // টিমের মোট বিক্রয় এই মাসে
    const teamSale=_sc.thisMonth.filter(s=>members.includes(s.uid)||(isManager&&s.uid===CU?.uid)).reduce((a,b)=>a+(b.total||0),0);

    const membersHTML=members.map(uid=>{
      const u=allUsers[uid];if(!u)return'';
      const mSales=(_sc.byUid[uid]||[]).filter(s=>{
        const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;
      });
      const mTotal=mSales.reduce((a,b)=>a+(b.total||0),0);
      const attCount=attByUid[uid]||0;
      const myDue=(_sc.byUid[uid]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
      const sal=allSalaries[uid];
      const target=sal?.monthlyTarget||0;
      const targetPct=target>0?Math.min((mTotal/target)*100,100).toFixed(0):0;
      const targetColor=targetPct>=100?'var(--green)':targetPct>=60?'var(--accent)':'var(--red)';
      const isOnline=onlineUid.has(uid);

      return`<div style="background:var(--card);border-radius:var(--r);border:1px solid var(--border-l);
        margin-bottom:8px;overflow:hidden;">

        <!-- Profile row -->
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;"
          onclick="viewWorkerProfile('${uid}')">
          <div style="position:relative;flex-shrink:0;">
            <div style="width:46px;height:46px;border-radius:50%;overflow:hidden;
              background:linear-gradient(135deg,var(--primary),var(--blue));
              display:flex;align-items:center;justify-content:center;font-size:20px;
              border:2px solid var(--border-l);">
              ${u.photoURL?`<img src="${u.photoURL}" style="width:46px;height:46px;object-fit:cover;">`:'👤'}
            </div>
            <div style="position:absolute;bottom:1px;right:1px;width:10px;height:10px;
              background:${isOnline?'var(--green)':'var(--muted)'};border-radius:50%;
              border:2px solid var(--card);"></div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;">${u.name}</div>
            <div style="font-size:10px;color:var(--muted);">
              ${u.waNum?`📱 ${u.waNum}`:''}
              ${isOnline?'<span style="color:var(--green);font-weight:600;margin-left:4px;">● চেক-ইন</span>':''}
            </div>
          </div>
          <div style="font-size:18px;color:var(--muted);">›</div>
        </div>

        <!-- Stats -->
        <div style="display:flex;border-top:1px solid var(--border);background:var(--surface);">
          <div style="flex:1;text-align:center;padding:6px 4px;border-right:1px solid var(--border);">
            <div style="font-size:11px;font-weight:700;color:var(--blue);">${bn(mTotal)}</div>
            <div style="font-size:9px;color:var(--muted);">বিক্রয়</div>
          </div>
          <div style="flex:1;text-align:center;padding:6px 4px;border-right:1px solid var(--border);">
            <div style="font-size:11px;font-weight:700;color:var(--green);">${attCount} দিন</div>
            <div style="font-size:9px;color:var(--muted);">উপস্থিতি</div>
          </div>
          <div style="flex:1;text-align:center;padding:6px 4px;">
            <div style="font-size:11px;font-weight:700;color:${myDue>0?'var(--red)':'var(--green)'};">${myDue>0?bn(myDue):'✅'}</div>
            <div style="font-size:9px;color:var(--muted);">বাকি</div>
          </div>
        </div>

        <!-- Target -->
        ${target>0?`<div style="padding:7px 12px;background:var(--surface);border-top:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-bottom:3px;">
            <span>🎯 ${bn(target)}</span>
            <span style="color:${targetColor};font-weight:700;">${targetPct}%</span>
          </div>
          <div style="background:var(--border);border-radius:3px;height:4px;overflow:hidden;">
            <div style="width:${targetPct}%;height:100%;background:${targetColor};border-radius:3px;"></div>
          </div>
        </div>`:''}

        <!-- Manager actions — সীমিত ক্ষমতা -->
        <div style="display:flex;border-top:1px solid var(--border);">
          <button onclick="viewWorkerProfile('${uid}')"
            style="flex:1;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
              background:rgba(59,130,246,.08);border:none;border-right:1px solid var(--border);color:var(--blue);">
            👁 প্রোফাইল
          </button>
          ${u.waNum?`<button onclick="window.open('https://wa.me/88${(u.waNum||'').replace(/[^0-9]/g,'')}','_blank')"
            style="flex:1;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
              background:rgba(37,211,102,.08);border:none;border-right:1px solid var(--border);color:#25d366;">
            💬 WA
          </button>`:''}
          <button onclick="showPage('sale');setActiveTab('sale')"
            style="flex:1;padding:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
              background:rgba(245,158,11,.08);border:none;color:var(--accent);">
            📊 বিক্রয়
          </button>
        </div>
      </div>`;
    }).join('');

    return`<div style="margin-bottom:16px;">
      <!-- টিম Header -->
      <div style="background:linear-gradient(135deg,var(--primary),var(--blue));border-radius:12px;
        padding:12px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:14px;font-weight:800;color:#fff;">👥 ${t.name}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;">
            লিডার: ${t.leaderName||'–'} · ${members.length} সদস্য
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:15px;font-weight:800;color:#fff;">${bn(teamSale)}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.6);">এই মাস</div>
        </div>
      </div>
      <!-- সদস্যরা -->
      ${membersHTML||'<div class="empty" style="margin:0;">সদস্য নেই</div>'}
      ${CR==='admin'?`<button class="del-btn" onclick="deleteTeam('${id}')" style="margin-top:4px;">টিম মুছুন</button>`:''}
    </div>`;
  }).join('');
}

// ✅ টিম মুছুন — শুধু Admin
window.deleteTeam=async id=>{if(!confirm('টিম মুছবেন?'))return;await remove(ref(db,'teams/'+id));};

// PROFILE
function renderProfile(){
  const uData=allUsers[CU?.uid]||{};
  const now=new Date();

  // ── ছবি আপডেট ──
  const img=$('profilePhoto'),icon=$('profilePhotoIcon');
  if(uData?.photoURL&&img){
    img.src=uData.photoURL;img.style.display='block';img.style.position='relative';img.style.zIndex='1';
    if(icon)icon.style.display='none';
  } else {
    if(img)img.style.display='none';
    if(icon)icon.style.display='block';
  }

  // ── হেডার টেক্সট ──
  const roleLabel=CR==='admin'?'অ্যাডমিন':CR==='manager'?'ম্যানেজার':'কর্মী';
  const roleColor=CR==='admin'?'var(--accent)':CR==='manager'?'var(--blue-l)':'var(--green-l)';
  $('pName').textContent=CN;
  $('pRole').innerHTML=`<span class="role-badge role-${CR}" style="font-size:10px">${roleLabel}</span>`;
  $('pMeta').innerHTML=`📧 ${uData.email||'–'} &nbsp;|&nbsp; 📞 ${uData.waNum||uData.phone||'–'}`;
  $('pEditName').value=CN;
  if($('pEditWa'))$('pEditWa').value=uData.waNum||'';

  // ── হেডার গ্রেডিয়েন্ট role অনুযায়ী ──
  const hero=$('profileHeroCard');
  if(hero){
    const grad=CR==='admin'
      ?'linear-gradient(135deg,#92400e,#d97706)'
      :CR==='manager'
      ?'linear-gradient(135deg,#4c1d95,#6d28d9)'
      :'linear-gradient(135deg,#065f46,#059669)';
    hero.style.background=grad;
  }

  // ══════════════════════════════════════
  //  ADMIN প্রোফাইল
  // ══════════════════════════════════════
  if(CR==='admin'){
    const allSalesArr=Object.values(allSales);
    const allExpsArr=Object.values(allExpenses);
    const mSales=allSalesArr.filter(s=>{const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
    const totalSale=mSales.reduce((a,b)=>a+(b.total||0),0);
    const totalDue=allSalesArr.reduce((a,b)=>a+(b.due||0),0);
    const totalExp=allExpsArr.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth();}).reduce((a,b)=>a+(b.amount||0),0);
    const workerCount=Object.values(allUsers).filter(u=>u.role==='worker').length;
    const pendingLeaves=Object.values(allLeaves).filter(l=>l.status==='pending').length;
    const pendingExp=Object.values(allExpenses).filter(e=>e.status==='pending').length;

    // Stats strip
    $('profileStatsStrip').innerHTML=`
      <div style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid var(--border);">
        <div style="font-size:18px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">${workerCount}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">কর্মী</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid var(--border);">
        <div style="font-size:14px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">${bn(totalSale)}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">এই মাস বিক্রয়</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid var(--border);">
        <div style="font-size:14px;font-weight:700;color:var(--purple);font-family:'Sora',sans-serif;">${bn(totalDue)}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">মোট বাকি</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 8px;">
        <div style="font-size:18px;font-weight:700;color:${(pendingLeaves+pendingExp)>0?'var(--red)':'var(--green)'};font-family:'Sora',sans-serif;">${pendingLeaves+pendingExp}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">অনুমোদন বাকি</div>
      </div>`;

    // Quick actions
    $('profileQuickActions').innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:4px;">
        ${[
          {ico:'📊',lbl:'রিপোর্ট',page:'report'},
          {ico:'👥',lbl:'কর্মী',page:'admin'},
          {ico:'🏦',lbl:'বাকি',page:'due'},
          {ico:'📦',lbl:'স্টক',page:'stock'},
          {ico:'💰',lbl:'বেতন',page:'salary'},
          {ico:'⚙️',lbl:'সেটিংস',page:'admin'},
        ].map(i=>`<div onclick="showPage('${i.page}');setActiveTab('${i.page}')" style="
          background:var(--card);border:1px solid var(--border-l);border-radius:12px;
          padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:5px;
          cursor:pointer;transition:all .2s;" onmousedown="this.style.transform='scale(.95)'" onmouseup="this.style.transform=''">
          <span style="font-size:22px">${i.ico}</span>
          <span style="font-size:11px;font-weight:600;color:var(--muted)">${i.lbl}</span>
        </div>`).join('')}
      </div>`;

    // Special — খরচ summary
    $('profileSpecial').innerHTML=`
      <div class="form-card" style="margin-bottom:12px;">
        <div class="sec" style="margin-top:0;">📊 এই মাসের সংক্ষেপ</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="sum-card c-sale" style="padding:12px;"><div class="lbl">বিক্রয়</div><div class="val" style="font-size:16px;">${bn(totalSale)}</div></div>
          <div class="sum-card c-exp" style="padding:12px;"><div class="lbl">খরচ</div><div class="val" style="font-size:16px;">${bn(totalExp)}</div></div>
        </div>
      </div>`;

    $('perfReport').innerHTML='';
    return;
  }

  // ══════════════════════════════════════
  //  MANAGER প্রোফাইল
  // ══════════════════════════════════════
  if(CR==='manager'){
    // আমার টিম খুঁজি
    const myTeam=Object.values(allTeams).find(t=>t.leaderId===CU.uid);
    const teamMembers=myTeam?.members||[];
    const mSales=Object.values(allSales).filter(s=>{const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
    const teamSale=mSales.filter(s=>teamMembers.includes(s.uid)||(s.uid===CU.uid)).reduce((a,b)=>a+(b.total||0),0);
    const myMonthlySale=mSales.filter(s=>s.uid===CU.uid).reduce((a,b)=>a+(b.total||0),0);
    const pendingLeaves=Object.values(allLeaves).filter(l=>l.status==='pending'&&teamMembers.includes(l.uid)).length;
    const pendingExp=Object.values(allExpenses).filter(e=>e.status==='pending'&&teamMembers.includes(e.uid)).length;
    const attToday=Object.values(allAttendance).filter(a=>a.date===today()&&teamMembers.includes(a.uid)).length;

    $('profileStatsStrip').innerHTML=`
      <div style="flex:1;text-align:center;padding:14px 6px;border-right:1px solid var(--border);">
        <div style="font-size:18px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">${teamMembers.length}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">টিম সদস্য</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 6px;border-right:1px solid var(--border);">
        <div style="font-size:14px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">${bn(teamSale)}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">টিম বিক্রয়</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 6px;border-right:1px solid var(--border);">
        <div style="font-size:18px;font-weight:700;color:${(pendingLeaves+pendingExp)>0?'var(--red)':'var(--green)'};font-family:'Sora',sans-serif;">${pendingLeaves+pendingExp}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">অনুমোদন</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 6px;">
        <div style="font-size:18px;font-weight:700;color:var(--green);font-family:'Sora',sans-serif;">${attToday}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">আজ উপস্থিত</div>
      </div>`;

    $('profileQuickActions').innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:4px;">
        ${[
          {ico:'👥',lbl:'টিম',page:'teams'},
          {ico:'📊',lbl:'রিপোর্ট',page:'report'},
          {ico:'⏰',lbl:'উপস্থিতি',page:'att'},
          {ico:'🏦',lbl:'বাকি',page:'due'},
          {ico:'📋',lbl:'ছুটি অনুমোদন',page:'att'},
          {ico:'💬',lbl:'চ্যাট',page:'chat'},
        ].map(i=>`<div onclick="showPage('${i.page}');setActiveTab('${i.page}')" style="
          background:var(--card);border:1px solid var(--border-l);border-radius:12px;
          padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:5px;
          cursor:pointer;transition:all .2s;" onmousedown="this.style.transform='scale(.95)'" onmouseup="this.style.transform=''">
          <span style="font-size:22px">${i.ico}</span>
          <span style="font-size:11px;font-weight:600;color:var(--muted);text-align:center;line-height:1.2;">${i.lbl}</span>
        </div>`).join('')}
      </div>`;

    $('profileSpecial').innerHTML=myTeam?`
      <div class="form-card" style="margin-bottom:12px;">
        <div class="sec" style="margin-top:0;">👥 আমার টিম — ${myTeam.name}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${teamMembers.map(uid=>allUsers[uid]?`
            <span style="background:var(--surface);border:1px solid var(--border);border-radius:7px;
              padding:5px 10px;font-size:11px;font-weight:600;">
              👤 ${allUsers[uid].name}
            </span>`:''
          ).join('')||'<span style="font-size:12px;color:var(--muted)">সদস্য নেই</span>'}
        </div>
      </div>`:'';

    // Manager নিজের বিক্রয় ও কমিশন
    const mySales=(_sc.byUid[CU?.uid]||[]).filter(s=>{const d=new Date(s.date);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});
    const dailyMap=buildDailyCommMap(mySales);
    const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,allCommConfig||getDefaultSlabs()),0);
    $('perfReport').innerHTML=`
      <div class="form-card" style="margin-bottom:12px;">
        <div class="sec" style="margin-top:0;">📊 আমার পারফরম্যান্স</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="sum-card c-sale" style="padding:12px;"><div class="lbl">আমার বিক্রয়</div><div class="val" style="font-size:16px;">${bn(myMonthlySale)}</div></div>
          <div class="sum-card" style="padding:12px;border-color:var(--accent);"><div class="lbl">কমিশন</div><div class="val" style="font-size:16px;color:var(--accent);">${bn(comm)}</div></div>
        </div>
      </div>`;
    return;
  }

  // ══════════════════════════════════════
  //  WORKER প্রোফাইল
  // ══════════════════════════════════════
  const mySales=(_sc.byUid[CU?.uid]||[]).filter(s=>{const d=new Date(s.date);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});
  const mySaleTotal=mySales.filter(s=>isCommEligible(s)).reduce((a,b)=>a+(b.total||0),0);
  const dailyMap=buildDailyCommMap(mySales);
  const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,allCommConfig||getDefaultSlabs()),0);
  const sal=allSalaries[CU.uid];
  const target=sal?.monthlyTarget||0;
  const targetPct=target>0?Math.min((mySaleTotal/target*100),100).toFixed(0):0;
  const targetColor=targetPct>=100?'var(--green)':targetPct>=60?'var(--accent)':'var(--red)';
  const attCount=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===CU.uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
  const lateCount=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===CU.uid&&d.getMonth()===now.getMonth()&&a.isLate;}).length;
  const todaySales=Object.values(allSales).filter(s=>s.uid===CU.uid&&s.date===today());
  const todaySaleTotal=todaySales.reduce((a,b)=>a+(b.total||0),0);
  const myDueTotal=(_sc.byUid[CU?.uid]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
  const pendingLeaves=Object.values(allLeaves).filter(l=>l.uid===CU.uid&&l.status==='pending').length;

  // Stats strip
  $('profileStatsStrip').innerHTML=`
    <div style="flex:1;text-align:center;padding:12px 6px;border-right:1px solid var(--border);">
      <div style="font-size:15px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">${bn(todaySaleTotal)}</div>
      <div style="font-size:9px;color:var(--muted);font-weight:600;margin-top:2px;">আজকের বিক্রয়</div>
    </div>
    <div style="flex:1;text-align:center;padding:12px 6px;border-right:1px solid var(--border);">
      <div style="font-size:15px;font-weight:700;color:var(--accent);font-family:'Sora',sans-serif;">${bn(comm)}</div>
      <div style="font-size:9px;color:var(--muted);font-weight:600;margin-top:2px;">কমিশন</div>
    </div>
    <div style="flex:1;text-align:center;padding:12px 6px;border-right:1px solid var(--border);">
      <div style="font-size:18px;font-weight:700;color:var(--green);font-family:'Sora',sans-serif;">${attCount}</div>
      <div style="font-size:9px;color:var(--muted);font-weight:600;margin-top:2px;">উপস্থিতি</div>
    </div>
    <div style="flex:1;text-align:center;padding:12px 6px;">
      <div style="font-size:18px;font-weight:700;color:${lateCount>0?'var(--red)':'var(--green)'};font-family:'Sora',sans-serif;">${lateCount}</div>
      <div style="font-size:9px;color:var(--muted);font-weight:600;margin-top:2px;">দেরি</div>
    </div>`;

  // Quick actions
  $('profileQuickActions').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:4px;">
      ${[
        {ico:'🛍️',lbl:'নতুন বিক্রয়',page:'sale'},
        {ico:'🗺️',lbl:'আজকের রুট',page:'route'},
        {ico:'⏰',lbl:'উপস্থিতি',page:'att'},
        {ico:'🏦',lbl:'বাকি',page:'due'},
        {ico:'📋',lbl:'ছুটির আবেদন',page:'att'},
        {ico:'💬',lbl:'চ্যাট',page:'chat'},
      ].map(i=>`<div onclick="showPage('${i.page}');setActiveTab('${i.page}')" style="
        background:var(--card);border:1px solid var(--border-l);border-radius:12px;
        padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:5px;
        cursor:pointer;transition:all .2s;" onmousedown="this.style.transform='scale(.95)'" onmouseup="this.style.transform=''">
        <span style="font-size:22px">${i.ico}</span>
        <span style="font-size:11px;font-weight:600;color:var(--muted);text-align:center;line-height:1.2;">${i.lbl}</span>
      </div>`).join('')}
    </div>`;

  // Special — টার্গেট + বেতন
  $('profileSpecial').innerHTML=`
    ${target>0?`<div class="form-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:700;">🎯 মাসিক টার্গেট</span>
        <span style="font-size:20px;font-weight:700;color:${targetColor};font-family:'Sora',sans-serif;">${targetPct}%</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">${bn(mySaleTotal)} / ${bn(target)}</div>
      <div style="background:var(--border);border-radius:6px;height:8px;overflow:hidden;">
        <div style="width:${targetPct}%;height:100%;background:linear-gradient(90deg,${targetColor},${targetColor}aa);border-radius:6px;transition:width .5s;"></div>
      </div>
    </div>`:''}
    ${sal?`<div class="form-card" style="margin-bottom:12px;">
      <div class="sec" style="margin-top:0;">💰 বেতন তথ্য</div>
      <div style="background:var(--surface);border-radius:8px;padding:10px;">
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid var(--border);">
          <span style="color:var(--muted);">মূল বেতন</span><span style="font-weight:600;">${bn(sal.basic||0)}/মাস</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid var(--border);">
          <span style="color:var(--muted);">কমিশন (এই মাস)</span><span style="font-weight:700;color:var(--accent);">${bn(comm)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;">
          <span style="color:var(--muted);">শিফট</span><span style="font-weight:600;">${sal.shiftStart||'–'} — ${sal.shiftEnd||'–'}</span>
        </div>
      </div>
    </div>`:''}
    ${myDueTotal>0?`<div style="background:rgba(239,68,68,.08);border:1px solid var(--red);border-radius:10px;padding:12px;margin-bottom:12px;">
      <div style="font-size:13px;font-weight:600;color:var(--red);">⚠️ আমার দেওয়া বাকি: ${bn(myDueTotal)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px;">এই বাকি তোলা না হলে কমিশন যোগ হবে না</div>
    </div>`:''}
    ${pendingLeaves>0?`<div style="background:rgba(245,158,11,.08);border:1px solid var(--accent);border-radius:10px;padding:10px;margin-bottom:12px;font-size:12px;color:var(--accent);font-weight:600;">
      ⏳ ${pendingLeaves}টি ছুটির আবেদন অনুমোদন অপেক্ষায়
    </div>`:''}`;

  // Performance ranking
  const allWorkerSales={};
  Object.values(allSales).filter(s=>{const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).forEach(s=>{allWorkerSales[s.uid]=(allWorkerSales[s.uid]||0)+s.total;});
  const maxSale=Math.max(...Object.values(allWorkerSales),1);
  const myRank=Object.values(allWorkerSales).sort((a,b)=>b-a).indexOf(allWorkerSales[CU.uid]||0)+1;
  const totalWorkers=Object.values(allUsers).filter(u=>u.role==='worker'||u.role==='manager').length;
  $('perfReport').innerHTML=`
    <div class="form-card" style="margin-bottom:12px;">
      <div class="sec" style="margin-top:0;">📊 পারফরম্যান্স</div>
      <div class="rb"><div class="rr"><span class="rn">📊 এই মাসের বিক্রয়</span><span class="rv">${bn(mySaleTotal)}</span></div>
        <div class="bar-t"><div class="bar-f" style="width:${((allWorkerSales[CU.uid]||0)/maxSale*100).toFixed(0)}%"></div></div></div>
      <div class="rb"><div class="rr"><span class="rn">🏆 দলে র‍্যাংক</span><span class="rv">${myRank} / ${totalWorkers}</span></div></div>
      <div class="rb"><div class="rr"><span class="rn">📅 উপস্থিতি</span><span class="rv">${attCount} দিন</span></div></div>
      <div class="rb"><div class="rr"><span class="rn">🛍️ আজকের বিক্রয়</span><span class="rv">${todaySales.length}টি অর্ডার</span></div></div>
    </div>`;

  // myDueSummary clear করি (আগের version-এ ছিল)
  const myDueEl=$('myDueSummary');
  if(myDueEl)myDueEl.innerHTML='';
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
  if(CR==='admin'){
    $('rNet').textContent=bn(tp-te);
    $('rNet').style.color=(tp-te)>=0?'var(--green)':'var(--red)';
  } else {
    $('rNet').textContent='—';
    $('rNet').style.color='var(--muted)';
  }
  $('rSale').textContent=bn(ts);
  // নিট লাভ কার্ড — শুধু Admin দেখবে
  const rNetCard=$('rNetCard');
  if(rNetCard) rNetCard.style.display=CR==='admin'?'block':'none';
  const rSaleCard=document.querySelector('#page-report .c-sale');
  if(rSaleCard) rSaleCard.style.gridColumn=CR==='admin'?'':'1 / -1';
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

  // ✅ P&L Section — শুধু Admin দেখবে
  const plSec=$('plSection');
  if(plSec) plSec.style.display=CR==='admin'?'block':'none';
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
  $('prodChips').innerHTML=Object.entries(allProducts).map(([id,p])=>`<span class="prod-chip">${san(p.name)} ক্রয়:${bn(p.buyPrice)} বিক্রয়:${bn(p.sellPrice)} ছাড়:${p.maxDisc||0}%<button class="chip-del" onclick="delProd('${id}')">✕</button></span>`).join('');
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
      const result=await uploadDocToDrive(doc);
      if(result){const {url,fileId}=typeof result==='object'?result:{url:result,fileId:null};docLinks.push({name:doc.name,url,fileId,type:doc.type,uploadedAt:Date.now()});}
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
  const now=new Date();
  const curMonth=now.getMonth(), curYear=now.getFullYear();
  const todayStr=today();

  // ✅ একবার attendance pre-compute করি — loop-এর বাইরে
  const attByUid={}, lateByUid={}, onlineUid=new Set();
  Object.values(allAttendance).forEach(a=>{
    const d=new Date(a.date);
    if(d.getMonth()===curMonth&&d.getFullYear()===curYear){
      attByUid[a.uid]=(attByUid[a.uid]||0)+1;
      if(a.isLate) lateByUid[a.uid]=(lateByUid[a.uid]||0)+1;
    }
    if(a.date===todayStr&&!a.checkOut) onlineUid.add(a.uid);
  });

  $('userList').innerHTML=Object.entries(allUsers).map(([uid,u])=>{
    const mSales=(_sc.byUid[uid]||[]).filter(s=>{
      const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;
    });
    const mTotal=mSales.reduce((a,b)=>a+(b.total||0),0);
    const dailyMap=buildDailyCommMap(mSales);
    const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,allCommConfig||getDefaultSlabs()),0);
    const attCount=attByUid[uid]||0;
    const lateCount=lateByUid[uid]||0;
    const isOnline=onlineUid.has(uid);
    const myDue=(_sc.byUid[uid]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
    const sal=allSalaries[uid];
    const target=sal?.monthlyTarget||0;
    const targetPct=target>0?Math.min((mTotal/target)*100,100).toFixed(0):0;
    const targetColor=targetPct>=100?'var(--green)':targetPct>=60?'var(--accent)':'var(--red)';
    const statusColor=u.status==='suspended'?'var(--accent)':u.status==='fired'?'var(--red)':'var(--green)';
    const statusLabel=u.status==='suspended'?'স্থগিত':u.status==='fired'?'বহিষ্কৃত':'সক্রিয়';
    const roleLabel=u.role==='admin'?'অ্যাডমিন':u.role==='manager'?'ম্যানেজার':'কর্মী';

    return`<div style="background:var(--card);border-radius:var(--r);border:1px solid var(--border-l);
      margin-bottom:10px;overflow:hidden;box-shadow:var(--shadow-sm);">

      <!-- ✅ Profile Header — ছবি সহ -->
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
        background:linear-gradient(135deg,var(--card),var(--surface));cursor:pointer;"
        onclick="viewWorkerProfile('${uid}')">
        <!-- ছবি + online dot -->
        <div style="position:relative;flex-shrink:0;">
          <div style="width:52px;height:52px;border-radius:50%;overflow:hidden;
            background:linear-gradient(135deg,var(--primary),var(--blue));
            display:flex;align-items:center;justify-content:center;font-size:22px;
            border:2px solid var(--border-l);">
            ${u.photoURL?`<img src="${u.photoURL}" style="width:52px;height:52px;object-fit:cover;">`:'👤'}
          </div>
          <div style="position:absolute;bottom:1px;right:1px;width:11px;height:11px;
            background:${isOnline?'var(--green)':statusColor};border-radius:50%;
            border:2px solid var(--card);"></div>
        </div>
        <!-- তথ্য -->
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:14px;font-weight:700;">${u.name}</span>
            <span class="role-badge role-${u.role}" style="font-size:9px;">${roleLabel}</span>
            ${u.status&&u.status!=='active'?`<span style="font-size:9px;color:${statusColor};font-weight:700;">${statusLabel}</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">📧 ${u.email||'–'}</div>
          <div style="font-size:11px;color:var(--muted);">
            ${u.waNum||u.phone?`📱 ${u.waNum||u.phone}`:''}
            ${isOnline?'<span style="color:var(--green);margin-left:6px;font-weight:600;">● আজ চেক-ইন</span>':''}
          </div>
        </div>
        <div style="font-size:18px;color:var(--muted);">›</div>
      </div>

      <!-- Stats strip -->
      <div style="display:flex;border-top:1px solid var(--border);background:var(--surface);">
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:var(--blue);">${bn(mTotal)}</div>
          <div style="font-size:9px;color:var(--muted);">মাসের বিক্রয়</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:var(--accent);">${bn(comm)}</div>
          <div style="font-size:9px;color:var(--muted);">কমিশন</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:${lateCount>0?'var(--red)':'var(--green)'};">${attCount}<span style="font-size:9px;color:var(--muted);">দিন</span></div>
          <div style="font-size:9px;color:var(--muted);">উপস্থিতি</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;">
          <div style="font-size:12px;font-weight:700;color:${myDue>0?'var(--red)':'var(--green)'};">${myDue>0?bn(myDue):'✅'}</div>
          <div style="font-size:9px;color:var(--muted);">বাকি দেওয়া</div>
        </div>
      </div>

      <!-- Target progress (যদি থাকে) -->
      ${target>0?`<div style="padding:8px 12px;background:var(--surface);border-top:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px;">
          <span>🎯 টার্গেট: ${bn(target)}</span>
          <span style="color:${targetColor};font-weight:700;">${targetPct}%</span>
        </div>
        <div style="background:var(--border);border-radius:4px;height:5px;overflow:hidden;">
          <div style="width:${targetPct}%;height:100%;background:${targetColor};border-radius:4px;transition:width .4s;"></div>
        </div>
      </div>`:''}

      <!-- Action buttons — Admin-এর পূর্ণ ক্ষমতা -->
      ${uid!==CU.uid?`<div style="display:flex;border-top:1px solid var(--border);">
        <button onclick="viewWorkerProfile('${uid}')"
          style="flex:1;padding:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            background:rgba(59,130,246,.08);border:none;border-right:1px solid var(--border);color:var(--blue);">
          👁 প্রোফাইল
        </button>
        ${u.waNum?`<button onclick="window.open('https://wa.me/88${(u.waNum||'').replace(/[^0-9]/g,'')}','_blank')"
          style="flex:1;padding:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            background:rgba(37,211,102,.08);border:none;border-right:1px solid var(--border);color:#25d366;">
          💬 WA
        </button>`:''}
        <button onclick="suspendUser('${uid}')"
          style="flex:1;padding:8px;font-size:11px;cursor:pointer;font-family:inherit;
            background:rgba(245,158,11,.08);border:none;border-right:1px solid var(--border);color:var(--accent);">
          ⏸ স্থগিত
        </button>
        <button onclick="deleteUser('${uid}')"
          style="flex:1;padding:8px;font-size:11px;cursor:pointer;font-family:inherit;
            background:rgba(239,68,68,.08);border:none;color:var(--red);">
          🗑️
        </button>
      </div>`:''}
    </div>`;
  }).join('')||'<div class="empty">কেউ নেই</div>';
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

  const docs=Array.isArray(u.documents)?u.documents:(u.documents?Object.values(u.documents):[]);
  const docsHTML=docs.length?docs.map((d,i)=>`
    <div style="display:flex;align-items:center;gap:8px;background:var(--surface);border-radius:8px;padding:8px 10px;margin-bottom:5px;border:1px solid var(--border);">
      <a href="${d.url}" target="_blank" style="display:flex;align-items:center;gap:8px;flex:1;text-decoration:none;color:var(--text);min-width:0;">
        <span style="font-size:18px;">${d.name?.endsWith('.pdf')?'📄':d.name?.match(/\.jpe?g|\.png/)?'🖼️':'📎'}</span>
        <div style="min-width:0;">
          <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.name||'ফাইল'}</div>
          <div style="font-size:10px;color:var(--muted);">Drive এ দেখুন →</div>
        </div>
      </a>
      ${CR==='admin'?`<button onclick="deleteWorkerDoc('${uid}',${i})" style="background:rgba(239,68,68,.1);border:1px solid var(--red);border-radius:6px;color:var(--red);cursor:pointer;padding:4px 8px;font-size:11px;flex-shrink:0;">🗑️</button>`:''}
    </div>`).join(''):'<div style="font-size:12px;color:var(--muted);">কোনো ডকুমেন্ট নেই</div>';

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
// ✅ Search থেকে call করার জন্য alias
window.showWorkerProfile = window.viewWorkerProfile;

window.uploadWorkerDoc=async(input,uid)=>{
  const file=input.files[0];if(!file)return;
  if (!validateDoc(file)) { input.value=''; return; } // ✅ validation
  const customName=prompt('ডকুমেন্টের নাম দিন (খালি রাখলে ফাইলের নাম ব্যবহার হবে):', file.name.replace(/\.[^.]+$/,''));
  const docName=(customName&&customName.trim())?customName.trim():file.name;
  showToast('আপলোড হচ্ছে...');
  const result=await uploadDocToDrive(file);
  if(result){
    const {url, fileId}=typeof result==='object'?result:{url:result,fileId:null};
    const user=allUsers[uid];
    const docs=Array.isArray(user?.documents)?[...user.documents]:(user?.documents?Object.values(user.documents):[]);
    docs.push({name:docName,originalFile:file.name,url,fileId,type:file.type,uploadedAt:Date.now(),uploadedBy:CN,uploadedByUid:CU.uid});
    await update(ref(db,'users/'+uid),{documents:docs});
    showToast('✅ ডকুমেন্ট "'+docName+'" যোগ হয়েছে!');
    // folder view refresh
    if(typeof openWorkerFolder==='function') openWorkerFolder(uid);
    else if(typeof viewWorkerProfile==='function') viewWorkerProfile(uid);
  }
};

// ✅ ডকুমেন্ট ডিলেট — শুধু Admin
window.deleteWorkerDoc=async(uid, docIndex)=>{
  if(CR!=='admin'){showToast('শুধু Admin ডকুমেন্ট মুছতে পারবে!',true);return;}
  const user=allUsers[uid]; if(!user)return;
  const docs=Array.isArray(user.documents)?[...user.documents]:(user.documents?Object.values(user.documents):[]);
  const doc=docs[docIndex];
  if(!doc)return;

  if(!confirm('"'+doc.name+'" ডকুমেন্টটি সম্পূর্ণরূপে মুছে ফেলবেন? Firebase Database থেকে সম্পূর্ণ মুছে যাবে।'))return;

  loader(true);
  try{
    // ── ১. Firebase Database থেকে মুছি
    docs.splice(docIndex,1);
    await update(ref(db,'users/'+uid),{documents:docs});

    // ── ২. Audit log
    if(typeof window.auditLog==='function')
      window.auditLog('delete_document', `${user.name}-এর ডকুমেন্ট মুছেছেন: ${doc.name}`);

    // ── ৩. Google Drive থেকে মুছার চেষ্টা (fileId থাকলে)
    if(doc.fileId){
      try{
        await fetch(DRIVE_URL,{
          method:'POST',
          body:JSON.stringify({action:'delete',fileId:doc.fileId})
        });
      }catch(e){ console.warn('Drive delete failed:',e.message); }
    }

    loader(false);
    showToast('✅ ডকুমেন্ট সম্পূর্ণ মুছে গেছে');
    if(typeof openWorkerFolder==='function') openWorkerFolder(uid);
    else if(typeof viewWorkerProfile==='function') viewWorkerProfile(uid);
  }catch(e){
    loader(false);
    showToast('মুছতে ব্যর্থ: '+e.message,true);
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

// ✅ বাকি (due) রিসেট — সব বিক্রয়ের due শূন্য করি
window.resetAllDue = async () => {
  if (CR !== 'admin') { showToast('শুধু Admin করতে পারবে!', true); return; }
  const dueCount = Object.values(allSales).filter(s => s.due > 0).length;
  if (dueCount === 0) { showToast('কোনো বাকি নেই'); return; }
  showResetConfirm({
    title: 'সকলের বাকি ০ করুন',
    body: `মোট <b style="color:#fff">${dueCount}টি</b> বিক্রয়ে বাকি আছে।<br>সব বাকি শূন্য হবে এবং <b>পরিশোধিত</b> হিসেবে মার্ক হবে।`,
    onConfirm: async () => {
      try {
        loader(true);
        const updates = {};
        Object.entries(allSales).forEach(([id, s]) => {
          if (s.due > 0) {
            updates['sales/' + id + '/due'] = 0;
            updates['sales/' + id + '/payStatus'] = 'paid';
          }
        });
        if (Object.keys(updates).length > 0) await update(ref(db), updates);
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_due', `${dueCount}টি বিক্রয়ের বাকি রিসেট করা হয়েছে`);
        loader(false);
        showToast('✅ সকলের বাকি ০ করা হয়েছে');
        // Worker dashboard re-render
        if (typeof window._wdSetPeriod === 'function') window._wdSetPeriod(window._wdPeriod || '1');
        else syncGlobals();
      } catch(e) { loader(false); showToast('রিসেট ব্যর্থ: ' + e.message, true); }
    }
  });
};

// ✅ Replacement রিসেট — সব replacement মুছি
window.resetAllReplacements = async () => {
  if (CR !== 'admin') { showToast('শুধু Admin করতে পারবে!', true); return; }
  const allRpl = window.allReplacements || {};
  const rplCount = Object.keys(allRpl).length;
  if (rplCount === 0) { showToast('কোনো রিপ্লেসমেন্ট নেই'); return; }
  showResetConfirm({
    title: 'সকলের রিপ্লেসমেন্ট ০ করুন',
    body: `মোট <b style="color:#fff">${rplCount}টি</b> রিপ্লেসমেন্ট রেকর্ড মুছে যাবে।`,
    onConfirm: async () => {
      try {
        loader(true);
        // ✅ Archive করি তারপর মুছি
        await set(ref(db, 'replacementsArchive/' + today()), allRpl);
        await remove(ref(db, 'replacements'));
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_replacements', `${rplCount}টি রিপ্লেসমেন্ট রিসেট করা হয়েছে`);
        // ✅ local cache সাথে সাথে clear করি
        window.allReplacements = {};
        loader(false);
        showToast('✅ সকলের রিপ্লেসমেন্ট রিসেট হয়েছে');
        // Worker dashboard re-render
        if (typeof window._wdSetPeriod === 'function') window._wdSetPeriod(window._wdPeriod || '1');
        else syncGlobals();
      } catch(e) { loader(false); showToast('রিসেট ব্যর্থ: ' + e.message, true); }
    }
  });
};

// ═══════════════════════════════════════════════════════════
//  মাসিক রিসেট — বেতন, কমিশন, উপস্থিতি, ছুটি, বিক্রয়, বাকি
// ═══════════════════════════════════════════════════════════
window.resetMonthlyAll = async () => {
  if (CR !== 'admin') { showToast('শুধু Admin করতে পারবে!', true); return; }

  const monthLabel = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });
  const archiveKey = new Date().toISOString().slice(0, 7); // e.g. 2026-03

  const counts = {
    sales:      Object.keys(allSales || {}).length,
    expenses:   Object.keys(allExpenses || {}).length,
    attendance: Object.keys(allAttendance || {}).length,
    leaves:     Object.keys(allLeaves || {}).length,
    salaries:   Object.keys(allSalaries || {}).length,
  };

  showResetConfirm({
    title: '🗓️ মাসিক সম্পূর্ণ রিসেট',
    body: `<b style="color:var(--accent)">${monthLabel}</b> এর সব ডেটা Archive হয়ে রিসেট হবে:<br><br>
      🛍️ বিক্রয়: <b style="color:#fff">${counts.sales}টি</b><br>
      💸 খরচ: <b style="color:#fff">${counts.expenses}টি</b><br>
      ⏰ উপস্থিতি: <b style="color:#fff">${counts.attendance}টি</b><br>
      🏖️ ছুটি: <b style="color:#fff">${counts.leaves}টি</b><br>
      💰 বেতন: <b style="color:#fff">${counts.salaries}টি</b><br><br>
      <span style="color:var(--green);font-size:11px">✅ সব ডেটা Archive এ সংরক্ষিত থাকবে</span>`,
    onConfirm: async () => {
      try {
        loader(true);
        const ts = Date.now();
        const archivePath = 'monthlyArchive/' + archiveKey;

        // ✅ সব ডেটা archive করি
        await set(ref(db, archivePath), {
          archivedAt: ts,
          archivedBy: CN,
          month: archiveKey,
          monthLabel,
          sales:      allSales || {},
          expenses:   allExpenses || {},
          attendance: allAttendance || {},
          leaves:     allLeaves || {},
          salaries:   allSalaries || {},
          customers:  allCustomers || {},
          users:      allUsers || {},
        });

        // ✅ মূল ডেটা মুছি
        await remove(ref(db, 'sales'));
        await remove(ref(db, 'expenses'));
        await remove(ref(db, 'attendance'));
        await remove(ref(db, 'leaves'));
        await remove(ref(db, 'salaries'));

        // ✅ Customer এর due ০ করি (বাকি রিসেট)
        const custUpdates = {};
        Object.keys(allCustomers || {}).forEach(cid => {
          custUpdates['customers/' + cid + '/due'] = 0;
        });
        if (Object.keys(custUpdates).length > 0) {
          const { update: fbUpdate } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
          await fbUpdate(ref(db, '/'), custUpdates);
        }

        if (typeof window.auditLog === 'function')
          window.auditLog('monthly_reset', `মাসিক রিসেট: ${archiveKey} — ${CN} কর্তৃক`);

        loader(false);
        showToast('✅ মাসিক রিসেট সম্পন্ন! Archive এ সংরক্ষিত।');
      } catch(e) {
        loader(false);
        showToast('❌ রিসেট ব্যর্থ: ' + e.message, true);
      }
    }
  });
};

// বেতন/কমিশন শুধু রিসেট
window.resetSalaryOnly = async () => {
  if (CR !== 'admin') { showToast('শুধু Admin করতে পারবে!', true); return; }
  const archiveKey = new Date().toISOString().slice(0, 7);
  showResetConfirm({
    title: '💰 বেতন ও কমিশন রিসেট',
    body: `মোট <b style="color:#fff">${Object.keys(allSalaries||{}).length}টি</b> বেতন রেকর্ড মুছে যাবে।<br>Archive এ সংরক্ষিত থাকবে।`,
    onConfirm: async () => {
      try {
        loader(true);
        await set(ref(db, 'monthlyArchive/' + archiveKey + '/salaries'), allSalaries || {});
        await remove(ref(db, 'salaries'));
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_salary', `বেতন রিসেট: ${archiveKey}`);
        loader(false);
        showToast('✅ বেতন রিসেট সম্পন্ন!');
      } catch(e) { loader(false); showToast('❌ ' + e.message, true); }
    }
  });
};

// উপস্থিতি শুধু রিসেট
window.resetAttendanceOnly = async () => {
  if (CR !== 'admin') { showToast('শুধু Admin করতে পারবে!', true); return; }
  const archiveKey = new Date().toISOString().slice(0, 7);
  showResetConfirm({
    title: '⏰ উপস্থিতি রিসেট',
    body: `মোট <b style="color:#fff">${Object.keys(allAttendance||{}).length}টি</b> উপস্থিতি রেকর্ড মুছে যাবে।`,
    onConfirm: async () => {
      try {
        loader(true);
        await set(ref(db, 'monthlyArchive/' + archiveKey + '/attendance'), allAttendance || {});
        await set(ref(db, 'monthlyArchive/' + archiveKey + '/leaves'), allLeaves || {});
        await remove(ref(db, 'attendance'));
        await remove(ref(db, 'leaves'));
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_attendance', `উপস্থিতি রিসেট: ${archiveKey}`);
        loader(false);
        showToast('✅ উপস্থিতি রিসেট সম্পন্ন!');
      } catch(e) { loader(false); showToast('❌ ' + e.message, true); }
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
    // ✅ window বা localStorage-এ key রাখি না
    window._ntAIReady=true;
    aiLog('✅ Firebase এ সেভ হয়েছে','ok');
    aiProgress(60,'Claude API পরীক্ষা করা হচ্ছে...');
    // ✅ Input masked করি সেভের পরে
    const inp=$('anthropicApiKey');
    if(inp) inp.value='•'.repeat(Math.min(apiKey.length,20));
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
// ════════════════════════════════════════════════════════════
//  🔍 GLOBAL NAVIGATION SEARCH
//  ভূমিকা অনুযায়ী — Admin, Manager, Worker
// ════════════════════════════════════════════════════════════

// সব সার্চযোগ্য আইটেম — ভূমিকা ও keywords সহ
const SEARCH_ITEMS = [

  // ── ড্যাশবোর্ড
  { ico:'🏠', title:'ড্যাশবোর্ড', desc:'মূল পর্দা — বিক্রয়, লাভ, বাকির সারসংক্ষেপ', page:'dash', r:['admin','manager','worker'], keys:['ড্যাশ','হোম','dashboard','home','সারসংক্ষেপ','summary'] },

  // ── বিক্রয়
  { ico:'🛍', title:'বিক্রয় এন্ট্রি', desc:'নতুন বিক্রয় যোগ করুন', page:'sale', r:['admin','manager','worker'], keys:['বিক্রয়','sale','sell','বিক্রি','বেচা','পণ্য বেচা'] },
  { ico:'🔐', title:'OTP নিশ্চিতকরণ', desc:'বিক্রয় SMS OTP দিয়ে নিশ্চিত করুন', page:'sale', scroll:'otpSection', r:['admin','manager','worker'], keys:['otp','এসএমএস','sms','নিশ্চিত'] },
  { ico:'🧾', title:'ইনভয়েস', desc:'বিক্রয়ের রশিদ তৈরি ও শেয়ার করুন', page:'sale', r:['admin','manager','worker'], keys:['ইনভয়েস','invoice','রশিদ','receipt'] },

  // ── কাস্টমার
  { ico:'🏪', title:'কাস্টমার তালিকা', desc:'সব দোকানের তালিকা দেখুন', page:'cust', r:['admin','manager','worker'], keys:['কাস্টমার','customer','দোকান','shop','রিটেইলার'] },
  { ico:'➕', title:'নতুন কাস্টমার যোগ', desc:'নতুন দোকান যোগ করুন', page:'cust', action:'openMo("custMo")', r:['admin','manager','worker'], keys:['নতুন কাস্টমার','add customer','দোকান যোগ'] },
  { ico:'📢', title:'SMS ব্রডকাস্ট', desc:'সব কাস্টমারকে একসাথে SMS পাঠান', page:'cust', action:'openSMSBroadcast()', r:['admin','manager','worker'], keys:['sms','ব্রডকাস্ট','broadcast','মার্কেটিং'] },
  { ico:'🗺️', title:'রুট ম্যানেজমেন্ট', desc:'রুট তৈরি ও পরিচালনা করুন', page:'cust', r:['admin','manager'], keys:['রুট','route','এলাকা','zone'] },

  // ── রুট
  { ico:'🗺️', title:'আজকের রুট', desc:'আজকের ভিজিট রুট শুরু করুন', page:'route', r:['admin','manager','worker'], keys:['রুট','route','ভিজিট','visit','আজ'] },

  // ── বাকি
  { ico:'🏦', title:'বাকির তালিকা', desc:'সব কাস্টমারের বাকির হিসাব', page:'due', r:['admin','manager','worker'], keys:['বাকি','due','ধার','পাওনা','টাকা'] },
  { ico:'💰', title:'পেমেন্ট গ্রহণ', desc:'কাস্টমারের বাকি পেমেন্ট নিন', page:'due', r:['admin','manager','worker'], keys:['পেমেন্ট','payment','টাকা আদায়','collect'] },

  // ── খরচ
  { ico:'💸', title:'খরচ এন্ট্রি', desc:'নিজের খরচ যোগ করুন', page:'exp', r:['admin','manager','worker'], keys:['খরচ','expense','যাতায়াত','transport','ভাড়া'] },
  { ico:'🚗', title:'ভাতা দেখুন', desc:'আপনার ভ্রমণ ভাতার হিসাব', page:'exp', scroll:'myAllowance', r:['admin','manager','worker'], keys:['ভাতা','allowance','ট্রাভেল'] },

  // ── স্টক
  { ico:'📦', title:'স্টক সারসংক্ষেপ', desc:'গুদামের পণ্যের হিসাব', page:'stock', r:['admin','manager','worker'], keys:['স্টক','stock','মজুদ','inventory','পণ্য'] },
  { ico:'🚚', title:'স্টক বরাদ্দ', desc:'কর্মীকে পণ্য বরাদ্দ দিন', page:'stock', scroll:'stockAssignForm', r:['admin','manager'], keys:['বরাদ্দ','assign','দেওয়া'] },

  // ── উপস্থিতি
  { ico:'⏰', title:'চেক-ইন / চেক-আউট', desc:'উপস্থিতি দিন', page:'att', r:['admin','manager','worker'], keys:['চেক','checkin','checkout','উপস্থিতি','attendance','হাজিরা'] },
  { ico:'📸', title:'সেলফি চেক-ইন', desc:'GPS + সেলফি দিয়ে উপস্থিতি নিশ্চিত করুন', page:'att', r:['admin','manager','worker'], keys:['সেলফি','selfie','ছবি','ফটো'] },
  { ico:'🏖️', title:'ছুটির আবেদন', desc:'ছুটির জন্য আবেদন করুন', page:'att', scroll:'leaveList', r:['admin','manager','worker'], keys:['ছুটি','leave','অনুপস্থিত','holiday'] },
  { ico:'⏱️', title:'ওভারটাইম আবেদন', desc:'অতিরিক্ত কাজের আবেদন করুন', page:'att', scroll:'otRequestForm', r:['admin','manager','worker'], keys:['ওভারটাইম','overtime','অতিরিক্ত'] },
  { ico:'⚠️', title:'লেট অ্যালার্ট', desc:'দেরিতে আসার তালিকা দেখুন', page:'att', scroll:'lateAlertList', r:['admin','manager'], keys:['লেট','late','দেরি','অ্যালার্ট'] },

  // ── বেতন
  { ico:'💵', title:'বেতন হিসাব', desc:'এই মাসের বেতন ও কমিশন দেখুন', page:'salary', r:['admin','manager','worker'], keys:['বেতন','salary','মাসিক','payment','কমিশন','commission'] },
  { ico:'📊', title:'কমিশন কাঠামো', desc:'বিক্রয়ের উপর কমিশনের হার', page:'salary', scroll:'commSlabs', r:['admin','manager','worker'], keys:['কমিশন','commission','স্ল্যাব','slab','হার'] },
  { ico:'🎯', title:'টার্গেট নির্ধারণ', desc:'কর্মীর মাসিক টার্গেট সেট করুন', page:'salary', scroll:'setSalaryForm', r:['admin','manager'], keys:['টার্গেট','target','লক্ষ্য','goal'] },

  // ── টিম
  { ico:'👥', title:'টিম তৈরি', desc:'নতুন টিম তৈরি করুন', page:'teams', r:['admin','manager'], keys:['টিম','team','গ্রুপ','দল'] },

  // ── রিপোর্ট
  { ico:'🤖', title:'AI রিপোর্ট', desc:'Claude AI দিয়ে বিশ্লেষণ', page:'enterprise', r:['admin','manager'], keys:['ai','আই','রিপোর্ট','বিশ্লেষণ','analysis','claude'] },
  { ico:'📈', title:'বিক্রয় রিপোর্ট', desc:'কর্মী ও পণ্য ভিত্তিক বিক্রয় বিশ্লেষণ', page:'report', r:['admin'], keys:['রিপোর্ট','report','বিশ্লেষণ','বিক্রয়','sales report'] },
  { ico:'📊', title:'P&L স্টেটমেন্ট', desc:'লাভ-ক্ষতির হিসাব', page:'report', scroll:'plContent', r:['admin'], keys:['p&l','pl','লাভ','ক্ষতি','profit','loss','আর্থিক'] },
  { ico:'📅', title:'দৈনিক রিপোর্ট', desc:'আজকের সারসংক্ষেপ PDF', page:'folders', action:'renderFolderTab("daily")', r:['admin'], keys:['দৈনিক','daily','আজ','today'] },
  { ico:'📆', title:'মাসিক রিপোর্ট', desc:'মাসের সারসংক্ষেপ PDF', page:'folders', action:'renderFolderTab("monthly")', r:['admin'], keys:['মাসিক','monthly','মাস','month'] },

  // ── ফোল্ডার
  { ico:'🗂️', title:'ফাইল ম্যানেজার', desc:'কর্মী ও কাস্টমারের ডকুমেন্ট', page:'folders', r:['admin'], keys:['ফাইল','file','ডকুমেন্ট','document','ফোল্ডার','folder'] },
  { ico:'👤', title:'কর্মী ফোল্ডার', desc:'কর্মীদের NID, সার্টিফিকেট', page:'folders', action:'renderFolderTab("workers")', r:['admin'], keys:['কর্মী','worker','nid','সার্টিফিকেট','ডকুমেন্ট'] },

  // ── চ্যাট
  { ico:'💬', title:'চ্যাট', desc:'টিমের সাথে কথা বলুন', page:'chat', r:['admin','manager','worker'], keys:['চ্যাট','chat','বার্তা','message','কথা'] },
  { ico:'📢', title:'সাধারণ চ্যাট', desc:'সব কর্মী একসাথে', page:'chat', r:['admin','manager','worker'], keys:['সাধারণ','general','সবাই','all'] },

  // ── টাস্ক
  { ico:'📋', title:'টাস্ক তালিকা', desc:'নিজের সব কাজের তালিকা', page:'tasks', r:['admin','manager','worker'], keys:['টাস্ক','task','কাজ','work','দায়িত্ব'] },

  // ── অর্ডার
  { ico:'🛒', title:'অর্ডার', desc:'ফিল্ড থেকে অর্ডার দিন ও দেখুন', page:'order', r:['admin','manager','worker'], keys:['অর্ডার','order','ফরমায়েশ'] },

  // ── প্রোফাইল
  { ico:'👤', title:'আমার প্রোফাইল', desc:'নাম, পাসওয়ার্ড, ছবি আপডেট করুন', page:'profile', r:['admin','manager','worker'], keys:['প্রোফাইল','profile','নাম','পাসওয়ার্ড','password','ছবি'] },
  { ico:'📱', title:'WhatsApp নম্বর', desc:'প্রোফাইলে WhatsApp নম্বর যোগ করুন', page:'profile', r:['admin','manager','worker'], keys:['whatsapp','হোয়াটসঅ্যাপ','নম্বর','মোবাইল'] },
  { ico:'📁', title:'ডকুমেন্ট আপলোড', desc:'নিজের ডকুমেন্ট Google Drive-এ সেভ করুন', page:'profile', scroll:'docUploadInput', r:['admin','manager','worker'], keys:['ডকুমেন্ট','document','আপলোড','upload','drive'] },

  // ── Admin Only
  { ico:'📢', title:'নোটিশ পাঠান', desc:'সকল কর্মীকে নোটিশ দিন', page:'admin', scroll:'noticeTitle', r:['admin','manager'], keys:['নোটিশ','notice','ঘোষণা','announcement','বিজ্ঞপ্তি'] },
  { ico:'👤', title:'নতুন কর্মী তৈরি', desc:'নতুন কর্মী বা ম্যানেজার যোগ করুন', page:'admin', scroll:'createUserForm', r:['admin'], keys:['কর্মী','worker','employee','নতুন','তৈরি','create','যোগ'] },
  { ico:'📦', title:'প্রোডাক্ট যোগ', desc:'নতুন পণ্য তালিকায় যোগ করুন', page:'admin', scroll:'npName', r:['admin'], keys:['প্রোডাক্ট','product','পণ্য','আইটেম','item'] },
  { ico:'📱', title:'SMS কনফিগারেশন', desc:'Alpha Net SMS সেটআপ করুন', page:'admin', scroll:'smsApiKey', r:['admin'], keys:['sms','এসএমএস','alpha net','api','কনফিগ'] },
  { ico:'🤖', title:'Claude AI কনফিগ', desc:'Anthropic API Key সেটআপ করুন', page:'admin', scroll:'anthropicApiKey', r:['admin'], keys:['claude','ai','anthropic','api key','কনফিগ','সেটআপ'] },
  { ico:'☁️', title:'Google Drive', desc:'ডকুমেন্ট Drive-এ সেভের সেটআপ', page:'admin', scroll:'driveApiKey', r:['admin'], keys:['drive','গুগল','google','ক্লাউড','cloud'] },
  { ico:'🗑️', title:'বিক্রয় রিসেট', desc:'সকলের বিক্রয় শূন্য করুন (মাস শেষে)', page:'admin', action:'resetAllSales()', r:['admin'], keys:['রিসেট','reset','শূন্য','মুছ','মাস শেষ'] },
  { ico:'🗑️', title:'খরচ রিসেট', desc:'সকলের খরচের হিসাব শূন্য করুন', page:'admin', action:'resetAllExpenses()', r:['admin'], keys:['রিসেট','reset','খরচ','শূন্য'] },
  { ico:'🚗', title:'ভাতা নির্ধারণ', desc:'কর্মীর যাতায়াত ও খাবার ভাতা সেট করুন', page:'allow', r:['admin','manager'], keys:['ভাতা','allowance','যাতায়াত','খাবার'] },
];

// ── Search খোলা
window.openGlobalSearch = function() {
  const overlay = document.getElementById('globalSearchOverlay');
  const panel   = document.getElementById('globalSearchPanel');
  const input   = document.getElementById('globalSearchInput');
  if (!overlay || !panel) return;
  overlay.style.display = 'block';
  panel.style.display   = 'block';
  if (input) { input.value = ''; input.focus(); }
  renderSearchResults(''); // খালি হলে সব popular দেখাও
};

// ── Search বন্ধ
window.closeGlobalSearch = function() {
  document.getElementById('globalSearchOverlay').style.display = 'none';
  document.getElementById('globalSearchPanel').style.display   = 'none';
};

// ── সাম্প্রতিক সার্চ history
const _searchHistory = [];
function _addSearchHistory(q) {
  if (!q || q.length < 2) return;
  const idx = _searchHistory.indexOf(q);
  if (idx > -1) _searchHistory.splice(idx, 1);
  _searchHistory.unshift(q);
  if (_searchHistory.length > 5) _searchHistory.pop();
}

// ── Search রেজাল্ট রেন্ডার
window.runGlobalSearch = function(q) { renderSearchResults(q); };

function renderSearchResults(q) {
  const el = document.getElementById('globalSearchResults');
  if (!el) return;
  const query = (q || '').trim().toLowerCase();

  // Role অনুযায়ী menu items ফিল্টার
  let menuItems = SEARCH_ITEMS.filter(it => it.r.includes(CR));

  // ── খালি হলে history + shortcut দেখাই
  if (query.length === 0) {
    const groups = [];
    if (_searchHistory.length > 0) {
      groups.push({
        label: '🕐 সাম্প্রতিক',
        items: _searchHistory.map(h => ({
          ico: '🔍', title: h, desc: 'আবার খুঁজুন',
          r: ['admin','manager','worker'],
          action: `document.getElementById('globalSearchInput').value='${h}';runGlobalSearch('${h}')`
        }))
      });
    }
    groups.push({ label: '⚡ দ্রুত অ্যাক্সেস', items: menuItems.slice(0, 8) });
    renderSearchGroups(el, groups);
    return;
  }

  // ── search history-তে যোগ করি
  _addSearchHistory(q);

  const groups = [];
  const words = query.split(' ').filter(Boolean);
  const match = str => str && words.every(w => str.toLowerCase().includes(w));

  // ── ১. Menu/Page items
  const matchedMenu = menuItems.filter(it => {
    const hay = [it.title, it.desc, ...(it.keys||[])].join(' ').toLowerCase();
    return words.every(w => hay.includes(w));
  });
  if (matchedMenu.length) {
    groups.push({ label: '📋 পেজ ও ফিচার', items: matchedMenu.slice(0, 4) });
  }

  // ── ২. কাস্টমার / দোকান
  const custResults = [];
  Object.entries(allCustomers || {}).forEach(([id, c]) => {
    if (!match(c.name) && !match(c.owner) && !match(c.smsNum) && !match(c.waNum)) return;
    const due = Object.values(allSales||{}).filter(s=>s.shopId===id&&s.due>0).reduce((a,b)=>a+b.due,0);
    custResults.push({
      ico: '🏪',
      title: c.name || '–',
      desc: `${c.owner||''} · ${c.uniqueId||''} ${due>0?'· বাকি: '+bn(due):'· বাকি নেই ✅'}`,
      r: ['admin','manager','worker'],
      page: 'cust',
      _customRender: true,
      _type: 'customer',
      _id: id,
      _due: due,
      _waNum: c.waNum,
    });
  });
  if (custResults.length) {
    groups.push({ label: `🏪 কাস্টমার (${custResults.length})`, items: custResults.slice(0,5), _isData: true });
  }

  // ── ৩. কর্মী (Admin/Manager)
  if (CR === 'admin' || CR === 'manager') {
    const workerResults = [];
    const now = new Date();
    Object.entries(allUsers || {}).forEach(([uid, u]) => {
      if (u.role !== 'worker' && u.role !== 'manager') return;
      if (!match(u.name) && !match(u.email) && !match(u.phone) && !match(u.waNum)) return;
      const mSale = Object.values(allSales||{})
        .filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();})
        .reduce((a,b)=>a+(b.total||0),0);
      workerResults.push({
        ico: u.role==='manager'?'🎯':'👷',
        title: u.name || '–',
        desc: `${u.role==='manager'?'ম্যানেজার':'কর্মী'} · এই মাস: ${bn(mSale)}`,
        r: ['admin','manager'],
        _type: 'worker', _uid: uid, _name: u.name,
      });
    });
    if (workerResults.length) {
      groups.push({ label: `👤 কর্মী (${workerResults.length})`, items: workerResults.slice(0,4), _isData: true });
    }
  }

  // ── ৪. পণ্য
  const prodResults = [];
  Object.entries(allProducts || {}).forEach(([id, p]) => {
    if (!match(p.name)) return;
    const sold = Object.values(allSales||{}).filter(s=>s.productId===id).reduce((a,b)=>a+(b.qty||0),0);
    prodResults.push({
      ico: '📦',
      title: p.name,
      desc: `মূল্য: ${bn(p.sellPrice||0)} · বিক্রয়: ${sold} পিস`,
      r: ['admin','manager','worker'],
      page: 'sale', _type: 'product',
    });
  });
  if (prodResults.length) {
    groups.push({ label: `📦 পণ্য (${prodResults.length})`, items: prodResults.slice(0,3), _isData: true });
  }

  // ── ৫. বিক্রয় (তারিখ বা পরিমাণ)
  const saleResults = [];
  const isDateQuery = /^\d{1,2}[-\/]\d{1,2}/.test(query) || /^\d{4}/.test(query);
  if (isDateQuery || query.length >= 3) {
    const salesToSearch = Object.values(allSales||{})
      .filter(s => CR==='worker' ? s.uid===CU.uid : true)
      .sort((a,b)=>(b.ts||0)-(a.ts||0))
      .slice(0, 200); // সর্বশেষ ২০০টি
    salesToSearch.forEach(s => {
      if (!match(s.shop) && !match(s.product) && !match(s.date) && !match(s.workerName)) return;
      saleResults.push({
        ico: '🛍️',
        title: s.shop || '–',
        desc: `${s.product} × ${s.qty} · ${bn(s.total)} · ${s.date} · ${s.workerName||''}`,
        r: ['admin','manager','worker'],
        _type: 'sale',
      });
    });
    if (saleResults.length) {
      groups.push({ label: `🛍️ বিক্রয় (${saleResults.length})`, items: saleResults.slice(0,4), _isData: true });
    }
  }

  // ── কিছু না পেলে
  if (!groups.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--muted);">
      <div style="font-size:32px;margin-bottom:8px;">🔍</div>
      <div style="font-size:14px;">"${q}" — কিছু পাওয়া যায়নি</div>
      <div style="font-size:12px;margin-top:6px;opacity:.6;">দোকানের নাম, কর্মী, পণ্য বা তারিখ লিখুন</div>
    </div>`;
    return;
  }

  renderSearchGroups(el, groups);
}

function renderSearchGroups(el, groups) {
  el.innerHTML = groups.map(g => `
    <div style="padding:6px 0 4px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
        color:var(--muted);padding:0 4px 6px;">${g.label}</div>
      ${g.items.map(it => {
        // ── কাস্টমার card — বাকি + action button
        if (it._type === 'customer') {
          return `<div style="background:var(--card);border:1px solid var(--border-l);border-radius:12px;
              padding:12px;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:38px;height:38px;border-radius:10px;background:var(--surface);
                border:1px solid var(--border);display:flex;align-items:center;justify-content:center;
                font-size:18px;flex-shrink:0;">🏪</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:var(--text);">${it.title}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:1px;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.desc}</div>
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
              <button onclick="closeGlobalSearch();showPage('cust');setActiveTab('cust')"
                style="padding:5px 10px;font-size:11px;font-weight:600;border-radius:7px;cursor:pointer;
                  font-family:inherit;background:rgba(59,130,246,.15);border:1px solid var(--blue);color:var(--blue);">
                📋 দেখুন
              </button>
              ${it._due > 0 ? `<button onclick="closeGlobalSearch();openPayMo('${it.title}',${it._due})"
                style="padding:5px 10px;font-size:11px;font-weight:600;border-radius:7px;cursor:pointer;
                  font-family:inherit;background:rgba(139,92,246,.15);border:1px solid var(--purple);color:var(--purple);">
                💰 পেমেন্ট ৳${Math.round(it._due).toLocaleString('bn-BD')}
              </button>` : ''}
              ${it._waNum ? `<button onclick="window.open('https://wa.me/88${it._waNum.replace(/[^0-9]/g,'')}','_blank')"
                style="padding:5px 10px;font-size:11px;font-weight:600;border-radius:7px;cursor:pointer;
                  font-family:inherit;background:rgba(37,211,102,.15);border:1px solid #25d366;color:#25d366;">
                💬 WhatsApp
              </button>` : ''}
            </div>
          </div>`;
        }

        // ── কর্মী card
        if (it._type === 'worker') {
          return `<div style="display:flex;align-items:center;gap:12px;padding:11px 10px;
              border-radius:12px;cursor:pointer;margin-bottom:2px;
              background:var(--card);border:1px solid var(--border-l);"
            onclick="closeGlobalSearch();showWorkerProfile('${it._uid}')">
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));
              display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${it.ico}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:var(--text);">${it.title}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:1px;">${it.desc}</div>
            </div>
            <div style="font-size:18px;color:var(--muted);">›</div>
          </div>`;
        }

        // ── Default card (menu items, products, sales)
        return `<div onclick="goSearchItem(${JSON.stringify(it).replace(/"/g,'&quot;')})"
          style="display:flex;align-items:center;gap:12px;padding:11px 10px;border-radius:12px;
            cursor:pointer;transition:background .12s;margin-bottom:2px;"
          onmouseover="this.style.background='rgba(255,255,255,.05)'"
          onmouseout="this.style.background='transparent'">
          <div style="width:38px;height:38px;border-radius:10px;background:var(--card);
            border:1px solid var(--border);display:flex;align-items:center;
            justify-content:center;font-size:18px;flex-shrink:0;">${it.ico}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;color:var(--text);">${it.title}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:1px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.desc}</div>
          </div>
          <div style="font-size:18px;color:var(--muted);">›</div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

// ── আইটেমে ক্লিক করলে পেজে যাওয়া
window.goSearchItem = function(it) {
  if (typeof it === 'string') it = JSON.parse(it.replace(/&quot;/g,'"'));
  closeGlobalSearch();

  // পেজে যাই
  if (it.page && typeof showPage === 'function') {
    showPage(it.page);
    if (typeof setActiveTab === 'function') setActiveTab(it.page);
  }

  // Action থাকলে চালাই
  if (it.action) {
    setTimeout(() => { try { eval(it.action); } catch(e) { console.warn(e); } }, 400);
  }

  // Scroll target থাকলে সেখানে যাই
  if (it.scroll) {
    setTimeout(() => {
      const el = document.getElementById(it.scroll);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // হাইলাইট effect
        el.style.transition = 'box-shadow .3s';
        el.style.boxShadow  = '0 0 0 3px rgba(245,166,35,.5)';
        setTimeout(() => { el.style.boxShadow = ''; }, 1800);
        // Input হলে focus করি
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.focus();
      }
    }, 450);
  }
};

// ✅ Browser/Phone Back Button handle
window.addEventListener('popstate', function(e) {
  if (_pageHistory.length > 1) {
    _pageHistory.pop();
    const prev = _pageHistory[_pageHistory.length - 1] || 'dash';
    _currentPage = prev;
    // page দেখাই (history push ছাড়া)
    const restricted={
      'report':['admin','manager'],'admin':['admin'],'folders':['admin','manager'],
      'salary':['admin','manager'],'teams':['admin','manager'],
      'allow':['admin','manager'],'enterprise':['admin','manager'],
    };
    if(restricted[prev]&&!restricted[prev].includes(CR)) return;
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-'+prev)?.classList.add('active');
    if(typeof setActiveTab==='function') setActiveTab(prev);
    const backBtn = document.getElementById('globalBackBtn');
    if(backBtn) backBtn.style.display = prev==='dash'?'none':'flex';
  } else {
    // ড্যাশে ফিরে যাই
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-dash')?.classList.add('active');
    if(typeof setActiveTab==='function') setActiveTab('dash');
  }
});

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
  const html='<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:16px;font-size:12px;}h1{color:#1E3A8A;font-size:16px;}table{width:100%;border-collapse:collapse;}th{background:#1E3A8A;color:#fff;padding:8px;}td{padding:7px;border-bottom:1px solid #e2e8f0;}</style></head><body><h1>NovaTEch BD - কাস্টমার তালিকা</h1><p>'+now+'</p><table><tr><th>#</th><th>ID</th><th>দোকান</th><th>মালিক</th><th>রুট</th><th>ফোন</th></tr>'+custs.map((c,i)=>'<tr><td>'+(i+1)+'</td><td style="font-size:10px;color:#666;">'+(c.uniqueId||'–')+'</td><td>'+c.name+'</td><td>'+(c.owner||'-')+'</td><td>'+(allRoutes[c.routeId]?.name||'-')+'</td><td>'+(c.smsNum||c.waNum||'-')+'</td></tr>').join('')+'</table></body></html>';
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
  window._currentInvoiceSaleId = saleId; // ✅ share-এর জন্য track করি
  const s=allSales[saleId];if(!s)return;
  const ic=$('invoiceContent');if(!ic)return;

  // Payment status badge
  const statusMap={
    paid:  {label:'নগদ পরিশোধ ✅', color:'#059669', bg:'#ecfdf5', border:'#a7f3d0'},
    due:   {label:'বাকি ⚠️',        color:'#dc2626', bg:'#fef2f2', border:'#fecaca'},
    partial:{label:'আংশিক 🔄',     color:'#d97706', bg:'#fff8f0', border:'#fed7aa'},
  };
  const st = statusMap[s.payStatus] || statusMap.paid;
  const invoiceNo = s.invoiceNo || ('NTB-'+new Date(s.ts||Date.now()).getFullYear()+'-????');
  const cashPaid = Math.round((s.total||0) - (s.due||0));
  const otpStr = s.otpConfirmed ? '✅ OTP নিশ্চিত' : s.otpSkipped ? '⏭️ OTP বাদ' : '';

  // ✅ এই specific sale-এর payment history
  const payLogs = Object.values(allPaymentLogs||{})
    .filter(p => p.saleIds && p.saleIds.includes(saleId))
    .sort((a,b) => (a.ts||0) - (b.ts||0));

  // বিক্রয়ের সময় কত নগদ দিয়েছিল
  const totalPaidLater = payLogs.reduce((a,b)=>a+(b.amount||0),0);
  const originalDue = Math.round((s.due||0) + totalPaidLater); // মূল বাকি ছিল এতটুকু
  const originalCash = Math.round((s.total||0) - originalDue); // বিক্রয়ের সময় নগদ
  const hasHistory = originalDue > 0; // বাকি ছিল কিনা

  const payHistoryHTML = hasHistory ? `
    <div style="margin-bottom:10px;">
      <div style="font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;
        letter-spacing:.5px;margin-bottom:8px;">💳 পেমেন্ট ইতিহাস</div>

      <!-- বিক্রয়ের সময় -->
      <div style="display:flex;gap:10px;margin-bottom:8px;">
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="width:10px;height:10px;border-radius:50%;background:#1E3A8A;flex-shrink:0;margin-top:3px;"></div>
          ${hasHistory?`<div style="width:2px;flex:1;background:#e2e8f0;min-height:20px;"></div>`:''}
        </div>
        <div style="flex:1;padding-bottom:10px;">
          <div style="font-size:12px;font-weight:700;color:#1a202c;">🛍️ বিক্রয় সম্পন্ন</div>
          <div style="font-size:10px;color:#64748b;">
            ${s.ts?new Date(s.ts).toLocaleString('bn-BD',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):''}
          </div>
          <div style="font-size:12px;margin-top:3px;">
            মোট: <b>${bn(s.total)}</b>
            ${originalCash>0?` · নগদ: <span style="color:#059669;font-weight:600;">${bn(originalCash)}</span>`:''}
          </div>
          <div style="background:#fef2f2;border-radius:6px;padding:4px 8px;margin-top:4px;
            font-size:12px;font-weight:700;color:#dc2626;display:inline-block;">
            ⚠️ বাকি রাখা হয়েছে: ${bn(originalDue)}
          </div>
        </div>
      </div>

      <!-- পরবর্তী পেমেন্টগুলো -->
      ${payLogs.map((p, i) => {
        const isLast = i === payLogs.length - 1;
        const payTime = p.ts
          ? new Date(p.ts).toLocaleString('bn-BD',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})
          : p.date||'';
        return `<div style="display:flex;gap:10px;margin-bottom:8px;">
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="width:10px;height:10px;border-radius:50%;background:#059669;flex-shrink:0;margin-top:3px;"></div>
            ${!isLast?`<div style="width:2px;flex:1;background:#e2e8f0;min-height:20px;"></div>`:''}
          </div>
          <div style="flex:1;padding-bottom:${isLast?0:8}px;">
            <div style="font-size:12px;font-weight:700;color:#059669;">💰 বাকি পরিশোধ</div>
            <div style="font-size:10px;color:#64748b;">${payTime}</div>
            <div style="font-size:12px;margin-top:3px;">
              <b>${bn(p.amount)}</b> আদায় করেছেন
              <span style="font-weight:700;">${p.collectedBy||'–'}</span>
            </div>
          </div>
        </div>`;
      }).join('')}

      <!-- বর্তমান অবস্থা -->
      <div style="border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;
        margin-top:4px;text-align:center;
        ${s.due > 0
          ? 'background:#fef2f2;border:1px solid #fecaca;color:#dc2626;'
          : 'background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;'}">
        ${s.due > 0
          ? `⚠️ এখনো বাকি আছে: ${bn(s.due)}`
          : `✅ সম্পূর্ণ পরিশোধ হয়েছে`}
      </div>
    </div>` : '';

  ic.innerHTML=`
  <div style="font-family:'Hind Siliguri',Arial,sans-serif;padding:16px;color:#1a202c;max-width:400px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1E3A8A,#2563eb);color:#fff;
      padding:16px;border-radius:10px;margin-bottom:14px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;
        background:rgba(255,255,255,0.08);border-radius:50%;"></div>
      <div style="font-size:18px;font-weight:800;letter-spacing:-0.5px;">📒 NovaTEch BD</div>
      <div style="font-size:11px;opacity:.75;margin-top:2px;">ব্যবসায়িক রশিদ</div>
      <div style="margin-top:10px;background:rgba(255,255,255,0.15);border-radius:6px;
        padding:6px 10px;display:inline-block;">
        <div style="font-size:10px;opacity:.75;">Invoice No.</div>
        <div style="font-size:15px;font-weight:800;letter-spacing:1px;">${invoiceNo}</div>
      </div>
    </div>

    <!-- দোকান ও তারিখ -->
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;
      background:#f8fafc;border-radius:8px;padding:10px 12px;">
      <div>
        <div style="font-size:10px;color:#64748b;margin-bottom:2px;">দোকান</div>
        <div style="font-weight:700;font-size:14px;">${san(s.shop||'–')}</div>
        ${allCustomers[s.shopId]?.uniqueId?`<div style="font-size:9px;color:#64748b;margin-top:2px;">ID: ${allCustomers[s.shopId].uniqueId}</div>`:''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#64748b;margin-bottom:2px;">তারিখ</div>
        <div style="font-weight:600;font-size:13px;">${fmtDate(s.date)}</div>
        <div style="font-size:10px;color:#94a3b8;">${s.ts?new Date(s.ts).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'}):''}</div>
      </div>
    </div>

    <!-- পণ্য table -->
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px;">
      <tr style="background:#1E3A8A;color:#fff;">
        <th style="padding:7px 8px;text-align:left;border-radius:6px 0 0 0;">পণ্য</th>
        <th style="padding:7px 8px;text-align:center;">পরিমাণ</th>
        <th style="padding:7px 8px;text-align:right;">একক মূল্য</th>
        <th style="padding:7px 8px;text-align:right;border-radius:0 6px 0 0;">মোট</th>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px;">${s.product||'–'}</td>
        <td style="padding:8px;text-align:center;">${s.qty}</td>
        <td style="padding:8px;text-align:right;">${bn(s.sellPrice||0)}</td>
        <td style="padding:8px;text-align:right;font-weight:600;">${bn((s.sellPrice||0)*s.qty)}</td>
      </tr>
    </table>

    <!-- হিসাব -->
    <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
      ${s.disc>0?`<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;padding:3px 0;">
        <span>ডিসকাউন্ট (${s.disc}%)</span>
        <span style="color:#ef4444;">-${bn(Math.round((s.sellPrice||0)*s.qty*s.disc/100))}</span>
      </div>`:''}
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #e2e8f0;
        font-size:16px;font-weight:800;color:#059669;margin-top:4px;">
        <span>মোট পরিশোধযোগ্য</span>
        <span>${bn(s.total)}</span>
      </div>
      ${s.due>0&&s.payStatus==='partial'?`
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">
        <span style="color:#64748b;">নগদ প্রদত্ত</span>
        <span style="color:#059669;font-weight:600;">${bn(cashPaid)}</span>
      </div>`:''}
      ${s.due>0?`<div style="display:flex;justify-content:space-between;font-size:13px;
        font-weight:700;padding:4px 0;color:#ef4444;">
        <span>বর্তমান বাকি</span><span>${bn(s.due)}</span>
      </div>`:''}
    </div>

    <!-- ✅ Payment History Timeline -->
    ${payHistoryHTML}

    <!-- Payment status badge -->
    <div style="background:${st.bg};border:1px solid ${st.border};border-radius:8px;
      padding:8px 12px;margin-bottom:10px;text-align:center;
      font-size:13px;font-weight:700;color:${st.color};">
      ${st.label}
    </div>

    <!-- কর্মী ও OTP info -->
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;
      padding:8px 0;border-top:1px solid #e2e8f0;margin-bottom:8px;">
      <span>👤 ${s.workerName||'–'}</span>
      ${otpStr?`<span>🔐 ${otpStr}</span>`:''}
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:10px;color:#94a3b8;padding-top:8px;
      border-top:1px dashed #e2e8f0;">
      আমাদের সাথে যুক্ত হবার জন্য আপনাকে ধন্যবাদ
    </div>

  </div>`;
  openMo('invoiceMo');
};

window.shareInvoiceWA = function() {
  const saleId = window._currentInvoiceSaleId;
  const s = saleId ? allSales[saleId] : null;
  if(!s){ showToast('বিক্রয় তথ্য পাওয়া যায়নি!',true); return; }

  // কাস্টমারের WhatsApp নম্বর
  const cust = allCustomers[s.shopId];
  const waNum = (cust?.waNum||cust?.smsNum||'').replace(/[^0-9]/g,'');

  // ✅ সুন্দর formatted invoice text
  const line = '━━━━━━━━━━━━━━━━━━━━';
  const cashPaid = Math.round((s.total||0)-(s.due||0));

  // Payment logs এই sale-এর
  const payLogs = Object.values(allPaymentLogs||{})
    .filter(p=>p.saleIds&&p.saleIds.includes(saleId))
    .sort((a,b)=>(a.ts||0)-(b.ts||0));
  const totalPaidLater = payLogs.reduce((a,b)=>a+(b.amount||0),0);
  const originalDue = Math.round((s.due||0)+totalPaidLater);

  let payHistory = '';
  if(originalDue > 0) {
    payHistory += `\n⚠️ বাকি রাখা হয়েছিল: ৳${originalDue.toLocaleString('bn-BD')}`;
    payLogs.forEach(p=>{
      const t=p.ts?new Date(p.ts).toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'}):'';
      payHistory += `\n✅ পরিশোধ: ৳${Math.round(p.amount).toLocaleString('bn-BD')} (${t})`;
    });
    if(s.due > 0) payHistory += `\n⚠️ এখনো বাকি: ৳${Math.round(s.due).toLocaleString('bn-BD')}`;
    else payHistory += `\n✅ সম্পূর্ণ পরিশোধ হয়েছে`;
  }

  const msg =
`📒 *NovaTEch BD*
_ব্যবসায়িক রশিদ_
${line}
🧾 *${s.invoiceNo||'–'}*
${line}
🏪 *দোকান:* ${s.shop}
📅 *তারিখ:* ${s.date}${s.ts?' · '+new Date(s.ts).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'}):''}
${line}
📦 *পণ্য:* ${s.product}
🔢 *পরিমাণ:* ${s.qty} পিস
💲 *একক মূল্য:* ৳${Math.round(s.sellPrice||0).toLocaleString('bn-BD')}${s.disc>0?`\n🏷️ *ডিসকাউন্ট:* ${s.disc}%`:''}
${line}
💰 *মোট:* ৳${Math.round(s.total||0).toLocaleString('bn-BD')}${s.payStatus==='partial'?`\n✅ *নগদ প্রদত্ত:* ৳${cashPaid.toLocaleString('bn-BD')}`:''}${payHistory}
${line}
👤 *কর্মী:* ${s.workerName||'–'}${s.otpConfirmed?'\n🔐 *OTP:* নিশ্চিত ✅':''}
${line}
_আমাদের সাথে যুক্ত হবার জন্য আপনাকে ধন্যবাদ_
_NovaTEch BD_`;

  const encoded = encodeURIComponent(msg);
  // ✅ নম্বর থাকলে সরাসরি সেই নম্বরে, না থাকলে general
  const url = waNum
    ? `https://wa.me/88${waNum}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank');
};

// ✅ Invoice ছবি বানিয়ে WhatsApp-এ share
window.shareInvoiceImage = async function() {
  const ic = document.getElementById('invoiceContent');
  if(!ic) return;

  showToast('ছবি তৈরি হচ্ছে...');

  try {
    // ✅ html2canvas dynamically load করি
    if(!window.html2canvas) {
      await new Promise((res,rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    // ✅ Invoice content-এর screenshot নিই
    const canvas = await window.html2canvas(ic, {
      backgroundColor: '#ffffff',
      scale: 2, // high resolution
      useCORS: true,
      logging: false,
    });

    // ✅ Canvas → Blob → File
    canvas.toBlob(async blob => {
      const file = new File([blob], 'invoice.png', { type: 'image/png' });

      // ✅ Web Share API দিয়ে share (mobile-এ সবচেয়ে ভালো কাজ করে)
      if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'NovaTEch BD Invoice',
            text: 'Invoice রশিদ',
          });
          return;
        } catch(e) {
          if(e.name === 'AbortError') return; // user cancelled
        }
      }

      // ✅ Fallback — download করি
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📸 ছবি ডাউনলোড হয়েছে — WhatsApp-এ পাঠান');
    }, 'image/png');

  } catch(e) {
    showToast('ছবি তৈরি ব্যর্থ!', true);
    console.warn('html2canvas error:', e);
  }
};
window.printInvoice = function() {
  const ic = document.getElementById('invoiceContent');
  const pa = document.getElementById('printInvoiceArea');
  if(!ic || !pa) return;

  // ✅ invoice content copy করি print area-তে
  pa.innerHTML = `
    <div style="font-family:'Hind Siliguri',Arial,sans-serif;max-width:400px;margin:0 auto;">
      ${ic.innerHTML}
    </div>`;

  // ✅ Print করি
  window.print();

  // ✅ Print শেষে clear করি
  setTimeout(()=>{ pa.innerHTML=''; }, 1000);
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

  // ── ডেটা সংগ্রহ
  const mSales=Object.values(allSales).filter(s=>{
    const d=new Date(s.date);
    return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const mExp=Object.values(allExpenses).filter(e=>{
    const d=new Date(e.date);
    return e.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const allWorkerSales=Object.values(allSales).filter(s=>s.uid===uid);
  const mAtt=Object.values(allAttendance).filter(a=>{
    const d=new Date(a.date);
    return a.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });

  const totalSale  = mSales.reduce((a,s)=>a+(s.total||0),0);
  const totalProfit= mSales.reduce((a,s)=>a+(s.profit||0),0);
  const totalExp   = mExp.reduce((a,e)=>a+(e.amount||0),0);
  const totalDue   = mSales.reduce((a,s)=>a+(s.due||0),0);
  const allTimeSale= allWorkerSales.reduce((a,s)=>a+(s.total||0),0);
  const lateCount  = mAtt.filter(a=>a.isLate).length;
  const otDays     = mAtt.filter(a=>a.isOT).length;
  const totalHours = mAtt.reduce((a,att)=>a+parseFloat(att.totalHours||0),0);

  const sal = allSalaries[uid]||null;
  const docs= Array.isArray(u.documents)?u.documents:(u.documents?Object.values(u.documents):[]);

  // কমিশন
  const dailyCommMap={};
  mSales.filter(s=>isCommEligible(s))
    .forEach(s=>{dailyCommMap[s.date]=(dailyCommMap[s.date]||0)+s.total;});
  const earnedComm=Object.values(dailyCommMap).reduce((a,v)=>a+calcCommission(v,allCommConfig),0);

  // চার্ট
  const dailyMap={};
  mSales.forEach(s=>{dailyMap[s.date]=(dailyMap[s.date]||0)+s.total;});
  const days=Object.keys(dailyMap).sort().slice(-7);
  const maxVal=Math.max(...days.map(d=>dailyMap[d]),1);

  // শীর্ষ কাস্টমার
  const custMap={};
  mSales.forEach(s=>{custMap[s.shop]=(custMap[s.shop]||0)+s.total;});
  const topCusts=Object.entries(custMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // টার্গেট %
  const targetPct = sal?.monthlyTarget>0 ? Math.min((totalSale/sal.monthlyTarget*100),100).toFixed(0) : 0;
  const targetColor = targetPct>=100?'var(--green)':targetPct>=60?'var(--accent)':'var(--red)';

  el.innerHTML=`
    <button onclick="renderWorkerFolders()" style="background:none;border:none;color:var(--blue);cursor:pointer;font-family:inherit;font-size:13px;padding:4px 0;margin-bottom:10px;">‹ সব কর্মী</button>

    <!-- প্রোফাইল হেডার -->
    <div style="background:var(--card);border-radius:14px;padding:16px;border:1px solid var(--border);margin-bottom:10px;text-align:center;">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 10px;overflow:hidden;">
        ${u.photoURL?`<img src="${u.photoURL}" style="width:72px;height:72px;object-fit:cover;">`:'👤'}
      </div>
      <div style="font-size:17px;font-weight:700;">${u.name}</div>
      <span class="role-badge role-${u.role}" style="margin-top:4px;display:inline-block;">${u.role==='admin'?'অ্যাডমিন':u.role==='manager'?'ম্যানেজার':'কর্মী'}</span>
      <div style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.8;">
        📧 ${u.email||'–'}<br>
        📱 ${u.phone||'–'} &nbsp;|&nbsp; 💬 WA: ${u.waNum||'–'}<br>
        🏠 ${u.address||'–'}<br>
        <span style="color:${u.status==='active'?'var(--green)':'var(--red)'};">● ${u.status==='active'?'সক্রিয়':'নিষ্ক্রিয়'}</span>
      </div>
    </div>

    <!-- এই মাসের সারসংক্ষেপ -->
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px;">📅 এই মাসের সারসংক্ষেপ</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div class="sum-card c-sale"><div class="lbl">বিক্রয়</div><div class="val">${bn(totalSale)}</div></div>
      ${CR==='admin'?`<div class="sum-card" style="border-color:var(--green)"><div class="lbl">লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>`:''}
      <div class="sum-card c-exp"><div class="lbl">খরচ</div><div class="val">${bn(totalExp)}</div></div>
      <div class="sum-card c-due"><div class="lbl">বাকি</div><div class="val">${bn(totalDue)}</div></div>
    </div>

    <!-- টার্গেট -->
    ${sal?.monthlyTarget>0?`<div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-size:13px;font-weight:700;">🎯 টার্গেট অর্জন</div>
        <div style="font-size:18px;font-weight:700;color:${targetColor};">${targetPct}%</div>
      </div>
      <div style="background:var(--border);border-radius:6px;height:8px;overflow:hidden;">
        <div style="background:${targetColor};height:100%;border-radius:6px;width:${targetPct}%;transition:width .5s;"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:5px;">${bn(totalSale)} / ${bn(sal.monthlyTarget)}</div>
    </div>`:''}

    <!-- কমিশন -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">💎 কমিশন</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:rgba(46,204,138,.1);border:1px solid var(--green);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:var(--muted);">✅ অর্জিত</div>
          <div style="font-size:18px;font-weight:700;color:var(--green);margin-top:3px;">${bn(earnedComm)}</div>
        </div>
        <div style="background:rgba(74,158,255,.1);border:1px solid var(--blue);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:var(--muted);">📊 মূল বেতন</div>
          <div style="font-size:18px;font-weight:700;color:var(--blue);margin-top:3px;">${sal?bn(sal.basic):'–'}</div>
        </div>
      </div>
    </div>

    <!-- উপস্থিতি -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">⏰ উপস্থিতি — ${mAtt.length} দিন</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;margin-bottom:10px;">
        <div style="background:rgba(46,204,138,.1);border-radius:8px;padding:8px;">
          <div style="font-size:22px;font-weight:700;color:var(--green);">${mAtt.length}</div>
          <div style="font-size:10px;color:var(--muted);">উপস্থিতি</div>
        </div>
        <div style="background:rgba(232,93,74,.1);border-radius:8px;padding:8px;">
          <div style="font-size:22px;font-weight:700;color:var(--red);">${lateCount}</div>
          <div style="font-size:10px;color:var(--muted);">দেরিতে</div>
        </div>
        <div style="background:rgba(74,158,255,.1);border-radius:8px;padding:8px;">
          <div style="font-size:22px;font-weight:700;color:var(--blue);">${otDays}</div>
          <div style="font-size:10px;color:var(--muted);">ওভারটাইম</div>
        </div>
      </div>
      <!-- ক্যালেন্ডার ডট -->
      <div style="display:flex;flex-wrap:wrap;gap:3px;">
        ${mAtt.sort((a,b)=>a.date.localeCompare(b.date)).map(a=>`
          <div title="${a.date} ইন:${a.checkIn?fmtTime(a.checkIn):'–'} আউট:${a.checkOut?fmtTime(a.checkOut):'চলছে'}"
            style="width:28px;height:28px;border-radius:6px;background:${a.isLate?'rgba(232,93,74,.3)':'rgba(46,204,138,.3)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;border:1px solid ${a.isLate?'var(--red)':'var(--green)'};">
            ${a.date.slice(8)}
          </div>`).join('')}
      </div>
      ${mAtt.length>0?`<div style="font-size:10px;color:var(--muted);margin-top:5px;">🟢 সময়মতো &nbsp; 🔴 দেরিতে &nbsp; মোট কর্মঘণ্টা: ${totalHours.toFixed(1)}ঘ</div>`:''}
    </div>

    <!-- বিক্রয় চার্ট -->
    ${days.length>0?`<div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📈 শেষ ${days.length} দিনের বিক্রয়</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:80px;">
        ${days.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="font-size:8px;color:var(--muted);">${bn(dailyMap[d]).replace('৳','')}</div>
          <div style="width:100%;background:var(--accent);border-radius:4px 4px 0 0;height:${Math.max(4,(dailyMap[d]/maxVal*60))}px;"></div>
          <div style="font-size:8px;color:var(--muted);">${d.slice(8)}</div>
        </div>`).join('')}
      </div>
    </div>`:''}

    <!-- শীর্ষ কাস্টমার -->
    ${topCusts.length>0?`<div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">🏆 শীর্ষ কাস্টমার</div>
      ${topCusts.map(([shop,total],i)=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;">
        <span>${['🥇','🥈','🥉','4️⃣','5️⃣'][i]||''} ${shop}</span>
        <span style="color:var(--accent);font-weight:600;">${bn(total)}</span>
      </div>`).join('')}
    </div>`:''}

    <!-- বিক্রয় তালিকা -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">🛍 বিক্রয় তালিকা — ${mSales.length}টি</div>
      ${mSales.length===0?'<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px;">এই মাসে কোনো বিক্রয় নেই</div>':
        mSales.slice(0,15).map(s=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;">
          <div>
            <div style="font-weight:600;">${s.shop}</div>
            <div style="color:var(--muted);font-size:11px;">${s.product} × ${s.qty} পিস · ${fmtDate(s.date)}</div>
            ${s.photoUrl?`<a href="${s.photoUrl}" target="_blank" style="font-size:10px;color:var(--blue);">📷 রশিদ</a>`:''}
          </div>
          <div style="text-align:right;">
            <div style="color:var(--accent);font-weight:600;">${bn(s.total)}</div>
            ${s.due>0?`<div style="font-size:10px;color:var(--red);">বাকি ${bn(s.due)}</div>`:`<div style="font-size:10px;color:var(--green);">✅</div>`}
          </div>
        </div>`).join('')
      }
      ${mSales.length>15?`<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:6px;">আরও ${mSales.length-15}টি</div>`:''}
    </div>

    <!-- খরচ তালিকা -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">💸 খরচ তালিকা — ${mExp.length}টি</div>
      ${mExp.length===0?'<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px;">এই মাসে কোনো খরচ নেই</div>':
        mExp.map(e=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;">
          <div>
            <div style="font-weight:600;">${e.type}</div>
            <div style="color:var(--muted);font-size:11px;">${e.note||''} · ${fmtDate(e.date)}</div>
          </div>
          <div>
            <div style="color:var(--red);font-weight:600;">${bn(e.amount)}</div>
            <div style="font-size:10px;color:${e.status==='approved'?'var(--green)':e.status==='rejected'?'var(--red)':'var(--accent)'};">
              ${e.status==='approved'?'✅ অনুমোদিত':e.status==='rejected'?'❌ বাতিল':'⏳ অপেক্ষায়'}
            </div>
          </div>
        </div>`).join('')
      }
    </div>

    <!-- ডকুমেন্টস -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📁 ডকুমেন্টস — ${docs.length}টি</div>
      ${docs.length===0
        ? '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">📂<br>কোনো ডকুমেন্ট আপলোড হয়নি</div>'
        : docs.map((d,i)=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface);border-radius:10px;margin-bottom:7px;border:1px solid var(--border);">
            <a href="${d.url}" target="_blank" style="display:flex;align-items:center;gap:10px;flex:1;text-decoration:none;color:var(--text);min-width:0;">
              <div style="width:36px;height:36px;border-radius:8px;background:rgba(74,158,255,.15);border:1px solid var(--blue);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                ${d.name&&(d.name.endsWith('.pdf')||d.originalFile?.endsWith('.pdf'))?'📄':d.name&&(d.name.endsWith('.jpg')||d.name.endsWith('.png')||d.originalFile?.endsWith('.jpg'))?'🖼️':'📎'}
              </div>
              <div style="min-width:0;">
                <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.name||'ফাইল'}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:1px;">${d.uploadedBy||''} · ${d.uploadedAt?new Date(d.uploadedAt).toLocaleDateString('bn-BD'):''}</div>
                <div style="font-size:11px;color:var(--blue);margin-top:2px;">Drive এ দেখুন →</div>
              </div>
            </a>
            ${CR==='admin'?`<button onclick="deleteWorkerDoc('${uid}',${i})"
              style="background:rgba(239,68,68,.1);border:1px solid var(--red);border-radius:8px;color:var(--red);cursor:pointer;padding:6px 10px;font-size:12px;flex-shrink:0;" title="মুছুন">🗑️</button>`:''}
          </div>`).join('')
      }
      <!-- ডকুমেন্ট আপলোড -->
      <label style="display:flex;align-items:center;gap:8px;padding:10px;background:rgba(245,166,35,.06);border:1px dashed rgba(245,166,35,.3);border-radius:10px;cursor:pointer;margin-top:5px;"
        onclick="document.getElementById('folderDocUpload_${uid}').click()">
        <span style="font-size:20px;">📤</span>
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--accent);">নতুন ডকুমেন্ট যোগ করুন</div>
          <div style="font-size:10px;color:var(--muted);">PDF, ছবি, Word — কাস্টম নাম দিতে পারবেন</div>
        </div>
      </label>
      <input type="file" id="folderDocUpload_${uid}" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none;"
        onchange="uploadWorkerDoc(this,'${uid}')">
    </div>

    <!-- সার্বিক পরিসংখ্যান -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">📊 সার্বিক পরিসংখ্যান</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center;">
        <div style="background:var(--surface);border-radius:8px;padding:10px;">
          <div style="font-size:18px;font-weight:700;color:var(--accent);">${bn(allTimeSale)}</div>
          <div style="font-size:10px;color:var(--muted);">মোট বিক্রয় (সবসময়)</div>
        </div>
        <div style="background:var(--surface);border-radius:8px;padding:10px;">
          <div style="font-size:18px;font-weight:700;color:var(--blue);">${allWorkerSales.length}</div>
          <div style="font-size:10px;color:var(--muted);">মোট অর্ডার</div>
        </div>
      </div>
    </div>

    <!-- PDF রিপোর্ট -->
    <button onclick="printWorkerReport('${uid}')"
      style="width:100%;padding:13px;background:rgba(74,158,255,.15);border:1px solid var(--blue);color:var(--blue);border-radius:12px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:4px;">
      📄 সম্পূর্ণ PDF রিপোর্ট
    </button>
  `;
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
      ${CR==='admin'?`<div class="sum-card" style="border-color:var(--green)"><div class="lbl">লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>`:''}
      <div class="sum-card" style="border-color:var(--red)"><div class="lbl">খরচ</div><div class="val" style="color:var(--red)">${bn(totalExp)}</div></div>
      ${CR==='admin'?`<div class="sum-card" style="border-color:${netProfit>=0?'var(--green)':'var(--red)'}"><div class="lbl">নিট লাভ</div><div class="val" style="color:${netProfit>=0?'var(--green)':'var(--red)'}">${bn(netProfit)}</div></div>`:''}
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
      ${CR==='admin'?`<div class="sum-card" style="border-color:var(--green)"><div class="lbl">মোট লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>`:''}
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

// ✅ FIX: injectFeaturesIfNeeded — features.js already loaded via script tag
window.injectFeaturesIfNeeded = function() {
  // features.js is loaded via <script defer> in index.html
  // This function exists only for compatibility
  if (window.ftRenderTasks) window.ftRenderTasks();
};

// ══════════════════════════════════════════════
// ✅ মাসিক সতর্কতা সিস্টেম — Admin only
// ══════════════════════════════════════════════
function checkMonthlyAlerts() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
  const lastDayOfMonth = new Date(year, month+1, 0).getDate();
  const daysLeft = lastDayOfMonth - day;

  // ── চেক কী কী করা হয়েছে এই মাসে
  // ✅ বেতন দেওয়া হয়েছে কিনা — localStorage flag
  const salaryPaid = !!localStorage.getItem(`nt-salary-paid-${monthKey}`);
  const hasSales   = Object.values(allSales||{}).some(s => s.date?.startsWith(monthKey));

  // ── নতুন মাসের শুরুতে checklist (১-৩ তারিখ)
  const lastMonthKey = (() => {
    const lm = new Date(year, month-1, 1);
    return `${lm.getFullYear()}-${String(lm.getMonth()+1).padStart(2,'0')}`;
  })();
  const shownKey = `nt-monthly-checklist-${lastMonthKey}`;

  if (day <= 3 && !localStorage.getItem(shownKey)) {
    const lmSales = Object.values(allSales||{}).filter(s => s.date?.startsWith(lastMonthKey));
    const lmTotal = lmSales.reduce((a,b) => a+(b.total||0), 0);
    const lmDue   = Object.values(allSales||{}).filter(s => s.due > 0).reduce((a,b) => a+(b.due||0), 0);
    // ✅ বেতন দেওয়া হয়েছে কিনা — Admin নিজে mark করেছে কিনা দেখি
    const lmSalaryPaid = !!localStorage.getItem(`nt-salary-paid-${lastMonthKey}`);
    showMonthlyChecklist(lastMonthKey, lmTotal, lmDue, lmSalaryPaid, shownKey);
    return;
  }

  // ── মাস শেষের সতর্কতা (শেষ ৩ দিন)
  if (daysLeft <= 2) {
    showMonthEndBanner(daysLeft, salaryPaid, hasSales);
  }
}

// ── মাস শেষের banner
function showMonthEndBanner(daysLeft, salaryPaid, hasSales) {
  // আগে আছে কিনা দেখি
  if (document.getElementById('monthEndBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'monthEndBanner';
  banner.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    width:calc(100% - 28px);max-width:402px;
    background:linear-gradient(135deg,#92400e,#d97706);
    color:#fff;border-radius:14px;padding:14px 16px;
    z-index:300;box-shadow:0 8px 32px rgba(0,0,0,.4);
    animation:slideUp .3s ease;
  `;
  banner.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <div style="font-size:22px;flex-shrink:0;">⚠️</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;margin-bottom:4px;">
          মাস শেষ হচ্ছে! ${daysLeft===0?'আজই শেষ দিন':daysLeft+' দিন বাকি'}
        </div>
        <div style="font-size:11px;opacity:.85;line-height:1.6;">
          ${!salaryPaid?'💰 বেতন এখনো দেওয়া হয়নি<br>':'✅ বেতন প্রস্তুত<br>'}
          📊 মাসিক রিপোর্ট নামিয়ে রাখুন<br>
          🏦 বাকি আদায়ের চেষ্টা করুন
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
          <button onclick="showPage('salary');setActiveTab('salary');document.getElementById('monthEndBanner').remove()"
            style="padding:5px 10px;font-size:11px;font-weight:700;border-radius:7px;cursor:pointer;
              background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-family:inherit;">
            💰 বেতন
          </button>
          <button onclick="showPage('report');setActiveTab('report');document.getElementById('monthEndBanner').remove()"
            style="padding:5px 10px;font-size:11px;font-weight:700;border-radius:7px;cursor:pointer;
              background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-family:inherit;">
            📊 রিপোর্ট
          </button>
          <button onclick="document.getElementById('monthEndBanner').remove()"
            style="padding:5px 10px;font-size:11px;font-weight:700;border-radius:7px;cursor:pointer;
              background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.2);color:#fff;font-family:inherit;">
            ✕ বন্ধ
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(banner);
  // ৮ সেকেন্ড পরে auto hide
  setTimeout(() => banner?.remove(), 8000);
}

// ── নতুন মাসের checklist modal
function showMonthlyChecklist(lastMonthKey, lmTotal, lmDue, lmSalaryPaid, storageKey) {
  const mo = document.createElement('div');
  mo.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:400;
    display:flex;align-items:flex-end;justify-content:center;
    backdrop-filter:blur(3px);
  `;
  mo.innerHTML = `
    <div style="background:var(--surface);border-radius:20px 20px 0 0;padding:22px;
      width:100%;max-width:430px;box-shadow:0 -8px 40px rgba(0,0,0,.5);
      animation:slideUp .3s ease;">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-size:32px;margin-bottom:6px;">🗓️</div>
        <div style="font-size:16px;font-weight:800;color:var(--text);">নতুন মাস শুরু!</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px;">
          গত মাসের কাজ সম্পন্ন হয়েছে কি?
        </div>
      </div>

      <!-- গত মাসের সারসংক্ষেপ -->
      <div style="background:var(--card);border-radius:12px;padding:12px;margin-bottom:14px;
        border:1px solid var(--border-l);">
        <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;
          letter-spacing:.5px;margin-bottom:8px;">📊 গত মাসের সারসংক্ষেপ</div>
        <div style="display:flex;gap:8px;">
          <div style="flex:1;text-align:center;background:var(--surface);border-radius:8px;padding:8px;">
            <div style="font-size:14px;font-weight:800;color:var(--blue);">৳${Math.round(lmTotal/1000)}K</div>
            <div style="font-size:9px;color:var(--muted);">মোট বিক্রয়</div>
          </div>
          <div style="flex:1;text-align:center;background:var(--surface);border-radius:8px;padding:8px;">
            <div style="font-size:14px;font-weight:800;color:${lmDue>0?'var(--red)':'var(--green)'};">৳${Math.round(lmDue/1000)}K</div>
            <div style="font-size:9px;color:var(--muted);">বাকি</div>
          </div>
        </div>
      </div>

      <!-- Checklist -->
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase;
          letter-spacing:.5px;margin-bottom:8px;">✅ চেকলিস্ট</div>
        ${[
          {done: lmSalaryPaid, label: 'কর্মীদের বেতন দেওয়া হয়েছে', icon: '💰',
           action: lmSalaryPaid ? '' : `localStorage.setItem('nt-salary-paid-${lastMonthKey}','1');document.getElementById('monthlyChecklistModal').remove();showPage('salary');setActiveTab('salary')`},
          {done: false, label: 'মাসিক রিপোর্ট PDF নামানো হয়েছে', icon: '📊',
           action: `showPage('report');setActiveTab('report');document.getElementById('monthlyChecklistModal').remove()`},
          {done: lmDue===0, label: 'সব বাকি আদায় হয়েছে', icon: '🏦',
           action: lmDue>0 ? `showPage('due');setActiveTab('due');document.getElementById('monthlyChecklistModal').remove()` : ''},
        ].map(item => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
            background:var(--card);border-radius:10px;margin-bottom:6px;
            border:1px solid var(--border-l);cursor:pointer;"
            onclick="${item.action||''}">
            <div style="width:28px;height:28px;border-radius:8px;display:flex;align-items:center;
              justify-content:center;font-size:14px;
              background:${item.done?'rgba(16,185,129,.15)':'rgba(245,158,11,.1)'};">
              ${item.icon}
            </div>
            <div style="flex:1;font-size:13px;color:var(--text);">${item.label}</div>
            <div style="font-size:14px;color:${item.done?'var(--green)':'var(--accent)'};">
              ${item.done?'✅':'→'}
            </div>
          </div>`).join('')}
      </div>

      <!-- বাটন -->
      <button onclick="localStorage.setItem('${storageKey}','1');document.getElementById('monthlyChecklistModal').remove()"
        style="width:100%;padding:13px;background:linear-gradient(135deg,var(--accent),var(--accent-l));
          border:none;border-radius:12px;color:#1a1200;font-family:inherit;font-size:14px;
          font-weight:700;cursor:pointer;">
        ✅ বুঝেছি, শুরু করি নতুন মাস
      </button>
    </div>`;
  mo.id = 'monthlyChecklistModal';
  document.body.appendChild(mo);
}

function syncGlobals(){
  window.allSales=allSales; window.allExpenses=allExpenses; window.allPaymentLogs=allPaymentLogs||{};
  window.allProducts=allProducts; window.allUsers=allUsers;
  window.allRoutes=allRoutes; window.allSalaries=allSalaries;
  window.allAttendance=allAttendance; window.allCustomers=allCustomers;
  window.allAllowances=allAllowances; window.allCommConfig=allCommConfig;
  window.CR=CR; window.CU=CU; window.CN=CN; window.allLeaves=allLeaves||{};
  window._sc=_sc; // ✅ worker-dashboard.js এর জন্য
  window.computeSalesCache=computeSalesCache; // ✅ worker-dashboard refresh
  window.activeRouteId=activeRouteId; // ✅ worker-dashboard route
  // ✅ features.js এর জন্য Firebase functions expose করি
  // 🔒 non-enumerable + non-configurable — console থেকে override বা দেখা যাবে না
  // ✅ BUG-01 FIX
  const _fbSecure = (key, val) => {
    if (Object.getOwnPropertyDescriptor(window, key)) return;
    Object.defineProperty(window, key, {
      value: val, writable: false, enumerable: false, configurable: false
    });
  };
  _fbSecure('_db',      db);
  _fbSecure('_ref',     ref);
  _fbSecure('_push',    push);
  _fbSecure('_set',     set);
  _fbSecure('_update',  update);
  _fbSecure('_remove',  remove);
  _fbSecure('_get',     get);
  _fbSecure('_onValue', onValue);
  window.uploadImageToFirebase=uploadImageToFirebase;
  window.showToast=showToast;
  // ✅ FIX: Regular functions → window এ expose (module scope fix)
  window.renderCustomers=renderCustomers;
  window.renderRouteRequests=renderRouteRequests;
  window.updateOTPStatus=updateOTPStatus;
  window.sShopSelChange=sShopSelChange;
  window.calcSaleSummary=calcSaleSummary;
  window.renderSaleList=renderSaleList;
  window.renderDue=renderDue;
  window.renderExpList=renderExpList;
  window.refreshDash=refreshDash;
  window.renderAttendance=renderAttendance;
  window.renderLeaves=renderLeaves;
  window.renderSalary=renderSalary;
  window.renderTeams=renderTeams;
  window.renderStock=renderStock;
  window.renderProfile=renderProfile;
  window.renderReport=renderReport;
  window.renderCommSlabs=renderCommSlabs;
  window.renderUserList=renderUserList;
  window.renderAllowList=renderAllowList;
  window.renderMyAllowance=renderMyAllowance;
  window.renderNoticeBoard=renderNoticeBoard;
  window.checkLateAlert=checkLateAlert;
  window.renderProdChips=renderProdChips;
  window.renderVisitList=renderVisitList;
  window.loadRouteSelects=loadRouteSelects;
  window.loadCustomerSelect=loadCustomerSelect;
  window.loadProductSelects=loadProductSelects;
  window.loadAllWorkerSelects=loadAllWorkerSelects;
  window.buildNav=buildNav;
  window.setActiveTab=setActiveTab;
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
      const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,allCommConfig||getDefaultSlabs()),0);
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
  try{
    const _aiSnap=await get(ref(db,'aiConfig'));
    if(!_aiSnap.exists()){document.getElementById(tid).textContent='❌ Admin → AI Config এ API Key দিন।';return;}
    const apiKey=_aiSnap.val().apiKey||_aiSnap.val().anthropicApiKey||'';
    if(!apiKey){document.getElementById(tid).textContent='❌ Admin → AI Config এ API Key দিন।';return;}
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


// ═══════════════════════════════════════════════════════
//  ARCHIVE VIEWER — Admin only
// ═══════════════════════════════════════════════════════
window.loadArchiveList = async () => {
  if (CR !== 'admin') return;
  const sel = document.getElementById('archiveMonthSel');
  if (!sel) return;
  try {
    const snap = await get(ref(db, 'monthlyArchive'));
    if (!snap.exists()) {
      sel.innerHTML = '<option value="">কোনো Archive নেই</option>';
      return;
    }
    const months = Object.keys(snap.val()).sort().reverse();
    sel.innerHTML = '<option value="">-- মাস বেছে নিন --</option>' +
      months.map(m => {
        const d = new Date(m + '-01');
        const label = d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });
        return `<option value="${m}">${label}</option>`;
      }).join('');
  } catch(e) {
    showToast('Archive লোড ব্যর্থ: ' + e.message, true);
  }
};

window.loadArchiveMonth = async (month) => {
  const el = document.getElementById('archiveContent');
  if (!el || !month) return;
  el.innerHTML = '<div class="empty"><div class="ic" style="animation:spin .75s linear infinite">⏳</div></div>';
  try {
    const snap = await get(ref(db, 'monthlyArchive/' + month));
    if (!snap.exists()) { el.innerHTML = '<div class="empty"><p>ডেটা নেই</p></div>'; return; }
    const d = snap.val();
    const label = new Date(month + '-01').toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });

    const salesArr  = Object.values(d.sales      || {});
    const expArr    = Object.values(d.expenses    || {});
    const attArr    = Object.values(d.attendance  || {});
    const salArr    = Object.values(d.salaries    || {});
    const leavesArr = Object.values(d.leaves      || {});

    const totalSale   = salesArr.reduce((a,s) => a + (s.total||0), 0);
    const totalProfit = salesArr.reduce((a,s) => a + (s.profit||0), 0);
    const totalExp    = expArr.reduce((a,e) => a + (e.amount||0), 0);
    const totalDue    = salesArr.reduce((a,s) => a + (s.due||0), 0);

    el.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--primary),var(--blue));border-radius:var(--r);padding:16px;margin-bottom:12px;color:#fff">
        <div style="font-size:16px;font-weight:800;font-family:'Sora',sans-serif;margin-bottom:10px">📅 ${label}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px">
            <div style="font-size:10px;opacity:.8">মোট বিক্রয়</div>
            <div style="font-size:18px;font-weight:700">৳${Math.round(totalSale).toLocaleString('bn-BD')}</div>
          </div>
          <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px">
            <div style="font-size:10px;opacity:.8">মোট লাভ</div>
            <div style="font-size:18px;font-weight:700">৳${Math.round(totalProfit).toLocaleString('bn-BD')}</div>
          </div>
          <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px">
            <div style="font-size:10px;opacity:.8">মোট খরচ</div>
            <div style="font-size:18px;font-weight:700">৳${Math.round(totalExp).toLocaleString('bn-BD')}</div>
          </div>
          <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:10px">
            <div style="font-size:10px;opacity:.8">মোট বাকি</div>
            <div style="font-size:18px;font-weight:700">৳${Math.round(totalDue).toLocaleString('bn-BD')}</div>
          </div>
        </div>
      </div>

      <!-- Export buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
        <button onclick="archiveExportPDF('${month}')" style="padding:10px 6px;background:rgba(239,68,68,.12);border:1.5px solid var(--red);color:var(--red);border-radius:var(--r-sm);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">📄 PDF</button>
        <button onclick="archiveExportExcel('${month}')" style="padding:10px 6px;background:rgba(16,185,129,.12);border:1.5px solid var(--green);color:var(--green);border-radius:var(--r-sm);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">📊 Excel</button>
        <button onclick="archiveDeleteMonth('${month}')" style="padding:10px 6px;background:rgba(100,116,139,.12);border:1.5px solid var(--muted);color:var(--muted);border-radius:var(--r-sm);font-family:inherit;font-size:11px;font-weight:700;cursor:pointer">🗑️ মুছুন</button>
      </div>

      <!-- বিক্রয় তালিকা -->
      <div class="sec">🛍️ বিক্রয় (${salesArr.length}টি)</div>
      <div style="max-height:220px;overflow-y:auto">
        ${salesArr.sort((a,b)=>(b.ts||0)-(a.ts||0)).slice(0,50).map(s=>`
          <div class="ec">
            <div class="ei">
              <div class="shop">${s.shop||'-'}</div>
              <div class="prod">${s.product||''} × ${s.qty||1}</div>
              <div class="dt">${s.date||''} · ${s.workerName||''}</div>
            </div>
            <div class="ea">
              <div class="sale">৳${Math.round(s.total||0).toLocaleString('bn-BD')}</div>
              ${s.due>0?`<div style="font-size:10px;color:var(--purple)">বাকি ৳${Math.round(s.due)}</div>`:''}
            </div>
          </div>`).join('')}
        ${salesArr.length>50?`<div style="text-align:center;padding:8px;font-size:11px;color:var(--muted)">আরো ${salesArr.length-50}টি PDF/Excel এ দেখুন</div>`:''}
      </div>

      <!-- উপস্থিতি সারসংক্ষেপ -->
      <div class="sec">⏰ উপস্থিতি (${attArr.length}টি)</div>
      <div style="max-height:150px;overflow-y:auto">
        ${attArr.slice(0,30).map(a=>`
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span>${a.name||'-'} — ${a.date||''}</span>
            <span style="color:${a.late?'var(--red)':'var(--green)'}">
              ${a.checkIn||''} ${a.late?'⚠️দেরি':''}
            </span>
          </div>`).join('')}
      </div>

      <!-- বেতন সারসংক্ষেপ -->
      <div class="sec">💰 বেতন (${salArr.length} কর্মী)</div>
      <div style="max-height:150px;overflow-y:auto">
        ${salArr.map(s=>`
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span>${s.name||'-'}</span>
            <span style="color:var(--green);font-weight:700">৳${Math.round(s.baseSalary||s.salary||0).toLocaleString('bn-BD')}</span>
          </div>`).join('')}
      </div>
    `;
  } catch(e) {
    el.innerHTML = `<div class="empty"><p>লোড ব্যর্থ: ${e.message}</p></div>`;
  }
};

window.archiveDeleteMonth = async (month) => {
  if (!confirm('এই মাসের Archive মুছে ফেলবেন?')) return;
  await remove(ref(db, 'monthlyArchive/' + month));
  showToast('✅ Archive মুছে গেছে');
  window.loadArchiveList();
  document.getElementById('archiveContent').innerHTML = '<div class="empty"><div class="ic">🗄️</div><p>মাস বেছে নিন</p></div>';
};

window.archiveExportPDF = (month) => {
  const el = document.getElementById('archiveContent');
  if (!el) return;
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head>
    <meta charset="UTF-8">
    <style>
      body { font-family: 'Hind Siliguri', Arial, sans-serif; padding: 20px; color: #000; }
      h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
      th { background: #1e3a8a; color: #fff; padding: 8px; text-align: left; }
      td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
      tr:nth-child(even) td { background: #f8fafc; }
      .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 16px 0; }
      .sum-box { background: #f1f5f9; border-radius: 8px; padding: 12px; }
      .sum-lbl { font-size: 11px; color: #64748b; }
      .sum-val { font-size: 20px; font-weight: 700; color: #1e3a8a; }
      @media print { button { display: none; } }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;700&display=swap" rel="stylesheet">
    </head><body>
    ${el.innerHTML}
    <br><button onclick="window.print()" style="padding:10px 20px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Print / PDF সেভ করুন</button>
    </body></html>`);
  w.document.close();
};

window.archiveExportExcel = async (month) => {
  try {
    const snap = await get(ref(db, 'monthlyArchive/' + month));
    if (!snap.exists()) { showToast('ডেটা নেই', true); return; }
    const d = snap.val();
    const label = new Date(month + '-01').toLocaleDateString('bn-BD', { year: 'numeric', month: 'long' });

    // CSV format (Excel এ open হয়)
    let csv = '\uFEFF'; // BOM for Bengali

    // Sales sheet
    csv += `${label} - বিক্রয় তালিকা\n`;
    csv += 'তারিখ,দোকান,পণ্য,পরিমাণ,মোট,বাকি,কর্মী\n';
    Object.values(d.sales||{}).forEach(s => {
      csv += `${s.date||''},${s.shop||''},${s.product||''},${s.qty||1},${Math.round(s.total||0)},${Math.round(s.due||0)},${s.workerName||''}\n`;
    });

    csv += `\n${label} - উপস্থিতি\n`;
    csv += 'তারিখ,নাম,চেক-ইন,চেক-আউট,দেরি\n';
    Object.values(d.attendance||{}).forEach(a => {
      csv += `${a.date||''},${a.name||''},${a.checkIn||''},${a.checkOut||''},${a.late?'হ্যাঁ':'না'}\n`;
    });

    csv += `\n${label} - বেতন\n`;
    csv += 'নাম,মূল বেতন,কমিশন,মোট\n';
    Object.values(d.salaries||{}).forEach(s => {
      csv += `${s.name||''},${Math.round(s.baseSalary||0)},${Math.round(s.commission||0)},${Math.round((s.baseSalary||0)+(s.commission||0))}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NovaTEch_${month}_Archive.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Excel ফাইল download হচ্ছে');
  } catch(e) {
    showToast('❌ Export ব্যর্থ: ' + e.message, true);
  }
};

// ═══════════════════════════════════════════════════════════
//  COMPLETE LEDGER — সকল লেনদেনের বিস্তারিত ইতিহাস
// ═══════════════════════════════════════════════════════════
let _ledgerPeriod = 'month';
let _ledgerType   = 'all';

window.setLedgerPeriod = (p) => {
  _ledgerPeriod = p;
  document.querySelectorAll('[id^="lp-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('lp-' + p);
  if (btn) btn.classList.add('active');

  const now = new Date();
  const fromEl = document.getElementById('ledgerFrom');
  const toEl   = document.getElementById('ledgerTo');
  const fmt    = d => d.toISOString().split('T')[0];

  if (p === 'today') {
    if (fromEl) fromEl.value = fmt(now);
    if (toEl)   toEl.value   = fmt(now);
  } else if (p === 'week') {
    // ✅ গত ৭ দিন — Sunday-based নয়
    const start = new Date(now); start.setDate(now.getDate() - 6);
    if (fromEl) fromEl.value = fmt(start);
    if (toEl)   toEl.value   = fmt(now);
  } else if (p === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (fromEl) fromEl.value = fmt(start);
    if (toEl)   toEl.value   = fmt(now);
  } else {
    // ✅ 'all' — তারিখ খালি রাখি
    if (fromEl) fromEl.value = '';
    if (toEl)   toEl.value   = '';
  }
  window.renderLedger();
};

window.setLedgerType = (t) => {
  _ledgerType = t;
  document.querySelectorAll('[id^="lt-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('lt-' + t);
  if (btn) btn.classList.add('active');
  window.renderLedger();
};

window.renderLedger = () => {
  if (CR !== 'admin' && CR !== 'manager') return;
  const listEl    = document.getElementById('ledgerList');
  const summaryEl = document.getElementById('ledgerSummary');
  if (!listEl) return;

  // ✅ Admin-এর জন্য worker filter দেখাই ও populate করি
  const workerFilterWrap = document.getElementById('ledgerWorkerFilterWrap');
  const workerFilterSel  = document.getElementById('ledgerWorkerFilter');
  if (CR === 'admin' && workerFilterWrap) {
    workerFilterWrap.style.display = 'block';
    if (workerFilterSel && workerFilterSel.options.length <= 1) {
      const workers = Object.entries(allUsers||{})
        .filter(([,u]) => u.role==='worker'||u.role==='manager')
        .sort((a,b) => a[1].name.localeCompare(b[1].name));
      workers.forEach(([uid,u]) => {
        const opt = document.createElement('option');
        opt.value = uid;
        opt.textContent = u.name + ' (' + (u.role==='worker'?'কর্মী':'ম্যানেজার') + ')';
        workerFilterSel.appendChild(opt);
      });
    }
  }
  const selectedWorker = workerFilterSel?.value || '';

  const fromVal = document.getElementById('ledgerFrom')?.value || '';
  const toVal   = document.getElementById('ledgerTo')?.value   || '';

  const inRange = (dateStr) => {
    if (!fromVal && !toVal) return true;
    if (fromVal && dateStr < fromVal) return false;
    if (toVal   && dateStr > toVal)   return false;
    return true;
  };

  // ── সব transaction একসাথে জড়ো করি ──
  let transactions = [];

  // 1. বিক্রয়
  if (_ledgerType === 'all' || _ledgerType === 'sales') {
    Object.entries(allSales || {}).forEach(([id, s]) => {
      if (!inRange(s.date || '')) return;
      // ✅ কর্মী ফিল্টার
      if (selectedWorker && s.uid !== selectedWorker) return;
      transactions.push({
        id, type: 'sale',
        icon: '🛍️', color: 'var(--blue)',
        title: s.shop || '-',
        sub1: `${s.product || ''} × ${s.qty || 1} পিস`,
        sub2: `কর্মী: ${s.workerName || '-'} · OTP: ${s.otpConfirmed ? '✅' : '⏭️'}`,
        amount: s.total || 0,
        cash: (s.total || 0) - (s.due || 0),
        due: s.due || 0,
        discount: s.disc || 0,
        profit: s.profit || 0,
        date: s.date || '',
        ts: s.ts || 0,
        extra: s.due > 0 ? `বাকি: ৳${Math.round(s.due).toLocaleString('bn-BD')}` : 'নগদ পরিশোধ ✅',
        extraColor: s.due > 0 ? 'var(--red)' : 'var(--green)',
        rawData: s,
      });
    });
  }

  // 2. পেমেন্ট (বাকি আদায়)
  if (_ledgerType === 'all' || _ledgerType === 'payments') {
    Object.entries(allPaymentLogs || {}).forEach(([id, p]) => {
      if (!inRange(p.date || '')) return;
      transactions.push({
        id, type: 'payment',
        icon: '💵', color: 'var(--green)',
        title: p.shop || '-',
        sub1: `বাকি আদায়`,
        sub2: `${p.collectedBy || '-'} কর্তৃক`,
        amount: p.amount || 0,
        cash: p.amount || 0,
        due: 0,
        date: p.date || '',
        ts: p.ts || 0,
        extra: `আদায়কারী: ${p.collectedBy || '-'}`,
        extraColor: 'var(--green)',
        rawData: p,
      });
    });
  }

  // 3. খরচ
  if (_ledgerType === 'all' || _ledgerType === 'expenses') {
    Object.entries(allExpenses || {}).forEach(([id, e]) => {
      if (!inRange(e.date || '')) return;
      // ✅ কর্মী ফিল্টার
      if (selectedWorker && e.uid !== selectedWorker) return;
      transactions.push({
        id, type: 'expense',
        icon: '💸', color: 'var(--red)',
        title: e.type || 'খরচ',
        sub1: e.note || '',
        sub2: `কর্মী: ${e.workerName || '-'}`,
        amount: e.amount || 0,
        cash: e.amount || 0,
        due: 0,
        date: e.date || '',
        ts: e.ts || 0,
        extra: e.status === 'pending' ? '⏳ অনুমোদন বাকি' : '✅ অনুমোদিত',
        extraColor: e.status === 'pending' ? 'var(--accent)' : 'var(--green)',
        rawData: e,
      });
    });
  }

  // 4. বেতন
  if (_ledgerType === 'all' || _ledgerType === 'salary') {
    Object.entries(allSalaries || {}).forEach(([id, s]) => {
      const sDate = s.month ? s.month + '-01' : (s.date || '');
      if (!inRange(sDate)) return;
      transactions.push({
        id, type: 'salary',
        icon: '💰', color: 'var(--purple)',
        title: s.name || s.workerName || '-',
        sub1: `মূল বেতন: ৳${Math.round(s.baseSalary || s.salary || 0).toLocaleString('bn-BD')}`,
        sub2: `কমিশন: ৳${Math.round(s.commission || 0).toLocaleString('bn-BD')}`,
        amount: (s.baseSalary || s.salary || 0) + (s.commission || 0),
        cash: (s.baseSalary || s.salary || 0) + (s.commission || 0),
        due: 0,
        date: sDate,
        ts: s.ts || 0,
        extra: `মাস: ${s.month || '-'}`,
        extraColor: 'var(--purple)',
        rawData: s,
      });
    });
  }

  // ── sort by time ──
  transactions.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  // ── Summary calculate ──
  const totalSale    = transactions.filter(t => t.type === 'sale').reduce((a, t) => a + t.amount, 0);
  // নগদ আদায় = sale এর নগদ অংশ (due বাদ দিয়ে)
  const totalCashSale= transactions.filter(t => t.type === 'sale').reduce((a, t) => a + t.cash, 0);
  // বাকি আদায় = paymentLogs থেকে
  const totalPayment = transactions.filter(t => t.type === 'payment').reduce((a, t) => a + t.amount, 0);
  // মোট নগদ আদায় = sale cash + due payments
  const totalCash    = totalCashSale + totalPayment;
  // মোট বাকি = sale এর due (এখনো বাকি)
  const totalDue     = transactions.filter(t => t.type === 'sale').reduce((a, t) => a + t.due, 0);
  const totalExp     = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const totalSalary  = transactions.filter(t => t.type === 'salary').reduce((a, t) => a + t.amount, 0);
  const totalProfit  = CR==='admin' ? transactions.filter(t => t.type === 'sale').reduce((a, t) => a + (t.profit || 0), 0) : 0;

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">মোট বিক্রয়</div>
          <div style="font-size:16px;font-weight:800;color:var(--blue);font-family:'Sora',sans-serif">৳${Math.round(totalSale).toLocaleString('bn-BD')}</div>
        </div>
        <div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">নগদ আদায়</div>
          <div style="font-size:16px;font-weight:800;color:var(--green);font-family:'Sora',sans-serif">৳${Math.round(totalCash).toLocaleString('bn-BD')}</div>
          ${totalPayment > 0 ? `<div style="font-size:9px;color:var(--muted)">(বাকি আদায় ৳${Math.round(totalPayment).toLocaleString('bn-BD')} সহ)</div>` : ''}
        </div>
        <div style="background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">মোট বাকি</div>
          <div style="font-size:16px;font-weight:800;color:var(--purple);font-family:'Sora',sans-serif">৳${Math.round(totalDue).toLocaleString('bn-BD')}</div>
        </div>
        <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">মোট খরচ</div>
          <div style="font-size:16px;font-weight:800;color:var(--red);font-family:'Sora',sans-serif">৳${Math.round(totalExp).toLocaleString('bn-BD')}</div>
        </div>
        <div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">মোট বেতন</div>
          <div style="font-size:16px;font-weight:800;color:var(--accent);font-family:'Sora',sans-serif">৳${Math.round(totalSalary).toLocaleString('bn-BD')}</div>
        </div>
        ${CR==='admin' ? `<div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">নিট লাভ</div>
          <div style="font-size:16px;font-weight:800;color:var(--green);font-family:'Sora',sans-serif">৳${Math.round(totalProfit - totalExp - totalSalary).toLocaleString('bn-BD')}</div>
        </div>` : ''}
      </div>
      <div style="text-align:right;font-size:11px;color:var(--muted);margin-top:6px">মোট ${transactions.length}টি লেনদেন</div>`;
  }

  if (!transactions.length) {
    listEl.innerHTML = '<div class="empty"><div class="ic">📒</div><p>এই সময়ে কোনো লেনদেন নেই</p></div>';
    return;
  }

  // ── Transaction list render ──
  listEl.innerHTML = transactions.map(t => {
    const timeStr = t.ts ? new Date(t.ts).toLocaleString('bn-BD', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }) : t.date;

    return `<div style="background:var(--card);border-radius:var(--r);padding:13px 14px;border:1px solid var(--border-l);margin-bottom:8px;border-left:3px solid ${t.color}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:16px">${t.icon}</span>
            <span style="font-size:13px;font-weight:700;color:var(--text)">${t.title}</span>
          </div>
          ${t.sub1 ? `<div style="font-size:11px;color:var(--muted)">${t.sub1}</div>` : ''}
          ${t.sub2 ? `<div style="font-size:11px;color:var(--muted)">${t.sub2}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:5px;flex-wrap:wrap">
            <span style="font-size:10px;color:${t.extraColor};background:${t.extraColor}15;padding:2px 7px;border-radius:10px">${t.extra}</span>
            ${t.type === 'sale' && t.discount > 0 ? `<span style="font-size:10px;color:var(--muted)">ডিসকাউন্ট ${t.discount}%</span>` : ''}
            ${t.type === 'sale' ? `<span style="font-size:10px;color:var(--blue)">নগদ ৳${Math.round(t.cash).toLocaleString('bn-BD')}</span>` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:10px">
          <div style="font-size:16px;font-weight:800;color:${t.color};font-family:'Sora',sans-serif">
            ${t.type === 'expense' || t.type === 'salary' ? '-' : '+'}৳${Math.round(t.amount).toLocaleString('bn-BD')}
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px">${timeStr}</div>
          <div style="font-size:9px;color:var(--muted)">${t.date}</div>
        </div>
      </div>
    </div>`;
  }).join('');
};

window.ledgerExportPDF = () => {
  const w = window.open('', '_blank');
  const fromVal = document.getElementById('ledgerFrom')?.value || 'শুরু';
  const toVal   = document.getElementById('ledgerTo')?.value   || 'এখন';
  const content = document.getElementById('ledgerList')?.innerHTML || '';
  const summary = document.getElementById('ledgerSummary')?.innerHTML || '';
  w.document.write(`<html><head><meta charset="UTF-8">
    <title>NovaTEch BD লেজার</title>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body{font-family:'Hind Siliguri',Arial,sans-serif;padding:20px;color:#0f172a;max-width:800px;margin:0 auto}
      h1{color:#1e3a8a;border-bottom:3px solid #1e3a8a;padding-bottom:8px}
      .sub{color:#64748b;font-size:13px;margin-bottom:16px}
      @media print{button{display:none!important}}
    </style></head><body>
    <h1>📒 NovaTEch BD — সম্পূর্ণ লেজার</h1>
    <div class="sub">সময়কাল: ${fromVal} থেকে ${toVal} | তৈরি: ${new Date().toLocaleString('bn-BD')}</div>
    ${summary}
    <br>${content}
    <br><button onclick="window.print()" style="padding:12px 24px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit">🖨️ Print / PDF সেভ করুন</button>
    </body></html>`);
  w.document.close();
};

window.ledgerExportExcel = () => {
  const fromVal = document.getElementById('ledgerFrom')?.value || '';
  const toVal   = document.getElementById('ledgerTo')?.value   || '';

  const inRange = (dateStr) => {
    if (!fromVal && !toVal) return true;
    if (fromVal && dateStr < fromVal) return false;
    if (toVal   && dateStr > toVal)   return false;
    return true;
  };

  let csv = '\uFEFF'; // Bengali BOM
  csv += `NovaTEch BD লেজার — ${fromVal || 'শুরু'} থেকে ${toVal || 'এখন'}\n\n`;

  // বিক্রয়
  csv += '--- বিক্রয় তালিকা ---\n';
  // ✅ Admin হলে লাভ কলাম, না হলে নেই
  csv += CR==='admin'
    ? 'তারিখ,সময়,দোকান,পণ্য,পরিমাণ,মূল্য,ডিসকাউন্ট%,মোট,নগদ,বাকি,লাভ,কর্মী,OTP\n'
    : 'তারিখ,সময়,দোকান,পণ্য,পরিমাণ,মূল্য,ডিসকাউন্ট%,মোট,নগদ,বাকি,কর্মী,OTP\n';
  const selectedW = document.getElementById('ledgerWorkerFilter')?.value || '';
  Object.values(allSales || {})
    .filter(s => inRange(s.date || '') && (!selectedW || s.uid===selectedW))
    .sort((a,b)=>(b.ts||0)-(a.ts||0))
    .forEach(s => {
      const time = s.ts ? new Date(s.ts).toLocaleTimeString('bn-BD') : '';
      const cash = (s.total||0) - (s.due||0);
      if(CR==='admin'){
        csv += `${s.date||''},${time},${s.shop||''},${s.product||''},${s.qty||1},${s.sellPrice||0},${s.disc||0},${Math.round(s.total||0)},${Math.round(cash)},${Math.round(s.due||0)},${Math.round(s.profit||0)},${s.workerName||''},${s.otpConfirmed?'হ্যাঁ':'না'}\n`;
      } else {
        csv += `${s.date||''},${time},${s.shop||''},${s.product||''},${s.qty||1},${s.sellPrice||0},${s.disc||0},${Math.round(s.total||0)},${Math.round(cash)},${Math.round(s.due||0)},${s.workerName||''},${s.otpConfirmed?'হ্যাঁ':'না'}\n`;
      }
    });

  // পেমেন্ট লগ
  csv += '\n--- বাকি আদায় ---\n';
  csv += 'তারিখ,সময়,দোকান,পরিমাণ,আদায়কারী\n';
  Object.values(allPaymentLogs || {}).filter(p => inRange(p.date || '')).forEach(p => {
    const time = p.ts ? new Date(p.ts).toLocaleTimeString('bn-BD') : '';
    csv += `${p.date||''},${time},${p.shop||''},${Math.round(p.amount||0)},${p.collectedBy||''}\n`;
  });

  // খরচ
  csv += '\n--- খরচ তালিকা ---\n';
  csv += 'তারিখ,সময়,ধরন,পরিমাণ,নোট,কর্মী,স্ট্যাটাস\n';
  Object.values(allExpenses || {}).filter(e => inRange(e.date || '')).forEach(e => {
    const time = e.ts ? new Date(e.ts).toLocaleTimeString('bn-BD') : '';
    csv += `${e.date||''},${time},${e.type||''},${Math.round(e.amount||0)},${(e.note||'').replace(/,/g,'')},${e.workerName||''},${e.status||''}\n`;
  });

  // বেতন
  csv += '\n--- বেতন ও কমিশন ---\n';
  csv += 'মাস,নাম,মূল বেতন,কমিশন,মোট,লেট কাউন্ট\n';
  Object.values(allSalaries || {}).forEach(s => {
    const total = (s.baseSalary||s.salary||0) + (s.commission||0);
    csv += `${s.month||''},${s.name||s.workerName||''},${Math.round(s.baseSalary||s.salary||0)},${Math.round(s.commission||0)},${Math.round(total)},${s.lateCount||0}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `NovaTEch_Ledger_${fromVal||'all'}_${toVal||'now'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Excel ফাইল download হচ্ছে');
};

// ✅ Salary Slip Generator
window.generateSalarySlip = function() {
  const sal = allSalaries[CU?.uid]; if(!sal) { showToast('বেতন তথ্য নেই!',true); return; }
  const now = new Date();
  const monthName = now.toLocaleString('bn-BD',{month:'long',year:'numeric'});
  const curMonth = now.getMonth(), curYear = now.getFullYear();
  const mySales = (_sc.byUid[CU.uid]||[]).filter(s=>{
    const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;
  });
  const totalSale = mySales.reduce((a,b)=>a+(b.total||0),0);
  const comm = Math.round(Object.values(buildDailyCommMap(mySales)).reduce((a,v)=>a+calcCommission(v,allCommConfig||getDefaultSlabs()),0));
  const attList = Object.values(allAttendance).filter(a=>{
    const d=new Date(a.date);return a.uid===CU.uid&&d.getMonth()===curMonth&&d.getFullYear()===curYear;
  });
  const attDays = attList.length;
  const lateDays = attList.filter(a=>a.isLate).length;
  const allowTotal = Math.round(Object.values(allAllowances||{}).filter(a=>a.uid===CU.uid).reduce((a,b)=>a+(b.amount||0),0));
  const workDays = 26;
  const earnedBasic = Math.round((sal.basic||0)/workDays*attDays);
  const netPay = earnedBasic + comm + allowTotal;

  const ic = document.getElementById('invoiceContent'); if(!ic) return;
  window._currentInvoiceSaleId = null;
  ic.innerHTML=`
  <div style="font-family:'Hind Siliguri',Arial,sans-serif;padding:16px;color:#1a202c;max-width:400px;">
    <div style="background:linear-gradient(135deg,#065f46,#059669);color:#fff;padding:16px;border-radius:10px;margin-bottom:14px;">
      <div style="font-size:18px;font-weight:800;">📒 NovaTEch BD</div>
      <div style="font-size:11px;opacity:.75;margin-top:2px;">বেতন রশিদ (Salary Slip)</div>
      <div style="margin-top:8px;font-size:13px;opacity:.9;">${monthName}</div>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;">
        <div><div style="font-size:10px;color:#64748b;">কর্মীর নাম</div><div style="font-weight:700;font-size:14px;">${CN}</div></div>
        <div style="text-align:right;"><div style="font-size:10px;color:#64748b;">শিফট</div><div style="font-weight:600;font-size:12px;">${sal.shiftStart||'10:00'} – ${sal.shiftEnd||'17:50'}</div></div>
      </div>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:12px;">
      <div style="font-size:10px;color:#64748b;font-weight:700;margin-bottom:6px;">📅 উপস্থিতি ও বিক্রয়</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;"><span style="color:#64748b;">উপস্থিতি</span><span style="font-weight:600;">${attDays} দিন</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;"><span style="color:#64748b;">দেরিতে আসা</span><span style="color:${lateDays>0?'#ef4444':'#059669'};font-weight:600;">${lateDays} বার</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;"><span style="color:#64748b;">মাসের বিক্রয়</span><span style="font-weight:600;">${bn(totalSale)}</span></div>
    </div>
    <div style="border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px;">
      <div style="background:#1E3A8A;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;">💰 বেতন হিসাব</div>
      <div style="padding:10px 12px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;">মূল বেতন (${attDays}/${workDays} দিন)</span><span style="font-weight:600;">${bn(earnedBasic)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;">কমিশন</span><span style="font-weight:600;color:#d97706;">${bn(comm)}</span></div>
        ${allowTotal>0?`<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;">ভাতা</span><span style="font-weight:600;color:#0891b2;">${bn(allowTotal)}</span></div>`:''}
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;padding:8px 0;color:#059669;border-top:2px solid #e2e8f0;margin-top:4px;"><span>নেট বেতন</span><span>${bn(netPay)}</span></div>
      </div>
    </div>
    <div style="margin-bottom:12px;display:flex;gap:8px;">
      <button onclick="printInvoice()" style="flex:1;padding:9px;background:rgba(59,130,246,.12);border:1px solid var(--blue);border-radius:8px;color:#1E3A8A;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">🖨️ প্রিন্ট</button>
      <button onclick="shareSalaryWA(${earnedBasic},${comm},${allowTotal},${netPay},${attDays},'${monthName}')" style="flex:1;padding:9px;background:rgba(37,211,102,.12);border:1px solid #25d366;border-radius:8px;color:#25d366;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">📲 WhatsApp</button>
    </div>
    <div style="text-align:center;font-size:10px;color:#94a3b8;padding-top:8px;border-top:1px dashed #e2e8f0;">
      আমাদের সাথে যুক্ত হবার জন্য আপনাকে ধন্যবাদ<br>NovaTEch BD
    </div>
  </div>`;
  const h3=document.querySelector('#invoiceMo h3');
  if(h3) h3.textContent='🧾 বেতন রশিদ';
  openMo('invoiceMo');
};

window.shareSalaryWA = function(basic,comm,allow,net,att,month) {
  const line='━━━━━━━━━━━━━━━━━━━━';
  const msg=`📒 *NovaTEch BD*\n_বেতন রশিদ — ${month}_\n${line}\n👤 *${CN}*\n${line}\n💵 *মূল বেতন:* ${bn(basic)}\n🏆 *কমিশন:* ${bn(comm)}${allow>0?'\n🎁 *ভাতা:* '+bn(allow):''}\n📅 *উপস্থিতি:* ${att} দিন\n${line}\n💰 *নেট বেতন: ${bn(net)}*\n${line}\n_আমাদের সাথে যুক্ত হবার জন্য আপনাকে ধন্যবাদ_\n_NovaTEch BD_`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
};
