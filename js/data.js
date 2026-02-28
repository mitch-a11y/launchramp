function load(){
  // Phase 1: Load from localStorage for instant display
  try{DB=JSON.parse(localStorage.getItem('lr3')||'null')||{clients:[],activeClient:null,activeProject:null}}catch(e){DB={clients:[],activeClient:null,activeProject:null}}
  try{lastKnownRemote=JSON.parse(localStorage.getItem("lr3_baseline"));}catch(ebl){lastKnownRemote=null;} // S-2: restore baseline
  // Run all existing migrations (keep original migration logic)
  if(DB.clients.length&&!DB.clients[0].projects){
    DB.clients.forEach(c=>{
      const proj={id:'p'+Date.now()+'_'+Math.random().toString(36).substr(2,4),name:c.name+' Launch',type:'launch',
      phases:c.phases||[],states:c.states||{},docLinks:c.docLinks||{},jfNotes:c.jfNotes||'',
      quickLinks:c.quickLinks||{homepage:'',instagram:'',linkedin:'',gdrive:'',claude:''},
      timeLog:c.timeLog||[],activeTimer:c.activeTimer||null,
      startDate:c.startDate||new Date().toISOString().split('T')[0],launchDate:c.launchDate||futDate(60),
      completed:false};
      c.projects=[proj];
      delete c.phases;delete c.states;delete c.docLinks;delete c.jfNotes;
      delete c.quickLinks;delete c.timeLog;delete c.activeTimer;
      delete c.startDate;delete c.launchDate;
    });
    if(DB.activeClient){const ac=DB.clients.find(c=>c.id===DB.activeClient);if(ac&&ac.projects.length)DB.activeProject=ac.projects[0].id;}
    save();
  }
  if(!DB.activeProject)DB.activeProject=null;
  if(!DB.clients.length){const c=mkClientWithProject('Beispiel-Kunde','launch');DB.clients.push(c);DB.activeClient=c.id;DB.activeProject=c.projects[0].id;}
  DB.clients.forEach(c=>{
    if(!c.projects)c.projects=[];
    c.projects.forEach(proj=>{
      if(!proj.startDate)proj.startDate=proj.phases[0]?.startDate||new Date().toISOString().split('T')[0];
      if(!proj.quickLinks)proj.quickLinks={homepage:'',instagram:'',linkedin:'',gdrive:'',claude:''};
      if(!proj.jourfix&&proj.docLinks&&proj.docLinks['jourfix']){proj.jourfix={day:3,time:'15:00',meetLink:proj.docLinks['jourfix']};delete proj.docLinks['jourfix']}
      if(!proj.jourfix)proj.jourfix={};
      if(!proj.timeLog)proj.timeLog=[];
      if(!proj.activeTimer)proj.activeTimer=null;
      if(proj.completed===undefined)proj.completed=false;
      proj.phases.forEach(p=>{if(!p.startDate)p.startDate='';if(!p.endDate)p.endDate=''});
    });
  });
  if(DB.activeClient)expandedClients.add(DB.activeClient);
  // Migrate states from index-keys to task.status
  DB.clients.forEach(function(c){c.projects.forEach(function(p){migrateStatesToTasks(p);});});
  repairCorruptPhases(); // M-2: Fix corrupt phases from broken load period
  saveNow(); // Persist migrated task.status immediately
  // Phase 2: Async load from Supabase (overrides localStorage if newer)
  loadFromSupabase();
}
var _saveTimer=null;
function save(){
  if(_saveTimer)clearTimeout(_saveTimer);
  _saveTimer=setTimeout(function(){
    _saveTimer=null;
    try{
      localStorage.setItem('lr3',JSON.stringify(DB));saveToSupabase();
    }catch(e){console.warn("[Save Error]",e);toast("Fehler in save: "+e.message,"error");}
  },300);
}
function saveNow(){
  if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
  try{localStorage.setItem('lr3',JSON.stringify(DB));saveToSupabase();}catch(e){console.warn("[Save Error]",e);}
}
window.addEventListener('beforeunload',function(){if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;try{localStorage.setItem('lr3',JSON.stringify(DB));}catch(e){}}});


// ============================================================
// SUPABASE SYNC FUNCTIONS (with Field-Level Merge)
// ============================================================

