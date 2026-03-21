// ══════════════════════════════════════════════
// ✅ বিক্রয় মুছে ফেলার সিস্টেম
// ══════════════════════════════════════════════

// Admin — সরাসরি delete
window.adminDeleteSale = async function(saleId) {
  const s = window.allSales[saleId]; if(!s) return;
  const confirmed = confirm(
    `⚠️ বিক্রয় মুছবেন?\n\n🏪 ${s.shop}\n📦 ${s.product} × ${s.qty}\n💰 ${Math.round(s.total).toLocaleString('bn-BD')} টাকা\n📅 ${s.date}\n\nএই কাজ ফেরানো যাবে না!`
  );
  if(!confirmed) return;

  try {
    // ✅ Audit log রাখি
    await window._push(window._ref(window._db,'auditLogs'),{
      action:'sale_deleted',
      saleId, saleData:s,
      deletedBy:window.CN, deletedByUid:window.CU.uid,
      role:window.CR, ts:Date.now()
    });
    await window._remove(window._ref(window._db,'sales/'+saleId));
    window.showToast('✅ বিক্রয় মুছে ফেলা হয়েছে');
  } catch(e) {
    window.showToast('মুছতে ব্যর্থ!',true);
  }
};

// Worker/Manager — delete request পাঠানো
window.requestDeleteSale = async function(saleId) {
  const s = window.allSales[saleId]; if(!s) return;

  // নিজের বিক্রয় কিনা check
  if(s.uid !== window.CU.uid && window.CR !== 'manager') {
    window.showToast('শুধু নিজের বিক্রয় মুছতে আবেদন করা যাবে!',true);
    return;
  }

  // কারণ জিজ্ঞেস করি
  const reason = prompt(`বিক্রয় মুছতে চাওয়ার কারণ লিখুন:\n\n🏪 ${s.shop} · ${s.product} × ${s.qty} · ৳${Math.round(s.total).toLocaleString('bn-BD')}`);
  if(!reason || !reason.trim()) { window.showToast('কারণ লিখুন!',true); return; }

  // আগে একই request আছে কিনা
  const existing = Object.values(window.allDeleteRequests||{}).find(r=>r.saleId===saleId&&r.status==='pending');
  if(existing) { window.showToast('এই বিক্রয়ের জন্য আবেদন ইতিমধ্যে আছে!',true); return; }

  await window._push(window._ref(window._db,'deleteRequests'),{
    saleId, saleData:s,
    reason:reason.trim(),
    requestedBy:window.CN, requestedByUid:window.CU.uid,
    role:window.CR, status:'pending',
    ts:Date.now(), date:window.today()
  });

  // Admin-কে notification
  Object.entries(window.allUsers||{}).forEach(([uid,u])=>{
    if(u.role==='admin' && uid!==window.CU.uid && window.sendNotificationTo)
      window.sendNotificationTo(uid,'🗑️ বিক্রয় মুছার আবেদন',
        `${window.CN}: ${s.shop} — ${s.product} (${reason.trim().slice(0,30)})`, 'sale');
  });
  window.showToast('✅ আবেদন পাঠানো হয়েছে — Admin অনুমোদন করবে');
};

// Admin — request অনুমোদন
window.approveDeleteRequest = async function(reqId) {
  const req = window.allDeleteRequests[reqId]; if(!req) return;
  const confirmed = confirm(`✅ অনুমোদন করবেন?\n\n🏪 ${req.saleData?.shop}\n📦 ${req.saleData?.product} × ${req.saleData?.qty}\n👤 আবেদনকারী: ${req.requestedBy}\n💬 কারণ: ${req.reason}`);
  if(!confirmed) return;
  try {
    await window._push(window._ref(window._db,'auditLogs'),{
      action:'sale_deleted_approved',
      saleId:req.saleId, saleData:req.saleData,
      deletedBy:window.CN, requestedBy:req.requestedBy,
      reason:req.reason, ts:Date.now()
    });
    await window._remove(window._ref(window._db,'sales/'+req.saleId));
    await window._update(window._ref(window._db,'deleteRequests/'+reqId),{status:'approved',approvedBy:window.CN,approvedAt:Date.now()});
    // কর্মীকে জানাই
    if(window.sendNotificationTo)
      window.sendNotificationTo(req.requestedByUid,'✅ বিক্রয় মুছার অনুমোদন',
        `${req.saleData?.shop} — ${req.saleData?.product} মুছে ফেলা হয়েছে।`,'sale');
    window.showToast('✅ বিক্রয় মুছে অনুমোদন দেওয়া হয়েছে');
  } catch(e){ window.showToast('ব্যর্থ!',true); }
};

// Admin — request বাতিল
window.rejectDeleteRequest = async function(reqId) {
  const req = window.allDeleteRequests[reqId]; if(!req) return;
  await window._update(window._ref(window._db,'deleteRequests/'+reqId),{status:'rejected',rejectedBy:window.CN,rejectedAt:Date.now()});
  if(window.sendNotificationTo)
    window.sendNotificationTo(req.requestedByUid,'❌ বিক্রয় মুছার আবেদন বাতিল',
      `${req.saleData?.shop} — ${req.saleData?.product} মুছার আবেদন বাতিল করা হয়েছে।`,'sale');
  window.showToast('আবেদন বাতিল করা হয়েছে');
};

