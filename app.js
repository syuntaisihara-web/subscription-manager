const STORAGE_KEY = 'subscription_manager_v01';
const SETTINGS_KEY = 'subscription_manager_settings_v01';

const sample = {
  subscriptions: [
    {id:'s1',name:'Netflix',category:'動画',paymentMethod:'クレジットカード',price:1590,currency:'JPY',cycle:'monthly',customInterval:1,customUnit:'months',startDate:'2025-01-15',status:'active',memo:''},
    {id:'s2',name:'iCloud+',category:'クラウド',paymentMethod:'クレジットカード',price:1300,currency:'JPY',cycle:'monthly',customInterval:1,customUnit:'months',startDate:'2025-02-01',status:'active',memo:''},
    {id:'s3',name:'Amazon Prime',category:'会員',paymentMethod:'クレジットカード',price:5900,currency:'JPY',cycle:'yearly',customInterval:1,customUnit:'years',startDate:'2025-12-05',status:'active',memo:''}
  ]
};

let state = loadState();
let settings = loadSettings();

const el = id => document.getElementById(id);

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.subscriptions) ? {subscriptions:saved.subscriptions} : structuredClone(sample);
  } catch { return structuredClone(sample); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); renderAll(); }
function loadSettings(){
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {theme:'light',currency:'JPY'}; }
  catch { return {theme:'light',currency:'JPY'}; }
}
function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); applySettings(); }
function fmt(amount, currency='JPY'){
  try { return new Intl.NumberFormat('ja-JP',{style:'currency',currency,maximumFractionDigits:currency==='JPY'?0:2}).format(amount); }
  catch { return `${amount} ${currency}`; }
}
function toDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function dateText(s){ if(!s) return '-'; return new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'short',day:'numeric'}).format(toDate(s)); }
function statusLabel(s){ return s==='active'?'契約中':s==='planned'?'解約予定':'停止中'; }
function monthlyEquivalent(sub){
  if(sub.status==='inactive') return 0;
  if(sub.cycle==='monthly') return sub.price;
  if(sub.cycle==='yearly') return sub.price/12;
  if(sub.cycle==='weekly') return sub.price*52/12;
  const n = Math.max(1,Number(sub.customInterval)||1);
  if(sub.customUnit==='months') return sub.price/n;
  if(sub.customUnit==='years') return sub.price/(n*12);
  return sub.price*(365/n)/12;
}
function yearlyEquivalent(sub){ return monthlyEquivalent(sub)*12; }
function totals(){
  const active=state.subscriptions.filter(s=>s.status!=='inactive');
  return {
    monthly:active.reduce((a,s)=>a+monthlyEquivalent(s),0),
    yearly:active.reduce((a,s)=>a+yearlyEquivalent(s),0),
    count:state.subscriptions.filter(s=>s.status==='active').length
  };
}
function renderDashboard(){
  const t=totals();
  el('monthlyTotal').textContent=fmt(t.monthly,settings.currency);
  el('yearlyTotal').textContent=fmt(t.yearly,settings.currency);
  el('activeCount').textContent=`${t.count}件`;
  renderCategoryDonut();
  el('dashboardSubscriptions').innerHTML=tableHtml(state.subscriptions.filter(s=>s.status==='active').slice(0,5),true);
}
function cycleLabel(s){
  if(s.cycle==='monthly') return '毎月'; if(s.cycle==='yearly') return '毎年'; if(s.cycle==='weekly') return '毎週';
  const unit=s.customUnit==='months'?'か月':s.customUnit==='years'?'年':'日'; return `${s.customInterval}${unit}ごと`;
}
function tableHtml(items,compact=false){
  if(!items.length) return '<div class="empty">該当するデータがありません。</div>';
  return `<table class="data-table"><thead><tr><th>サービス</th><th>料金</th><th>周期</th><th>支払方法</th><th>状態</th>${compact?'':'<th></th>'}</tr></thead><tbody>${items.map(s=>`<tr><td><strong>${escapeHtml(s.name)}</strong><div class="item-meta">${escapeHtml(s.category||'未分類')}</div></td><td>${fmt(s.price,s.currency)}</td><td>${cycleLabel(s)}</td><td>${escapeHtml(s.paymentMethod||'未設定')}</td><td><span class="status-pill ${s.status}">${statusLabel(s.status)}</span></td>${compact?'':`<td><div class="row-actions"><button class="mini-btn" data-action="edit" data-id="${s.id}">編集</button><button class="mini-btn" data-action="delete" data-id="${s.id}">削除</button></div></td>`}</tr>`).join('')}</tbody></table>`;
}
function renderSubscriptions(){
  const q=el('searchInput').value.trim().toLowerCase(); const sf=el('statusFilter').value; const cf=el('categoryFilter').value; const sort=el('sortSelect').value;
  let arr=state.subscriptions.filter(s=>(!q||s.name.toLowerCase().includes(q))&&(sf==='all'||s.status===sf)&&(cf==='all'||s.category===cf));
  arr=[...arr].sort((a,b)=>sort==='priceDesc'?b.price-a.price:a.name.localeCompare(b.name,'ja'));
  el('subscriptionTable').innerHTML=tableHtml(arr,false);
}
function renderFilters(){
  const cats=[...new Set(state.subscriptions.map(s=>s.category).filter(Boolean))].sort();
  const current=el('categoryFilter').value; el('categoryFilter').innerHTML='<option value="all">すべてのカテゴリー</option>'+cats.map(c=>`<option>${escapeHtml(c)}</option>`).join(''); if(cats.includes(current)) el('categoryFilter').value=current;
  el('categoryList').innerHTML=cats.map(c=>`<option value="${escapeAttr(c)}"></option>`).join('');
  const pms=[...new Set(state.subscriptions.map(s=>s.paymentMethod).filter(Boolean))].sort(); el('paymentMethodList').innerHTML=pms.map(p=>`<option value="${escapeAttr(p)}"></option>`).join('');
}
function groupMonthlyBy(key){
  const map={}; state.subscriptions.filter(s=>s.status!=='inactive').forEach(s=>{const k=s[key]||'未設定'; map[k]=(map[k]||0)+monthlyEquivalent(s);}); return map;
}
function renderCategoryDonut(){
  const map=groupMonthlyBy('category'), entries=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const colors=['#3b82f6','#d7a62f','#8b5cf6','#10b981','#f97316','#64748b','#ec4899']; const total=entries.reduce((a,[,v])=>a+v,0);
  if(!total){el('categoryDonut').style.background='#e5e7eb';el('categoryLegend').innerHTML='<div class="empty">データなし</div>';return;}
  let acc=0; const parts=entries.map(([k,v],i)=>{const start=acc; acc+=v/total*100; return `${colors[i%colors.length]} ${start}% ${acc}%`;});
  el('categoryDonut').style.background=`conic-gradient(${parts.join(',')})`;
  el('categoryLegend').innerHTML=entries.map(([k,v],i)=>`<div class="legend-row"><span class="legend-dot" style="background:${colors[i%colors.length]}"></span><span>${escapeHtml(k)}</span><strong>${fmt(v,settings.currency)}</strong></div>`).join('');
}
function renderBars(target,map){
  const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]), max=Math.max(...entries.map(e=>e[1]),1);
  el(target).innerHTML=entries.length?entries.map(([k,v])=>`<div class="bar-row"><span>${escapeHtml(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(3,v/max*100)}%"></div></div><span class="bar-value">${fmt(v,settings.currency)}</span></div>`).join(''):'<div class="empty">データがありません。</div>';
}
function renderAll(){ renderFilters(); renderDashboard(); renderSubscriptions(); }
function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===view)); document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const titles={dashboard:['ダッシュボード','固定費の状況をひと目で確認できます。'],subscriptions:['サブスク','契約中・停止中のサービスを管理します。'],settings:['設定','表示とデータを管理します。']};
  [el('pageTitle').textContent,el('pageSubtitle').textContent]=titles[view]; el('addSubscriptionBtn').style.display=view==='settings'?'none':'';
}
function openDialog(sub=null){
  el('dialogTitle').textContent=sub?'サブスクを編集':'サブスクを追加'; el('subscriptionId').value=sub?.id||''; el('nameInput').value=sub?.name||''; el('categoryInput').value=sub?.category||''; el('paymentMethodInput').value=sub?.paymentMethod||''; el('priceInput').value=sub?.price??''; el('itemCurrencyInput').value=sub?.currency||settings.currency; el('cycleInput').value=sub?.cycle||'monthly'; el('customIntervalInput').value=sub?.customInterval||2; el('customUnitInput').value=sub?.customUnit||'months'; el('startDateInput').value=sub?.startDate||new Date().toISOString().slice(0,10); el('statusInput').value=sub?.status||'active'; el('memoInput').value=sub?.memo||''; toggleCustom(); el('subscriptionDialog').showModal();
}
function closeDialog(){ el('subscriptionDialog').close(); }
function toggleCustom(){ document.querySelectorAll('.custom-cycle').forEach(x=>x.classList.toggle('hidden',el('cycleInput').value!=='custom')); }
function deleteSub(id){ if(!confirm('このサブスクを削除しますか？'))return; state.subscriptions=state.subscriptions.filter(s=>s.id!==id); saveState(); }
function backup(){ downloadBlob(JSON.stringify(state,null,2),`subscription_backup_${new Date().toISOString().slice(0,10).replaceAll('-','')}.json`,'application/json'); }
function downloadBlob(content,name,type){ const blob=new Blob([content],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
function applySettings(){ document.body.classList.toggle('dark',settings.theme==='dark'); el('themeSelect').value=settings.theme; el('currencySelect').value=settings.currency; renderAll(); }
function toast(msg){ const t=el('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function escapeAttr(s=''){return escapeHtml(s);}

// navigation
document.addEventListener('click',e=>{const view=e.target.closest('[data-view]')?.dataset.view;if(view)switchView(view);const jump=e.target.closest('[data-jump]')?.dataset.jump;if(jump)switchView(jump);const action=e.target.closest('[data-action]');if(action){const id=action.dataset.id;if(action.dataset.action==='edit')openDialog(state.subscriptions.find(s=>s.id===id));if(action.dataset.action==='delete')deleteSub(id);}});
el('addSubscriptionBtn').addEventListener('click',()=>openDialog()); el('closeDialogBtn').addEventListener('click',closeDialog); el('cancelDialogBtn').addEventListener('click',closeDialog); el('cycleInput').addEventListener('change',toggleCustom);
el('subscriptionForm').addEventListener('submit',e=>{e.preventDefault(); const id=el('subscriptionId').value||'s'+Date.now(); const item={id,name:el('nameInput').value.trim(),category:el('categoryInput').value.trim()||'未分類',paymentMethod:el('paymentMethodInput').value.trim()||'未設定',price:Number(el('priceInput').value),currency:el('itemCurrencyInput').value,cycle:el('cycleInput').value,customInterval:Number(el('customIntervalInput').value)||1,customUnit:el('customUnitInput').value,startDate:el('startDateInput').value,status:el('statusInput').value,memo:el('memoInput').value.trim()}; const i=state.subscriptions.findIndex(s=>s.id===id); if(i>=0)state.subscriptions[i]=item; else state.subscriptions.push(item); saveState(); closeDialog(); toast(i>=0?'更新しました。':'追加しました。');});
['searchInput','statusFilter','categoryFilter','sortSelect'].forEach(id=>el(id).addEventListener('input',renderSubscriptions));
el('backupBtn').addEventListener('click',backup);
el('restoreInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data.subscriptions))throw new Error();state={subscriptions:data.subscriptions};saveState();toast('復元しました。');}catch{alert('バックアップファイルを読み込めませんでした。');}e.target.value='';});
el('resetBtn').addEventListener('click',()=>{if(!confirm('すべてのサブスクを削除しますか？'))return;state={subscriptions:[]};saveState();toast('データを削除しました。');});
el('themeSelect').addEventListener('change',e=>{settings.theme=e.target.value;saveSettings();}); el('currencySelect').addEventListener('change',e=>{settings.currency=e.target.value;saveSettings();});

applySettings(); switchView('dashboard');
