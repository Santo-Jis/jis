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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set, push, get, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

async function uploadImageToFirebase(file, path){
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
  const result=await uploadDocToDrive(file);
  if(result){
    const docUrl = typeof result==='object' ? result.url : result;
    await push(ref(db,'documents/'+(uid||CU.uid)),{name:file.name,url:docUrl,type:file.type,uploadedBy:window.CN,ts:Date.now()});
    showToast('ডকুমেন্ট সংরক্ষিত ✓');
  }
};


// ══════════════════════════════════════════════════
//  Module Bridge — সব shared vars window এ expose
//  (core.js, sales.js etc এগুলো window থেকে নেবে)
// ══════════════════════════════════════════════════
window._auth   = auth;
window._db     = db;
window._ref    = ref;
window._push   = push;
window._set    = set;
window._get    = get;
window._onValue  = onValue;
window._update   = update;
window._remove   = remove;
window._signIn              = signInWithEmailAndPassword;
window._signOut             = signOut;
window._createUser          = createUserWithEmailAndPassword;
window._onAuthStateChanged  = onAuthStateChanged;
window._updatePassword      = updatePassword;
window.uploadImageToFirebase = uploadImageToFirebase;
window.uploadDocToDrive      = uploadDocToDrive;
