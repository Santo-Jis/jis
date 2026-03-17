// ══════════════════════════════════════════════════
//  NovaTEch BD — Enterprise App Engine v3.0
//  Team: World's Top 1% Developers
// ══════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set, push, get, onValue, update, remove, query, orderByChild, limitToLast, enableNetwork, disableNetwork } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── Firebase Config
const FC={apiKey:"AIzaSyAHdK7zelJcBFc8fOFSgH8G_6jEjZdNoSI",authDomain:"novatech-bd-10421.firebaseapp.com",databaseURL:"https://novatech-bd-10421-default-rtdb.firebaseio.com",projectId:"novatech-bd-10421",storageBucket:"novatech-bd-10421.firebasestorage.app",messagingSenderId:"1098950143887",appId:"1:1098950143887:web:bb7014007540c878b165fa"};
const app=initializeApp(FC);
const auth=getAuth(app);
const db=getDatabase(app);

// ── State (role-based data — worker শুধু নিজের data পাবে)
let CU=null,CR=null,CN=null;
let allSales={},allExpenses={},allProducts={},allUsers={},allAllowances={},allCustomers={},allRoutes={},allStock={},allStockAssign={},allAttendance={},allLeaves={},allSalaries={},allCommConfig={},allNotices={},allTeams={},allSMSConfig={};
let filterMode=localStorage.getItem('nt-filter')||'today';
let payShop=null,activeRouteId=localStorage.getItem('nt-route')||null;
let routeFilter=localStorage.getItem('nt-routeFilter')||'all';
let currentOTId=null,pendingSaleData=null,pendingOTP=null;
let offlineQueue=JSON.parse(localStorage.getItem('nt-queue')||'[]');
let notifications=JSON.parse(localStorage.getItem('nt-notifs')||'[]');
let dbListeners=[];

// ── Helpers
const $=id=>document.getElementById(id);
const bn=n=>'৳'+Math.round(n||0).toLocaleString('bn-BD');
const today=()=>new Date().toISOString().split('T')[0];
const fmtDate=d=>new Date(d).toLocaleDateString('bn-BD',{day:'numeric',month:'short'});
const fmtTime=ts=>new Date(ts).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'});
const genOTP=()=>Math.floor(100000+Math.random()*900000).toString();

