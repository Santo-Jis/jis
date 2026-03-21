// ══ PRINT CUSTOMER SHEET ══
window.printCustomerSheet=()=>{
  const custs=Object.values(window.allCustomers);
  if(!custs.length){window.showToast('কোনো কাস্টমার নেই!',true);return;}
  const now=new Date().toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
  const html='<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:16px;font-size:12px;}h1{color:#1E3A8A;font-size:16px;}table{width:100%;border-collapse:collapse;}th{background:#1E3A8A;color:#fff;padding:8px;}td{padding:7px;border-bottom:1px solid #e2e8f0;}</style></head><body><h1>NovaTEch BD - কাস্টমার তালিকা</h1><p>'+now+'</p><table><tr><th>#</th><th>দোকান</th><th>মালিক</th><th>রুট</th><th>ফোন</th></tr>'+custs.map((c,i)=>'<tr><td>'+(i+1)+'</td><td>'+c.name+'</td><td>'+(c.owner||'-')+'</td><td>'+(window.allRoutes[c.routeId]?.name||'-')+'</td><td>'+(c.smsNum||c.waNum||'-')+'</td></tr>').join('')+'</table></body></html>';
  const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
};

// ══ P&L ══
window.refreshPL=()=>{
  const el=window.$('plContent');if(!el)return;
  const vat=parseFloat(window.$('vatRate')?.value)||0,gst=parseFloat(window.$('gstRate')?.value)||0;
  const sales=Object.values(window.allSales),exps=Object.values(window.allExpenses);
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
  el.innerHTML=rows.map(r=>'<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:'+(r.bold?'2px solid var(--border)':'1px solid transparent')+'">'+'<span style="font-size:12px;'+(r.bold?'font-weight:700':'')+'">'+r.label+'</span>'+'<span style="font-size:'+(r.bold?'16':'13')+'px;font-weight:'+(r.bold?'700':'500')+';color:'+r.color+';">'+(r.val>=0?'+':'')+window.bn(Math.abs(r.val))+'</span></div>').join('');
};

