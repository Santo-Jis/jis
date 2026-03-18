// ══════════════════════════════════════════════════
//  NovaTEch BD — App Engine v4.0
//  Firebase + সকল ফিচার
//  ভাগ ১ + ভাগ ২ সম্পূর্ণ
// ══════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set, push, get, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const FC={apiKey:"AIzaSyAHdK7zelJcBFc8fOFSgH8G_6jEjZdNoSI",authDomain:"novatech-bd-10421.firebaseapp.com",databaseURL:"https://novatech-bd-10421-default-rtdb.firebaseio.com",projectId:"novatech-bd-10421",storageBucket:"novatech-bd-10421.firebasestorage.app",messagingSenderId:"1098950143887",appId:"1:1098950143887:web:bb7014007540c878b165fa"};
const app=initializeApp(FC);
const auth=getAuth(app);
const db=getDatabase(app);

let CU=null,CR=null,CN=null;
let allSales={},allExpenses={},allProducts={},allUsers={},allAllowances={},allCustomers={},allRoutes={},allStock={},allStockAssign={},allAttendance={},allLeaves={},allSalaries={},allCommConfig={},allNotices={},allTeams={},allSMSConfig={};
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

  onValue(ref(db,'sales'),s=>{allSales=s.val()||{};refreshDash();renderSaleList();renderDue();if(CR==='admin')renderReport();renderProfile();});
  onValue(ref(db,'expenses'),s=>{allExpenses=s.val()||{};refreshDash();renderExpList();if(CR==='admin')renderReport();});
  onValue(ref(db,'products'),s=>{allProducts=s.val()||{};loadProductSelects();if(CR==='admin')renderProdChips();});
  onValue(ref(db,'users'),s=>{allUsers=s.val()||{};if(CR==='admin')renderUserList();loadAllWorkerSelects();});
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

  loader(false);showPage('dash');
}

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
    {id:'enterprise',label:'🤖 AI ড্যাশ',r:['admin','manager']},
    {id:'allow',label:'🚗 ভাতা',r:['admin','manager']},
    {id:'admin',label:'⚙️ অ্যাডমিন',r:['admin']},
  ];
  $('mainNav').innerHTML=tabs.filter(t=>t.r.includes(CR))
    .map(t=>`<button class="nav-btn" data-page="${t.id}" onclick="showPage('${t.id}')">${t.label}</button>`).join('');
}