// ---------- MERGE UTILITIES ----------
function saveToSupabase(){
  if(!sbClient||syncInProgress)return;
  clearTimeout(saveTimeout);
  saveTimeout=setTimeout(async()=>{
    syncInProgress=true;
    updateSyncStatus('syncing');
    try{
      const localPayload={clients:DB.clients,activeClient:DB.activeClient,activeProject:DB.activeProject};

      // S-2 Fix 3: Safety-fetch if no baseline exists
      if(!lastKnownRemote){
        var{data:_initRemote}=await sbClient.from("app_state").select("data").eq("id","main").single();
        if(_initRemote&&_initRemote.data){lastKnownRemote=deepClone(_initRemote.data);try{localStorage.setItem("lr3_baseline",JSON.stringify(lastKnownRemote));}catch(ebl){}}
      }
      if(lastKnownRemote){
        // Fetch current remote state
        const{data:currentRemote,error:fetchErr}=await sbClient.from('app_state').select('data').eq('id','main').single();
        if(!fetchErr && currentRemote && currentRemote.data){
          const remoteStr=JSON.stringify(currentRemote.data);
          const baseStr=JSON.stringify(lastKnownRemote);
          if(remoteStr!==baseStr){
            // Remote changed since we last loaded -> MERGE
            dbg('[Supabase] Conflict detected, merging...');
            const mergedClients = mergeClients(localPayload.clients, currentRemote.data.clients||[], lastKnownRemote.clients||[]);
            localPayload.clients = mergedClients;
            // Update local DB with merged data
            DB.clients = mergedClients;
            localStorage.setItem('lr3',JSON.stringify(DB));
            renderAll();
            toast('Merge: Deine und Remote-Aenderungen zusammengefuehrt');
          }
        }
      }

      // Now save the (possibly merged) payload
      const{error}=await sbClient.from('app_state').update({data:localPayload,updated_by:navigator.userAgent.substring(0,50)}).eq('id','main');
      if(error){console.warn('[Supabase] Save error:',error);updateSyncStatus('error')}
      else{
        dbg('[Supabase] Saved');
        updateSyncStatus('synced');
        lastRemoteUpdate=new Date().toISOString();
        lastKnownRemote=deepClone(localPayload);
      try{localStorage.setItem("lr3_baseline",JSON.stringify(lastKnownRemote));}catch(ebl){} // S-2
      }
    }catch(e){console.warn('[Supabase] Save failed:',e);updateSyncStatus('error')}
    syncInProgress=false;
  },500);
}

// Direct save without merge (for initial push)
async function saveToSupabaseDirect(){
  if(!sbClient)return;
  const payload={clients:DB.clients,activeClient:DB.activeClient,activeProject:DB.activeProject};
  await sbClient.from('app_state').upsert({id:'main',data:payload,updated_by:navigator.userAgent.substring(0,50)});
  lastKnownRemote=deepClone(payload);
  try{localStorage.setItem("lr3_baseline",JSON.stringify(lastKnownRemote));}catch(ebl){} // S-2
}

// ===== M3: ACTIVITY FEED =====
let actUser = localStorage.getItem("lr3_user");
let actCount = 0;
let actItems = [];
let actPanelOpen = false;
let actAutoCloseTimer = null;

function ensureActor(){
  if(!actUser){
    const name = prompt("Wer bist du? (Name fÃ¼r Activity Feed)");
    if(name && name.trim()){ actUser = name.trim(); localStorage.setItem("lr3_user", actUser); }
    else { actUser = "Anonym"; localStorage.setItem("lr3_user", actUser); }
  }
  return actUser;
}

async function logActivity(action, detail){
  const actor = ensureActor();
  const payload = { action, detail: detail || {}, actor, created_at: new Date().toISOString() };
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/activity_log", {
      method: "POST", headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify(payload)
    });
    if(!r.ok) console.warn("Activity log failed:", r.status);
  } catch(e){ console.warn("Activity log error:", e); }
}

function toggleActivityPanel(){
  actPanelOpen = !actPanelOpen;
  const panel = document.getElementById("activityPanel");
  if(panel){ panel.classList.toggle("open", actPanelOpen); }
  if(actPanelOpen){
    actCount = 0; updateActBadge();
    loadActivities();
    if(actAutoCloseTimer) clearTimeout(actAutoCloseTimer);
    actAutoCloseTimer = setTimeout(function(){ if(actPanelOpen){ toggleActivityPanel(); } }, 10000);
  } else {
    if(actAutoCloseTimer){ clearTimeout(actAutoCloseTimer); actAutoCloseTimer = null; }
  }
}

