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
  const el=window.$('foldersContent');if(!el)return;
  if(tab==='workers')renderWorkerFolders();
  else if(tab==='customers')renderCustomerFolders();
  else if(tab==='daily')renderDailyReport();
  else if(tab==='monthly')renderMonthlyReport();
}

// ── কর্মী ফোল্ডার ──
function renderWorkerFolders(){
  const el=window.$('foldersContent');if(!el)return;
  const workers=Object.entries(window.allUsers).sort((a,b)=>(a[1].name||'').localeCompare(b[1].name||''));
  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      window.${workers.map(([uid,u])=>`
        <div onclick="openWorkerFolder('${uid}')" style="background:var(--card);border-radius:12px;padding:14px;border:1px solid var(--border);cursor:pointer;text-align:center;transition:border-color .2s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 8px;overflow:hidden;">
            window.${u.photoURL?`<img src="${u.photoURL}" style="width:48px;height:48px;object-fit:cover;">`:'👤'}
          </div>
          <div style="font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">window.${u.name}</div>
          <span class="role-badge role-${u.role}" style="font-size:9px">window.${u.role}</span>
        </div>`).join('')}
    </div>`;
}

window.openWorkerFolder=(uid)=>{
  const u=window.allUsers[uid];if(!u)return;
  const el=window.$('foldersContent');if(!el)return;
  const now=new Date();

  // ── ডেটা সংগ্রহ
  const mSales=Object.values(window.allSales).filter(s=>{
    const d=new Date(s.date);
    return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const mExp=Object.values(window.allExpenses).filter(e=>{
    const d=new Date(e.date);
    return e.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const allWorkerSales=Object.values(window.allSales).filter(s=>s.uid===uid);
  const mAtt=Object.values(window.allAttendance).filter(a=>{
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

  const sal = window.allSalaries[uid]||null;
  const docs= Array.isArray(u.documents)?u.documents:(u.documents?Object.values(u.documents):[]);

  // কমিশন
  const dailyCommMap={};
  mSales.filter(s=>isCommEligible(s))
    .forEach(s=>{dailyCommMap[s.date]=(dailyCommMap[s.date]||0)+s.total;});
  const earnedComm=Object.values(dailyCommMap).reduce((a,v)=>a+calcCommission(v,window.allCommConfig),0);

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
        window.${u.photoURL?`<img src="${u.photoURL}" style="width:72px;height:72px;object-fit:cover;">`:'👤'}
      </div>
      <div style="font-size:17px;font-weight:700;">window.${u.name}</div>
      <span class="role-badge role-${u.role}" style="margin-top:4px;display:inline-block;">window.${u.role==='admin'?'অ্যাডমিন':u.role==='manager'?'ম্যানেজার':'কর্মী'}</span>
      <div style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.8;">
        📧 window.${u.email||'–'}<br>
        📱 window.${u.phone||'–'} &nbsp;|&nbsp; 💬 WA: window.${u.waNum||'–'}<br>
        🏠 window.${u.address||'–'}<br>
        <span style="color:${u.status==='active'?'var(--green)':'var(--red)'};">● window.${u.status==='active'?'সক্রিয়':'নিষ্ক্রিয়'}</span>
      </div>
    </div>

    <!-- এই মাসের সারসংক্ষেপ -->
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px;">📅 এই মাসের সারসংক্ষেপ</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
      <div class="sum-card c-sale"><div class="lbl">বিক্রয়</div><div class="val">window.${window.bn(totalSale)}</div></div>
      window.${window.CR==='admin'?`<div class="sum-card" style="border-color:var(--green)"><div class="lbl">লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>`:''}
      <div class="sum-card c-exp"><div class="lbl">খরচ</div><div class="val">window.${window.bn(totalExp)}</div></div>
      <div class="sum-card c-due"><div class="lbl">বাকি</div><div class="val">window.${window.bn(totalDue)}</div></div>
    </div>

    <!-- টার্গেট -->
    window.${sal?.monthlyTarget>0?`<div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-size:13px;font-weight:700;">🎯 টার্গেট অর্জন</div>
        <div style="font-size:18px;font-weight:700;color:${targetColor};">window.${targetPct}%</div>
      </div>
      <div style="background:var(--border);border-radius:6px;height:8px;overflow:hidden;">
        <div style="background:${targetColor};height:100%;border-radius:6px;width:${targetPct}%;transition:width .5s;"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:5px;">window.${window.bn(totalSale)} / window.${window.bn(sal.monthlyTarget)}</div>
    </div>`:''}

    <!-- কমিশন -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">💎 কমিশন</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:rgba(46,204,138,.1);border:1px solid var(--green);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:var(--muted);">✅ অর্জিত</div>
          <div style="font-size:18px;font-weight:700;color:var(--green);margin-top:3px;">window.${window.bn(earnedComm)}</div>
        </div>
        <div style="background:rgba(74,158,255,.1);border:1px solid var(--blue);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:var(--muted);">📊 মূল বেতন</div>
          <div style="font-size:18px;font-weight:700;color:var(--blue);margin-top:3px;">window.${sal?window.bn(sal.basic):'–'}</div>
        </div>
      </div>
    </div>

    <!-- উপস্থিতি -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">⏰ উপস্থিতি — window.${mAtt.length} দিন</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;margin-bottom:10px;">
        <div style="background:rgba(46,204,138,.1);border-radius:8px;padding:8px;">
          <div style="font-size:22px;font-weight:700;color:var(--green);">window.${mAtt.length}</div>
          <div style="font-size:10px;color:var(--muted);">উপস্থিতি</div>
        </div>
        <div style="background:rgba(232,93,74,.1);border-radius:8px;padding:8px;">
          <div style="font-size:22px;font-weight:700;color:var(--red);">window.${lateCount}</div>
          <div style="font-size:10px;color:var(--muted);">দেরিতে</div>
        </div>
        <div style="background:rgba(74,158,255,.1);border-radius:8px;padding:8px;">
          <div style="font-size:22px;font-weight:700;color:var(--blue);">window.${otDays}</div>
          <div style="font-size:10px;color:var(--muted);">ওভারটাইম</div>
        </div>
      </div>
      <!-- ক্যালেন্ডার ডট -->
      <div style="display:flex;flex-wrap:wrap;gap:3px;">
        window.${mAtt.sort((a,b)=>a.date.localeCompare(b.date)).map(a=>`
          <div title="${a.date} ইন:${a.checkIn?fmtTime(a.checkIn):'–'} আউট:${a.checkOut?fmtTime(a.checkOut):'চলছে'}"
            style="width:28px;height:28px;border-radius:6px;background:${a.isLate?'rgba(232,93,74,.3)':'rgba(46,204,138,.3)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;border:1px solid ${a.isLate?'var(--red)':'var(--green)'};">
            window.${a.date.slice(8)}
          </div>`).join('')}
      </div>
      window.${mAtt.length>0?`<div style="font-size:10px;color:var(--muted);margin-top:5px;">🟢 সময়মতো &nbsp; 🔴 দেরিতে &nbsp; মোট কর্মঘণ্টা: ${totalHours.toFixed(1)}ঘ</div>`:''}
    </div>

    <!-- বিক্রয় চার্ট -->
    window.${days.length>0?`<div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📈 শেষ window.${days.length} দিনের বিক্রয়</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:80px;">
        window.${days.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="font-size:8px;color:var(--muted);">window.${window.bn(dailyMap[d]).replace('৳','')}</div>
          <div style="width:100%;background:var(--accent);border-radius:4px 4px 0 0;height:${Math.max(4,(dailyMap[d]/maxVal*60))}px;"></div>
          <div style="font-size:8px;color:var(--muted);">window.${d.slice(8)}</div>
        </div>`).join('')}
      </div>
    </div>`:''}

    <!-- শীর্ষ কাস্টমার -->
    window.${topCusts.length>0?`<div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">🏆 শীর্ষ কাস্টমার</div>
      window.${topCusts.map(([shop,total],i)=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;">
        <span>window.${['🥇','🥈','🥉','4️⃣','5️⃣'][i]||''} window.${shop}</span>
        <span style="color:var(--accent);font-weight:600;">window.${window.bn(total)}</span>
      </div>`).join('')}
    </div>`:''}

    <!-- বিক্রয় তালিকা -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">🛍 বিক্রয় তালিকা — window.${mSales.length}টি</div>
      window.${mSales.length===0?'<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px;">এই মাসে কোনো বিক্রয় নেই</div>':
        mSales.slice(0,15).map(s=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;">
          <div>
            <div style="font-weight:600;">window.${s.shop}</div>
            <div style="color:var(--muted);font-size:11px;">window.${s.product} × window.${s.qty} পিস · window.${window.fmtDate(s.date)}</div>
            window.${s.photoUrl?`<a href="${s.photoUrl}" target="_blank" style="font-size:10px;color:var(--blue);">📷 রশিদ</a>`:''}
          </div>
          <div style="text-align:right;">
            <div style="color:var(--accent);font-weight:600;">window.${window.bn(s.total)}</div>
            window.${s.due>0?`<div style="font-size:10px;color:var(--red);">বাকি ${bn(s.due)}</div>`:`<div style="font-size:10px;color:var(--green);">✅</div>`}
          </div>
        </div>`).join('')
      }
      window.${mSales.length>15?`<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:6px;">আরও ${mSales.length-15}টি</div>`:''}
    </div>

    <!-- খরচ তালিকা -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">💸 খরচ তালিকা — window.${mExp.length}টি</div>
      window.${mExp.length===0?'<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px;">এই মাসে কোনো খরচ নেই</div>':
        mExp.map(e=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;">
          <div>
            <div style="font-weight:600;">window.${e.type}</div>
            <div style="color:var(--muted);font-size:11px;">window.${e.note||''} · window.${window.fmtDate(e.date)}</div>
          </div>
          <div>
            <div style="color:var(--red);font-weight:600;">window.${window.bn(e.amount)}</div>
            <div style="font-size:10px;color:${e.status==='approved'?'var(--green)':e.status==='rejected'?'var(--red)':'var(--accent)'};">
              window.${e.status==='approved'?'✅ অনুমোদিত':e.status==='rejected'?'❌ বাতিল':'⏳ অপেক্ষায়'}
            </div>
          </div>
        </div>`).join('')
      }
    </div>

    <!-- ডকুমেন্টস -->
    <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📁 ডকুমেন্টস — window.${docs.length}টি</div>
      window.${docs.length===0
        ? '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">📂<br>কোনো ডকুমেন্ট আপলোড হয়নি</div>'
        : docs.map((d,i)=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface);border-radius:10px;margin-bottom:7px;border:1px solid var(--border);">
            <a href="${d.url}" target="_blank" style="display:flex;align-items:center;gap:10px;flex:1;text-decoration:none;color:var(--text);min-width:0;">
              <div style="width:36px;height:36px;border-radius:8px;background:rgba(74,158,255,.15);border:1px solid var(--blue);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">
                window.${d.name&&(d.name.endsWith('.pdf')||d.originalFile?.endsWith('.pdf'))?'📄':d.name&&(d.name.endsWith('.jpg')||d.name.endsWith('.png')||d.originalFile?.endsWith('.jpg'))?'🖼️':'📎'}
              </div>
              <div style="min-width:0;">
                <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">window.${d.name||'ফাইল'}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:1px;">window.${d.uploadedBy||''} · window.${d.uploadedAt?new Date(d.uploadedAt).toLocaleDateString('bn-BD'):''}</div>
                <div style="font-size:11px;color:var(--blue);margin-top:2px;">Drive এ দেখুন →</div>
              </div>
            </a>
            window.${window.CR==='admin'?`<button onclick="deleteWorkerDoc('${uid}',${i})"
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
          <div style="font-size:18px;font-weight:700;color:var(--accent);">window.${window.bn(allTimeSale)}</div>
          <div style="font-size:10px;color:var(--muted);">মোট বিক্রয় (সবসময়)</div>
        </div>
        <div style="background:var(--surface);border-radius:8px;padding:10px;">
          <div style="font-size:18px;font-weight:700;color:var(--blue);">window.${allWorkerSales.length}</div>
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
  const el=window.$('foldersContent');if(!el)return;
  const custs=Object.entries(window.allCustomers).sort((a,b)=>(a[1].name||'').localeCompare(b[1].name||''));
  el.innerHTML=`
    <div style="margin-bottom:10px">
      <input class="inp" placeholder="🔍 কাস্টমার খুঁজুন..." oninput="filterCustomerFolders(this.value)" style="margin:0">
    </div>
    <div id="custFolderGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      window.${custs.map(([id,c])=>{
        const due=Object.values(window.allSales).filter(s=>s.shopId===id&&s.due>0).reduce((a,s)=>a+s.due,0);
        const orders=Object.values(window.allSales).filter(s=>s.shopId===id).length;
        return`<div onclick="openCustomerFolder('${id}')" style="background:var(--card);border-radius:12px;padding:12px;border:1px solid ${due>0?'var(--red)':'var(--border)'};cursor:pointer;text-align:center">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 6px;overflow:hidden;">
            window.${c.photoURL?`<img src="${c.photoURL}" style="width:48px;height:48px;object-fit:cover;">`:'🏪'}
          </div>
          <div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">window.${c.name}</div>
          <div style="font-size:10px;color:var(--muted)">window.${orders} অর্ডার</div>
          window.${due>0?`<div style="font-size:10px;color:var(--red);font-weight:600">বাকি ${bn(due)}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
}

window.filterCustomerFolders=(q)=>{
  const grid=window.$('custFolderGrid');if(!grid)return;
  const custs=Object.entries(window.allCustomers).filter(([,c])=>!q||(c.name||'').toLowerCase().includes(q.toLowerCase()));
  grid.innerHTML=custs.map(([id,c])=>{
    const due=Object.values(window.allSales).filter(s=>s.shopId===id&&s.due>0).reduce((a,s)=>a+s.due,0);
    const orders=Object.values(window.allSales).filter(s=>s.shopId===id).length;
    return`<div onclick="openCustomerFolder('${id}')" style="background:var(--card);border-radius:12px;padding:12px;border:1px solid ${due>0?'var(--red)':'var(--border)'};cursor:pointer;text-align:center">
      <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--blue));display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 6px;overflow:hidden;">
        window.${c.photoURL?`<img src="${c.photoURL}" style="width:48px;height:48px;object-fit:cover;">`:'🏪'}
      </div>
      <div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">window.${c.name}</div>
      <div style="font-size:10px;color:var(--muted)">window.${orders} অর্ডার</div>
      window.${due>0?`<div style="font-size:10px;color:var(--red);font-weight:600">বাকি ${bn(due)}</div>`:''}
    </div>`;
  }).join('');
};

window.openCustomerFolder=(custId)=>{
  const c=window.allCustomers[custId];if(!c)return;
  const el=window.$('foldersContent');if(!el)return;
  const route=window.allRoutes[c.routeId];
  const cs=Object.values(window.allSales).filter(s=>s.shopId===custId).sort((a,b)=>b.ts-a.ts);
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
        window.${c.photoURL?`<img src="${c.photoURL}" style="width:64px;height:64px;object-fit:cover;">`:'🏪'}
      </div>
      <div style="font-size:16px;font-weight:700">window.${c.name}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">👤 window.${c.owner||'-'} · 🗺️ window.${route?route.name:'-'}</div>
      <div style="font-size:12px;color:var(--muted)">📱 window.${c.waNum||'-'}</div>
      window.${c.note?`<div style="font-size:11px;color:var(--muted);margin-top:4px">${c.note}</div>`:''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
      <div class="sum-card c-sale"><div class="lbl">মোট বিক্রয়</div><div class="val" style="font-size:14px">window.${window.bn(totalSale)}</div></div>
      <div class="sum-card c-due"><div class="lbl">বাকি</div><div class="val" style="font-size:14px">window.${window.bn(totalDue)}</div></div>
      <div class="sum-card"><div class="lbl">অর্ডার</div><div class="val" style="font-size:14px;color:var(--blue)">window.${totalOrders}</div></div>
    </div>
    window.${c.lat&&c.lng?`<div style="border-radius:12px;overflow:hidden;border:1px solid var(--border);margin-bottom:10px">
      <iframe src="https://maps.google.com/maps?q=${c.lat},${c.lng}&z=16&output=embed" width="100%" height="150" style="border:none;display:block;" loading="lazy"></iframe>
      <div style="padding:8px 12px;background:var(--card);font-size:11px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--muted)">📍 window.${parseFloat(c.lat).toFixed(5)}, window.${parseFloat(c.lng).toFixed(5)}</span>
        <button onclick="openMap(${c.lat},${c.lng})" style="font-size:11px;padding:4px 10px;background:var(--accent);border:none;border-radius:6px;color:#000;cursor:pointer;font-family:inherit">Maps খুলুন</button>
      </div>
    </div>`:''}
    window.${months.length>0?`<div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">📈 মাসওয়ারি ক্রয়</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:70px">
        window.${months.map(m=>{const maxM=Math.max(...months.map(x=>monthMap[x]),1);return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="width:100%;background:var(--blue);border-radius:3px 3px 0 0;height:${Math.max(4,monthMap[m]/maxM*60)}px"></div>
          <div style="font-size:8px;color:var(--muted)">window.${m.slice(5)}</div>
        </div>`}).join('')}
      </div>
    </div>`:''}
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🛍 ক্রয় ইতিহাস</div>
      window.${cs.slice(0,15).map(s=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div>
          <div style="font-weight:600">window.${s.product} × window.${s.qty}</div>
          <div style="color:var(--muted);font-size:11px">📅 window.${window.fmtDate(s.date)} · 👤 window.${s.workerName||'–'}</div>
        </div>
        <div style="text-align:right">
          <div style="color:var(--accent)">window.${window.bn(s.total)}</div>
          window.${s.due>0?`<div style="font-size:10px;color:var(--red)">বাকি ${bn(s.due)}</div>`:'<div style="font-size:10px;color:var(--green)">✅ পরিশোধ</div>'}
        </div>
      </div>`).join('')||'<div class="empty">কোনো অর্ডার নেই</div>'}
    </div>`;
};

// ── দৈনিক রিপোর্ট ──
function renderDailyReport(){
  const el=window.$('foldersContent');if(!el)return;
  const today_str=window.today();
  // তারিখ selector
  const allDates=[...new Set(Object.values(window.allSales).map(s=>s.date).filter(Boolean))].sort().reverse().slice(0,30);

  el.innerHTML=`
    <div style="margin-bottom:10px">
      <label style="font-size:12px;color:var(--muted)">তারিখ সিলেক্ট করুন</label>
      <select class="inp" id="dailyDateSel" onchange="renderDailyForDate(this.value)" style="margin-top:4px">
        window.${allDates.map(d=>`<option value="${d}" ${d===today_str?'selected':''}>${d}</option>`).join('')}
      </select>
    </div>
    <div id="dailyReportContent"></div>`;
  renderDailyForDate(allDates[0]||today_str);
}

window.renderDailyForDate=(date)=>{
  const el=window.$('dailyReportContent');if(!el)return;
  const daySales=Object.values(window.allSales).filter(s=>s.date===date);
  const dayExp=Object.values(window.allExpenses).filter(e=>e.date===date);
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
      <div class="sum-card c-sale"><div class="lbl">মোট বিক্রয়</div><div class="val">window.${window.bn(totalSale)}</div></div>
      window.${window.CR==='admin'?`<div class="sum-card" style="border-color:var(--green)"><div class="lbl">লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>`:''}
      <div class="sum-card" style="border-color:var(--red)"><div class="lbl">খরচ</div><div class="val" style="color:var(--red)">window.${window.bn(totalExp)}</div></div>
      window.${window.CR==='admin'?`<div class="sum-card" style="border-color:${netProfit>=0?'var(--green)':'var(--red)'}"><div class="lbl">নিট লাভ</div><div class="val" style="color:${netProfit>=0?'var(--green)':'var(--red)'}">${bn(netProfit)}</div></div>`:''}
    </div>
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">👤 কর্মীওয়ারি বিক্রয়</div>
      window.${Object.values(workerMap).sort((a,b)=>b.total-a.total).map(w=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">
          <div><div style="font-weight:600">window.${w.name}</div><div style="color:var(--muted);font-size:11px">window.${w.orders}টি অর্ডার</div></div>
          <div style="color:var(--accent);font-weight:700">window.${window.bn(w.total)}</div>
        </div>`).join('')||'<div class="empty">কোনো বিক্রয় নেই</div>'}
    </div>
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🛍 বিক্রয় তালিকা (window.${daySales.length}টি)</div>
      window.${daySales.map(s=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div><div style="font-weight:600">window.${s.shop}</div><div style="color:var(--muted)">window.${s.product}×window.${s.qty} · window.${s.workerName||'–'}</div></div>
        <div style="text-align:right"><div style="color:var(--accent)">window.${window.bn(s.total)}</div>window.${s.due>0?`<div style="font-size:10px;color:var(--red)">বাকি ${bn(s.due)}</div>`:''}</div>
      </div>`).join('')||'<div class="empty">কোনো বিক্রয় নেই</div>'}
    </div>
    window.${dayExp.length>0?`<div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border)">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">💸 খরচ তালিকা</div>
      window.${dayExp.map(e=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <div><div>window.${e.type}</div><div style="color:var(--muted)">window.${e.workerName||'–'}</div></div>
        <div style="color:var(--red)">window.${window.bn(e.amount)}</div>
      </div>`).join('')}
    </div>`:''}`;
};

// ── মাসিক রিপোর্ট ──
function renderMonthlyReport(){
  const el=window.$('foldersContent');if(!el)return;
  const now=new Date();
  const months=[];
  for(let i=0;i<6;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:`${d.getFullYear()} - ${d.getMonth()+1} মাস`});
  }
  el.innerHTML=`
    <div style="margin-bottom:10px">
      <select class="inp" id="monthlyMonthSel" onchange="renderMonthlyForMonth(this.value)" style="margin:0">
        window.${months.map(m=>`<option value="${m.key}">${m.label}</option>`).join('')}
      </select>
    </div>
    <div id="monthlyReportContent"></div>`;
  renderMonthlyForMonth(months[0].key);
}

window.renderMonthlyForMonth=(month)=>{
  const el=window.$('monthlyReportContent');if(!el)return;
  const mSales=Object.values(window.allSales).filter(s=>s.date?.startsWith(month));
  const mExp=Object.values(window.allExpenses).filter(e=>e.date?.startsWith(month));
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
      <div class="sum-card c-sale"><div class="lbl">মোট বিক্রয়</div><div class="val">window.${window.bn(totalSale)}</div></div>
      window.${window.CR==='admin'?`<div class="sum-card" style="border-color:var(--green)"><div class="lbl">মোট লাভ</div><div class="val" style="color:var(--green)">${bn(totalProfit)}</div></div>`:''}
      <div class="sum-card" style="border-color:var(--red)"><div class="lbl">মোট খরচ</div><div class="val" style="color:var(--red)">window.${window.bn(totalExp)}</div></div>
      <div class="sum-card" style="border-color:var(--blue)"><div class="lbl">অর্ডার</div><div class="val" style="color:var(--blue)">window.${mSales.length}টি</div></div>
    </div>
    window.${days.length>0?`<div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">📈 দৈনিক বিক্রয়</div>
      <div style="display:flex;align-items:flex-end;gap:2px;height:70px;overflow-x:auto">
        window.${days.map(d=>`<div style="flex:0 0 auto;width:${Math.max(16,280/days.length)}px;display:flex;flex-direction:column;align-items:center;gap:1px">
          <div style="width:100%;background:var(--accent);border-radius:2px 2px 0 0;height:${Math.max(3,dm[d]/maxD*60)}px"></div>
          <div style="font-size:7px;color:var(--muted)">window.${d.slice(8)}</div>
        </div>`).join('')}
      </div>
    </div>`:''}
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">👤 কর্মীওয়ারি বিক্রয়</div>
      window.${Object.values(wm).sort((a,b)=>b.total-a.total).map(w=>`
        <div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
            <span style="font-weight:600">window.${w.name}</span><span style="color:var(--accent)">window.${window.bn(w.total)}</span>
          </div>
          <div style="background:var(--surface);border-radius:4px;height:6px;overflow:hidden">
            <div style="background:var(--accent);height:100%;border-radius:4px;width:${(w.total/Math.max(...Object.values(wm).map(x=>x.total),1)*100).toFixed(0)}%"></div>
          </div>
        </div>`).join('')||'<div class="empty">নেই</div>'}
    </div>
    <div style="background:var(--card);border-radius:12px;padding:12px;border:1px solid var(--border)">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">🛍 সেরা পণ্য</div>
      window.${Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([p,q])=>`
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
          <span>window.${p}</span><span style="color:var(--blue);font-weight:600">window.${q} পিস</span>
        </div>`).join('')||'<div class="empty">নেই</div>'}
    </div>`;
};

// কর্মীর PDF রিপোর্ট
window.printWorkerReport=(uid)=>{
  const u=window.allUsers[uid];if(!u)return;
  const now=new Date();
  const mSales=Object.values(window.allSales).filter(s=>{const d=new Date(s.date);return s.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const mExp=Object.values(window.allExpenses).filter(e=>{const d=new Date(e.date);return e.uid===uid&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const totalSale=mSales.reduce((a,s)=>a+(s.total||0),0);
  const totalProfit=mSales.reduce((a,s)=>a+(s.profit||0),0);
  const totalExp=mExp.reduce((a,e)=>a+(e.amount||0),0);
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${u.name} — রিপোর্ট</title>
  <style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h1{color:#f5a623}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #ddd;padding:7px;font-size:12px}th{background:#f5a623;color:#000}.summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:10px 0}.box{background:#f9f9f9;border-radius:8px;padding:10px;text-align:center}.box-val{font-size:18px;font-weight:bold;color:#f5a623}</style>
  </head><body>
  <h1>📊 window.${u.name} — মাসিক রিপোর্ট</h1>
  <p>মাস: window.${now.getFullYear()}-window.${now.getMonth()+1} | রিপোর্ট তৈরি: window.${new Date().toLocaleDateString('bn-BD')}</p>
  <p>📧 window.${u.email} | 📱 window.${u.phone||'-'} | ভূমিকা: window.${u.role}</p>
  <div class="summary">
    <div class="box"><div>মোট বিক্রয়</div><div class="box-val">৳window.${Math.round(totalSale).toLocaleString()}</div></div>
    <div class="box"><div>লাভ</div><div class="box-val" style="color:green">৳window.${Math.round(totalProfit).toLocaleString()}</div></div>
    <div class="box"><div>খরচ</div><div class="box-val" style="color:red">৳window.${Math.round(totalExp).toLocaleString()}</div></div>
  </div>
  <h3>বিক্রয় তালিকা</h3>
  <table><tr><th>তারিখ</th><th>দোকান</th><th>পণ্য</th><th>পরিমাণ</th><th>মোট</th><th>স্ট্যাটাস</th></tr>
  window.${mSales.map(s=>`<tr><td>${s.date}</td><td>${s.shop}</td><td>${s.product}</td><td>${s.qty}</td><td>৳${Math.round(s.total)}</td><td>${s.payStatus}</td></tr>`).join('')}
  </table>
  <h3>খরচ তালিকা</h3>
  <table><tr><th>তারিখ</th><th>ধরন</th><th>নোট</th><th>পরিমাণ</th></tr>
  window.${mExp.map(e=>`<tr><td>${e.date}</td><td>${e.type}</td><td>${e.note||''}</td><td>৳${Math.round(e.amount)}</td></tr>`).join('')}
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