window.showPage=id=>{
  // Role-based page access check
  const restricted={
    'report':['admin'],
    'admin':['admin'],
    'salary':['admin','manager'],
    'teams':['admin','manager'],
    'allow':['admin','manager'],
    'enterprise':['admin','manager'],
  };
  if(restricted[id]&&!restricted[id].includes(CR)){
    showToast('এই পেজ দেখার অনুমতি নেই!',true);
    id='dash'; // redirect to dash
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  $('page-'+id)?.classList.add('active');
  document.querySelector(`[data-page="${id}"]`)?.classList.add('active');
  if(id==='report')renderReport();
  if(id==='enterprise'&&typeof window.renderEnterpriseDashboard==='function')setTimeout(window.renderEnterpriseDashboard,300);
  if(id==='salary')renderSalary();
  if(id==='profile')renderProfile();
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
  const relevant=Object.values(allNotices).filter(n=>{
    if(n.target==='all')return true;
    if(n.target==='worker'&&CR==='worker')return true;
    if(n.target==='manager'&&CR==='manager')return true;
    return false;
  }).sort((a,b)=>b.ts-a.ts).slice(0,3);
  if(!relevant.length){el.innerHTML='';return;}
  el.innerHTML=relevant.map(n=>`<div class="notice-card"><div class="nt">📢 ${n.title}</div><div class="nb">${n.body}</div><div class="nd">${fmtDate(new Date(n.ts).toISOString().split('T')[0])}</div></div>`).join('');
}

window.sendNotice=async()=>{
  const title=$('noticeTitle').value.trim(),body=$('noticeBody').value.trim(),target=$('noticeTarget').value;
  if(!title||!body){showToast('শিরোনাম ও বার্তা দিন!',true);return;}
  await push(ref(db,'notices'),{title,body,target,sentBy:CN,ts:Date.now()});
  $('noticeTitle').value='';$('noticeBody').value='';
  showToast('নোটিশ পাঠানো হয়েছে ✓');
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
  if(routeFilter!=='all')list=list.filter(([,c])=>c.routeId===routeFilter);
  if(q)list=list.filter(([,c])=>(c.name||'').toLowerCase().includes(q)||(c.owner||'').toLowerCase().includes(q));
  const el=$('custList');
  el.innerHTML=list.length?list.map(([id,c])=>{
    const biz=parseInt(c.bizType||0),route=allRoutes[c.routeId];
    // Last order
    const lastOrders=Object.values(allSales).filter(s=>s.shopId===id).sort((a,b)=>b.ts-a.ts);
    const lastOrder=lastOrders[0];
    return`<div class="cust-card"><div style="font-size:14px;font-weight:700">🏪 ${c.name}</div><div style="font-size:12px;color:var(--muted);margin-top:2px">👤 ${c.owner||''} ${route?'· 🗺️ '+route.name:''}</div><span class="biz-tag biz-${biz}">${BIZ[biz]}</span>${lastOrder?`<div style="font-size:11px;color:var(--muted);margin-top:4px">সর্বশেষ অর্ডার: ${fmtDate(lastOrder.date)} · ${bn(lastOrder.total)}</div>`:''}<div class="cust-actions">${c.waNum?`<button class="cact wa" onclick="openWA('${c.waNum}')">📲 WA</button>`:''} ${c.lat&&c.lng?`<button class="cact mp" onclick="openMap(${c.lat},${c.lng})">📍 ম্যাপ</button>`:''} <button class="cact bl" onclick="viewCust('${id}')">👁 বিস্তারিত</button></div></div>`;
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
  await push(ref(db,'customers'),{name,owner,bizType,routeId,waNum:$('cWa').value.trim(),smsNum:$('cSms').value.trim(),lat:parseFloat($('cLat').value)||null,lng:parseFloat($('cLng').value)||null,note:$('cNote').value.trim(),addedBy:CU.uid,addedByName:CN,ts:Date.now()});
  ['cName','cOwner','cWa','cSms','cLat','cLng','cNote'].forEach(id=>{const el=$(id);if(el)el.value='';});
  closeMo('custMo');showToast(name+' যোগ হয়েছে ✓');
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
    clearSaleForm();showToast('✅ বিক্রয় সংরক্ষিত + SMS পাঠানো হয়েছে');renderVisitList();
  } else {
    // No SMS
    await push(ref(db,'sales'),saleData);
    clearSaleForm();showToast('✅ বিক্রয় সংরক্ষিত');renderVisitList();
  }
};

window.confirmOTP=async()=>{
  const entered=$('otpInput').value.trim();
  if(!entered){showToast('OTP লিখুন!',true);return;}
  if(entered===pendingOTP){
    const saleData={...pendingSaleData,otpConfirmed:true};
    await push(ref(db,'sales'),saleData);
    pendingSaleData=null;pendingOTP=null;
    $('otpSection').style.display='none';
    clearSaleForm();showToast('বিক্রয় OTP নিশ্চিত ✓');renderVisitList();
  }else{
    showToast('OTP ভুল! আবার চেষ্টা করুন',true);
  }
};
window.skipOTP=async()=>{
  if(!pendingSaleData)return;
  await push(ref(db,'sales'),{...pendingSaleData,otpConfirmed:false,otpSkipped:true});
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
  await push(ref(db,'expenses'),{date,type,amount,note:$('eNote').value.trim(),uid:CU.uid,workerName:CN,ts:Date.now()});
  $('eAmt').value='';$('eNote').value='';showToast('খরচ সংরক্ষিত ✓');
};
function renderExpList(){
  let list=Object.values(allExpenses);
  if(CR==='worker')list=list.filter(e=>e.uid===CU.uid);
  list.sort((a,b)=>(b.ts||0)-(a.ts||0));
  $('expList').innerHTML=list.length?list.map(e=>`<div class="ec"><div class="ei"><div class="shop">${e.type}</div><div class="prod">${e.note||''} · <span class="wtag">${e.workerName||''}</span></div><div class="dt">📅 ${fmtDate(e.date)}</div></div><div class="ea"><div class="sale" style="color:var(--red)">${bn(e.amount)}</div></div></div>`).join(''):'<div class="empty"><div class="ic">💸</div>কোনো খরচ নেই</div>';
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
  // Worker নিজের salary শুধু দেখতে পারবে
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
  const name=$('nuName').value.trim(),email=$('nuEmail').value.trim(),pass=$('nuPass').value,role=$('nuRole').value;
  if(!name||!email||!pass){showToast('নাম, ইমেইল ও পাসওয়ার্ড দিন!',true);return;}
  loader(true);
  try{
    const ce=CU.email,cp=prompt('Admin পাসওয়ার্ড নিশ্চিত করুন:');
    const cred=await createUserWithEmailAndPassword(auth,email,pass);
    await set(ref(db,'users/'+cred.user.uid),{
      name,email,role,
      phone:$('nuPhone').value.trim(),waNum:$('nuWa').value.trim(),
      age:$('nuAge').value,address:$('nuAddress').value.trim(),
      createdBy:CN,createdAt:today(),status:'active'
    });
    await signOut(auth);await signInWithEmailAndPassword(auth,ce,cp);
    ['nuName','nuEmail','nuPass','nuPhone','nuWa','nuAge','nuAddress'].forEach(id=>{const el=$(id);if(el)el.value='';});
    showToast(name+' তৈরি ✓');
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
  if(CR!=='admin'){showToast('শুধু Admin করতে পারবে!',true);return;}
  if(!confirm('সকলের বিক্রয় রিসেট করবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না!'))return;
  // Archive and reset
  await set(ref(db,'salesArchive/'+today()),allSales);
  await remove(ref(db,'sales'));
  showToast('বিক্রয় রিসেট হয়েছে ✓');
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
  showToast('Google Drive কনফিগ ✓');
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

// Anthropic API Key save
window.saveAIConfig=async()=>{
  const key=$('anthropicApiKey')?.value.trim();
  if(!key){showToast('API Key দিন!',true);return;}
  await set(ref(db,'aiConfig'),{anthropicApiKey:key,updatedBy:CN,ts:Date.now()});
  localStorage.setItem('nt-ai-key',key);
  showToast('AI Config সেভ ✓');
};
