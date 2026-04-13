import { useState, useEffect, useCallback } from "react";

const STATUSES = ["To-Do", "In Progress", "Done"];
const SECTIONS = ["Product", "Marketing"];
const PROJ_STATES = ["Idea", "In Build", "Live", "Paused"];
const PROJ_STATE_COLORS = {
  "Idea": { color:"#a78bfa", bg:"#a78bfa15", border:"#a78bfa30" },
  "In Build": { color:"#60a5fa", bg:"#60a5fa15", border:"#60a5fa30" },
  "Live": { color:"#4ade80", bg:"#4ade8015", border:"#4ade8030" },
  "Paused": { color:"#888", bg:"#88888815", border:"#88888830" },
};
const STAT = {
  "To-Do": { color:"#8888a8", bg:"#ffffff06" },
  "In Progress": { color:"#60a5fa", bg:"#60a5fa0a" },
  "Done": { color:"#4ade80", bg:"#4ade800a" },
};
const SEC = {
  Product: { color:"#6c63ff", tag:"#6c63ff20" },
  Marketing: { color:"#ff6b6b", tag:"#ff6b6b20" },
};
const P = {
  bg0:"#09090f", bg1:"#111118", bg2:"#19192a", bg3:"#22223a",
  border:"#ffffff0f", borderL:"#ffffff18", borderH:"#ffffff25",
  text:"#eeeef6", muted:"#8888a8", dim:"#555570",
  accent:"#6c63ff", accentH:"#5a52e0",
};

function uid(){return crypto.randomUUID?.()|| Math.random().toString(36).slice(2)+Date.now().toString(36);}
function ts(){return new Date().toISOString();}
function relTime(iso){if(!iso)return"—";const d=Date.now()-new Date(iso).getTime(),m=Math.floor(d/60000),h=Math.floor(m/60),dy=Math.floor(h/24);if(m<1)return"just now";if(m<60)return m+"m ago";if(h<24)return h+"h ago";if(dy<30)return dy+"d ago";return new Date(iso).toLocaleDateString();}
function fmtDate(iso){const d=new Date(iso);return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})+" "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});}
async function load(){try{if(!window.storage)return{projects:[],tasks:[],logs:[]};const r=await window.storage.get("app0_v6");return r?JSON.parse(r.value):{projects:[],tasks:[],logs:[]};}catch(e){return{projects:[],tasks:[],logs:[]};}}
async function save(d){try{if(window.storage)await window.storage.set("app0_v6",JSON.stringify(d));}catch{}}

const css=`
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#ffffff15;border-radius:4px;}
input,textarea,select{font-family:inherit;}
.fi{animation:fi .2s ease;}
@keyframes fi{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);}}
.ch{transition:border-color .15s,background .15s;}
.ch:hover{border-color:${P.borderH}!important;background:#ffffff06!important;}
.bg{background:none;border:1px solid ${P.border};border-radius:8px;color:${P.muted};cursor:pointer;transition:all .15s;font-size:12px;}
.bg:hover{border-color:${P.borderH};color:${P.text};background:#ffffff08;}
.bp{background:${P.accent};border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer;transition:background .15s;font-size:13px;}
.bp:hover{background:${P.accentH};}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:1000;animation:fi .15s ease;}
@media(max-width:768px){.kg{grid-template-columns:1fr!important;}.mp{padding:16px!important;}.bp2{padding:16px!important;}.dg{grid-template-columns:1fr!important;}}
@media(max-width:480px){.mb{margin:12px!important;max-height:calc(100vh - 24px)!important;}}
`;

function Modal({open,onClose,children}){if(!open)return null;return(<div className="ov" onClick={onClose}><div className="mb fi" onClick={e=>e.stopPropagation()} style={{background:P.bg1,border:`1px solid ${P.borderL}`,borderRadius:16,padding:"28px 24px",width:"100%",maxWidth:500,maxHeight:"85vh",overflow:"auto",margin:24}}>{children}</div></div>);}

function ProjPill({state}){const c=PROJ_STATE_COLORS[state]||PROJ_STATE_COLORS.Idea;return <span style={{fontSize:11,fontWeight:600,color:c.color,background:c.bg,border:`1px solid ${c.border}`,borderRadius:20,padding:"2px 10px",letterSpacing:".02em",whiteSpace:"nowrap"}}>{state}</span>;}

