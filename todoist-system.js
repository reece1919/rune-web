/* Shared read-only Todoist system lists. Uses existing ORBIT OAuth bridge; never stores Todoist credentials. */
(()=>{"use strict";
 const hosts=[...document.querySelectorAll('[data-system-todoist]')];
 if(!hosts.length)return;
 const URL="https://zdurujqwhxqrwbhwzzxg.supabase.co";
 const KEY="sb_publishable_Xa0DTx_PbvtynbiQN6_xNQ_l1D55vzK"; // Supabase PUBLISHABLE key, not a secret; RLS and MFA enforced by the server.
 const BRIDGE=URL+"/functions/v1/orbit-todoist";
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const localDay=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 let db=null,busy=false,verifying=false,last=0,owner="",pending=null;
 function getDB(){
  if(window.ORBITAuth?.client)return window.ORBITAuth.client;
  if(window.GAIA_CLOUD?.client)return window.GAIA_CLOUD.client;
  if(db)return db;
  if(!window.supabase?.createClient)return null;
  db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:"pkce"}});
  db.auth.onAuthStateChange(()=>{last=0;setTimeout(()=>void refresh(),250)});
  return db;
 }
 for(const host of hosts){
  const label=String(host.dataset.systemTodoist||"").trim().toUpperCase();
  host.innerHTML='<div class="system-todoist-head"><strong>TODOIST / '+esc(label)+'</strong><button type="button" data-st-refresh aria-label="Refresh '+esc(label)+' Todoist tasks">Refresh</button></div><div class="system-todoist-message" role="status">Checking tasks…</div><div class="system-todoist-list"></div><a class="system-todoist-link" href="https://app.todoist.com/app/today" target="_blank" rel="noopener noreferrer">Open Todoist ↗</a>';
  host.querySelector("[data-st-refresh]").addEventListener("click",()=>void refresh(true));
  host.addEventListener("submit",async event=>{
   const form=event.target.closest(".st-verify-form");if(!form)return;
   event.preventDefault();if(verifying)return;
   const factorId=form.querySelector("select").value;
   const code=form.querySelector("input").value.trim();
   if(!/^[0-9]{6}$/.test(code)){host.querySelector(".system-todoist-message").textContent="Enter a six-digit code.";return}
   verifying=true;
   host.querySelector(".system-todoist-message").textContent="Verifying…";
   try{
    const client=getDB();
    if(!client)throw Error("Sign in again.");
    const {error}=await client.auth.mfa.challengeAndVerify({factorId,code});
    if(error)throw error;
    last=0;
    host.querySelector(".system-todoist-message").textContent="Verified.";
    await refresh(true);
   }catch(error){host.querySelector(".system-todoist-message").textContent=error.message||"Code not accepted."}
   finally{verifying=false}
  });
 }
 function note(text){
  for(const h of hosts){h.querySelector(".system-todoist-message").textContent=text;h.querySelector(".system-todoist-list").replaceChildren()}
 }
 async function offerVerification(client){
  const {data,error}=await client.auth.mfa.listFactors();
  if(error)throw error;
  const factors=(data?.totp||[]).filter(f=>f.status==="verified");
  if(!factors.length){note("Set up an authenticator in ORBIT Settings first.");return}
  for(const host of hosts){
   host.querySelector(".system-todoist-message").textContent="Verify your authenticator to load tasks.";
   const options=factors.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.friendly_name||"Authenticator")+'</option>').join("");
   host.querySelector(".system-todoist-list").innerHTML='<form class="st-verify-form"><label>Authenticator<select required aria-label="Select authenticator">'+options+'</select></label><label>6-digit code<input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label><button type="submit">Verify</button></form>';
  }
 }
 function section(name,list){
  if(!list.length)return "";
  // Render every matching task, including subtasks; never silently hide the seventh item.
  return '<div class="st-group"><h4>'+esc(name)+'</h4>'+list.map(task=>{
    const id=encodeURIComponent(String(task.id||""));
    const nested=!!task.parent_id;
    const marker=nested?'↳ ':'';
    return '<a class="st-task" href="https://app.todoist.com/app/task/'+id+'" target="_blank" rel="noopener noreferrer"'+(nested?' style="padding-left:1.15rem"':'')+'><span>'+marker+esc(task.content||"Untitled task")+'</span><span class="st-arrow" aria-hidden="true">↗</span></a>';
  }).join("")+'</div>';
 }
 function render(tasks){
  const today=new Date();const next=new Date(today);next.setDate(today.getDate()+1);
  const future=new Date(today);future.setDate(today.getDate()+8);
  const d0=localDay(today),d1=localDay(next),d7=localDay(future);
  for(const host of hosts){
   const name=String(host.dataset.systemTodoist||"").toLowerCase();
   const byId=new Map(tasks.map(t=>[String(t.id),t]));
   const labeled=t=>Array.isArray(t?.labels)&&t.labels.some(l=>String(l).replace(/^@/,"").trim().toLowerCase()===name);
   // Todoist subtasks often have no labels: inherit dashboard membership from a labeled parent.
   const ancestors=t=>{const result=[];const seen=new Set([String(t.id)]);let parent=t.parent_id;while(parent&&result.length<25&&!seen.has(String(parent))){seen.add(String(parent));const p=byId.get(String(parent));if(!p)break;result.push(p);parent=p.parent_id;}return result};
   const own=tasks.filter(t=>labeled(t)||ancestors(t).some(labeled));
   const day=t=>String(t.due?.date||ancestors(t).find(p=>p.due?.date)?.due?.date||"").slice(0,10);
   const ordered=[...own].sort((a,b)=>(day(a)||"9999").localeCompare(day(b)||"9999")||Number(b.priority||0)-Number(a.priority||0));
   const html=section("Overdue",ordered.filter(t=>day(t)&&day(t)<d0))+
     section("Today",ordered.filter(t=>day(t)===d0))+
     section("Tomorrow",ordered.filter(t=>day(t)===d1))+
     section("Upcoming",ordered.filter(t=>day(t)>d1&&day(t)<=d7))+
     section("Unscheduled",ordered.filter(t=>!day(t)));
   host.querySelector(".system-todoist-message").textContent=own.length?"":"No tasks labeled @"+name;
   host.querySelector(".system-todoist-list").innerHTML=html;
  }
 }
 async function request(action,session,extra={}){
  const response=await fetch(BRIDGE,{
   method:"POST",cache:"no-store",
   headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
   body:JSON.stringify({action,...extra})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"Todoist unavailable ("+response.status+")");
  return data;
 }
 async function refresh(force=false){
  if(busy)return pending;
  if(!force && Date.now()-last<90000)return;
  const client=getDB();if(!client){note("Waiting for sign-in…");return}
  busy=true;note("Loading…");
  pending=(async()=>{
   try{
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    if(!data.session){note("Sign in to ORBIT to see your Todoist tasks.");return}
    const user=data.session.user.id;if(owner&&owner!==user)last=0;owner=user;
    const level=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(level.error)throw level.error;
    if(level.data?.currentLevel!=="aal2"){await offerVerification(client);return}
    const stat=await request("status",data.session);
    if(!stat.connected){note("Connect Todoist from ORBIT → Tasks.");return}
    let tasks=[],cursor="",partial=false;
    for(let i=0;i<10;i++){
     const params=new URLSearchParams({limit:"200"});if(cursor)params.set("cursor",cursor);
     const page=await request("api",data.session,{path:"/tasks?"+params,method:"GET"});
     if(!Array.isArray(page?.results))throw Error("Unexpected Todoist response.");
     tasks.push(...page.results.filter(x=>x&&!x.checked&&!x.is_deleted&&!x.is_uncompletable));
     cursor=String(page.next_cursor||page.nextCursor||"");
     if(!cursor)break;
     if(i===9)partial=true;
    }
    render(tasks);
    last=Date.now();
    if(partial)for(const host of hosts)host.querySelector(".system-todoist-message").textContent="Showing first 2,000 open tasks";
   }catch(e){note(e.message||"Could not load Todoist tasks.")}
   finally{busy=false;pending=null}
  })();
  return pending;
 }
 document.addEventListener("gaia:auth",()=>{last=0;void refresh(true)});
 document.addEventListener("orbit:auth-changed",()=>{last=0;void refresh(true)});
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void refresh()});
 window.addEventListener("focus",()=>void refresh());
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void refresh(true),{once:true});
 else void refresh(true);
})();