// Delete requests render — Admin এর জন্য
function renderDeleteRequests() {
  const el = document.getElementById('deleteRequestList'); if(!el) return;
  const pending = Object.entries(window.allDeleteRequests||{})
    .filter(([,r])=>r.status==='pending')
    .sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));
  if(!pending.length){ el.innerHTML='<div class="empty">কোনো আবেদন নেই</div>'; return; }
  el.innerHTML = pending.map(([id,r])=>`
    <div style="background:var(--card);border:1px solid var(--border-l);border-radius:12px;padding:12px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <div style="font-size:13px;font-weight:700;">🗑️ window.${r.saleData?.shop||'–'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">
            📦 window.${r.saleData?.product} × window.${r.saleData?.qty} · ৳window.${Math.round(r.saleData?.total||0).toLocaleString('bn-BD')}
          </div>
          <div style="font-size:11px;color:var(--muted);">📅 window.${r.saleData?.date||''} · 👤 window.${r.requestedBy||''}</div>
          <div style="font-size:11px;color:var(--accent);margin-top:3px;">💬 কারণ: window.${r.reason||''}</div>
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
  const date=window.$('eDate').value,type=window.$('eType').value,amount=parseFloat(window.$('eAmt').value);
  if(!date||!amount){window.showToast('তথ্য দিন!',true);return;}
  const status=(window.CR==='worker'&&amount>250)?'pending':'approved';
  const expData={date,type,amount,note:window.$('eNote').value.trim(),uid:window.CU.uid,workerName:window.CN,status,ts:Date.now()};
  try {
    await window._push(window._ref(window._db,'expenses'),expData);
    window.$('eAmt').value='';window.$('eNote').value='';
    window.showToast(status==='pending'?'খরচ আবেদন পাঠানো হয়েছে (অনুমোদন লাগবে) ✓':'খরচ সংরক্ষিত ✓');
  } catch(e) {
    // ✅ offline fallback
    await window.saveOfflineExpense(expData);
    window.$('eAmt').value='';window.$('eNote').value='';
  }
};
window.approveExpense=async(id)=>{
  const exp=window.allExpenses[id];
  await window._update(window._ref(window._db,'expenses/'+id),{status:'approved',approvedBy:window.CN,approvedAt:Date.now()});
  if(exp?.uid && window.sendNotificationTo)
    window.sendNotificationTo(exp.uid,'✅ খরচ অনুমোদিত',
      `আপনার "${exp.type}" খরচ (৳${Math.round(exp.amount||0)}) অনুমোদন করা হয়েছে।`,'exp');
  window.showToast('খরচ অনুমোদিত ✓');
};
window.rejectExpense=async(id)=>{
  const exp=window.allExpenses[id];
  await window._update(window._ref(window._db,'expenses/'+id),{status:'rejected',rejectedBy:window.CN,rejectedAt:Date.now()});
  if(exp?.uid && window.sendNotificationTo)
    window.sendNotificationTo(exp.uid,'❌ খরচ বাতিল',
      `আপনার "${exp.type}" খরচের আবেদন বাতিল করা হয়েছে।`,'exp');
  window.showToast('খরচ বাতিল');
};
function renderExpList(){
  let list=Object.entries(window.allExpenses);
  if(window.CR==='worker')list=list.filter(([,e])=>e.uid===window.CU.uid);
  list.sort(([,a],[,b])=>(b.ts||0)-(a.ts||0));
  window.$('expList').innerHTML=list.length?list.map(([id,e])=>{
    const isPending=e.status==='pending';
    const canApprove=(window.CR==='admin'||window.CR==='manager')&&isPending;
    return `<div class="ec" style="${isPending?'border-left:3px solid var(--accent)':''}">
      <div class="ei">
        <div class="shop">window.${e.type} window.${isPending?'<span style="font-size:10px;background:var(--accent);color:#000;border-radius:4px;padding:1px 5px">অপেক্ষমান</span>':''}</div>
        <div class="prod">window.${e.note||''} · <span class="wtag">window.${e.workerName||''}</span></div>
        <div class="dt">📅 window.${window.fmtDate(e.date)}</div>
      </div>
      <div class="ea">
        <div class="sale" style="color:var(--red)">window.${window.bn(e.amount)}</div>
        window.${canApprove?`<div style="display:flex;gap:4px;margin-top:4px">
          <button onclick="approveExpense('${id}')" style="font-size:10px;padding:3px 7px;background:rgba(46,204,138,.2);border:1px solid var(--green);color:var(--green);border-radius:5px;cursor:pointer">✅</button>
          <button onclick="rejectExpense('${id}')" style="font-size:10px;padding:3px 7px;background:rgba(232,93,74,.2);border:1px solid var(--red);color:var(--red);border-radius:5px;cursor:pointer">❌</button>
        </div>`:''}
      </div>
    </div>`;
  }).join(''):'<div class="empty"><div class="ic">💸</div>কোনো খরচ নেই</div>';
}

// ALLOWANCE
function renderMyAllowance(){
  const t=window.today();
  const my=Object.values(window.allAllowances).filter(a=>a.uid===window.CU.uid&&a.from<=t&&a.to>=t);
  window.$('myAllowance').innerHTML=my.length?my.map(a=>`<div class="al-card"><div style="font-size:13px;font-weight:600">${a.type} ভাতা</div><div style="font-size:11px;color:var(--muted);margin-top:2px">📅 ${fmtDate(a.from)} – ${fmtDate(a.to)}</div><div style="font-size:18px;font-weight:700;color:var(--green);margin-top:3px">${bn(a.amount)}/দিন</div></div>`).join(''):'<div class="empty">আজকের ভাতা নেই</div>';
}
function loadAllWorkerSelects(){
  ['alWorker','salWorker','asWorker','teamLeader','addTeamMember','addTeamSel'].forEach(sid=>{
    const sel=window.$(sid);if(!sel)return;
    if(sid==='addTeamSel'){
      sel.innerHTML='<option value="">-- টিম --</option>'+Object.entries(window.allTeams).map(([id,t])=>`<option value="${id}">${t.name}</option>`).join('');
      return;
    }
    sel.innerHTML='<option value="">-- বেছে নিন --</option>'+
      Object.entries(window.allUsers).filter(([,u])=>u.role==='worker'||u.role==='manager').map(([uid,u])=>`<option value="${uid}">${u.name} (${u.role==='worker'?'কর্মী':'ম্যানেজার'})</option>`).join('');
  });
}
window.addAllowance=async()=>{
  const uid=window.$('alWorker').value,type=window.$('alType').value,from=window.$('alFrom').value,to=window.$('alTo').value,amount=parseFloat(window.$('alAmt').value);
  if(!uid||!from||!to||!amount){window.showToast('তথ্য দিন!',true);return;}
  await window._push(window._ref(window._db,'allowances'),{uid,type,from,to,amount,workerName:window.allUsers[uid]?.name,ts:Date.now()});
  window.$('alAmt').value='';window.showToast('ভাতা সংরক্ষিত ✓');
};
function renderAllowList(){
  const list=Object.entries(window.allAllowances).sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));
  window.$('allowList').innerHTML=list.length?list.map(([id,a])=>`<div class="al-card" style="display:flex;justify-content:space-between"><div><div style="font-size:13px;font-weight:600">👤 ${a.workerName||''}</div><div style="font-size:11px;color:var(--muted)">🚗 ${a.type} · ${fmtDate(a.from)} – ${fmtDate(a.to)}</div><div style="font-size:17px;font-weight:700;color:var(--green)">${bn(a.amount)}/দিন</div></div><button class="del-btn" onclick="delAllow('${id}')">মুছুন</button></div>`).join(''):'<div class="empty">নেই</div>';
}
window.delAllow=async id=>{if(!confirm('মুছবেন?'))return;await window._remove(window._ref(window._db,'allowances/'+id));};

// DUE
function renderDue(){
  // সকল বাকি — কর্মীও সব দেখবে
  const dm={};
  Object.values(window.allSales).forEach(s=>{
    if(s.due>0){
      if(!dm[s.shop])dm[s.shop]={total:0,workers:new Set(),custId:s.shopId};
      dm[s.shop].total+=s.due;
      if(s.workerName)dm[s.shop].workers.add(s.workerName);
    }
  });
  const canPay=true; // ✅ কর্মীরাও পেমেন্ট গ্রহণ করতে পারবে
  window.$('dueList').innerHTML=Object.keys(dm).length?Object.keys(dm).map(shop=>{
    const d=dm[shop];
    const cust=d.custId?window.allCustomers[d.custId]:null;
    const custInfo=cust?`<div style="font-size:11px;color:var(--muted);margin-top:2px">📱 ${cust.waNum||cust.smsNum||'–'} ${cust.owner?'· '+cust.owner:''}</div>`:'';
    const workerInfo=`<div style="font-size:11px;color:var(--blue);margin-top:2px">👤 ${[...d.workers].join(', ')||'–'}</div>`;
    return `<div class="due-card">
      <div style="font-size:14px;font-weight:600">🏪 window.${shop}</div>
      window.${custInfo}window.${workerInfo}
      <div style="font-size:20px;font-weight:700;color:var(--purple);margin:4px 0">window.${window.bn(d.total)}</div>
      <button class="pay-btn" onclick="openPayMo('${shop}',${d.total})">💰 পেমেন্ট গ্রহণ</button>
    </div>`;
  }).join(''):'<div class="empty" style="margin-top:40px"><div class="ic">🎉</div>কোনো বাকি নেই!</div>';
  // কর্মীর নিজের বাকির সারসংক্ষেপ
  const myDueEl=window.$('myDueSummary');
  if(myDueEl&&window.CR==='worker'){
    const myDue=(window._sc.byUid[window.CU?.uid]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
    myDueEl.innerHTML=myDue>0?`<div style="background:rgba(232,93,74,.1);border:1px solid var(--red);border-radius:10px;padding:12px;margin-bottom:12px"><div style="font-size:13px;font-weight:600;color:var(--red)">⚠️ আমার দেওয়া বাকি: ${bn(myDue)}</div><div style="font-size:11px;color:var(--muted);margin-top:4px">এই বাকি তোলা না হলে কমিশন যোগ হবে না</div></div>`:'';
  }
}
window.openPayMo=(shop,due)=>{payShop=shop;window.$('pmShop').value=shop;window.$('pmDue').value=due;window.$('pmPay').value='';openMo('payMo');};
window.collectPay=async()=>{
  const pay=parseFloat(window.$('pmPay').value);
  if(!pay||pay<=0){window.showToast('পরিমাণ লিখুন!',true);return;}

  // ✅ মোট বাকি বের করি
  const totalDue=Object.values(window.allSales)
    .filter(s=>s.shop===payShop&&s.due>0)
    .reduce((a,s)=>a+s.due,0);
  if(pay>totalDue){
    window.showToast(`সর্বোচ্চ ${bn(totalDue)} পরিশোধ করা যাবে!`,true);return;
  }

  let rem=pay;const updates={};
  const paidSaleIds=[];
  Object.entries(window.allSales).forEach(([id,s])=>{
    if(s.shop===payShop&&s.due>0&&rem>0){
      const r=Math.min(s.due,rem);
      const newDue=Math.round(s.due-r);
      updates['sales/'+id+'/due']=newDue;
      // ✅ বাকি শূন্য হলে payStatus 'paid' করি
      if(newDue===0) updates['sales/'+id+'/payStatus']='paid';
      // ✅ কে পেমেন্ট নিলো রেকর্ড করি
      updates['sales/'+id+'/lastPayBy']=window.CN;
      updates['sales/'+id+'/lastPayRole']=window.CR;
      updates['sales/'+id+'/lastPayAt']=Date.now();
      paidSaleIds.push(id);
      rem-=r;
    }
  });
  // ✅ পেমেন্ট লগ — কোন কোন sale-এর বাকি আদায় হলো সেটা save
  await window._push(window._ref(window._db,'paymentLogs'),{
    shop:payShop, amount:pay, collectedBy:window.CN,
    collectedByUid:window.CU.uid, role:window.CR,
    saleIds:paidSaleIds,
    ts:Date.now(), date:window.today()
  });
  await window._update(window._ref(window._db),updates);
  // পেমেন্ট গ্রহণের notification — বিক্রয়কারী কর্মীদের জানাই
  if(window.sendNotificationTo){
    const notifiedWorkers=new Set();
    paidSaleIds.forEach(sid=>{
      const s=window.allSales[sid];
      if(s?.uid && s.uid!==window.CU.uid && !notifiedWorkers.has(s.uid)){
        notifiedWorkers.add(s.uid);
        window.sendNotificationTo(s.uid,'💰 পেমেন্ট গ্রহণ',
          `${payShop} থেকে ৳${Math.round(pay).toLocaleString('bn-BD')} পেমেন্ট নেওয়া হয়েছে।`,'due');
      }
    });
  }
  closeMo('payMo');
  window.showToast('✅ পেমেন্ট গ্রহণ হয়েছে — '+window.bn(pay));
  // ✅ পেমেন্ট Receipt দেখাই
  showPaymentReceipt(payShop, pay, paidSaleIds);
};

// ✅ পেমেন্ট Receipt দেখানো
function showPaymentReceipt(shop, amount, saleIds) {
  const ic=window.$('invoiceContent');if(!ic)return;
  const now=new Date();
  const timeStr=now.toLocaleString('bn-BD',{hour:'2-digit',minute:'2-digit',hour12:true});
  const dateStr=now.toISOString().split('T')[0];

  // কোন কোন বিক্রয়ের বাকি পরিশোধ হলো
  const relatedSales=saleIds.map(id=>window.allSales[id]).filter(Boolean);
  const salesHTML=relatedSales.map(s=>`
    <div style="display:flex;justify-content:space-between;font-size:11px;
      padding:4px 0;border-bottom:1px dashed #e2e8f0;color:#64748b;">
      <span>window.${s.product} × window.${s.qty} (window.${window.fmtDate(s.date)})</span>
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
        <div style="font-size:15px;font-weight:800;letter-spacing:1px;">window.${receiptNo}</div>
      </div>
    </div>

    <!-- দোকান ও তারিখ -->
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;
      background:#f8fafc;border-radius:8px;padding:10px 12px;">
      <div>
        <div style="font-size:10px;color:#64748b;margin-bottom:2px;">দোকান</div>
        <div style="font-weight:700;font-size:14px;">window.${shop}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#64748b;margin-bottom:2px;">তারিখ ও সময়</div>
        <div style="font-weight:600;font-size:12px;">window.${window.fmtDate(dateStr)}</div>
        <div style="font-size:10px;color:#94a3b8;">window.${timeStr}</div>
      </div>
    </div>

    <!-- সম্পর্কিত বিক্রয় -->
    window.${relatedSales.length?`<div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-size:10px;color:#64748b;font-weight:700;margin-bottom:6px;text-transform:uppercase;">আদায়কৃত বিক্রয়</div>
      window.${salesHTML}
    </div>`:''}

    <!-- মোট আদায় -->
    <div style="background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:10px;
      padding:14px;text-align:center;margin-bottom:10px;">
      <div style="font-size:11px;color:#065f46;margin-bottom:4px;">মোট আদায়কৃত পরিমাণ</div>
      <div style="font-size:28px;font-weight:800;color:#059669;">window.${window.bn(amount)}</div>
      <div style="font-size:11px;color:#6ee7b7;margin-top:2px;">✅ সম্পূর্ণ পরিশোধ</div>
    </div>

    <!-- আদায়কারী -->
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;
      padding:8px 0;border-top:1px solid #e2e8f0;margin-bottom:8px;">
      <span>👤 আদায়কারী: <b>window.${window.CN}</b></span>
      <span>🔐 window.${window.CR==='admin'?'অ্যাডমিন':window.CR==='manager'?'ম্যানেজার':'কর্মী'}</span>
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
  if(window.CR==='worker'){ section.style.display='none'; return; }
  section.style.display='block';

  const todayStr = window.today();

  // Manager হলে শুধু তার টিমের কর্মী
  let allowedUids = null;
  if(window.CR==='manager'){
    const myTeam=Object.values(window.allTeams||{}).find(t=>t.leaderId===window.CU?.uid);
    if(myTeam?.members?.length) allowedUids=new Set(myTeam.members);
  }

  // সব worker/manager status বের করি
  const workerEntries = Object.entries(window.allUsers||{})
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
    const status=window.allWorkerStatus[uid]?.activeRoute;
    const isToday=status?.date===todayStr;
    const route=isToday?window.allRoutes[status?.routeId]:null;

    // এই route-এ আজ কতটা ভিজিট হয়েছে
    const visitCount=isToday?(window._sc.byUid[uid]||[]).filter(s=>s.date===todayStr&&s.routeId===status?.routeId).length:0;
    const totalShops=isToday?Object.values(window.allCustomers||{}).filter(c=>c.routeId===status?.routeId).length:0;

    // Check-in status
    const todayAtt=Object.values(window.allAttendance||{}).find(a=>a.uid===uid&&a.date===todayStr);
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
          window.${u.photoURL?`<img src="${u.photoURL}" style="width:44px;height:44px;object-fit:cover;">`:'👤'}
        </div>
        <div style="position:absolute;bottom:1px;right:1px;width:10px;height:10px;
          background:window.${isCheckedIn?'var(--green)':isToday?'var(--accent)':'var(--muted)'};
          border-radius:50%;border:2px solid var(--card);"></div>
      </div>

      <!-- তথ্য -->
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;">window.${u.name}</div>
        window.${isToday&&route?`
          <div style="font-size:11px;color:var(--blue);font-weight:600;margin-top:2px;">
            🗺️ window.${route.name}
            window.${startTime?`<span style="color:var(--muted);font-weight:400;"> · শুরু ${startTime}</span>`:''}
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px;">
            ✅ window.${visitCount}/window.${totalShops} ভিজিট সম্পন্ন
          </div>
        `:`<div style="font-size:11px;color:var(--muted);margin-top:2px;">
          window.${isCheckedIn?'চেক-ইন আছে কিন্তু রুট শুরু করেনি':'আজ রুট শুরু করেনি'}
        </div>`}
      </div>

      <!-- Progress -->
      window.${isToday&&totalShops>0?`
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:16px;font-weight:800;color:${visitCount>=totalShops?'var(--green)':'var(--accent)'};">
            window.${Math.round(visitCount/totalShops*100)}%
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
  const prodId=window.$('stProd').value,qty=parseInt(window.$('stQty').value),date=window.$('stDate').value;
  if(!prodId||!qty||!date){window.showToast('তথ্য দিন!',true);return;}
  await window._push(window._ref(window._db,'stock'),{prodId,prodName:window.allProducts[prodId].name,qty,date,note:window.$('stNote').value.trim(),addedBy:window.CU.uid,addedByName:window.CN,ts:Date.now()});
  window.$('stQty').value='';window.$('stNote').value='';window.showToast('স্টক যোগ ✓');
};
window.assignStock=async()=>{
  const uid=window.$('asWorker').value,prodId=window.$('asProd').value,qty=parseInt(window.$('asQty').value);
  if(!uid||!prodId||!qty){window.showToast('তথ্য দিন!',true);return;}
  const ti=Object.values(window.allStock).filter(s=>s.prodId===prodId).reduce((a,b)=>a+b.qty,0);
  const ta=Object.values(window.allStockAssign).filter(s=>s.prodId===prodId).reduce((a,b)=>a+b.qty,0);
  if(qty>(ti-ta)){window.showToast(`মাত্র ${ti-ta} পিস আছে!`,true);return;}
  const prodName=window.allProducts[prodId].name;
  await window._push(window._ref(window._db,'stockAssign'),{uid,workerName:window.allUsers[uid]?.name,prodId,prodName,qty,date:window.today(),assignedBy:window.CN,ts:Date.now()});
  if(window.sendNotificationTo)
    window.sendNotificationTo(uid,'📦 স্টক বরাদ্দ',
      `আপনাকে ${prodName} — ${qty} পিস বরাদ্দ দেওয়া হয়েছে।`,'stock');
  window.$('asQty').value='';window.showToast('বরাদ্দ ✓');
};
function renderStock(){
  // Worker এর জন্য stock assign ফর্ম লুকাও
  const stockAssignForm=window.$('stockAssignForm');
  if(stockAssignForm)stockAssignForm.style.display=(window.CR==='worker'?'none':'block');
  const af=window.$('stockAddForm'),asf=window.$('stockAssignForm');
  if(af)af.style.display=window.CR==='worker'?'none':'block';
  if(asf)asf.style.display=window.CR==='worker'?'none':'block';
  // Load selects
  ['stProd','asProd'].forEach(sid=>{const sel=window.$(sid);if(!sel)return;sel.innerHTML='<option value="">-- প্রোডাক্ট --</option>'+Object.entries(window.allProducts).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('');});
  const pm={};
  Object.values(window.allProducts).forEach(p=>{pm[p.name]={in:0,assigned:0,sold:0,available:0};});

  // গুদামে মোট আসা
  Object.values(window.allStock).forEach(s=>{
    if(!pm[s.prodName])pm[s.prodName]={in:0,assigned:0,sold:0,available:0};
    pm[s.prodName].in+=s.qty||0;
  });

  // মোট বিক্রয়
  Object.values(window.allSales).forEach(s=>{
    if(!pm[s.product])pm[s.product]={in:0,assigned:0,sold:0,available:0};
    pm[s.product].sold+=s.qty||0;
  });

  // কর্মীদের বর্তমান বরাদ্দ (বিক্রয় বাদ দিয়ে নয়, raw assign)
  Object.values(window.allStockAssign).forEach(s=>{
    if(!pm[s.prodName])pm[s.prodName]={in:0,assigned:0,sold:0,available:0};
    pm[s.prodName].assigned+=s.qty||0;
  });

  // ✅ গুদামে প্রকৃত মজুদ = মোট আসা - মোট বিক্রয়
  Object.values(pm).forEach(p=>{
    p.available=Math.max(0, p.in - p.sold);
  });

  window.$('stockSummary').innerHTML=Object.entries(pm).map(([name,s])=>{
    const low=s.available<=5&&s.in>0;
    return`<div class="stock-card${low?' low':''}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:13px;font-weight:600">📦 window.${name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">
            আসা: window.${s.in} · বিক্রয়: window.${s.sold} · বিতরণ: window.${s.assigned}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:26px;font-weight:700;color:${low?'var(--red)':'var(--green)'};">window.${s.available}</div>
          <div style="font-size:10px;color:var(--muted)">গুদামে</div>
        </div>
      </div>
      window.${low?'<div style="font-size:11px;color:var(--red);margin-top:5px">⚠️ স্টক কম!</div>':''}
    </div>`;
  }).join('')||'<div class="empty">স্টক নেই</div>';
  const we=window.$('workerStockList');if(!we)return;
  if(window.CR==='worker'){
    const ma={};
    Object.values(window.allStockAssign).filter(s=>s.uid===window.CU.uid).forEach(s=>{ma[s.prodName]=(ma[s.prodName]||0)+s.qty;});
    Object.values(window.allSales).filter(s=>s.uid===window.CU.uid).forEach(s=>{if(ma[s.product])ma[s.product]-=s.qty;});
    we.innerHTML=Object.entries(ma).length?Object.entries(ma).map(([n,q])=>`<div class="al-card"><div style="font-size:13px;font-weight:600">📦 ${n}</div><div style="font-size:22px;font-weight:700;color:${q<=2?'var(--red)':'var(--green)'};margin:4px 0">${q} পিস</div></div>`).join(''):'<div class="empty">আপনার কাছে স্টক নেই</div>';
  }else{
    const wm={};
    Object.values(window.allStockAssign).forEach(s=>{if(!wm[s.workerName])wm[s.workerName]={};wm[s.workerName][s.prodName]=(wm[s.workerName][s.prodName]||0)+s.qty;});
    Object.values(window.allSales).forEach(s=>{if(s.workerName&&wm[s.workerName]&&wm[s.workerName][s.product])wm[s.workerName][s.product]-=s.qty;});
    we.innerHTML=Object.entries(wm).length?Object.entries(wm).map(([wn,prods])=>`<div class="al-card"><div style="font-size:13px;font-weight:600">👤 ${wn}</div>${Object.entries(prods).map(([pn,q])=>`<div style="display:flex;justify-content:space-between;margin-top:5px;padding:5px 8px;background:var(--surface);border-radius:7px;"><span style="font-size:12px">📦 window.${pn}</span><span style="font-size:13px;font-weight:700;color:${q<=2?'var(--red)':'var(--green)'}"> window.${q} পিস</span></div>`).join('')}</div>`).join(''):'<div class="empty">কোনো বরাদ্দ নেই</div>';
  }
}

// ATTENDANCE
window.checkIn=async()=>{
  const existing=Object.entries(window.allAttendance).find(([,a])=>a.uid===window.CU.uid&&a.date===window.today());
  if(existing){window.showToast('আজ ইতিমধ্যে চেক-ইন হয়েছে!',true);return;}
  const now=Date.now();
  const cutoff=new Date();cutoff.setHours(10,0,0,0);
  const isLate=now>cutoff.getTime();
  await window._push(window._ref(window._db,'attendance'),{uid:window.CU.uid,name:window.CN,date:window.today(),checkIn:now,checkOut:null,isLate,ts:now});
  window.showToast(isLate?'চেক-ইন ✓ (দেরিতে)':'চেক-ইন ✓');
};
window.checkOut=async()=>{
  const existing=Object.entries(window.allAttendance).find(([,a])=>a.uid===window.CU.uid&&a.date===window.today());
  if(!existing){window.showToast('আগে চেক-ইন করুন!',true);return;}
  const [,attData]=existing;
  if(!attData.checkIn){window.showToast('আগে চেক-ইন করুন!',true);return;}
  const [id,att]=existing;
  if(att.checkOut){window.showToast('ইতিমধ্যে চেক-আউট!',true);return;}
  const checkOut=Date.now();
  const hours=(checkOut-att.checkIn)/3600000;
  const sal=window.allSalaries[window.CU.uid];
  // Use shift end time to determine OT
  const shiftEnd=sal?.shiftEnd||'17:50';
  const [eh,em]=shiftEnd.split(':').map(Number);
  const todayShiftEnd=new Date();todayShiftEnd.setHours(eh,em,0,0);
  const isOT=checkOut>todayShiftEnd.getTime();
  const otHours=isOT?((checkOut-todayShiftEnd.getTime())/3600000).toFixed(2):0;
  await window._update(window._ref(window._db,'attendance/'+id),{checkOut,totalHours:hours.toFixed(2),isOT,otHours,otApproved:false});
  window.showToast(`চেক-আউট ✓ (${hours.toFixed(1)} ঘণ্টা)${isOT?` · ওভারটাইম: window.${otHours} ঘণ্টা (অনুমোদন লাগবে)`:''}`);
};
function renderAttendance(){
  const asd=window.$('attStatusDisplay');
  if(asd){
    const td=Object.values(window.allAttendance).find(a=>a.uid===window.CU.uid&&a.date===window.today());
    if(!td)asd.innerHTML='<div style="font-size:13px;color:var(--muted)">আজ চেক-ইন হয়নি</div>';
    else if(!td.checkOut)asd.innerHTML=`<div style="font-size:13px;color:var(--green);font-weight:600">✅ কাজে আছেন ${td.isLate?'<span style="color:var(--red)">(দেরিতে)</span>':''}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">চেক-ইন: ${fmtTime(td.checkIn)}</div>`;
    else asd.innerHTML=`<div style="font-size:13px;color:var(--muted)">আজকের কাজ শেষ (${td.totalHours} ঘণ্টা)</div>`;
  }
  const ml=window.$('myAttList');
  if(ml){
    const myList=Object.values(window.allAttendance).filter(a=>a.uid===window.CU.uid).sort((a,b)=>b.ts-a.ts).slice(0,10);
    ml.innerHTML=myList.length?myList.map(a=>`<div class="att-card${a.isLate?' att-late':''}"><div style="display:flex;justify-content:space-between"><span style="font-size:13px;font-weight:600">📅 ${fmtDate(a.date)} ${a.isLate?'⚠️ দেরিতে':''}</span><span style="font-size:13px;color:var(--blue)">${a.totalHours||'–'} ঘণ্টা</span></div>${a.checkIn?`<div style="font-size:11px;color:var(--muted);margin-top:3px">ইন: window.${window.fmtTime(a.checkIn)} window.${a.checkOut?'· আউট: '+window.fmtTime(a.checkOut):'· চলছে'}</div>`:''}</div>`).join(''):'<div class="empty">উপস্থিতি নেই</div>';
  }
  if(window.CR!=='worker'){
    const aas=window.$('allAttSection');if(aas)aas.style.display='block';
    // ✅ Live GPS Map auto-load
    setTimeout(()=>{ if(typeof window.renderLiveMap==='function') window.renderLiveMap(); }, 300);
    // Late alerts this month
    const now=new Date();
    const lateMap={};
    Object.values(window.allAttendance).forEach(a=>{
      const d=new Date(a.date);
      if(d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()&&a.isLate){
        lateMap[a.uid]=(lateMap[a.uid]||{name:a.name,count:0});
        lateMap[a.uid].count++;
      }
    });
    const ll=window.$('lateAlertList');
    if(ll)ll.innerHTML=Object.values(lateMap).length?Object.values(lateMap).filter(l=>l.count>0).map(l=>`<div class="alert-card"><div class="an">⚠️ ${l.name} · ${l.count} বার দেরিতে ${l.count>=3?'🔴 সতর্কতা!':''}</div></div>`).join(''):'<div class="empty">কোনো লেট অ্যালার্ট নেই</div>';
    // All attendance today
    const aal=window.$('allAttList');
    if(aal){
      const tl=Object.values(window.allAttendance).filter(a=>a.date===window.today());
      aal.innerHTML=tl.length?tl.map(a=>`<div class="att-card${a.isLate?' att-late':''}"><div style="display:flex;justify-content:space-between"><span style="font-size:13px;font-weight:600">👤 ${a.name} ${a.isLate?'⚠️':''}</span>${a.isOT&&!a.otApproved?`<button style="font-size:10px;padding:3px 8px;border:1px solid var(--accent);border-radius:5px;background:none;color:var(--accent);cursor:pointer;" onclick="openOTApproval('${Object.keys(window.allAttendance).find(k=>window.allAttendance[k]===a)}')">OT অনুমোদন</button>`:''}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${a.checkIn?'ইন: '+fmtTime(a.checkIn):''} ${a.checkOut?'· আউট: '+fmtTime(a.checkOut):'· কাজে আছেন'}</div></div>`).join(''):'<div class="empty">আজ কেউ চেক-ইন করেনি</div>';
    }
  }
}
window.openOTApproval=id=>{
  const a=window.allAttendance[id];if(!a)return;currentOTId=id;
  window.$('otBody').innerHTML=`<div class="al-card"><div style="font-size:14px;font-weight:600">👤 ${a.name}</div><div style="font-size:13px;color:var(--muted);margin-top:4px">মোট: ${a.totalHours} ঘণ্টা · ওভারটাইম: ${a.otHours} ঘণ্টা</div></div>`;
  openMo('overtimeMo');
};
window.approveOT=async()=>{
  if(!currentOTId)return;
  const att=window.allAttendance[currentOTId];
  await window._update(window._ref(window._db,'attendance/'+currentOTId),{otApproved:true,otApprovedBy:window.CN});
  if(att?.uid && window.sendNotificationTo)
    window.sendNotificationTo(att.uid,'✅ ওভারটাইম অনুমোদিত',
      'আপনার ওভারটাইম আবেদন অনুমোদন করা হয়েছে।','salary');
  closeMo('overtimeMo');window.showToast('ওভারটাইম অনুমোদিত ✓');
};
window.rejectOT=async()=>{
  if(!currentOTId)return;
  const att=window.allAttendance[currentOTId];
  await window._update(window._ref(window._db,'attendance/'+currentOTId),{otApproved:false,isOT:false});
  if(att?.uid && window.sendNotificationTo)
    window.sendNotificationTo(att.uid,'❌ ওভারটাইম বাতিল',
      'আপনার ওভারটাইম আবেদন বাতিল করা হয়েছে।','salary');
  closeMo('overtimeMo');window.showToast('ওভারটাইম বাতিল');
};

// LEAVE
window.applyLeave=async()=>{
  const type=window.$('leaveType').value,from=window.$('leaveFrom').value,to=window.$('leaveTo').value,reason=window.$('leaveReason').value.trim();
  if(!from||!to){window.showToast('তারিখ দিন!',true);return;}
  await window._push(window._ref(window._db,'leaves'),{uid:window.CU.uid,name:window.CN,type,from,to,reason,status:'pending',ts:Date.now()});
  // Admin/Manager-কে notify করি
  if(window.sendNotificationToRole)
    window.sendNotificationToRole('manager','🏖️ ছুটির আবেদন',
      `${window.CN} ছুটির আবেদন করেছেন — ${type} (${from} – ${to})`,'att');
  window.$('leaveReason').value='';window.showToast('আবেদন পাঠানো ✓');
};
function renderLeaves(){
  const ll=window.$('leaveList');
  if(ll){
    const my=Object.entries(window.allLeaves).filter(([,l])=>l.uid===window.CU.uid).sort((a,b)=>b[1].ts-a[1].ts);
    ll.innerHTML=my.length?my.map(([,l])=>`<div class="leave-card" style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border);margin-bottom:7px;"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:600">${l.type}</span><span style="font-size:10px;padding:2px 8px;border-radius:5px;font-weight:600;" class="ls-${l.status}">${l.status==='pending'?'অপেক্ষায়':l.status==='approved'?'অনুমোদিত':'বাতিল'}</span></div><div style="font-size:11px;color:var(--muted);margin-top:4px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} ${l.reason?'· '+l.reason:''}</div></div>`).join(''):'<div class="empty">কোনো আবেদন নেই</div>';
  }
  const pl=window.$('pendingLeaves');
  if(pl&&window.CR!=='worker'){
    const pending=Object.entries(window.allLeaves).filter(([,l])=>l.status==='pending');
    pl.innerHTML=pending.length?pending.map(([id,l])=>`<div style="background:var(--card);border-radius:var(--r);padding:12px;border:1px solid var(--border);margin-bottom:7px;"><div style="font-size:13px;font-weight:600">👤 ${l.name} · ${l.type}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">📅 ${fmtDate(l.from)} – ${fmtDate(l.to)} · ${l.reason||''}</div><div class="g2" style="margin-top:8px"><button style="padding:7px;border:1px solid var(--green);border-radius:7px;background:rgba(46,204,138,.1);color:var(--green);font-family:inherit;font-size:11px;cursor:pointer;" onclick="approveLeave('${id}')">✅ অনুমোদন</button><button style="padding:7px;border:1px solid var(--red);border-radius:7px;background:rgba(232,93,74,.1);color:var(--red);font-family:inherit;font-size:11px;cursor:pointer;" onclick="rejectLeave('${id}')">❌ বাতিল</button></div></div>`).join(''):'<div class="empty">কোনো অপেক্ষমাণ নেই</div>';
  }
}
window.approveLeave=async id=>{
  const lv=window.allLeaves?.[id];
  await window._update(window._ref(window._db,'leaves/'+id),{status:'approved',approvedBy:window.CN});
  if(lv?.uid && window.sendNotificationTo)
    window.sendNotificationTo(lv.uid,'✅ ছুটি অনুমোদিত','আপনার ছুটির আবেদন অনুমোদন করা হয়েছে।','att');
  window.showToast('ছুটি অনুমোদিত ✓');
};
window.rejectLeave=async id=>{
  const lv=window.allLeaves?.[id];
  await window._update(window._ref(window._db,'leaves/'+id),{status:'rejected',rejectedBy:window.CN});
  if(lv?.uid && window.sendNotificationTo)
    window.sendNotificationTo(lv.uid,'❌ ছুটি বাতিল',
      `আপনার "${lv.type}" ছুটির আবেদন (${lv.from} – ${lv.to}) বাতিল করা হয়েছে।`,'att');
  window.showToast('ছুটি বাতিল');
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
    const s=window.$('salShiftStart')?.value,e=window.$('salShiftEnd')?.value;
    if(!s||!e)return;
    const [sh,sm]=s.split(':').map(Number),[eh,em]=e.split(':').map(Number);
    const hours=((eh*60+em)-(sh*60+sm))/60;
    const prev=window.$('shiftPreview');
    if(prev&&hours>0)prev.textContent=`শিফট: ${s} — ${e} (${hours.toFixed(2)} ঘণ্টা) · ওভারটাইম: ${e} এর পরে`;
  };
  window.$('salShiftStart')?.addEventListener('change',updatePreview);
  window.$('salShiftEnd')?.addEventListener('change',updatePreview);
}

