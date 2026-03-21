// ══════════════════════════════════════════════════
//  Firebase Bridge — firebase-config.js এ set হয়েছে
// ══════════════════════════════════════════════════
const auth    = window._auth;
const db      = window._db;
const ref     = window._ref;
const push    = window._push;
const set     = window._set;
const get     = window._get;
const onValue = window._onValue;
const update  = window._update;
const remove  = window._remove;
const signInWithEmailAndPassword    = window._signIn;
const signOut                       = window._signOut;
const createUserWithEmailAndPassword= window._createUser;
const onAuthStateChanged            = window._onAuthStateChanged;
const updatePassword                = window._updatePassword;

// ══ Global State — window এ রাখা হচ্ছে যাতে সব module access করতে পারে ══
window.CU=null; window.CR=null; window.CN=null;
window.allSales={}; window.allExpenses={}; window.allPaymentLogs={};
window.allProducts={}; window.allUsers={}; window.allAllowances={};
window.allCustomers={}; window.allRoutes={}; window.allRouteRequests={};
window.allStock={}; window.allStockAssign={}; window.allAttendance={};
window.allLeaves={}; window.allSalaries={}; window.allCommConfig={};
window.allNotices={}; window.allTeams={}; window.allSMSConfig={};
window.allDeleteRequests={}; window.allWorkerStatus={};
// Local aliases (এই module এ সুবিধার জন্য)
let filterMode='today',payShop=null,activeRouteId=null,routeFilter='all',currentOTId=null;
let pendingSaleData=null,pendingOTP=null,pendingSaleId=null;
// Shortcuts (read করার সময় window থেকে নেব)
const getState = k => window[k];

// ✅ Sales Cache — allSales বদলালে একবার compute করি
window._sc = {
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

  window._sc.arr = Object.entries(window.allSales).map(([id,s]) => ({...s, _id:id}));
  window._sc.byShop = {};
  window._sc.byUid = {};
  window._sc.byDate = {};
  window._sc.dueByShop = {};
  window._sc.totalByShop = {};
  window._sc.thisMonth = [];
  window._sc.today = [];

  window._sc.arr.forEach(s => {
    // by shopId
    if (s.shopId) {
      if (!window._sc.byShop[s.shopId]) window._sc.byShop[s.shopId] = [];
      window._sc.byShop[s.shopId].push(s);
    }
    // by uid
    if (s.uid) {
      if (!window._sc.byUid[s.uid]) window._sc.byUid[s.uid] = [];
      window._sc.byUid[s.uid].push(s);
    }
    // by date
    if (s.date) {
      if (!window._sc.byDate[s.date]) window._sc.byDate[s.date] = [];
      window._sc.byDate[s.date].push(s);
    }
    // due by shop name
    if (s.due > 0) {
      window._sc.dueByShop[s.shop] = (window._sc.dueByShop[s.shop]||0) + s.due;
    }
    // total by shopId
    if (s.shopId) {
      window._sc.totalByShop[s.shopId] = (window._sc.totalByShop[s.shopId]||0) + (s.total||0);
    }
    // this month
    if (s.date) {
      const d = new Date(s.date);
      if (d.getMonth()===curMonth && d.getFullYear()===curYear) window._sc.thisMonth.push(s);
    }
    // today
    if (s.date === todayStr) window._sc.today.push(s);
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
window.$         = $;
window.bn        = bn;
window.today     = today;
window.fmtDate   = fmtDate;
window.fmtTime   = fmtTime;
window.genOTP    = genOTP;
window.showToast = showToast;
window.loader    = loader;


// ══ syncGlobals — features.js ও analytics.js এর জন্য ══
function syncGlobals(){
  // State already in window.* — nothing to copy
  // Firebase functions (already set in firebase-config.js bridge)
  window.uploadImageToFirebase = window.uploadImageToFirebase;
  // Render functions — lazy: এই সময়ে define হয়ে যাবে
  const fns = ['renderCustomers','renderRouteRequests','updateOTPStatus',
    'sShopSelChange','calcSaleSummary','renderSaleList','renderDue',
    'renderExpList','refreshDash','renderAttendance','renderLeaves',
    'renderSalary','renderTeams','renderStock','renderProfile','renderReport',
    'renderCommSlabs','renderUserList','renderAllowList','renderMyAllowance',
    'renderNoticeBoard','checkLateAlert','renderProdChips','renderVisitList',
    'loadRouteSelects','loadCustomerSelect','loadProductSelects',
    'loadAllWorkerSelects','buildNav','setActiveTab','computeSalesCache'];
  fns.forEach(fn => {
    if (typeof window[fn] === 'function') return; // already set
    Object.defineProperty(window, fn, {
      get: () => globalThis[fn], configurable: true, enumerable: true
    });
  });
}
window.syncGlobals = syncGlobals;

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
    loader(true);window.CU=user;
    const snap=await get(ref(db,'users/'+user.uid));
    if(snap.exists()){
      const p=snap.val();window.CR=p.role;window.CN=p.name;
      // Suspended বা Fired user — সাথে সাথে logout
      if(p.status==='suspended'||p.status==='fired'){
        await signOut(auth);loader(false);
        $('authScreen').style.display='flex';$('appScreen').style.display='none';
        const e=$('authErr');if(e){e.textContent=p.status==='suspended'?'❌ আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে।':'❌ আপনাকে বহিষ্কার করা হয়েছে।';e.style.display='block';}
        return;
      }
    }
    else{window.CR='admin';window.CN=user.email;await set(ref(db,'users/'+user.uid),{name:user.email,email:user.email,role:'admin',status:'active'});}
    initApp();
  }else{
    window.CU=null;$('loader').style.display='none';
    $('authScreen').style.display='flex';$('appScreen').style.display='none';
  }
});