function updateActBadge(){
  const wrap = document.querySelector(".sync-wrap");
  if(!wrap) return;
  let badge = document.getElementById("actBadge");
  if(!badge){ badge=document.createElement("span"); badge.id="actBadge"; badge.className="activity-badge"; wrap.appendChild(badge); }
  if(actCount > 0){ badge.style.display="flex"; badge.textContent=actCount>9?"9+":actCount; }
  else { badge.style.display="none"; }
}

async function loadActivities(){
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/activity_log?order=created_at.desc&limit=30", {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY }
    });
    if(r.ok){ actItems = await r.json(); renderActivityList(); }
  } catch(e){ console.warn("Load activities error:", e); }
}

function renderActivityList(){
  const list = document.getElementById("activityList");
  if(!list) return;
  if(!actItems.length){ list.innerHTML = '<div class="activity-empty">Keine AktivitÃ¤ten bisher</div>'; return; }
  list.innerHTML = actItems.map(function(it){
    const d = new Date(it.created_at);
    const time = d.toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"}) + " " + d.toLocaleTimeString("de-CH",{hour:"2-digit",minute:"2-digit"});
    const det = it.detail || {};
    let desc = it.action;
    if(it.action === "status_change") desc = "Status: " + (det.task||"?") + " â " + (det.newStatus||"?");
    else if(it.action === "timer_start") desc = "Timer gestartet: " + (det.task||"?");
    else if(it.action === "timer_stop") desc = "Timer gestoppt: " + (det.task||"?") + " (" + (det.duration||"?") + ")";
    else if(it.action === "project_created") desc = "Neues Projekt: " + (det.name||"?");
    else if(it.action === "client_created") desc = "Neuer Kunde: " + (det.name||"?");
    else if(it.action === "doc_linked") desc = "Dokument verlinkt: " + (det.name||"?");
    return '<div class="activity-item"><div class="act-time">' + time + '</div><span class="act-actor">' + (it.actor||"?") + '</span> <span class="act-action">' + desc + '</span></div>';
  }).join("");
}

function setupActivitySubscription(){
  if(!sbClient) return;
  sbClient.channel("activity-feed").on("postgres_changes",{event:"INSERT",schema:"public",table:"activity_log"},function(payload){
    const newItem = payload.new;
    if(newItem.actor !== actUser){
      actCount++;
      updateActBadge();
    }
    actItems.unshift(newItem);
    if(actItems.length > 30) actItems.pop();
    if(actPanelOpen) renderActivityList();
  }).subscribe();
}
// ===== END M3: ACTIVITY FEED =====

// ============================================================
// M4: TEMPLATE SETTINGS PANEL
// ============================================================
let tplCache = null;
let tplActive = null;

async function loadTemplates(){
  try{
    const r=await fetch(SUPABASE_URL+"/rest/v1/templates?select=*&order=type,name",{
      headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY}
    });
    if(r.ok){ tplCache=await r.json(); }
    else{ console.warn("loadTemplates error",r.status); tplCache=[]; }
  }catch(e){ console.warn("loadTemplates fetch error",e); tplCache=[]; }
  return tplCache;
}

async function saveTemplate(tpl){
  tpl.updated_at=new Date().toISOString();
  const r=await fetch(SUPABASE_URL+"/rest/v1/templates?id=eq."+encodeURIComponent(tpl.id),{
    method:"PATCH",
    headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json","Prefer":"return=minimal"},
    body:JSON.stringify({name:tpl.name,data:tpl.data,updated_at:tpl.updated_at})
  });
  if(!r.ok) console.warn("saveTemplate error",r.status);
  else logActivity("template_edit",{template:tpl.name});
}

async function createTemplate(name,type){
  const id=type+"_"+Date.now();
  const tpl={id,name,type,data:{phases:[]},created_at:new Date().toISOString(),updated_at:new Date().toISOString(),created_by:actUser||"Anonym"};
  const r=await fetch(SUPABASE_URL+"/rest/v1/templates",{
    method:"POST",
    headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json","Prefer":"return=minimal"},
    body:JSON.stringify(tpl)
  });
  if(r.ok){
    tplCache.push(tpl);
    tplActive=tpl.id;
    logActivity("template_create",{template:name});
    renderTemplates();
  }
}

async function duplicateTemplate(srcId){
  const src=tplCache.find(t=>t.id===srcId);
  if(!src) return;
  const name=prompt("Name fÃ¼r die Kopie:",src.name+" (Kopie)");
  if(!name) return;
  const id=src.type+"_"+Date.now();
  const tpl={id,name,type:src.type,data:JSON.parse(JSON.stringify(src.data)),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),created_by:actUser||"Anonym"};
  const r=await fetch(SUPABASE_URL+"/rest/v1/templates",{
    method:"POST",
    headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json","Prefer":"return=minimal"},
    body:JSON.stringify(tpl)
  });
  if(r.ok){
    tplCache.push(tpl);
    tplActive=tpl.id;
    logActivity("template_duplicate",{source:src.name,newName:name});
    renderTemplates();
  }
}