// ══ INVOICE ══
window.generateInvoice=(saleId)=>{
  window._currentInvoiceSaleId = saleId; // ✅ share-এর জন্য track করি
  const s=window.allSales[saleId];if(!s)return;
  const ic=window.$('invoiceContent');if(!ic)return;

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
  const payLogs = Object.values(window.allPaymentLogs||{})
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
          window.${hasHistory?`<div style="width:2px;flex:1;background:#e2e8f0;min-height:20px;"></div>`:''}
        </div>
        <div style="flex:1;padding-bottom:10px;">
          <div style="font-size:12px;font-weight:700;color:#1a202c;">🛍️ বিক্রয় সম্পন্ন</div>
          <div style="font-size:10px;color:#64748b;">
            window.${s.ts?new Date(s.ts).toLocaleString('bn-BD',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):''}
          </div>
          <div style="font-size:12px;margin-top:3px;">
            মোট: <b>window.${window.bn(s.total)}</b>
            window.${originalCash>0?` · নগদ: <span style="color:#059669;font-weight:600;">${bn(originalCash)}</span>`:''}
          </div>
          <div style="background:#fef2f2;border-radius:6px;padding:4px 8px;margin-top:4px;
            font-size:12px;font-weight:700;color:#dc2626;display:inline-block;">
            ⚠️ বাকি রাখা হয়েছে: window.${window.bn(originalDue)}
          </div>
        </div>
      </div>

      <!-- পরবর্তী পেমেন্টগুলো -->
      window.${payLogs.map((p, i) => {
        const isLast = i === payLogs.length - 1;
        const payTime = p.ts
          ? new Date(p.ts).toLocaleString('bn-BD',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})
          : p.date||'';
        return `<div style="display:flex;gap:10px;margin-bottom:8px;">
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="width:10px;height:10px;border-radius:50%;background:#059669;flex-shrink:0;margin-top:3px;"></div>
            window.${!isLast?`<div style="width:2px;flex:1;background:#e2e8f0;min-height:20px;"></div>`:''}
          </div>
          <div style="flex:1;padding-bottom:${isLast?0:8}px;">
            <div style="font-size:12px;font-weight:700;color:#059669;">💰 বাকি পরিশোধ</div>
            <div style="font-size:10px;color:#64748b;">window.${payTime}</div>
            <div style="font-size:12px;margin-top:3px;">
              <b>window.${window.bn(p.amount)}</b> আদায় করেছেন
              <span style="font-weight:700;">window.${p.collectedBy||'–'}</span>
            </div>
          </div>
        </div>`;
      }).join('')}

      <!-- বর্তমান অবস্থা -->
      <div style="border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;
        margin-top:4px;text-align:center;
        window.${s.due > 0
          ? 'background:#fef2f2;border:1px solid #fecaca;color:#dc2626;'
          : 'background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;'}">
        window.${s.due > 0
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
        <div style="font-size:15px;font-weight:800;letter-spacing:1px;">window.${invoiceNo}</div>
      </div>
    </div>

    <!-- দোকান ও তারিখ -->
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;
      background:#f8fafc;border-radius:8px;padding:10px 12px;">
      <div>
        <div style="font-size:10px;color:#64748b;margin-bottom:2px;">দোকান</div>
        <div style="font-weight:700;font-size:14px;">window.${s.shop||'–'}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#64748b;margin-bottom:2px;">তারিখ</div>
        <div style="font-weight:600;font-size:13px;">window.${window.fmtDate(s.date)}</div>
        <div style="font-size:10px;color:#94a3b8;">window.${s.ts?new Date(s.ts).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'}):''}</div>
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
        <td style="padding:8px;">window.${s.product||'–'}</td>
        <td style="padding:8px;text-align:center;">window.${s.qty}</td>
        <td style="padding:8px;text-align:right;">window.${window.bn(s.sellPrice||0)}</td>
        <td style="padding:8px;text-align:right;font-weight:600;">window.${window.bn((s.sellPrice||0)*s.qty)}</td>
      </tr>
    </table>

    <!-- হিসাব -->
    <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
      window.${s.disc>0?`<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;padding:3px 0;">
        <span>ডিসকাউন্ট (window.${s.disc}%)</span>
        <span style="color:#ef4444;">-window.${window.bn(Math.round((s.sellPrice||0)*s.qty*s.disc/100))}</span>
      </div>`:''}
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #e2e8f0;
        font-size:16px;font-weight:800;color:#059669;margin-top:4px;">
        <span>মোট পরিশোধযোগ্য</span>
        <span>window.${window.bn(s.total)}</span>
      </div>
      window.${s.due>0&&s.payStatus==='partial'?`
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;">
        <span style="color:#64748b;">নগদ প্রদত্ত</span>
        <span style="color:#059669;font-weight:600;">window.${window.bn(cashPaid)}</span>
      </div>`:''}
      window.${s.due>0?`<div style="display:flex;justify-content:space-between;font-size:13px;
        font-weight:700;padding:4px 0;color:#ef4444;">
        <span>বর্তমান বাকি</span><span>window.${window.bn(s.due)}</span>
      </div>`:''}
    </div>

    <!-- ✅ Payment History Timeline -->
    window.${payHistoryHTML}

    <!-- Payment status badge -->
    <div style="background:${st.bg};border:1px solid ${st.border};border-radius:8px;
      padding:8px 12px;margin-bottom:10px;text-align:center;
      font-size:13px;font-weight:700;color:window.${st.color};">
      window.${st.label}
    </div>

    <!-- কর্মী ও OTP info -->
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;
      padding:8px 0;border-top:1px solid #e2e8f0;margin-bottom:8px;">
      <span>👤 window.${s.workerName||'–'}</span>
      window.${otpStr?`<span>🔐 ${otpStr}</span>`:''}
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
  const s = saleId ? window.allSales[saleId] : null;
  if(!s){ window.showToast('বিক্রয় তথ্য পাওয়া যায়নি!',true); return; }

  // কাস্টমারের WhatsApp নম্বর
  const cust = window.allCustomers[s.shopId];
  const waNum = (cust?.waNum||cust?.smsNum||'').replace(/[^0-9]/g,'');

  // ✅ সুন্দর formatted invoice text
  const line = '━━━━━━━━━━━━━━━━━━━━';
  const cashPaid = Math.round((s.total||0)-(s.due||0));

  // Payment logs এই sale-এর
  const payLogs = Object.values(window.allPaymentLogs||{})
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
window.${line}
🧾 *window.${s.invoiceNo||'–'}*
window.${line}
🏪 *দোকান:* window.${s.shop}
📅 *তারিখ:* window.${s.date}window.${s.ts?' · '+new Date(s.ts).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'}):''}
window.${line}
📦 *পণ্য:* window.${s.product}
🔢 *পরিমাণ:* window.${s.qty} পিস
💲 *একক মূল্য:* ৳window.${Math.round(s.sellPrice||0).toLocaleString('bn-BD')}window.${s.disc>0?`\n🏷️ *ডিসকাউন্ট:* ${s.disc}%`:''}
window.${line}
💰 *মোট:* ৳window.${Math.round(s.total||0).toLocaleString('bn-BD')}window.${s.payStatus==='partial'?`\n✅ *নগদ প্রদত্ত:* ৳${cashPaid.toLocaleString('bn-BD')}`:''}window.${payHistory}
window.${line}
👤 *কর্মী:* window.${s.workerName||'–'}window.${s.otpConfirmed?'\n🔐 *OTP:* নিশ্চিত ✅':''}
window.${line}
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

  window.showToast('ছবি তৈরি হচ্ছে...');

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
      window.showToast('📸 ছবি ডাউনলোড হয়েছে — WhatsApp-এ পাঠান');
    }, 'image/png');

  } catch(e) {
    window.showToast('ছবি তৈরি ব্যর্থ!', true);
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
      window.${ic.innerHTML}
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