function initApp(){
  $('authScreen').style.display='none';$('appScreen').style.display='block';
  $('userName').textContent=window.CN;
  const rb=$('roleBadge');
  rb.textContent=window.CR==='admin'?'অ্যাডমিন':window.CR==='manager'?'ম্যানেজার':'কর্মী';
  rb.className='role-badge role-'+window.CR;
  $('profitCard').style.display=window.CR==='admin'?'block':'none';
  // ✅ লাভ কার্ড লুকালে বিক্রয় কার্ড full width নেবে
  const saleCard = document.querySelector('.sum-card.c-sale');
  if(saleCard) saleCard.style.gridColumn = window.CR==='admin' ? '' : '1 / -1';
  // ✅ পুরানো cached key সাফ করি
  localStorage.removeItem('nt-ai-key');
  delete window._ntAIKey;
  buildNav();
  // Set default dates
  [$('sDate'),$('eDate'),$('stDate'),$('leaveFrom'),$('leaveTo'),$('otDate')].forEach(el=>{if(el)el.value=today();});
  initShiftPreview();
  // Worker এর জন্য কর্মী তৈরি ফর্ম লুকাও
  const cuForm=$('createUserForm');
  if(cuForm&&window.CR==='worker')cuForm.style.display='none';
  loadDriveConfig();
  // AI Config লোড — শুধু Admin, key window-এ রাখা হবে না
  if(window.CR==='admin'){
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

  onValue(ref(db,'sales'),s=>{window.allSales=s.val()||{};computeSalesCache();syncGlobals();refreshDash();renderSaleList();renderDue();if(window.CR==='admin')renderReport();renderProfile();
    // ✅ Dashboard chart refresh
    if(typeof window.drawDashboardCharts==='function') setTimeout(window.drawDashboardCharts,200);
  });
  onValue(ref(db,'expenses'),s=>{window.allExpenses=s.val()||{};refreshDash();renderExpList();if(window.CR==='admin')renderReport();});
  onValue(ref(db,'products'),s=>{window.allProducts=s.val()||{};loadProductSelects();if(window.CR==='admin')renderProdChips();});
  onValue(ref(db,'users'),s=>{window.allUsers=s.val()||{};syncGlobals();if(window.CR==='admin'||window.CR==='manager')renderUserList();loadAllWorkerSelects();});
  onValue(ref(db,'allowances'),s=>{window.allAllowances=s.val()||{};renderMyAllowance();if(window.CR!=='worker')renderAllowList();});
  onValue(ref(db,'customers'),s=>{window.allCustomers=s.val()||{};renderCustomers();loadCustomerSelect();loadBroadcastRoutes();});
  onValue(ref(db,'routes'),s=>{window.allRoutes=s.val()||{};renderRouteChips();loadRouteSelects();renderVisitList();});
  onValue(ref(db,'stock'),s=>{window.allStock=s.val()||{};renderStock();});
  onValue(ref(db,'stockAssign'),s=>{window.allStockAssign=s.val()||{};renderStock();});
  onValue(ref(db,'attendance'),s=>{window.allAttendance=s.val()||{};renderAttendance();checkLateAlert();});
  onValue(ref(db,'leaves'),s=>{window.allLeaves=s.val()||{};renderLeaves();});
  onValue(ref(db,'paymentLogs'),s=>{window.allPaymentLogs=s.val()||{};});
  onValue(ref(db,'salaries'),s=>{window.allSalaries=s.val()||{};renderSalary();});
  onValue(ref(db,'commConfig'),s=>{window.allCommConfig=s.val()||getDefaultSlabs();renderCommSlabs();renderSalary();});
  onValue(ref(db,'notices'),s=>{window.allNotices=s.val()||{};renderNoticeBoard();});
  onValue(ref(db,'teams'),s=>{window.allTeams=s.val()||{};renderTeams();});
  onValue(ref(db,'smsConfig'),s=>{window.allSMSConfig=s.val()||{};loadSMSConfig();});
  onValue(ref(db,'routeRequests'),s=>{window.allRouteRequests=s.val()||{};renderRouteRequests();});
  // ✅ Delete requests listener
  onValue(ref(db,'deleteRequests'),s=>{
    window.allDeleteRequests=s.val()||{};
    if(window.CR==='admin') renderDeleteRequests();
  });
  // ✅ Worker route status listener — Admin/Manager দেখবে
  onValue(ref(db,'workerStatus'),s=>{
    window.allWorkerStatus=s.val()||{};
    if(window.CR==='admin'||window.CR==='manager') renderWorkerRouteStatus();
  });

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

  // ✅ Admin debug console (Eruda) — শুধু Admin এর জন্য
  if(window.CR === 'admin' && typeof window._loadEruda === 'function') {
    window._loadEruda();
  }

  // ✅ নতুন ফিচার সক্রিয় করি
  initFCMPushNotification();
  initOfflineSync();
  if(window.CR==='worker') initLiveGPS();

  // ✅ মাসিক সতর্কতা — শুধু Admin
  if(window.CR==='admin') setTimeout(checkMonthlyAlerts, 1500);
}

// ══ Core functions → window expose ══
window.computeSalesCache = computeSalesCache;