window.setSalary=async()=>{
  const uid=window.$('salWorker').value,basic=parseFloat(window.$('salBasic').value),target=parseFloat(window.$('salTarget').value)||0;
  const shiftStart=window.$('salShiftStart').value||'10:00',shiftEnd=window.$('salShiftEnd').value||'17:50';
  if(!uid||!basic){window.showToast('তথ্য দিন!',true);return;}
  const [sh,sm]=shiftStart.split(':').map(Number),[eh,em]=shiftEnd.split(':').map(Number);
  const shiftHours=((eh*60+em)-(sh*60+sm))/60;
  await window._set(window._ref(window._db,'salaries/'+uid),{basic,shiftStart,shiftEnd,shiftHours:shiftHours.toFixed(2),monthlyTarget:target,workerName:window.allUsers[uid]?.name,setBy:window.CN,ts:Date.now()});
  window.showToast('বেতন সেট ✓');
};

// OT APPLICATION
window.applyOT=async()=>{
  const date=window.$('otDate').value,start=window.$('otStart').value,end=window.$('otEnd').value,reason=window.$('otReason').value.trim();
  if(!date||!start||!end){window.showToast('সব তথ্য দিন!',true);return;}
  const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
  const hours=((eh*60+em)-(sh*60+sm))/60;
  if(hours<=0){window.showToast('সময় সঠিক নয়!',true);return;}
  await window._push(window._ref(window._db,'otRequests'),{uid:window.CU.uid,name:window.CN,date,start,end,hours:hours.toFixed(2),reason,status:'pending',ts:Date.now()});
  window.$('otReason').value='';window.showToast(`ওভারটাইম আবেদন পাঠানো হয়েছে (${hours.toFixed(1)} ঘণ্টা) ✓`);
};

