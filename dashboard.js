
function getFilteredSales(){
  const now=new Date();
  // ✅ Cache থেকে শুরু — Object.values() call নেই
  const base = window.CR==='worker' ? (window._sc.byUid[window.CU?.uid]||[]) : window._sc.arr;
  if(filterMode==='today'){
    const td=window.today();
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
  const exps=Object.values(window.allExpenses).filter(e=>{
    // ✅ Worker শুধু নিজের খরচ দেখবে, manager/admin সব দেখবে
    if(window.CR==='worker' && e.uid!==window.CU.uid) return false;
    // ✅ সব filter mode সঠিকভাবে প্রয়োগ
    if(filterMode==='today') return e.date===window.today();
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
  const totalProfit = window.CR==='admin' ? sales.reduce((s,i)=>s+(i.profit||0),0) : 0;
  const totalExp    = exps.reduce((s,i)=>s+(i.amount||0),0);
  // ✅ Cache থেকে due নেওয়া — loop নেই
  const totalDue = window.CR==='worker'
    ? (window._sc.byUid[window.CU.uid]||[]).reduce((a,s)=>a+(s.due||0),0)
    : window._sc.arr.reduce((a,s)=>a+(s.due||0),0);

  window.$('dSale').textContent   = window.bn(totalSale);
  window.$('dProfit').textContent = window.CR==='admin' ? window.bn(totalProfit) : '—';
  window.$('dExp').textContent    = window.bn(totalExp);
  window.$('dDue').textContent    = window.bn(totalDue);

  // ── Trend badge: আজ vs গতকাল তুলনা ──
  function _setTrend(elId, current, prev) {
    const el = window.$(elId); if(!el) return;
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
  const ydSales = (window._sc.byDate[ydStr]||[]).filter(s=>window.CR!=='worker'||s.uid===window.CU?.uid);
  const ydExps  = Object.values(window.allExpenses).filter(e=>e.date===ydStr&&(window.CR!=='worker'||e.uid===window.CU.uid));
  const ydSale   = ydSales.reduce((a,b)=>a+(b.total||0),0);
  const ydProfit = window.CR==='admin' ? ydSales.reduce((a,b)=>a+(b.profit||0),0) : 0;
  const ydExp    = ydExps.reduce((a,b)=>a+(b.amount||0),0);

  // filterMode=today হলে trend দেখাই, বাকিতে লুকাই
  if(filterMode==='today') {
    _setTrend('trendSale', totalSale, ydSale);
    if(window.CR==='admin') _setTrend('trendProfit', totalProfit, ydProfit);
    _setTrend('trendExp', totalExp, ydExp);
    ['trendDue'].forEach(id=>{const el=window.$(id);if(el){el.textContent='সব সময়';el.className='sc-trend neu';}});
  } else {
    ['trendSale','trendProfit','trendExp','trendDue'].forEach(id=>{
      const el=window.$(id);if(el){el.textContent='';el.className='sc-trend';}
    });
  }

  // Target
  renderMyTarget();
  if(activeRouteId&&window.allRoutes[activeRouteId]){
    const rc=Object.values(window.allCustomers).filter(c=>c.routeId===activeRouteId);
    const vi=(window._sc.byUid[window.CU?.uid]||[]).filter(s=>s.date===window.today()&&s.routeId===activeRouteId).map(s=>s.shopId);
    window.$('activeRouteBanner').style.display='block';
    window.$('activeRouteName').textContent=window.allRoutes[activeRouteId].name;
    window.$('activeRouteVisits').textContent=rc.filter(c=>!vi.includes(c.id)).length;
  }
  const el=window.$('dashSales');
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
  if(window.CR==='admin') renderMonthProgress();
}

// ── মাসিক progress card
function renderMonthProgress(){
  const el=window.$('dashMonthProgress');if(!el)return;
  const now=new Date();
  const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastDay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const daysPassed=now.getDate();
  const daysLeft=lastDay-daysPassed;
  const monthPct=Math.round(daysPassed/lastDay*100);

  const mSales=Object.values(window.allSales).filter(s=>s.date?.startsWith(monthKey));
  const mExps=Object.values(window.allExpenses).filter(e=>e.date?.startsWith(monthKey));
  const mTotal=mSales.reduce((a,b)=>a+(b.total||0),0);
  const mExp=mExps.reduce((a,b)=>a+(b.amount||0),0);
  const mDue=window._sc.arr.reduce((a,s)=>a+(s.due||0),0);
  const workerCount=Object.values(window.allUsers).filter(u=>u.role==='worker'||u.role==='manager').length;
  const attendedToday=Object.values(window.allAttendance).filter(a=>a.date===window.today()).length;

  el.style.display='block';
  el.innerHTML=`
    <div style="background:var(--card);border-radius:var(--r);padding:13px;
      border:1px solid var(--border-l);box-shadow:var(--shadow-sm);">

      <!-- মাসের progress bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-size:12px;font-weight:700;color:var(--text);">
          📅 window.${now.toLocaleString('bn-BD',{month:'long'})} মাস
        </div>
        <div style="font-size:11px;color:var(--muted);">
          window.${daysLeft===0?'<span style="color:var(--red);font-weight:700;">আজই শেষ দিন!</span>':daysLeft+' দিন বাকি'}
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
          <div style="font-size:13px;font-weight:700;color:var(--blue);">৳window.${mTotal>=1000?Math.round(mTotal/1000)+'K':Math.round(mTotal)}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px;">বিক্রয়</div>
        </div>
        <div style="text-align:center;background:var(--surface);border-radius:8px;padding:7px 4px;">
          <div style="font-size:13px;font-weight:700;color:var(--red);">৳window.${mExp>=1000?Math.round(mExp/1000)+'K':Math.round(mExp)}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px;">খরচ</div>
        </div>
        <div style="text-align:center;background:var(--surface);border-radius:8px;padding:7px 4px;">
          <div style="font-size:13px;font-weight:700;color:${mDue>0?'var(--red)':'var(--green)'};">৳window.${mDue>=1000?Math.round(mDue/1000)+'K':Math.round(mDue)}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px;">বাকি</div>
        </div>
        <div style="text-align:center;background:var(--surface);border-radius:8px;padding:7px 4px;">
          <div style="font-size:13px;font-weight:700;color:${attendedToday<workerCount?'var(--accent)':'var(--green)'};">window.${attendedToday}/window.${workerCount}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px;">উপস্থিত</div>
        </div>
      </div>

      <!-- মাস শেষ সতর্কতা -->
      window.${daysLeft<=2?`<div style="margin-top:10px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);
        border-radius:8px;padding:8px 10px;font-size:11px;color:var(--accent);font-weight:600;">
        ⚠️ মাস শেষ হচ্ছে! বেতন ও রিপোর্টের কাজ সেরে নিন।
      </div>`:''}

    </div>`;
}

// TARGET
function renderMyTarget(){
  const sal=window.allSalaries[window.CU.uid];
  const target=sal?.monthlyTarget||0;
  if(!target)return;
  const now=new Date();
  const mySales=(window._sc.byUid[window.CU?.uid]||[]).filter(s=>{const d=new Date(s.date);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});
  const achieved=mySales.reduce((a,b)=>a+(b.total||0),0);
  const pct=Math.min((achieved/target*100),100).toFixed(0);
  const color=pct>=100?'var(--green)':pct>=60?'var(--accent)':'var(--red)';
  const el=window.$('myTargetCard');
  if(el)el.innerHTML=`<div class="target-card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600">🎯 মাসিক টার্গেট</span><span class="target-pct" style="color:${color}">${pct}%</span></div><div style="font-size:11px;color:var(--muted);margin-top:3px">${bn(achieved)} / ${bn(target)}</div><div class="tbar"><div class="tbar-fill" style="width:${pct}%;background:${color}"></div></div></div>`;
}

// NOTICE BOARD
function renderNoticeBoard(){
  const el=window.$('noticeBoard');if(!el)return;
  const now=Date.now();
  const canManage=(window.CR==='admin'||window.CR==='manager');

  // ✅ মেয়াদ শেষ নোটিশ Firebase থেকে মুছি
  Object.entries(window.allNotices).forEach(([id,n])=>{
    if(n.expiresAt && n.expiresAt < now) window._remove(window._ref(window._db,'notices/'+id));
  });

  const relevant=Object.entries(window.allNotices).filter(([,n])=>{
    if(n.expiresAt && n.expiresAt < now) return false; // মেয়াদ শেষ
    if(n.target==='all')return true;
    if(n.target==='worker'&&window.CR==='worker')return true;
    if(n.target==='manager'&&(window.CR==='manager'||window.CR==='admin'))return true;
    if(window.CR==='admin')return true;
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
      window.${delBtn}
      <div class="nt">📢 window.${n.title}</div>
      <div class="nb">window.${n.body}</div>
      <div class="nd" style="display:flex;gap:8px;align-items:center;margin-top:5px;">
        <span>window.${window.fmtDate(new Date(n.ts).toISOString().split('T')[0])} · window.${n.sentBy||''}</span>
        window.${timeTag}
      </div>
    </div>`;
  }).join('');
}

// ✅ নোটিশ ডিলেট
window.deleteNotice=async(id)=>{
  if(window.CR!=='admin'&&window.CR!=='manager'){window.showToast('অনুমতি নেই!',true);return;}
  await window._remove(window._ref(window._db,'notices/'+id));
  window.showToast('নোটিশ মুছে গেছে');
};

window.sendNotice=async()=>{
  if(window.CR!=='admin'&&window.CR!=='manager'){window.showToast('অনুমতি নেই!',true);return;}
  const title=window.$('noticeTitle').value.trim(),body=window.$('noticeBody').value.trim(),target=window.$('noticeTarget').value;
  if(!title||!body){window.showToast('শিরোনাম ও বার্তা দিন!',true);return;}
  // ✅ মেয়াদ হিসাব
  const expireVal=window.$('noticeExpire')?.value;
  let expiresAt=null;
  if(expireVal&&expireVal!=='never'){
    const hours=parseInt(expireVal);
    expiresAt=Date.now()+(hours*3600000);
  }
  await window._push(window._ref(window._db,'notices'),{title,body,target,sentBy:window.CN,ts:Date.now(),expiresAt});
  window.$('noticeTitle').value='';window.$('noticeBody').value='';
  // ✅ Notification পাঠাই
  if (window.sendNotificationToRole) {
    const role = target==='worker'?'worker':target==='manager'?'manager':'all';
    window.sendNotificationToRole(role, '📢 ' + title, body, 'dash');
  }
  window.showToast('✅ নোটিশ পাঠানো হয়েছে');
};

// ✅ নোটিশ পেজ রেন্ডার
function renderNoticePage(){
  // Admin/Manager না হলে ফর্ম লুকাই
  const form=window.$('noticeCreateForm');
  if(form) form.style.display=(window.CR==='admin'||window.CR==='manager')?'block':'none';

  const list=window.$('noticePageList');
  if(!list)return;
  const now=Date.now();

  // মেয়াদ শেষগুলো মুছি
  Object.entries(window.allNotices).forEach(([id,n])=>{
    if(n.expiresAt&&n.expiresAt<now) window._remove(window._ref(window._db,'notices/'+id));
  });

  const canManage=(window.CR==='admin'||window.CR==='manager');
  const notices=Object.entries(window.allNotices)
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
      window.${canManage?`<button onclick="deleteNotice('${id}')" style="position:absolute;top:10px;right:10px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:7px;color:var(--red);cursor:pointer;font-size:11px;font-weight:700;padding:4px 9px;">✕ মুছুন</button>`:''}
      <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px;padding-right:60px">📢 window.${n.title}</div>
      <div style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:10px">window.${n.body}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <span style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:11px;color:var(--muted)">window.${targetLabel[n.target]||n.target}</span>
        <span style="font-size:11px;color:var(--muted)">👤 window.${n.sentBy||'Admin'}</span>
        <span style="font-size:11px;color:var(--muted)">📅 window.${window.fmtDate(new Date(n.ts).toISOString().split('T')[0])}</span>
        window.${timeTag}
      </div>
    </div>`;
  }).join('');
}

// LATE ALERT
function checkLateAlert(){
  if(window.CR==='worker')return;
  const cutoff=new Date();cutoff.setHours(10,0,0,0);
  const lateToday=Object.values(window.allAttendance).filter(a=>{
    if(a.date!==window.today()||!a.checkIn)return false;
    return new Date(a.checkIn)>cutoff;
  });
  const banner=window.$('lateAlertBanner');
  if(lateToday.length>0&&banner){
    banner.innerHTML=`<div class="warn-box" style="margin-bottom:12px">⚠️ <b>${lateToday.length} জন কর্মী</b> আজ সকাল ১০টার পরে উপস্থিত হয়েছেন: ${lateToday.map(a=>a.name).join(', ')}</div>`;
  }
  // Check 3 late in month
  const now=new Date();
  Object.entries(window.allUsers).filter(([,u])=>u.role==='worker').forEach(([uid,u])=>{
    const monthLate=Object.values(window.allAttendance).filter(a=>{
      if(a.uid!==uid||!a.checkIn)return false;
      const d=new Date(a.date);
      if(d.getMonth()!==now.getMonth()||d.getFullYear()!==now.getFullYear())return false;
      const co=new Date(a.date+'T10:00:00');
      return new Date(a.checkIn)>co;
    });
    if(monthLate.length>=3){
      // Send warning via SMS if configured
      const phone=u.phone||u.waNum;
      if(phone&&window.allSMSConfig?.apiKey){
        const msg=window.allSMSConfig.lateTemplate||'NovaTEch BD: আপনি এই মাসে ৩ বার দেরিতে উপস্থিত হয়েছেন।';
        sendSMSAlphaNet(phone,msg);
      }
    }
  });
}

// SMS
function sendSMSAlphaNet(phone,msg){
  if(!window.allSMSConfig?.apiKey){console.log('SMS Config নেই');return;}
  const num=phone.replace(/\D/g,'');
  const url=`https://api.alphanetkbd.com/api/v2/sending/messages?apikey=${allSMSConfig.apiKey}&msg=${encodeURIComponent(msg)}&to=${num}&from=${allSMSConfig.senderId||'NOVATECH'}`;
  fetch(url).then(r=>r.json()).then(d=>console.log('SMS sent:',d)).catch(e=>console.log('SMS error:',e));
}

window.saveSMSConfig=async()=>{
  const apiKey=window.$('smsApiKey').value.trim(),senderId=window.$('smsSenderId').value.trim();
  const billTemplate=window.$('smsBillTemplate').value,lateTemplate=window.$('smsLateTemplate').value;
  const otpEnabled=window.$('otpToggle').checked;
  await window._set(window._ref(window._db,'smsConfig'),{apiKey,senderId,billTemplate,lateTemplate,otpEnabled,updatedBy:window.CN,ts:Date.now()});
  window.showToast('SMS কনফিগ সেভ ✓');
};
function loadSMSConfig(){
  if(!window.allSMSConfig)return;
  if(window.$('smsApiKey')&&window.allSMSConfig.apiKey)window.$('smsApiKey').value=window.allSMSConfig.apiKey;
  if(window.$('smsSenderId')&&window.allSMSConfig.senderId)window.$('smsSenderId').value=window.allSMSConfig.senderId;
  if(window.$('smsBillTemplate')&&window.allSMSConfig.billTemplate)window.$('smsBillTemplate').value=window.allSMSConfig.billTemplate;
  if(window.$('smsLateTemplate')&&window.allSMSConfig.lateTemplate)window.$('smsLateTemplate').value=window.allSMSConfig.lateTemplate;
  if(window.$('otpToggle'))window.$('otpToggle').checked=window.allSMSConfig.otpEnabled!==false;
  updateOTPStatus();
}
function updateOTPStatus(){
  const on=window.$('otpToggle')?.checked;
  const lbl=window.$('otpStatusLabel');
  if(lbl)lbl.textContent=on?'✅ OTP চালু':'❌ OTP বন্ধ';
  if(lbl)lbl.style.color=on?'var(--green)':'var(--red)';
}

// CUSTOMERS
const BIZ=['ইলেকট্রনিক ও টেলিকম','ইলেকট্রনিক','টেলিকম','মুদি+টেলিকম','অন্যান্য'];
function renderCustomers(){
  const q=(window.$('custSearch')?.value||'').toLowerCase();
  let list=Object.entries(window.allCustomers);
  // কর্মী শুধু তার activeRoute এর কাস্টমার দেখবে
  if(window.CR==='worker'){
    if(activeRouteId)list=list.filter(([,c])=>c.routeId===activeRouteId);
    else if(routeFilter!=='all')list=list.filter(([,c])=>c.routeId===routeFilter);
  } else {
    if(routeFilter!=='all')list=list.filter(([,c])=>c.routeId===routeFilter);
  }
  if(q)list=list.filter(([,c])=>(c.name||'').toLowerCase().includes(q)||(c.owner||'').toLowerCase().includes(q));
  const el=window.$('custList');
  el.innerHTML=list.length?list.map(([id,c])=>{
    const route=window.allRoutes[c.routeId];
    const lastOrder = (window._sc.byShop[id]||[]).sort((a,b)=>(b.ts||0)-(a.ts||0))[0];
    const custDue   = (window._sc.byShop[id]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
    const totalSale = window._sc.totalByShop[id]||0;
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
          window.${c.photoURL?`<img src="${c.photoURL}" style="width:52px;height:52px;object-fit:cover;">`:'🏪'}
        </div>
        <!-- তথ্য -->
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <div style="font-size:14px;font-weight:700;color:var(--text);">window.${c.name}</div>
            window.${custDue>0?`<span style="font-size:10px;background:rgba(239,68,68,.15);color:var(--red);
              border-radius:5px;padding:1px 7px;font-weight:700;">বাকি ${bn(custDue)}</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">
            👤 window.${c.owner||'–'} window.${route?'· 🗺️ '+route.name:''}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:1px;display:flex;gap:10px;flex-wrap:wrap;">
            window.${c.waNum?`<span>📱 ${c.waNum}</span>`:''}
            window.${c.smsNum&&c.smsNum!==c.waNum?`<span>☎️ ${c.smsNum}</span>`:''}
          </div>
        </div>
        <div style="font-size:18px;color:var(--muted);">›</div>
      </div>

      <!-- Stats row -->
      <div style="display:flex;border-top:1px solid var(--border);
        background:var(--surface);">
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:var(--blue);">window.${window.bn(totalSale)}</div>
          <div style="font-size:9px;color:var(--muted);">মোট বিক্রয়</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:${custDue>0?'var(--red)':'var(--green)'};">window.${custDue>0?window.bn(custDue):'পরিষ্কার ✅'}</div>
          <div style="font-size:9px;color:var(--muted);">বাকি</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;">
          <div style="font-size:12px;font-weight:700;color:var(--muted);">window.${lastOrder?window.fmtDate(lastOrder.date):'–'}</div>
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
        window.${custDue>0?`<button onclick="openPayMo('${c.name}',${custDue})"
          style="flex:1;padding:9px 4px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            background:rgba(139,92,246,.1);border:none;border-right:1px solid var(--border);color:var(--purple);">
          💰 বাকি আদায়
        </button>`:''}
        window.${c.waNum?`<button onclick="openWA('${c.waNum}')"
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
  if(window.CR==='worker')return;
  const reqs=Object.entries(window.allRouteRequests||{}).filter(([,r])=>r.status==='pending');
  const body=window.$('routeRequestBody');if(!body)return;
  if(!reqs.length){body.innerHTML='<div class="empty">কোনো আবেদন নেই</div>';return;}
  body.innerHTML=reqs.map(([id,r])=>`
    <div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid var(--border)">
      <div style="font-size:14px;font-weight:600">🗺️ window.${r.name}</div>
      <div style="font-size:12px;color:var(--muted)">আবেদনকারী: window.${r.requestedByName} · window.${window.fmtDate(r.ts)}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button onclick="approveRoute('${id}')" style="flex:1;padding:8px;background:rgba(46,204,138,.2);border:1px solid var(--green);color:var(--green);border-radius:8px;cursor:pointer;font-family:inherit">✅ অনুমোদন</button>
        <button onclick="rejectRoute('${id}')" style="flex:1;padding:8px;background:rgba(232,93,74,.2);border:1px solid var(--red);color:var(--red);border-radius:8px;cursor:pointer;font-family:inherit">❌ বাতিল</button>
      </div>
    </div>`).join('');
}
function renderRouteChips(){
  const el=window.$('routeChips');if(!el)return;
  const canDelete=(window.CR==='admin'||window.CR==='manager');
  el.innerHTML=`<button class="fb ${routeFilter==='all'?'active':''}" onclick="filterByRoute('all',this)">সব</button>`+
    Object.entries(window.allRoutes).map(([id,r])=>`
      <div style="display:inline-flex;align-items:center;gap:2px;margin:3px;">
        <button class="fb ${routeFilter===id?'active':''}" onclick="filterByRoute('${id}',this)" style="border-radius:${canDelete?'18px 0 0 18px':'18px'};margin:0;">🗺️ window.${r.name}</button>
        window.${canDelete?`<button onclick="deleteRoute('${id}','${r.name.replace(/'/g,"\'")}')" style="padding:5px 8px;border:1px solid var(--border);border-left:none;border-radius:0 18px 18px 0;background:rgba(239,68,68,.1);color:var(--red);cursor:pointer;font-size:12px;line-height:1;" title="রুট মুছুন">✕</button>`:''}
      </div>`).join('');
}
window.filterByRoute=(id,btn)=>{routeFilter=id;document.querySelectorAll('#routeChips .fb').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderCustomers();};

// ✅ রুট ডিলেট
window.deleteRoute=async(id,name)=>{
  if(window.CR!=='admin'&&window.CR!=='manager'){window.showToast('অনুমতি নেই!',true);return;}
  // এই রুটে কাস্টমার আছে কিনা দেখি
  const custInRoute=Object.values(window.allCustomers).filter(c=>c.routeId===id);
  if(custInRoute.length>0){
    if(!confirm(`"${name}" রুটে ${custInRoute.length}টি কাস্টমার আছে। রুট মুছলে কাস্টমারগুলো রুটহীন হয়ে যাবে। তবুও মুছবেন?`))return;
  } else {
    if(!confirm(`"${name}" রুটটি মুছে ফেলবেন?`))return;
  }
  await window._remove(window._ref(window._db,'routes/'+id));
  if(routeFilter===id){routeFilter='all';}
  window.showToast(`✅ "${name}" রুট মুছে গেছে`);
  if(typeof window.auditLog==='function') window.auditLog('delete_route',`রুট মুছেছেন: ${name}`);
};

function loadRouteSelects(){
  ['cRoute','todayRoute'].forEach(sid=>{
    const sel=window.$(sid);if(!sel)return;
    const cur=sel.value;
    sel.innerHTML='<option value="">-- রুট --</option>'+Object.entries(window.allRoutes).map(([id,r])=>`<option value="${id}">🗺️ ${r.name}</option>`).join('');
    sel.value=cur;
  });
}
function loadCustomerSelect(){
  const sel=window.$('sShopSel');if(!sel)return;

  // ✅ Active route থাকলে সেই route-এর দোকান আগে
  const allCusts=Object.entries(window.allCustomers);
  let html='<option value="">-- কাস্টমার বেছে নিন --</option>';

  if(activeRouteId){
    const routeName=window.allRoutes[activeRouteId]?.name||'';
    const routeCusts=allCusts.filter(([,c])=>c.routeId===activeRouteId);
    const otherCusts=allCusts.filter(([,c])=>c.routeId!==activeRouteId);

    if(routeCusts.length){
      html+=`<optgroup label="🗺️ ${routeName} রুট (${routeCusts.length}টি)">`;
      html+=routeCusts.map(([id,c])=>`<option value="${id}">${c.name}${c.owner?' · '+c.owner:''}</option>`).join('');
      html+=`</optgroup>`;
    }
    if(otherCusts.length){
      html+=`<optgroup label="অন্যান্য দোকান">`;
      html+=otherCusts.map(([id,c])=>`<option value="${id}">${c.name}${c.owner?' · '+c.owner:''}</option>`).join('');
      html+=`</optgroup>`;
    }
  } else {
    // Route নেই — সব একসাথে
    html+=allCusts.map(([id,c])=>`<option value="${id}">${c.name}${c.owner?' · '+c.owner:''}</option>`).join('');
  }

  html+='<option value="__m__">✏️ ম্যানুয়াল লিখুন</option>';
  sel.innerHTML=html;
}
function loadBroadcastRoutes(){
  const sel=window.$('broadcastTarget');if(!sel)return;
  sel.innerHTML='<option value="all">সকল কাস্টমার</option>'+
    Object.entries(window.allRoutes).map(([id,r])=>`<option value="${id}">🗺️ ${r.name} রুট</option>`).join('');
}

window.getGPS=()=>{
  if(!navigator.geolocation){window.showToast('GPS সাপোর্ট নেই, Map থেকে নিন',true);return;}
  window.showToast('📡 GPS খুঁজছে...');
  navigator.geolocation.getCurrentPosition(
    p=>{
      const lat=p.coords.latitude.toFixed(7);
      const lng=p.coords.longitude.toFixed(7);
      window.$('cLat').value=lat;
      window.$('cLng').value=lng;
      showGPSPreview(lat,lng);
      window.showToast('📍 GPS পাওয়া গেছে ✓');
    },
    err=>{
      let msg='GPS পাওয়া যায়নি';
      if(err.code===1)msg='GPS permission দেননি — Map থেকে নিন';
      else if(err.code===2)msg='GPS signal নেই — Map থেকে নিন';
      window.showToast(msg,true);
    },
    {enableHighAccuracy:true,timeout:10000,maximumAge:0}
  );
};

function showGPSPreview(lat,lng){
  const map=window.$('gpsPreviewMap');
  const frame=window.$('gpsMapFrame');
  const display=window.$('gpsCoordDisplay');
  if(!map||!frame)return;
  frame.src=`https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
  if(display)display.textContent=`✅ লোকেশন: ${lat}, ${lng}`;
  map.style.display='block';
}

window.openGoogleMapPicker=()=>{
  window.$('gpsPickLat').value=window.$('cLat').value||'';
  window.$('gpsPickLng').value=window.$('cLng').value||'';
  window.$('gpsPickPreview').style.display='none';
  openMo('gpsPickerMo');
};

window.previewGPSPick=()=>{
  const lat=parseFloat(window.$('gpsPickLat').value);
  const lng=parseFloat(window.$('gpsPickLng').value);
  if(!lat||!lng||isNaN(lat)||isNaN(lng)){window.showToast('সঠিক Latitude ও Longitude দিন!',true);return;}
  if(lat<20||lat>27){window.showToast('Latitude সঠিক নয় (বাংলাদেশ: 20–27)',true);return;}
  if(lng<88||lng>93){window.showToast('Longitude সঠিক নয় (বাংলাদেশ: 88–93)',true);return;}
  const frame=window.$('gpsPickFrame');
  frame.src=`https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
  window.$('gpsPickPreview').style.display='block';
  window.showToast('প্রিভিউ লোড হচ্ছে...');
};

window.confirmGPSPick=()=>{
  const lat=parseFloat(window.$('gpsPickLat').value);
  const lng=parseFloat(window.$('gpsPickLng').value);
  if(!lat||!lng||isNaN(lat)||isNaN(lng)){window.showToast('Latitude ও Longitude দিন!',true);return;}
  window.$('cLat').value=lat.toFixed(7);
  window.$('cLng').value=lng.toFixed(7);
  showGPSPreview(lat.toFixed(7),lng.toFixed(7));
  closeMo('gpsPickerMo');
  window.showToast('✅ লোকেশন সেট হয়েছে!');
};
window.addCustomer=async()=>{
  const name=window.$('cName').value.trim(),owner=window.$('cOwner').value.trim(),bizType=window.$('cBiz').value,routeId=window.$('cRoute').value;
  if(!name||!owner||!routeId){window.showToast('নাম, মালিক ও রুট দিন!',true);return;}
  window.loader(true);
  try{
    // ছবি আপলোড (থাকলে)
    let photoURL=null;
    if(window._pendingCustPhoto){
      photoURL=await uploadImageToFirebase(window._pendingCustPhoto,'customers');
      window._pendingCustPhoto=null;
    }
    await window._push(window._ref(window._db,'customers'),{
      name,owner,bizType,routeId,
      waNum:window.$('cWa').value.trim(),
      smsNum:window.$('cSms').value.trim(),
      lat:parseFloat(window.$('cLat').value)||null,
      lng:parseFloat(window.$('cLng').value)||null,
      note:window.$('cNote').value.trim(),
      photoURL,
      addedBy:window.CU.uid,addedByName:window.CN,ts:Date.now()
    });
    ['cName','cOwner','cWa','cSms','cLat','cLng','cNote'].forEach(id=>{const el=window.$(id);if(el)el.value='';});
    // photo preview রিসেট
    const prev=window.$('custPhotoPreview'),icon=window.$('custPhotoIcon');
    if(prev){prev.src='';prev.style.display='none';}
    if(icon)icon.style.display='block';
    closeMo('custMo');window.showToast(name+' যোগ হয়েছে ✓');
  }catch(e){window.showToast('সংরক্ষণ ব্যর্থ: '+e.message,true);}
  finally{window.loader(false);}
};
window.addRoute=async()=>{
  const name=window.$('rName').value.trim();
  if(!name){window.showToast('রুটের নাম দিন!',true);return;}
  try{
    if(window.CR==='worker'){
      await window._push(window._ref(window._db,'routeRequests'),{name,desc:window.$('rDesc')?.value.trim()||'',requestedBy:window.CU.uid,requestedByName:window.CN,status:'pending',ts:Date.now()});
      if(window.$('rName'))window.$('rName').value='';
      if(window.$('rDesc'))window.$('rDesc').value='';
      closeMo('routeMo');
      window.showToast('রুটের আবেদন পাঠানো হয়েছে ✓');
    } else {
      const newRef=await window._push(window._ref(window._db,'routes'),{name,desc:window.$('rDesc')?.value.trim()||'',addedBy:window.CU.uid,addedByName:window.CN,status:'active',ts:Date.now()});
      if(window.$('rName'))window.$('rName').value='';
      if(window.$('rDesc'))window.$('rDesc').value='';
      closeMo('routeMo');
      window.showToast('✅ '+name+' রুট যোগ হয়েছে!');
    }
  }catch(err){
    window.showToast('সংরক্ষণ ব্যর্থ: '+err.message,true);
    console.error('Route add error:',err);
  }
};
// ✅ কাস্টমার ডিলেট (Admin ও Manager)
window.deleteCustomer=async(id,name)=>{
  if(window.CR!=='admin'&&window.CR!=='manager'){window.showToast('শুধু Admin ও Manager মুছতে পারবে!',true);return;}
  if(!confirm(`"${name}" কাস্টমারটি সম্পূর্ণ মুছে ফেলবেন?

তার বিক্রয় রেকর্ড থাকবে কিন্তু কাস্টমার তালিকা থেকে সরে যাবে।`))return;
  await window._remove(window._ref(window._db,'customers/'+id));
  closeMo('custDetailMo');
  window.showToast(`✅ "${name}" কাস্টমার মুছে গেছে`);
  if(typeof window.auditLog==='function') window.auditLog('delete_customer',`কাস্টমার মুছেছেন: ${name}`);
};

window.approveRoute=async(id,name)=>{
  const snap=await window._get(window._ref(window._db,'routeRequests/'+id));
  if(!snap.exists())return;
  const d=snap.val();
  await window._push(window._ref(window._db,'routes'),{name:d.name,desc:d.desc||'',addedBy:d.requestedBy,addedByName:d.requestedByName,status:'active',ts:Date.now()});
  await window._update(window._ref(window._db,'routeRequests/'+id),{status:'approved'});
  window.showToast(d.name+' রুট অনুমোদিত ✓');
};
window.rejectRoute=async(id)=>{
  await window._update(window._ref(window._db,'routeRequests/'+id),{status:'rejected'});
  window.showToast('রুট আবেদন বাতিল');
};
window.openWA=num=>window.open('https://wa.me/88'+num.replace(/\D/g,''),'_blank');
window.openMap=(lat,lng)=>window.open(`https://www.google.com/maps?q=${lat},${lng}`,'_blank');

window.viewCustSalesHistory=custId=>{
  const custSales=Object.values(window.allSales).filter(s=>s.shopId===custId).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const cust=window.allCustomers[custId];
  const mo=window.$('custSaleHistoryMo');
  const body=window.$('custSaleHistoryBody');
  if(!mo||!body)return;
  window.$('custSaleHistoryTitle').textContent=(cust?.name||'কাস্টমার')+' — বিক্রয় ইতিহাস';
  body.innerHTML=custSales.length?custSales.map(s=>`
    <div style="background:var(--surface);border-radius:10px;padding:10px;margin-bottom:8px;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;font-weight:600">🛍 window.${s.product}</span>
        <span style="font-size:14px;font-weight:700;color:var(--accent)">window.${window.bn(s.total)}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">
        📅 window.${window.fmtDate(s.date)} · window.${s.qty} পিস · 👤 window.${s.workerName||'–'}
        window.${s.due>0?`<span style="color:var(--red)"> · বাকি: ${bn(s.due)}</span>`:''}
      </div>
    </div>`).join(''):'<div class="empty">কোনো বিক্রয় নেই</div>';
  openMo('custSaleHistoryMo');
};
window.viewCust=id=>{
  const c=window.allCustomers[id];if(!c)return;
  const route=window.allRoutes[c.routeId];
  const cs=Object.values(window.allSales).filter(s=>s.shopId===id).sort((a,b)=>b.ts-a.ts);
  const totalSale=cs.reduce((a,b)=>a+(b.total||0),0);
  const totalDue=cs.reduce((a,b)=>a+(b.due||0),0);
  window.$('cdTitle').textContent='🏪 '+c.name;
  // ✅ Delete বাটন শুধু Admin ও Manager দেখবে
  const delRow=window.$('cdDeleteRow'),delBtn=window.$('cdDeleteBtn');
  if(delRow&&delBtn){
    if(window.CR==='admin'||window.CR==='manager'){
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
          window.${c.photoURL?`<img src="${c.photoURL}" style="width:80px;height:80px;object-fit:cover;border-radius:50%;">`:'🏪'}
        </div>
        window.${(window.CR==='admin'||window.CR==='manager')?`<div onclick="document.getElementById('custEditPhotoInput').click()" style="position:absolute;bottom:0;right:0;background:var(--accent);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid var(--card);cursor:pointer;">📷</div>`:''}
      </div>
      <input type="file" id="custEditPhotoInput" accept="image/*" style="display:none" onchange="updateCustPhoto(this,'${id}')">
      <div style="font-size:16px;font-weight:700;margin-top:8px">window.${c.name}</div>
    </div>`;

  const locationSection=c.lat&&c.lng?`
    <div style="background:var(--card);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:10px;">
      <div style="padding:11px 13px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:600">📍 লোকেশন</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">window.${parseFloat(c.lat).toFixed(5)}, window.${parseFloat(c.lng).toFixed(5)}</div>
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
      window.${(window.CR==='admin'||window.CR==='manager')?`<button onclick="editCustLocation('${id}')" style="margin-top:8px;padding:6px 14px;background:rgba(74,158,255,.15);border:1px solid var(--blue);color:var(--blue);border-radius:8px;font-family:inherit;font-size:12px;cursor:pointer;">+ লোকেশন যোগ করুন</button>`:''}
    </div>`;

  window.$('cdBody').innerHTML=`
    window.${photoSection}
    <div style="background:var(--card);border-radius:10px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;margin-bottom:6px">👤 window.${c.owner||'-'}</div>
      <div style="font-size:13px;margin-bottom:6px">🗺️ রুট: window.${route?route.name:'-'}</div>
      <div style="font-size:13px;margin-bottom:6px">📱 WA: window.${c.waNum||'-'}</div>
      <div style="font-size:13px">📨 SMS: window.${c.smsNum||'-'}</div>
    </div>
    <div class="g2" style="margin-bottom:10px">
      <div class="sum-card c-sale"><div class="lbl">মোট বিক্রয়</div><div class="val" style="font-size:16px">window.${window.bn(totalSale)}</div></div>
      <div class="sum-card c-due"><div class="lbl">বাকি</div><div class="val" style="font-size:16px;color:${totalDue>0?'var(--red)':'var(--green)'}">window.${window.bn(totalDue)}</div></div>
    </div>
    window.${locationSection}
    <div class="sec">সর্বশেষ অর্ডার</div>
    window.${cs.slice(0,5).map(s=>`
      <div class="ec">
        <div class="ei">
          <div class="shop">window.${s.product} × window.${s.qty}</div>
          <div class="prod">👤 window.${s.workerName||''}</div>
          <div class="dt">📅 window.${window.fmtDate(s.date)}</div>
        </div>
        <div class="ea">
          <div class="sale">window.${window.bn(s.total)}</div>
          window.${s.due>0?`<div style="font-size:11px;color:var(--red)">বাকি ${bn(s.due)}</div>`:''}
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
  window.showToast('ছবি আপলোড হচ্ছে...');
  const url=await uploadImageToFirebase(file,'customers');
  if(url){
    await window._update(window._ref(window._db,'customers/'+custId),{photoURL:url});
    window.showToast('✅ দোকানের ছবি আপডেট হয়েছে!');
    // প্রোফাইল রিফ্রেশ
    viewCust(custId);
  }
};

// কাস্টমারের লোকেশন আপডেট
window.editCustLocation=id=>{
  window.$('gpsPickLat').value='';
  window.$('gpsPickLng').value='';
  window.$('gpsPickPreview').style.display='none';
  window._editCustLocationId=id;
  // confirm বাটনের text পরিবর্তন
  const confirmBtn=document.querySelector('#gpsPickerMo button[onclick="confirmGPSPick()"]');
  if(confirmBtn)confirmBtn.textContent='✅ লোকেশন আপডেট করুন';
  openMo('gpsPickerMo');
};

// confirmGPSPick override — কাস্টমার আপডেটের জন্য
const _origConfirmGPS=window.confirmGPSPick;
window.confirmGPSPick=async()=>{
  const lat=parseFloat(window.$('gpsPickLat').value);
  const lng=parseFloat(window.$('gpsPickLng').value);
  if(!lat||!lng||isNaN(lat)||isNaN(lng)){window.showToast('Latitude ও Longitude দিন!',true);return;}
  // কাস্টমার লোকেশন edit mode
  if(window._editCustLocationId){
    await window._update(window._ref(window._db,'customers/'+window._editCustLocationId),{lat,lng});
    window._editCustLocationId=null;
    closeMo('gpsPickerMo');
    window.showToast('✅ লোকেশন আপডেট হয়েছে!');
    return;
  }
  // নতুন কাস্টমার add mode
  window.$('cLat').value=lat.toFixed(7);
  window.$('cLng').value=lng.toFixed(7);
  showGPSPreview(lat.toFixed(7),lng.toFixed(7));
  closeMo('gpsPickerMo');
  window.showToast('✅ লোকেশন সেট হয়েছে!');
};

// SMS BROADCAST
window.openSMSBroadcast=()=>{loadBroadcastRoutes();openMo('smsBroadcastMo');};
window.sendBroadcast=async()=>{
  if(!window.allSMSConfig?.apiKey){window.showToast('SMS API Key সেট করুন!',true);return;}
  const target=window.$('broadcastTarget').value;
  const msg=window.$('broadcastMsg').value.trim();
  if(!msg){window.showToast('বার্তা লিখুন!',true);return;}
  let custs=Object.values(window.allCustomers);
  if(target!=='all')custs=custs.filter(c=>c.routeId===target);
  let sent=0;
  custs.forEach(c=>{
    const num=c.smsNum||c.waNum;
    if(num){sendSMSAlphaNet(num,'NovaTEch BD: '+msg);sent++;}
  });
  window.$('broadcastMsg').value='';closeMo('smsBroadcastMo');
  window.showToast(`${sent} জন কাস্টমারকে SMS পাঠানো হচ্ছে...`);
};

// ROUTE VISIT
window.startRoute=async()=>{
  const rid=window.$('todayRoute').value;if(!rid){window.showToast('রুট বেছে নিন!',true);return;}
  activeRouteId=rid;
  await window._set(window._ref(window._db,'workerStatus/'+window.CU.uid+'/activeRoute'),{routeId:rid,date:window.today(),startedAt:Date.now()});
  // ✅ Customer select refresh করি — route filter যোগ হবে
  loadCustomerSelect();
  window.showToast('রুট শুরু ✓ — এই রুটের দোকান আগে দেখাবে');
  renderVisitList();refreshDash();
};

// ✅ Route select করলেই সবার জন্য ভিজিট তালিকা দেখাও
window.previewRoute = function(rid) {
  if(!rid) { renderVisitList(); return; }
  activeRouteId = rid;
  renderVisitList();
  loadCustomerSelect();
};
function renderVisitList(){
  const el=window.$('visitList');if(!el)return;
  if(!activeRouteId){el.innerHTML='<div class="empty"><div class="ic">🗺️</div>রুট সেট করুন</div>';return;}
  const rc=Object.entries(window.allCustomers).filter(([,c])=>c.routeId===activeRouteId);
  if(!rc.length){el.innerHTML='<div class="empty"><div class="ic">🏪</div>এই রুটে দোকান নেই</div>';return;}
  const vi=(window._sc.byUid[window.CU?.uid]||[]).filter(s=>s.date===window.today()&&s.routeId===activeRouteId).map(s=>s.shopId);
  el.innerHTML=rc.map(([id,c])=>{
    const done=vi.includes(id);
    return`<div class="visit-card"><div class="${done?'vs-done':'vs-pending'}"></div><div style="flex:1"><div style="font-size:13px;font-weight:600">${c.name}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">👤 ${c.owner||''}</div></div><div style="text-align:right">${done?'<span style="color:var(--green);font-size:11px">✓ ভিজিট</span>':`<button style="padding:5px 10px;border:1px solid var(--accent);border-radius:7px;background:rgba(245,166,35,.1);color:var(--accent);font-family:inherit;font-size:11px;cursor:pointer;" onclick="quickVisit('${id}')">📝 বিক্রয়</button>`}${c.lat&&c.lng?`<div style="font-size:10px;color:var(--accent);cursor:pointer;margin-top:3px" onclick="openMap(${c.lat},${c.lng})">📍 ম্যাপ</div>`:''}</div></div>`;
  }).join('');
}
window.quickVisit=id=>{window.$('sShopSel').value=id;sShopSelChange();showPage('sale');};

// SALE
function loadProductSelects(){
  const sel=window.$('sProd');if(!sel)return;
  sel.innerHTML='<option value="">-- প্রোডাক্ট --</option>'+
    Object.entries(window.allProducts).map(([id,p])=>`<option value="${id}" data-sell="${p.sellPrice||0}" data-buy="${p.buyPrice||0}" data-disc="${p.maxDisc||0}">${p.name}</option>`).join('');
}
function sShopSelChange(){window.$('sShopManualRow').style.display=window.$('sShopSel').value==='__m__'?'block':'none';}
window.$('sShopSel')?.addEventListener('change',sShopSelChange);
window.$('sProd')?.addEventListener('change',function(){
  const o=this.options[this.selectedIndex];
  if(o?.dataset.sell){window.$('sSell').value=o.dataset.sell;window.$('maxDiscLabel').textContent=o.dataset.disc||0;window.$('sDisc').max=o.dataset.disc||0;}
  calcSaleSummary();
  updateSMSInfo();
});
['sQty','sSell','sDisc'].forEach(id=>window.$(id)?.addEventListener('input',()=>{calcSaleSummary();updateSMSInfo();}));
window.$('sPay')?.addEventListener('change',function(){window.$('partRow').style.display=this.value==='partial'?'block':'none';});

function updateSMSInfo(){
  const shopId=window.$('sShopSel').value;
  const c=window.allCustomers[shopId];
  const si=window.$('smsInfo');
  if(si)si.style.display=(c?.smsNum&&window.allSMSConfig?.apiKey)?'block':'none';
}

function calcSaleSummary(){
  const qty=parseFloat(window.$('sQty').value)||0,sell=parseFloat(window.$('sSell').value)||0,disc=parseFloat(window.$('sDisc').value)||0;
  const prod=window.allProducts[window.$('sProd').value],buy=prod?(prod.buyPrice||0):0;
  const da=sell*qty*disc/100,total=sell*qty-da,profit=(sell-buy)*qty-da;
  const el=window.$('saleSummary');
  if(!qty||!sell){el.innerHTML='';return;}
  el.innerHTML=`<span style="color:var(--muted)">মোট: </span><b style="color:var(--blue)">${bn(total)}</b>${disc>0?` · <span style="color:var(--muted)">ছাড়: </span><b style="color:var(--red)">window.${window.bn(da)} (window.${disc}%)</b>`:''}${window.CR==='admin'?` · <span style="color:var(--muted)">লাভ: </span><b style="color:var(--green)">window.${window.bn(profit)}</b>`:''}`;
}

// ✅ বিক্রয় হলে Manager/Admin-কে notify করি
function notifySaleToManagers(shop, product, qty, total) {
  try {
    if (!window.sendNotificationTo) return;
    const msg = `${window.CN}: ${shop} — ${product} × ${qty} = ৳${Math.round(total).toLocaleString('bn-BD')}`;
    Object.entries(window.allUsers || {}).forEach(([uid, u]) => {
      if ((u.role === 'admin' || u.role === 'manager') && uid !== window.CU.uid) {
        window.sendNotificationTo(uid, '🛍 নতুন বিক্রয়', msg, 'dash');
      }
    });
  } catch(e) {}
}

// ✅ FIX: বিক্রয়ে কর্মীর স্টক স্বয়ংক্রিয়ভাবে কমানোর ফাংশন
async function deductWorkerStock(uid, prodId, prodName, soldQty) {
  try {
    // কর্মীর বরাদ্দকৃত স্টক খুঁজি যেখানে এখনো বিক্রি হয়নি
    const assigns = Object.entries(window.allStockAssign)
      .filter(([,s]) => s.uid === uid && s.prodId === prodId)
      .sort((a,b) => a[1].ts - b[1].ts); // পুরানো আগে
    let toDeduct = soldQty;
    for (const [key, assign] of assigns) {
      if (toDeduct <= 0) break;
      const currentQty = assign.qty;
      if (currentQty <= 0) continue;
      const deduct = Math.min(currentQty, toDeduct);
      await window._update(window._ref(window._db, 'stockAssign/' + key), { qty: currentQty - deduct, lastSaleDeduct: Date.now() });
      toDeduct -= deduct;
    }
    // গুদামের মোট স্টক থেকেও কমাই (যদি কর্মী ডিরেক্ট বিক্রি করে)
    if (toDeduct > 0) {
      const stocks = Object.entries(window.allStock)
        .filter(([,s]) => s.prodId === prodId && s.qty > 0)
        .sort((a,b) => a[1].ts - b[1].ts);
      for (const [key, stock] of stocks) {
        if (toDeduct <= 0) break;
        const deduct = Math.min(stock.qty, toDeduct);
        await window._update(window._ref(window._db, 'stock/' + key), { qty: stock.qty - deduct });
        toDeduct -= deduct;
      }
    }
  } catch(e) { console.warn('Stock deduct error:', e.message); }
}

window.addSale=async()=>{
  const shopSelVal=window.$('sShopSel').value,shopId=shopSelVal!=='__m__'&&shopSelVal?shopSelVal:null;
  const shop=shopId?(window.allCustomers[shopId]?.name||''):(window.$('sShopManual').value.trim()||'');
  const prodId=window.$('sProd').value,qty=parseFloat(window.$('sQty').value),sell=parseFloat(window.$('sSell').value);
  const disc=parseFloat(window.$('sDisc').value)||0,date=window.$('sDate').value,pay=window.$('sPay').value,part=parseFloat(window.$('sPart').value)||0;
  if(!shop||!prodId||!qty||!sell||!date){window.showToast('সব তথ্য দিন!',true);return;}
  const prod=window.allProducts[prodId];
  if(disc>(prod?.maxDisc||0)){window.showToast(`সর্বোচ্চ ছাড় ${prod?.maxDisc||0}%`,true);return;}
  const da=sell*qty*disc/100,total=Math.round(sell*qty-da);
  const profit=Math.round(((sell-(prod?.buyPrice||0))*qty)-da);

  // ✅ আংশিক পেমেন্ট validation
  if(pay==='partial'){
    if(!part||part<=0){window.showToast('আংশিক পরিমাণ লিখুন!',true);return;}
    if(part>=total){window.showToast('আংশিক পরিমাণ মোটের চেয়ে কম হতে হবে!',true);return;}
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
      const _invoiceSnap = await window._get(window._ref(window._db, 'invoiceCounter'));
      const _lastCount = _invoiceSnap.exists() ? (_invoiceSnap.val() || 0) : 0;
      const _newCount = _lastCount + 1;
      await window._set(window._ref(window._db, 'invoiceCounter'), _newCount);
      invoiceNo = `NTB-${_year}-${String(_newCount).padStart(4,'0')}`;
    } catch(e) {
      invoiceNo = `NTB-OFFLINE-${Date.now().toString().slice(-6)}`;
    }
  }

  const saleData={date,shop,shopId,product:prod.name,productId:prodId,qty,sellPrice:sell,disc,total,profit,payStatus:pay,due,uid:window.CU.uid,workerName:window.CN,routeId:activeRouteId||null,ts:Date.now(),otpConfirmed:false,photoUrl,invoiceNo};
  window._pendingSalePhoto=null;

  const cust=window.allCustomers[shopId];
  const smsNum=cust?.smsNum||cust?.waNum;
  const hasAPI=!!(window.allSMSConfig?.apiKey);
  const otpEnabled=window.allSMSConfig?.otpEnabled!==false; // default true

  // Build bill SMS text
  const billMsg=(window.allSMSConfig?.billTemplate||
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
    const otp=window.genOTP();
    pendingSaleData=saleData;pendingOTP=otp;
    const smsWithOTP=billMsg.replace('{otp_line}','OTP: '+otp+'\nOTP দিয়ে বিল নিশ্চিত করুন।');
    sendSMSAlphaNet(smsNum,smsWithOTP);
    window.$('otpSection').style.display='block';
    window.$('sentOTPDisplay').textContent=otp;
    window.$('otpInput').value='';
    window.showToast('📱 OTP SMS পাঠানো হয়েছে!');
    window.scrollTo(0,(window.$('otpSection').offsetTop||0)-80);
  } else if(smsNum&&hasAPI&&!otpEnabled){
    try {
      const smsNoOTP=billMsg.replace('{otp_line}','আমাদের সাথে যুক্ত হবার জন্য আপনাকে ধন্যবাদ।');
      sendSMSAlphaNet(smsNum,smsNoOTP);
      await window._push(window._ref(window._db,'sales'),{...saleData,otpConfirmed:true,otpSkipped:false,smsSent:true});
      await deductWorkerStock(window.CU.uid,prodId,prod.name,qty);
      notifySaleToManagers(shop,prod.name,qty,total);
      clearSaleForm();window.showToast('✅ বিক্রয় সংরক্ষিত + SMS পাঠানো হয়েছে');renderVisitList();
    } catch(e) {
      // ✅ offline fallback
      await window.saveOfflineSale(saleData);
      clearSaleForm();renderVisitList();
    }
  } else {
    try {
      await window._push(window._ref(window._db,'sales'),saleData);
      await deductWorkerStock(window.CU.uid,prodId,prod.name,qty);
      clearSaleForm();window.showToast('✅ বিক্রয় সংরক্ষিত');renderVisitList();
    } catch(e) {
      // ✅ offline fallback
      await window.saveOfflineSale(saleData);
      clearSaleForm();renderVisitList();
    }
  }
};

window.confirmOTP=async()=>{
  const entered=window.$('otpInput').value.trim();
  if(!entered){window.showToast('OTP লিখুন!',true);return;}
  if(entered===pendingOTP){
    const saleData={...pendingSaleData,otpConfirmed:true};
    await window._push(window._ref(window._db,'sales'),saleData);
    await deductWorkerStock(window.CU.uid,saleData.productId,saleData.product,saleData.qty);
    notifySaleToManagers(saleData.shop,saleData.product,saleData.qty,saleData.total);
    pendingSaleData=null;pendingOTP=null;
    window.$('otpSection').style.display='none';
    clearSaleForm();window.showToast('বিক্রয় OTP নিশ্চিত ✓');renderVisitList();
  }else{
    window.showToast('OTP ভুল! আবার চেষ্টা করুন',true);
  }
};
window.skipOTP=async()=>{
  if(!pendingSaleData)return;
  const saleData={...pendingSaleData,otpConfirmed:false,otpSkipped:true};
  await window._push(window._ref(window._db,'sales'),saleData);
  // ✅ FIX: OTP ছাড়া সংরক্ষণেও স্টক কমাও
  await deductWorkerStock(window.CU.uid,saleData.productId,saleData.product,saleData.qty);
  pendingSaleData=null;pendingOTP=null;
  window.$('otpSection').style.display='none';
  clearSaleForm();window.showToast('বিক্রয় সংরক্ষিত (OTP ছাড়া)');renderVisitList();
};
function clearSaleForm(){
  window.$('sQty').value='';window.$('sSell').value='';window.$('sDisc').value='';window.$('sPart').value='';window.$('saleSummary').innerHTML='';
}
function renderSaleList(){
  let list=window._sc.arr.slice();
  if(window.CR==='worker')list=list.filter(s=>s.uid===window.CU.uid);
  list.sort((a,b)=>(b.ts||0)-(a.ts||0));
  window.$('saleList').innerHTML=list.length?list.map(s=>saleCard(s)).join(''):'<div class="empty"><div class="ic">📭</div>কোনো বিক্রয় নেই</div>';
  // ✅ Admin-এর জন্য delete request section
  const delSec=window.$('deleteReqSection');
  if(delSec) delSec.style.display=window.CR==='admin'?'block':'none';
  if(window.CR==='admin') renderDeleteRequests();
}
function saleCard(s){
  const statusTag=s.otpConfirmed?`<span class="confirmed-tag">✓ OTP নিশ্চিত</span>`:s.otpSkipped?`<span class="pending-tag">OTP ছাড়া</span>`:'';
  const invTag=s.invoiceNo?`<span style="font-size:9px;color:var(--muted);background:var(--surface);padding:1px 6px;border-radius:4px;border:1px solid var(--border);margin-left:4px;">${s.invoiceNo}</span>`:'';
  const saleId=s._id||Object.keys(window.allSales).find(k=>window.allSales[k]===s)||'';
  const invoiceBtn=saleId?`<button onclick="generateInvoice('${saleId}')" style="font-size:10px;padding:3px 8px;background:rgba(59,130,246,.1);border:1px solid var(--blue);color:var(--blue);border-radius:6px;cursor:pointer;font-family:inherit;margin-top:5px;">🧾 Invoice</button>`:'';

  // ✅ Delete বাটন — Admin সরাসরি, Worker/Manager request পাঠাবে
  const deleteBtn = saleId ? (
    window.CR==='admin'
      ? `<button onclick="adminDeleteSale('${saleId}')" style="font-size:10px;padding:3px 8px;background:rgba(239,68,68,.1);border:1px solid var(--red);color:var(--red);border-radius:6px;cursor:pointer;font-family:inherit;margin-top:5px;margin-left:4px;">🗑️ মুছুন</button>`
      : `<button onclick="requestDeleteSale('${saleId}')" style="font-size:10px;padding:3px 8px;background:rgba(245,158,11,.1);border:1px solid var(--accent);color:var(--accent);border-radius:6px;cursor:pointer;font-family:inherit;margin-top:5px;margin-left:4px;">🗑️ মুছতে চাই</button>`
  ) : '';

  return`<div class="ec"><div class="ei">
    <div class="shop">window.${s.shop} window.${invTag}</div>
    <div class="prod">🛍 window.${s.product} × window.${s.qty} পিস window.${s.disc>0?`· ছাড়: ${s.disc}%`:''}</div>
    <div class="dt">📅 window.${window.fmtDate(s.date)} · <span class="wtag">window.${s.workerName||''}</span></div>
    window.${statusTag}
    <div style="display:flex;flex-wrap:wrap;gap:0;">window.${invoiceBtn}window.${deleteBtn}</div>
  </div>
  <div class="ea">
    <div class="sale">window.${window.bn(s.total)}</div>
    window.${window.CR==='admin'?`<div style="font-size:11px;color:var(--green);margin-top:2px">+${bn(s.profit)}</div>`:''}
    window.${s.due>0?`<div class="due-tag">বাকি ${bn(s.due)}</div>`:''}
  </div></div>`;
}

// ══ Dashboard functions → window expose ══
window.refreshDash        = refreshDash;
window.renderCustomers    = renderCustomers;
window.renderRouteRequests= renderRouteRequests;
window.renderNoticeBoard  = renderNoticeBoard;
window.renderVisitList    = renderVisitList;
window.renderSaleList     = renderSaleList;
window.loadCustomerSelect = loadCustomerSelect;
window.loadProductSelects = loadProductSelects;
window.loadRouteSelects   = loadRouteSelects;
window.checkLateAlert     = checkLateAlert;
window.sShopSelChange     = sShopSelChange;
window.calcSaleSummary    = calcSaleSummary;
window.updateOTPStatus    = updateOTPStatus;