async function deleteTemplate(id){
  const tpl=tplCache.find(t=>t.id===id);
  if(!tpl||!confirm("Template \""+tpl.name+"\" wirklich lÃ¶schen?")) return;
  await fetch(SUPABASE_URL+"/rest/v1/templates?id=eq."+encodeURIComponent(id),{
    method:"DELETE",
    headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY}
  });
  tplCache=tplCache.filter(t=>t.id!==id);
  if(tplActive===id) tplActive=null;
  logActivity("template_delete",{template:tpl.name});
  renderTemplates();
}

async function renderTemplates(){
  if(!tplCache) await loadTemplates();
  const el=document.getElementById("templatesView");
  if(!el) return;
  // If no templates yet, migrate defaults
  if(tplCache.length===0){ await migrateDefaultTemplates(); }
  let h="<div style=\"padding:8px\">";
  h+="<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px\">";
  h+="<h3 style=\"margin:0;font-size:16px\">ð Template-Verwaltung</h3>";
  h+="<button class=\"tpl-add-btn\" onclick=\"newTemplateDialog()\" style=\"font-size:13px;padding:6px 14px\">ï¼ Neues Template</button>";
  h+="</div>";
  // Template cards grid
  h+="<div class=\"tpl-grid\">";
  const types={launch:"ð Launch",retainer_category:"ð Retainer",webinar:"ðº Webinar",custom:"â¡ Custom"};
  for(const tpl of tplCache){
    const phases=tpl.data&&tpl.data.phases?tpl.data.phases:[];
    const taskCount=phases.reduce((s,p)=>s+(p.packages||[]).reduce((s2,pk)=>s2+(pk.tasks||[]).length,0),0);
    const isActive=tplActive===tpl.id;
    h+="<div class=\"tpl-card"+(isActive?" active":"")+"\" onclick=\"tplActive='"+tpl.id+"';renderTemplates()\">";
    h+="<h4>"+esc(tpl.name)+"</h4>";
    h+="<div class=\"tpl-type\">"+(types[tpl.type]||tpl.type)+"</div>";
    h+="<div class=\"tpl-stats\">"+phases.length+" Phasen Â· "+taskCount+" Tasks</div>";
    h+="</div>";
  }
  h+="</div>";
  // If a template is active, show editor
  if(tplActive){
    const tpl=tplCache.find(t=>t.id===tplActive);
    if(tpl) h+=renderTemplateEditor(tpl);
  }
  h+="</div>";
  el.innerHTML=h;
}

function setupRealtimeSubscription(){
  if(!sbClient||realtimeChannel)return;
  realtimeChannel=sbClient.channel('app_state_changes')
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'app_state',filter:'id=eq.main'},payload=>{
    if(syncInProgress)return;
    dbg('[Supabase] Realtime update received');
    const newData=payload.new.data;
    if(newData&&newData.clients){
      // Merge instead of overwrite
      if(lastKnownRemote){
        const localPayload={clients:DB.clients,activeClient:DB.activeClient,activeProject:DB.activeProject};
        const localStr=JSON.stringify(localPayload);
        const remoteStr=JSON.stringify(newData);
        if(localStr===remoteStr) return; // No difference

        const mergedClients=mergeClients(localPayload.clients, newData.clients, lastKnownRemote.clients||[]);
        DB.clients=mergedClients;
      } else {
        DB.clients=newData.clients||[];
      }
      repairCorruptPhases(); // M-2: Fix corrupt phases in realtime updates
      lastKnownRemote=deepClone({clients:DB.clients,activeClient:DB.activeClient,activeProject:DB.activeProject});
      try{localStorage.setItem("lr3_baseline",JSON.stringify(lastKnownRemote));}catch(ebl){} // S-2
      localStorage.setItem('lr3',JSON.stringify(DB));
      renderAll();
      toast('Daten von Teamkollege aktualisiert');
      updateSyncStatus('synced');
    }
  })
  .subscribe((status)=>{
    dbg('[Supabase] Realtime status:',status);
    if(status==='SUBSCRIBED')updateSyncStatus('synced');
  });
}

// ---------- SYNC STATUS INDICATOR ----------