// GOOGLE DRIVE CONFIG
function renderCommSlabs(){
  const cfg=window.allCommConfig||getDefaultSlabs();
  const el=window.$('commSlabs');if(!el)return;
  const slabs=cfg.slabs||getDefaultSlabs().slabs;
  el.innerHTML=`<table style="width:100%;border-collapse:collapse;"><tr style="font-size:11px;color:var(--muted);"><th style="text-align:left;padding:6px;">বিক্রয় পরিমাণ</th><th style="text-align:right;padding:6px;">কমিশন %</th></tr>${slabs.map(s=>`<tr style="border-top:1px solid var(--border)"><td style="padding:8px 6px;font-size:12px;">window.${s.max===999999?window.bn(s.min)+'+':window.bn(s.min)+' – '+window.bn(s.max)}</td><td style="padding:8px 6px;font-size:14px;font-weight:700;text-align:right;color:${s.rate===0?'var(--muted)':'var(--accent)'};">window.${s.rate}%</td></tr>`).join('')}</table><div style="font-size:11px;color:var(--muted);margin-top:6px;padding:6px;">৩০,০০০+ এর পর প্রতি হাজারে ${cfg.extraPer1000||0.1}% বেশি</div>`;
  // Worker রিসেট বাটন দেখবে না
  const resetBtn=window.$('commResetBtn');
  if(resetBtn)resetBtn.style.display=(window.CR==='worker'?'none':'block');
}
window.resetCommSlabs=async()=>{await window._set(window._ref(window._db,'commConfig'),getDefaultSlabs());window.showToast('ডিফল্ট কমিশন ✓');};