function PriorityDot({score}){const c=score>=15?"#4ade80":score>=8?"#fbbf24":score>=4?"#60a5fa":"#555";return <span title={`Priority: ${score}`} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:600,color:c}}><span style={{width:6,height:6,borderRadius:"50%",background:c}}/>{score}</span>;}

function TaskCard({task,onUpdate,onDelete,onMove}){
  const[ed,setEd]=useState(false);
  const[form,setForm]=useState({title:task.title,stagingUrl:task.stagingUrl||"",loomUrl:task.loomUrl||""});
  const showU=task.status==="Done";
  const si=STATUSES.indexOf(task.status);
  useEffect(()=>{setForm({title:task.title,stagingUrl:task.stagingUrl||"",loomUrl:task.loomUrl||""});},[task]);
  const doSave=()=>{if(!form.title.trim())return;onUpdate({...task,...form});setEd(false);};
  const iS={width:"100%",background:P.bg0,border:`1px solid ${P.border}`,borderRadius:8,padding:"8px 12px",color:P.text,fontSize:13,outline:"none"};
  if(ed)return(<div className="fi" style={{background:P.bg2,border:`1px solid ${P.borderL}`,borderRadius:12,padding:14,marginBottom:8}}><div style={{display:"flex",flexDirection:"column",gap:8}}><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} onKeyDown={e=>e.key==="Enter"&&doSave()} autoFocus style={iS} placeholder="Task title"/>{showU&&<input value={form.stagingUrl} onChange={e=>setForm({...form,stagingUrl:e.target.value})} style={{...iS,fontSize:12}} placeholder="Live URL"/>}{showU&&<input value={form.loomUrl} onChange={e=>setForm({...form,loomUrl:e.target.value})} style={{...iS,fontSize:12}} placeholder="Loom URL"/>}<div style={{display:"flex",gap:6}}><button onClick={doSave} className="bp" style={{flex:1,padding:"7px 0",fontSize:12}}>Save</button><button onClick={()=>setEd(false)} className="bg" style={{flex:1,padding:"7px 0"}}>Cancel</button></div></div></div>);
  return(<div className="ch" style={{background:P.bg2,border:`1px solid ${P.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}><span onClick={()=>setEd(true)} style={{fontSize:13,color:P.text,cursor:"pointer",lineHeight:1.5,flex:1,fontWeight:500}}>{task.title}</span><button onClick={()=>onDelete(task.id)} style={{background:"none",border:"none",color:P.dim,cursor:"pointer",fontSize:16,padding:"0 2px",lineHeight:1,opacity:.5}}>×</button></div>{showU&&task.stagingUrl&&<a href={task.stagingUrl} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#60a5fa",display:"block",marginTop:6,textDecoration:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.stagingUrl.replace(/^https?:\/\//,"").slice(0,50)}</a>}{showU&&task.loomUrl&&<a href={task.loomUrl} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#c084fc",display:"block",marginTop:3,textDecoration:"none"}}>Loom ↗</a>}<div style={{display:"flex",gap:4,marginTop:8}}>{si>0&&<button onClick={()=>onMove(task.id,STATUSES[si-1])} className="bg" style={{padding:"3px 10px",fontSize:11,borderRadius:6}}>← {STATUSES[si-1]}</button>}{si<2&&<button onClick={()=>onMove(task.id,STATUSES[si+1])} className="bg" style={{padding:"3px 10px",fontSize:11,borderRadius:6}}>{STATUSES[si+1]} →</button>}</div></div>);
}

function SectionKanban({tasks,section,onUpdate,onDelete,onMove,onAdd}){
  const sec=SEC[section];const filtered=tasks.filter(t=>t.section===section);
  const[col,setCol]=useState(false);
  return(<div style={{marginBottom:28}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:col?0:14,padding:"0 2px"}}><button onClick={()=>setCol(!col)} style={{background:"none",border:"none",display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:0}}><span style={{fontSize:11,color:sec.color,opacity:.7,transition:"transform .2s",display:"inline-block",transform:col?"rotate(-90deg)":"rotate(0)"}}>▼</span><span style={{fontSize:10,color:sec.color,letterSpacing:".12em",fontWeight:700,textTransform:"uppercase"}}>{section}</span><span style={{fontSize:12,color:P.dim,fontWeight:500}}>{filtered.length}</span></button>{!col&&<button onClick={()=>onAdd(section)} style={{background:sec.tag,border:`1px solid ${sec.color}25`,borderRadius:8,padding:"5px 14px",color:sec.color,fontSize:12,cursor:"pointer",fontWeight:600,transition:"all .15s"}} onMouseEnter={e=>{e.target.style.background=sec.color;e.target.style.color="#fff";}} onMouseLeave={e=>{e.target.style.background=sec.tag;e.target.style.color=sec.color;}}>+ Task</button>}</div>
  {!col&&<div className="kg" style={{display:"grid",gridTemplateColumns:"repeat(3, minmax(0, 1fr))",gap:12}}>{STATUSES.map(status=>{const st=STAT[status];const c=filtered.filter(t=>t.status===status);return(<div key={status} style={{minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10,padding:"8px 10px",background:st.bg,borderRadius:8,border:`1px solid ${st.color}10`}}><span style={{width:6,height:6,borderRadius:"50%",background:st.color,flexShrink:0}}/><span style={{fontSize:11,fontWeight:600,color:st.color,letterSpacing:".04em",textTransform:"uppercase",flex:1}}>{status}</span><span style={{fontSize:11,color:P.dim,fontWeight:600}}>{c.length}</span></div><div>{c.map(t=><TaskCard key={t.id} task={t} onUpdate={onUpdate} onDelete={onDelete} onMove={onMove}/>)}</div></div>);})}</div>}{!col&&<div style={{height:1,background:P.border,marginTop:16}}/>}</div>);
}

function DailyLog({logs,onAdd}){
  const[msg,setMsg]=useState("");
  const submit=()=>{if(!msg.trim())return;onAdd(msg.trim());setMsg("");};
  return(<div style={{marginBottom:28}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><span style={{fontSize:10,letterSpacing:".12em",fontWeight:700,textTransform:"uppercase",color:P.dim}}>Daily log</span><span style={{fontSize:12,color:P.dim}}>{logs.length}</span></div>
  <div style={{display:"flex",gap:8,marginBottom:14}}><input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Quick update — what happened today?" style={{flex:1,background:P.bg2,border:`1px solid ${P.border}`,borderRadius:10,padding:"10px 14px",color:P.text,fontSize:13,outline:"none"}}/><button onClick={submit} className="bp" style={{padding:"0 18px",fontSize:12,flexShrink:0}}>Post</button></div>
  {logs.length===0&&<div style={{padding:"16px 0",fontSize:13,color:P.dim,textAlign:"center"}}>No updates yet</div>}
  <div style={{display:"flex",flexDirection:"column",gap:2}}>{logs.slice().reverse().map(l=>(<div key={l.id} className="fi" style={{display:"flex",gap:12,padding:"10px 14px",borderRadius:10,background:P.bg2,border:`1px solid ${P.border}`}}><div style={{width:2,borderRadius:2,background:P.accent,flexShrink:0}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,color:P.text,lineHeight:1.6}}>{l.text}</div><div style={{fontSize:11,color:P.dim,marginTop:4}}>{fmtDate(l.createdAt)}</div></div></div>))}</div></div>);
}

function Dashboard({projects,tasks,logs,onSelect,onNew}){
  const[filter,setFilter]=useState("All");
  const filtered=filter==="All"?projects:projects.filter(p=>p.state===filter);
  const sorted=[...filtered].sort((a,b)=>{const sa=(b.impact||1)*(6-(b.effort||3));const sb=(a.impact||1)*(6-(a.effort||3));const la=logs.filter(l=>l.projectId===b.id)[0]?.createdAt||b.createdAt||"";const lb=logs.filter(l=>l.projectId===a.id)[0]?.createdAt||a.createdAt||"";return sa!==sb?sa-sb:la>lb?-1:1;});
  return(<div className="mp" style={{padding:"28px 32px",maxWidth:1100,margin:"0 auto",width:"100%"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
      <div><h1 style={{fontSize:22,fontWeight:700,color:P.text,marginBottom:4}}>All projects</h1><p style={{fontSize:13,color:P.dim}}>{projects.length} projects · {tasks.filter(t=>t.status==="Done").length} tasks shipped</p></div>
      <button onClick={onNew} className="bp" style={{padding:"10px 22px"}}>+ New project</button>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
      {["All",...PROJ_STATES].map(s=><button key={s} onClick={()=>setFilter(s)} style={{fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:20,cursor:"pointer",border:"1px solid",transition:"all .15s",background:filter===s?(s==="All"?P.accent:PROJ_STATE_COLORS[s]?.color||P.accent):"transparent",color:filter===s?"#fff":(s==="All"?P.muted:PROJ_STATE_COLORS[s]?.color||P.muted),borderColor:filter===s?"transparent":(s==="All"?P.border:PROJ_STATE_COLORS[s]?.border||P.border)}}>{s}{s!=="All"&&<span style={{marginLeft:5,opacity:.7}}>{projects.filter(p=>p.state===s).length}</span>}</button>)}
    </div>
    {sorted.length===0&&<div style={{textAlign:"center",padding:"48px 0",color:P.dim}}>{filter==="All"?"No projects yet":"No "+filter.toLowerCase()+" projects"}</div>}
    <div className="dg" style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:12}}>
      {sorted.map(p=>{
        const pt=tasks.filter(t=>t.projectId===p.id);const done=pt.filter(t=>t.status==="Done").length;const pct=pt.length?Math.round(done/pt.length*100):0;
        const lastLog=logs.filter(l=>l.projectId===p.id).sort((a,b)=>b.createdAt>a.createdAt?1:-1)[0];
        const score=(p.impact||1)*(6-(p.effort||3));
        return(<div key={p.id} onClick={()=>onSelect(p.id)} className="ch" style={{background:P.bg1,border:`1px solid ${P.border}`,borderRadius:14,padding:"18px 20px",cursor:"pointer",transition:"all .15s"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:10}}>
            <ProjPill state={p.state||"Idea"}/><PriorityDot score={score}/>
          </div>
          <div style={{fontSize:15,fontWeight:600,color:P.text,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div>
          {p.brainDump&&<div style={{fontSize:12,color:P.dim,lineHeight:1.5,marginBottom:12,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{p.brainDump}</div>}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{flex:1,height:3,borderRadius:2,background:P.bg3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:pct===100?"#4ade80":pct>0?"#60a5fa":"transparent",width:pct+"%",transition:"width .3s"}}/></div>
            <span style={{fontSize:11,color:P.dim,fontWeight:600,flexShrink:0}}>{pct}%</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:12}}>
              {SECTIONS.map(s=>{const c=pt.filter(t=>t.section===s).length;return c?<span key={s} style={{fontSize:11,color:SEC[s].color,fontWeight:500}}>{s} {c}</span>:null;})}
            </div>
            <span style={{fontSize:11,color:P.dim}}>{relTime(lastLog?.createdAt||p.createdAt)}</span>
          </div>
        </div>);
      })}
    </div>
  </div>);
}

export default function App(){
  const[data,setData]=useState({projects:[],tasks:[],logs:[]});
  const[selId,setSelId]=useState(null);
  const[view,setView]=useState("dashboard");
  const[modal,setModal]=useState(false);
  const[editP,setEditP]=useState(null);
  const[form,setForm]=useState({title:"",brainDump:"",artifactLinks:"",state:"Idea",impact:3,effort:3});
  const[ready,setReady]=useState(false);
  const[sidebar,setSidebar]=useState(true);
  const[mobileMenu,setMobileMenu]=useState(false);
  const[tab,setTab]=useState("tasks");

  useEffect(()=>{load().then(d=>{setData({projects:d.projects||[],tasks:d.tasks||[],logs:d.logs||[]});setReady(true);});},[]);
  useEffect(()=>{const h=()=>{if(window.innerWidth<768)setSidebar(false);else setSidebar(true);};h();window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);

  const persist=useCallback(n=>{setData(n);save(n);},[]);

  const sel=data.projects.find(p=>p.id===selId);
  const tasks=data.tasks.filter(t=>t.projectId===selId);
  const logs=data.logs.filter(l=>l.projectId===selId);
  const tCount=id=>data.tasks.filter(t=>t.projectId===id).length;

  const openNew=()=>{setEditP(null);setForm({title:"",brainDump:"",artifactLinks:"",state:"Idea",impact:3,effort:3});setModal(true);};
  const openEdit=p=>{setEditP(p);setForm({title:p.title,brainDump:p.brainDump,artifactLinks:p.artifactLinks||"",state:p.state||"Idea",impact:p.impact||3,effort:p.effort||3});setModal(true);};

  const saveProject=()=>{
    if(!form.title.trim())return;let n;
    if(editP){n={...data,projects:data.projects.map(p=>p.id===editP.id?{...p,...form}:p)};}
    else{const p={id:uid(),createdAt:ts(),...form};n={...data,projects:[...data.projects,p]};setSelId(p.id);setView("project");}
    persist(n);setModal(false);
  };
  const deleteProject=id=>{
    const n={projects:data.projects.filter(p=>p.id!==id),tasks:data.tasks.filter(t=>t.projectId!==id),logs:data.logs.filter(l=>l.projectId!==id)};
    persist(n);setView("dashboard");setSelId(null);
  };
  const addTask=sec=>{persist({...data,tasks:[...data.tasks,{id:uid(),projectId:selId,section:sec,title:"New task",status:"To-Do",stagingUrl:"",loomUrl:""}]});};
  const updateTask=t=>persist({...data,tasks:data.tasks.map(x=>x.id===t.id?t:x)});
  const deleteTask=id=>persist({...data,tasks:data.tasks.filter(t=>t.id!==id)});
  const moveTask=(id,s)=>persist({...data,tasks:data.tasks.map(t=>t.id===id?{...t,status:s}:t)});
  const addLog=text=>persist({...data,logs:[...data.logs,{id:uid(),projectId:selId,text,createdAt:ts()}]});

  const goProject=id=>{setSelId(id);setView("project");setTab("tasks");if(window.innerWidth<768)setMobileMenu(false);};

  const links=sel?.artifactLinks?.split("\n").filter(l=>l.trim())||[];
  const iS={width:"100%",background:P.bg0,border:`1px solid ${P.border}`,borderRadius:10,padding:"10px 14px",color:P.text,fontSize:14,outline:"none",transition:"border-color .15s"};

  if(!ready)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:P.bg0,color:P.dim,fontFamily:"-apple-system,sans-serif"}}>Loading...</div>;

  const sidebarContent=(<>
    <div style={{padding:"12px 16px 8px"}}><button onClick={openNew} className="bp" style={{width:"100%",padding:"10px 0",letterSpacing:".02em"}}>+ New project</button></div>
    <div style={{padding:"8px 8px 0"}}><button onClick={()=>{setView("dashboard");if(window.innerWidth<768)setMobileMenu(false);}} className="ch" style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:10,cursor:"pointer",background:view==="dashboard"?P.bg3:"transparent",border:`1px solid ${view==="dashboard"?P.borderL:"transparent"}`,textAlign:"left"}}><span style={{fontSize:13,color:view==="dashboard"?P.text:P.muted,fontWeight:view==="dashboard"?600:400}}>All projects</span></button></div>
    <div style={{padding:"12px 8px 16px",flex:1,overflow:"auto"}}>
      <div style={{padding:"4px 10px 6px",fontSize:10,fontWeight:700,color:P.dim,letterSpacing:".12em",textTransform:"uppercase"}}>Projects</div>
      {data.projects.map(p=>(<div key={p.id} onClick={()=>goProject(p.id)} className="ch" style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,marginBottom:2,cursor:"pointer",background:selId===p.id&&view==="project"?P.bg3:"transparent",border:`1px solid ${selId===p.id&&view==="project"?P.borderL:"transparent"}`}}>
        <span style={{width:6,height:6,borderRadius:2,background:PROJ_STATE_COLORS[p.state||"Idea"].color,flexShrink:0,transform:"rotate(45deg)"}}/>
        <span style={{fontSize:13,color:selId===p.id&&view==="project"?P.text:P.muted,fontWeight:selId===p.id&&view==="project"?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{p.title}</span>
        <span style={{fontSize:11,color:P.dim,flexShrink:0}}>{tCount(p.id)}</span>
      </div>))}
    </div>
  </>);

  return(<>
    <style>{css}</style>
    <div style={{display:"flex",height:"100vh",background:P.bg0,overflow:"hidden",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif"}}>

      {sidebar&&<div style={{width:260,minWidth:260,background:P.bg1,borderRight:`1px solid ${P.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${P.border}`}}>
          <span style={{fontSize:14,fontWeight:700,color:P.accent,letterSpacing:".08em",cursor:"pointer"}} onClick={()=>setView("dashboard")}>APP 0</span>
          <button onClick={()=>setSidebar(false)} className="bg" style={{padding:"4px 8px",borderRadius:6}}>←</button>
        </div>{sidebarContent}
      </div>}

      {mobileMenu&&<div className="ov" onClick={()=>setMobileMenu(false)} style={{alignItems:"flex-start",justifyContent:"flex-start"}}><div onClick={e=>e.stopPropagation()} className="fi" style={{width:280,height:"100%",background:P.bg1,borderRight:`1px solid ${P.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${P.border}`}}>
          <span style={{fontSize:14,fontWeight:700,color:P.accent,letterSpacing:".08em"}}>APP 0</span>
          <button onClick={()=>setMobileMenu(false)} className="bg" style={{padding:"4px 8px",borderRadius:6}}>×</button>
        </div>{sidebarContent}
      </div></div>}

      <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",minWidth:0}}>
        <div style={{padding:"8px 16px",borderBottom:`1px solid ${P.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0,background:P.bg1,minHeight:44}}>
          {!sidebar&&<button onClick={()=>{if(window.innerWidth<768)setMobileMenu(true);else setSidebar(true);}} className="bg" style={{padding:"5px 10px",borderRadius:6}}>☰</button>}
          {view==="project"&&sel&&<><button onClick={()=>setView("dashboard")} style={{background:"none",border:"none",color:P.dim,cursor:"pointer",fontSize:12}}>All projects</button><span style={{color:P.dim,fontSize:12}}>/</span><span style={{fontSize:13,color:P.muted,fontWeight:500}}>{sel.title}</span></>}
          {view==="dashboard"&&<span style={{fontSize:13,color:P.muted,fontWeight:500}}>All projects</span>}
        </div>

        {view==="dashboard"&&<Dashboard projects={data.projects} tasks={data.tasks} logs={data.logs} onSelect={goProject} onNew={openNew}/>}

        {view==="project"&&sel&&<>
          <div className="bp2" style={{padding:"24px 28px 18px",borderBottom:`1px solid ${P.border}`,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:12,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <h1 style={{margin:0,fontSize:20,fontWeight:700,color:P.text}}>{sel.title}</h1>
                <ProjPill state={sel.state||"Idea"}/>
                <PriorityDot score={(sel.impact||1)*(6-(sel.effort||3))}/>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>openEdit(sel)} className="bg" style={{padding:"5px 14px"}}>Edit</button>
                <button onClick={()=>{if(confirm("Delete project?"))deleteProject(sel.id);}} className="bg" style={{padding:"5px 14px",color:"#f87171",borderColor:"#f8717130"}}>Delete</button>
              </div>
            </div>
            {sel.brainDump&&<div style={{fontSize:14,color:P.muted,lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:120,overflow:"auto",marginBottom:links.length?10:0}}>{sel.brainDump}</div>}
            {links.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{links.map((l,i)=><a key={i} href={l.trim().startsWith("http")?l.trim():`https://${l.trim()}`} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#60a5fa",background:"#60a5fa10",border:"1px solid #60a5fa20",borderRadius:8,padding:"4px 12px",textDecoration:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:260}}>{l.trim().replace(/^https?:\/\//,"").slice(0,40)} ↗</a>)}</div>}
          </div>

          <div style={{display:"flex",gap:0,borderBottom:`1px solid ${P.border}`,padding:"0 28px",flexShrink:0}}>
            {[{k:"tasks",l:"Tasks"},{k:"log",l:"Daily log"}].map(t=><button key={t.k} onClick={()=>setTab(t.k)} style={{background:"none",border:"none",borderBottom:tab===t.k?`2px solid ${P.accent}`:"2px solid transparent",padding:"10px 16px",color:tab===t.k?P.text:P.dim,fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>{t.l}{t.k==="log"&&<span style={{marginLeft:6,fontSize:11,opacity:.6}}>{logs.length}</span>}</button>)}
          </div>

          <div className="mp" style={{flex:1,padding:"20px 28px 40px"}}>
            {tab==="tasks"&&SECTIONS.map(s=><SectionKanban key={s} section={s} tasks={tasks} onUpdate={updateTask} onDelete={deleteTask} onMove={moveTask} onAdd={addTask}/>)}
            {tab==="log"&&<DailyLog logs={logs} onAdd={addLog}/>}
          </div>
        </>}
      </div>
    </div>

    <Modal open={modal} onClose={()=>setModal(false)}>
      <h2 style={{margin:"0 0 20px",fontSize:17,fontWeight:700,color:P.text}}>{editP?"Edit project":"New project"}</h2>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={{fontSize:11,color:P.dim,display:"block",marginBottom:5,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>Title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoFocus placeholder="Project name" style={iS} onFocus={e=>e.target.style.borderColor=P.accent} onBlur={e=>e.target.style.borderColor=P.border}/></div>
        <div><label style={{fontSize:11,color:P.dim,display:"block",marginBottom:5,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>Status</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{PROJ_STATES.map(s=>{const c=PROJ_STATE_COLORS[s];return <button key={s} onClick={()=>setForm({...form,state:s})} style={{fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:20,cursor:"pointer",border:"1px solid",background:form.state===s?c.color:"transparent",color:form.state===s?"#fff":c.color,borderColor:form.state===s?"transparent":c.border,transition:"all .15s"}}>{s}</button>;})}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{fontSize:11,color:P.dim,display:"block",marginBottom:5,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>Impact (1-5)</label><div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setForm({...form,impact:n})} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:`1px solid ${n<=form.impact?"#4ade8040":P.border}`,background:n<=form.impact?"#4ade8015":"transparent",color:n<=form.impact?"#4ade80":P.dim,transition:"all .15s"}}>{n}</button>)}</div></div>
          <div><label style={{fontSize:11,color:P.dim,display:"block",marginBottom:5,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>Effort (1-5)</label><div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setForm({...form,effort:n})} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:`1px solid ${n<=form.effort?"#fbbf2440":P.border}`,background:n<=form.effort?"#fbbf2415":"transparent",color:n<=form.effort?"#fbbf24":P.dim,transition:"all .15s"}}>{n}</button>)}</div></div>
        </div>
        <div><label style={{fontSize:11,color:P.dim,display:"block",marginBottom:5,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>Brain dump</label><textarea value={form.brainDump} onChange={e=>setForm({...form,brainDump:e.target.value})} rows={4} placeholder="Core concept, target audience, differentiator..." style={{...iS,resize:"vertical",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=P.accent} onBlur={e=>e.target.style.borderColor=P.border}/></div>
        <div><label style={{fontSize:11,color:P.dim,display:"block",marginBottom:5,fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>Links (one per line)</label><textarea value={form.artifactLinks} onChange={e=>setForm({...form,artifactLinks:e.target.value})} rows={2} placeholder={"https://competitor.com\nhttps://dribbble.com/..."} style={{...iS,fontSize:13,fontFamily:"monospace",resize:"vertical",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=P.accent} onBlur={e=>e.target.style.borderColor=P.border}/></div>
        <div style={{display:"flex",gap:8,marginTop:6}}><button onClick={saveProject} className="bp" style={{flex:1,padding:"11px 0"}}>{editP?"Save changes":"Create project"}</button><button onClick={()=>setModal(false)} className="bg" style={{flex:1,padding:"11px 0",fontSize:13}}>Cancel</button></div>
      </div>
    </Modal>
  </>);
}