// ── XSS Protection
function san(str){
  if(str===null||str===undefined)return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

// ── Error Messages (Bengali)
function getErrMsg(e){
  const codes={'auth/wrong-password':'পাসওয়ার্ড ভুল!','auth/user-not-found':'এই ইমেইলে কোনো অ্যাকাউন্ট নেই!','auth/email-already-in-use':'এই ইমেইল ইতিমধ্যে ব্যবহৃত!','auth/weak-password':'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর!','auth/too-many-requests':'অনেক বার চেষ্টা হয়েছে, একটু পরে আবার চেষ্টা করুন।','auth/network-request-failed':'ইন্টারনেট সংযোগ নেই!','auth/invalid-credential':'ইমেইল বা পাসওয়ার্ড ভুল!'};
  return codes[e.code]||('সমস্যা: '+(e.message||'অজানা'));
}

// ── Toast
function showToast(msg,err,warn){
  const t=$('toast');t.textContent=msg;
  t.className='toast'+(err?' err':warn?' warn':'')+' show';
  setTimeout(()=>t.className='toast',3000);
}
function loader(s){$('loader').style.display=s?'flex':'none';}

// ── Skeleton
function skeletonCards(n=3){
  return Array(n).fill(0).map(()=>`<div class="skel skel-card"></div><div style="padding:0 4px;margin-bottom:12px"><div class="skel skel-line" style="width:70%;margin-bottom:6px"></div><div class="skel skel-line short"></div></div>`).join('');
}

// ══════════════════════════════════════════════════
//  📡 OFFLINE QUEUE ENGINE
// ══════════════════════════════════════════════════
let isOnline=navigator.onLine;

window.addEventListener('online',()=>{
  isOnline=true;
  showOfflineBanner(false);
  flushQueue();
});
window.addEventListener('offline',()=>{
  isOnline=false;
  showOfflineBanner(true);
});

function showOfflineBanner(offline){
  let b=$('offlineBanner');
  if(!b){
    b=document.createElement('div');b.id='offlineBanner';
    document.body.prepend(b);
  }
  if(offline){
    b.className='offline-banner';
    b.innerHTML='📵 অফলাইন — ডেটা সেভ হচ্ছে, ইন্টারনেট আসলে sync হবে <span id="queueCount"></span>';
    b.style.display='flex';
    updateQueueBadge();
  }else{
    b.className='offline-banner online-banner';
    b.innerHTML='✅ অনলাইন — সব ডেটা sync হচ্ছে';
    b.style.display='flex';
    setTimeout(()=>b.style.display='none',3000);
  }
}

function updateQueueBadge(){
  const el=$('queueCount');
  if(el&&offlineQueue.length>0)el.textContent=`(${offlineQueue.length}টি pending)`;
}

async function queueOrRun(dbRef,data,type='push'){
  if(isOnline){
    if(type==='push')return await push(dbRef,data);
    if(type==='set')return await set(dbRef,data);
    if(type==='update')return await update(dbRef,data);
  }else{
    offlineQueue.push({path:dbRef.toString().split('.firebaseio.com')[1],data,type,ts:Date.now()});
    localStorage.setItem('nt-queue',JSON.stringify(offlineQueue));
    updateQueueBadge();
    showToast('অফলাইনে সেভ হয়েছে ✓',false,true);
    return{key:'offline_'+Date.now()};
  }
}

async function flushQueue(){
  if(!offlineQueue.length)return;
  showToast(`${offlineQueue.length}টি offline ডেটা sync হচ্ছে...`,false,true);
  const toProcess=[...offlineQueue];
  offlineQueue=[];
  localStorage.setItem('nt-queue','[]');
  for(const item of toProcess){
    try{
      const r=ref(db,item.path);
      if(item.type==='push')await push(r,item.data);
      else if(item.type==='set')await set(r,item.data);
      else if(item.type==='update')await update(r,item.data);
    }catch(e){
      offlineQueue.push(item);
      localStorage.setItem('nt-queue',JSON.stringify(offlineQueue));
    }
  }
  if(!offlineQueue.length)showToast('সব ডেটা sync সম্পন্ন ✓');
  else showToast(`${offlineQueue.length}টি sync ব্যর্থ, পরে চেষ্টা হবে`,true);
}

// ══════════════════════════════════════════════════
//  🔔 NOTIFICATION ENGINE
// ══════════════════════════════════════════════════
function addNotification(icon,title,body,type='info'){
  const n={id:Date.now(),icon,title,body,type,ts:Date.now(),read:false};
  notifications.unshift(n);
  if(notifications.length>50)notifications.pop();
  localStorage.setItem('nt-notifs',JSON.stringify(notifications));
  renderNotifBell();
  renderNotifPanel();
}

function renderNotifBell(){
  const unread=notifications.filter(n=>!n.read).length;
  const dot=$('notifDot');
  if(dot)dot.style.display=unread>0?'block':'none';
  const cnt=$('notifCount');
  if(cnt)cnt.textContent=unread>0?unread:'';
}

function renderNotifPanel(){
  const el=$('notifList');if(!el)return;
  if(!notifications.length){el.innerHTML='<div class="empty" style="padding:20px"><div class="ic">🔔</div>কোনো নোটিফিকেশন নেই</div>';return;}
  el.innerHTML=notifications.slice(0,20).map(n=>`
    <div class="notif-item ${n.read?'':'unread'}" onclick="markNotifRead(${n.id})">
      <div class="notif-icon">${n.icon}</div>
      <div><div class="notif-text"><b>${san(n.title)}</b><br>${san(n.body)}</div>
      <div class="notif-time">${fmtTime(n.ts)}</div></div>
    </div>`).join('');
}

window.markNotifRead=id=>{
  notifications=notifications.map(n=>n.id===id?{...n,read:true}:n);
  localStorage.setItem('nt-notifs',JSON.stringify(notifications));
  renderNotifBell();renderNotifPanel();
};
window.clearNotifs=()=>{notifications=[];localStorage.removeItem('nt-notifs');renderNotifBell();renderNotifPanel();};
window.toggleNotifPanel=()=>{
  const p=$('notifPanel');
  if(!p)return;
  const open=p.classList.toggle('open');
  if(open){notifications=notifications.map(n=>({...n,read:true}));localStorage.setItem('nt-notifs',JSON.stringify(notifications));renderNotifBell();}
};

// ══════════════════════════════════════════════════
//  🔐 SECURITY ENGINE
// ══════════════════════════════════════════════════
const MAX_ATTEMPTS=5,LOCKOUT_MS=5*60*1000;

function getAttemptData(){try{return JSON.parse(localStorage.getItem('nt-attempts')||'{"count":0,"ts":0}');}catch{return{count:0,ts:0};}}
function setAttemptData(d){localStorage.setItem('nt-attempts',JSON.stringify(d));}
function resetAttempts(){localStorage.removeItem('nt-attempts');}

function checkLockout(){
  const d=getAttemptData();
  if(d.count>=MAX_ATTEMPTS){
    const elapsed=Date.now()-d.ts;
    if(elapsed<LOCKOUT_MS)return`🔒 ${Math.ceil((LOCKOUT_MS-elapsed)/60000)} মিনিট পরে আবার চেষ্টা করুন।`;
    else{resetAttempts();return null;}
  }
  return null;
}
function recordFailedAttempt(){const d=getAttemptData();d.count=(d.count||0)+1;d.ts=Date.now();setAttemptData(d);return MAX_ATTEMPTS-d.count;}
function showAttemptInfo(){const d=getAttemptData();const ai=$('attemptInfo');if(!ai)return;ai.textContent=d.count>0&&d.count<MAX_ATTEMPTS?`⚠️ ${d.count}/${MAX_ATTEMPTS} বার ভুল`:'';}

window.togglePassVis=(inputId,btnId)=>{const inp=$(inputId),btn=$(btnId);if(!inp)return;const isPass=inp.type==='password';inp.type=isPass?'text':'password';if(btn)btn.textContent=isPass?'🙈':'👁';};

function validatePassword(pass){
  if(!pass||pass.length<8)return 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে!';
  if(!/[A-Z]/.test(pass))return 'বড় হাতের অক্ষর (A-Z) থাকতে হবে!';
  if(!/[0-9]/.test(pass))return 'সংখ্যা (0-9) থাকতে হবে!';
  if(!/[^A-Za-z0-9]/.test(pass))return 'বিশেষ চিহ্ন (!@#$) থাকতে হবে!';
  return null;
}

window.checkPassStrength=(pass,wrapId)=>{
  const wrap=$(wrapId);if(!wrap)return;
  if(!pass){wrap.style.display='none';return;}
  wrap.style.display='block';
  const checks={len:pass.length>=8,upper:/[A-Z]/.test(pass),lower:/[a-z]/.test(pass),num:/[0-9]/.test(pass),sym:/[^A-Za-z0-9]/.test(pass)};
  const score=Object.values(checks).filter(Boolean).length;
  const levels=[{w:'0%',bg:'var(--border)',txt:'',col:'var(--muted)'},{w:'20%',bg:'var(--red)',txt:'🔴 অত্যন্ত দুর্বল',col:'var(--red)'},{w:'40%',bg:'var(--red-l)',txt:'🟠 দুর্বল',col:'var(--red-l)'},{w:'60%',bg:'var(--accent)',txt:'🟡 মাঝারি',col:'var(--accent)'},{w:'80%',bg:'var(--blue)',txt:'🔵 ভালো',col:'var(--blue)'},{w:'100%',bg:'var(--green)',txt:'🟢 শক্তিশালী',col:'var(--green)'}];
  const lv=levels[score]||levels[0];
  const fill=$(wrapId+'Fill'),txt=$(wrapId+'Txt'),req=$(wrapId+'Req');
  if(fill){fill.style.width=lv.w;fill.style.background=lv.bg;}
  if(txt){txt.textContent=lv.txt;txt.style.color=lv.col;}
  if(req)req.innerHTML=[`<span class="${checks.len?'req-ok':'req-bad'}">${checks.len?'✓':'✗'} ৮+ অক্ষর</span>`,`<span class="${checks.upper?'req-ok':'req-bad'}">${checks.upper?'✓':'✗'} বড় হাতের</span>`,`<span class="${checks.num?'req-ok':'req-bad'}">${checks.num?'✓':'✗'} সংখ্যা</span>`,`<span class="${checks.sym?'req-ok':'req-bad'}">${checks.sym?'✓':'✗'} চিহ্ন</span>`].join('');
  return score;
};

// Session Timeout
const IDLE_TIMEOUT=15*60*1000,WARN_TIMEOUT=60*1000;
let idleTimer=null,countdownTimer=null,countdownSec=60;
const ACTIVITY_EVENTS=['mousemove','keydown','touchstart','click','scroll'];

function resetIdleTimer(){clearTimeout(idleTimer);clearInterval(countdownTimer);hideSessionWarning();idleTimer=setTimeout(showSessionWarning,IDLE_TIMEOUT);}
function showSessionWarning(){countdownSec=60;$('sessionCountdown').textContent=countdownSec;$('sessionOverlay')?.classList.add('show');countdownTimer=setInterval(()=>{countdownSec--;const el=$('sessionCountdown');if(el)el.textContent=countdownSec;if(countdownSec<=0){clearInterval(countdownTimer);doLogout();}},1000);}
function hideSessionWarning(){$('sessionOverlay')?.classList.remove('show');clearInterval(countdownTimer);}
window.extendSession=()=>{hideSessionWarning();resetIdleTimer();showToast('সেশন বাড়ানো হয়েছে ✓');};
function startSessionTimer(){ACTIVITY_EVENTS.forEach(ev=>document.addEventListener(ev,resetIdleTimer,{passive:true}));resetIdleTimer();}
function stopSessionTimer(){ACTIVITY_EVENTS.forEach(ev=>document.removeEventListener(ev,resetIdleTimer));clearTimeout(idleTimer);clearInterval(countdownTimer);hideSessionWarning();}

// ══════════════════════════════════════════════════
//  🔑 AUTH
// ══════════════════════════════════════════════════
window.doLogin=async()=>{
  const lockMsg=checkLockout();
  if(lockMsg){const lb=$('lockoutBanner');if(lb){lb.textContent=lockMsg;lb.style.display='block';}return;}
  const em=$('loginEmail').value.trim(),ps=$('loginPass').value;
  if(!em||!ps){showErr('ইমেইল ও পাসওয়ার্ড দিন');return;}
  loader(true);
  try{
    await signInWithEmailAndPassword(auth,em,ps);
    resetAttempts();
    const lb=$('lockoutBanner');if(lb)lb.style.display='none';
  }catch(e){
    loader(false);
    const remaining=recordFailedAttempt();
    showAttemptInfo();
    const lm2=checkLockout();
    if(lm2){const lb=$('lockoutBanner');if(lb){lb.textContent=lm2;lb.style.display='block';}showErr('');}
    else showErr(getErrMsg(e)+(remaining>0?` (${remaining} চেষ্টা বাকি)`:''));
  }
};

window.doLogout=async()=>{
  stopSessionTimer();
  detachAllListeners();
  await signOut(auth);
};
function showErr(m){const e=$('authErr');if(e){e.textContent=m;e.style.display=m?'block':'none';}}

onAuthStateChanged(auth,async user=>{
  if(user){
    loader(true);CU=user;
    const snap=await get(ref(db,'users/'+user.uid));
    if(snap.exists()){
      const p=snap.val();CR=p.role;CN=p.name;
      if(p.status==='suspended'||p.status==='fired'){
        await signOut(auth);loader(false);
        showErr(p.status==='suspended'?'অ্যাকাউন্ট স্থগিত। Admin-এর সাথে যোগাযোগ করুন।':'অ্যাকাউন্ট বন্ধ করা হয়েছে।');return;
      }
      if(p.role==='pending'){
        await signOut(auth);loader(false);
        showErr('অ্যাকাউন্ট অনুমোদনের অপেক্ষায়। Admin অনুমোদন করলে লগইন করতে পারবেন।');return;
      }
      initApp();
    }else{
      const allUsersSnap=await get(ref(db,'users'));
      const isFirstUser=!allUsersSnap.exists()||Object.keys(allUsersSnap.val()||{}).length===0;
      if(isFirstUser){
        CR='admin';CN=user.email;
        await set(ref(db,'users/'+user.uid),{name:user.email,email:user.email,role:'admin',status:'active',createdAt:today()});
        initApp();
      }else{
        await set(ref(db,'users/'+user.uid),{name:user.email,email:user.email,role:'pending',status:'pending',createdAt:today()});
        await signOut(auth);loader(false);
        showErr('অ্যাকাউন্ট নিবন্ধিত হয়েছে। Admin অনুমোদন করলে লগইন করতে পারবেন।');
      }
    }
  }else{
    CU=null;$('loader').style.display='none';
    $('authScreen').style.display='flex';$('appScreen').style.display='none';
  }
});

// ── Detach all Firebase listeners on logout (memory leak fix)
function detachAllListeners(){
  dbListeners.forEach(unsub=>{try{unsub();}catch(e){}});
  dbListeners=[];
}
function listen(dbRef,cb){
  const unsub=onValue(dbRef,cb);
  dbListeners.push(unsub);
}

// ══════════════════════════════════════════════════
//  🏗️ APP INIT — Role-based data loading
// ══════════════════════════════════════════════════
function initApp(){
  $('authScreen').style.display='none';$('appScreen').style.display='block';
  $('userName').textContent=CN;
  const thBtn=$('themeToggleBtn');
  if(thBtn)thBtn.textContent=document.documentElement.getAttribute('data-theme')==='light'?'☀️':'🌙';

  // Theme from localStorage
  const saved=localStorage.getItem('nt-theme');
  if(saved){document.documentElement.setAttribute('data-theme',saved);}

  // Responsive bottom nav
  function updateBottomNav(){
    const isMobile=window.innerWidth<768;
    const bn=$('bottomNav');
    document.body.classList.toggle('has-bottom-nav',isMobile);
    if(bn)bn.style.display=isMobile?'flex':'none';
  }
  updateBottomNav();
  window.addEventListener('resize',()=>{updateBottomNav();requestAnimationFrame(()=>{drawSparklines();drawSalesTrendChart();drawTopProductsChart();drawTopShopsChart();});});

  // Role-based UI
  applyRoleUI();
  buildNav();

  // Default dates
  [$('sDate'),$('eDate'),$('stDate'),$('leaveFrom'),$('leaveTo'),$('otDate')].forEach(el=>{if(el)el.value=today();});
  initShiftPreview();

  // Skeleton loading
  ['dashSales','saleList','expList','dueList','custList'].forEach(id=>{const el=$(id);if(el)el.innerHTML=skeletonCards(3);});

  // ── Role-based Firebase listeners (worker শুধু নিজের data)
  if(CR==='worker'){
    // Worker: শুধু নিজের sales
    listen(ref(db,'sales'),s=>{
      const all=s.val()||{};
      allSales={};
      Object.entries(all).forEach(([k,v])=>{if(v.uid===CU.uid)allSales[k]=v;});
      refreshDash();renderSaleList();renderDue();renderProfile();
    });
    // Worker: শুধু নিজের expenses
    listen(ref(db,'expenses'),s=>{
      const all=s.val()||{};
      allExpenses={};
      Object.entries(all).forEach(([k,v])=>{if(v.uid===CU.uid)allExpenses[k]=v;});
      refreshDash();renderExpList();
    });
    // Worker: শুধু নিজের attendance
    listen(ref(db,'attendance'),s=>{
      const all=s.val()||{};
      allAttendance={};
      Object.entries(all).forEach(([k,v])=>{if(v.uid===CU.uid)allAttendance[k]=v;});
      renderAttendance();
    });
    // Worker: শুধু নিজের leaves
    listen(ref(db,'leaves'),s=>{
      const all=s.val()||{};
      allLeaves={};
      Object.entries(all).forEach(([k,v])=>{if(v.uid===CU.uid)allLeaves[k]=v;});
      renderLeaves();
    });
    // Worker: শুধু নিজের salary
    listen(ref(db,'salaries/'+CU.uid),s=>{
      allSalaries={};
      if(s.exists())allSalaries[CU.uid]=s.val();
      renderProfile();
    });
  } else {
    // Admin/Manager: সব data
    listen(ref(db,'sales'),s=>{allSales=s.val()||{};refreshDash();renderSaleList();renderDue();if(CR==='admin')renderReport();renderProfile();checkLowStockAlert();});
    listen(ref(db,'expenses'),s=>{allExpenses=s.val()||{};refreshDash();renderExpList();if(CR==='admin')renderReport();renderExpenseApprovals();});
    listen(ref(db,'attendance'),s=>{allAttendance=s.val()||{};renderAttendance();checkLateAlert();});
    listen(ref(db,'leaves'),s=>{allLeaves=s.val()||{};renderLeaves();});
    listen(ref(db,'salaries'),s=>{allSalaries=s.val()||{};renderSalary();});
  }

  // Common data (everyone needs)
  listen(ref(db,'products'),s=>{allProducts=s.val()||{};loadProductSelects();if(CR==='admin')renderProdChips();checkLowStockAlert();});
  listen(ref(db,'customers'),s=>{allCustomers=s.val()||{};renderCustomers();loadCustomerSelect();loadBroadcastRoutes();});
  listen(ref(db,'routes'),s=>{allRoutes=s.val()||{};renderRouteChips();loadRouteSelects();renderVisitList();});
  listen(ref(db,'stock'),s=>{allStock=s.val()||{};renderStock();checkLowStockAlert();});
  listen(ref(db,'stockAssign'),s=>{allStockAssign=s.val()||{};renderStock();});
  listen(ref(db,'commConfig'),s=>{allCommConfig=s.val()||getDefaultSlabs();renderCommSlabs();});
  listen(ref(db,'notices'),s=>{allNotices=s.val()||{};renderNoticeBoard();});
  listen(ref(db,'teams'),s=>{allTeams=s.val()||{};renderTeams();});
  listen(ref(db,'smsConfig'),s=>{allSMSConfig=s.val()||{};loadSMSConfig();});

  if(CR!=='worker'){
    listen(ref(db,'users'),s=>{allUsers=s.val()||{};if(CR==='admin')renderUserList();loadAllWorkerSelects();});
    listen(ref(db,'allowances'),s=>{allAllowances=s.val()||{};renderMyAllowance();if(CR!=='worker')renderAllowList();});
  }

  loader(false);showPage('dash');
  startSessionTimer();
  patchAuditLogs();
  renderNotifBell();
  if(!isOnline)showOfflineBanner(true);
  if(offlineQueue.length)flushQueue();

  // Notice expiry preview
  $('noticeExpVal')?.addEventListener('input',updateExpPreview);
  $('noticeExpUnit')?.addEventListener('change',updateExpPreview);
}

function applyRoleUI(){
  const isWorker=CR==='worker',isAdmin=CR==='admin';
  $('profitCard').style.display=isWorker?'none':'block';
  if(isWorker){$('dashChartSection').style.display='none';$('workerChartSection').style.display='block';}
  if(isWorker){const hide=id=>{const e=$(id);if(e)e.style.display='none';};hide('plStatement');}
  if(!isAdmin){const prodForm=document.querySelector('[onclick="addProduct()"]');if(prodForm)prodForm.closest('.form-card').style.display='none';}
  if(!isAdmin){const resetBtn=document.querySelector('[onclick="resetAllSales()"]');if(resetBtn)resetBtn.parentElement.style.display='none';}
  if(!isAdmin){const auditCard=$('auditLogList')?.closest('.form-card');if(auditCard)auditCard.style.display='none';}
}


// ══════════════════════════════════════════════════
//  📊 INVOICE GENERATOR
// ══════════════════════════════════════════════════
let currentInvoiceSale=null;

window.generateInvoice=async(saleId)=>{
  const s=allSales[saleId]||currentInvoiceSale;
  if(!s)return;
  const cust=s.shopId?allCustomers[s.shopId]:null;
  const invNo='INV-'+Date.now().toString().slice(-8);
  const vatRate=parseFloat($('vatRate')?.value)||0;
  const gstRate=parseFloat($('gstRate')?.value)||0;
  const vatAmt=s.total*vatRate/100;
  const gstAmt=s.total*gstRate/100;
  const grandTotal=s.total+vatAmt+gstAmt;
  const now=new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto;color:#1a202c;font-size:13px;}
  .header{background:linear-gradient(135deg,#1E3A8A,#2B4FAF);color:#fff;padding:20px;border-radius:10px 10px 0 0;}
  .header h1{font-size:22px;font-weight:800;letter-spacing:-.3px;}
  .header .sub{font-size:11px;opacity:.8;margin-top:3px;}
  .inv-meta{background:#f8fafc;padding:14px 20px;border:1px solid #e2e8f0;display:flex;justify-content:space-between;}
  .meta-box .label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;}
  .meta-box .value{font-size:13px;font-weight:600;margin-top:2px;}
  .section{padding:16px 20px;}
  .cust-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:14px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th{background:#1E3A8A;color:#fff;padding:8px 10px;text-align:left;}
  td{padding:8px 10px;border-bottom:1px solid #e2e8f0;}
  .total-section{background:#f0fdf4;border-radius:0 0 10px 10px;padding:16px 20px;}
  .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;}
  .grand-total{font-size:18px;font-weight:800;color:#059669;border-top:2px solid #e2e8f0;padding-top:10px;margin-top:5px;}
  .footer{text-align:center;margin-top:16px;font-size:10px;color:#94a3b8;padding-top:10px;border-top:1px solid #e2e8f0;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;}
  .paid{background:#d1fae5;color:#065f46;}.due{background:#fee2e2;color:#991b1b;}.partial{background:#fef3c7;color:#92400e;}
  @media print{body{padding:0;}}
</style></head><body>
<div class="header">
  <h1>🏢 NovaTEch BD</h1>
  <div class="sub">হিসাব ব্যবস্থাপনা সিস্টেম | novatech-bd</div>
</div>
<div class="inv-meta">
  <div class="meta-box"><div class="label">ইনভয়েস নম্বর</div><div class="value">${invNo}</div></div>
  <div class="meta-box"><div class="label">তারিখ</div><div class="value">${san(s.date)}</div></div>
  <div class="meta-box"><div class="label">কর্মী</div><div class="value">${san(s.workerName||'-')}</div></div>
  <div class="meta-box"><div class="label">স্ট্যাটাস</div><div class="value"><span class="badge ${s.payStatus}">${s.payStatus==='paid'?'✓ পরিশোধিত':s.payStatus==='due'?'বাকি':'আংশিক'}</span></div></div>
</div>
<div class="section">
  <div class="cust-box">
    <div style="font-size:11px;color:#64748b;margin-bottom:6px">বিক্রয়স্থল</div>
    <div style="font-size:15px;font-weight:700">🏪 ${san(s.shop)}</div>
    ${cust?`<div style="font-size:12px;color:#64748b;margin-top:3px">👤 ${san(cust.owner||'')} ${cust.smsNum?'· 📱 '+san(cust.smsNum):''}</div>`:''}
  </div>
  <table>
    <tr><th>পণ্য</th><th>পরিমাণ</th><th>একক মূল্য</th><th>ছাড়</th><th>মোট</th></tr>
    <tr>
      <td><b>${san(s.product)}</b></td>
      <td>${san(s.qty)} পিস</td>
      <td>${bn(s.sellPrice)}</td>
      <td>${s.disc>0?s.disc+'%':'-'}</td>
      <td><b>${bn(s.total)}</b></td>
    </tr>
  </table>
</div>
<div class="total-section">
  <div class="total-row"><span>উপমোট</span><span>${bn(s.total)}</span></div>
  ${vatRate>0?`<div class="total-row"><span>VAT (${vatRate}%)</span><span>+${bn(vatAmt)}</span></div>`:''}
  ${gstRate>0?`<div class="total-row"><span>GST (${gstRate}%)</span><span>+${bn(gstAmt)}</span></div>`:''}
  ${s.due>0?`<div class="total-row" style="color:#dc2626"><span>বাকি</span><span>${bn(s.due)}</span></div>`:''}
  <div class="total-row grand-total"><span>সর্বমোট</span><span>${bn(grandTotal)}</span></div>
</div>
<div class="footer">
  এই ইনভয়েসটি NovaTEch BD Management System দ্বারা তৈরি · ${now}<br>
  ধন্যবাদ আমাদের সাথে ব্যবসার জন্য 🙏
</div>
</body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  auditLog('invoice_generate',`ইনভয়েস ${invNo} — ${san(s.shop)} — ${bn(s.total)}`);
  addNotification('📄','ইনভয়েস তৈরি',`${san(s.shop)}-এর জন্য ${invNo}`,'info');
};

// Sale card-এ invoice button যোগ করা হয়েছে
function saleCard(s,sId){
  const statusTag=s.otpConfirmed?`<span class="confirmed-tag">✓ OTP</span>`:s.otpSkipped?`<span class="pending-tag">OTP ছাড়া</span>`:'';
  return`<div class="ec">
    <div class="ei">
      <div class="shop">${san(s.shop)}</div>
      <div class="prod">🛍 ${san(s.product)} × ${san(s.qty)} পিস ${s.disc>0?`· ছাড়: ${san(s.disc)}%`:''}</div>
      <div class="dt">📅 ${fmtDate(s.date)} · <span class="wtag">${san(s.workerName||'')}</span></div>
      ${statusTag}
    </div>
    <div class="ea">
      <div class="sale">${bn(s.total)}</div>
      ${CR==='admin'?`<div style="font-size:11px;color:var(--green);margin-top:2px">+${bn(s.profit)}</div>`:''}
      ${s.due>0?`<div class="due-tag">বাকি ${bn(s.due)}</div>`:''}
      ${sId?`<button onclick="generateInvoice('${sId}')" style="margin-top:5px;font-size:9px;padding:2px 7px;border:1px solid var(--blue);border-radius:4px;background:none;color:var(--blue);cursor:pointer;font-family:inherit">🧾 ইনভয়েস</button>`:''}
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════
//  🏙️ CUSTOMER CREDIT SCORE
// ══════════════════════════════════════════════════
function calcCreditScore(custId){
  const sales=Object.values(allSales).filter(s=>s.shopId===custId);
  if(!sales.length)return{score:0,grade:'N',label:'নতুন',color:'var(--muted)'};
  const total=sales.reduce((a,b)=>a+(b.total||0),0);
  const totalDue=sales.reduce((a,b)=>a+(b.due||0),0);
  const paidCount=sales.filter(s=>s.payStatus==='paid').length;
  const dueCount=sales.filter(s=>s.payStatus==='due').length;
  const payRate=sales.length>0?paidCount/sales.length:0;
  const dueRatio=total>0?totalDue/total:0;
  let score=100;
  score-=dueRatio*50;
  score-=dueCount*5;
  score+=payRate*30;
  score=Math.max(0,Math.min(100,score));
  let grade,label,color;
  if(score>=80){grade='A';label='চমৎকার';color='var(--green)';}
  else if(score>=60){grade='B';label='ভালো';color='var(--blue)';}
  else if(score>=40){grade='C';label='মাঝারি';color='var(--accent)';}
  else{grade='D';label='ঝুঁকিপূর্ণ';color='var(--red)';}
  return{score:Math.round(score),grade,label,color};
}

function renderCreditScore(custId,container){
  const{score,grade,label,color}=calcCreditScore(custId);
  return`<div style="display:flex;align-items:center;gap:10px;margin-top:8px">
    <div class="credit-ring" style="background:linear-gradient(135deg,${color}22,${color}44);color:${color};border:2px solid ${color}">${grade}</div>
    <div>
      <div style="font-size:11px;color:var(--muted)">ক্রেডিট স্কোর</div>
      <div style="font-size:18px;font-weight:700;color:${color};font-family:'Sora',sans-serif">${score}/100</div>
      <span class="credit-badge credit-${grade}">${label}</span>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════
//  🗓️ SALES HEATMAP
// ══════════════════════════════════════════════════
function renderSalesHeatmap(){
  const el=$('salesHeatmap');if(!el)return;
  const now=new Date();
  const days=[];
  for(let i=89;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);days.push(d.toISOString().split('T')[0]);}
  const salesByDay={};
  Object.values(allSales).forEach(s=>{
    if(CR==='worker'&&s.uid!==CU.uid)return;
    salesByDay[s.date]=(salesByDay[s.date]||0)+(s.total||0);
  });
  const maxSale=Math.max(...Object.values(salesByDay),1);
  const weeks=[];
  let week=[];
  // Fill leading empty days
  const firstDay=new Date(days[0]).getDay();
  for(let i=0;i<firstDay;i++)week.push(null);
  days.forEach(d=>{
    week.push(d);
    if(week.length===7){weeks.push([...week]);week=[];}
  });
  if(week.length)weeks.push(week);
  const dayLabels=['র','স','ম','ব','বৃ','শু','শ'];
  el.innerHTML=`
    <div style="overflow-x:auto;padding-bottom:4px">
      <div style="display:flex;gap:2px;margin-bottom:4px">
        ${dayLabels.map(l=>`<div style="width:14px;text-align:center;font-size:8px;color:var(--muted)">${l}</div>`).join('')}
      </div>
      <div style="display:flex;gap:2px">
        ${weeks.map(week=>`<div style="display:flex;flex-direction:column;gap:2px">
          ${week.map(d=>{
            if(!d)return'<div style="width:14px;height:14px"></div>';
            const val=salesByDay[d]||0;
            const intensity=val===0?0:Math.min(4,Math.ceil(val/maxSale*4));
            const title=`${d}: ${bn(val)}`;
            return`<div class="hmap-cell hmap-${intensity}" style="width:14px;height:14px;border-radius:2px" title="${title}" onclick="showDaySales('${d}')"></div>`;
          }).join('')}
        </div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:4px;margin-top:6px;font-size:10px;color:var(--muted)">
        কম <div class="hmap-cell hmap-0" style="width:10px;height:10px;border-radius:2px;display:inline-block"></div>
        <div class="hmap-cell hmap-1" style="width:10px;height:10px;border-radius:2px;display:inline-block"></div>
        <div class="hmap-cell hmap-2" style="width:10px;height:10px;border-radius:2px;display:inline-block"></div>
        <div class="hmap-cell hmap-3" style="width:10px;height:10px;border-radius:2px;display:inline-block"></div>
        <div class="hmap-cell hmap-4" style="width:10px;height:10px;border-radius:2px;display:inline-block"></div> বেশি
      </div>
    </div>`;
}

window.showDaySales=day=>{
  const sales=Object.values(allSales).filter(s=>s.date===day&&(CR!=='worker'||s.uid===CU.uid));
  const total=sales.reduce((a,b)=>a+(b.total||0),0);
  showToast(`${fmtDate(day)}: ${sales.length}টি বিক্রয়, ${bn(total)}`);
};

// ══════════════════════════════════════════════════
//  💰 EXPENSE APPROVAL WORKFLOW
// ══════════════════════════════════════════════════
window.addExpense=async()=>{
  const date=$('eDate').value,type=$('eType').value,amount=parseFloat($('eAmt').value);
  if(!date||!amount){showToast('তথ্য দিন!',true);return;}
  const needsApproval=amount>1000&&CR==='worker'; // ১০০০+ টাকা হলে approval লাগবে
  try{
    const expData={date,type,amount,note:$('eNote').value.trim(),uid:CU.uid,workerName:CN,ts:Date.now(),status:needsApproval?'pending':'approved',approvalNote:''};
    await queueOrRun(ref(db,'expenses'),expData,'push');
    $('eAmt').value='';$('eNote').value='';
    if(needsApproval)showToast('খরচ অনুমোদনের জন্য পাঠানো হয়েছে ✓',false,true);
    else showToast('খরচ সংরক্ষিত ✓');
    auditLog('expense',`${type} — ${bn(amount)}${needsApproval?' (অনুমোদন বাকি)':''}`);
  }catch(e){showToast(getErrMsg(e),true);}
};

function renderExpenseApprovals(){
  const el=$('expApprovalList');if(!el||CR==='worker')return;
  const pending=Object.entries(allExpenses).filter(([,e])=>e.status==='pending');
  el.innerHTML=pending.length?pending.map(([id,e])=>`
    <div class="exp-approval-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:13px;font-weight:600">${san(e.type)} — <span style="color:var(--accent)">${bn(e.amount)}</span></div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">👤 ${san(e.workerName||'')} · ${fmtDate(e.date)}</div>
          ${e.note?`<div style="font-size:11px;color:var(--muted);margin-top:2px">${san(e.note)}</div>`:''}
        </div>
        <span class="approval-status ap-pending">অপেক্ষায়</span>
      </div>
      <div class="g2" style="margin-top:10px;gap:8px">
        <button onclick="approveExpense('${id}')" style="padding:7px;border:1px solid var(--green);border-radius:var(--r-sm);background:rgba(16,185,129,.1);color:var(--green);font-family:inherit;font-size:11px;cursor:pointer;">✅ অনুমোদন</button>
        <button onclick="rejectExpense('${id}')" style="padding:7px;border:1px solid var(--red);border-radius:var(--r-sm);background:rgba(239,68,68,.1);color:var(--red);font-family:inherit;font-size:11px;cursor:pointer;">❌ বাতিল</button>
      </div>
    </div>`).join(''):'<div class="empty"><div class="ic">✅</div>কোনো অপেক্ষমাণ খরচ নেই</div>';
}

window.approveExpense=async id=>{
  try{await update(ref(db,'expenses/'+id),{status:'approved',approvedBy:CN,approvedAt:Date.now()});showToast('খরচ অনুমোদিত ✓');addNotification('✅','খরচ অনুমোদিত',`${bn(allExpenses[id]?.amount||0)} টাকার খরচ অনুমোদিত হয়েছে`);}
  catch(e){showToast(getErrMsg(e),true);}
};
window.rejectExpense=async id=>{
  try{await update(ref(db,'expenses/'+id),{status:'rejected',rejectedBy:CN,rejectedAt:Date.now()});showToast('খরচ বাতিল');}
  catch(e){showToast(getErrMsg(e),true);}
};

function renderExpList(){
  let list=Object.entries(allExpenses);
  if(CR==='worker')list=list.filter(([,e])=>e.uid===CU.uid);
  list.sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));
  const statusIcon={approved:'',pending:'⏳ ',rejected:'❌ '};
  const statusColor={approved:'',pending:'var(--accent)',rejected:'var(--red)'};
  $('expList').innerHTML=list.length?list.map(([,e])=>`
    <div class="ec">
      <div class="ei">
        <div class="shop">${san(e.type)}</div>
        <div class="prod">${san(e.note||'')} · <span class="wtag">${san(e.workerName||'')}</span></div>
        <div class="dt">📅 ${fmtDate(e.date)}</div>
        ${e.status&&e.status!=='approved'?`<span style="font-size:10px;color:${statusColor[e.status]}">${statusIcon[e.status]}${e.status==='pending'?'অনুমোদন বাকি':'বাতিল'}</span>`:''}
      </div>
      <div class="ea"><div class="sale" style="color:var(--red)">${bn(e.amount)}</div></div>
    </div>`).join(''):'<div class="empty"><div class="ic">💸</div>কোনো খরচ নেই</div>';
}

// ══════════════════════════════════════════════════
//  📝 SALARY SLIP
// ══════════════════════════════════════════════════
window.generateSalarySlip=uid=>{
  const u=allUsers[uid]||{name:CN,email:CU.email,role:CR};
  const now=new Date();
  const monthName=now.toLocaleDateString('bn-BD',{month:'long',year:'numeric'});
  const sal=allSalaries[uid];
  if(!sal){showToast('বেতন সেট করা হয়নি!',true);return;}
  const basic=sal.basic||0,shiftH=parseFloat(sal.shiftHours)||8;
  const att=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const days=att.filter(a=>a.checkIn).length;
  const otHours=att.reduce((s,a)=>s+(a.isOT&&a.otApproved?parseFloat(a.otHours||0):0),0);
  const dailySalesMap={};
  Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&s.payStatus==='paid'&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).forEach(s=>{dailySalesMap[s.date]=(dailySalesMap[s.date]||0)+s.total;});
  const perDay=basic/26,earnedBasic=perDay*days;
  const totalComm=Object.values(dailySalesMap).reduce((sum,v)=>sum+calcCommission(v,allCommConfig),0);
  const perHour=basic/(26*shiftH),otPay=otHours*perHour*1.5;
  const totalAllow=Object.values(allAllowances).filter(a=>{const from=new Date(a.from),to=new Date(a.to);let d=0;for(let dt=new Date(from);dt<=to;dt.setDate(dt.getDate()+1)){const m=new Date(dt);if(m.getMonth()===now.getMonth()&&m.getDay()!==5)d++;}return a.uid===uid&&d>0;}).reduce((s,a)=>{let d=0;const from=new Date(a.from),to=new Date(a.to);for(let dt=new Date(from);dt<=to;dt.setDate(dt.getDate()+1)){const m=new Date(dt);if(m.getMonth()===now.getMonth()&&m.getDay()!==5)d++;}return s+a.amount*d;},0);
  const gross=earnedBasic+totalComm+otPay+totalAllow;
  const totalSale=Object.values(dailySalesMap).reduce((a,b)=>a+b,0);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:20px;max-width:500px;margin:0 auto;color:#1a202c;font-size:12px;}.header{background:linear-gradient(135deg,#1E3A8A,#1e40af);color:#fff;padding:16px;border-radius:8px 8px 0 0;}.header h1{font-size:16px;font-weight:800;}.sub{font-size:10px;opacity:.8;margin-top:2px;}.emp-box{background:#f8fafc;padding:12px;border:1px solid #e2e8f0;}.row{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #e2e8f0;}.row:nth-child(even){background:#f8fafc;}.total{background:#f0fdf4;padding:12px;display:flex;justify-content:space-between;font-weight:800;font-size:15px;border-radius:0 0 8px 8px;}.footer{text-align:center;margin-top:12px;font-size:10px;color:#94a3b8;}@media print{body{padding:0;}}</style></head><body>
<div class="header"><h1>🏢 NovaTEch BD — বেতন স্লিপ</h1><div class="sub">${monthName}</div></div>
<div class="emp-box">
  <div style="font-size:14px;font-weight:700">👤 ${san(u.name)}</div>
  <div style="font-size:11px;color:#64748b;margin-top:2px">${u.role==='worker'?'কর্মী':'ম্যানেজার'} · ${san(u.email||'')}</div>
</div>
<div class="row"><span>মূল বেতন (${days} দিন / ২৬)</span><span>৳${Math.round(earnedBasic).toLocaleString()}</span></div>
<div class="row"><span>কমিশন (বিক্রয়: ৳${Math.round(totalSale).toLocaleString()})</span><span style="color:#d97706">৳${Math.round(totalComm).toLocaleString()}</span></div>
<div class="row"><span>ওভারটাইম (${otHours.toFixed(1)} ঘণ্টা)</span><span>৳${Math.round(otPay).toLocaleString()}</span></div>
<div class="row"><span>ভাতা</span><span>৳${Math.round(totalAllow).toLocaleString()}</span></div>
<div class="total"><span>নিট বেতন</span><span style="color:#059669">৳${Math.round(gross).toLocaleString()}</span></div>
<div class="footer">NovaTEch BD · ${new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'})}</div>
</body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  auditLog('salary_slip',`${san(u.name)}-এর ${monthName} বেতন স্লিপ`);
};

// ══════════════════════════════════════════════════
//  🚨 LOW STOCK ALERT
// ══════════════════════════════════════════════════
const LOW_STOCK_THRESHOLD=10;

function checkLowStockAlert(){
  const el=$('lowStockBanner');if(!el)return;
  if(!Object.keys(allProducts).length){el.style.display='none';return;}
  const stockMap={};
  Object.values(allStock).forEach(s=>{stockMap[s.productId]=(stockMap[s.productId]||{in:0,assigned:0,sold:0});stockMap[s.productId].in+=s.qty||0;});
  Object.values(allStockAssign).forEach(s=>{if(stockMap[s.productId])stockMap[s.productId].assigned+=s.qty||0;});
  Object.values(allSales).forEach(s=>{if(s.productId&&stockMap[s.productId])stockMap[s.productId].sold+=s.qty||0;});
  const lowItems=Object.entries(allProducts).filter(([id])=>{const st=stockMap[id]||{in:0,assigned:0,sold:0};const avail=st.in-st.assigned;return avail<=LOW_STOCK_THRESHOLD&&st.in>0;});
  if(lowItems.length>0){
    el.style.display='block';
    el.innerHTML=`<div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:20px">⚠️</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--red)">স্টক সতর্কতা!</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${lowItems.map(([,p])=>san(p.name)).join(', ')} — স্টক কম (≤${LOW_STOCK_THRESHOLD})</div>
      </div>
    </div>`;
    // Notification
    if(CR!=='worker')addNotification('⚠️','স্টক সতর্কতা',`${lowItems.length}টি পণ্যের স্টক কম!`,'warning');
  }else{
    el.style.display='none';
  }
}

// ══════════════════════════════════════════════════
//  📷 BARCODE SCANNER
// ══════════════════════════════════════════════════
let scannerStream=null;

window.openBarcodeScanner=async()=>{
  const mo=$('barcodeMo');if(!mo)return;
  openMo('barcodeMo');
  try{
    scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}});
    const video=$('scannerVideo');if(video){video.srcObject=scannerStream;video.play();}
    startBarcodeDetection();
  }catch(e){
    closeMo('barcodeMo');
    showToast('ক্যামেরা access পাওয়া যায়নি!',true);
  }
};

window.closeBarcodeScanner=()=>{
  if(scannerStream)scannerStream.getTracks().forEach(t=>t.stop());
  scannerStream=null;
  closeMo('barcodeMo');
};

function startBarcodeDetection(){
  if(!('BarcodeDetector' in window)){
    $('scannerStatus').textContent='এই ব্রাউজারে Barcode Scanner সাপোর্ট নেই। ম্যানুয়ালি নাম খুঁজুন।';
    return;
  }
  const detector=new BarcodeDetector({formats:['qr_code','ean_13','ean_8','code_128','code_39']});
  const video=$('scannerVideo');
  const scan=async()=>{
    if(!scannerStream)return;
    try{
      const barcodes=await detector.detect(video);
      if(barcodes.length>0){
        const code=barcodes[0].rawValue;
        closeBarcodeScanner();
        // Find product by barcode
        const prod=Object.entries(allProducts).find(([,p])=>p.barcode===code);
        if(prod){
          const sel=$('sProd');if(sel){sel.value=prod[0];sel.dispatchEvent(new Event('change'));}
          showToast(`✅ পণ্য পাওয়া গেছে: ${san(prod[1].name)}`);
        }else{
          showToast(`Barcode: ${code} — পণ্য পাওয়া যায়নি`,false,true);
        }
        return;
      }
    }catch(e){}
    requestAnimationFrame(scan);
  };
  requestAnimationFrame(scan);
}


// ══════════════════════════════════════════════════
//  CORE APP FUNCTIONS (Navigation, Pages, Data)
// ══════════════════════════════════════════════════
function buildNav(){
  const tabs=[
    {id:'dash',label:'🏠 ড্যাশ',r:['admin','manager','worker']},
    {id:'cust',label:'🏪 কাস্টমার',r:['admin','manager','worker']},
    {id:'route',label:'🗺️ রুট',r:['admin','manager','worker']},
    {id:'sale',label:'🛍 বিক্রয়',r:['admin','manager','worker']},
    {id:'exp',label:'💸 খরচ',r:['admin','manager','worker']},
    {id:'due',label:'🏦 বাকি',r:['admin','manager','worker']},
    {id:'stock',label:'📦 স্টক',r:['admin','manager','worker']},
    {id:'att',label:'⏰ উপস্থিতি',r:['admin','manager','worker']},
    {id:'salary',label:'💰 বেতন',r:['admin','manager']},
    {id:'teams',label:'👥 টিম',r:['admin','manager']},
    {id:'profile',label:'👤 প্রোফাইল',r:['admin','manager','worker']},
    {id:'report',label:'📊 রিপোর্ট',r:['admin']},
    {id:'allow',label:'🚗 ভাতা',r:['admin','manager']},
    {id:'admin',label:'⚙️ অ্যাডমিন',r:['admin']},
  ];
  $('mainNav').innerHTML=tabs.filter(t=>t.r.includes(CR))
    .map(t=>`<button class="nav-btn" data-page="${t.id}" onclick="showPage('${t.id}')">${t.label}</button>`).join('');
}

window.showPage=id=>{
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('active'));
  $('page-'+id)?.classList.add('active');
  document.querySelector(`[data-page="${id}"]`)?.classList.add('active');
  // sync bottom nav
  const bnavBtn=document.querySelector(`.bnav-btn[data-page="${id}"]`);
  if(bnavBtn)bnavBtn.classList.add('active');
  if(id==='report')renderReport();
  if(id==='salary')renderSalary();
  if(id==='profile')renderProfile();
  if(id==='att')renderAttendance();
  if(id==='teams')renderTeams();
};

window.setFilter=(f,btn)=>{
  filterMode=f;
  localStorage.setItem('nt-filter',f);
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

  // Draw charts with small delay for DOM readiness
  requestAnimationFrame(()=>{
    if(typeof window.drawSparklines==='function')window.drawSparklines();
    drawSalesTrendChart();
    drawTopProductsChart();
    drawTopShopsChart();
    renderCommLeaderboard();
    drawWorkerCharts();
    renderSalesHeatmap();
    // Enterprise Analytics — Admin/Manager only
    if(CR!=='worker'&&typeof window.renderEnterpriseDashboard==='function'){
      window.renderEnterpriseDashboard();
    }
  });
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
  // Auto-delete expired notices (admin only)
  if(CR==='admin'){
    Object.entries(allNotices).forEach(([id,n])=>{
      if(n.expiresAt&&now>n.expiresAt){
        remove(ref(db,'notices/'+id));
      }
    });
  }
  const relevant=Object.entries(allNotices).filter(([,n])=>{
    // Skip expired
    if(n.expiresAt&&now>n.expiresAt)return false;
    if(n.target==='all')return true;
    if(n.target==='worker'&&CR==='worker')return true;
    if(n.target==='manager'&&CR==='manager')return true;
    if(CR==='admin')return true;
    return false;
  }).sort((a,b)=>b[1].ts-a[1].ts).slice(0,5);
  if(!relevant.length){el.innerHTML='';return;}
  el.innerHTML=relevant.map(([id,n])=>{
    // Remaining time display
    let timeTag='';
    if(n.expiresAt){
      const remain=n.expiresAt-now;
      if(remain>0){
        const mins=Math.floor(remain/60000);
        const hrs=Math.floor(mins/60);
        const days=Math.floor(hrs/24);
        let timeStr=days>0?`${days} দিন বাকি`:hrs>0?`${hrs} ঘণ্টা বাকি`:`${mins} মিনিট বাকি`;
        const pct=Math.min(100,((n.expiresAt-n.ts)>0?(remain/(n.expiresAt-n.ts)*100):0));
        const color=pct>50?'var(--green)':pct>20?'var(--accent)':'var(--red)';
        timeTag=`
          <div style="margin-top:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:10px;color:${color};font-weight:600">⏳ ${timeStr}</span>
              ${CR==='admin'?`<button onclick="deleteNotice('${id}')" style="font-size:10px;padding:2px 7px;border:1px solid rgba(239,68,68,.3);border-radius:4px;background:none;color:var(--red);cursor:pointer;font-family:inherit">মুছুন</button>`:''}
            </div>
            <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${pct.toFixed(0)}%;background:${color};border-radius:2px;transition:width .5s"></div>
            </div>
          </div>`;
      }
    } else {
      timeTag=CR==='admin'?`<div style="margin-top:6px;text-align:right"><button onclick="deleteNotice('${id}')" style="font-size:10px;padding:2px 7px;border:1px solid rgba(239,68,68,.3);border-radius:4px;background:none;color:var(--red);cursor:pointer;font-family:inherit">মুছুন</button></div>`:'';
    }
    return`<div class="notice-card">
      <div class="nt">📢 ${n.title}</div>
      <div class="nb">${n.body}</div>
      <div class="nd">📅 ${fmtDate(new Date(n.ts).toISOString().split('T')[0])} · ${n.sentBy||''}</div>
      ${timeTag}
    </div>`;
  }).join('');
}
window.deleteNotice=async id=>{
  confirmAction('🗑 নোটিশ মুছুন','এই নোটিশ মুছে ফেলতে চান?','মুছুন','var(--red)',async()=>{
    try{await remove(ref(db,'notices/'+id));showToast('নোটিশ মুছে গেছে ✓');}
    catch(e){showToast(getErrMsg(e),true);}
  });
};

window.sendNotice=async()=>{
  const title=$('noticeTitle').value.trim(),body=$('noticeBody').value.trim(),target=$('noticeTarget').value;
  if(!title||!body){showToast('শিরোনাম ও বার্তা দিন!',true);return;}
  const expVal=parseFloat($('noticeExpVal').value)||0;
  const expUnit=$('noticeExpUnit').value;
  let expiresAt=null;
  if(expVal>0){
    const ms={min:60000,hour:3600000,day:86400000};
    expiresAt=Date.now()+(expVal*ms[expUnit]);
  }
  await push(ref(db,'notices'),{
    title,body,target,sentBy:CN,ts:Date.now(),
    expiresAt,
    expDisplay:expVal>0?`${expVal} ${expUnit==='min'?'মিনিট':expUnit==='hour'?'ঘণ্টা':'দিন'}`:'চিরস্থায়ী'
  });
  $('noticeTitle').value='';$('noticeBody').value='';$('noticeExpVal').value='';
  $('noticeExpPreview').textContent='⏳ মেয়াদ সেট না করলে নোটিশ চিরস্থায়ী থাকবে';
  showToast('নোটিশ পাঠানো হয়েছে ✓');
  auditLog('notice_send',`"${title}" নোটিশ পাঠানো হয়েছে (${expVal>0?`${expVal} ${expUnit==='min'?'মিনিট':expUnit==='hour'?'ঘণ্টা':'দিন'}`:'চিরস্থায়ী'})`);
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

const BIZ=['ইলেকট্রনিক ও টেলিকম','ইলেকট্রনিক','টেলিকম','মুদি+টেলিকম','অন্যান্য'];
function renderCustomers(){
  const q=($('custSearch')?.value||'').toLowerCase();
  let list=Object.entries(allCustomers);
  if(routeFilter!=='all')list=list.filter(([,c])=>c.routeId===routeFilter);
  if(q)list=list.filter(([,c])=>(c.name||'').toLowerCase().includes(q)||(c.owner||'').toLowerCase().includes(q));
  const el=$('custList');
  el.innerHTML=list.length?list.map(([id,c])=>{
    const biz=parseInt(c.bizType||0),route=allRoutes[c.routeId];
    const lastOrders=Object.values(allSales).filter(s=>s.shopId===id).sort((a,b)=>b.ts-a.ts);
    const lastOrder=lastOrders[0];
    return`<div class="cust-card">
      <div style="font-size:14px;font-weight:700">🏪 ${san(c.name)}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">👤 ${san(c.owner||'')} ${route?'· 🗺️ '+san(route.name):''}</div>
      <span class="biz-tag biz-${biz}">${BIZ[biz]}</span>
      ${lastOrder?`<div style="font-size:11px;color:var(--muted);margin-top:4px">সর্বশেষ অর্ডার: ${fmtDate(lastOrder.date)} · ${bn(lastOrder.total)}</div>`:''}
      <div class="cust-actions">
        ${c.waNum?`<button class="cact wa" onclick="openWA('${san(c.waNum)}')">📲 WA</button>`:''}
        ${c.lat&&c.lng?`<button class="cact mp" onclick="openMap(${parseFloat(c.lat)},${parseFloat(c.lng)})">📍 ম্যাপ</button>`:''}
        <button class="cact bl" onclick="viewCust('${id}')">👁 বিস্তারিত</button>
      </div>
    </div>`;
  }).join(''):'<div class="empty"><div class="ic">🏪</div>কোনো কাস্টমার নেই</div>';
}

function renderRouteChips(){
  const el=$('routeChips');if(!el)return;
  el.innerHTML=`<button class="fb ${routeFilter==='all'?'active':''}" onclick="filterByRoute('all',this)">সব</button>`+
    Object.entries(allRoutes).map(([id,r])=>`<button class="fb ${routeFilter===id?'active':''}" onclick="filterByRoute('${id}',this)">🗺️ ${r.name}</button>`).join('');
}
window.filterByRoute=(id,btn)=>{routeFilter=id;document.querySelectorAll('#routeChips .fb').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderCustomers();};

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
  if(!navigator.geolocation){showToast('GPS নেই',true);return;}
  navigator.geolocation.getCurrentPosition(p=>{$('cLat').value=p.coords.latitude.toFixed(7);$('cLng').value=p.coords.longitude.toFixed(7);showToast('GPS পাওয়া গেছে ✓');},()=>showToast('GPS পাওয়া যায়নি',true),{enableHighAccuracy:true});
};
window.addCustomer=async()=>{
  const name=$('cName').value.trim(),owner=$('cOwner').value.trim(),bizType=$('cBiz').value,routeId=$('cRoute').value;
  if(!name||!owner||!routeId){showToast('নাম, মালিক ও রুট দিন!',true);return;}
  try{
    await push(ref(db,'customers'),{name,owner,bizType,routeId,waNum:$('cWa').value.trim(),smsNum:$('cSms').value.trim(),lat:parseFloat($('cLat').value)||null,lng:parseFloat($('cLng').value)||null,note:$('cNote').value.trim(),addedBy:CU.uid,addedByName:CN,ts:Date.now()});
    ['cName','cOwner','cWa','cSms','cLat','cLng','cNote'].forEach(id=>{const el=$(id);if(el)el.value='';});
    closeMo('custMo');showToast(name+' যোগ হয়েছে ✓');
  }catch(e){showToast(getErrMsg(e),true);}
};
window.addRoute=async()=>{
  const name=$('rName').value.trim();if(!name){showToast('নাম দিন!',true);return;}
  await push(ref(db,'routes'),{name,desc:$('rDesc').value.trim(),addedBy:CU.uid,addedByName:CN,ts:Date.now()});
  $('rName').value='';$('rDesc').value='';closeMo('routeMo');showToast(name+' রুট যোগ ✓');
};
window.openWA=num=>window.open('https://wa.me/88'+num.replace(/\D/g,''),'_blank');
window.openMap=(lat,lng)=>window.open(`https://www.google.com/maps?q=${lat},${lng}`,'_blank');

window.viewCust=id=>{
  const c=allCustomers[id];if(!c)return;
  const route=allRoutes[c.routeId];
  const cs=Object.values(allSales).filter(s=>s.shopId===id).sort((a,b)=>b.ts-a.ts);
  $('cdTitle').textContent='🏪 '+c.name;
  $('cdBody').innerHTML=`
    <div style="background:var(--card);border-radius:10px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;margin-bottom:5px">👤 ${c.owner||'-'}</div>
      <div style="font-size:13px;margin-bottom:5px">🗺️ ${route?route.name:'-'}</div>
      <div style="font-size:13px;margin-bottom:5px">📱 WA: ${c.waNum||'-'} · SMS: ${c.smsNum||'-'}</div>
      ${c.lat&&c.lng?`<div style="font-size:12px;color:var(--muted)">📍 ${c.lat}, ${c.lng}</div>`:''}
    </div>
    <div class="g2">
      <div class="sum-card c-sale"><div class="lbl">মোট বিক্রয়</div><div class="val" style="font-size:16px">${bn(cs.reduce((a,b)=>a+(b.total||0),0))}</div></div>
      <div class="sum-card c-due"><div class="lbl">বাকি</div><div class="val" style="font-size:16px">${bn(cs.reduce((a,b)=>a+(b.due||0),0))}</div></div>
    </div>
    <div class="sec">সর্বশেষ অর্ডার</div>
    ${cs.slice(0,5).map(s=>`<div class="ec"><div class="ei"><div class="shop">${s.product} × ${s.qty}</div><div class="dt">📅 ${fmtDate(s.date)}</div></div><div class="ea"><div class="sale">${bn(s.total)}</div></div></div>`).join('')||'<div class="empty">কোনো অর্ডার নেই</div>'}
    ${c.lat&&c.lng?`<button class="btn" style="margin-top:10px;background:rgba(245,166,35,.15);border:1px solid var(--accent);color:var(--accent);font-family:inherit;" onclick="openMap(${c.lat},${c.lng})">📍 Google Maps</button>`:''}
  `;
  openMo('custDetailMo');
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
  localStorage.setItem('nt-route',rid);
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
  const saleData={date,shop,shopId,product:prod.name,productId:prodId,qty,sellPrice:sell,disc,total,profit,payStatus:pay,due,uid:CU.uid,workerName:CN,routeId:activeRouteId||null,ts:Date.now(),otpConfirmed:false};

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
    try{sendSMSAlphaNet(smsNum,smsWithOTP);}catch(e){showToast('SMS পাঠানো যায়নি, তবু OTP যাচাই করুন।',true);}
    $('otpSection').style.display='block';
    $('otpInput').value='';
    showToast('📱 OTP SMS পাঠানো হয়েছে!');
    window.scrollTo(0,($('otpSection').offsetTop||0)-80);
  } else if(smsNum&&hasAPI&&!otpEnabled){
    // Bill SMS without OTP
    const smsNoOTP=billMsg.replace('{otp_line}','ধন্যবাদ আমাদের সাথে ব্যবসার জন্য।');
    try{sendSMSAlphaNet(smsNum,smsNoOTP);}catch(e){showToast('SMS পাঠানো যায়নি, তবু বিক্রয় সংরক্ষিত হবে।',true);}
    try{
      await push(ref(db,'sales'),{...saleData,otpConfirmed:true,otpSkipped:false,smsSent:true});
      clearSaleForm();showToast('✅ বিক্রয় সংরক্ষিত + SMS পাঠানো হয়েছে');renderVisitList();
    }catch(e){showToast(getErrMsg(e),true);}
  } else {
    // No SMS
    try{
      await push(ref(db,'sales'),saleData);
      clearSaleForm();showToast('✅ বিক্রয় সংরক্ষিত');renderVisitList();
    }catch(e){showToast(getErrMsg(e),true);}
  }
};

window.confirmOTP=async()=>{
  const entered=$('otpInput').value.trim();
  if(!entered){showToast('OTP লিখুন!',true);return;}
  if(entered===pendingOTP){
    try{
      const saleData={...pendingSaleData,otpConfirmed:true};
      await push(ref(db,'sales'),saleData);
      pendingSaleData=null;pendingOTP=null;
      $('otpSection').style.display='none';
      clearSaleForm();showToast('বিক্রয় OTP নিশ্চিত ✓');renderVisitList();
      auditLog('otp_confirm',`${saleData.shop} — ${saleData.product} × ${saleData.qty} = ${bn(saleData.total)}`);
    }catch(e){showToast(getErrMsg(e),true);}
  }else{
    showToast('OTP ভুল! আবার চেষ্টা করুন',true);
  }
};
window.skipOTP=async()=>{
  if(!pendingSaleData)return;
  try{
    await push(ref(db,'sales'),{...pendingSaleData,otpConfirmed:false,otpSkipped:true});
    pendingSaleData=null;pendingOTP=null;
    $('otpSection').style.display='none';
    clearSaleForm();showToast('বিক্রয় সংরক্ষিত (OTP ছাড়া)');renderVisitList();
  }catch(e){showToast(getErrMsg(e),true);}
};
function clearSaleForm(){
  $('sQty').value='';$('sSell').value='';$('sDisc').value='';$('sPart').value='';$('saleSummary').innerHTML='';
}
function renderSaleList(){
  const sl=$('saleList');
  if(!sl)return;
  let list=Object.values(allSales);
  if(CR==='worker')list=list.filter(s=>s.uid===CU.uid);
  list.sort((a,b)=>(b.ts||0)-(a.ts||0));
  sl.innerHTML=list.length?list.map(s=>saleCard(s)).join(''):`<div class="empty"><div class="ic">📭</div><p>কোনো বিক্রয় নেই</p></div>`;
}
function saleCard(s){
  const statusTag=s.otpConfirmed?`<span class="confirmed-tag">✓ OTP নিশ্চিত</span>`:s.otpSkipped?`<span class="pending-tag">OTP ছাড়া</span>`:'';
  return`<div class="ec"><div class="ei"><div class="shop">${san(s.shop)}</div><div class="prod">🛍 ${san(s.product)} × ${san(s.qty)} পিস ${s.disc>0?`· ছাড়: ${san(s.disc)}%`:''}</div><div class="dt">📅 ${fmtDate(s.date)} · <span class="wtag">${san(s.workerName||'')}</span></div>${statusTag}</div><div class="ea"><div class="sale">${bn(s.total)}</div>${CR==='admin'?`<div style="font-size:11px;color:var(--green);margin-top:2px">+${bn(s.profit)}</div>`:''}${s.due>0?`<div class="due-tag">বাকি ${bn(s.due)}</div>`:''}</div></div>`;
}

// DUE
function renderDue(){
  const dm={};
  Object.values(allSales).forEach(s=>{if(s.due>0){if(CR==='worker'&&s.uid!==CU.uid)return;dm[s.shop]=(dm[s.shop]||0)+s.due;}});
  $('dueList').innerHTML=Object.keys(dm).length?Object.keys(dm).map(shop=>`<div class="due-card"><div style="font-size:14px;font-weight:600">🏪 ${shop}</div><div style="font-size:20px;font-weight:700;color:var(--purple);margin:4px 0">${bn(dm[shop])}</div><button class="pay-btn" onclick="openPayMo('${shop}',${dm[shop]})">💰 পেমেন্ট গ্রহণ</button></div>`).join(''):'<div class="empty" style="margin-top:40px"><div class="ic">🎉</div>কোনো বাকি নেই!</div>';
}
window.openPayMo=(shop,due)=>{payShop=shop;$('pmShop').value=shop;$('pmDue').value=due;$('pmPay').value='';openMo('payMo');};
window.collectPay=async()=>{
  const pay=parseFloat($('pmPay').value);if(!pay||pay<=0){showToast('পরিমাণ লিখুন!',true);return;}
  let rem=pay;const updates={};
  Object.entries(allSales).forEach(([id,s])=>{if(s.shop===payShop&&s.due>0&&rem>0){const r=Math.min(s.due,rem);updates['sales/'+id+'/due']=s.due-r;rem-=r;}});
  await update(ref(db),updates);closeMo('payMo');showToast('পেমেন্ট গ্রহণ ✓');
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

// ══════════════════════════════════════════════════
//  ⏱  HOLD BUTTON — ৪ সেকেন্ড চেপে ধরুন
// ══════════════════════════════════════════════════
let holdTimer=null,holdInterval=null,holdStartTime=null;
const HOLD_DURATION=4000;

window.startHold=(action)=>{
  cancelHold();
  holdStartTime=Date.now();
  const progressId=action==='checkIn'?'holdProgressIn':'holdProgressOut';
  const progressEl=$(progressId);
  if(progressEl){progressEl.style.transition='none';progressEl.style.width='0%';}

  holdInterval=setInterval(()=>{
    const elapsed=Date.now()-holdStartTime;
    const pct=Math.min(100,(elapsed/HOLD_DURATION)*100);
    if(progressEl)progressEl.style.width=pct+'%';
    if(elapsed>=HOLD_DURATION){
      cancelHold();
      if(action==='checkIn')window.checkIn();
      else window.checkOut();
    }
  },50);
};

window.cancelHold=()=>{
  if(holdInterval){clearInterval(holdInterval);holdInterval=null;}
  if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
  holdStartTime=null;
  const p1=$('holdProgressIn'),p2=$('holdProgressOut');
  if(p1){p1.style.transition='width .3s';p1.style.width='0%';}
  if(p2){p2.style.transition='width .3s';p2.style.width='0%';}
};

// ATTENDANCE
window.checkIn=async()=>{
  const existing=Object.entries(allAttendance).find(([,a])=>a.uid===CU.uid&&a.date===today());
  if(existing){showToast('আজ ইতিমধ্যে চেক-ইন হয়েছে!',true);return;}
  const now=Date.now();
  const cutoff=new Date();cutoff.setHours(10,0,0,0);
  const isLate=now>cutoff.getTime();
  try{
    await push(ref(db,'attendance'),{uid:CU.uid,name:CN,date:today(),checkIn:now,checkOut:null,isLate,ts:now});
    showToast(isLate?'চেক-ইন ✓ (দেরিতে)':'চেক-ইন ✓');
  }catch(e){showToast(getErrMsg(e),true);}
};
window.checkOut=async()=>{
  const existing=Object.entries(allAttendance).find(([,a])=>a.uid===CU.uid&&a.date===today());
  if(!existing){showToast('আগে চেক-ইন করুন!',true);return;}
  const [id,att]=existing;
  if(att.checkOut){showToast('ইতিমধ্যে চেক-আউট!',true);return;}
  const checkOut=Date.now();
  const hours=(checkOut-att.checkIn)/3600000;
  const sal=allSalaries[CU.uid];
  const shiftEnd=sal?.shiftEnd||'17:50';
  const [eh,em]=shiftEnd.split(':').map(Number);
  const todayShiftEnd=new Date();todayShiftEnd.setHours(eh,em,0,0);
  const isOT=checkOut>todayShiftEnd.getTime();
  const otHours=isOT?((checkOut-todayShiftEnd.getTime())/3600000).toFixed(2):0;
  try{
    await update(ref(db,'attendance/'+id),{checkOut,totalHours:hours.toFixed(2),isOT,otHours,otApproved:false});
    showToast(`চেক-আউট ✓ (${hours.toFixed(1)} ঘণ্টা)${isOT?` · OT: ${otHours} ঘণ্টা`:''}`);
  }catch(e){showToast(getErrMsg(e),true);}
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
  // দিনে ১ বার চেক
  const todayStr=today();
  const alreadyApplied=Object.values(allLeaves).find(l=>l.uid===CU.uid&&new Date(l.ts).toISOString().split('T')[0]===todayStr&&l.status==='pending');
  if(alreadyApplied){showToast('আজ ইতিমধ্যে একটি আবেদন করা আছে!',true);return;}
  await push(ref(db,'leaves'),{uid:CU.uid,name:CN,type,from,to,reason,status:'pending',ts:Date.now()});
  $('leaveReason').value='';showToast('আবেদন পাঠানো ✓');
};
function renderLeaves(){
  const ll=$('leaveList');
  if(ll){
    const my=Object.entries(allLeaves).filter(([,l])=>l.uid===CU.uid).sort((a,b)=>b[1].ts-a[1].ts);
    ll.innerHTML=my.length?my.map(([id,l])=>`
      <div class="leave-card" style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border-l);margin-bottom:8px;box-shadow:var(--shadow-sm)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:600">${l.type}</span>
          <span class="ls-${l.status}">${l.status==='pending'?'অপেক্ষায়':l.status==='approved'?'অনুমোদিত':'বাতিল'}</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} ${l.reason?'· '+l.reason:''}</div>
        ${l.status==='pending'?`
          <button onclick="cancelMyLeave('${id}')" style="margin-top:8px;font-size:11px;padding:4px 10px;border:1.5px solid rgba(239,68,68,.4);border-radius:var(--r-xs);background:none;color:var(--red);cursor:pointer;font-family:inherit">
            ✕ আবেদন বাতিল
          </button>`:''}
      </div>`).join(''):'<div class="empty">কোনো আবেদন নেই</div>';
  }
  const pl=$('pendingLeaves');
  if(pl&&CR!=='worker'){
    const pending=Object.entries(allLeaves).filter(([,l])=>l.status==='pending');
    pl.innerHTML=pending.length?pending.map(([id,l])=>`
      <div style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border-l);margin-bottom:8px;">
        <div style="font-size:13px;font-weight:600">👤 ${l.name} · ${l.type}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} · ${l.reason||''}</div>
        <div class="g2" style="margin-top:8px">
          <button style="padding:7px;border:1px solid var(--green);border-radius:7px;background:rgba(16,185,129,.1);color:var(--green);font-family:inherit;font-size:11px;cursor:pointer;" onclick="approveLeave('${id}')">✅ অনুমোদন</button>
          <button style="padding:7px;border:1px solid var(--red);border-radius:7px;background:rgba(239,68,68,.1);color:var(--red);font-family:inherit;font-size:11px;cursor:pointer;" onclick="rejectLeave('${id}')">❌ বাতিল</button>
        </div>
      </div>`).join(''):'<div class="empty">কোনো অপেক্ষমাণ নেই</div>';
  }
}
window.cancelMyLeave=async id=>{
  confirmAction('✕ আবেদন বাতিল','আপনার ছুটির আবেদন বাতিল করতে চান?','বাতিল করুন','var(--red)',async()=>{
    try{await remove(ref(db,'leaves/'+id));showToast('আবেদন বাতিল হয়েছে ✓');}
    catch(e){showToast(getErrMsg(e),true);}
  });
};
window.approveLeave=async id=>{await update(ref(db,'leaves/'+id),{status:'approved',approvedBy:CN});showToast('ছুটি অনুমোদিত ✓');};
window.rejectLeave=async id=>{await update(ref(db,'leaves/'+id),{status:'rejected'});showToast('ছুটি বাতিল');};

// ══ CUSTOMER PRINT SHEET ══
window.printCustomerSheet=()=>{
  const custs=Object.values(allCustomers);
  if(!custs.length){showToast('কোনো কাস্টমার নেই!',true);return;}
  const bizLabels=['ইলেকট্রনিক ও টেলিকম','ইলেকট্রনিক','টেলিকম','মুদি+টেলিকম','অন্যান্য'];
  const now=new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    *{box-sizing:border-box;}
    body{font-family:Arial,sans-serif;padding:20px;max-width:1000px;margin:0 auto;font-size:12px;color:#1a202c;}
    h1{color:#1E3A8A;font-size:18px;margin-bottom:4px;}
    .sub{color:#64748b;font-size:11px;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#1E3A8A;color:white;padding:8px 8px;text-align:left;font-size:11px;}
    td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;vertical-align:top;}
    tr:nth-child(even){background:#f8fafc;}
    .footer{margin-top:14px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;}
    @media print{
      body{padding:8px;}
      .no-print{display:none;}
    }
  </style></head><body>
  <div class="no-print" style="margin-bottom:12px">
    <button onclick="window.print()" style="padding:8px 16px;background:#1E3A8A;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨️ প্রিন্ট করুন</button>
  </div>
  <h1>🏪 NovaTEch BD — কাস্টমার তালিকা</h1>
  <div class="sub">তারিখ: ${now} &nbsp;|&nbsp; মোট কাস্টমার: ${custs.length} জন</div>
  <table>
    <tr><th>#</th><th>দোকানের নাম</th><th>মালিক</th><th>ব্যবসার ধরন</th><th>রুট</th><th>WhatsApp</th><th>SMS নম্বর</th><th>নোট</th></tr>
    ${custs.map((c,i)=>`<tr>
      <td>${i+1}</td>
      <td><b>${c.name||'-'}</b></td>
      <td>${c.owner||'-'}</td>
      <td>${bizLabels[parseInt(c.bizType)||0]||'-'}</td>
      <td>${allRoutes[c.routeId]?.name||'-'}</td>
      <td>${c.waNum||'-'}</td>
      <td>${c.smsNum||'-'}</td>
      <td>${c.note||'-'}</td>
    </tr>`).join('')}
  </table>
  <div class="footer">
    <span>NovaTEch BD Management System</span>
    <span>${now}</span>
  </div>
  </body></html>`;
  const w=window.open('','_blank');
  w.document.write(html);w.document.close();
};

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
window.delAllow=async id=>{
  confirmAction('🗑 ভাতা মুছুন','এই ভাতা এন্ট্রি মুছে ফেলতে চান?','মুছুন','var(--red)',async()=>{
    try{await remove(ref(db,'allowances/'+id));showToast('ভাতা মুছে গেছে');}
    catch(e){showToast('সমস্যা হয়েছে!',true);}
  });
};

// DUE
function renderDue(){
  const dm={};
  Object.values(allSales).forEach(s=>{if(s.due>0){if(CR==='worker'&&s.uid!==CU.uid)return;dm[s.shop]=(dm[s.shop]||0)+s.due;}});
  $('dueList').innerHTML=Object.keys(dm).length?Object.keys(dm).map(shop=>`<div class="due-card"><div style="font-size:14px;font-weight:600">🏪 ${shop}</div><div style="font-size:20px;font-weight:700;color:var(--purple);margin:4px 0">${bn(dm[shop])}</div><button class="pay-btn" onclick="openPayMo('${shop}',${dm[shop]})">💰 পেমেন্ট গ্রহণ</button></div>`).join(''):'<div class="empty" style="margin-top:40px"><div class="ic">🎉</div>কোনো বাকি নেই!</div>';
}
window.openPayMo=(shop,due)=>{payShop=shop;$('pmShop').value=shop;$('pmDue').value=due;$('pmPay').value='';openMo('payMo');};
window.collectPay=async()=>{
  const pay=parseFloat($('pmPay').value);if(!pay||pay<=0){showToast('পরিমাণ লিখুন!',true);return;}
  let rem=pay;const updates={};
  Object.entries(allSales).forEach(([id,s])=>{if(s.shop===payShop&&s.due>0&&rem>0){const r=Math.min(s.due,rem);updates['sales/'+id+'/due']=s.due-r;rem-=r;}});
  await update(ref(db),updates);closeMo('payMo');showToast('পেমেন্ট গ্রহণ ✓');
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

// ══════════════════════════════════════════════════
//  ⏱  HOLD BUTTON — ৪ সেকেন্ড চেপে ধরুন
// ══════════════════════════════════════════════════
let holdTimer=null,holdInterval=null,holdStartTime=null;
const HOLD_DURATION=4000;

window.startHold=(action)=>{
  cancelHold();
  holdStartTime=Date.now();
  const progressId=action==='checkIn'?'holdProgressIn':'holdProgressOut';
  const progressEl=$(progressId);
  if(progressEl){progressEl.style.transition='none';progressEl.style.width='0%';}

  holdInterval=setInterval(()=>{
    const elapsed=Date.now()-holdStartTime;
    const pct=Math.min(100,(elapsed/HOLD_DURATION)*100);
    if(progressEl)progressEl.style.width=pct+'%';
    if(elapsed>=HOLD_DURATION){
      cancelHold();
      if(action==='checkIn')window.checkIn();
      else window.checkOut();
    }
  },50);
};

window.cancelHold=()=>{
  if(holdInterval){clearInterval(holdInterval);holdInterval=null;}
  if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
  holdStartTime=null;
  const p1=$('holdProgressIn'),p2=$('holdProgressOut');
  if(p1){p1.style.transition='width .3s';p1.style.width='0%';}
  if(p2){p2.style.transition='width .3s';p2.style.width='0%';}
};

// ATTENDANCE
window.checkIn=async()=>{
  const existing=Object.entries(allAttendance).find(([,a])=>a.uid===CU.uid&&a.date===today());
  if(existing){showToast('আজ ইতিমধ্যে চেক-ইন হয়েছে!',true);return;}
  const now=Date.now();
  const cutoff=new Date();cutoff.setHours(10,0,0,0);
  const isLate=now>cutoff.getTime();
  try{
    await push(ref(db,'attendance'),{uid:CU.uid,name:CN,date:today(),checkIn:now,checkOut:null,isLate,ts:now});
    showToast(isLate?'চেক-ইন ✓ (দেরিতে)':'চেক-ইন ✓');
  }catch(e){showToast(getErrMsg(e),true);}
};
window.checkOut=async()=>{
  const existing=Object.entries(allAttendance).find(([,a])=>a.uid===CU.uid&&a.date===today());
  if(!existing){showToast('আগে চেক-ইন করুন!',true);return;}
  const [id,att]=existing;
  if(att.checkOut){showToast('ইতিমধ্যে চেক-আউট!',true);return;}
  const checkOut=Date.now();
  const hours=(checkOut-att.checkIn)/3600000;
  const sal=allSalaries[CU.uid];
  const shiftEnd=sal?.shiftEnd||'17:50';
  const [eh,em]=shiftEnd.split(':').map(Number);
  const todayShiftEnd=new Date();todayShiftEnd.setHours(eh,em,0,0);
  const isOT=checkOut>todayShiftEnd.getTime();
  const otHours=isOT?((checkOut-todayShiftEnd.getTime())/3600000).toFixed(2):0;
  try{
    await update(ref(db,'attendance/'+id),{checkOut,totalHours:hours.toFixed(2),isOT,otHours,otApproved:false});
    showToast(`চেক-আউট ✓ (${hours.toFixed(1)} ঘণ্টা)${isOT?` · OT: ${otHours} ঘণ্টা`:''}`);
  }catch(e){showToast(getErrMsg(e),true);}
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
  // দিনে ১ বার চেক
  const todayStr=today();
  const alreadyApplied=Object.values(allLeaves).find(l=>l.uid===CU.uid&&new Date(l.ts).toISOString().split('T')[0]===todayStr&&l.status==='pending');
  if(alreadyApplied){showToast('আজ ইতিমধ্যে একটি আবেদন করা আছে!',true);return;}
  await push(ref(db,'leaves'),{uid:CU.uid,name:CN,type,from,to,reason,status:'pending',ts:Date.now()});
  $('leaveReason').value='';showToast('আবেদন পাঠানো ✓');
};
function renderLeaves(){
  const ll=$('leaveList');
  if(ll){
    const my=Object.entries(allLeaves).filter(([,l])=>l.uid===CU.uid).sort((a,b)=>b[1].ts-a[1].ts);
    ll.innerHTML=my.length?my.map(([id,l])=>`
      <div class="leave-card" style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border-l);margin-bottom:8px;box-shadow:var(--shadow-sm)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:600">${l.type}</span>
          <span class="ls-${l.status}">${l.status==='pending'?'অপেক্ষায়':l.status==='approved'?'অনুমোদিত':'বাতিল'}</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} ${l.reason?'· '+l.reason:''}</div>
        ${l.status==='pending'?`
          <button onclick="cancelMyLeave('${id}')" style="margin-top:8px;font-size:11px;padding:4px 10px;border:1.5px solid rgba(239,68,68,.4);border-radius:var(--r-xs);background:none;color:var(--red);cursor:pointer;font-family:inherit">
            ✕ আবেদন বাতিল
          </button>`:''}
      </div>`).join(''):'<div class="empty">কোনো আবেদন নেই</div>';
  }
  const pl=$('pendingLeaves');
  if(pl&&CR!=='worker'){
    const pending=Object.entries(allLeaves).filter(([,l])=>l.status==='pending');
    pl.innerHTML=pending.length?pending.map(([id,l])=>`
      <div style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border-l);margin-bottom:8px;">
        <div style="font-size:13px;font-weight:600">👤 ${l.name} · ${l.type}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} · ${l.reason||''}</div>
        <div class="g2" style="margin-top:8px">
          <button style="padding:7px;border:1px solid var(--green);border-radius:7px;background:rgba(16,185,129,.1);color:var(--green);font-family:inherit;font-size:11px;cursor:pointer;" onclick="approveLeave('${id}')">✅ অনুমোদন</button>
          <button style="padding:7px;border:1px solid var(--red);border-radius:7px;background:rgba(239,68,68,.1);color:var(--red);font-family:inherit;font-size:11px;cursor:pointer;" onclick="rejectLeave('${id}')">❌ বাতিল</button>
        </div>
      </div>`).join(''):'<div class="empty">কোনো অপেক্ষমাণ নেই</div>';
  }
}
window.cancelMyLeave=async id=>{
  confirmAction('✕ আবেদন বাতিল','আপনার ছুটির আবেদন বাতিল করতে চান?','বাতিল করুন','var(--red)',async()=>{
    try{await remove(ref(db,'leaves/'+id));showToast('আবেদন বাতিল হয়েছে ✓');}
    catch(e){showToast(getErrMsg(e),true);}
  });
};
window.approveLeave=async id=>{await update(ref(db,'leaves/'+id),{status:'approved',approvedBy:CN});showToast('ছুটি অনুমোদিত ✓');};
window.rejectLeave=async id=>{await update(ref(db,'leaves/'+id),{status:'rejected'});showToast('ছুটি বাতিল');};

// ══ CUSTOMER PRINT SHEET ══
window.printCustomerSheet=()=>{
  const custs=Object.values(allCustomers);
  if(!custs.length){showToast('কোনো কাস্টমার নেই!',true);return;}
  const bizLabels=['ইলেকট্রনিক ও টেলিকম','ইলেকট্রনিক','টেলিকম','মুদি+টেলিকম','অন্যান্য'];
  const now=new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    *{box-sizing:border-box;}
    body{font-family:Arial,sans-serif;padding:20px;max-width:1000px;margin:0 auto;font-size:12px;color:#1a202c;}
    h1{color:#1E3A8A;font-size:18px;margin-bottom:4px;}
    .sub{color:#64748b;font-size:11px;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#1E3A8A;color:white;padding:8px 8px;text-align:left;font-size:11px;}
    td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;vertical-align:top;}
    tr:nth-child(even){background:#f8fafc;}
    .footer{margin-top:14px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between;}
    @media print{
      body{padding:8px;}
      .no-print{display:none;}
    }
  </style></head><body>
  <div class="no-print" style="margin-bottom:12px">
    <button onclick="window.print()" style="padding:8px 16px;background:#1E3A8A;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨️ প্রিন্ট করুন</button>
  </div>
  <h1>🏪 NovaTEch BD — কাস্টমার তালিকা</h1>
  <div class="sub">তারিখ: ${now} &nbsp;|&nbsp; মোট কাস্টমার: ${custs.length} জন</div>
  <table>
    <tr><th>#</th><th>দোকানের নাম</th><th>মালিক</th><th>ব্যবসার ধরন</th><th>রুট</th><th>WhatsApp</th><th>SMS নম্বর</th><th>নোট</th></tr>
    ${custs.map((c,i)=>`<tr>
      <td>${i+1}</td>
      <td><b>${c.name||'-'}</b></td>
      <td>${c.owner||'-'}</td>
      <td>${bizLabels[parseInt(c.bizType)||0]||'-'}</td>
      <td>${allRoutes[c.routeId]?.name||'-'}</td>
      <td>${c.waNum||'-'}</td>
      <td>${c.smsNum||'-'}</td>
      <td>${c.note||'-'}</td>
    </tr>`).join('')}
  </table>
  <div class="footer">
    <span>NovaTEch BD Management System</span>
    <span>${now}</span>
  </div>
  </body></html>`;
  const w=window.open('','_blank');
  w.document.write(html);w.document.close();
};

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
window.saveDriveConfig=async()=>{
  const apiKey=$('driveApiKey').value.trim(),folderId=$('driveFolderId').value.trim();
  if(!apiKey||!folderId){showToast('API Key ও Folder ID দিন!',true);return;}
  await set(ref(db,'driveConfig'),{apiKey,folderId,updatedBy:CN,ts:Date.now()});
  showToast('Google Drive কনফিগ সেভ ✓');
};
function renderCommSlabs(){
  const cfg=allCommConfig||getDefaultSlabs();
  const el=$('commSlabs');if(!el)return;
  const slabs=cfg.slabs||getDefaultSlabs().slabs;
  el.innerHTML=`<table style="width:100%;border-collapse:collapse;"><tr style="font-size:11px;color:var(--muted);"><th style="text-align:left;padding:6px;">বিক্রয় পরিমাণ</th><th style="text-align:right;padding:6px;">কমিশন %</th></tr>${slabs.map(s=>`<tr style="border-top:1px solid var(--border)"><td style="padding:8px 6px;font-size:12px;">${s.max===999999?bn(s.min)+'+':bn(s.min)+' – '+bn(s.max)}</td><td style="padding:8px 6px;font-size:14px;font-weight:700;text-align:right;color:${s.rate===0?'var(--muted)':'var(--accent)'};">${s.rate}%</td></tr>`).join('')}</table><div style="font-size:11px;color:var(--muted);margin-top:6px;padding:6px;">৩০,০০০+ এর পর প্রতি হাজারে ${cfg.extraPer1000||0.1}% বেশি</div>`;
}
window.resetCommSlabs=async()=>{await set(ref(db,'commConfig'),getDefaultSlabs());showToast('ডিফল্ট কমিশন ✓');};

function renderSalary(){
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
window.deleteTeam=async id=>{
  const t=allTeams[id];
  confirmAction('🗑 টিম মুছুন',`<b>${t?.name||'এই টিম'}</b> মুছে ফেলতে চান?`,'মুছুন','var(--red)',async()=>{
    try{await remove(ref(db,'teams/'+id));showToast('টিম মুছে গেছে');}
    catch(e){showToast('সমস্যা হয়েছে!',true);}
  });
};

// PROFILE
function renderProfile(){
  $('pName').textContent=CN;
  $('pRole').textContent=CR==='admin'?'অ্যাডমিন':CR==='manager'?'ম্যানেজার':'কর্মী';
  $('pEditName').value=CN;
  const now=new Date();
  const mySales=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===CU.uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const mySaleTotal=mySales.filter(s=>s.payStatus==='paid').reduce((a,b)=>a+(b.total||0),0);
  $('pSale').textContent=bn(mySaleTotal);
  const dailyMap={};
  mySales.filter(s=>s.payStatus==='paid').forEach(s=>{dailyMap[s.date]=(dailyMap[s.date]||0)+s.total;});
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
  // Password policy check
  if(pass){
    const passErr=validatePassword(pass);
    if(passErr){showToast(passErr,true);return;}
  }
  try{
    await update(ref(db,'users/'+CU.uid),{name,waNum:wa});
    if(pass){
      try{await updatePassword(CU,pass);showToast('পাসওয়ার্ড পরিবর্তন হয়েছে ✓');}
      catch(e){
        if(e.code==='auth/requires-recent-login'){
          showToast('নিরাপত্তার জন্য পুনরায় লগইন করুন, তারপর পাসওয়ার্ড পরিবর্তন করুন।',true);
          return;
        }
        showToast(getErrMsg(e),true);return;
      }
    }
    CN=name;$('userName').textContent=name;
    showToast('প্রোফাইল আপডেট ✓');
  }catch(e){showToast(getErrMsg(e),true);}
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

  requestAnimationFrame(()=>{
    drawReportTrendChart();
    drawRoutePerfChart();
    refreshPL();
    renderAuditLog();
  });
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
window.delProd=async id=>{
  const p=allProducts[id];
  confirmAction('🗑 প্রোডাক্ট মুছুন',`<b>${p?.name||'এই প্রোডাক্ট'}</b> মুছে ফেলতে চান?`,'মুছুন','var(--red)',async()=>{
    try{await remove(ref(db,'products/'+id));showToast('প্রোডাক্ট মুছে গেছে');}
    catch(e){showToast('সমস্যা হয়েছে!',true);}
  });
};

// ADMIN CONFIRM MODAL
let pendingAdminAction=null;
function requireAdminConfirm(action){
  pendingAdminAction=action;
  $('adminConfirmPass').value='';
  $('adminPassErr').style.display='none';
  openMo('adminPassMo');
}
window.submitAdminConfirm=async()=>{
  const pass=$('adminConfirmPass').value;
  if(!pass){$('adminPassErr').textContent='পাসওয়ার্ড দিন!';$('adminPassErr').style.display='block';return;}
  loader(true);
  try{
    const ce=CU.email;
    // Re-authenticate by sign out and sign in
    await signOut(auth);
    await signInWithEmailAndPassword(auth,ce,pass);
    closeMo('adminPassMo');
    if(pendingAdminAction){await pendingAdminAction(ce,pass);pendingAdminAction=null;}
  }catch(e){
    loader(false);
    $('adminPassErr').textContent='পাসওয়ার্ড ভুল!';
    $('adminPassErr').style.display='block';
    // Re-login current user silently
    try{await signInWithEmailAndPassword(auth,CU.email,pass);}catch(_){}
  }
};

// CONFIRM ACTION MODAL
function confirmAction(title,body,btnLabel,btnColor,onConfirm){
  $('confirmTitle').textContent=title;
  $('confirmBody').innerHTML=body;
  const btn=$('confirmOkBtn');
  btn.textContent=btnLabel;
  btn.style.background=btnColor||'var(--red)';
  btn.style.border='none';
  btn.style.color='#fff';
  btn.onclick=async()=>{closeMo('confirmActionMo');await onConfirm();};
  openMo('confirmActionMo');
}

window.createUser=async()=>{
  const name=$('nuName').value.trim(),email=$('nuEmail').value.trim(),pass=$('nuPass').value,role=$('nuRole').value;
  if(!name||!email||!pass){showToast('নাম, ইমেইল ও পাসওয়ার্ড দিন!',true);return;}
  // Password policy
  const passErr=validatePassword(pass);
  if(passErr){showToast(passErr,true);return;}
  requireAdminConfirm(async(adminEmail,adminPass)=>{
    try{
      const cred=await createUserWithEmailAndPassword(auth,email,pass);
      await set(ref(db,'users/'+cred.user.uid),{
        name,email,role,
        phone:$('nuPhone').value.trim(),waNum:$('nuWa').value.trim(),
        age:$('nuAge').value,address:$('nuAddress').value.trim(),
        createdBy:CN,createdAt:today(),status:'active'
      });
      await signOut(auth);
      await signInWithEmailAndPassword(auth,adminEmail,adminPass);
      ['nuName','nuEmail','nuPass','nuPhone','nuWa','nuAge','nuAddress'].forEach(id=>{const el=$(id);if(el)el.value='';});
      loader(false);showToast(name+' তৈরি ✓');
    }catch(e){
      loader(false);
      const msg=getErrMsg(e);
      showToast(msg,true);
      showToast(msg,true);
    }
  });
};

function renderUserList(){
  const users=Object.entries(allUsers);
  if(!users.length){$('userList').innerHTML='<div class="empty">কেউ নেই</div>';return;}
  $('userList').innerHTML=users.map(([uid,u])=>`
    <div style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border-l);margin-bottom:8px;box-shadow:var(--shadow-sm)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:13px;font-weight:600">${san(u.name)}
            <span class="role-badge role-${u.role==='pending'?'worker':u.role}">${u.role==='pending'?'⏳ অনুমোদন বাকি':u.role}</span>
            ${u.status==='suspended'?'<span style="color:var(--red);font-size:10px"> 🔴 স্থগিত</span>':u.status==='fired'?'<span style="color:var(--red);font-size:10px"> ❌ বহিষ্কৃত</span>':''}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${san(u.email)} ${u.phone?'· '+san(u.phone):''}</div>
        </div>
        <button style="font-size:10px;padding:4px 8px;border:1px solid var(--blue);border-radius:6px;background:none;color:var(--blue);cursor:pointer;" onclick="viewWorkerProfile('${uid}')">প্রোফাইল</button>
      </div>
      ${uid!==CU.uid?`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        ${u.role==='pending'?`<button onclick="approveUser('${uid}')" style="font-size:10px;padding:4px 8px;border:1px solid var(--green);border-radius:6px;background:rgba(16,185,129,.1);color:var(--green);cursor:pointer;">✅ অনুমোদন</button>`:''}
        <button onclick="suspendUser('${uid}')" style="font-size:10px;padding:4px 8px;border:1px solid var(--accent);border-radius:6px;background:none;color:var(--accent);cursor:pointer;">⏸ স্থগিত</button>
        <button onclick="fireUser('${uid}')" style="font-size:10px;padding:4px 8px;border:1px solid var(--red);border-radius:6px;background:none;color:var(--red);cursor:pointer;">❌ বহিষ্কার</button>
        <button onclick="deleteUser('${uid}')" style="font-size:10px;padding:4px 8px;border:1px solid var(--red);border-radius:6px;background:rgba(239,68,68,.1);color:var(--red);cursor:pointer;">🗑 মুছুন</button>
      </div>`:''}
    </div>`).join('');
}

// Pending user approve
window.approveUser=async(uid)=>{
  confirmAction('✅ কর্মী অনুমোদন',`এই ব্যবহারকারীকে কোন ভূমিকায় অনুমোদন করবেন?`,'অনুমোদন','var(--green)',async()=>{
    const role=$('approveRoleSelect')?.value||'worker';
    try{
      await update(ref(db,'users/'+uid),{role,status:'active'});
      showToast('কর্মী অনুমোদিত ✓');
    }catch(e){showToast(getErrMsg(e),true);}
  });
  // Role select inject
  setTimeout(()=>{
    const body=$('confirmBody');
    if(body)body.innerHTML+=`<div style="margin-top:12px"><select id="approveRoleSelect" class="inp" style="margin:0"><option value="worker">Worker (কর্মী)</option><option value="manager">Manager (ম্যানেজার)</option></select></div>`;
  },50);
};    </div>`).join('')||'<div class="empty">কেউ নেই</div>';
}

window.suspendUser=async uid=>{
  const u=allUsers[uid];
  confirmAction('⏸ কর্মী স্থগিত',`<b>${u?.name||'এই কর্মী'}</b>কে স্থগিত করলে তিনি লগইন করতে পারবেন না।`,'স্থগিত করুন','var(--accent)',async()=>{
    try{await update(ref(db,'users/'+uid),{status:'suspended'});showToast('কর্মী স্থগিত ✓');}
    catch(e){showToast('সমস্যা হয়েছে!',true);}
  });
};
window.fireUser=async uid=>{
  const u=allUsers[uid];
  confirmAction('❌ কর্মী বহিষ্কার',`<b>${u?.name||'এই কর্মী'}</b>কে বহিষ্কার করতে চান? এটি পরে পরিবর্তন করা যাবে।`,'বহিষ্কার করুন','var(--red)',async()=>{
    try{await update(ref(db,'users/'+uid),{status:'fired'});showToast('কর্মী বহিষ্কৃত ✓');}
    catch(e){showToast('সমস্যা হয়েছে!',true);}
  });
};
window.deleteUser=async uid=>{
  const u=allUsers[uid];
  confirmAction('🗑 কর্মী মুছুন',`<b>${u?.name||'এই কর্মী'}</b>কে সম্পূর্ণ মুছে ফেলতে চান?<br><br><span style="color:var(--red)">⚠️ এটি পূর্বাবস্থায় ফেরানো যাবে না।</span>`,'মুছুন','var(--red)',async()=>{
    try{await remove(ref(db,'users/'+uid));showToast('কর্মী মুছে গেছে');}
    catch(e){showToast('সমস্যা হয়েছে!',true);}
  });
};

window.viewWorkerProfile=uid=>{
  const u=allUsers[uid];if(!u)return;
  const now=new Date();
  const ws=Object.values(allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const wst=ws.reduce((a,b)=>a+(b.total||0),0);
  const sal=allSalaries[uid];
  const att=Object.values(allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const lateCount=att.filter(a=>a.isLate).length;
  $('wpTitle').textContent='👤 '+u.name;
  $('wpBody').innerHTML=`
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
    </div>`;
  openMo('workerProfileMo');
};

window.resetAllSales=async()=>{
  confirmAction(
    '🔄 বিক্রয় রিসেট',
    '⚠️ সকলের বিক্রয় ০ করতে চান?<br><br><span style="color:var(--red)">এটি পূর্বাবস্থায় ফেরানো যাবে না! ডেটা আর্কাইভ করা হবে।</span>',
    'রিসেট করুন','var(--red)',
    async()=>{
      try{
        await set(ref(db,'salesArchive/'+today()),allSales);
        await remove(ref(db,'sales'));
        showToast('বিক্রয় রিসেট হয়েছে ✓');
      }catch(e){showToast('সমস্যা হয়েছে!',true);}
    }
  );
};

// ══════════════════════════════════════════════════
//  📄  REPORTS ENGINE — P&L, Salary PDF, Audit Log
// ══════════════════════════════════════════════════

// ── P&L Statement
let plPeriod='month';
window.setPLPeriod=(p,btn)=>{
  plPeriod=p;
  document.querySelectorAll('#plStatement .fb').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  refreshPL();
};
window.refreshPL=()=>{
  const el=$('plContent');if(!el)return;
  const vat=parseFloat($('vatRate')?.value)||0;
  const gst=parseFloat($('gstRate')?.value)||0;
  const now=new Date();
  let sales=Object.values(allSales);
  let exps=Object.values(allExpenses);
  if(plPeriod==='month'){
    sales=sales.filter(s=>{const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
    exps=exps.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  }
  const grossSale=sales.reduce((a,b)=>a+(b.total||0),0);
  const grossProfit=sales.reduce((a,b)=>a+(b.profit||0),0);
  const totalExp=exps.reduce((a,b)=>a+(b.amount||0),0);
  const vatAmt=grossSale*vat/100;
  const gstAmt=grossSale*gst/100;
  const netProfit=grossProfit-totalExp-vatAmt-gstAmt;
  const margin=grossSale>0?(netProfit/grossSale*100).toFixed(1):0;
  const rows=[
    {label:'মোট বিক্রয় (Gross Revenue)',val:grossSale,color:'var(--blue)',bold:true},
    {label:'মোট মুনাফা (Gross Profit)',val:grossProfit,color:'var(--green)'},
    {label:'মোট খরচ (Total Expense)',val:-totalExp,color:'var(--red)'},
    ...(vat>0?[{label:`VAT (${vat}%)`,val:-vatAmt,color:'var(--accent)'}]:[]),
    ...(gst>0?[{label:`GST (${gst}%)`,val:-gstAmt,color:'var(--purple)'}]:[]),
    {label:'নিট মুনাফা (Net Profit)',val:netProfit,color:netProfit>=0?'var(--green)':'var(--red)',bold:true,border:true},
    {label:'মুনাফা মার্জিন (Margin)',val:null,extra:margin+'%',color:netProfit>=0?'var(--green)':'var(--red)'},
  ];
  el.innerHTML=`
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      ${rows.map(r=>`
        <tr style="${r.border?'border-top:2px solid var(--border-l);':''}">
          <td style="padding:8px 4px;color:${r.bold?'var(--text)':'var(--text-2)'};font-weight:${r.bold?700:400}">${r.label}</td>
          <td style="padding:8px 4px;text-align:right;font-weight:${r.bold?700:600};font-family:'Sora',sans-serif;color:${r.color}">
            ${r.val!==null?bn(Math.abs(r.val))+(r.val<0?' (খরচ)':''):r.extra||''}
          </td>
        </tr>`).join('')}
    </table>
    <div style="margin-top:10px;padding:10px;background:${netProfit>=0?'rgba(16,185,129,.08)':'rgba(239,68,68,.08)'};border-radius:var(--r-sm);border:1px solid ${netProfit>=0?'rgba(16,185,129,.2)':'rgba(239,68,68,.2)'}">
      <div style="font-size:11px;color:var(--muted)">সর্বমোট লেনদেন: ${sales.length} টি বিক্রয় · ${exps.length} টি খরচ</div>
    </div>`;
};

// ── Salary PDF Export
window.exportSalaryPDF=()=>{
  const now=new Date();
  const monthName=now.toLocaleDateString('bn-BD',{month:'long',year:'numeric'});
  const workers=Object.entries(allUsers).filter(([,u])=>u.role==='worker'||u.role==='manager');
  const monthSales={};
  Object.values(allSales).forEach(s=>{
    const d=new Date(s.date);
    if(d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()&&s.payStatus==='paid'){
      if(!monthSales[s.uid])monthSales[s.uid]={};
      monthSales[s.uid][s.date]=(monthSales[s.uid][s.date]||0)+s.total;
    }
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
  const rows=workers.map(([uid,u])=>{
    const sal=allSalaries[uid];
    const basic=sal?.basic||0,shiftH=parseFloat(sal?.shiftHours)||8;
    const att=monthAtt[uid]||{days:0,otHours:0};
    const perDay=basic/26;
    const earnedBasic=perDay*att.days;
    const dailySalesMap=monthSales[uid]||{};
    const totalComm=Object.values(dailySalesMap).reduce((sum,s)=>sum+calcCommission(s,allCommConfig),0);
    const perHour=basic/(26*shiftH);
    const otPay=att.otHours*perHour*1.5;
    const totalSaleAmt=Object.values(dailySalesMap).reduce((a,b)=>a+b,0);
    const net=earnedBasic+totalComm+otPay;
    return{name:u.name,role:u.role,days:att.days,basic:Math.round(earnedBasic),comm:Math.round(totalComm),ot:Math.round(otPay),sale:Math.round(totalSaleAmt),net:Math.round(net)};
  });
  const totalNet=rows.reduce((a,b)=>a+b.net,0);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto;color:#1a202c;}
    h1{color:#1E3A8A;margin-bottom:4px;font-size:20px;}
    .sub{color:#64748b;font-size:13px;margin-bottom:20px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th{background:#1E3A8A;color:white;padding:8px 10px;text-align:left;}
    td{padding:8px 10px;border-bottom:1px solid #e2e8f0;}
    tr:nth-child(even){background:#f8fafc;}
    .total{font-weight:bold;background:#f0fdf4!important;color:#059669;}
    .footer{margin-top:20px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;}
  </style></head><body>
  <h1>🏢 NovaTEch BD — বেতন বিবরণী</h1>
  <div class="sub">${monthName} · মোট কর্মী: ${rows.length} জন · মোট বেতন: ৳${totalNet.toLocaleString()}</div>
  <table>
    <tr><th>নাম</th><th>ভূমিকা</th><th>উপস্থিতি</th><th>বিক্রয়</th><th>মূল বেতন</th><th>কমিশন</th><th>OT</th><th>নিট বেতন</th></tr>
    ${rows.map(r=>`<tr>
      <td>${r.name}</td><td>${r.role==='worker'?'কর্মী':'ম্যানেজার'}</td>
      <td>${r.days} দিন</td><td>৳${r.sale.toLocaleString()}</td>
      <td>৳${r.basic.toLocaleString()}</td><td>৳${r.comm.toLocaleString()}</td>
      <td>৳${r.ot.toLocaleString()}</td><td><b>৳${r.net.toLocaleString()}</b></td>
    </tr>`).join('')}
    <tr class="total"><td colspan="7"><b>মোট</b></td><td><b>৳${totalNet.toLocaleString()}</b></td></tr>
  </table>
  <div class="footer">তৈরি: ${new Date().toLocaleString('bn-BD')} · NovaTEch BD Management System</div>
  </body></html>`;
  const w=window.open('','_blank');
  w.document.write(html);w.document.close();
  setTimeout(()=>{w.print();},500);
  auditLog('salary_pdf_export',`${monthName} বেতন PDF export করা হয়েছে`);
};

// ── Audit Log (localStorage-based, session-persistent)
function auditLog(action,detail){
  try{
    const logs=JSON.parse(localStorage.getItem('nt-audit')||'[]');
    logs.unshift({action,detail,user:CN||'?',role:CR||'?',ts:Date.now()});
    if(logs.length>100)logs.pop(); // max 100 entries
    localStorage.setItem('nt-audit',JSON.stringify(logs));
  }catch(e){}
  renderAuditLog();
}
function renderAuditLog(){
  const el=$('auditLogList');if(!el)return;
  try{
    const logs=JSON.parse(localStorage.getItem('nt-audit')||'[]');
    if(!logs.length){el.innerHTML='<div class="empty" style="padding:16px"><div class="ic">📋</div>কোনো লগ নেই</div>';return;}
    const icons={'login':'🔐','logout':'🚪','sale':'🛍','expense':'💸','salary_pdf_export':'📄','reset':'🔄','delete':'🗑','suspend':'⏸','fire':'❌','otp_confirm':'✅','otp_skip':'⏭','customer_add':'🏪','stock_add':'📦','notice_send':'📢','password_change':'🔑'};
    el.innerHTML=logs.map(l=>`
      <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);align-items:flex-start">
        <div style="font-size:16px;flex-shrink:0">${icons[l.action]||'📌'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500;color:var(--text)">${l.detail}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">👤 ${l.user} · ${l.role} · ${new Date(l.ts).toLocaleString('bn-BD',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</div>
        </div>
      </div>`).join('');
  }catch(e){el.innerHTML='<div class="empty">লগ লোড হয়নি</div>';}
}
window.clearAuditLog=()=>{
  confirmAction('🗑 লগ পরিষ্কার','সব অ্যাক্টিভিটি লগ মুছে ফেলতে চান?','মুছুন','var(--red)',()=>{
    localStorage.removeItem('nt-audit');
    renderAuditLog();
    showToast('লগ পরিষ্কার ✓');
  });
};

// Auto-log important actions
const _origAddSale=window.addSale;
// Patch key events for audit logging
function patchAuditLogs(){
  // Login audit
  onAuthStateChanged(auth,user=>{
    if(user)setTimeout(()=>auditLog('login',`${CN||user.email} লগইন করেছেন`),1000);
    else auditLog('logout',`লগআউট হয়েছে`);
  });
}

window.openMo=id=>$(id).classList.add('open');
window.closeMo=id=>$(id).classList.remove('open');

// ═══ XSS PROTECTION ═══
// User input থেকে আসা সব string sanitize করা হবে
function san(str){
  if(str===null||str===undefined)return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;')
    .replace(/\//g,'&#x2F;');
}

// ── Password visibility toggle
window.togglePassVis=(inputId,btnId)=>{
  const inp=$(inputId),btn=$(btnId);
  if(!inp)return;
  const isPass=inp.type==='password';
  inp.type=isPass?'text':'password';
  if(btn)btn.textContent=isPass?'🙈':'👁';
};

// ── Password strength checker
window.checkPassStrength=(pass,wrapId)=>{
  const wrap=$(wrapId); if(!wrap)return;
  if(!pass){wrap.style.display='none';return;}
  wrap.style.display='block';
  const checks={
    len:   pass.length>=8,
    upper: /[A-Z]/.test(pass),
    lower: /[a-z]/.test(pass),
    num:   /[0-9]/.test(pass),
    sym:   /[^A-Za-z0-9]/.test(pass),
  };
  const score=Object.values(checks).filter(Boolean).length;
  const levels=[
    {w:'0%',  bg:'var(--border)',  txt:'',                    col:'var(--muted)'},
    {w:'20%', bg:'var(--red)',     txt:'🔴 অত্যন্ত দুর্বল',  col:'var(--red)'},
    {w:'40%', bg:'var(--red-l)',   txt:'🟠 দুর্বল',          col:'var(--red-l)'},
    {w:'60%', bg:'var(--accent)',  txt:'🟡 মাঝারি',          col:'var(--accent)'},
    {w:'80%', bg:'var(--blue)',    txt:'🔵 ভালো',            col:'var(--blue)'},
    {w:'100%',bg:'var(--green)',   txt:'🟢 শক্তিশালী',      col:'var(--green)'},
  ];
  const lv=levels[score]||levels[0];
  const fill=$(wrapId.replace('Strength','StrengthFill')||wrapId+'Fill');
  const txt=$(wrapId.replace('Strength','StrengthTxt')||wrapId+'Txt');
  const req=$(wrapId.replace('Strength','PassReq')||wrapId+'Req');
  if(fill){fill.style.width=lv.w;fill.style.background=lv.bg;}
  if(txt){txt.textContent=lv.txt;txt.style.color=lv.col;}
  if(req){req.innerHTML=[
    `<span class="${checks.len?'req-ok':'req-bad'}">${checks.len?'✓':'✗'} ৮+ অক্ষর</span>`,
    `<span class="${checks.upper?'req-ok':'req-bad'}">${checks.upper?'✓':'✗'} বড় হাতের অক্ষর (A-Z)</span>`,
    `<span class="${checks.num?'req-ok':'req-bad'}">${checks.num?'✓':'✗'} সংখ্যা (0-9)</span>`,
    `<span class="${checks.sym?'req-ok':'req-bad'}">${checks.sym?'✓':'✗'} চিহ্ন (!@#$)</span>`,
  ].join('');}
  return score;
};

// ── Password validator (returns error msg or null)
function validatePassword(pass){
  if(!pass||pass.length<8) return 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে!';
  if(!/[A-Z]/.test(pass))  return 'পাসওয়ার্ডে কমপক্ষে একটি বড় হাতের অক্ষর (A-Z) থাকতে হবে!';
  if(!/[0-9]/.test(pass))  return 'পাসওয়ার্ডে কমপক্ষে একটি সংখ্যা থাকতে হবে!';
  if(!/[^A-Za-z0-9]/.test(pass)) return 'পাসওয়ার্ডে কমপক্ষে একটি বিশেষ চিহ্ন (!@#$%) থাকতে হবে!';
  return null;
}

// ── Login attempt limiter
const MAX_ATTEMPTS=5;
const LOCKOUT_MS=5*60*1000; // 5 minutes
function getAttemptData(){
  try{return JSON.parse(localStorage.getItem('nt-attempts')||'{"count":0,"ts":0}');}
  catch{return{count:0,ts:0};}
}
function setAttemptData(d){localStorage.setItem('nt-attempts',JSON.stringify(d));}
function resetAttempts(){localStorage.removeItem('nt-attempts');}

function checkLockout(){
  const d=getAttemptData();
  if(d.count>=MAX_ATTEMPTS){
    const elapsed=Date.now()-d.ts;
    if(elapsed<LOCKOUT_MS){
      const remaining=Math.ceil((LOCKOUT_MS-elapsed)/1000/60);
      return`🔒 বেশিবার ভুল চেষ্টা! ${remaining} মিনিট পরে আবার চেষ্টা করুন।`;
    }else{resetAttempts();return null;}
  }
  return null;
}
function recordFailedAttempt(){
  const d=getAttemptData();
  d.count=(d.count||0)+1;
  d.ts=Date.now();
  setAttemptData(d);
  return MAX_ATTEMPTS-d.count;
}
function showAttemptInfo(){
  const d=getAttemptData();
  const ai=$('attemptInfo');
  if(!ai)return;
  if(d.count>0&&d.count<MAX_ATTEMPTS){
    ai.textContent=`⚠️ ${d.count}/${MAX_ATTEMPTS} বার ভুল চেষ্টা`;
    ai.style.color='var(--red-l)';
  }else{ai.textContent='';}
}

// ── Session timeout (15 min idle → 60s countdown → logout)
const IDLE_TIMEOUT=15*60*1000;  // 15 min
const WARN_TIMEOUT=60*1000;     // 60s countdown
let idleTimer=null, countdownTimer=null, countdownSec=60;
const ACTIVITY_EVENTS=['mousemove','keydown','touchstart','click','scroll'];

function resetIdleTimer(){
  clearTimeout(idleTimer);
  clearInterval(countdownTimer);
  hideSessionWarning();
  idleTimer=setTimeout(showSessionWarning, IDLE_TIMEOUT);
}

function showSessionWarning(){
  countdownSec=60;
  $('sessionCountdown').textContent=countdownSec;
  $('sessionOverlay').classList.add('show');
  countdownTimer=setInterval(()=>{
    countdownSec--;
    const el=$('sessionCountdown');
    if(el)el.textContent=countdownSec;
    if(countdownSec<=0){clearInterval(countdownTimer);doLogout();}
  },1000);
}

function hideSessionWarning(){
  $('sessionOverlay')?.classList.remove('show');
  clearInterval(countdownTimer);
}

window.extendSession=()=>{
  hideSessionWarning();
  resetIdleTimer();
  showToast('সেশন বাড়ানো হয়েছে ✓');
};

function startSessionTimer(){
  ACTIVITY_EVENTS.forEach(ev=>document.addEventListener(ev,resetIdleTimer,{passive:true}));
  resetIdleTimer();
}
function stopSessionTimer(){
  ACTIVITY_EVENTS.forEach(ev=>document.removeEventListener(ev,resetIdleTimer));
  clearTimeout(idleTimer);clearInterval(countdownTimer);
  hideSessionWarning();
}

// CSS variable reader (works in both themes)
function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Setup canvas with device pixel ratio
function setupCanvas(id){
  const c=$(id); if(!c) return null;
  const dpr=window.devicePixelRatio||1;
  const w=c.parentElement.clientWidth||300;
  c.width=w*dpr; c.height=c.height*dpr||100*dpr;
  c.style.width=w+'px';
  const ctx=c.getContext('2d');
  ctx.scale(dpr,dpr);
  return{c,ctx,w,h:parseInt(c.style.height||c.height/dpr)};
}

// ── Sparkline (mini line chart inside summary card)
function drawSparkline(canvasId, values, color){
  const cv=$(canvasId); if(!cv||!values.length) return;
  const dpr=window.devicePixelRatio||1;
  const w=cv.parentElement.clientWidth-28||100;
  const h=28;
  cv.width=w*dpr; cv.height=h*dpr;
  cv.style.width=w+'px'; cv.style.height=h+'px';
  const ctx=cv.getContext('2d');
  ctx.scale(dpr,dpr);
  const max=Math.max(...values,1);
  const pad=3;
  const step=values.length>1?(w-pad*2)/(values.length-1):0;
  ctx.clearRect(0,0,w,h);
  // Gradient fill
  const grad=ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,color.replace(')',',0.35)').replace('rgb','rgba').replace('var(--','').replace(')',''));
  grad.addColorStop(1,'transparent');
  // Draw line
  ctx.beginPath();
  values.forEach((v,i)=>{
    const x=pad+i*step;
    const y=h-pad-((v/max)*(h-pad*2));
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  });
  ctx.strokeStyle=color;
  ctx.lineWidth=1.5;
  ctx.lineJoin='round';
  ctx.stroke();
  // Fill under line
  ctx.lineTo(pad+(values.length-1)*step,h);
  ctx.lineTo(pad,h);
  ctx.closePath();
  ctx.fillStyle=grad;
  ctx.fill();
}

function drawSparklines(){
  // last 7 days daily totals
  const days=[];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().split('T')[0]);}
  const saleTotals=days.map(d=>Object.values(allSales).filter(s=>s.date===d).reduce((a,b)=>a+(b.total||0),0));
  const profitTotals=days.map(d=>Object.values(allSales).filter(s=>s.date===d).reduce((a,b)=>a+(b.profit||0),0));
  const expTotals=days.map(d=>Object.values(allExpenses).filter(e=>e.date===d).reduce((a,b)=>a+(b.amount||0),0));
  const dueTotals=days.map(d=>Object.values(allSales).filter(s=>s.date===d).reduce((a,b)=>a+(b.due||0),0));
  const blue=cssVar('--blue')||'#3B82F6';
  const green=cssVar('--green')||'#10B981';
  const red=cssVar('--red')||'#EF4444';
  const purple=cssVar('--purple')||'#8B5CF6';
  drawSparkline('sparkSale',saleTotals,blue);
  drawSparkline('sparkProfit',profitTotals,green);
  drawSparkline('sparkExp',expTotals,red);
  drawSparkline('sparkDue',dueTotals,purple);
}

// ── Line Chart (Sales Trend 7 days)
function drawSalesTrendChart(){
  const r=setupCanvas('salesTrendChart'); if(!r)return;
  const{ctx,w,h}=r;
  const days=[];const labels=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    days.push(d.toISOString().split('T')[0]);
    labels.push((d.getMonth()+1)+'/'+d.getDate());
  }
  const values=days.map(d=>Object.values(allSales).filter(s=>s.date===d).reduce((a,b)=>a+(b.total||0),0));
  const profVals=days.map(d=>Object.values(allSales).filter(s=>s.date===d).reduce((a,b)=>a+(b.profit||0),0));
  const padL=10,padR=10,padT=12,padB=28;
  const cw=w-padL-padR, ch=h-padT-padB;
  const max=Math.max(...values,...profVals,1);
  ctx.clearRect(0,0,w,h);
  // Grid lines
  ctx.strokeStyle=cssVar('--border')||'#1E2D45';
  ctx.lineWidth=1;
  [0,0.25,0.5,0.75,1].forEach(t=>{
    const y=padT+ch*(1-t);
    ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+cw,y);ctx.stroke();
  });
  // Draw line helper
  function drawLine(vals,color,filled){
    const step=vals.length>1?cw/(vals.length-1):0;
    ctx.beginPath();
    vals.forEach((v,i)=>{
      const x=padL+i*step, y=padT+ch*(1-v/max);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
    if(filled){
      ctx.lineTo(padL+cw,padT+ch); ctx.lineTo(padL,padT+ch); ctx.closePath();
      const g=ctx.createLinearGradient(0,padT,0,padT+ch);
      g.addColorStop(0,color.replace('#','').length===6?hexA(color,.18):color.replace('rgb','rgba').replace(')',',0.18)'));
      g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fill();
    }
  }
  drawLine(values,cssVar('--blue')||'#3B82F6',true);
  drawLine(profVals,cssVar('--green')||'#10B981',false);
  // X labels
  ctx.fillStyle=cssVar('--muted')||'#64748B';
  ctx.font=`9px Sora,sans-serif`; ctx.textAlign='center';
  labels.forEach((l,i)=>{
    const step=values.length>1?cw/(values.length-1):0;
    ctx.fillText(l,padL+i*step,h-6);
  });
  // Legend
  ctx.textAlign='left';
  ctx.fillStyle=cssVar('--blue')||'#3B82F6'; ctx.fillRect(padL,3,10,4);
  ctx.fillStyle=cssVar('--muted')||'#64748B'; ctx.font='9px sans-serif'; ctx.fillText('বিক্রয়',padL+13,8);
  ctx.fillStyle=cssVar('--green')||'#10B981'; ctx.fillRect(padL+55,3,10,4);
  ctx.fillStyle=cssVar('--muted'); ctx.fillText('লাভ',padL+68,8);
}
function hexA(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}

// ── Horizontal Bar Chart
function drawHBarChart(canvasId, labels, values, color){
  const r=setupCanvas(canvasId); if(!r)return;
  const{ctx,w,h}=r;
  const n=Math.min(labels.length,5);
  if(!n){ctx.clearRect(0,0,w,h);return;}
  const padL=4,padR=6,padT=4,padB=4;
  const rowH=(h-padT-padB)/n;
  const max=Math.max(...values.slice(0,n),1);
  ctx.clearRect(0,0,w,h);
  const labelW=60;
  for(let i=0;i<n;i++){
    const y=padT+i*rowH;
    const barW=(w-padL-padR-labelW)*values[i]/max;
    // label
    ctx.fillStyle=cssVar('--muted')||'#64748B';
    ctx.font='9px Hind Siliguri,sans-serif'; ctx.textAlign='left';
    const lbl=labels[i].length>9?labels[i].slice(0,8)+'…':labels[i];
    ctx.fillText(lbl,padL,y+rowH*0.62);
    // bar bg
    ctx.fillStyle=cssVar('--border')||'#1E2D45';
    ctx.beginPath();
    ctx.roundRect(padL+labelW,y+rowH*.2,w-padL-padR-labelW,rowH*.5,3);
    ctx.fill();
    // bar fill
    if(barW>0){
      const grad=ctx.createLinearGradient(padL+labelW,0,padL+labelW+barW,0);
      grad.addColorStop(0,color); grad.addColorStop(1,(cssVar('--blue-l')||'#60A5FA'));
      ctx.fillStyle=grad;
      ctx.beginPath();
      ctx.roundRect(padL+labelW,y+rowH*.2,barW,rowH*.5,3);
      ctx.fill();
    }
  }
}

function drawTopProductsChart(){
  const pm={};
  Object.values(allSales).forEach(s=>{pm[s.product]=(pm[s.product]||0)+s.qty;});
  const sorted=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,5);
  drawHBarChart('topProductsChart',sorted.map(e=>e[0]),sorted.map(e=>e[1]),cssVar('--accent')||'#F59E0B');
}
function drawTopShopsChart(){
  const sm={};
  Object.values(allSales).forEach(s=>{sm[s.shop]=(sm[s.shop]||0)+s.total;});
  const sorted=Object.entries(sm).sort((a,b)=>b[1]-a[1]).slice(0,5);
  drawHBarChart('topShopsChart',sorted.map(e=>e[0]),sorted.map(e=>e[1]),cssVar('--purple')||'#8B5CF6');
}

// ── Report: 30-day trend
function drawReportTrendChart(){
  const r=setupCanvas('reportTrendChart'); if(!r)return;
  const{ctx,w,h}=r;
  const days=[];const labels=[];
  for(let i=29;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    days.push(d.toISOString().split('T')[0]);
    if(i%7===0||i===0)labels.push((d.getMonth()+1)+'/'+d.getDate());
    else labels.push('');
  }
  const values=days.map(d=>Object.values(allSales).filter(s=>s.date===d).reduce((a,b)=>a+(b.total||0),0));
  const padL=8,padR=8,padT=10,padB=22;
  const cw=w-padL-padR, ch=h-padT-padB;
  const max=Math.max(...values,1);
  ctx.clearRect(0,0,w,h);
  // Grid
  ctx.strokeStyle=cssVar('--border')||'#1E2D45'; ctx.lineWidth=1;
  [0,0.5,1].forEach(t=>{
    const y=padT+ch*(1-t);
    ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+cw,y);ctx.stroke();
  });
  // Fill area
  const step=cw/(values.length-1);
  const grad=ctx.createLinearGradient(0,padT,0,padT+ch);
  grad.addColorStop(0,hexA(cssVar('--blue')||'#3B82F6',.25));
  grad.addColorStop(1,'transparent');
  ctx.beginPath();
  values.forEach((v,i)=>{const x=padL+i*step,y=padT+ch*(1-v/max);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.lineTo(padL+cw,padT+ch);ctx.lineTo(padL,padT+ch);ctx.closePath();
  ctx.fillStyle=grad;ctx.fill();
  // Line
  ctx.beginPath();
  values.forEach((v,i)=>{const x=padL+i*step,y=padT+ch*(1-v/max);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.strokeStyle=cssVar('--blue')||'#3B82F6';ctx.lineWidth=1.5;ctx.lineJoin='round';ctx.stroke();
  // X labels
  ctx.fillStyle=cssVar('--muted')||'#64748B';ctx.font='8px sans-serif';ctx.textAlign='center';
  labels.forEach((l,i)=>{if(l)ctx.fillText(l,padL+i*step,h-5);});
}

// ── Report: Route bar chart
function drawRoutePerfChart(){
  const r=setupCanvas('routePerfChart'); if(!r)return;
  const{ctx,w,h}=r;
  const rm={};
  Object.values(allSales).forEach(s=>{
    if(s.routeId&&allRoutes[s.routeId]){
      const rn=allRoutes[s.routeId].name;
      rm[rn]=(rm[rn]||0)+s.total;
    }
  });
  const entries=Object.entries(rm).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!entries.length){ctx.clearRect(0,0,w,h);return;}
  const padL=8,padR=8,padT=10,padB=30;
  const cw=w-padL-padR,ch=h-padT-padB;
  const n=entries.length;
  const barW=Math.min(cw/n*0.6,36);
  const gap=cw/n;
  const max=Math.max(...entries.map(e=>e[1]),1);
  ctx.clearRect(0,0,w,h);
  const colors=[cssVar('--blue'),cssVar('--green'),cssVar('--accent'),cssVar('--purple'),cssVar('--red'),cssVar('--blue-l')];
  entries.forEach(([name,val],i)=>{
    const x=padL+i*gap+(gap-barW)/2;
    const bh=ch*(val/max);
    const y=padT+ch-bh;
    const grad=ctx.createLinearGradient(0,y,0,y+bh);
    grad.addColorStop(0,colors[i%colors.length]||'#3B82F6');
    grad.addColorStop(1,hexA(colors[i%colors.length]||'#3B82F6',.5));
    ctx.fillStyle=grad;
    ctx.beginPath();ctx.roundRect(x,y,barW,bh,4);ctx.fill();
    // Label
    ctx.fillStyle=cssVar('--muted')||'#64748B';
    ctx.font='8px Hind Siliguri,sans-serif';ctx.textAlign='center';
    const lbl=name.length>6?name.slice(0,5)+'…':name;
    ctx.fillText(lbl,x+barW/2,h-5);
  });
}

// ── Commission Leaderboard
function renderCommLeaderboard(){
  const el=$('commLeaderboard'); if(!el) return;
  const now=new Date();
  const workerCommMap={};
  Object.entries(allUsers).filter(([,u])=>u.role==='worker'||u.role==='manager').forEach(([uid,u])=>{
    const dailyMap={};
    Object.values(allSales).filter(s=>{
      const d=new Date(s.date);
      return s.uid===uid&&s.payStatus==='paid'&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    }).forEach(s=>{dailyMap[s.date]=(dailyMap[s.date]||0)+s.total;});
    const totalComm=Object.values(dailyMap).reduce((sum,v)=>sum+calcCommission(v,allCommConfig),0);
    const totalSale=Object.values(dailyMap).reduce((a,b)=>a+b,0);
    workerCommMap[uid]={name:u.name,comm:totalComm,sale:totalSale};
  });
  const sorted=Object.values(workerCommMap).sort((a,b)=>b.comm-a.comm);
  if(!sorted.length){el.innerHTML='<div class="empty"><div class="ic">🏆</div><p>ডেটা নেই</p></div>';return;}
  const medals=['🥇','🥈','🥉'];
  el.innerHTML=sorted.map((w,i)=>`
    <div class="rb" style="display:flex;align-items:center;gap:10px;">
      <div style="font-size:20px;flex-shrink:0">${medals[i]||'👤'}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${w.name}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:1px">বিক্রয়: ${bn(w.sale)}</div>
        <div class="bar-t" style="margin-top:5px"><div class="bar-f" style="width:${(w.sale/(sorted[0].sale||1)*100).toFixed(0)}%;background:${i===0?'var(--accent)':i===1?'var(--blue)':'var(--purple)'}"></div></div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:14px;font-weight:700;color:var(--accent);font-family:'Sora',sans-serif">${bn(w.comm)}</div>
        <div style="font-size:10px;color:var(--muted)">কমিশন</div>
      </div>
    </div>`).join('');
}

// ── Worker-only charts (নিজের data)
function drawWorkerCharts(){
  if(CR!=='worker')return;
  // Trend chart
  const r=setupCanvas('workerTrendChart');if(!r)return;
  const{ctx,w,h}=r;
  const days=[];const labels=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    days.push(d.toISOString().split('T')[0]);
    labels.push((d.getMonth()+1)+'/'+d.getDate());
  }
  const values=days.map(d=>Object.values(allSales).filter(s=>s.date===d&&s.uid===CU.uid).reduce((a,b)=>a+(b.total||0),0));
  const padL=10,padR=10,padT=12,padB=28,cw=w-padL-padR,ch=h-padT-padB;
  const max=Math.max(...values,1);
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle=cssVar('--border')||'#1E2D45';ctx.lineWidth=1;
  [0,0.5,1].forEach(t=>{const y=padT+ch*(1-t);ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+cw,y);ctx.stroke();});
  const step=values.length>1?cw/(values.length-1):0;
  const grad=ctx.createLinearGradient(0,padT,0,padT+ch);
  grad.addColorStop(0,hexA(cssVar('--accent')||'#F59E0B',.25));grad.addColorStop(1,'transparent');
  ctx.beginPath();values.forEach((v,i)=>{const x=padL+i*step,y=padT+ch*(1-v/max);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.lineTo(padL+cw,padT+ch);ctx.lineTo(padL,padT+ch);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();values.forEach((v,i)=>{const x=padL+i*step,y=padT+ch*(1-v/max);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.strokeStyle=cssVar('--accent')||'#F59E0B';ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  ctx.fillStyle=cssVar('--muted');ctx.font='9px sans-serif';ctx.textAlign='center';
  labels.forEach((l,i)=>ctx.fillText(l,padL+i*step,h-5));
  // Product chart (নিজের)
  const pm={};
  Object.values(allSales).filter(s=>s.uid===CU.uid).forEach(s=>{pm[s.product]=(pm[s.product]||0)+s.qty;});
  const sorted=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,5);
  drawHBarChart('workerProductChart',sorted.map(e=>e[0]),sorted.map(e=>e[1]),cssVar('--accent')||'#F59E0B');
}

// ── Customer Sheet Print
window.printCustomerSheet=()=>{
  const custs=Object.values(allCustomers);
  if(!custs.length){showToast('কোনো কাস্টমার নেই!',true);return;}
  const now=new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
  const rows=custs.map(c=>{
    const route=allRoutes[c.routeId]?.name||'-';
    const cs=Object.values(allSales).filter(s=>s.shopId===Object.keys(allCustomers).find(k=>allCustomers[k]===c));
    const totalSale=cs.reduce((a,b)=>a+(b.total||0),0);
    const totalDue=cs.reduce((a,b)=>a+(b.due||0),0);
    return{name:c.name,owner:c.owner||'-',route,phone:c.smsNum||c.waNum||'-',biz:['ইলেকট্রনিক ও টেলিকম','ইলেকট্রনিক','টেলিকম','মুদি+টেলিকম','অন্যান্য'][c.bizType]||'-',sale:totalSale,due:totalDue};
  }).sort((a,b)=>a.route.localeCompare(b.route,'bn'));
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;padding:16px;font-size:12px;color:#1a202c;}
    h1{color:#1E3A8A;font-size:16px;margin-bottom:2px;}
    .sub{color:#64748b;font-size:11px;margin-bottom:14px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#1E3A8A;color:#fff;padding:7px 8px;text-align:left;font-size:11px;}
    td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;}
    tr:nth-child(even){background:#f8fafc;}
    .due{color:#dc2626;font-weight:600;}
    @media print{body{padding:0;}}
  </style></head><body>
  <h1>🏢 NovaTEch BD — কাস্টমার তালিকা</h1>
  <div class="sub">তারিখ: ${now} · মোট: ${rows.length} জন কাস্টমার</div>
  <table>
    <tr><th>#</th><th>দোকানের নাম</th><th>মালিক</th><th>রুট</th><th>ব্যবসা</th><th>ফোন</th><th>মোট বিক্রয়</th><th>বাকি</th></tr>
    ${rows.map((r,i)=>`<tr>
      <td>${i+1}</td><td><b>${r.name}</b></td><td>${r.owner}</td>
      <td>${r.route}</td><td>${r.biz}</td><td>${r.phone}</td>
      <td>৳${r.sale.toLocaleString()}</td>
      <td class="${r.due>0?'due':''}">${r.due>0?'৳'+r.due.toLocaleString():'-'}</td>
    </tr>`).join('')}
  </table>
  <div style="margin-top:12px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;">
    NovaTEch BD Management System · ${now}
  </div>
  </body></html>`;
  const w=window.open('','_blank');
  w.document.write(html);w.document.close();
  setTimeout(()=>w.print(),500);
  auditLog('customer_print',`কাস্টমার শিট প্রিন্ট (${rows.length} জন)`);
};
// ══════════════════════════════════════════════════
//  🎨 THEME TOGGLE
// ══════════════════════════════════════════════════
window.toggleTheme=()=>{
  const html=document.documentElement;
  const isDark=html.getAttribute('data-theme')==='dark';
  const next=isDark?'light':'dark';
  html.setAttribute('data-theme',next);
  document.querySelector('meta[name="theme-color"]').content=isDark?'#F0F4F8':'#0B1120';
  $('themeToggleBtn').textContent=isDark?'☀️':'🌙';
  localStorage.setItem('nt-theme',next);
};

// ══════════════════════════════════════════════════
//  📋 AUDIT LOG
// ══════════════════════════════════════════════════
function auditLog(action,detail){
  try{
    const logs=JSON.parse(localStorage.getItem('nt-audit')||'[]');
    logs.unshift({action,detail,user:CN||'?',role:CR||'?',ts:Date.now()});
    if(logs.length>100)logs.pop();
    localStorage.setItem('nt-audit',JSON.stringify(logs));
  }catch(e){}
  renderAuditLog();
}
function renderAuditLog(){
  const el=$('auditLogList');if(!el)return;
  try{
    const logs=JSON.parse(localStorage.getItem('nt-audit')||'[]');
    if(!logs.length){el.innerHTML='<div class="empty" style="padding:16px"><div class="ic">📋</div>কোনো লগ নেই</div>';return;}
    const icons={'login':'🔐','logout':'🚪','sale':'🛍','expense':'💸','salary_pdf_export':'📄','reset':'🔄','delete':'🗑','suspend':'⏸','fire':'❌','otp_confirm':'✅','customer_add':'🏪','stock_add':'📦','notice_send':'📢','invoice_generate':'🧾','salary_slip':'📝','customer_print':'🖨️'};
    el.innerHTML=logs.map(l=>`<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);align-items:flex-start"><div style="font-size:16px;flex-shrink:0">${icons[l.action]||'📌'}</div><div style="flex:1"><div style="font-size:12px;font-weight:500">${san(l.detail)}</div><div style="font-size:10px;color:var(--muted);margin-top:2px">👤 ${san(l.user)} · ${new Date(l.ts).toLocaleString('bn-BD',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'})}</div></div></div>`).join('');
  }catch(e){}
}
window.clearAuditLog=()=>{
  confirmAction('🗑 লগ পরিষ্কার','সব লগ মুছে ফেলবেন?','মুছুন','var(--red)',()=>{localStorage.removeItem('nt-audit');renderAuditLog();showToast('লগ পরিষ্কার ✓');});
};

function patchAuditLogs(){
  onAuthStateChanged(auth,user=>{
    if(user)setTimeout(()=>auditLog('login',`${CN||user.email} লগইন করেছেন`),1200);
    else auditLog('logout','লগআউট হয়েছে');
  });
}

// Notice expiry preview
function updateExpPreview(){
  const val=parseFloat($('noticeExpVal')?.value)||0;
  const unit=$('noticeExpUnit')?.value||'hour';
  const prev=$('noticeExpPreview');if(!prev)return;
  if(!val){prev.textContent='⏳ মেয়াদ সেট না করলে চিরস্থায়ী';prev.style.color='var(--muted)';return;}
  const labels={min:'মিনিট',hour:'ঘণ্টা',day:'দিন'};
  const ms={min:60000,hour:3600000,day:86400000};
  const expTime=new Date(Date.now()+val*ms[unit]);
  const expStr=expTime.toLocaleString('bn-BD',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
  prev.textContent=`⏳ ${val} ${labels[unit]} পরে (${expStr}) মুছে যাবে`;
  prev.style.color='var(--accent)';
}

window.openMo=id=>{$(id)?.classList.add('open');};
window.closeMo=id=>{$(id)?.classList.remove('open');};