function renderSalary(){
  const workerView=window.$('workerSalaryView');
  const adminForms=['setSalaryForm','otRequestForm'];
  const now=new Date();
  const curMonth=now.getMonth(), curYear=now.getFullYear();

  // ── Worker — শুধু নিজের বেতন
  if(window.CR==='worker'){
    if(workerView)workerView.style.display='block';
    adminForms.forEach(id=>{const el=window.$(id);if(el)el.style.display='none';});
    const sal=window.allSalaries[window.CU?.uid];
    const det=window.$('workerSalaryDetail');
    if(det&&sal){
      const mySales=(window._sc.byUid[window.CU?.uid]||[]).filter(s=>{const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;});
      const comm=Math.round(Object.values(buildDailyCommMap(mySales)).reduce((a,v)=>a+calcCommission(v,window.allCommConfig||getDefaultSlabs()),0));
      const attDays=Object.values(window.allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===window.CU.uid&&d.getMonth()===curMonth;}).length;
      det.innerHTML=`
        <div class="rb"><div class="rr"><span class="rn">💵 মূল বেতন</span><span class="rv">window.${window.bn(sal.basic)}/মাস</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">🏆 কমিশন (এই মাস)</span><span class="rv" style="color:var(--accent)">window.${window.bn(comm)}</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">📅 উপস্থিতি</span><span class="rv">window.${attDays} দিন</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">🎯 মাসিক টার্গেট</span><span class="rv">window.${window.bn(sal.monthlyTarget||0)}</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">⏰ শিফট</span><span class="rv">window.${sal.shiftStart||'10:00'} – window.${sal.shiftEnd||'17:50'}</span></div></div>
        <div style="margin-top:12px;">
          <button onclick="generateSalarySlip()" style="width:100%;padding:10px;background:linear-gradient(135deg,var(--primary),var(--blue));border:none;border-radius:10px;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">
            🧾 বেতন Slip দেখুন
          </button>
        </div>`;
    } else if(det){
      det.innerHTML='<div class="empty">বেতন তথ্য নেই</div>';
    }
    const cfg=window.allCommConfig||getDefaultSlabs();
    const cw=window.$('commSlabsWorker');
    if(cw){
      const slabs=cfg.slabs||getDefaultSlabs().slabs;
      cw.innerHTML=`<table style="width:100%;border-collapse:collapse;"><tr style="font-size:11px;color:var(--muted);"><th style="text-align:left;padding:6px;">বিক্রয়</th><th style="text-align:right;padding:6px;">কমিশন %</th></tr>${slabs.map(s=>`<tr style="border-top:1px solid var(--border)"><td style="padding:8px 6px;font-size:12px;">window.${s.max===999999?window.bn(s.min)+'+':window.bn(s.min)+' – '+window.bn(s.max)}</td><td style="padding:8px 6px;font-size:14px;font-weight:700;text-align:right;color:${s.rate===0?'var(--muted)':'var(--accent)'};">window.${s.rate}%</td></tr>`).join('')}</table>`;
    }
    // Worker-এর salary summary
    const el=window.$('salarySummary');if(!el)return;
    const sal2=window.allSalaries[window.CU.uid];
    if(!sal2){el.innerHTML='<div class="empty">বেতন তথ্য নেই</div>';return;}
    const myS=(window._sc.byUid[window.CU.uid]||[]).filter(s=>{const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear&&isCommEligible(s);});
    const comm2=Math.round(Object.values(buildDailyCommMap(myS)).reduce((a,v)=>a+calcCommission(v,window.allCommConfig||getDefaultSlabs()),0));
    const att2=Object.values(window.allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===window.CU.uid&&d.getMonth()===curMonth&&d.getFullYear()===curYear;}).length;
    const earnedBasic2=Math.round((sal2.basic||0)/26*att2);
    const net2=earnedBasic2+comm2;
    el.innerHTML=`<div class="salary-card">
      <div style="font-size:14px;font-weight:700">👤 আমার বেতন সারসংক্ষেপ</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">উপস্থিতি: window.${att2} দিন · শিফট: window.${sal2.shiftStart||'10:00'} — window.${sal2.shiftEnd||'17:50'}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px;background:var(--surface);border-radius:8px;padding:8px;">
        <div style="display:flex;justify-content:space-between;"><span>মূল বেতন:</span><span>window.${window.bn(earnedBasic2)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px"><span>কমিশন:</span><span style="color:var(--accent)">window.${window.bn(comm2)}</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
        <span style="font-size:13px;font-weight:600">নেট বেতন</span>
        <span style="font-size:20px;font-weight:700;color:var(--green)">window.${window.bn(net2)}</span>
      </div>
    </div>`;
    return;
  }

  // ── Manager — নিজের + টিমের বেতন
  if(window.CR==='manager'){
    if(workerView)workerView.style.display='block';
    adminForms.forEach(id=>{const el=window.$(id);if(el)el.style.display='none';});
    // নিজের salary detail
    const sal=window.allSalaries[window.CU?.uid];
    const det=window.$('workerSalaryDetail');
    if(det&&sal){
      const mySales=(window._sc.byUid[window.CU?.uid]||[]).filter(s=>{const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;});
      const comm=Math.round(Object.values(buildDailyCommMap(mySales)).reduce((a,v)=>a+calcCommission(v,window.allCommConfig||getDefaultSlabs()),0));
      const attDays=Object.values(window.allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===window.CU.uid&&d.getMonth()===curMonth;}).length;
      det.innerHTML=`
        <div class="rb"><div class="rr"><span class="rn">💵 মূল বেতন</span><span class="rv">window.${window.bn(sal.basic)}/মাস</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">🏆 কমিশন</span><span class="rv" style="color:var(--accent)">window.${window.bn(comm)}</span></div></div>
        <div class="rb"><div class="rr"><span class="rn">📅 উপস্থিতি</span><span class="rv">window.${attDays} দিন</span></div></div>
        <div style="margin-top:10px;">
          <button onclick="generateSalarySlip()" style="width:100%;padding:9px;background:linear-gradient(135deg,var(--primary),var(--blue));border:none;border-radius:10px;color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;">🧾 আমার বেতন Slip</button>
        </div>`;
    } else if(det){
      det.innerHTML='<div class="empty">বেতন তথ্য নেই</div>';
    }
    renderCommSlabs();
    // টিমের কর্মীদের বেতন
    const myTeam=Object.values(window.allTeams||{}).find(t=>t.leaderId===window.CU?.uid);
    const members=myTeam?.members||[];
    const el=window.$('salarySummary');if(!el)return;
    if(!members.length){el.innerHTML='<div class="empty">টিমে কোনো কর্মী নেই</div>';return;}
    _renderSalaryCards(el, members, now, curMonth, curYear);
    return;
  }

  // ── Admin — সবার বেতন
  if(workerView)workerView.style.display='none';
  adminForms.forEach(id=>{const el=window.$(id);if(el)el.style.display='block';});
  renderCommSlabs();
  const el=window.$('salarySummary');if(!el)return;
  const allWorkerUids=Object.entries(window.allUsers).filter(([,u])=>u.role==='worker'||u.role==='manager').map(([uid])=>uid);
  if(!allWorkerUids.length){el.innerHTML='<div class="empty">কোনো কর্মী নেই</div>';return;}
  _renderSalaryCards(el, allWorkerUids, now, curMonth, curYear);
}
// ✅ Salary cards helper — Admin ও Manager উভয় ব্যবহার করবে
function _renderSalaryCards(el, uids, now, curMonth, curYear) {
  // Pre-compute attendance
  const attByUid={}, otByUid={};
  Object.values(window.allAttendance).forEach(a=>{
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
  Object.values(window.allAllowances||{}).forEach(a=>{
    const from=new Date(a.from),to=new Date(a.to);
    let days=0;
    for(let d=new Date(from);d<=to;d.setDate(d.getDate()+1)){
      if(d.getMonth()===curMonth&&d.getFullYear()===curYear&&d.getDay()!==5) days++;
    }
    allowByUid[a.uid]=(allowByUid[a.uid]||0)+(a.amount*days);
  });

  el.innerHTML=uids.map(uid=>{
    const u=window.allUsers[uid];if(!u)return'';
    const sal=window.allSalaries[uid];
    const basic=sal?.basic||0, target=sal?.monthlyTarget||0;
    const shiftH=parseFloat(sal?.shiftHours)||8;
    const attDays=attByUid[uid]||0;
    const otHours=otByUid[uid]||0;
    const allowance=Math.round(allowByUid[uid]||0);
    const mySales=(window._sc.byUid[uid]||[]).filter(s=>{const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear&&isCommEligible(s);});
    const totalSaleAmt=mySales.reduce((a,b)=>a+(b.total||0),0);
    const comm=Math.round(Object.values(buildDailyCommMap(mySales)).reduce((a,v)=>a+calcCommission(v,window.allCommConfig||getDefaultSlabs()),0));
    const earnedBasic=Math.round(basic/26*attDays);
    const otPay=Math.round(basic/(26*shiftH)*otHours*1.5);
    const net=earnedBasic+comm+otPay+allowance;
    const targetPct=target>0?Math.min((totalSaleAmt/target*100),100).toFixed(0):0;
    const targetColor=targetPct>=100?'var(--green)':targetPct>=60?'var(--accent)':'var(--red)';

    return`<div class="salary-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:14px;font-weight:700">👤 window.${u.name}</div>
        <span class="role-badge role-${u.role}" style="font-size:9px;">window.${u.role==='worker'?'কর্মী':'ম্যানেজার'}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
        শিফট: window.${sal?.shiftStart||'–'} – window.${sal?.shiftEnd||'–'} · উপস্থিতি: window.${attDays} দিন
      </div>
      window.${target>0?`<div style="margin:6px 0 4px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:3px;">
          <span>🎯 window.${window.bn(totalSaleAmt)} / window.${window.bn(target)}</span>
          <span style="color:${targetColor};font-weight:700;">window.${targetPct}%</span>
        </div>
        <div style="background:var(--border);border-radius:3px;height:4px;overflow:hidden;">
          <div style="width:${targetPct}%;height:100%;background:${targetColor};border-radius:3px;"></div>
        </div>
      </div>`:''}
      <div style="font-size:12px;color:var(--muted);margin-top:6px;background:var(--surface);border-radius:8px;padding:8px;">
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>মূল বেতন (window.${attDays}/২৬ দিন):</span><span>window.${window.bn(earnedBasic)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span>কমিশন:</span><span style="color:var(--accent)">window.${window.bn(comm)}</span></div>
        window.${otPay>0?`<div style="display:flex;justify-content:space-between;padding:3px 0;"><span>ওভারটাইম:</span><span>${bn(otPay)}</span></div>`:''}
        window.${allowance>0?`<div style="display:flex;justify-content:space-between;padding:3px 0;"><span>ভাতা:</span><span>${bn(allowance)}</span></div>`:''}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
        <span style="font-size:13px;font-weight:600;">নেট বেতন</span>
        <span class="salary-total">window.${window.bn(net)}</span>
      </div>
    </div>`;
  }).join('');
}

// TEAMS

// TEAMS
window.createTeam=async()=>{
  const name=window.$('teamName').value.trim(),leaderId=window.$('teamLeader').value;
  if(!name){window.showToast('টিমের নাম দিন!',true);return;}
  await window._push(window._ref(window._db,'teams'),{name,leaderId,leaderName:leaderId?window.allUsers[leaderId]?.name:'',members:[],createdBy:window.CN,ts:Date.now()});
  window.$('teamName').value='';window.showToast(name+' টিম তৈরি ✓');
};
window.addTeamMember=async()=>{
  const teamId=window.$('addTeamSel').value,uid=window.$('addTeamMember').value;
  if(!teamId||!uid){window.showToast('টিম ও কর্মী বেছে নিন!',true);return;}
  const team=window.allTeams[teamId];
  const members=team.members||[];
  if(members.includes(uid)){window.showToast('ইতিমধ্যে সদস্য!',true);return;}
  await window._update(window._ref(window._db,'teams/'+teamId),{members:[...members,uid]});
  window.showToast('সদস্য যোগ ✓');
};
function renderTeams(){
  const el=window.$('teamList');if(!el)return;
  const now=new Date();
  const curMonth=now.getMonth(), curYear=now.getFullYear();
  const todayStr=window.today();
  const isManager=window.CR==='manager';

  // ✅ একবার attendance pre-compute
  const attByUid={}, onlineUid=new Set();
  Object.values(window.allAttendance).forEach(a=>{
    const d=new Date(a.date);
    if(d.getMonth()===curMonth&&d.getFullYear()===curYear)
      attByUid[a.uid]=(attByUid[a.uid]||0)+1;
    if(a.date===todayStr&&!a.checkOut) onlineUid.add(a.uid);
  });

  // Manager হলে শুধু তার টিম, Admin হলে সব
  let teamsToShow=Object.entries(window.allTeams);
  if(isManager){
    teamsToShow=teamsToShow.filter(([,t])=>t.leaderId===window.CU?.uid);
  }

  if(!teamsToShow.length){
    el.innerHTML='<div class="empty">কোনো টিম নেই</div>';return;
  }

  el.innerHTML=teamsToShow.map(([id,t])=>{
    const members=t.members||[];
    // টিমের মোট বিক্রয় এই মাসে
    const teamSale=window._sc.thisMonth.filter(s=>members.includes(s.uid)||(isManager&&s.uid===window.CU?.uid)).reduce((a,b)=>a+(b.total||0),0);

    const membersHTML=members.map(uid=>{
      const u=window.allUsers[uid];if(!u)return'';
      const mSales=(window._sc.byUid[uid]||[]).filter(s=>{
        const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;
      });
      const mTotal=mSales.reduce((a,b)=>a+(b.total||0),0);
      const attCount=attByUid[uid]||0;
      const myDue=(window._sc.byUid[uid]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
      const sal=window.allSalaries[uid];
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
              window.${u.photoURL?`<img src="${u.photoURL}" style="width:46px;height:46px;object-fit:cover;">`:'👤'}
            </div>
            <div style="position:absolute;bottom:1px;right:1px;width:10px;height:10px;
              background:window.${isOnline?'var(--green)':'var(--muted)'};border-radius:50%;
              border:2px solid var(--card);"></div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;">window.${u.name}</div>
            <div style="font-size:10px;color:var(--muted);">
              window.${u.waNum?`📱 ${u.waNum}`:''}
              window.${isOnline?'<span style="color:var(--green);font-weight:600;margin-left:4px;">● চেক-ইন</span>':''}
            </div>
          </div>
          <div style="font-size:18px;color:var(--muted);">›</div>
        </div>

        <!-- Stats -->
        <div style="display:flex;border-top:1px solid var(--border);background:var(--surface);">
          <div style="flex:1;text-align:center;padding:6px 4px;border-right:1px solid var(--border);">
            <div style="font-size:11px;font-weight:700;color:var(--blue);">window.${window.bn(mTotal)}</div>
            <div style="font-size:9px;color:var(--muted);">বিক্রয়</div>
          </div>
          <div style="flex:1;text-align:center;padding:6px 4px;border-right:1px solid var(--border);">
            <div style="font-size:11px;font-weight:700;color:var(--green);">window.${attCount} দিন</div>
            <div style="font-size:9px;color:var(--muted);">উপস্থিতি</div>
          </div>
          <div style="flex:1;text-align:center;padding:6px 4px;">
            <div style="font-size:11px;font-weight:700;color:${myDue>0?'var(--red)':'var(--green)'};">window.${myDue>0?window.bn(myDue):'✅'}</div>
            <div style="font-size:9px;color:var(--muted);">বাকি</div>
          </div>
        </div>

        <!-- Target -->
        window.${target>0?`<div style="padding:7px 12px;background:var(--surface);border-top:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-bottom:3px;">
            <span>🎯 window.${window.bn(target)}</span>
            <span style="color:${targetColor};font-weight:700;">window.${targetPct}%</span>
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
          window.${u.waNum?`<button onclick="window.open('https://wa.me/88${(u.waNum||'').replace(/[^0-9]/g,'')}','_blank')"
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
          <div style="font-size:14px;font-weight:800;color:#fff;">👥 window.${t.name}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px;">
            লিডার: window.${t.leaderName||'–'} · window.${members.length} সদস্য
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:15px;font-weight:800;color:#fff;">window.${window.bn(teamSale)}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.6);">এই মাস</div>
        </div>
      </div>
      <!-- সদস্যরা -->
      window.${membersHTML||'<div class="empty" style="margin:0;">সদস্য নেই</div>'}
      window.${window.CR==='admin'?`<button class="del-btn" onclick="deleteTeam('${id}')" style="margin-top:4px;">টিম মুছুন</button>`:''}
    </div>`;
  }).join('');
}

// ✅ টিম মুছুন — শুধু Admin
window.deleteTeam=async id=>{if(!confirm('টিম মুছবেন?'))return;await window._remove(window._ref(window._db,'teams/'+id));};

// PROFILE
function renderProfile(){
  const uData=window.allUsers[window.CU?.uid]||{};
  const now=new Date();

  // ── ছবি আপডেট ──
  const img=window.$('profilePhoto'),icon=window.$('profilePhotoIcon');
  if(uData?.photoURL&&img){
    img.src=uData.photoURL;img.style.display='block';img.style.position='relative';img.style.zIndex='1';
    if(icon)icon.style.display='none';
  } else {
    if(img)img.style.display='none';
    if(icon)icon.style.display='block';
  }

  // ── হেডার টেক্সট ──
  const roleLabel=window.CR==='admin'?'অ্যাডমিন':window.CR==='manager'?'ম্যানেজার':'কর্মী';
  const roleColor=window.CR==='admin'?'var(--accent)':window.CR==='manager'?'var(--blue-l)':'var(--green-l)';
  window.$('pName').textContent=window.CN;
  window.$('pRole').innerHTML=`<span class="role-badge role-${window.CR}" style="font-size:10px">${roleLabel}</span>`;
  window.$('pMeta').innerHTML=`📧 ${uData.email||'–'} &nbsp;|&nbsp; 📞 ${uData.waNum||uData.phone||'–'}`;
  window.$('pEditName').value=window.CN;
  if(window.$('pEditWa'))window.$('pEditWa').value=uData.waNum||'';

  // ── হেডার গ্রেডিয়েন্ট role অনুযায়ী ──
  const hero=window.$('profileHeroCard');
  if(hero){
    const grad=window.CR==='admin'
      ?'linear-gradient(135deg,#92400e,#d97706)'
      :window.CR==='manager'
      ?'linear-gradient(135deg,#4c1d95,#6d28d9)'
      :'linear-gradient(135deg,#065f46,#059669)';
    hero.style.background=grad;
  }

  // ══════════════════════════════════════
  //  ADMIN প্রোফাইল
  // ══════════════════════════════════════
  if(window.CR==='admin'){
    const allSalesArr=Object.values(window.allSales);
    const allExpsArr=Object.values(window.allExpenses);
    const mSales=allSalesArr.filter(s=>{const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
    const totalSale=mSales.reduce((a,b)=>a+(b.total||0),0);
    const totalDue=allSalesArr.reduce((a,b)=>a+(b.due||0),0);
    const totalExp=allExpsArr.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth();}).reduce((a,b)=>a+(b.amount||0),0);
    const workerCount=Object.values(window.allUsers).filter(u=>u.role==='worker').length;
    const pendingLeaves=Object.values(window.allLeaves).filter(l=>l.status==='pending').length;
    const pendingExp=Object.values(window.allExpenses).filter(e=>e.status==='pending').length;

    // Stats strip
    window.$('profileStatsStrip').innerHTML=`
      <div style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid var(--border);">
        <div style="font-size:18px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">window.${workerCount}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">কর্মী</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid var(--border);">
        <div style="font-size:14px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">window.${window.bn(totalSale)}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">এই মাস বিক্রয়</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid var(--border);">
        <div style="font-size:14px;font-weight:700;color:var(--purple);font-family:'Sora',sans-serif;">window.${window.bn(totalDue)}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">মোট বাকি</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 8px;">
        <div style="font-size:18px;font-weight:700;color:${(pendingLeaves+pendingExp)>0?'var(--red)':'var(--green)'};font-family:'Sora',sans-serif;">window.${pendingLeaves+pendingExp}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">অনুমোদন বাকি</div>
      </div>`;

    // Quick actions
    window.$('profileQuickActions').innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:4px;">
        window.${[
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
          <span style="font-size:22px">window.${i.ico}</span>
          <span style="font-size:11px;font-weight:600;color:var(--muted)">window.${i.lbl}</span>
        </div>`).join('')}
      </div>`;

    // Special — খরচ summary
    window.$('profileSpecial').innerHTML=`
      <div class="form-card" style="margin-bottom:12px;">
        <div class="sec" style="margin-top:0;">📊 এই মাসের সংক্ষেপ</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="sum-card c-sale" style="padding:12px;"><div class="lbl">বিক্রয়</div><div class="val" style="font-size:16px;">window.${window.bn(totalSale)}</div></div>
          <div class="sum-card c-exp" style="padding:12px;"><div class="lbl">খরচ</div><div class="val" style="font-size:16px;">window.${window.bn(totalExp)}</div></div>
        </div>
      </div>`;

    window.$('perfReport').innerHTML='';
    return;
  }

  // ══════════════════════════════════════
  //  MANAGER প্রোফাইল
  // ══════════════════════════════════════
  if(window.CR==='manager'){
    // আমার টিম খুঁজি
    const myTeam=Object.values(window.allTeams).find(t=>t.leaderId===window.CU.uid);
    const teamMembers=myTeam?.members||[];
    const mSales=Object.values(window.allSales).filter(s=>{const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
    const teamSale=mSales.filter(s=>teamMembers.includes(s.uid)||(s.uid===window.CU.uid)).reduce((a,b)=>a+(b.total||0),0);
    const myMonthlySale=mSales.filter(s=>s.uid===window.CU.uid).reduce((a,b)=>a+(b.total||0),0);
    const pendingLeaves=Object.values(window.allLeaves).filter(l=>l.status==='pending'&&teamMembers.includes(l.uid)).length;
    const pendingExp=Object.values(window.allExpenses).filter(e=>e.status==='pending'&&teamMembers.includes(e.uid)).length;
    const attToday=Object.values(window.allAttendance).filter(a=>a.date===window.today()&&teamMembers.includes(a.uid)).length;

    window.$('profileStatsStrip').innerHTML=`
      <div style="flex:1;text-align:center;padding:14px 6px;border-right:1px solid var(--border);">
        <div style="font-size:18px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">window.${teamMembers.length}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">টিম সদস্য</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 6px;border-right:1px solid var(--border);">
        <div style="font-size:14px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">window.${window.bn(teamSale)}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">টিম বিক্রয়</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 6px;border-right:1px solid var(--border);">
        <div style="font-size:18px;font-weight:700;color:${(pendingLeaves+pendingExp)>0?'var(--red)':'var(--green)'};font-family:'Sora',sans-serif;">window.${pendingLeaves+pendingExp}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">অনুমোদন</div>
      </div>
      <div style="flex:1;text-align:center;padding:14px 6px;">
        <div style="font-size:18px;font-weight:700;color:var(--green);font-family:'Sora',sans-serif;">window.${attToday}</div>
        <div style="font-size:10px;color:var(--muted);font-weight:600;margin-top:2px;">আজ উপস্থিত</div>
      </div>`;

    window.$('profileQuickActions').innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:4px;">
        window.${[
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
          <span style="font-size:22px">window.${i.ico}</span>
          <span style="font-size:11px;font-weight:600;color:var(--muted);text-align:center;line-height:1.2;">window.${i.lbl}</span>
        </div>`).join('')}
      </div>`;

    window.$('profileSpecial').innerHTML=myTeam?`
      <div class="form-card" style="margin-bottom:12px;">
        <div class="sec" style="margin-top:0;">👥 আমার টিম — window.${myTeam.name}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          window.${teamMembers.map(uid=>window.allUsers[uid]?`
            <span style="background:var(--surface);border:1px solid var(--border);border-radius:7px;
              padding:5px 10px;font-size:11px;font-weight:600;">
              👤 window.${window.allUsers[uid].name}
            </span>`:''
          ).join('')||'<span style="font-size:12px;color:var(--muted)">সদস্য নেই</span>'}
        </div>
      </div>`:'';

    // Manager নিজের বিক্রয় ও কমিশন
    const mySales=(window._sc.byUid[window.CU?.uid]||[]).filter(s=>{const d=new Date(s.date);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});
    const dailyMap=buildDailyCommMap(mySales);
    const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,window.allCommConfig||getDefaultSlabs()),0);
    window.$('perfReport').innerHTML=`
      <div class="form-card" style="margin-bottom:12px;">
        <div class="sec" style="margin-top:0;">📊 আমার পারফরম্যান্স</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="sum-card c-sale" style="padding:12px;"><div class="lbl">আমার বিক্রয়</div><div class="val" style="font-size:16px;">window.${window.bn(myMonthlySale)}</div></div>
          <div class="sum-card" style="padding:12px;border-color:var(--accent);"><div class="lbl">কমিশন</div><div class="val" style="font-size:16px;color:var(--accent);">window.${window.bn(comm)}</div></div>
        </div>
      </div>`;
    return;
  }

  // ══════════════════════════════════════
  //  WORKER প্রোফাইল
  // ══════════════════════════════════════
  const mySales=(window._sc.byUid[window.CU?.uid]||[]).filter(s=>{const d=new Date(s.date);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});
  const mySaleTotal=mySales.filter(s=>isCommEligible(s)).reduce((a,b)=>a+(b.total||0),0);
  const dailyMap=buildDailyCommMap(mySales);
  const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,window.allCommConfig||getDefaultSlabs()),0);
  const sal=window.allSalaries[window.CU.uid];
  const target=sal?.monthlyTarget||0;
  const targetPct=target>0?Math.min((mySaleTotal/target*100),100).toFixed(0):0;
  const targetColor=targetPct>=100?'var(--green)':targetPct>=60?'var(--accent)':'var(--red)';
  const attCount=Object.values(window.allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===window.CU.uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
  const lateCount=Object.values(window.allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===window.CU.uid&&d.getMonth()===now.getMonth()&&a.isLate;}).length;
  const todaySales=Object.values(window.allSales).filter(s=>s.uid===window.CU.uid&&s.date===window.today());
  const todaySaleTotal=todaySales.reduce((a,b)=>a+(b.total||0),0);
  const myDueTotal=(window._sc.byUid[window.CU?.uid]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
  const pendingLeaves=Object.values(window.allLeaves).filter(l=>l.uid===window.CU.uid&&l.status==='pending').length;

  // Stats strip
  window.$('profileStatsStrip').innerHTML=`
    <div style="flex:1;text-align:center;padding:12px 6px;border-right:1px solid var(--border);">
      <div style="font-size:15px;font-weight:700;color:var(--blue);font-family:'Sora',sans-serif;">window.${window.bn(todaySaleTotal)}</div>
      <div style="font-size:9px;color:var(--muted);font-weight:600;margin-top:2px;">আজকের বিক্রয়</div>
    </div>
    <div style="flex:1;text-align:center;padding:12px 6px;border-right:1px solid var(--border);">
      <div style="font-size:15px;font-weight:700;color:var(--accent);font-family:'Sora',sans-serif;">window.${window.bn(comm)}</div>
      <div style="font-size:9px;color:var(--muted);font-weight:600;margin-top:2px;">কমিশন</div>
    </div>
    <div style="flex:1;text-align:center;padding:12px 6px;border-right:1px solid var(--border);">
      <div style="font-size:18px;font-weight:700;color:var(--green);font-family:'Sora',sans-serif;">window.${attCount}</div>
      <div style="font-size:9px;color:var(--muted);font-weight:600;margin-top:2px;">উপস্থিতি</div>
    </div>
    <div style="flex:1;text-align:center;padding:12px 6px;">
      <div style="font-size:18px;font-weight:700;color:${lateCount>0?'var(--red)':'var(--green)'};font-family:'Sora',sans-serif;">window.${lateCount}</div>
      <div style="font-size:9px;color:var(--muted);font-weight:600;margin-top:2px;">দেরি</div>
    </div>`;

  // Quick actions
  window.$('profileQuickActions').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:4px;">
      window.${[
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
        <span style="font-size:22px">window.${i.ico}</span>
        <span style="font-size:11px;font-weight:600;color:var(--muted);text-align:center;line-height:1.2;">window.${i.lbl}</span>
      </div>`).join('')}
    </div>`;

  // Special — টার্গেট + বেতন
  window.$('profileSpecial').innerHTML=`
    window.${target>0?`<div class="form-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:700;">🎯 মাসিক টার্গেট</span>
        <span style="font-size:20px;font-weight:700;color:${targetColor};font-family:'Sora',sans-serif;">window.${targetPct}%</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">window.${window.bn(mySaleTotal)} / window.${window.bn(target)}</div>
      <div style="background:var(--border);border-radius:6px;height:8px;overflow:hidden;">
        <div style="width:${targetPct}%;height:100%;background:linear-gradient(90deg,${targetColor},${targetColor}aa);border-radius:6px;transition:width .5s;"></div>
      </div>
    </div>`:''}
    window.${sal?`<div class="form-card" style="margin-bottom:12px;">
      <div class="sec" style="margin-top:0;">💰 বেতন তথ্য</div>
      <div style="background:var(--surface);border-radius:8px;padding:10px;">
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid var(--border);">
          <span style="color:var(--muted);">মূল বেতন</span><span style="font-weight:600;">window.${window.bn(sal.basic||0)}/মাস</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid var(--border);">
          <span style="color:var(--muted);">কমিশন (এই মাস)</span><span style="font-weight:700;color:var(--accent);">window.${window.bn(comm)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;">
          <span style="color:var(--muted);">শিফট</span><span style="font-weight:600;">window.${sal.shiftStart||'–'} — window.${sal.shiftEnd||'–'}</span>
        </div>
      </div>
    </div>`:''}
    window.${myDueTotal>0?`<div style="background:rgba(239,68,68,.08);border:1px solid var(--red);border-radius:10px;padding:12px;margin-bottom:12px;">
      <div style="font-size:13px;font-weight:600;color:var(--red);">⚠️ আমার দেওয়া বাকি: window.${window.bn(myDueTotal)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px;">এই বাকি তোলা না হলে কমিশন যোগ হবে না</div>
    </div>`:''}
    window.${pendingLeaves>0?`<div style="background:rgba(245,158,11,.08);border:1px solid var(--accent);border-radius:10px;padding:10px;margin-bottom:12px;font-size:12px;color:var(--accent);font-weight:600;">
      ⏳ window.${pendingLeaves}টি ছুটির আবেদন অনুমোদন অপেক্ষায়
    </div>`:''}`;

  // Performance ranking
  const allWorkerSales={};
  Object.values(window.allSales).filter(s=>{const d=new Date(s.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).forEach(s=>{allWorkerSales[s.uid]=(allWorkerSales[s.uid]||0)+s.total;});
  const maxSale=Math.max(...Object.values(allWorkerSales),1);
  const myRank=Object.values(allWorkerSales).sort((a,b)=>b-a).indexOf(allWorkerSales[window.CU.uid]||0)+1;
  const totalWorkers=Object.values(window.allUsers).filter(u=>u.role==='worker'||u.role==='manager').length;
  window.$('perfReport').innerHTML=`
    <div class="form-card" style="margin-bottom:12px;">
      <div class="sec" style="margin-top:0;">📊 পারফরম্যান্স</div>
      <div class="rb"><div class="rr"><span class="rn">📊 এই মাসের বিক্রয়</span><span class="rv">window.${window.bn(mySaleTotal)}</span></div>
        <div class="bar-t"><div class="bar-f" style="width:${((allWorkerSales[CU.uid]||0)/maxSale*100).toFixed(0)}%"></div></div></div>
      <div class="rb"><div class="rr"><span class="rn">🏆 দলে র‍্যাংক</span><span class="rv">window.${myRank} / window.${totalWorkers}</span></div></div>
      <div class="rb"><div class="rr"><span class="rn">📅 উপস্থিতি</span><span class="rv">window.${attCount} দিন</span></div></div>
      <div class="rb"><div class="rr"><span class="rn">🛍️ আজকের বিক্রয়</span><span class="rv">window.${todaySales.length}টি অর্ডার</span></div></div>
    </div>`;

  // myDueSummary clear করি (আগের version-এ ছিল)
  const myDueEl=window.$('myDueSummary');
  if(myDueEl)myDueEl.innerHTML='';
}
window.updateProfile=async()=>{
  const name=window.$('pEditName').value.trim(),wa=window.$('pEditWa').value.trim(),pass=window.$('pEditPass').value;
  if(!name){window.showToast('নাম দিন!',true);return;}
  await window._update(window._ref(window._db,'users/'+window.CU.uid),{name,waNum:wa});
  if(pass&&pass.length>=6){try{await window._updatePassword(window.CU,pass);}catch(e){window.showToast('পাসওয়ার্ড আপডেট ব্যর্থ',true);}}
  window.CN=name;window.$('userName').textContent=name;window.showToast('প্রোফাইল আপডেট ✓');
};

// REPORT
function renderReport(){
  const sales=Object.values(window.allSales),exps=Object.values(window.allExpenses);
  const ts=sales.reduce((s,i)=>s+(i.total||0),0),tp=sales.reduce((s,i)=>s+(i.profit||0),0),te=exps.reduce((s,i)=>s+(i.amount||0),0);
  if(window.CR==='admin'){
    window.$('rNet').textContent=window.bn(tp-te);
    window.$('rNet').style.color=(tp-te)>=0?'var(--green)':'var(--red)';
  } else {
    window.$('rNet').textContent='—';
    window.$('rNet').style.color='var(--muted)';
  }
  window.$('rSale').textContent=window.bn(ts);
  // নিট লাভ কার্ড — শুধু Admin দেখবে
  const rNetCard=window.$('rNetCard');
  if(rNetCard) rNetCard.style.display=window.CR==='admin'?'block':'none';
  const rSaleCard=document.querySelector('#page-report .c-sale');
  if(rSaleCard) rSaleCard.style.gridColumn=window.CR==='admin'?'':'1 / -1';
  const wm={};sales.forEach(s=>{wm[s.workerName||'?']=(wm[s.workerName||'?']||0)+s.total;});
  const maxW=Math.max(...Object.values(wm),1);
  window.$('workerReport').innerHTML=Object.entries(wm).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="rb"><div class="rr"><span class="rn">👤 ${n}</span><span class="rv">${bn(v)}</span></div><div class="bar-t"><div class="bar-f" style="width:${(v/maxW*100).toFixed(0)}%"></div></div></div>`).join('')||'<div class="empty">নেই</div>';
  const sm={};sales.forEach(s=>{sm[s.shop]=(sm[s.shop]||0)+s.total;});
  const maxS=Math.max(...Object.values(sm),1);
  window.$('shopReport').innerHTML=Object.entries(sm).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,v])=>`<div class="rb"><div class="rr"><span class="rn">🏪 ${n}</span><span class="rv">${bn(v)}</span></div><div class="bar-t"><div class="bar-f" style="width:${(v/maxS*100).toFixed(0)}%"></div></div></div>`).join('')||'<div class="empty">নেই</div>';
  const pm={};sales.forEach(s=>{pm[s.product]=(pm[s.product]||0)+s.qty;});
  const maxP=Math.max(...Object.values(pm),1);
  window.$('prodReport').innerHTML=Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="rb"><div class="rr"><span class="rn">🛍 ${n}</span><span class="rv">${v} পিস</span></div><div class="bar-t"><div class="bar-f" style="width:${(v/maxP*100).toFixed(0)}%"></div></div></div>`).join('')||'<div class="empty">নেই</div>';
  const rm={};sales.forEach(s=>{if(s.routeId&&window.allRoutes[s.routeId]){const rn=window.allRoutes[s.routeId].name;rm[rn]=(rm[rn]||0)+s.total;}});
  const maxR=Math.max(...Object.values(rm),1);
  window.$('routeReport').innerHTML=Object.entries(rm).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="rb"><div class="rr"><span class="rn">🗺️ ${n}</span><span class="rv">${bn(v)}</span></div><div class="bar-t"><div class="bar-f" style="width:${(v/maxR*100).toFixed(0)}%"></div></div></div>`).join('')||'<div class="empty">নেই</div>';
  const em={};exps.forEach(e=>{em[e.type]=(em[e.type]||0)+e.amount;});
  window.$('expReport').innerHTML=Object.entries(em).sort((a,b)=>b[1]-a[1]).map(([t,v])=>`<div class="ec"><div class="ei"><div class="shop">${t}</div></div><div class="ea"><div class="sale" style="color:var(--red)">${bn(v)}</div></div></div>`).join('')||'<div class="empty">নেই</div>';

  // ✅ P&L Section — শুধু Admin দেখবে
  const plSec=window.$('plSection');
  if(plSec) plSec.style.display=window.CR==='admin'?'block':'none';
}
window.exportPDF=()=>{
  const now=new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
  const sales=Object.values(window.allSales),exps=Object.values(window.allExpenses);
  const ts=sales.reduce((s,i)=>s+(i.total||0),0),tp=sales.reduce((s,i)=>s+(i.profit||0),0),te=exps.reduce((s,i)=>s+(i.amount||0),0);
  const html=`<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:20px;max-width:800px;margin:0 auto;}h1{color:#f5a623;}table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;}.total{font-size:18px;font-weight:bold;color:#2ecc8a;}</style></head><body><h1>NovaTEch BD - মাসিক রিপোর্ট</h1><p>তারিখ: ${now}</p><table><tr><th>মোট বিক্রয়</th><th>মোট লাভ</th><th>মোট খরচ</th><th>নিট লাভ</th></tr><tr><td>${bn(ts)}</td><td>${bn(tp)}</td><td>${bn(te)}</td><td class="total">${bn(tp-te)}</td></tr></table><h3>বিক্রয় তালিকা</h3><table><tr><th>তারিখ</th><th>শপ</th><th>পণ্য</th><th>পরিমাণ</th><th>ছাড়%</th><th>মোট</th><th>কর্মী</th><th>OTP</th></tr>${sales.slice(-100).map(s=>`<tr><td>window.${s.date}</td><td>window.${s.shop}</td><td>window.${s.product}</td><td>window.${s.qty}</td><td>window.${s.disc||0}%</td><td>window.${window.bn(s.total)}</td><td>window.${s.workerName||''}</td><td>window.${s.otpConfirmed?'✓':s.otpSkipped?'বাদ':'-'}</td></tr>`).join('')}</table></body></html>`;
  const w=window.open('','_blank');w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
};

// ADMIN
window.addProduct=async()=>{
  const name=window.$('npName').value.trim(),buy=parseFloat(window.$('npBuy').value)||0,sell=parseFloat(window.$('npSell').value)||0,disc=parseFloat(window.$('npDisc').value)||0;
  if(!name){window.showToast('নাম দিন!',true);return;}
  await window._push(window._ref(window._db,'products'),{name,buyPrice:buy,sellPrice:sell,maxDisc:disc});
  window.$('npName').value='';window.$('npBuy').value='';window.$('npSell').value='';window.$('npDisc').value='';window.showToast(name+' যোগ ✓');
};
function renderProdChips(){
  window.$('prodChips').innerHTML=Object.entries(window.allProducts).map(([id,p])=>`<span class="prod-chip">${p.name} ক্রয়:${bn(p.buyPrice)} বিক্রয়:${bn(p.sellPrice)} ছাড়:${p.maxDisc||0}%<button class="chip-del" onclick="delProd('${id}')">✕</button></span>`).join('');
}
window.delProd=async id=>{if(!confirm('মুছবেন?'))return;await window._remove(window._ref(window._db,'products/'+id));};

window.createUser=async()=>{
  if(window.CR==='worker'){window.showToast('আপনার এই অনুমতি নেই!',true);return;}
  const name=window.$('nuName').value.trim(),email=window.$('nuEmail').value.trim(),pass=window.$('nuPass').value,role=window.$('nuRole').value;
  if(!name||!email||!pass){window.showToast('নাম, ইমেইল ও পাসওয়ার্ড দিন!',true);return;}
  window.loader(true);
  try{
    const ce=window.CU.email,cp=prompt('আপনার পাসওয়ার্ড নিশ্চিত করুন:');
    if(!cp){window.loader(false);return;}

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

    const cred=await window._createUser(window._auth,email,pass);
    await window._set(window._ref(window._db,'users/'+cred.user.uid),{
      name,email,role,photoURL,
      phone:window.$('nuPhone').value.trim(),
      waNum:window.$('nuWa').value.trim(),
      age:window.$('nuAge').value,
      address:window.$('nuAddress').value.trim(),
      documents:docLinks,
      createdBy:window.CN,createdAt:window.today(),status:'active'
    });
    await window._signOut(window._auth);
    await window._signIn(window._auth,ce,cp);
    ['nuName','nuEmail','nuPass','nuPhone','nuWa','nuAge','nuAddress'].forEach(id=>{const el=window.$(id);if(el)el.value='';});
    // photo reset
    const prev=window.$('nuPhotoPreview'),icon=window.$('nuPhotoIcon');
    if(prev){prev.src='';prev.style.display='none';}
    if(icon)icon.style.display='block';
    window.showToast('✅ '+name+' তৈরি হয়েছে!');
  }catch(e){window.loader(false);window.showToast('সমস্যা: '+e.message,true);}
};

function renderUserList(){
  const now=new Date();
  const curMonth=now.getMonth(), curYear=now.getFullYear();
  const todayStr=window.today();

  // ✅ একবার attendance pre-compute করি — loop-এর বাইরে
  const attByUid={}, lateByUid={}, onlineUid=new Set();
  Object.values(window.allAttendance).forEach(a=>{
    const d=new Date(a.date);
    if(d.getMonth()===curMonth&&d.getFullYear()===curYear){
      attByUid[a.uid]=(attByUid[a.uid]||0)+1;
      if(a.isLate) lateByUid[a.uid]=(lateByUid[a.uid]||0)+1;
    }
    if(a.date===todayStr&&!a.checkOut) onlineUid.add(a.uid);
  });

  window.$('userList').innerHTML=Object.entries(window.allUsers).map(([uid,u])=>{
    const mSales=(window._sc.byUid[uid]||[]).filter(s=>{
      const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;
    });
    const mTotal=mSales.reduce((a,b)=>a+(b.total||0),0);
    const dailyMap=buildDailyCommMap(mSales);
    const comm=Object.values(dailyMap).reduce((a,v)=>a+calcCommission(v,window.allCommConfig||getDefaultSlabs()),0);
    const attCount=attByUid[uid]||0;
    const lateCount=lateByUid[uid]||0;
    const isOnline=onlineUid.has(uid);
    const myDue=(window._sc.byUid[uid]||[]).filter(s=>s.due>0).reduce((a,s)=>a+s.due,0);
    const sal=window.allSalaries[uid];
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
            window.${u.photoURL?`<img src="${u.photoURL}" style="width:52px;height:52px;object-fit:cover;">`:'👤'}
          </div>
          <div style="position:absolute;bottom:1px;right:1px;width:11px;height:11px;
            background:window.${isOnline?'var(--green)':statusColor};border-radius:50%;
            border:2px solid var(--card);"></div>
        </div>
        <!-- তথ্য -->
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span style="font-size:14px;font-weight:700;">window.${u.name}</span>
            <span class="role-badge role-${u.role}" style="font-size:9px;">window.${roleLabel}</span>
            window.${u.status&&u.status!=='active'?`<span style="font-size:9px;color:${statusColor};font-weight:700;">${statusLabel}</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">📧 window.${u.email||'–'}</div>
          <div style="font-size:11px;color:var(--muted);">
            window.${u.waNum||u.phone?`📱 ${u.waNum||u.phone}`:''}
            window.${isOnline?'<span style="color:var(--green);margin-left:6px;font-weight:600;">● আজ চেক-ইন</span>':''}
          </div>
        </div>
        <div style="font-size:18px;color:var(--muted);">›</div>
      </div>

      <!-- Stats strip -->
      <div style="display:flex;border-top:1px solid var(--border);background:var(--surface);">
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:var(--blue);">window.${window.bn(mTotal)}</div>
          <div style="font-size:9px;color:var(--muted);">মাসের বিক্রয়</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:var(--accent);">window.${window.bn(comm)}</div>
          <div style="font-size:9px;color:var(--muted);">কমিশন</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid var(--border);">
          <div style="font-size:12px;font-weight:700;color:${lateCount>0?'var(--red)':'var(--green)'};">window.${attCount}<span style="font-size:9px;color:var(--muted);">দিন</span></div>
          <div style="font-size:9px;color:var(--muted);">উপস্থিতি</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;">
          <div style="font-size:12px;font-weight:700;color:${myDue>0?'var(--red)':'var(--green)'};">window.${myDue>0?window.bn(myDue):'✅'}</div>
          <div style="font-size:9px;color:var(--muted);">বাকি দেওয়া</div>
        </div>
      </div>

      <!-- Target progress (যদি থাকে) -->
      window.${target>0?`<div style="padding:8px 12px;background:var(--surface);border-top:1px solid var(--border);">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px;">
          <span>🎯 টার্গেট: window.${window.bn(target)}</span>
          <span style="color:${targetColor};font-weight:700;">window.${targetPct}%</span>
        </div>
        <div style="background:var(--border);border-radius:4px;height:5px;overflow:hidden;">
          <div style="width:${targetPct}%;height:100%;background:${targetColor};border-radius:4px;transition:width .4s;"></div>
        </div>
      </div>`:''}

      <!-- Action buttons — Admin-এর পূর্ণ ক্ষমতা -->
      window.${uid!==window.CU.uid?`<div style="display:flex;border-top:1px solid var(--border);">
        <button onclick="viewWorkerProfile('${uid}')"
          style="flex:1;padding:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            background:rgba(59,130,246,.08);border:none;border-right:1px solid var(--border);color:var(--blue);">
          👁 প্রোফাইল
        </button>
        window.${u.waNum?`<button onclick="window.open('https://wa.me/88${(u.waNum||'').replace(/[^0-9]/g,'')}','_blank')"
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

window.suspendUser=async uid=>{if(!confirm('এই কর্মীকে স্থগিত করবেন?'))return;await window._update(window._ref(window._db,'users/'+uid),{status:'suspended'});window.showToast('কর্মী স্থগিত ✓');};
window.fireUser=async uid=>{if(!confirm('এই কর্মীকে বহিষ্কার করবেন?'))return;await window._update(window._ref(window._db,'users/'+uid),{status:'fired'});window.showToast('কর্মী বহিষ্কৃত ✓');};
window.deleteUser=async uid=>{if(!confirm('এই কর্মীকে সম্পূর্ণ মুছবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।'))return;await window._remove(window._ref(window._db,'users/'+uid));window.showToast('কর্মী মুছে গেছে');};

window.viewWorkerProfile=uid=>{
  const u=window.allUsers[uid];if(!u)return;
  const now=new Date();
  const ws=Object.values(window.allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const wst=ws.reduce((a,b)=>a+(b.total||0),0);
  const sal=window.allSalaries[uid];
  const att=Object.values(window.allAttendance).filter(a=>{const d=new Date(a.date);return a.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const lateCount=att.filter(a=>a.isLate).length;
  window.$('wpTitle').textContent='👤 '+u.name;

  const docs=Array.isArray(u.documents)?u.documents:(u.documents?Object.values(u.documents):[]);
  const docsHTML=docs.length?docs.map((d,i)=>`
    <div style="display:flex;align-items:center;gap:8px;background:var(--surface);border-radius:8px;padding:8px 10px;margin-bottom:5px;border:1px solid var(--border);">
      <a href="${d.url}" target="_blank" style="display:flex;align-items:center;gap:8px;flex:1;text-decoration:none;color:var(--text);min-width:0;">
        <span style="font-size:18px;">window.${d.name?.endsWith('.pdf')?'📄':d.name?.match(/\.jpe?g|\.png/)?'🖼️':'📎'}</span>
        <div style="min-width:0;">
          <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">window.${d.name||'ফাইল'}</div>
          <div style="font-size:10px;color:var(--muted);">Drive এ দেখুন →</div>
        </div>
      </a>
      window.${window.CR==='admin'?`<button onclick="deleteWorkerDoc('${uid}',${i})" style="background:rgba(239,68,68,.1);border:1px solid var(--red);border-radius:6px;color:var(--red);cursor:pointer;padding:4px 8px;font-size:11px;flex-shrink:0;">🗑️</button>`:''}
    </div>`).join(''):'<div style="font-size:12px;color:var(--muted);">কোনো ডকুমেন্ট নেই</div>';

  window.$('wpBody').innerHTML=`
    <div style="text-align:center;margin-bottom:12px">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:28px;overflow:hidden;margin:0 auto 8px;">
        window.${u.photoURL?`<img src="${u.photoURL}" style="width:72px;height:72px;object-fit:cover;">`:'👤'}
      </div>
      <div style="font-size:15px;font-weight:700">window.${u.name}</div>
      <span class="role-badge role-${u.role}">window.${u.role}</span>
    </div>
    <div style="background:var(--card);border-radius:10px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;margin-bottom:4px">📧 window.${u.email}</div>
      <div style="font-size:13px;margin-bottom:4px">📱 window.${u.phone||'-'} · WA: window.${u.waNum||'-'}</div>
      <div style="font-size:13px;margin-bottom:4px">🏠 window.${u.address||'-'}</div>
      <div style="font-size:12px;color:var(--muted)">যোগদান: window.${u.createdAt||'-'} · স্ট্যাটাস: window.${u.status||'active'}</div>
    </div>
    <div class="sum-grid">
      <div class="sum-card c-sale"><div class="lbl">এই মাসের বিক্রয়</div><div class="val" style="font-size:16px">window.${window.bn(wst)}</div></div>
      <div class="sum-card"><div class="lbl">উপস্থিতি</div><div class="val" style="font-size:16px;color:var(--blue)">window.${att.length} দিন</div></div>
    </div>
    window.${lateCount>0?`<div class="warn-box">⚠️ এই মাসে ${lateCount} বার দেরিতে এসেছে</div>`:''}
    <div style="background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--border);margin-top:8px;">
      <div style="font-size:12px;color:var(--muted)">মূল বেতন: window.${sal?window.bn(sal.basic):'সেট হয়নি'}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">মাসিক টার্গেট: window.${sal?.monthlyTarget?window.bn(sal.monthlyTarget):'সেট হয়নি'}</div>
    </div>
    <div style="background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--border);margin-top:8px;">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">📁 ডকুমেন্টস</div>
      window.${docsHTML}
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
  // ✅ কাস্টম নাম চাই
  const customName=prompt('ডকুমেন্টের নাম দিন (খালি রাখলে ফাইলের নাম ব্যবহার হবে):', file.name.replace(/\.[^.]+window.$/,''));
  const docName=(customName&&customName.trim())?customName.trim():file.name;
  window.showToast('আপলোড হচ্ছে...');
  const result=await uploadDocToDrive(file);
  if(result){
    const {url, fileId}=typeof result==='object'?result:{url:result,fileId:null};
    const user=window.allUsers[uid];
    const docs=Array.isArray(user?.documents)?[...user.documents]:(user?.documents?Object.values(user.documents):[]);
    docs.push({name:docName,originalFile:file.name,url,fileId,type:file.type,uploadedAt:Date.now(),uploadedBy:window.CN,uploadedByUid:window.CU.uid});
    await window._update(window._ref(window._db,'users/'+uid),{documents:docs});
    window.showToast('✅ ডকুমেন্ট "'+docName+'" যোগ হয়েছে!');
    // folder view refresh
    if(typeof openWorkerFolder==='function') openWorkerFolder(uid);
    else if(typeof viewWorkerProfile==='function') viewWorkerProfile(uid);
  }
};

// ✅ ডকুমেন্ট ডিলেট — শুধু Admin
window.deleteWorkerDoc=async(uid, docIndex)=>{
  if(window.CR!=='admin'){window.showToast('শুধু Admin ডকুমেন্ট মুছতে পারবে!',true);return;}
  const user=window.allUsers[uid]; if(!user)return;
  const docs=Array.isArray(user.documents)?[...user.documents]:(user.documents?Object.values(user.documents):[]);
  const doc=docs[docIndex];
  if(!doc)return;

  if(!confirm('"'+doc.name+'" ডকুমেন্টটি সম্পূর্ণরূপে মুছে ফেলবেন? Firebase Database থেকে সম্পূর্ণ মুছে যাবে।'))return;

  window.loader(true);
  try{
    // ── ১. Firebase Database থেকে মুছি
    docs.splice(docIndex,1);
    await window._update(window._ref(window._db,'users/'+uid),{documents:docs});

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

    window.loader(false);
    window.showToast('✅ ডকুমেন্ট সম্পূর্ণ মুছে গেছে');
    if(typeof openWorkerFolder==='function') openWorkerFolder(uid);
    else if(typeof viewWorkerProfile==='function') viewWorkerProfile(uid);
  }catch(e){
    window.loader(false);
    window.showToast('মুছতে ব্যর্থ: '+e.message,true);
  }
};

window.downloadSalesPDF=()=>{
  const sales=Object.values(window.allSales).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const total=sales.reduce((s,i)=>s+(i.total||0),0);
  const rows=sales.map(s=>`<tr><td>${fmtDate(s.date)}</td><td>${s.shop}</td><td>${s.product}</td><td>${s.qty}</td><td>${bn(s.total)}</td><td>${s.payStatus==='paid'?'পরিশোধ':s.payStatus==='due'?'বাকি':'আংশিক'}</td><td>${s.workerName||''}</td></tr>`).join('');
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>বিক্রয় রিপোর্ট</title>
  <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f5a623;color:#000}h2{color:#333}.total{font-size:16px;font-weight:bold;margin-top:10px}</style></head>
  <body><h2>📊 বিক্রয় রিপোর্ট — NovaTEch BD</h2><p>মোট রেকর্ড: window.${sales.length} | প্রিন্ট: window.${new Date().toLocaleDateString('bn-BD')}</p>
  <table><tr><th>তারিখ</th><th>দোকান</th><th>পণ্য</th><th>পরিমাণ</th><th>মোট</th><th>পেমেন্ট</th><th>কর্মী</th></tr>window.${rows}</table>
  <div class="total">মোট বিক্রয়: window.${window.bn(total)}</div></body></html>`);
  w.document.close();setTimeout(()=>w.print(),500);
};
window.downloadExpensesPDF=()=>{
  const exps=Object.values(window.allExpenses).sort((a,b)=>(b.ts||0)-(a.ts||0));
  const total=exps.reduce((s,i)=>s+(i.amount||0),0);
  const rows=exps.map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${e.type}</td><td>${e.note||''}</td><td>${bn(e.amount)}</td><td>${e.workerName||''}</td><td>${e.status==='pending'?'অপেক্ষমান':e.status==='rejected'?'বাতিল':'অনুমোদিত'}</td></tr>`).join('');
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>খরচ রিপোর্ট</title>
  <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#e85d4a;color:#fff}h2{color:#333}.total{font-size:16px;font-weight:bold;margin-top:10px}</style></head>
  <body><h2>💸 খরচ রিপোর্ট — NovaTEch BD</h2><p>মোট রেকর্ড: window.${exps.length} | প্রিন্ট: window.${new Date().toLocaleDateString('bn-BD')}</p>
  <table><tr><th>তারিখ</th><th>ধরন</th><th>নোট</th><th>পরিমাণ</th><th>কর্মী</th><th>অবস্থা</th></tr>window.${rows}</table>
  <div class="total">মোট খরচ: window.${window.bn(total)}</div></body></html>`);
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
      <div style="font-size:16px;font-weight:700;color:#fff;text-align:center;margin-bottom:8px;">window.${title}</div>
      <div style="font-size:13px;color:var(--muted);text-align:center;line-height:1.6;margin-bottom:20px;">window.${body}</div>
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
  if (window.CR !== 'admin') { window.showToast('শুধু Admin করতে পারবে!', true); return; }
  showResetConfirm({
    title: 'সকলের বিক্রয় রিসেট',
    body: `মোট <b style="color:#fff">${Object.keys(window.allSales).length}টি</b> বিক্রয় রেকর্ড মুছে যাবে।<br>সব কর্মীর বিক্রয় শূন্য হবে।`,
    onConfirm: async () => {
      try {
        window.loader(true);
        // ✅ Archive করি — ভবিষ্যতে দেখার জন্য
        await window._set(window._ref(window._db, 'salesArchive/' + window.today()), window.allSales);
        // ✅ মূল ডেটা মুছি
        await window._remove(window._ref(window._db, 'sales'));
        // ✅ Audit log
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_sales', `${Object.keys(window.allSales).length}টি বিক্রয় রিসেট করা হয়েছে`);
        window.loader(false);
        window.showToast('✅ সকলের বিক্রয় রিসেট হয়েছে');
      } catch(e) { window.loader(false); window.showToast('রিসেট ব্যর্থ: ' + e.message, true); }
    }
  });
};

window.resetAllExpenses = async () => {
  if (window.CR !== 'admin') { window.showToast('শুধু Admin করতে পারবে!', true); return; }
  showResetConfirm({
    title: 'সকলের খরচ রিসেট',
    body: `মোট <b style="color:#fff">${Object.keys(window.allExpenses).length}টি</b> খরচ রেকর্ড মুছে যাবে।<br>সব কর্মীর খরচের হিসাব শূন্য হবে।`,
    onConfirm: async () => {
      try {
        window.loader(true);
        // ✅ Archive করি
        await window._set(window._ref(window._db, 'expensesArchive/' + window.today()), window.allExpenses);
        // ✅ মূল ডেটা মুছি
        await window._remove(window._ref(window._db, 'expenses'));
        // ✅ Allowances-ও reset করব কিনা জিজ্ঞেস করি না — শুধু expenses
        // ✅ Audit log
        if (typeof window.auditLog === 'function')
          window.auditLog('reset_expenses', `${Object.keys(window.allExpenses).length}টি খরচ রিসেট করা হয়েছে`);
        window.loader(false);
        window.showToast('✅ সকলের খরচ রিসেট হয়েছে');
      } catch(e) { window.loader(false); window.showToast('রিসেট ব্যর্থ: ' + e.message, true); }
    }
  });
};

// ══ Sales functions → window expose ══
window.renderDue          = renderDue;
window.renderExpList      = renderExpList;
window.renderMyAllowance  = renderMyAllowance;
window.renderAllowList    = renderAllowList;
window.renderProfile      = renderProfile;
window.renderReport       = renderReport;
window.renderUserList     = renderUserList;
window.renderTeams        = renderTeams;
window.renderStock        = renderStock;
window.renderAttendance   = renderAttendance;
window.renderLeaves       = renderLeaves;
window.renderSalary       = renderSalary;
window.renderCommSlabs    = renderCommSlabs;
window.renderProdChips    = renderProdChips;
window.loadAllWorkerSelects = loadAllWorkerSelects;
