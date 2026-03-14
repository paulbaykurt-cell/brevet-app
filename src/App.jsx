import { useState, useEffect, useRef, useCallback } from "react";

// ── DATA ──────────────────────────────────────────────────────────────────────
const SUBJECTS = [
  { id:"maths",    label:"Mathématiques",  icon:"📐", color:"#3B82F6", shadow:"#1D4ED8" },
  { id:"francais", label:"Français",        icon:"📚", color:"#7C3AED", shadow:"#5B21B6" },
  { id:"histoire", label:"Histoire-Géo",    icon:"🌍", color:"#059669", shadow:"#065F46" },
  { id:"svt",      label:"SVT",             icon:"🔬", color:"#D97706", shadow:"#92400E" },
  { id:"physique", label:"Physique-Chimie", icon:"⚗️",  color:"#DC2626", shadow:"#991B1B" },
  { id:"anglais",  label:"Anglais",         icon:"🗣️",  color:"#DB2777", shadow:"#9D174D" },
  { id:"emc",      label:"EMC",             icon:"⚖️",  color:"#0891B2", shadow:"#155E75" },
  { id:"techno",   label:"Technologie",     icon:"🖥️",  color:"#EA580C", shadow:"#9A3412" },
];
const CHAPTERS = {
  maths:    ["Géométrie plane","Calcul littéral","Statistiques & Probabilités","Fonctions","Calcul numérique","Pythagore & Thalès","Trigonométrie","Volumes & Aires"],
  francais: ["Grammaire","Orthographe & Conjugaison","Lecture & Compréhension","Expression écrite","Figures de style","Textes argumentatifs"],
  histoire: ["1ère Guerre Mondiale","2ème Guerre Mondiale","Guerre Froide","Décolonisation","La Ve République","Mondialisation","Géographie urbaine","Développement construit"],
  svt:      ["Génétique & Hérédité","Évolution des espèces","Corps humain & Santé","Écosystèmes","Géologie","Reproduction"],
  physique: ["Mécanique","Électricité","Optique","Chimie organique","Atomes & Molécules","Énergie & Puissance"],
  anglais:  ["Grammaire","Vocabulaire thématique","Compréhension écrite","Expression écrite","Temps & Conjugaison"],
  emc:      ["Démocratie & Citoyenneté","Droits & Libertés","Laïcité","Institutions françaises","Engagement citoyen"],
  techno:   ["Programmation & Algorithmes","Systèmes techniques","Réseaux & Internet","Développement durable","Projet technologique"],
};
const GEO_CHAPTERS = ["Géométrie plane","Pythagore & Thalès","Trigonométrie","Volumes & Aires"];
const MIX_LIST = SUBJECTS.filter(s=>s.id!=="anglais").map(s=>s.label).join(", ");
const SUBJECT_COLORS = {"Mathématiques":"#3B82F6","Français":"#7C3AED","Histoire-Géo":"#059669","SVT":"#D97706","Physique-Chimie":"#DC2626","Anglais":"#DB2777","EMC":"#0891B2","Technologie":"#EA580C"};

const BADGES = [
  {id:"first",   icon:"🎯",label:"Premier Quiz",        desc:"Tu as lancé ta première session de révision.",          hint:"Lance un quiz",                          check:s=>s.totalSessions>=1},
  {id:"streak3", icon:"🔥",label:"3 jours de suite",    desc:"Tu as révisé 3 jours consécutifs. La régularité paye !", hint:"Reviens 3 jours d'affilée",              check:s=>s.streak>=3},
  {id:"streak7", icon:"🌟",label:"Une semaine !",        desc:"7 jours de révision sans interruption. Impressionnant !", hint:"Reviens 7 jours d'affilée",            check:s=>s.streak>=7},
  {id:"xp100",   icon:"💎",label:"100 XP",               desc:"Tu as accumulé 100 points d'expérience.",               hint:"Atteins 100 XP",                         check:s=>s.xp>=100},
  {id:"xp500",   icon:"🏆",label:"500 XP",               desc:"500 XP — tu es sur la bonne voie pour le brevet !",     hint:"Atteins 500 XP",                         check:s=>s.xp>=500},
  {id:"perfect", icon:"⭐",label:"Quiz parfait",          desc:"5/5 dans un quiz. Tout bon, aucune erreur !",           hint:"Fais un quiz sans faute",                check:s=>s.bestScore>=5},
  {id:"rainbow", icon:"🌈",label:"Toutes les matières",  desc:"Tu as révisé dans toutes les matières au moins une fois.",hint:"Fais au moins 1 quiz dans 7 matières",  check:s=>Object.keys(s.subjectXP||{}).length>=7},
  {id:"maths100",icon:"📐",label:"Maître des Maths",     desc:"100 XP obtenus en Mathématiques. Pythagore serait fier.",hint:"Cumule 100 XP en Maths",                check:s=>(s.subjectXP?.maths||0)>=100},
  {id:"hist100", icon:"🌍",label:"As de l'Histoire",     desc:"100 XP en Histoire-Géo. Tu maîtrises le passé !",       hint:"Cumule 100 XP en Histoire-Géo",          check:s=>(s.subjectXP?.histoire||0)>=100},
  {id:"sess10",  icon:"🎓",label:"10 sessions",          desc:"10 sessions complètes — la persévérance c'est toi.",    hint:"Complète 10 sessions",                   check:s=>s.totalSessions>=10},
  {id:"veille",  icon:"🌙",label:"Les essentiels",        desc:"Tu as consulté les notions essentielles avant le brevet.",hint:"Utilise le mode Les essentiels",        check:s=>s.badges?.includes("veille")||false},
  {id:"sess25",  icon:"🚀",label:"25 sessions",          desc:"25 sessions — tu es un(e) vrai(e) champion(ne) du brevet !", hint:"Complète 25 sessions",               check:s=>s.totalSessions>=25},
  {id:"xp1000",  icon:"👑",label:"1000 XP",              desc:"1000 XP ! Le sommet de la progression.",                hint:"Atteins 1000 XP",                        check:s=>s.xp>=1000},
  {id:"svt100",  icon:"🔬",label:"Expert SVT",           desc:"100 XP en SVT. Les sciences n'ont plus de secrets pour toi.", hint:"Cumule 100 XP en SVT",              check:s=>(s.subjectXP?.svt||0)>=100},
  {id:"phys100", icon:"⚗️", label:"Expert Physique",     desc:"100 XP en Physique-Chimie. Einstein approuve.",         hint:"Cumule 100 XP en Physique-Chimie",       check:s=>(s.subjectXP?.physique||0)>=100},
];

// ── DIFFICULTÉ ───────────────────────────────────────────────────────────────
// ── THÈMES ───────────────────────────────────────────────────────────────────
const THEMES = [
  {
    id: "bleu",
    label: "Océan",
    emoji: "🌊",
    vars: {
      "--bg":"#EBF5FF","--bg2":"#DBEAFE","--surface":"#FFFFFF","--surface2":"#F0F7FF",
      "--border":"#BAD6F5","--border2":"#93C5E8","--text":"#0C2340","--text2":"#1E4976",
      "--muted":"#5A85AA","--accent":"#2563EB","--cta1":"#3B82F6","--cta2":"#1D4ED8",
      "--cta-shadow":"#1E40AF","--tab-active":"#2563EB",
    }
  },
  {
    id: "violet",
    label: "Cosmos",
    emoji: "🌌",
    vars: {
      "--bg":"#F5F3FF","--bg2":"#EDE9FE","--surface":"#FFFFFF","--surface2":"#FAF5FF",
      "--border":"#C4B5FD","--border2":"#A78BFA","--text":"#1E1B4B","--text2":"#3730A3",
      "--muted":"#6B7280","--accent":"#7C3AED","--cta1":"#8B5CF6","--cta2":"#6D28D9",
      "--cta-shadow":"#4C1D95","--tab-active":"#7C3AED",
    }
  },
  {
    id: "vert",
    label: "Forêt",
    emoji: "🌿",
    vars: {
      "--bg":"#F0FDF4","--bg2":"#DCFCE7","--surface":"#FFFFFF","--surface2":"#F0FDF4",
      "--border":"#A7F3D0","--border2":"#6EE7B7","--text":"#052E16","--text2":"#065F46",
      "--muted":"#6B7280","--accent":"#059669","--cta1":"#10B981","--cta2":"#047857",
      "--cta-shadow":"#065F46","--tab-active":"#059669",
    }
  },
  {
    id: "peche",
    label: "Soleil",
    emoji: "🌅",
    vars: {
      "--bg":"#FFF7ED","--bg2":"#FEF3C7","--surface":"#FFFFFF","--surface2":"#FFFBEB",
      "--border":"#FDE68A","--border2":"#FCD34D","--text":"#292524","--text2":"#78350F",
      "--muted":"#9CA3AF","--accent":"#D97706","--cta1":"#F59E0B","--cta2":"#D97706",
      "--cta-shadow":"#B45309","--tab-active":"#D97706",
    }
  },
  {
    id: "rose",
    label: "Sakura",
    emoji: "🌸",
    vars: {
      "--bg":"#FFF1F2","--bg2":"#FFE4E6","--surface":"#FFFFFF","--surface2":"#FFF1F2",
      "--border":"#FECDD3","--border2":"#FDA4AF","--text":"#1F0010","--text2":"#9F1239",
      "--muted":"#9CA3AF","--accent":"#DB2777","--cta1":"#EC4899","--cta2":"#BE185D",
      "--cta-shadow":"#9D174D","--tab-active":"#DB2777",
    }
  },
  {
    id: "sombre",
    label: "Nuit",
    emoji: "🌙",
    vars: {
      "--bg":"#0F172A","--bg2":"#1E293B","--surface":"#1E293B","--surface2":"#263244",
      "--border":"#334155","--border2":"#475569","--text":"#F1F5F9","--text2":"#CBD5E1",
      "--muted":"#94A3B8","--accent":"#60A5FA","--cta1":"#3B82F6","--cta2":"#1D4ED8",
      "--cta-shadow":"#1E3A8A","--tab-active":"#3B82F6",
    }
  },
];

function getSavedTheme(){ try{ return localStorage.getItem("brevet_theme")||"auto"; }catch{ return "auto"; } }
function saveTheme(id){ try{ localStorage.setItem("brevet_theme",id); }catch{} }

function getSystemDark(){ return window.matchMedia?.("(prefers-color-scheme: dark)").matches||false; }

function applyTheme(themeId){
  const isDark = themeId==="auto" ? getSystemDark() : themeId==="sombre";
  const id = themeId==="auto" ? (isDark?"sombre":"bleu") : themeId;
  const theme = THEMES.find(t=>t.id===id)||THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k,v])=>root.style.setProperty(k,v));
  // Dark mode body background
  document.body.style.background = theme.vars["--bg"];
}

const DIFFICULTY_LEVELS = [
  { id:"assez_bien",    label:"Assez Bien",   emoji:"🟢", range:"10–12",  desc:"Questions de base, formulations simples",          prompt:"niveau facile, questions directes sans piège, vocabulaire simple" },
  { id:"bien",          label:"Bien",          emoji:"🔵", range:"12–14",  desc:"Questions standard, niveau vrai brevet",            prompt:"niveau standard du brevet DNB, questions classiques" },
  { id:"tres_bien",     label:"Très Bien",     emoji:"🟡", range:"14–16",  desc:"Questions exigeantes, pièges classiques",           prompt:"niveau exigeant, inclus des pièges classiques et formulations ambiguës" },
  { id:"felicitations", label:"Félicitations", emoji:"🔴", range:"16+",    desc:"Questions difficiles, au-delà du brevet",           prompt:"niveau très difficile, questions complexes, raisonnement approfondi requis" },
];
function getDifficulty(){
  try{ return localStorage.getItem("brevet_difficulty")||"bien"; }catch{ return "bien"; }
}
function saveDifficulty(id){
  try{ localStorage.setItem("brevet_difficulty",id); }catch{}
}
function getDifficultyPrompt(){
  const d=DIFFICULTY_LEVELS.find(l=>l.id===getDifficulty())||DIFFICULTY_LEVELS[1];
  return d.prompt;
}

const LOADING_MESSAGES = [
  "Je prépare tes questions…","L'IA réfléchit pour toi…","On prépare tes questions…",
  "Je cherche les meilleures questions…","Presque prêt…","Je calibre la difficulté…",
  "Questions du brevet en approche…","Concentration maximale…",
];

// ── STATS ─────────────────────────────────────────────────────────────────────
const EMPTY = {streak:0,lastSession:null,xp:0,totalSessions:0,bestScore:0,badges:[],subjectXP:{},weakChapters:{},sessionHistory:[],dailyGoal:2,todaySessions:0,lastGoalDate:null};
function saveStats(s){
  try{
    localStorage.setItem("brevet_v3",JSON.stringify(s));
    // Backup auto dans sessionStorage en cas de corruption localStorage
    sessionStorage.setItem("brevet_v3_backup",JSON.stringify(s));
  }catch(e){
    // Si localStorage plein, essayer de nettoyer les questions vues
    try{
      Object.keys(localStorage).filter(k=>k.startsWith("brevet_seen_")).forEach(k=>localStorage.removeItem(k));
      localStorage.setItem("brevet_v3",JSON.stringify(s));
    }catch{}
  }
}
function getStats(){
  try{
    const d=localStorage.getItem("brevet_v3");
    if(d)return{...EMPTY,...JSON.parse(d)};
    // Essayer de récupérer depuis le backup sessionStorage
    const backup=sessionStorage.getItem("brevet_v3_backup");
    if(backup)return{...EMPTY,...JSON.parse(backup)};
    return{...EMPTY};
  }catch{return{...EMPTY};}
}

function updateStreak(s){
  const today=new Date().toISOString().split("T")[0];
  if(s.lastSession===today)return s;
  const yesterday=new Date(Date.now()-86400000).toISOString().split("T")[0];
  const newStreak=s.lastSession===yesterday?s.streak+1:1;
  const todaySessions=s.lastGoalDate===today?s.todaySessions:0;
  return {...s,streak:newStreak,lastSession:today,todaySessions,lastGoalDate:today};
}
function addXP(s,amount,subId){
  const u={...s,xp:s.xp+amount,totalSessions:s.totalSessions+1,
    subjectXP:{...s.subjectXP,[subId]:(s.subjectXP?.[subId]||0)+amount},
    todaySessions:(s.todaySessions||0)+1,lastGoalDate:new Date().toISOString().split("T")[0]};
  const nb=BADGES.filter(b=>!u.badges.includes(b.id)&&b.check(u)).map(b=>b.id);
  return{updated:{...u,badges:[...u.badges,...nb]},newBadges:nb};
}
function trackWrong(s,subId,chapter){
  if(!chapter||!subId)return s;
  const prev=s.weakChapters?.[subId]||{};
  return{...s,weakChapters:{...s.weakChapters,[subId]:{...prev,[chapter]:(prev[chapter]||0)+1}}};
}
function getWeak(s,subId){return Object.entries(s.weakChapters?.[subId]||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);}
function getLevel(xp){
  if(xp>=300)return{label:"Expert",color:"#059669",next:null,min:300};
  if(xp>=150)return{label:"Avancé",color:"#D97706",next:300,min:150};
  if(xp>=50)return{label:"Intermédiaire",color:"#3B82F6",next:150,min:50};
  return{label:"Débutant",color:"#6B7280",next:50,min:0};
}
function addSession(s,subjectLabel,score,total,mode){
  const entry={date:new Date().toLocaleDateString("fr-FR"),subjectLabel,score,total,mode,xp:score*10};
  const hist=[entry,...(s.sessionHistory||[])].slice(0,20);
  return{...s,sessionHistory:hist};
}
function getUrgentChapters(s){
  return Object.entries(s.weakChapters||{})
    .flatMap(([sid,chaps])=>Object.entries(chaps).filter(([,n])=>n>=2).map(([ch,n])=>({sid,ch,n})))
    .sort((a,b)=>b.n-a.n).slice(0,3);
}

function exportStats(){
  try{
    const stats=getStats();
    const planning=loadPlanning();
    const seen={};
    Object.keys(localStorage).filter(k=>k.startsWith("brevet_seen_")).forEach(k=>{
      try{seen[k]=JSON.parse(localStorage.getItem(k));}catch{}
    });
    const backup={stats,planning,seen,exportedAt:new Date().toISOString(),version:"v3"};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`brevet-backup-${new Date().toLocaleDateString("fr-FR").replace(/\//g,"-")}.json`;
    a.click();URL.revokeObjectURL(url);
    return true;
  }catch{return false;}
}

function importStats(file,onSuccess,onError){
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data.stats)throw new Error("Format invalide");
      saveStats({...EMPTY,...data.stats});
      if(data.planning)savePlanning(data.planning.planning,data.planning.brevetDate);
      if(data.seen)Object.entries(data.seen).forEach(([k,v])=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}});
      onSuccess();
    }catch{onError();}
  };
  reader.readAsText(file);
}

// ── Difficulty Selector ───────────────────────────────────────────────────────
// ── Theme Selector ────────────────────────────────────────────────────────────
function ThemeSelector(){
  const[current,setCurrent]=useState(()=>getSavedTheme());

  const select=(id)=>{
    playChip();
    saveTheme(id);
    setCurrent(id);
    applyTheme(id);
  };

  return(
    <div style={{background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 3px 0 var(--border2)"}}>
      <div className="section-title" style={{marginBottom:4}}>🎨 Thème de l'application</div>
      <p style={{fontSize:12,color:"var(--muted)",marginBottom:14,lineHeight:1.6}}>
        Personnalise les couleurs de l'app. Mode auto suit ton téléphone/Mac.
      </p>

      {/* Auto mode */}
      <div onClick={()=>select("auto")} style={{
        border:`1.5px solid ${current==="auto"?"var(--accent)":"var(--border)"}`,
        borderRadius:12,padding:"10px 14px",cursor:"pointer",marginBottom:10,
        background:current==="auto"?"var(--bg2)":"var(--surface)",
        display:"flex",alignItems:"center",gap:10,
        boxShadow:current==="auto"?"0 3px 0 var(--border2)":"none",
        transition:"all .15s",
      }}>
        <span style={{fontSize:22}}>✨</span>
        <div>
          <div style={{fontFamily:"var(--font-d)",fontSize:13,fontWeight:800,color:"var(--text)"}}>Auto</div>
          <div style={{fontSize:11,color:"var(--muted)"}}>Suit le mode de ton appareil (clair/sombre)</div>
        </div>
        {current==="auto"&&<span style={{marginLeft:"auto",color:"var(--accent)",fontWeight:700,fontSize:13}}>✓</span>}
      </div>

      {/* Theme grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {THEMES.map(t=>{
          const isSelected=current===t.id;
          // Preview swatch
          const bg=t.vars["--bg"];
          const surface=t.vars["--surface"];
          const accent=t.vars["--accent"];
          const text=t.vars["--text"];
          return(
            <div key={t.id} onClick={()=>select(t.id)} style={{
              border:`2px solid ${isSelected?accent:"var(--border)"}`,
              borderRadius:14,padding:"10px 8px",cursor:"pointer",
              background:surface,textAlign:"center",
              boxShadow:isSelected?`0 4px 0 ${accent}50`:"0 2px 0 var(--border2)",
              transform:isSelected?"translateY(-2px)":"none",
              transition:"all .15s cubic-bezier(.34,1.2,.64,1)",
              position:"relative",overflow:"hidden",
            }}>
              {/* Mini preview */}
              <div style={{background:bg,borderRadius:8,padding:"6px 4px",marginBottom:6,border:`1px solid ${accent}30`}}>
                <div style={{background:accent,borderRadius:4,height:6,width:"60%",margin:"0 auto 4px"}}/>
                <div style={{background:surface,borderRadius:3,height:4,width:"80%",margin:"0 auto 2px",border:`1px solid ${accent}40`}}/>
                <div style={{background:surface,borderRadius:3,height:4,width:"65%",margin:"0 auto",border:`1px solid ${accent}40`}}/>
              </div>
              <div style={{fontSize:16,marginBottom:2}}>{t.emoji}</div>
              <div style={{fontFamily:"var(--font-d)",fontSize:11,fontWeight:800,color:text}}>{t.label}</div>
              {isSelected&&<div style={{position:"absolute",top:5,right:5,background:accent,color:"#fff",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DifficultySelector(){
  const[current,setCurrent]=useState(()=>getDifficulty());
  const select=(id)=>{
    playChip();
    saveDifficulty(id);
    setCurrent(id);
  };
  const cur=DIFFICULTY_LEVELS.find(l=>l.id===current)||DIFFICULTY_LEVELS[1];
  return(
    <div style={{background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 3px 0 var(--border2)"}}>
      <div className="section-title" style={{marginBottom:4}}>🎯 Difficulté des questions</div>
      <p style={{fontSize:12,color:"var(--muted)",marginBottom:14,lineHeight:1.6}}>
        Choisis la mention que tu vises — les questions s'adaptent dans tout l'app.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {DIFFICULTY_LEVELS.map(l=>{
          const isSelected=current===l.id;
          return(
            <div key={l.id}
              onClick={()=>select(l.id)}
              style={{
                border:`1.5px solid ${isSelected?"#2563EB":"var(--border)"}`,
                borderRadius:14,padding:"12px 10px",cursor:"pointer",
                background:isSelected?"#EFF6FF":"var(--surface)",
                boxShadow:isSelected?"0 4px 0 #BAD6F5":"0 3px 0 var(--border2)",
                transform:isSelected?"translateY(-2px)":"none",
                transition:"all .15s cubic-bezier(.34,1.2,.64,1)",
              }}>
              <div style={{fontSize:20,marginBottom:5}}>{l.emoji}</div>
              <div style={{fontFamily:"var(--font-d)",fontSize:13,fontWeight:800,color:isSelected?"#1D4ED8":"#0C2340",marginBottom:2}}>{l.label}</div>
              <div style={{fontSize:10,fontWeight:700,color:isSelected?"#2563EB":"#7C3AED",background:isSelected?"#DBEAFE":"#F5F3FF",borderRadius:6,padding:"2px 6px",display:"inline-block",marginBottom:5}}>{l.range}/20</div>
              <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.45}}>{l.desc}</div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:10,padding:"8px 12px",background:"#EFF6FF",borderRadius:8,fontSize:12,color:"#1E3A8A"}}>
        Niveau actuel : {cur.emoji} <strong>{cur.label}</strong> — {cur.desc}
      </div>
    </div>
  );
}

function BackupPanel({stats,onStatsRefresh}){
  const[importing,setImporting]=useState(false);
  const[msg,setMsg]=useState(null);
  const fileRef=useRef(null);

  const handleExport=()=>{
    const ok=exportStats();
    setMsg(ok?{type:"ok",text:"✅ Backup téléchargé ! Garde ce fichier en sécurité."}:{type:"err",text:"❌ Erreur lors de l'export."});
    setTimeout(()=>setMsg(null),4000);
  };
  const handleImport=e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setImporting(true);
    importStats(file,()=>{setImporting(false);setMsg({type:"ok",text:"✅ Progression restaurée !"});onStatsRefresh();setTimeout(()=>setMsg(null),4000);},()=>{setImporting(false);setMsg({type:"err",text:"❌ Fichier invalide. Utilise un backup exporté depuis l'app."});});
  };

  const seenKeys=Object.keys(localStorage).filter(k=>k.startsWith("brevet_seen_")).length;

  return(
    <div style={{background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:16,padding:16,marginBottom:12,boxShadow:"0 3px 0 var(--border2)"}}>
      <div className="section-title" style={{marginBottom:10}}>💾 Sauvegarde & Restauration</div>
      <p style={{fontSize:12,color:"var(--muted)",marginBottom:14,lineHeight:1.6}}>
        Tes stats sont sauvegardées sur cet appareil. Pour ne pas les perdre si tu changes de navigateur ou d'appareil, exporte une sauvegarde.
      </p>
      <div style={{background:"#EFF6FF",border:"1px solid #BAD6F5",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"#1E3A8A"}}>
        📊 <strong>{stats.totalSessions}</strong> sessions · <strong>{stats.xp}</strong> XP · <strong>{seenKeys}</strong> matières avec historique de questions
      </div>
      {msg&&<div style={{padding:"9px 12px",borderRadius:10,marginBottom:10,fontSize:13,fontWeight:600,background:msg.type==="ok"?"#F0FDF4":"#FEF2F2",color:msg.type==="ok"?"#065F46":"#991B1B",border:`1.5px solid ${msg.type==="ok"?"#A7F3D0":"#FECACA"}`}}>{msg.text}</div>}
      <button className="btn-cta" onClick={handleExport} style={{marginBottom:10}}>
        ⬇️ Exporter ma progression (backup JSON)
      </button>
      <button className="btn-secondary" onClick={()=>fileRef.current?.click()} disabled={importing}>
        {importing?"Import en cours…":"⬆️ Importer une sauvegarde"}
      </button>
      <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={handleImport}/>
      <div style={{marginTop:12,padding:"8px 12px",background:"#FFFBEB",borderRadius:8,fontSize:11,color:"#92400E",lineHeight:1.5}}>
        ⚠️ L'import remplace toute ta progression actuelle. Exporte d'abord si tu veux garder les deux.
      </div>
      {seenKeys>0&&(
        <button className="btn-secondary" style={{marginTop:10,fontSize:12,color:"#DC2626",borderColor:"#FECACA"}} onClick={()=>{if(window.confirm("Effacer l'historique des questions vues ? Les prochains quiz repartiront de zéro en termes de variété.")){Object.keys(localStorage).filter(k=>k.startsWith("brevet_seen_")).forEach(k=>localStorage.removeItem(k));setMsg({type:"ok",text:"✅ Historique des questions effacé !"});setTimeout(()=>setMsg(null),3000);}}}>
          🔄 Réinitialiser l'historique des questions
        </button>
      )}
    </div>
  );
}

function savePlanning(p,brevetDate,daysLeft){
  try{localStorage.setItem("brevet_plan",JSON.stringify({planning:p,brevetDate,daysLeft,savedAt:new Date().toISOString()}));}catch{}
}
function loadPlanning(){
  try{const d=localStorage.getItem("brevet_plan");return d?JSON.parse(d):null;}catch{return null;}
}
function addWeekToPlanning(newWeek){
  try{
    const saved=loadPlanning();
    if(!saved)return;
    const merged=[...(saved.planning||[]),...newWeek];
    savePlanning(merged,saved.brevetDate,saved.daysLeft);
  }catch{}
}

// ── QUESTION HISTORY (évite les répétitions) ──────────────────────────────────
function getSeenQuestions(subjectId){
  try{const d=localStorage.getItem(`brevet_seen_${subjectId}`);return d?JSON.parse(d):[];}catch{return[];}
}
function addSeenQuestions(subjectId,questions){
  try{
    const prev=getSeenQuestions(subjectId);
    const newQ=questions.map(q=>q.question||q).filter(Boolean);
    const merged=[...newQ,...prev].slice(0,40); // garde les 40 dernières
    localStorage.setItem(`brevet_seen_${subjectId}`,JSON.stringify(merged));
  }catch{}
}
function clearSeenQuestions(subjectId){
  try{localStorage.removeItem(`brevet_seen_${subjectId}`);}catch{}
}

// ── SOUND (Web Audio API) ─────────────────────────────────────────────────────
// ── SONS ──────────────────────────────────────────────────────────────────────
function getAudioCtx(){
  try{return new(window.AudioContext||window.webkitAudioContext)();}catch{return null;}
}

// Tab nav : tick léger et précis, type "interface macOS"
function playClick(){
  if(!soundEnabled.value)return;
  const ctx=getAudioCtx();if(!ctx)return;
  const buf=ctx.createBuffer(1,ctx.sampleRate*0.04,ctx.sampleRate);
  const data=buf.getChannelData(0);
  for(let i=0;i<data.length;i++){
    const t=i/ctx.sampleRate;
    data[i]=Math.sin(2*Math.PI*1200*t)*Math.exp(-t*120)*0.3;
  }
  const src=ctx.createBufferSource();src.buffer=buf;
  const gain=ctx.createGain();gain.gain.setValueAtTime(0.6,0);
  src.connect(gain);gain.connect(ctx.destination);src.start();
}

// Carte matière : "thock" satisfaisant, grave et mat
function playCardSelect(){
  if(!soundEnabled.value)return;
  const ctx=getAudioCtx();if(!ctx)return;
  const buf=ctx.createBuffer(1,ctx.sampleRate*0.12,ctx.sampleRate);
  const data=buf.getChannelData(0);
  for(let i=0;i<data.length;i++){
    const t=i/ctx.sampleRate;
    const f=180*Math.exp(-t*15);
    data[i]=(Math.sin(2*Math.PI*f*t)+Math.sin(2*Math.PI*f*1.6*t)*0.3)*Math.exp(-t*35)*0.4;
  }
  const src=ctx.createBufferSource();src.buffer=buf;
  const gain=ctx.createGain();gain.gain.setValueAtTime(0.7,0);
  src.connect(gain);gain.connect(ctx.destination);src.start();
}

// Bouton CTA "C'est parti" : pop satisfaisant, montée rapide
function playCTA(){
  if(!soundEnabled.value)return;
  const ctx=getAudioCtx();if(!ctx)return;
  const osc=ctx.createOscillator();
  const osc2=ctx.createOscillator();
  const gain=ctx.createGain();
  osc.connect(gain);osc2.connect(gain);gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(300,ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(520,ctx.currentTime+0.08);
  osc2.frequency.setValueAtTime(600,ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(900,ctx.currentTime+0.08);
  gain.gain.setValueAtTime(0,ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25,ctx.currentTime+0.02);
  gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);
  osc.start();osc2.start();osc.stop(ctx.currentTime+0.2);osc2.stop(ctx.currentTime+0.2);
}

// Chapitre chip : tick cristallin, haut
function playChip(){
  if(!soundEnabled.value)return;
  const ctx=getAudioCtx();if(!ctx)return;
  const osc=ctx.createOscillator();
  const gain=ctx.createGain();
  osc.type="sine";
  osc.frequency.setValueAtTime(1800,ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(2400,ctx.currentTime+0.04);
  gain.gain.setValueAtTime(0.15,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start();osc.stop(ctx.currentTime+0.1);
}

// Mode card (quiz/long/stories) : "pop" médium avec résonance
function playModeSelect(){
  if(!soundEnabled.value)return;
  const ctx=getAudioCtx();if(!ctx)return;
  const buf=ctx.createBuffer(1,ctx.sampleRate*0.15,ctx.sampleRate);
  const data=buf.getChannelData(0);
  for(let i=0;i<data.length;i++){
    const t=i/ctx.sampleRate;
    const f=400-300*t*8;
    const freq=Math.max(f,120);
    data[i]=(Math.sin(2*Math.PI*freq*t)*0.6+Math.sin(2*Math.PI*freq*2*t)*0.2)*Math.exp(-t*28)*0.35;
  }
  const src=ctx.createBufferSource();src.buffer=buf;
  const gain=ctx.createGain();gain.gain.setValueAtTime(0.8,0);
  src.connect(gain);gain.connect(ctx.destination);src.start();
}

// Bonne réponse : accord majeur ascendant joyeux
function playSound(type){
  if(!soundEnabled.value)return;
  const ctx=getAudioCtx();if(!ctx)return;
  if(type==="correct"){
    [[523,0],[659,0.1],[784,0.2]].forEach(([freq,delay])=>{
      const osc=ctx.createOscillator();const g=ctx.createGain();
      osc.frequency.value=freq;osc.type="sine";
      g.gain.setValueAtTime(0,ctx.currentTime+delay);
      g.gain.linearRampToValueAtTime(0.18,ctx.currentTime+delay+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay+0.25);
      osc.connect(g);g.connect(ctx.destination);
      osc.start(ctx.currentTime+delay);osc.stop(ctx.currentTime+delay+0.3);
    });
  }
  else if(type==="wrong"){
    const osc=ctx.createOscillator();const gain=ctx.createGain();
    osc.type="sawtooth";
    osc.frequency.setValueAtTime(280,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140,ctx.currentTime+0.2);
    gain.gain.setValueAtTime(0.15,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.25);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+0.3);
  }
  else if(type==="badge"){
    [[523,0],[659,0.08],[784,0.16],[1047,0.28]].forEach(([freq,delay])=>{
      const osc=ctx.createOscillator();const g=ctx.createGain();
      osc.frequency.value=freq;osc.type="sine";
      g.gain.setValueAtTime(0,ctx.currentTime+delay);
      g.gain.linearRampToValueAtTime(0.2,ctx.currentTime+delay+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay+0.35);
      osc.connect(g);g.connect(ctx.destination);
      osc.start(ctx.currentTime+delay);osc.stop(ctx.currentTime+delay+0.4);
    });
  }
}

// ── API ───────────────────────────────────────────────────────────────────────
async function withMinDelay(promise,ms=700){const[r]=await Promise.all([promise,new Promise(res=>setTimeout(res,ms))]);return r;}
async function callClaude(prompt,system,maxTokens=2000){
  const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:maxTokens,
      system:system||"Tu es un professeur bienveillant pour réviser le brevet 3ème. Réponds UNIQUEMENT en JSON valide sans backticks.",
      messages:[{role:"user",content:prompt}]})});
  const data=await r.json();
  if(data.error)throw new Error(data.error.message||"Erreur API");
  const raw=(data.content?.[0]?.text||"");
  // Nettoyage robuste : retire les backticks markdown
  let cleaned=raw.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
  // Si ça commence pas par { ou [, extraire le premier objet JSON trouvé
  if(!cleaned.startsWith("{")&&!cleaned.startsWith("[")){
    const match=cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if(match)cleaned=match[1];
  }
  // Couper tout ce qui vient après le dernier } ou ]
  const lastBrace=Math.max(cleaned.lastIndexOf("}"),cleaned.lastIndexOf("]"));
  if(lastBrace>0)cleaned=cleaned.substring(0,lastBrace+1);
  return JSON.parse(cleaned);
}
async function callClaudeText(prompt,system){
  const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:800,
      system:system||"Tu génères uniquement du SVG valide, sans markdown.",
      messages:[{role:"user",content:prompt}]})});
  const data=await r.json();
  if(data.error)throw new Error(data.error.message);
  return data.content?.[0]?.text||"";
}

// ── PROMPTS ───────────────────────────────────────────────────────────────────
const buildQuizPrompt=(subject,chapter,weak=[],count=5,seen=[])=>{
  const seed=Math.floor(Math.random()*99999);
  const hint=weak.length?` Priorité sur ces chapitres fragiles: ${weak.join(", ")}.`:"";
  const avoid=seen.length?`\nÉVITE ABSOLUMENT ces questions déjà posées:\n${seen.slice(0,15).map((q,i)=>`${i+1}. "${q}"`).join("\n")}`:"";
  const diff=getDifficultyPrompt();
  return`[Seed:${seed}] Génère exactement ${count} QCM NOUVEAUX et variés sur "${subject}"${chapter?` chapitre "${chapter}"`:" (sujets les plus probables au brevet)"}.${hint}${avoid}
Difficulté : ${diff}.
Programme officiel 3ème. Varie les formulations, niveaux, angles d'approche.
JSON:{"questions":[{"question":"...","chapter":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."}]}`;
};
const buildMixPrompt=(seen=[])=>{
  const seed=Math.floor(Math.random()*99999);
  const avoid=seen.length?`\nÉVITE ces questions déjà posées:\n${seen.slice(0,10).map((q,i)=>`${i+1}. "${q}"`).join("\n")}`:"";
  const diff=getDifficultyPrompt();
  return`[Seed:${seed}] Génère 5 QCM mélangés et variés pour le brevet. Matières: ${MIX_LIST}.${avoid}\nDifficulté : ${diff}.\nJSON:{"questions":[{"question":"...","matiere":"...","chapter":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."}]}`;
};
const buildMixLongPrompt=()=>`Génère 1 question ouverte type brevet. Matières: ${MIX_LIST}.
JSON:{"question":"...","matiere":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;
const buildLongPrompt=(subject,chapter)=>{
  if(chapter==="Développement construit")return`Génère 1 développement construit Histoire-Géo type brevet 3ème (10 pts).\nJSON:{"question":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;
  if(subject==="Anglais")return`Génère 1 exercice anglais niveau 3ème${chapter?` sur "${chapter}"`:""}.\nJSON:{"question":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;
  return`Génère 1 question ouverte type brevet sur "${subject}"${chapter?` chapitre "${chapter}"`:" (sujets les plus probables)"} élève 3ème.\nJSON:{"question":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;
};
// ── VRAIS SUJETS BREVET par matière ──────────────────────────────────────────
const EXAM_SUBJECTS = [
  {
    id: "francais",
    label: "Français",
    icon: "📚",
    color: "#7C3AED",
    duration: 3 * 60,
    durationLabel: "3h",
    description: "Compréhension, réécriture, dictée et rédaction",
    structure: [
      {part:"Compréhension de texte", points:20, type:"open"},
      {part:"Réécriture", points:10, type:"open"},
      {part:"Dictée / Orthographe", points:10, type:"open"},
      {part:"Rédaction", points:40, type:"open"},
    ]
  },
  {
    id: "maths",
    label: "Mathématiques",
    icon: "📐",
    color: "#3B82F6",
    duration: 2 * 60,
    durationLabel: "2h",
    description: "Calcul, géométrie, statistiques et problèmes",
    structure: [
      {part:"Exercice 1 — Calcul numérique & algèbre", points:20, type:"open"},
      {part:"Exercice 2 — Géométrie (Pythagore/Thalès/Trigo)", points:20, type:"open"},
      {part:"Exercice 3 — Statistiques & Probabilités", points:15, type:"open"},
      {part:"Exercice 4 — Problème de modélisation", points:25, type:"open"},
    ]
  },
  {
    id: "histoire",
    label: "Histoire-Géo & EMC",
    icon: "🌍",
    color: "#059669",
    duration: 2 * 60,
    durationLabel: "2h",
    description: "Histoire, Géographie et EMC — épreuve combinée",
    structure: [
      {part:"Histoire — Étude de documents", points:20, type:"open"},
      {part:"Histoire — Développement construit", points:20, type:"open"},
      {part:"Géographie — Étude de documents", points:20, type:"open"},
      {part:"EMC — Question de réflexion", points:20, type:"open"},
    ]
  },
  {
    id: "sciences",
    label: "Sciences",
    icon: "🔬",
    color: "#D97706",
    duration: 1 * 60,
    durationLabel: "1h",
    description: "2 disciplines parmi SVT, Physique-Chimie, Technologie (30 min chacune)",
    structure: [
      {part:"Discipline 1 — SVT ou Physique-Chimie", points:25, type:"open"},
      {part:"Discipline 2 — Physique-Chimie ou Technologie", points:25, type:"open"},
    ]
  },
];

const PAST_SUBJECTS = {
  francais: `Sujets réels des brevets précédents :
- 2023 : Texte de Romain Gary "La promesse de l'aube" — compréhension + rédaction sur la famille
- 2022 : Texte de Zola — description naturaliste, figures de style, réécriture à l'imparfait
- 2021 : Texte sur l'écologie — argumentation, connecteurs logiques, rédaction
- 2019 : Texte de Maupassant — point de vue narratif, champ lexical, réécriture
Thèmes récurrents : famille, nature, société, liberté, amitié`,

  maths: `Sujets réels des brevets précédents :
- 2023 : Théorème de Pythagore (triangle rectangle), statistiques (moyenne, médiane), équations du premier degré, probabilités (urne), problème de géométrie dans l'espace (volume d'un cône)
- 2022 : Thalès (droites parallèles), fonctions affines, calcul littéral, fractions, trigonométrie, statistiques (diagramme)
- 2021 : Pythagore + réciproque, expressions algébriques, probabilités (tableau de loi), géométrie plane (aires), repérage cartésien
- 2019 : Proportionnalité, équations, inéquations, géométrie (Thalès), statistiques (quartiles)
Thèmes récurrents : Pythagore, Thalès, probabilités, statistiques, fonctions affines`,

  histoire: `Sujets réels des brevets précédents :
- 2023 : Histoire = La Guerre Froide (Berlin, Cuba), Géo = La mondialisation des échanges, EMC = La laïcité en France
- 2022 : Histoire = La 2ème Guerre Mondiale (Shoah, Résistance), Géo = Espaces urbains dans le monde, EMC = Droits et libertés fondamentaux
- 2021 : Histoire = La Ve République (De Gaulle, institutions), Géo = Les inégalités de développement, EMC = La démocratie représentative
- 2019 : Histoire = La décolonisation, Géo = L'Union Européenne, EMC = Engagement citoyen
Thèmes récurrents : 2GM, Guerre Froide, Ve République, mondialisation, développement durable`,

  sciences: `Sujets réels des brevets précédents :
- 2023 : SVT = Génétique (ADN, mutations, hérédité), Physique = Électricité (circuits, loi d'Ohm), Techno = Objets connectés et programmation Python
- 2022 : SVT = Écosystèmes et biodiversité, Physique = Optique (lumière, lentilles), Techno = Développement durable et éco-conception
- 2021 : SVT = Corps humain (système immunitaire, vaccins), Physique = Mécanique (vitesse, forces), Techno = Algorithmes et systèmes embarqués
- 2019 : SVT = Reproduction et génétique, Physique = Énergie (puissance, rendement), Techno = Réseaux et protocoles
Thèmes récurrents : génétique, électricité, écosystèmes, optique, programmation`,
};

const buildRealExamPrompt = (examSubject, partIndex) => {
  const ex = EXAM_SUBJECTS.find(e => e.id === examSubject);
  const part = ex.structure[partIndex];
  const past = PAST_SUBJECTS[examSubject] || "";
  const seed = Math.floor(Math.random()*99999);

  const subjectHint = examSubject === "sciences"
    ? "SVT, Physique-Chimie et Technologie niveau 3ème"
    : examSubject === "histoire"
    ? "Histoire-Géographie et EMC niveau 3ème"
    : `${ex.label} niveau 3ème`;

  return `[Seed:${seed}] Tu es concepteur d'épreuves du Brevet des collèges (DNB) français.
Génère une question de type examen officiel pour la partie : "${part.part}" (barème : ${part.points} points).
Matière : ${subjectHint}.
${past}
Inspire-toi des vrais sujets ci-dessus. La question doit être réaliste, précise, au niveau 3ème.
Fournis aussi un document/texte support si la partie le nécessite.
JSON:{"question":"...","document":"(texte ou données support, vide si pas nécessaire)","consignes":["consigne 1","consigne 2","consigne 3"],"bareme":["critère 1 (X pts)","critère 2 (X pts)"],"correction":"correction type détaillée","points_cles":["point 1","point 2","point 3"]}`;
};
const buildVeillePrompt=(subject)=>`Génère les 15 notions ABSOLUMENT essentielles à connaître la essentiels pour "${subject}". Programme officiel 3ème. Ce qui tombe TOUJOURS.
JSON:{"notions":[{"titre":"...","contenu":"...","exemple":"...","astuces":"..."}]}`;
const buildFichePrompt=(subject,chapter)=>`Génère une mini-fiche de 3 points CLÉS à retenir sur "${subject}"${chapter?` chapitre "${chapter}"`:""}. Ultra-concis, mnémotechnique si possible.
JSON:{"points":[{"titre":"...","contenu":"..."}]}`;
const buildGradePrompt=(question,answer,correction)=>`Tu es un correcteur de brevet. Note cette réponse d'élève de 3ème.
Question: "${question}"
Réponse de l'élève: "${answer}"
Correction officielle: "${correction}"
Évalue sur 10 avec commentaires bienveillants. Sois précis sur ce qui manque.
JSON:{"note":7,"commentaire":"...","points_forts":["..."],"points_a_ameliorer":["..."]}`;
const buildSummaryPrompt=(weakChapters,subjectXP)=>{
  const weak=Object.entries(weakChapters||{}).flatMap(([sid,c])=>Object.entries(c).map(([ch,n])=>({sid,ch,n}))).sort((a,b)=>b.n-a.n).slice(0,5);
  const strong=Object.entries(subjectXP||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  return`Génère un résumé de révision personnalisé pour un élève de 3ème préparant le brevet.
Points fragiles: ${weak.map(w=>w.ch).join(", ")||"aucun encore"}.
Points forts: ${strong.join(", ")||"pas encore évalués"}.
Donne des conseils précis, motivants, et un plan pour les 3 prochains jours.
JSON:{"message_motivant":"...","analyse":"...","plan_3jours":[{"jour":"Jour 1","focus":"...","action":"..."},{"jour":"Jour 2","focus":"...","action":"..."},{"jour":"Jour 3","focus":"...","action":"..."}],"conseil_final":"..."}`;
};
const buildErrorPrompt=(q,w,c,subjectId)=>{
  const addEtym=subjectId==="francais"||subjectId==="histoire"||subjectId==="svt"||subjectId==="emc";
  return`Élève de 3ème a répondu "${w}" à cette question : "${q}". Bonne réponse : "${c}".
Explique en 2-3 phrases simples et directes pourquoi c'est faux — style détendu, pas trop soutenu.${addEtym?"\nSi un mot clé de la question a une étymologie intéressante (grec, latin…), ajoute UNE phrase courte du style : \"Au fait : 'cellule' vient du latin cellula (petite chambre).\" Sinon laisse le champ vide.":""}
JSON:{"explication_erreur":"...","etymologie":"${addEtym?"si pertinent, sinon vide":""}"}`;
};
const buildPlanningPrompt=(dateStr,daysLeft,fromDateISO,userStats)=>{
  const phase=daysLeft>60?"FONDATIONS":daysLeft>21?"CIBLAGE":daysLeft>7?"INTENSIF":"FINAL";
  const from=fromDateISO||new Date().toISOString().split("T")[0];

  // Construire le profil personnalisé de l'élève
  let profileHint="";
  if(userStats){
    const weak=Object.entries(userStats.weakChapters||{})
      .flatMap(([sid,chaps])=>Object.entries(chaps).map(([ch,n])=>({sid,ch,n})))
      .sort((a,b)=>b.n-a.n).slice(0,5);
    const strong=Object.entries(userStats.subjectXP||{})
      .sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>SUBJECTS.find(s=>s.id===e[0])?.label||e[0]);
    const weakStr=weak.map(w=>{const s=SUBJECTS.find(s=>s.id===w.sid);return`${s?.label||w.sid}: ${w.ch} (raté ${w.n}x)`;}).join(", ");
    if(weakStr)profileHint+=`\nCHAPITRES FRAGILES à prioriser ABSOLUMENT : ${weakStr}.`;
    if(strong.length)profileHint+=`\nMatières fortes (moins prioritaires) : ${strong.join(", ")}.`;
    if(userStats.totalSessions<5)profileHint+=`\nÉlève débutant (${userStats.totalSessions} sessions) : commence par les bases.`;
  }

  return`Tu génères UN PLANNING DE RÉVISION PERSONNALISÉ pour le brevet 3ème.
Brevet le : ${dateStr}. Jours restants : ${daysLeft}. Phase : ${phase}.
Génère EXACTEMENT 7 jours à partir du ${from} (inclus).
Matières : Mathématiques, Français, Histoire-Géo, SVT, Physique-Chimie, EMC, Technologie.
Weekends : max 1-2 sessions légères. Jours de semaine : 2-3 sessions de 20 min chacune.${profileHint}
Adapte les matières à la phase : ${phase==="FONDATIONS"?"révisions larges":phase==="CIBLAGE"?"chapitres fréquents au brevet":phase==="INTENSIF"?"sujets les plus probables":phase==="FINAL"?"fiches synthèse uniquement"}.
RÉPONDS UNIQUEMENT avec ce JSON valide, rien d'autre :
{"jours":[{"date":"DD/MM","dateISO":"YYYY-MM-DD","jour":"Lundi","sessions":[{"matiere":"Mathématiques","chapitre":"Pythagore & Thalès","duree":"20 min","exercice":"Quiz QCM"}]}]}`;
};
const buildSvgPrompt=q=>`SVG simple (viewBox="0 0 220 180") pour: "${q}". stroke="#3B82F6" fill="none" strokeWidth="2", labels fill="#1E3A5F" fontSize="12". SVG uniquement.`;

// ── CSS ───────────────────────────────────────────────────────────────────────
const css=`
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --font-d:-apple-system,"SF Pro Display","Segoe UI",system-ui,sans-serif;
    --font-b:-apple-system,"SF Pro Text","Segoe UI",system-ui,sans-serif;
    --bg:#EBF5FF;--bg2:#DBEAFE;--surface:#FFFFFF;--surface2:#F0F7FF;
    --border:#BAD6F5;--border2:#93C5E8;--text:#0C2340;--text2:#1E4976;--muted:#5A85AA;
  }
  body{font-family:var(--font-b);background:var(--bg);min-height:100vh;color:#0C2340;}
  .app{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px 14px 120px;}
  .container{width:100%;max-width:680px;}

  .header{text-align:center;margin-bottom:16px;}
  .badge-pill{display:inline-flex;align-items:center;gap:7px;background:#DBEAFE;border:1.5px solid #3B82F6;color:#1E3A8A;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:999px;margin-bottom:12px;}
  .badge-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:pulse 2s ease-in-out infinite;}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
  .header h1{font-family:var(--font-d);font-size:clamp(24px,6vw,44px);font-weight:800;line-height:1.05;letter-spacing:-1.5px;margin-bottom:5px;}
  .h1-accent{color:#2563EB;}
  .header p{color:#5A85AA;font-size:13px;}

  /* Welcome back */
  .welcome-back{background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border:1.5px solid #BAD6F5;border-radius:16px;padding:14px 16px;margin-bottom:14px;box-shadow:0 3px 0 #93C5E8;}
  .welcome-back-title{font-family:var(--font-d);font-size:14px;font-weight:800;color:#1E3A8A;margin-bottom:4px;}
  .welcome-back-text{font-size:12px;color:#3B5A8A;line-height:1.55;}

  /* Urgent alert */
  .urgent-alert{background:#FEF2F2;border:1.5px solid #FECACA;border-radius:14px;padding:13px 15px;margin-bottom:12px;box-shadow:0 3px 0 #FECACA;}
  .urgent-alert-title{font-family:var(--font-d);font-size:13px;font-weight:800;color:#991B1B;margin-bottom:6px;}
  .urgent-chip{display:inline-flex;align-items:center;gap:5px;background:#fff;border:1px solid #FECACA;border-radius:8px;padding:4px 10px;font-size:12px;color:#7F1D1D;cursor:pointer;margin:3px 3px 0 0;transition:transform .14s;}
  .urgent-chip:hover{transform:translateY(-2px);}

  /* Daily goal */
  .daily-goal{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:12px 15px;margin-bottom:12px;box-shadow:0 3px 0 var(--border2);}
  .daily-goal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
  .daily-goal-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#2563EB;font-weight:700;}
  .daily-goal-count{font-family:var(--font-d);font-size:13px;font-weight:800;color:#0C2340;}
  .goal-bar{height:8px;background:var(--bg2);border-radius:999px;overflow:hidden;}
  .goal-fill{height:100%;background:linear-gradient(90deg,#10B981,#059669);border-radius:999px;transition:width .6s cubic-bezier(.34,1.56,.64,1);}

  /* Dashboard */
  .dashboard{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
  .dash-card{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:14px;box-shadow:0 3px 0 var(--border2);}
  .dash-full{grid-column:span 2;}
  .dash-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:5px;}
  .dash-big{font-family:var(--font-d);font-size:30px;font-weight:800;color:#0C2340;line-height:1;}
  .dash-sub{font-size:12px;color:var(--muted);margin-top:3px;}
  .xp-bar{height:6px;background:var(--bg2);border-radius:999px;margin-top:8px;overflow:hidden;}
  .xp-fill{height:100%;background:linear-gradient(90deg,var(--cta1),var(--cta2));border-radius:999px;transition:width .6s;}
  .badges-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;}
  .badge-chip{background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:4px 10px;font-size:12px;}
  .weak-list{display:flex;flex-direction:column;gap:6px;margin-top:7px;}
  .weak-item{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2);}
  .weak-dot{width:8px;height:8px;border-radius:50%;background:#DC2626;flex-shrink:0;}
  .new-badge-toast{background:#FEF3C7;border:1.5px solid #FDE68A;border-radius:12px;padding:10px 14px;margin-bottom:10px;font-size:13px;color:#92400E;font-weight:600;text-align:center;animation:popIn .4s cubic-bezier(.34,1.56,.64,1);}
  @keyframes popIn{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}
  .xp-toast{display:inline-block;background:#DBEAFE;border:1.5px solid #93C5FD;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:700;color:#1D4ED8;margin-bottom:12px;}

  /* Tabs */
  .home-tabs{display:flex;gap:4px;margin-bottom:14px;background:var(--bg2);border-radius:14px;padding:4px;border:1.5px solid var(--border);overflow-x:auto;}
  .home-tab{flex:1;min-width:56px;padding:9px 5px;border-radius:10px;border:none;background:transparent;color:var(--muted);font-family:var(--font-b);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:3px;white-space:nowrap;}
  .home-tab.active{background:var(--tab-active);color:#fff;box-shadow:0 3px 8px rgba(0,0,0,.2);}
  .section-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#2563EB;margin-bottom:12px;font-weight:700;}

  /* Quick 2min button */
  .quick-btn{width:100%;padding:14px 20px;border-radius:16px;border:2px dashed #3B82F6;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);color:#1D4ED8;font-family:var(--font-d);font-size:14px;font-weight:800;cursor:pointer;margin-bottom:12px;transition:transform .16s cubic-bezier(.34,1.56,.64,1),box-shadow .16s;display:flex;align-items:center;justify-content:center;gap:8px;}
  .quick-btn:hover{transform:translateY(-3px);box-shadow:0 6px 0 #BAD6F5;}
  .quick-btn:active{transform:translateY(3px)!important;box-shadow:none!important;}

  /* Subject grid */
  .subject-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;}
  .subject-card{width:calc(25% - 8px);min-width:130px;background:var(--surface);border:1.5px solid var(--border);border-radius:18px;padding:18px 10px;cursor:pointer;text-align:center;transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s;box-shadow:0 4px 0 var(--border2);user-select:none;position:relative;overflow:hidden;}
  .subject-card::before{content:'';position:absolute;inset:0;border-radius:17px;background:linear-gradient(180deg,rgba(255,255,255,.7) 0%,transparent 60%);pointer-events:none;}
  .subject-card:hover{transform:translateY(-4px);box-shadow:0 8px 0 var(--border2);}
  .subject-card:active{transform:translateY(3px) scale(.97)!important;box-shadow:0 1px 0 var(--border2)!important;}
  @media(max-width:520px){.subject-card{width:calc(50% - 6px);}}
  .subject-icon{font-size:28px;margin-bottom:7px;line-height:1;}
  .subject-label{font-size:11px;font-weight:700;color:#1E4976;line-height:1.3;}
  .subject-lv{font-size:10px;font-weight:600;margin-top:4px;}

  /* Mix */
  .mix-card{background:var(--surface);border:1.5px solid var(--border);border-radius:20px;padding:20px;text-align:center;margin-bottom:14px;box-shadow:0 4px 0 var(--border2);}
  .mix-title{font-family:var(--font-d);font-size:20px;font-weight:800;margin-bottom:5px;}
  .mix-desc{font-size:13px;color:var(--muted);margin-bottom:16px;}

  /* Setup */
  .setup-pill{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:999px;font-family:var(--font-d);font-size:14px;font-weight:800;margin-bottom:20px;background:var(--surface);box-shadow:0 3px 0 var(--border2);border:1.5px solid var(--border);}
  .training-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
  @media(max-width:480px){.training-grid{grid-template-columns:1fr;}}
  .training-card{background:var(--surface);border:1.5px solid var(--border);border-radius:18px;padding:20px 12px;cursor:pointer;text-align:center;transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s;box-shadow:0 5px 0 var(--border2);user-select:none;position:relative;overflow:hidden;}
  .training-card::before{content:'';position:absolute;inset:0;border-radius:17px;background:linear-gradient(180deg,rgba(255,255,255,.6) 0%,transparent 60%);pointer-events:none;}
  .training-card:hover{transform:translateY(-4px);box-shadow:0 9px 0 var(--border2);}
  .training-card:active{transform:translateY(4px) scale(.98)!important;box-shadow:0 1px 0 var(--border2)!important;}
  .training-icon{font-size:30px;margin-bottom:8px;}
  .training-label{font-family:var(--font-d);font-size:13px;font-weight:800;margin-bottom:4px;color:#0C2340;}
  .training-desc{font-size:11px;color:var(--muted);}
  .chapter-chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px;}
  .chapter-chip{padding:7px 12px;border-radius:10px;border:1.5px solid var(--border);background:var(--surface);color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;transition:transform .14s cubic-bezier(.34,1.56,.64,1);box-shadow:0 3px 0 var(--border2);}
  .chapter-chip:hover{transform:translateY(-2px);}
  .chapter-chip:active{transform:translateY(2px)!important;}
  .mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;}
  @media(max-width:480px){.mode-grid{grid-template-columns:1fr;}}
  .mode-card{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:16px 12px;cursor:pointer;transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s;box-shadow:0 4px 0 var(--border2);user-select:none;position:relative;overflow:hidden;}
  .mode-card::before{content:'';position:absolute;inset:0;border-radius:15px;background:linear-gradient(180deg,rgba(255,255,255,.6) 0%,transparent 60%);pointer-events:none;}
  .mode-card:hover{transform:translateY(-4px);box-shadow:0 8px 0 var(--border2);}
  .mode-card:active{transform:translateY(3px) scale(.98)!important;box-shadow:0 1px 0 var(--border2)!important;}
  .mode-icon{font-size:24px;margin-bottom:5px;}
  .mode-label{font-family:var(--font-d);font-size:13px;font-weight:800;margin-bottom:2px;color:#0C2340;}
  .mode-desc{font-size:11px;color:var(--muted);}

  /* Count selector */
  .count-selector{display:flex;gap:8px;margin-bottom:16px;}
  .count-btn{flex:1;padding:10px;border-radius:12px;border:1.5px solid var(--border);background:var(--surface);color:var(--text2);font-family:var(--font-d);font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;box-shadow:0 3px 0 var(--border2);}
  .count-btn:hover{transform:translateY(-2px);}
  .count-btn.selected{background:#2563EB;color:#fff;border-color:#2563EB;box-shadow:0 3px 0 #1E40AF;}

  /* Mini fiche */
  .mini-fiche{background:linear-gradient(135deg,#F5F3FF,#EDE9FE);border:1.5px solid #C4B5FD;border-radius:14px;padding:14px;margin-bottom:14px;}
  .mini-fiche-title{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#6D28D9;font-weight:700;margin-bottom:10px;}
  .mini-fiche-point{display:flex;gap:8px;margin-bottom:8px;font-size:13px;line-height:1.5;}
  .mini-fiche-point-title{font-weight:700;color:#4C1D95;white-space:nowrap;}
  .mini-fiche-point-text{color:#5B21B6;}

  /* Buttons */
  .btn-cta{display:block;width:100%;padding:15px 20px;border-radius:14px;border:none;background:linear-gradient(180deg,var(--cta1),var(--cta2));color:#fff;font-family:var(--font-d);font-size:15px;font-weight:800;cursor:pointer;transition:transform .16s cubic-bezier(.34,1.56,.64,1),box-shadow .16s;box-shadow:0 6px 0 var(--cta-shadow),0 8px 24px rgba(0,0,0,.2);user-select:none;position:relative;overflow:hidden;}
  .btn-cta::before{content:'';position:absolute;top:0;left:0;right:0;height:50%;background:rgba(255,255,255,.15);border-radius:14px 14px 0 0;pointer-events:none;}
  .btn-cta:hover{transform:translateY(-2px);box-shadow:0 8px 0 var(--cta-shadow),0 12px 32px rgba(0,0,0,.25);}
  .btn-cta:active{transform:translateY(5px)!important;box-shadow:0 1px 0 var(--cta-shadow)!important;transition-duration:.08s!important;}
  .btn-cta:disabled{background:var(--bg2);color:var(--muted);box-shadow:0 3px 0 var(--border)!important;cursor:not-allowed;transform:none!important;}
  .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1.5px solid var(--border);color:var(--text2);padding:9px 14px;border-radius:10px;font-family:var(--font-b);font-size:13px;font-weight:600;cursor:pointer;margin-bottom:18px;transition:transform .14s cubic-bezier(.34,1.56,.64,1),box-shadow .14s;box-shadow:0 3px 0 var(--border2);user-select:none;}
  .btn-ghost:hover{transform:translateY(-2px);box-shadow:0 5px 0 var(--border2);background:var(--bg2);}
  .btn-ghost:active{transform:translateY(2px)!important;box-shadow:0 1px 0 var(--border2)!important;}
  .btn-secondary{display:flex;align-items:center;justify-content:center;gap:6px;background:var(--surface2);border:1.5px solid var(--border);color:var(--text2);padding:10px 14px;border-radius:10px;font-family:var(--font-b);font-size:13px;font-weight:600;cursor:pointer;margin-top:10px;box-shadow:0 3px 0 var(--border2);width:100%;transition:transform .14s;}
  .btn-secondary:hover{transform:translateY(-2px);}
  .btn-danger{display:inline-flex;align-items:center;gap:6px;background:#FEF2F2;border:1.5px solid #FECACA;color:#991B1B;padding:10px 14px;border-radius:10px;font-family:var(--font-b);font-size:13px;font-weight:600;cursor:pointer;transition:transform .14s;box-shadow:0 3px 0 #FECACA;width:100%;justify-content:center;}

  /* Spinner */
  .loading{text-align:center;padding:60px 0;}
  .spin-ring{width:46px;height:46px;margin:0 auto 16px;position:relative;}
  .spin-ring::before{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid var(--border);}
  .spin-ring::after{content:'';position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:#3B82F6;border-right-color:#1D4ED8;animation:spin .75s linear infinite;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .loading p{color:var(--muted);font-size:14px;}

  /* Progress */
  .progress-wrap{margin-bottom:16px;}
  .progress-info{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:600;}
  .progress-bar{height:8px;background:var(--bg2);border-radius:999px;}
  .progress-fill{height:100%;background:linear-gradient(90deg,var(--cta1),var(--cta2));border-radius:999px;transition:width .5s;position:relative;}
  .progress-fill::after{content:'';position:absolute;right:-5px;top:50%;transform:translateY(-50%);width:14px;height:14px;background:var(--surface);border-radius:50%;border:3px solid var(--cta1);}

  /* Question */
  .question-card{background:var(--surface);border:1.5px solid var(--border);border-radius:20px;padding:20px;margin-bottom:12px;box-shadow:0 4px 0 var(--border2);position:relative;overflow:hidden;}
  .question-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#3B82F6,#1D4ED8);border-radius:20px 20px 0 0;}
  .q-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;font-weight:700;}
  .q-text{font-family:var(--font-d);font-size:16px;font-weight:700;line-height:1.5;color:#0C2340;}
  .q-context{font-size:13px;color:var(--text2);margin-top:10px;line-height:1.65;padding:10px 12px;background:#EFF6FF;border-radius:10px;border-left:3px solid #3B82F6;}
  .brevet-banner{background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:12px;padding:11px 13px;margin-bottom:11px;display:flex;gap:10px;}
  .brevet-banner-text{font-size:12px;color:#1E40AF;line-height:1.55;}
  .brevet-banner-text strong{display:block;font-weight:700;margin-bottom:2px;}
  .geo-btn{display:inline-flex;align-items:center;gap:5px;margin-top:9px;padding:6px 11px;border-radius:9px;border:1.5px solid #BFDBFE;background:#EFF6FF;color:#1D4ED8;font-size:12px;font-weight:600;cursor:pointer;}
  .geo-btn:hover{background:#DBEAFE;}
  .geo-figure{margin-top:10px;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:12px;padding:12px;display:flex;align-items:center;justify-content:center;}

  /* Choices */
  .choices{display:grid;gap:8px;margin-bottom:11px;}
  .choice-btn{width:100%;padding:13px 14px;border-radius:12px;border:1.5px solid var(--border);background:#fff;color:#0C2340;font-family:var(--font-b);font-size:14px;text-align:left;cursor:pointer;transition:transform .14s cubic-bezier(.34,1.56,.64,1),box-shadow .14s;box-shadow:0 4px 0 var(--border2);user-select:none;}
  .choice-btn:hover:not(:disabled){background:var(--bg2);transform:translateY(-2px);box-shadow:0 6px 0 var(--border2);}
  .choice-btn:active:not(:disabled){transform:translateY(3px)!important;box-shadow:0 1px 0 var(--border2)!important;}
  .choice-btn.correct{background:#ECFDF5;border-color:#10B981;color:#065F46;box-shadow:0 4px 0 #A7F3D0;animation:popCorrect .4s cubic-bezier(.34,1.56,.64,1);}
  .choice-btn.wrong{background:#FEF2F2;border-color:#EF4444;color:#991B1B;box-shadow:0 4px 0 #FECACA;animation:shakeWrong .45s ease;}
  @keyframes popCorrect{0%{transform:scale(1)}45%{transform:scale(1.03) translateY(-2px)}100%{transform:scale(1)}}
  @keyframes shakeWrong{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
  .explanation{background:#F0FDF4;border:1.5px solid #A7F3D0;border-radius:12px;padding:12px;margin-bottom:10px;font-size:13px;line-height:1.65;color:#065F46;}
  .explanation strong{color:#059669;display:block;margin-bottom:4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;}
  .error-explain{background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:12px;padding:12px;margin-bottom:10px;font-size:13px;line-height:1.65;color:#7C2D12;}
  .error-explain strong{color:#EA580C;display:block;margin-bottom:4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;}
  .correction-card{background:#F5F3FF;border:1.5px solid #C4B5FD;border-radius:16px;padding:16px;margin-bottom:10px;}
  .correction-card h3{font-family:var(--font-d);font-size:11px;color:#6D28D9;margin-bottom:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}
  .correction-text{font-size:13px;line-height:1.75;color:#3B0764;}
  .points-cles{margin-top:10px;display:flex;flex-direction:column;gap:6px;}
  .point{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:var(--text2);}
  .point::before{content:'✓';color:#059669;font-weight:700;flex-shrink:0;}
  .answer-area{width:100%;min-height:120px;background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:12px;color:#0C2340;font-family:var(--font-b);font-size:14px;line-height:1.6;resize:vertical;outline:none;margin-bottom:10px;transition:border-color .2s;}
  .answer-area:focus{border-color:#3B82F6;box-shadow:0 0 0 3px rgba(59,130,246,.12);}
  .answer-area::placeholder{color:var(--muted);}

  /* Self-eval slider */
  .self-eval{background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:12px;padding:13px;margin-bottom:11px;}
  .self-eval-label{font-size:12px;font-weight:700;color:#92400E;margin-bottom:10px;}
  .self-eval-row{display:flex;gap:8px;}
  .eval-btn{flex:1;padding:8px 4px;border-radius:10px;border:1.5px solid #FDE68A;background:#fff;font-size:11px;font-weight:600;color:#92400E;cursor:pointer;text-align:center;transition:all .15s;}
  .eval-btn:hover{transform:translateY(-2px);}
  .eval-btn.selected{background:#F59E0B;color:#fff;border-color:#F59E0B;}

  /* AI grade */
  .grade-card{background:linear-gradient(135deg,#F0FDF4,#ECFDF5);border:1.5px solid #A7F3D0;border-radius:16px;padding:16px;margin-bottom:12px;}
  .grade-score{font-family:var(--font-d);font-size:36px;font-weight:800;color:#059669;text-align:center;margin-bottom:8px;}
  .grade-comment{font-size:13px;color:#065F46;line-height:1.7;margin-bottom:10px;}
  .grade-section{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#059669;font-weight:700;margin-bottom:5px;margin-top:10px;}

  /* Score */
  .score-wrap{text-align:center;padding:8px 0 20px;}
  .score-ring{width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-family:var(--font-d);font-size:32px;font-weight:800;border:4px solid;background:var(--surface);box-shadow:0 6px 0 var(--border2);}
  .score-message{font-family:var(--font-d);font-size:20px;font-weight:800;margin-bottom:4px;}
  .score-sub{font-size:12px;color:var(--muted);margin-bottom:16px;}
  .encourage-card{background:#EFF6FF;border:1.5px solid #BAD6F5;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;color:#1E3A8A;line-height:1.6;}

  /* Session history */
  .history-list{display:flex;flex-direction:column;gap:7px;}
  .history-item{display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--surface);border:1.5px solid var(--border);border-radius:12px;box-shadow:0 2px 0 var(--border2);}
  .hist-score{font-family:var(--font-d);font-size:15px;font-weight:800;min-width:40px;text-align:center;}
  .hist-info{flex:1;}
  .hist-subject{font-size:12px;font-weight:700;color:#0C2340;}
  .hist-date{font-size:11px;color:var(--muted);}
  .hist-xp{font-size:11px;font-weight:700;color:#2563EB;}

  /* Summary */
  .summary-card{background:var(--surface);border:1.5px solid var(--border);border-radius:18px;padding:18px;margin-bottom:12px;box-shadow:0 3px 0 var(--border2);}
  .summary-msg{font-family:var(--font-d);font-size:16px;font-weight:800;color:#0C2340;margin-bottom:10px;line-height:1.4;}
  .plan-day{display:flex;gap:10px;padding:10px 12px;background:var(--bg2);border-radius:10px;margin-bottom:7px;}
  .plan-day-label{font-family:var(--font-d);font-size:12px;font-weight:800;color:#2563EB;min-width:52px;}
  .plan-day-content{font-size:12px;color:#0C2340;line-height:1.5;}

  /* Veille mode */
  .veille-notion{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:14px;margin-bottom:9px;box-shadow:0 3px 0 var(--border2);}
  .veille-notion-title{font-family:var(--font-d);font-size:14px;font-weight:800;color:#0C2340;margin-bottom:6px;}
  .veille-notion-content{font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:5px;}
  .veille-notion-exemple{font-size:12px;color:#059669;background:#F0FDF4;border-radius:8px;padding:6px 10px;margin-bottom:5px;}
  .veille-notion-astuce{font-size:12px;color:#7C3AED;background:#F5F3FF;border-radius:8px;padding:6px 10px;}

  /* Mind map */
  .mindmap-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
  @media(max-width:480px){.mindmap-grid{grid-template-columns:1fr;}}
  .mindmap-subject{background:var(--surface);border:1.5px solid var(--border);border-radius:16px;padding:14px;box-shadow:0 3px 0 var(--border2);cursor:pointer;transition:transform .15s;}
  .mindmap-subject:hover{transform:translateY(-2px);}
  .mindmap-ch-row{display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-radius:8px;margin-bottom:4px;}
  .mastery-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}

  /* Stories */
  .story-dots{display:flex;gap:6px;margin-bottom:12px;}
  .story-dot{flex:1;height:4px;border-radius:999px;background:var(--bg2);transition:background .3s;}
  .story-dot.active{background:#3B82F6;}
  .story-card{background:var(--surface);border:1.5px solid var(--border);border-radius:20px;padding:22px;min-height:280px;display:flex;flex-direction:column;box-shadow:0 4px 0 var(--border2);}

  /* Exam v2 */
  .exam-subject-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
  @media(max-width:480px){.exam-subject-grid{grid-template-columns:1fr;}}
  .exam-subject-card{background:var(--surface);border:1.5px solid var(--border);border-radius:18px;padding:18px 14px;cursor:pointer;text-align:center;transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s;box-shadow:0 4px 0 var(--border2);position:relative;overflow:hidden;}
  .exam-subject-card::before{content:'';position:absolute;inset:0;border-radius:17px;background:linear-gradient(180deg,rgba(255,255,255,.6) 0%,transparent 60%);pointer-events:none;}
  .exam-subject-card:hover{transform:translateY(-4px);box-shadow:0 8px 0 var(--border2);}
  .exam-subject-card:active{transform:translateY(3px) scale(.97)!important;box-shadow:0 1px 0 var(--border2)!important;}
  .exam-duration-badge{display:inline-block;background:#EFF6FF;border:1.5px solid #BAD6F5;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;color:#1D4ED8;margin-top:6px;}
  .exam-part-header{background:linear-gradient(135deg,var(--bg2),var(--surface2));border:1.5px solid var(--border);border-radius:14px;padding:13px 15px;margin-bottom:14px;}
  .exam-part-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:4px;}
  .exam-part-title{font-family:var(--font-d);font-size:15px;font-weight:800;color:#0C2340;}
  .exam-part-points{font-size:12px;color:#7C3AED;font-weight:600;margin-top:2px;}
  .exam-document{background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:12px;padding:13px;margin-bottom:12px;font-size:13px;line-height:1.75;color:#78350F;}
  .exam-document-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#92400E;font-weight:700;margin-bottom:6px;}
  .exam-consigne{display:flex;gap:8px;padding:7px 10px;background:var(--bg2);border-radius:8px;margin-bottom:6px;font-size:13px;color:var(--text2);}
  .exam-consigne-num{font-family:var(--font-d);font-weight:800;color:#2563EB;flex-shrink:0;}
  .exam-bareme-item{font-size:11px;color:#6D28D9;background:#F5F3FF;border-radius:6px;padding:3px 8px;margin:3px 3px 0 0;display:inline-block;}
  .exam-nav{display:flex;gap:8px;margin-bottom:14px;}
  .exam-nav-dot{flex:1;height:6px;border-radius:999px;background:var(--bg2);transition:background .3s;}
  .exam-nav-dot.done{background:#10B981;}
  .exam-nav-dot.active{background:#3B82F6;}
  .exam-mid-message{background:linear-gradient(135deg,#FEF3C7,#FDE68A);border:1.5px solid #FCD34D;border-radius:14px;padding:14px;margin-bottom:14px;text-align:center;}
  .exam-result-part{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px;box-shadow:0 2px 0 var(--border2);}
  .exam-result-part-title{font-family:var(--font-d);font-size:13px;font-weight:800;color:#0C2340;margin-bottom:8px;}
  .exam-timer-big{text-align:center;margin-bottom:12px;}
  .exam-timer-display{font-family:var(--font-d);font-size:38px;font-weight:800;letter-spacing:-1px;line-height:1;}
  .exam-timer-label{font-size:11px;color:var(--muted);margin-top:3px;}

  /* Today widget */
  .today-widget{background:#EFF6FF;border:1.5px solid #BAD6F5;border-radius:14px;padding:14px;margin-bottom:14px;box-shadow:0 3px 0 #93C5E8;}
  .today-title{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#2563EB;font-weight:700;margin-bottom:9px;}
  .today-session{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:#fff;border:1.5px solid #BAD6F5;margin-bottom:7px;cursor:pointer;box-shadow:0 2px 0 #93C5E8;transition:transform .15s;}
  .today-session:hover{transform:translateY(-2px);}

  /* Planning */
  .planning-header{background:var(--surface);border:1.5px solid var(--border);border-radius:20px;padding:20px;margin-bottom:16px;box-shadow:0 4px 0 var(--border2);text-align:center;}
  .planning-title{font-family:var(--font-d);font-size:20px;font-weight:800;color:var(--text);margin-bottom:6px;}
  .planning-desc{font-size:13px;color:var(--muted);margin-bottom:16px;}
  .date-input{width:100%;padding:12px 14px;border-radius:12px;border:1.5px solid var(--border);background:var(--bg2);color:#0C2340;font-family:var(--font-b);font-size:16px;outline:none;margin-bottom:12px;}
  .date-input:focus{border-color:#3B82F6;}
  .weeks-row{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px 14px;background:var(--bg2);border-radius:12px;border:1.5px solid var(--border);}
  .weeks-slider{flex:1;accent-color:#3B82F6;}
  .weeks-label{font-family:var(--font-d);font-size:18px;font-weight:800;color:#2563EB;min-width:70px;text-align:right;}
  .planning-day{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;margin-bottom:9px;overflow:hidden;box-shadow:0 3px 0 var(--border2);}
  .planning-day-header{padding:11px 15px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;}
  .day-title{font-family:var(--font-d);font-size:13px;font-weight:800;color:#0C2340;}
  .day-date{font-size:11px;color:var(--muted);font-weight:600;}
  .sleep-btn{background:var(--surface);border:1.5px solid var(--border);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;color:var(--muted);cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:4px;}
  .sleep-btn:hover{background:#EDE9FE;color:#6D28D9;border-color:#C4B5FD;}
  .sleep-btn.active{background:#EDE9FE;color:#6D28D9;border-color:#C4B5FD;}
  .planning-sessions-list{padding:9px 13px;display:flex;flex-direction:column;gap:7px;}
  .planning-session{display:flex;align-items:flex-start;gap:8px;padding:9px 10px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);cursor:pointer;transition:transform .15s,box-shadow .15s;}
  .planning-session:hover{transform:translateY(-2px);box-shadow:0 4px 0 var(--border2);}
  .session-mat{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;min-width:68px;}
  .session-info{flex:1;}
  .session-chap{font-size:12px;font-weight:600;color:#0C2340;margin-bottom:1px;}
  .session-exo{font-size:11px;color:var(--muted);}
  .session-dur{font-size:11px;font-weight:700;color:var(--text2);white-space:nowrap;}

  /* Float tools */
  .float-tools{position:fixed;bottom:22px;right:12px;display:flex;flex-direction:column;gap:10px;z-index:100;}
  .float-btn{width:58px;height:58px;border-radius:18px;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:22px;transition:transform .16s cubic-bezier(.34,1.56,.64,1);user-select:none;}
  .float-btn .flbl{font-size:9px;font-weight:700;line-height:1;}
  .float-btn:hover{transform:scale(1.1) translateY(-2px);}
  .float-btn:active{transform:scale(.92)!important;}
  .float-btn-calc{background:linear-gradient(180deg,#3B82F6,#1D4ED8);box-shadow:0 5px 0 #1E40AF;color:white;}
  .float-btn-notes{background:linear-gradient(180deg,#8B5CF6,#6D28D9);box-shadow:0 5px 0 #4c1d95;color:white;}
  .side-panels{position:fixed;bottom:100px;right:12px;display:flex;flex-direction:column;gap:10px;z-index:99;}
  .panel{background:#fff;border:1.5px solid var(--border);border-radius:18px;width:288px;max-width:calc(100vw - 24px);padding:14px;box-shadow:-4px 4px 24px rgba(0,0,0,.1);animation:slideIn .25s cubic-bezier(.34,1.56,.64,1);}
  @keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
  .panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
  .panel-title{font-family:var(--font-d);font-size:13px;font-weight:800;}
  .panel-close{background:var(--bg2);border:1.5px solid var(--border);color:var(--muted);width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;}
  .calc-display{background:var(--bg2);border:1.5px solid var(--border);border-radius:9px;padding:10px 12px;text-align:right;font-family:var(--font-d);font-size:22px;font-weight:700;color:#0C2340;margin-bottom:9px;min-height:46px;word-break:break-all;}
  .calc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;}
  .calc-btn{padding:10px 4px;border-radius:9px;border:1.5px solid var(--border);font-family:var(--font-d);font-size:14px;font-weight:700;cursor:pointer;transition:transform .12s;user-select:none;}
  .calc-btn:active{transform:scale(.92) translateY(2px)!important;}
  .calc-num{background:var(--surface);color:#0C2340;box-shadow:0 3px 0 var(--border2);}
  .calc-num:hover{background:var(--bg2);}
  .calc-op{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE;}
  .calc-op:hover{background:#DBEAFE;}
  .calc-eq{background:linear-gradient(180deg,#3B82F6,#1D4ED8);color:#fff;border-color:#1D4ED8;}
  .calc-clear{background:#FEF2F2;color:#991B1B;border-color:#FECACA;}
  .calc-fn{background:#F0FDF4;color:#065F46;border-color:#A7F3D0;font-size:12px;}
  .calc-fn:hover{background:#DCFCE7;}
  .notes-area{width:100%;min-height:160px;background:var(--bg2);border:1.5px solid var(--border);border-radius:9px;padding:11px;color:#0C2340;font-family:var(--font-b);font-size:13px;line-height:1.7;resize:none;outline:none;}
  .notes-area:focus{border-color:#3B82F6;}
  .notes-area::placeholder{color:var(--muted);}

  .sticky-cta{position:sticky;bottom:16px;z-index:10;padding-top:10px;}
  .sticky-cta .btn-cta{box-shadow:0 6px 0 #1E40AF,0 8px 24px rgba(29,78,216,.4),0 -8px 20px rgba(235,245,255,.9);}
  .badges-page-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
  @media(max-width:480px){.badges-page-grid{grid-template-columns:1fr;}}
  .badge-card{border-radius:18px;padding:16px 14px;display:flex;align-items:flex-start;gap:12px;transition:transform .15s cubic-bezier(.34,1.2,.64,1),box-shadow .15s;cursor:default;}
  .badge-card.earned{background:var(--surface);border:1.5px solid var(--border);box-shadow:0 4px 0 var(--border2);}
  .badge-card.earned:hover{transform:translateY(-3px);box-shadow:0 7px 0 var(--border2);}
  .badge-card.locked{background:#F8FAFC;border:1.5px dashed #CBD5E1;opacity:.75;}
  .badge-icon-wrap{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;}
  .badge-icon-wrap.earned{background:linear-gradient(135deg,#DBEAFE,#EDE9FE);box-shadow:0 3px 0 #BAD6F5;}
  .badge-icon-wrap.locked{background:#F1F5F9;filter:grayscale(1);opacity:.5;}
  .badge-info{flex:1;min-width:0;}
  .badge-name{font-family:var(--font-d);font-size:13px;font-weight:800;color:#0C2340;margin-bottom:3px;}
  .badge-desc{font-size:11px;color:var(--muted);line-height:1.5;}
  .badge-hint{font-size:11px;color:#7C3AED;background:#F5F3FF;border-radius:6px;padding:3px 7px;margin-top:5px;display:inline-block;}
  .badge-earned-tag{font-size:10px;font-weight:700;color:#059669;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:20px;padding:2px 8px;margin-top:4px;display:inline-block;}
  .badges-progress-bar{height:10px;background:var(--bg2);border-radius:999px;overflow:hidden;margin:10px 0 16px;}
  .badges-progress-fill{height:100%;background:linear-gradient(90deg,#7C3AED,#3B82F6);border-radius:999px;transition:width .8s cubic-bezier(.34,1.2,.64,1);}
  @keyframes fadeSlideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  .hint{text-align:center;font-size:12px;color:var(--muted);margin-top:6px;}
  .err{color:#DC2626;text-align:center;padding:40px 0;}
  .sound-toggle{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);margin-bottom:12px;cursor:pointer;user-select:none;}
  .sound-toggle input{accent-color:#3B82F6;}
`;

// ── Sound toggle context ──────────────────────────────────────────────────────
const soundEnabled = {value: true};

// ── Small components ──────────────────────────────────────────────────────────
function Spinner({text}){
  const msg = text || LOADING_MESSAGES[Math.floor(Math.random()*LOADING_MESSAGES.length)];
  return <div className="loading"><div className="spin-ring"/><p>{msg}</p></div>;
}
function Calculator({onClose}){
  const[display,setDisplay]=useState("0");
  const[expr,setExpr]=useState("");
  const[justCalc,setJustCalc]=useState(false);
  const[degMode,setDegMode]=useState(true);

  const toRad=x=>degMode?x*Math.PI/180:x;

  const pressNum=v=>{
    if(justCalc){setDisplay(String(v));setExpr(String(v));setJustCalc(false);}
    else{setDisplay(d=>d==="0"?String(v):d+v);setExpr(e=>e+v);}
  };
  const pressDot=()=>{
    if(justCalc){setDisplay("0.");setExpr("0.");setJustCalc(false);return;}
    const parts=display.split(/[\+\-\×\÷]/);
    if(!parts[parts.length-1].includes(".")){setDisplay(d=>d+".");setExpr(e=>e+".");}
  };
  const pressOp=v=>{
    setJustCalc(false);
    setDisplay(d=>d+v);setExpr(e=>e+v);
  };
  const pressFunc=v=>{
    const cur=parseFloat(display)||0;
    let res;
    if(v==="sin")res=Math.sin(toRad(cur));
    else if(v==="cos")res=Math.cos(toRad(cur));
    else if(v==="tan")res=Math.tan(toRad(cur));
    else if(v==="√")res=Math.sqrt(cur);
    else if(v==="x²")res=cur*cur;
    else if(v==="log")res=Math.log10(cur);
    else if(v==="ln")res=Math.log(cur);
    else if(v==="1/x")res=cur!==0?1/cur:"Err";
    else if(v==="π"){setDisplay(d=>d==="0"?String(Math.PI):d+String(Math.PI));setExpr(e=>e+Math.PI);return;}
    const r=typeof res==="number"?parseFloat(res.toFixed(10)):res;
    setDisplay(String(r));setExpr(String(r));setJustCalc(true);
  };
  const pressEq=()=>{
    try{
      const safeExpr=expr.replace(/×/g,"*").replace(/÷/g,"/");
      // eslint-disable-next-line no-new-func
      const result=new Function("return "+safeExpr)();
      const r=typeof result==="number"?parseFloat(result.toFixed(10)):"Err";
      setDisplay(String(r));setExpr(String(r));setJustCalc(true);
    }catch{setDisplay("Err");setExpr("");}
  };
  const pressC=()=>{setDisplay("0");setExpr("");setJustCalc(false);};
  const pressDel=()=>{
    if(justCalc){pressC();return;}
    setDisplay(d=>d.length>1?d.slice(0,-1):"0");
    setExpr(e=>e.length>1?e.slice(0,-1):"");
  };

  const Btn=({label,action,type="num",span=1})=>{
    const cls="calc-btn "+(type==="clear"?"calc-clear":type==="eq"?"calc-eq":type==="op"?"calc-op":type==="fn"?"calc-fn":"calc-num");
    return<button className={cls} style={span>1?{gridColumn:`span ${span}`}:{}} onClick={action}>{label}</button>;
  };

  return(
    <div className="panel" style={{width:320}}>
      <div className="panel-header">
        <span className="panel-title">🧮 Calculatrice scientifique</span>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>
      <div className="calc-display" style={{fontSize:display.length>12?14:20,minHeight:52}}>
        <div style={{fontSize:10,color:"#5A85AA",marginBottom:2}}>{expr||" "}</div>
        {display}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:6}}>
        <button className="calc-btn calc-op" style={{flex:1,fontSize:11}} onClick={()=>setDegMode(true)}>{degMode?"✓ ":""}DEG</button>
        <button className="calc-btn calc-op" style={{flex:1,fontSize:11}} onClick={()=>setDegMode(false)}>{!degMode?"✓ ":""}RAD</button>
      </div>
      <div className="calc-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
        <Btn label="sin"  action={()=>pressFunc("sin")}  type="fn"/>
        <Btn label="cos"  action={()=>pressFunc("cos")}  type="fn"/>
        <Btn label="tan"  action={()=>pressFunc("tan")}  type="fn"/>
        <Btn label="√"    action={()=>pressFunc("√")}    type="fn"/>
        <Btn label="log"  action={()=>pressFunc("log")}  type="fn"/>
        <Btn label="ln"   action={()=>pressFunc("ln")}   type="fn"/>
        <Btn label="x²"   action={()=>pressFunc("x²")}  type="fn"/>
        <Btn label="1/x"  action={()=>pressFunc("1/x")}  type="fn"/>
        <Btn label="π"    action={()=>pressFunc("π")}    type="fn"/>
        <Btn label="("    action={()=>pressOp("(")}      type="op"/>
        <Btn label=")"    action={()=>pressOp(")")}      type="op"/>
        <Btn label="÷"    action={()=>pressOp("÷")}      type="op"/>
        <Btn label="7"    action={()=>pressNum(7)}/>
        <Btn label="8"    action={()=>pressNum(8)}/>
        <Btn label="9"    action={()=>pressNum(9)}/>
        <Btn label="×"    action={()=>pressOp("×")}      type="op"/>
        <Btn label="4"    action={()=>pressNum(4)}/>
        <Btn label="5"    action={()=>pressNum(5)}/>
        <Btn label="6"    action={()=>pressNum(6)}/>
        <Btn label="−"    action={()=>pressOp("-")}      type="op"/>
        <Btn label="1"    action={()=>pressNum(1)}/>
        <Btn label="2"    action={()=>pressNum(2)}/>
        <Btn label="3"    action={()=>pressNum(3)}/>
        <Btn label="+"    action={()=>pressOp("+")}      type="op"/>
        <Btn label="⌫"    action={pressDel}              type="clear"/>
        <Btn label="0"    action={()=>pressNum(0)}/>
        <Btn label="."    action={pressDot}/>
        <Btn label="="    action={pressEq}               type="eq"/>
        <Btn label="C"    action={pressC}                type="clear" span={4}/>
      </div>
    </div>
  );
}
function Notes({onClose}){
  const[t,setT]=useState(()=>{try{return sessionStorage.getItem("notes")||"";}catch{return"";}});
  return(<div className="panel"><div className="panel-header"><span className="panel-title">📝 Notes</span><button className="panel-close" onClick={onClose}>✕</button></div><textarea className="notes-area" value={t} onChange={e=>{setT(e.target.value);try{sessionStorage.setItem("notes",e.target.value);}catch{}}} placeholder="Formules, astuces…" rows={6}/></div>);
}
function FloatTools({showCalc}){
  const[calc,setCalc]=useState(false);const[notes,setNotes]=useState(false);
  return(<><div className="float-tools">{showCalc&&<button className="float-btn float-btn-calc" onClick={()=>setCalc(v=>!v)}>🧮<span className="flbl">Calc</span></button>}<button className="float-btn float-btn-notes" onClick={()=>setNotes(v=>!v)}>📝<span className="flbl">Notes</span></button></div><div className="side-panels">{calc&&showCalc&&<Calculator onClose={()=>setCalc(false)}/>}{notes&&<Notes onClose={()=>setNotes(false)}/>}</div></>);
}
function GeoFigure({question}){
  const[st,setSt]=useState("idle");const[svg,setSvg]=useState(null);
  const gen=async()=>{setSt("loading");try{const raw=await callClaudeText(buildSvgPrompt(question));const m=raw.match(/<svg[\s\S]*<\/svg>/i);setSvg(m?m[0]:null);setSt("done");}catch{setSt("err");}};
  if(st==="idle")return<button className="geo-btn" onClick={gen}>📐 Voir la figure</button>;
  if(st==="loading")return<p style={{fontSize:12,color:"#3B82F6",marginTop:8}}>Génération…</p>;
  if(!svg)return null;
  return<div className="geo-figure" dangerouslySetInnerHTML={{__html:svg}}/>;
}

// ── Welcome Back ──────────────────────────────────────────────────────────────
function WelcomeBack({stats,onStartUrgent}){
  const urgent=getUrgentChapters(stats);
  const today=new Date().toISOString().split("T")[0];
  const isReturning=stats.lastSession&&stats.lastSession!==today;

  if(!isReturning&&urgent.length===0)return null;

  const greeting=stats.streak>3?`🔥 ${stats.streak} jours de suite, continue !`:stats.totalSessions===0?"👋 Bienvenue ! Prêt à commencer ?":"👋 Bon retour !";
  const hasName=stats.totalSessions>0;

  return(
    <div className="welcome-back">
      <div className="welcome-back-title">{greeting}</div>
      {urgent.length>0&&(
        <>
          <div className="welcome-back-text" style={{marginBottom:8}}>Tu as des chapitres à retravailler :</div>
          {urgent.map((u,i)=>{
            const s=SUBJECTS.find(s=>s.id===u.sid);
            return<span key={i} className="urgent-chip" style={{display:"inline-flex",alignItems:"center",gap:5,background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"4px 10px",fontSize:12,color:"#7F1D1D",cursor:"pointer",marginRight:6,marginBottom:4}} onClick={()=>onStartUrgent(u.sid,u.ch)}>
              {s?.icon} {u.ch} ({u.n}× raté)
            </span>;
          })}
        </>
      )}
    </div>
  );
}

// ── Daily Goal ────────────────────────────────────────────────────────────────
function DailyGoal({stats}){
  const done=stats.todaySessions||0;
  const goal=stats.dailyGoal||2;
  const pct=Math.min(100,(done/goal)*100);
  const color=pct>=100?"#059669":"#3B82F6";
  return(
    <div className="daily-goal">
      <div className="daily-goal-header">
        <div className="daily-goal-title">🎯 Objectif du jour</div>
        <div className="daily-goal-count" style={{color}}>{done}/{goal} sessions{pct>=100?" ✅":""}</div>
      </div>
      <div className="goal-bar"><div className="goal-fill" style={{width:`${pct}%`,background:pct>=100?"linear-gradient(90deg,#10B981,#059669)":undefined}}/></div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
// ── Badges Page ───────────────────────────────────────────────────────────────
function BadgesPage({stats,onBack}){
  const earned=stats.badges||[];
  const pct=Math.round((earned.length/BADGES.length)*100);

  return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontFamily:"var(--font-d)",fontSize:20,fontWeight:800,color:"#0C2340"}}>
            🏅 Mes badges
          </div>
          <div style={{fontFamily:"var(--font-d)",fontSize:15,fontWeight:800,color:"#7C3AED"}}>
            {earned.length}/{BADGES.length}
          </div>
        </div>
        <div className="badges-progress-bar">
          <div className="badges-progress-fill" style={{width:`${pct}%`}}/>
        </div>
        <p style={{fontSize:12,color:"var(--muted)"}}>
          {pct===100?"🎉 Tu as débloqué tous les badges !":
           pct>=50?`Plus que ${BADGES.length-earned.length} badges à débloquer !`:
           `${earned.length} badge${earned.length>1?"s":""} obtenu${earned.length>1?"s":""}. Continue comme ça !`}
        </p>
      </div>

      {/* Badges obtenus */}
      {earned.length>0&&(
        <>
          <div className="section-title" style={{marginBottom:10}}>✅ Obtenus</div>
          <div className="badges-page-grid" style={{marginBottom:20}}>
            {BADGES.filter(b=>earned.includes(b.id)).map(b=>(
              <div key={b.id} className="badge-card earned" onClick={()=>playChip()}>
                <div className="badge-icon-wrap earned">{b.icon}</div>
                <div className="badge-info">
                  <div className="badge-name">{b.label}</div>
                  <div className="badge-desc">{b.desc}</div>
                  <div className="badge-earned-tag">✓ Débloqué</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Badges à débloquer */}
      {BADGES.filter(b=>!earned.includes(b.id)).length>0&&(
        <>
          <div className="section-title" style={{marginBottom:10}}>🔒 À débloquer</div>
          <div className="badges-page-grid">
            {BADGES.filter(b=>!earned.includes(b.id)).map(b=>(
              <div key={b.id} className="badge-card locked">
                <div className="badge-icon-wrap locked">{b.icon}</div>
                <div className="badge-info">
                  <div className="badge-name" style={{color:"#64748B"}}>{b.label}</div>
                  <div className="badge-desc">{b.desc}</div>
                  <div className="badge-hint">💡 {b.hint}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Dashboard({stats, onOpenBadges}){
  const lv=getLevel(stats.xp);
  const progress=lv.next?Math.min(100,((stats.xp-lv.min)/(lv.next-lv.min))*100):100;
  const earned=BADGES.filter(b=>stats.badges.includes(b.id));
  return(
    <div className="dashboard">
      <div className="dash-card"><div className="dash-label">🔥 Streak</div><div className="dash-big">{stats.streak}</div><div className="dash-sub">jour{stats.streak>1?"s":""} de suite</div></div>
      <div className="dash-card"><div className="dash-label">⚡ XP Total</div><div className="dash-big">{stats.xp}</div><div className="dash-sub" style={{color:lv.color,fontWeight:700}}>{lv.label}</div>{lv.next&&<div className="xp-bar"><div className="xp-fill" style={{width:`${progress}%`}}/></div>}</div>
      {earned.length>0&&<div className="dash-card dash-full" style={{cursor:"pointer"}} onClick={()=>{playChip();onOpenBadges();}}><div className="dash-label">🏅 Badges ({earned.length}/{BADGES.length}) <span style={{fontSize:10,color:"#7C3AED",fontWeight:600}}>— Voir tous →</span></div><div className="badges-wrap">{earned.slice(0,6).map(b=><div key={b.id} className="badge-chip">{b.icon} {b.label}</div>)}{earned.length>6&&<div className="badge-chip" style={{color:"#7C3AED"}}>+{earned.length-6} autres…</div>}</div></div>}
    </div>
  );
}

// ── Today Widget ──────────────────────────────────────────────────────────────
function TodayWidget({onStartSession, planningKey}){
  const saved=loadPlanning();if(!saved)return null;
  const todayISO=new Date().toISOString().split("T")[0];
  const today=saved.planning.find(j=>j.dateISO===todayISO);
  if(!today?.sessions?.length)return null;
  return(<div className="today-widget"><div className="today-title">📅 Aujourd'hui — planning</div>{today.sessions.map((s,i)=>(<div key={i} className="today-session" onClick={()=>onStartSession(s)}><div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:SUBJECT_COLORS[s.matiere]||"#2563EB",textTransform:"uppercase",letterSpacing:1}}>{s.matiere}</div><div style={{fontSize:12,fontWeight:600,color:"#0C2340"}}>{s.chapitre}</div><div style={{fontSize:11,color:"#5A85AA"}}>{s.exercice} · {s.duree}</div></div><div style={{fontSize:15}}>{s.exercice?.toLowerCase().includes("long")?"✍️":"⚡"} →</div></div>))}</div>);
}

// ── Mind Map ──────────────────────────────────────────────────────────────────
function MindMap({stats}){
  const[open,setOpen]=useState(null);
  return(<div><div className="section-title" style={{marginBottom:8}}>🗺️ Carte de progression</div><p style={{fontSize:12,color:"#5A85AA",marginBottom:14}}>🟢 Maîtrisé · 🟡 Fragile · 🔴 À retravailler · ⚪ Non révisé</p><div className="mindmap-grid">{SUBJECTS.map(s=>{const xp=stats.subjectXP?.[s.id]||0;const weak=stats.weakChapters?.[s.id]||{};const lv=getLevel(xp);const isOpen=open===s.id;return(<div key={s.id} className="mindmap-subject" style={isOpen?{borderColor:s.color}:{}} onClick={()=>setOpen(isOpen?null:s.id)}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:isOpen?10:0}}><span style={{fontSize:20}}>{s.icon}</span><div><div style={{fontFamily:"var(--font-d)",fontSize:12,fontWeight:800,color:"#0C2340"}}>{s.label}</div><div style={{fontSize:10,fontWeight:600,color:lv.color}}>{lv.label} · {xp} XP</div></div></div>{isOpen&&(CHAPTERS[s.id]||[]).map(ch=>{const n=weak[ch]||0;const dot=xp===0?"#D1D5DB":n>=3?"#DC2626":n>=1?"#D97706":"#059669";const bg=xp===0?"#F9FAFB":n>=3?"#FEF2F2":n>=1?"#FFFBEB":"#F0FDF4";return<div key={ch} className="mindmap-ch-row" style={{background:bg}}><span style={{fontSize:11,color:"#0C2340"}}>{ch}</span><div className="mastery-dot" style={{background:dot}}/></div>;})}{!isOpen&&<div style={{fontSize:11,color:"#5A85AA",marginTop:4}}>Clique pour voir les chapitres →</div>}</div>);})}</div></div>);
}

// ── Session History ───────────────────────────────────────────────────────────
function SessionHistory({stats}){
  const hist=stats.sessionHistory||[];
  if(!hist.length)return<p style={{textAlign:"center",color:"var(--muted)",fontSize:13,padding:"20px 0"}}>Rien pour l'instant — lance ton premier quiz et les stats apparaîtront ici !</p>;
  return(<div><div className="section-title">📊 Historique ({hist.length} sessions)</div><div className="history-list">{hist.map((h,i)=>{const color=h.score>=h.total*.8?"#059669":h.score>=h.total*.5?"#D97706":"#DC2626";return(<div key={i} className="history-item"><div className="hist-score" style={{color}}>{h.score}/{h.total||"?"}</div><div className="hist-info"><div className="hist-subject">{h.subjectLabel||"Mix"} {h.mode==="long"?"· Question longue":""}</div><div className="hist-date">{h.date}</div></div><div className="hist-xp">+{h.xp||0} XP</div></div>);})}</div></div>);
}

// ── AI Summary ────────────────────────────────────────────────────────────────
function AISummary({stats,onBack}){
  const[state,setState]=useState("loading");
  const[data,setData]=useState(null);
  useEffect(()=>{withMinDelay(callClaude(buildSummaryPrompt(stats.weakChapters,stats.subjectXP),null,1500)).then(d=>{setData(d);setState("done");}).catch(()=>setState("error"));},[]);
  if(state==="loading")return<><button className="btn-ghost" onClick={onBack}>← Retour</button><Spinner text="L'IA analyse tes révisions…"/></>;
  if(state==="error")return<><button className="btn-ghost" onClick={onBack}>← Retour</button><p className="err">Erreur. Réessaie !</p></>;
  return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="section-title">🧠 Résumé IA personnalisé</div>
      <div className="summary-card">
        <div className="summary-msg">"{data.message_motivant}"</div>
        <p style={{fontSize:13,color:"#1E4976",lineHeight:1.7,marginBottom:14}}>{data.analyse}</p>
        <div className="section-title">📅 Plan 3 prochains jours</div>
        {data.plan_3jours?.map((j,i)=>(
          <div key={i} className="plan-day">
            <div className="plan-day-label">{j.jour}</div>
            <div className="plan-day-content"><strong>{j.focus}</strong> — {j.action}</div>
          </div>
        ))}
        <div style={{marginTop:14,padding:12,background:"#EFF6FF",borderRadius:10,fontSize:13,color:"#1E3A8A",lineHeight:1.6}}>
          💡 {data.conseil_final}
        </div>
      </div>
    </div>
  );
}

// ── Veille du Brevet ──────────────────────────────────────────────────────────
function VeilleMode({onBack,onStatsUpdate}){
  const[step,setStep]=useState("pick");
  const[subject,setSubject]=useState(null);
  const[state,setState]=useState("idle");
  const[notions,setNotions]=useState([]);
  const[open,setOpen]=useState(null);

  const launch=async(s)=>{
    setSubject(s);setState("loading");
    try{
      const d=await withMinDelay(callClaude(buildVeillePrompt(s.label),null,2500));
      setNotions(d.notions||[]);setState("done");
      // Badge veille
      let stats=getStats();stats=updateStreak(stats);
      const{updated}=addXP(stats,5,s.id);
      if(!updated.badges.includes("veille"))updated.badges=[...updated.badges,"veille"];
      saveStats(updated);onStatsUpdate&&onStatsUpdate(updated);
    }catch{setState("error");}
  };

  if(step==="pick")return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="section-title">🎯 Les essentiels</div>
      <p style={{fontSize:13,color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>Ce qui tombe vraiment au brevet — les 15 points clés par matière. Parfait pour réviser en 10 minutes !</p>
      <div className="subject-grid">
        {SUBJECTS.filter(s=>s.id!=="anglais").map(s=>(
          <div key={s.id} className="subject-card" onClick={()=>launch(s)}>
            <div className="subject-icon">{s.icon}</div>
            <div className="subject-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if(state==="loading")return<><button className="btn-ghost" onClick={onBack}>← Retour</button><Spinner text={`Chargement des essentiels ${subject?.label}…`}/></>;
  if(state==="error")return<><button className="btn-ghost" onClick={onBack}>← Retour</button><p className="err">Erreur. Réessaie !</p></>;

  return(
    <div>
      <button className="btn-ghost" onClick={()=>{setStep("pick");setState("idle");setNotions([]);}}>← Changer de matière</button>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:28}}>{subject?.icon}</span>
        <div>
          <div className="section-title" style={{marginBottom:2}}>🎯 Les essentiels</div>
          <div style={{fontFamily:"var(--font-d)",fontSize:16,fontWeight:800,color:"#0C2340"}}>{subject?.label} — L'essentiel à savoir</div>
        </div>
      </div>
      {notions.map((n,i)=>(
        <div key={i} className="veille-notion">
          <div className="veille-notion-title" style={{cursor:"pointer"}} onClick={()=>setOpen(open===i?null:i)}>
            <span style={{color:"#5A85AA",marginRight:8}}>{i+1}.</span>{n.titre}
            <span style={{float:"right",fontSize:12,color:"#5A85AA"}}>{open===i?"▲":"▼"}</span>
          </div>
          {open===i&&<>
            <div className="veille-notion-content">{n.contenu}</div>
            {n.exemple&&<div className="veille-notion-exemple">📌 Exemple : {n.exemple}</div>}
            {n.astuces&&<div className="veille-notion-astuce">💡 Astuce : {n.astuces}</div>}
          </>}
        </div>
      ))}
      <button className="btn-cta" onClick={()=>{setStep("pick");setState("idle");setNotions([]);}}>Changer de matière →</button>
    </div>
  );
}

// ── Mini Fiche ────────────────────────────────────────────────────────────────
function MiniFiche({subject,chapter,onContinue,onSkip}){
  const[state,setState]=useState("loading");
  const[points,setPoints]=useState([]);
  useEffect(()=>{
    withMinDelay(callClaude(buildFichePrompt(subject,chapter)),400)
      .then(d=>{setPoints(d.points||[]);setState("done");})
      .catch(()=>{setState("error");onSkip();});
  },[]);
  if(state==="loading")return<Spinner text="Préparation de ta mini-fiche…"/>;
  if(state==="error")return null;
  return(
    <div>
      <div className="mini-fiche">
        <div className="mini-fiche-title">📋 Mini-fiche — {chapter||subject}</div>
        {points.map((p,i)=>(
          <div key={i} className="mini-fiche-point">
            <span className="mini-fiche-point-title">{i+1}. {p.titre} :</span>
            <span className="mini-fiche-point-text">{p.contenu}</span>
          </div>
        ))}
      </div>
      <button className="btn-cta" onClick={onContinue}>C'est noté, on y va ! →</button>
      <button className="btn-secondary" onClick={onSkip}>Passer la fiche</button>
    </div>
  );
}

// ── Stories ───────────────────────────────────────────────────────────────────
function StoriesMode({subject,chapter,isMix,onBack,onDone}){
  const[state,setState]=useState("loading");
  const[questions,setQuestions]=useState([]);
  const[idx,setIdx]=useState(0);
  const[selected,setSelected]=useState(null);
  const[score,setScore]=useState(0);
  const touchX=useRef(null);
  // Refs pour éviter le bug de closure dans keydown
  const selectedRef=useRef(null);
  const idxRef=useRef(0);
  const scoreRef=useRef(0);
  const questionsRef=useRef([]);

  useEffect(()=>{selectedRef.current=selected;},[selected]);
  useEffect(()=>{idxRef.current=idx;},[idx]);
  useEffect(()=>{scoreRef.current=score;},[score]);
  useEffect(()=>{questionsRef.current=questions;},[questions]);

  useEffect(()=>{
    const seen=isMix?getSeenQuestions("mix"):getSeenQuestions(subject?.id||"");
    const prompt=isMix?buildMixPrompt(seen):buildQuizPrompt(subject.label,chapter,[],5,seen);
    withMinDelay(callClaude(prompt)).then(d=>{
      const qs=d.questions||[];
      addSeenQuestions(isMix?"mix":subject?.id||"",qs);
      setQuestions(qs);setState("quiz");
    }).catch(()=>setState("error"));
  },[]);

  useEffect(()=>{
    const onKey=e=>{
      if(e.key==="ArrowRight"&&selectedRef.current!==null){
        const curIdx=idxRef.current;
        const qs=questionsRef.current;
        if(curIdx<qs.length-1){setIdx(i=>i+1);setSelected(null);}
        else onDone(scoreRef.current,qs.length);
      }
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]); // [] = monté une seule fois, utilise les refs

  const next=()=>{
    if(idx<questions.length-1){setIdx(i=>i+1);setSelected(null);}
    else onDone(score,questions.length);
  };

  if(state==="loading")return<Spinner text="Chargement des stories…"/>;
  if(state==="error")return<p className="err">Aïe, un souci technique — réessaie !</p>;
  const q=questions[idx];
  return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="story-dots">{questions.map((_,i)=><div key={i} className={"story-dot"+(i<=idx?" active":"")}/>)}</div>
      <div className="story-card"
        onTouchStart={e=>touchX.current=e.touches[0].clientX}
        onTouchEnd={e=>{if(touchX.current-e.changedTouches[0].clientX>50&&selected!==null)next();}}>
        <div className="q-label">{isMix?`🎲 ${q.matiere||""}`:`${subject?.icon} ${subject?.label}`}</div>
        <div className="q-text" style={{flex:1,marginBottom:16}}>{q.question}</div>
        <div className="choices" style={{marginBottom:0}}>
          {q.choices.map(c=>{
            let cls="choice-btn";
            if(selected!==null){if(c.startsWith(q.answer))cls+=" correct";else if(c===selected)cls+=" wrong";}
            return<button key={c} className={cls} disabled={selected!==null} onClick={()=>{
              setSelected(c);
              if(c.startsWith(q.answer)){setScore(s=>s+1);if(soundEnabled.value)playSound("correct");}
              else if(soundEnabled.value)playSound("wrong");
            }}>{c}</button>;
          })}
        </div>
        {selected&&(
          <div style={{marginTop:10}}>
            <div className="explanation"><strong>💡</strong>{q.explanation}</div>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button className="btn-cta" onClick={()=>{playClick();next();}}>
                {idx===questions.length-1?"Voir mon score →":"Suivant →"}
              </button>
            </div>
          </div>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:10}}>
        <div style={{fontSize:11,color:"var(--muted)",textAlign:"center"}}>
          📱 Swipe à droite · ⌨️ Flèche → sur PC
        </div>
      </div>
    </div>
  );
}

// ── Exam Mode v2 — Simulation Brevet Réelle ───────────────────────────────────
function ExamMode({onBack, onStatsUpdate}){
  const[phase, setPhase]=useState("pick"); // pick → brief → exam → result
  const[examSubject, setExamSubject]=useState(null);
  const[partIdx, setPartIdx]=useState(0);
  const[parts, setParts]=useState([]); // questions générées par partie
  const[answers, setAnswers]=useState({});
  const[revealed, setRevealed]=useState({});
  const[grades, setGrades]=useState({});
  const[gradingIdx, setGradingIdx]=useState(null);
  const[timeLeft, setTimeLeft]=useState(0);
  const[loading, setLoading]=useState(false);
  const[midMsg, setMidMsg]=useState(false);

  const ex = EXAM_SUBJECTS.find(e=>e.id===examSubject);

  // Timer
  useEffect(()=>{
    if(phase!=="exam")return;
    const t=setInterval(()=>setTimeLeft(v=>{
      if(v<=1){clearInterval(t);return 0;}
      const half=Math.floor(ex.duration*60/2);
      if(v===half)setMidMsg(true);
      return v-1;
    }),1000);
    return()=>clearInterval(t);
  },[phase]);

  const startExam=async(subjectId)=>{
    setExamSubject(subjectId);
    const subject=EXAM_SUBJECTS.find(e=>e.id===subjectId);
    setTimeLeft(subject.duration*60);
    setPhase("brief");
  };

  const loadPart=async(idx)=>{
    if(parts[idx])return; // déjà chargé
    setLoading(true);
    try{
      const d=await withMinDelay(callClaude(buildRealExamPrompt(examSubject,idx),null,2000));
      setParts(p=>{const n=[...p];n[idx]=d;return n;});
    }catch{}
    setLoading(false);
  };

  useEffect(()=>{
    if(phase==="exam")loadPart(partIdx);
  },[phase, partIdx]);

  // Précharger la partie suivante
  useEffect(()=>{
    if(phase==="exam"&&partIdx<ex?.structure.length-1)
      setTimeout(()=>loadPart(partIdx+1),3000);
  },[partIdx, phase]);

  const mm=String(Math.floor(timeLeft/60)).padStart(2,"0");
  const ss2=String(timeLeft%60).padStart(2,"0");
  const isWarn=timeLeft>0&&timeLeft<600;
  const isOver=timeLeft===0;

  const gradeAnswer=async(idx)=>{
    const part=ex.structure[idx];
    const q=parts[idx];
    const ans=answers[idx]||"";
    if(!ans.trim()||!q)return;
    setGradingIdx(idx);
    try{
      const d=await callClaude(buildGradePrompt(q.question,ans,q.correction),null,1500);
      setGrades(g=>({...g,[idx]:d}));
    }catch{}
    setGradingIdx(null);
  };

  const finishExam=()=>{
    // XP selon les parties répondues
    const answered=Object.keys(answers).filter(k=>answers[k]?.trim().length>10).length;
    let s=updateStreak(getStats());
    s=addSession(s,ex.label,answered,ex.structure.length,"exam");
    const{updated}=addXP(s,answered*20,examSubject==="sciences"?"svt":examSubject);
    saveStats(updated);
    onStatsUpdate&&onStatsUpdate(updated);
    setPhase("result");
  };

  // ── PICK ──
  if(phase==="pick") return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"var(--font-d)",fontSize:22,fontWeight:800,color:"#0C2340",marginBottom:6}}>
          🎓 Simulation d'examen
        </div>
        <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>
          Questions inspirées des <strong>vrais sujets du brevet</strong> (DNB 2019–2023). Chrono réel de l'épreuve. Choisis ta matière :
        </p>
      </div>
      <div className="exam-subject-grid">
        {EXAM_SUBJECTS.map(e=>(
          <div key={e.id} className="exam-subject-card"
            style={{borderColor:`${e.color}40`}}
            onClick={()=>{playCardSelect();startExam(e.id);}}>
            <div style={{fontSize:32,marginBottom:8}}>{e.icon}</div>
            <div style={{fontFamily:"var(--font-d)",fontSize:14,fontWeight:800,color:"#0C2340",marginBottom:4}}>{e.label}</div>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>{e.description}</div>
            <div className="exam-duration-badge">⏱ {e.durationLabel}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#F0FDF4",border:"1.5px solid #A7F3D0",borderRadius:12,padding:12,fontSize:12,color:"#065F46",lineHeight:1.6}}>
        💡 Les questions s'appuient sur les thèmes réels des brevets 2019–2023. Tu peux interrompre à tout moment et reprendre plus tard.
      </div>
    </div>
  );

  // ── BRIEF ──
  if(phase==="brief") return(
    <div>
      <button className="btn-ghost" onClick={()=>setPhase("pick")}>← Changer de matière</button>
      <div style={{background:`${ex.color}12`,border:`1.5px solid ${ex.color}40`,borderRadius:20,padding:20,marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:10}}>{ex.icon}</div>
        <div style={{fontFamily:"var(--font-d)",fontSize:20,fontWeight:800,color:"#0C2340",marginBottom:6}}>{ex.label}</div>
        <div className="exam-duration-badge" style={{fontSize:14,padding:"6px 16px",marginBottom:14}}>⏱ Durée réelle : {ex.durationLabel}</div>
        <div style={{textAlign:"left",marginBottom:14}}>
          <div className="section-title" style={{marginBottom:8}}>Structure de l'épreuve</div>
          {ex.structure.map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"var(--surface)",borderRadius:10,marginBottom:6,border:"1.5px solid var(--border)"}}>
              <div style={{fontSize:13,color:"#0C2340",fontWeight:600}}>{p.part}</div>
              <div style={{fontSize:12,color:"#7C3AED",fontWeight:700}}>{p.points} pts</div>
            </div>
          ))}
        </div>
        <div style={{background:"#FFFBEB",border:"1.5px solid #FDE68A",borderRadius:10,padding:10,fontSize:12,color:"#92400E",marginBottom:14,textAlign:"left"}}>
          ⚠️ Une fois lancé, le chrono tourne. Lis bien chaque consigne avant de répondre.
        </div>
        <button className="btn-cta" onClick={()=>{playCTA();setPhase("exam");}}>
          Commencer l'épreuve →
        </button>
      </div>
    </div>
  );

  // ── EXAM ──
  if(phase==="exam"){
    const currentPart=ex.structure[partIdx];
    const q=parts[partIdx];
    const isLastPart=partIdx===ex.structure.length-1;

    return(
      <div>
        {/* Timer */}
        <div className="exam-timer-big">
          <div className="exam-timer-display" style={{color:isWarn?"#DC2626":isOver?"#DC2626":"#0C2340"}}>
            {isOver?"⏰ Temps écoulé !":
             <>{mm}<span style={{animation:isWarn?"pulse .5s infinite":undefined}}>:{ss2}</span></>}
          </div>
          <div className="exam-timer-label">{ex.label} · {ex.durationLabel} · {ex.icon}</div>
        </div>

        {/* Barre de progression des parties */}
        <div className="exam-nav" style={{marginBottom:10}}>
          {ex.structure.map((_,i)=>(
            <div key={i} className={"exam-nav-dot"+(i<partIdx?" done":i===partIdx?" active":"")}
              style={{cursor:i<=partIdx?"pointer":"default"}}
              onClick={()=>i<=partIdx&&setPartIdx(i)}/>
          ))}
        </div>
        <div style={{fontSize:11,color:"var(--muted)",textAlign:"center",marginBottom:12}}>
          Partie {partIdx+1}/{ex.structure.length} · Clique sur un point pour revenir en arrière
        </div>

        {/* Message mi-parcours */}
        {midMsg&&(
          <div className="exam-mid-message">
            <div style={{fontSize:20,marginBottom:4}}>⏳</div>
            <div style={{fontFamily:"var(--font-d)",fontSize:14,fontWeight:800,color:"#92400E"}}>Mi-temps !</div>
            <div style={{fontSize:12,color:"#78350F",marginTop:3}}>Tu es à mi-chemin — gère bien ton temps pour les dernières parties.</div>
            <button style={{marginTop:8,background:"none",border:"none",color:"#92400E",fontSize:12,cursor:"pointer",fontWeight:600}} onClick={()=>setMidMsg(false)}>Fermer ✕</button>
          </div>
        )}

        {/* En-tête de partie */}
        <div className="exam-part-header">
          <div className="exam-part-label">{ex.label}</div>
          <div className="exam-part-title">{currentPart.part}</div>
          <div className="exam-part-points">Barème : {currentPart.points} points</div>
        </div>

        {loading&&!q&&<Spinner text={`Génération de la partie ${partIdx+1}…`}/>}

        {q&&(
          <>
            {/* Document support */}
            {q.document&&q.document.trim().length>5&&(
              <div className="exam-document">
                <div className="exam-document-label">📄 Document — Texte support</div>
                {q.document}
              </div>
            )}

            {/* Question */}
            <div className="question-card">
              <div className="q-label">Question — {currentPart.part}</div>
              <div className="q-text">{q.question}</div>
            </div>

            {/* Consignes */}
            {q.consignes?.length>0&&(
              <div style={{marginBottom:12}}>
                <div className="section-title" style={{marginBottom:6}}>Consignes</div>
                {q.consignes.map((c,i)=>(
                  <div key={i} className="exam-consigne">
                    <span className="exam-consigne-num">{i+1}.</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Barème indicatif */}
            {q.bareme?.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:"#7C3AED",fontWeight:700,marginBottom:5}}>Barème indicatif</div>
                {q.bareme.map((b,i)=><span key={i} className="exam-bareme-item">{b}</span>)}
              </div>
            )}

            {/* Zone de réponse */}
            {!revealed[partIdx]?(
              <>
                <textarea className="answer-area" style={{minHeight:160}}
                  placeholder="Rédige ta réponse ici…"
                  value={answers[partIdx]||""}
                  onChange={e=>setAnswers(a=>({...a,[partIdx]:e.target.value}))}/>

                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <button className="btn-secondary" style={{flex:1}}
                    onClick={()=>setRevealed(r=>({...r,[partIdx]:true}))}>
                    Voir la correction
                  </button>
                  {!isLastPart?(
                    <button className="btn-cta" style={{flex:1}}
                      onClick={()=>{playCTA();setPartIdx(i=>i+1);}}>
                      Partie suivante →
                    </button>
                  ):(
                    <button className="btn-cta" style={{flex:1,background:"linear-gradient(180deg,#059669,#047857)"}}
                      onClick={()=>{playCTA();finishExam();}}>
                      Terminer 🎓
                    </button>
                  )}
                </div>
              </>
            ):(
              <>
                {/* Correction */}
                <div className="correction-card">
                  <h3>📝 Correction type</h3>
                  <div className="correction-text">{q.correction}</div>
                  {q.points_cles?.length>0&&(
                    <><div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:"#6D28D9",marginTop:12,marginBottom:6,fontWeight:700}}>Points clés</div>
                    <div className="points-cles">{q.points_cles.map((p,i)=><div key={i} className="point">{p}</div>)}</div></>
                  )}
                </div>

                {/* Notation IA */}
                {answers[partIdx]?.trim().length>10&&!grades[partIdx]&&gradingIdx!==partIdx&&(
                  <button className="btn-cta" style={{marginBottom:10,background:"linear-gradient(180deg,#059669,#047857)"}}
                    onClick={()=>gradeAnswer(partIdx)}>
                    🎓 Faire noter ma réponse par l'IA
                  </button>
                )}
                {gradingIdx===partIdx&&<Spinner text="L'IA note ta réponse…"/>}
                {grades[partIdx]&&(
                  <div className="grade-card" style={{marginBottom:10}}>
                    <div className="grade-score">{grades[partIdx].note}/{currentPart.points>20?20:10}</div>
                    <div className="grade-comment">{grades[partIdx].commentaire}</div>
                    {grades[partIdx].points_forts?.length>0&&(
                      <><div className="grade-section">✅ Points forts</div>
                      {grades[partIdx].points_forts.map((p,i)=><div key={i} className="point" style={{color:"#065F46"}}>{p}</div>)}</>
                    )}
                    {grades[partIdx].points_a_ameliorer?.length>0&&(
                      <><div className="grade-section" style={{color:"#DC2626"}}>📌 À améliorer</div>
                      {grades[partIdx].points_a_ameliorer.map((p,i)=><div key={i} className="point" style={{color:"#991B1B"}}>{p}</div>)}</>
                    )}
                  </div>
                )}

                <div style={{display:"flex",gap:8}}>
                  <button className="btn-secondary" style={{flex:1}}
                    onClick={()=>setRevealed(r=>({...r,[partIdx]:false}))}>
                    ← Modifier ma réponse
                  </button>
                  {!isLastPart?(
                    <button className="btn-cta" style={{flex:1}}
                      onClick={()=>{playCTA();setPartIdx(i=>i+1);}}>
                      Partie suivante →
                    </button>
                  ):(
                    <button className="btn-cta" style={{flex:1,background:"linear-gradient(180deg,#059669,#047857)"}}
                      onClick={()=>{playCTA();finishExam();}}>
                      Terminer 🎓
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // ── RESULT ──
  if(phase==="result"){
    const answered=ex.structure.filter((_,i)=>answers[i]?.trim().length>10).length;
    const graded=Object.keys(grades).length;
    return(
      <div className="score-wrap">
        <div style={{fontSize:48,marginBottom:8}}>{ex.icon}</div>
        <div className="score-ring" style={{borderColor:ex.color,color:ex.color}}>
          {answered}/{ex.structure.length}
        </div>
        <div className="score-message">Épreuve terminée !</div>
        <div className="score-sub">{ex.label} · {ex.durationLabel}</div>
        <div className="xp-toast">+{answered*20} XP gagnés !</div>

        {graded>0&&(
          <div style={{marginBottom:16,textAlign:"left"}}>
            <div className="section-title" style={{marginBottom:8}}>Tes notes par partie</div>
            {ex.structure.map((p,i)=>(
              grades[i]?(
                <div key={i} className="exam-result-part">
                  <div className="exam-result-part-title">{p.part}</div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontFamily:"var(--font-d)",fontSize:22,fontWeight:800,color:ex.color}}>{grades[i].note}/10</div>
                    <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.5,flex:1}}>{grades[i].commentaire}</div>
                  </div>
                </div>
              ):null
            ))}
          </div>
        )}

        {graded===0&&answered>0&&(
          <div style={{background:"#EFF6FF",border:"1.5px solid #BAD6F5",borderRadius:12,padding:12,marginBottom:14,fontSize:13,color:"#1E3A8A"}}>
            💡 Tu peux retourner dans chaque partie et demander à l'IA de noter ta réponse !
          </div>
        )}

        <button className="btn-cta" style={{marginBottom:10}} onClick={()=>{playCardSelect();setPhase("pick");setPartIdx(0);setParts([]);setAnswers({});setRevealed({});setGrades({});}}>
          Changer de matière →
        </button>
        <button className="btn-secondary" onClick={onBack}>Retour à l'accueil</button>
      </div>
    );
  }

  return null;
}

// ── Quiz Mode ─────────────────────────────────────────────────────────────────
function QuizMode({subject,chapter,isMix,count,onBack,onStatsUpdate,showFiche=false}){
  const[phase,setPhase]=useState(showFiche?"fiche":"loading");
  const[questions,setQuestions]=useState([]);
  const[idx,setIdx]=useState(0);
  const[selected,setSelected]=useState(null);
  const[score,setScore]=useState(0);
  const[newBadges,setNewBadges]=useState([]);
  const[errorExplain,setErrorExplain]=useState(null);
  const[etymology,setEtymology]=useState(null);
  const[loadingExplain,setLoadingExplain]=useState(false);
  const nextRef=useRef(null);
  const isGeo=subject?.id==="maths"&&GEO_CHAPTERS.includes(chapter);
  const qCount=count||5;
  const weak=getWeak(getStats(),subject?.id||"");
  const seen=isMix?getSeenQuestions("mix"):getSeenQuestions(subject?.id||"");

  const loadQuestions=useCallback(()=>{
    const prompt=isMix?buildMixPrompt(seen):buildQuizPrompt(subject.label,chapter,weak,qCount,seen);
    withMinDelay(callClaude(prompt)).then(d=>{
      const qs=d.questions||[];
      setQuestions(qs);
      // Sauvegarder les questions vues
      addSeenQuestions(isMix?"mix":subject?.id||"",qs);
      setPhase("question");
    }).catch(()=>setPhase("error"));
  },[]);

  useEffect(()=>{if(phase==="loading")loadQuestions();},[phase]);

  useEffect(()=>{
    if(phase==="question"&&idx===2&&!nextRef.current){
      const prompt=isMix?buildMixPrompt():buildQuizPrompt(subject?.label,chapter,weak,5);
      callClaude(prompt).then(d=>{nextRef.current=d.questions||[];}).catch(()=>{});
    }
  },[idx,phase]);

  const handleAnswer=c=>{
    if(selected!==null)return;
    setSelected(c);
    const ok=c.startsWith(q.answer);
    if(ok){setScore(s=>s+1);if(soundEnabled.value)playSound("correct");}
    else{if(soundEnabled.value)playSound("wrong");let s=getStats();s=trackWrong(s,subject?.id,q.chapter||chapter);saveStats(s);}
    setErrorExplain(null);
  };

  const handleNext=()=>{
    if(isLast){
      const xpEarned=score*10+(score===questions.length?20:0);
      let s=updateStreak(getStats());
      s.bestScore=Math.max(s.bestScore||0,score);
      s=addSession(s,isMix?"Mix":subject?.label,score,questions.length,"quiz");
      const{updated,newBadges:nb}=addXP(s,xpEarned,subject?.id||"mix");
      if(nb.length&&soundEnabled.value)playSound("badge");
      saveStats(updated);setNewBadges(nb);
      onStatsUpdate&&onStatsUpdate(updated);
      setPhase("done");
    }else{setIdx(i=>i+1);setSelected(null);setErrorExplain(null);setEtymology(null);}
  };

  const askExplain=async()=>{
    setLoadingExplain(true);
    try{
      const d=await callClaude(buildErrorPrompt(q.question,selected,q.answer,subject?.id||""));
      setErrorExplain(d.explication_erreur);
      if(d.etymologie&&d.etymologie.trim().length>3)setEtymology(d.etymologie);
    }
    catch{setErrorExplain("Impossible de charger.");}
    setLoadingExplain(false);
  };

  if(phase==="fiche")return<MiniFiche subject={subject?.label} chapter={chapter} onContinue={()=>setPhase("loading")} onSkip={()=>setPhase("loading")}/>;
  if(phase==="loading")return<><Spinner/><FloatTools showCalc={subject?.id==="maths"||subject?.id==="physique"}/></>;
  if(phase==="error")return<p className="err">Aïe, un souci technique — réessaie !</p>;

  const q=questions[idx];
  const isLast=idx===questions.length-1;
  const isWrong=selected&&!selected.startsWith(q.answer);
  const xpEarned=score*10+(score===questions.length?20:0);
  const scoreColor=score>=questions.length*.8?"#059669":score>=questions.length*.5?"#D97706":"#DC2626";

  if(phase==="done")return(
    <div className="score-wrap">
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="score-ring" style={{borderColor:scoreColor,color:scoreColor}}>{score}/{questions.length}</div>
      <div className="score-message">{score>=questions.length*.8?"🎉 Trop bien !":score>=questions.length*.5?"👍 Bien joué !":"💪 Accroche-toi, ça vient !"}</div>
      <div className="score-sub">{isMix?"🎲 Mix Brevet":`${subject?.icon} ${subject?.label}${chapter?` · ${chapter}`:""}`}</div>
      <div className="xp-toast">+{xpEarned} XP gagnés !</div>
      {score<questions.length*.5&&(
        <div className="encourage-card">
          💡 Score faible sur {isMix?"ce mix":chapter||subject?.label} — retravaille ce chapitre avec une <strong>Question Longue</strong> pour consolider les bases. Tu peux le faire !
        </div>
      )}
      {newBadges.map(bid=>{const b=BADGES.find(x=>x.id===bid);return b?<div key={bid} className="new-badge-toast">🏅 Nouveau badge : {b.icon} {b.label}</div>:null;})}
      <button className="btn-cta" onClick={onBack}>Encore une fois ↩</button>
    </div>
  );

  return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="progress-wrap">
        <div className="progress-info">
          <span>Q{idx+1}/{questions.length}</span>
          <span style={{fontSize:10,background:"#EFF6FF",border:"1px solid #BAD6F5",borderRadius:20,padding:"2px 8px",color:"#1D4ED8",fontWeight:700}}>
            {DIFFICULTY_LEVELS.find(l=>l.id===getDifficulty())?.emoji} {DIFFICULTY_LEVELS.find(l=>l.id===getDifficulty())?.label}
          </span>
          <span>{score} ⭐</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{width:`${(idx/questions.length)*100}%`}}/></div>
      </div>
      <div className="question-card">
        <div className="q-label">{isMix?`🎲 ${q.matiere||""}`:`${subject?.icon} ${chapter||subject?.label}`}</div>
        <div className="q-text">{q.question}</div>
        {isGeo&&<GeoFigure question={q.question}/>}
      </div>
      <div className="choices">
        {q.choices.map(c=>{let cls="choice-btn";if(selected!==null){if(c.startsWith(q.answer))cls+=" correct";else if(c===selected)cls+=" wrong";}return<button key={c} className={cls} disabled={selected!==null} onClick={()=>handleAnswer(c)}>{c}</button>;})}
      </div>
      {selected&&<>
        <div className="explanation"><strong>💡 Explication</strong>{q.explanation}</div>
        {isWrong&&!errorExplain&&!loadingExplain&&<button className="btn-secondary" style={{marginBottom:10}} onClick={askExplain}>🤔 Pourquoi ma réponse était fausse ?</button>}
        {loadingExplain&&<p style={{textAlign:"center",fontSize:12,color:"#3B82F6",marginBottom:10}}>Analyse…</p>}
        {errorExplain&&<div className="error-explain"><strong>🔍 Comprendre l'erreur</strong>{errorExplain}</div>}
        {etymology&&<div style={{background:"#FFF7ED",border:"1.5px solid #FED7AA",borderRadius:10,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#92400E"}}><strong style={{display:"block",fontSize:10,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>📚 Étymologie</strong>{etymology}</div>}
        <button className="btn-cta" onClick={handleNext}>{isLast?"Voir mon score →":"Question suivante →"}</button>
      </>}
      <FloatTools showCalc={subject?.id==="maths"||subject?.id==="physique"}/>
    </div>
  );
}

// ── Long Mode ─────────────────────────────────────────────────────────────────
function LongMode({subject,chapter,isMix,onBack,onStatsUpdate,showFiche=false}){
  const[phase,setPhase]=useState(showFiche&&!isMix?"fiche":"loading");
  const[data,setData]=useState(null);
  const[answer,setAnswer]=useState("");
  const[evalScore,setEvalScore]=useState(null);
  const[revealed,setRevealed]=useState(false);
  const[grading,setGrading]=useState(false);
  const[grade,setGrade]=useState(null);
  const[newBadges,setNewBadges]=useState([]);
  const isGeo=subject?.id==="maths"&&GEO_CHAPTERS.includes(chapter);
  const isDev=chapter==="Développement construit";

  useEffect(()=>{
    if(phase==="loading"){
      const prompt=isMix?buildMixLongPrompt():buildLongPrompt(subject?.label,chapter);
      withMinDelay(callClaude(prompt)).then(d=>{setData(d);setPhase("question");}).catch(()=>setPhase("error"));
    }
  },[phase]);

  const handleReveal=()=>{setRevealed(true);};

  const handleGrade=async()=>{
    setGrading(true);
    try{const d=await callClaude(buildGradePrompt(data.question,answer,data.correction));setGrade(d);}
    catch{setGrade(null);}
    setGrading(false);
    // XP
    let s=updateStreak(getStats());
    s=addSession(s,isMix?"Mix":subject?.label,1,1,"long");
    const{updated,newBadges:nb}=addXP(s,15,subject?.id||"mix");
    if(nb.length&&soundEnabled.value)playSound("badge");
    saveStats(updated);setNewBadges(nb);
    onStatsUpdate&&onStatsUpdate(updated);
  };

  if(phase==="fiche")return<MiniFiche subject={subject?.label} chapter={chapter} onContinue={()=>setPhase("loading")} onSkip={()=>setPhase("loading")}/>;
  if(phase==="loading")return<><Spinner/><FloatTools showCalc={subject?.id==="maths"||subject?.id==="physique"}/></>;
  if(phase==="error")return<p className="err">Aïe, un souci technique — réessaie !</p>;

  return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="question-card">
        <div className="q-label">{isMix?`🎲 ${data.matiere||""}`:`${subject?.icon} ${isDev?"Développement construit":(chapter||subject?.label)}`}</div>
        <div className="q-text">{data.question}</div>
        {data.context&&<div className="q-context">{data.context}</div>}
        {isGeo&&<GeoFigure question={data.question}/>}
      </div>
      {!revealed&&(
        <div className="brevet-banner">
          <span style={{fontSize:18,flexShrink:0}}>📋</span>
          <div className="brevet-banner-text">
            <strong>Critères du vrai brevet</strong>
            {isDev?"Organisation (intro/développement/conclusion), arguments historiques, maîtrise de la langue. (10 pts)":"Pertinence, organisation des idées, maîtrise de la langue."}
          </div>
        </div>
      )}
      {!revealed?(
        <>
          <textarea className="answer-area" placeholder={isDev?"Écris ton développement ici — intro, arguments, conclusion…":"Écris ta réponse ici…"} value={answer} onChange={e=>setAnswer(e.target.value)}/>
          {answer.trim().length>=10&&!evalScore&&(
            <div className="self-eval">
              <div className="self-eval-label">🤔 Avant de voir la correction — tu penses avoir répondu…</div>
              <div className="self-eval-row">
                {["😰 Pas bien","😐 Moyen","🙂 Assez bien","😊 Bien","🎯 Très bien"].map((e,i)=>(
                  <button key={i} className={"eval-btn"+(evalScore===i?" selected":"")} onClick={()=>setEvalScore(i)}>{e}</button>
                ))}
              </div>
            </div>
          )}
          <button className="btn-cta" onClick={handleReveal} disabled={answer.trim().length<10||evalScore===null}>
            {evalScore===null&&answer.trim().length>=10?"Évalue-toi d'abord ↑":"Voir la correction →"}
          </button>
          {answer.length>0&&answer.trim().length<10&&<p className="hint">Rédige une réponse un peu plus longue !</p>}
        </>
      ):(
        <>
          <div className="correction-card">
            <h3>📝 Correction type</h3>
            <div className="correction-text">{data.correction}</div>
            {data.points_cles?.length>0&&(<><div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:"#6D28D9",marginTop:12,marginBottom:6,fontWeight:700}}>Points clés attendus</div><div className="points-cles">{data.points_cles.map((p,i)=><div key={i} className="point">{p}</div>)}</div></>)}
          </div>
          <div style={{marginBottom:12,background:"#F0F7FF",borderRadius:12,padding:12,border:"1.5px solid #BAD6F5"}}>
            <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:"#5A85AA",marginBottom:6,fontWeight:700}}>Ta réponse</div>
            <div style={{fontSize:13,lineHeight:1.75,color:"#1E4976",whiteSpace:"pre-wrap"}}>{answer}</div>
          </div>
          {!grade&&!grading&&(
            <button className="btn-cta" style={{marginBottom:10,background:"linear-gradient(180deg,#059669,#047857)"}} onClick={handleGrade}>
              🎓 Faire noter ma réponse par l'IA /10
            </button>
          )}
          {grading&&<Spinner text="L'IA note ta réponse…"/>}
          {grade&&(
            <div className="grade-card">
              <div className="grade-score">{grade.note}/10</div>
              <div className="grade-comment">{grade.commentaire}</div>
              {grade.points_forts?.length>0&&(<><div className="grade-section">✅ Points forts</div>{grade.points_forts.map((p,i)=><div key={i} className="point" style={{color:"#065F46"}}>{p}</div>)}</>)}
              {grade.points_a_ameliorer?.length>0&&(<><div className="grade-section" style={{color:"#DC2626"}}>📌 À améliorer</div>{grade.points_a_ameliorer.map((p,i)=><div key={i} className="point" style={{color:"#991B1B"}}>{p}</div>)}</>)}
            </div>
          )}
          <div className="xp-toast" style={{display:"block",textAlign:"center",marginBottom:12}}>+15 XP gagnés !</div>
          {newBadges.map(bid=>{const b=BADGES.find(x=>x.id===bid);return b?<div key={bid} className="new-badge-toast">🏅 {b.icon} {b.label}</div>:null;})}
          <button className="btn-cta" onClick={onBack}>Nouvelle question →</button>
        </>
      )}
      <FloatTools showCalc={subject?.id==="maths"||subject?.id==="physique"}/>
    </div>
  );
}

// ── Planning Screen ───────────────────────────────────────────────────────────
function PlanningScreen({onBack,onStartSession,onPlanningUpdate}){
  const saved=loadPlanning();
  const savedPlanning=saved?.planning;
  const hasValidPlanning=Array.isArray(savedPlanning)&&savedPlanning.length>0;

  const[date,setDate]=useState(saved?.brevetDate||"");
  const[weeks,setWeeks]=useState(saved?.daysLeft?Math.ceil(saved.daysLeft/7):8);
  const[useWeeks,setUseWeeks]=useState(!saved?.brevetDate);
  const[state,setState]=useState(hasValidPlanning?"done":"form");
  const[planning,setPlanning]=useState(hasValidPlanning?savedPlanning:[]);
  const[restDays,setRestDays]=useState([]);
  const[loadingWeek,setLoadingWeek]=useState(false);

  // Métadonnées brevet
  const[brevetDateStr,setBrevetDateStr]=useState(saved?.brevetDate||"");
  const[daysLeftRef,setDaysLeftRef]=useState(saved?.daysLeft||56);

  const generate=async()=>{
    let dateStr,daysLeft;
    if(useWeeks){
      daysLeft=weeks*7;
      const d=new Date(Date.now()+daysLeft*86400000);
      dateStr=d.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
    } else {
      const obj=new Date(date);
      daysLeft=Math.ceil((obj-new Date())/86400000);
      dateStr=obj.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
    }
    setBrevetDateStr(dateStr);
    setDaysLeftRef(daysLeft);
    setState("loading");
    try{
      const fromDate=new Date().toISOString().split("T")[0];
      const d=await withMinDelay(callClaude(buildPlanningPrompt(dateStr,daysLeft,fromDate,getStats()),null,2000),600);
      const j=d.jours||d.planning||d.days||d.schedule||Object.values(d)[0]||[];
      if(!Array.isArray(j)||j.length===0)throw new Error("Planning vide");
      setPlanning(j);
      savePlanning(j,date||"",daysLeft);
      setState("done");
      onPlanningUpdate&&onPlanningUpdate();
    }
    catch{setState("error");}
  };

  const loadNextWeek=async()=>{
    // Trouver la date du dernier jour du planning actuel
    const last=planning[planning.length-1];
    if(!last?.dateISO)return;
    // Partir du lendemain du dernier jour
    const nextDay=new Date(last.dateISO);
    nextDay.setDate(nextDay.getDate()+1);
    const fromDate=nextDay.toISOString().split("T")[0];
    // Recalculer les jours restants jusqu'au brevet
    const daysLeft=daysLeftRef-planning.length;
    if(daysLeft<=0)return;
    setLoadingWeek(true);
    try{
      const d=await callClaude(buildPlanningPrompt(brevetDateStr,daysLeft,fromDate,getStats()),null,2000);
      const j=d.jours||d.planning||d.days||d.schedule||Object.values(d)[0]||[];
      if(!Array.isArray(j)||j.length===0)throw new Error("Semaine vide");
      const merged=[...planning,...j];
      setPlanning(merged);
      savePlanning(merged,date||"",daysLeftRef);
      onPlanningUpdate&&onPlanningUpdate();
    }
    catch{}
    setLoadingWeek(false);
  };

  if(state==="loading")return<><button className="btn-ghost" onClick={onBack}>← Retour</button><Spinner text="Génération de la première semaine…"/></>;
  if(state==="error")return(
    <><button className="btn-ghost" onClick={onBack}>← Retour</button>
    <div style={{background:"#FEF2F2",border:"1.5px solid #FECACA",borderRadius:14,padding:16,textAlign:"center"}}>
      <div style={{fontSize:24,marginBottom:8}}>😕</div>
      <div style={{fontFamily:"var(--font-d)",fontSize:15,fontWeight:800,color:"#991B1B",marginBottom:6}}>Oups, le planning n'a pas pu être généré</div>
      <div style={{fontSize:13,color:"#7F1D1D",marginBottom:14}}>Réessaie — ça arrive parfois !</div>
      <button className="btn-cta" onClick={()=>setState("form")}>↩ Réessayer</button>
    </div></>
  );

  return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>

      {state==="form"&&(
        <div className="planning-header">
          <div style={{fontSize:44,marginBottom:10}}>📅</div>
          <div className="planning-title">Mon Planning Brevet</div>
          <div className="planning-desc">Entre la date du brevet ou le nombre de semaines restantes. Le planning se génère semaine par semaine.</div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <button className={`count-btn${!useWeeks?" selected":""}`} onClick={()=>setUseWeeks(false)}>📅 Date exacte</button>
            <button className={`count-btn${useWeeks?" selected":""}`} onClick={()=>setUseWeeks(true)}>⏳ En semaines</button>
          </div>
          {!useWeeks?(
            <input type="date" className="date-input" value={date} onChange={e=>setDate(e.target.value)} min={new Date().toISOString().split("T")[0]}/>
          ):(
            <div className="weeks-row">
              <span style={{fontSize:13,color:"var(--muted)",fontWeight:600}}>Dans</span>
              <input type="range" className="weeks-slider" min="1" max="20" value={weeks} onChange={e=>setWeeks(+e.target.value)} style={{flex:1}}/>
              <span className="weeks-label">{weeks} sem.</span>
            </div>
          )}
          <button className="btn-cta" disabled={!useWeeks&&!date} onClick={()=>{playCTA();generate();}}>Générer mon planning →</button>
        </div>
      )}

      {state==="done"&&(
        <>
          <div className="planning-header">
            <div className="planning-title">📅 Planning Brevet</div>
            <div className="planning-desc">
              {planning.length} jours générés · Clique sur une session pour la faire directement !
            </div>
            <button className="btn-secondary" onClick={()=>{setPlanning([]);setState("form");}}>↩ Recréer</button>
          </div>

          {planning.map((jour,i)=>{
            const isRest=restDays.includes(jour.dateISO);
            const isToday=jour.dateISO===new Date().toISOString().split("T")[0];
            return(
              <div key={i} className="planning-day" style={isToday?{border:"2px solid #3B82F6",boxShadow:"0 3px 0 #93C5E8, 0 0 0 3px #DBEAFE"}:{}}>
                <div className="planning-day-header" style={isRest?{opacity:0.55}:{}}>
                  <span className="day-title" style={isToday?{color:"#2563EB"}:{}}>{isToday?"👉 ":""}{jour.jour}{isToday?" (Aujourd'hui)":""}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span className="day-date">{jour.date}</span>
                    <button className={"sleep-btn"+(isRest?" active":"")} onClick={()=>setRestDays(p=>p.includes(jour.dateISO)?p.filter(d=>d!==jour.dateISO):[...p,jour.dateISO])}>
                      😴 {isRest?"Repos":"Repos ?"}
                    </button>
                  </div>
                </div>
                {isRest?(
                  <div style={{padding:"10px 14px",fontSize:12,color:"#5A85AA",fontStyle:"italic"}}>Jour de repos 😴</div>
                ):(
                  <div className="planning-sessions-list">
                    {(jour.sessions||[]).map((s,j)=>(
                      <div key={j} className="planning-session" onClick={()=>onStartSession(s)}>
                        <div className="session-mat" style={{color:SUBJECT_COLORS[s.matiere]||"#2563EB"}}>{s.matiere}</div>
                        <div className="session-info"><div className="session-chap">{s.chapitre}</div><div className="session-exo">{s.exercice}</div></div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <div className="session-dur">⏱ {s.duree}</div>
                          <span style={{fontSize:13}}>{s.exercice?.toLowerCase().includes("long")?"✍️":"⚡"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bouton "Semaine suivante" */}
          {daysLeftRef>planning.length&&(
            <div style={{textAlign:"center",padding:"10px 0 6px"}}>
              {loadingWeek?(
                <Spinner text="Génération de la semaine suivante…"/>
              ):(
                <button className="btn-secondary" style={{maxWidth:300,margin:"0 auto"}} onClick={loadNextWeek}>
                  📅 Charger la semaine suivante →
                </button>
              )}
            </div>
          )}
          {daysLeftRef<=planning.length&&(
            <div style={{textAlign:"center",padding:"12px",fontSize:13,color:"#059669",fontWeight:600}}>
              🎉 Tout le planning jusqu'au brevet est généré !
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Setup Screen ──────────────────────────────────────────────────────────────
function SetupScreen({subject,onStart,onBack}){
  const[trainingType,setTrainingType]=useState(null);
  const[chapter,setChapter]=useState(null);
  const[mode,setMode]=useState(null);
  const[qCount,setQCount]=useState(5);
  const[showFiche,setShowFiche]=useState(true);
  const[showModes,setShowModes]=useState(false);
  const[showCount,setShowCount]=useState(false);
  const chapters=CHAPTERS[subject.id]||[];
  const canStart=mode&&(trainingType==="mixed"||(trainingType==="chapter"&&chapter));
  const ss=a=>a?{borderColor:subject.color,background:`${subject.color}15`,boxShadow:`0 9px 0 ${subject.color}30`,transform:"translateY(-4px)"}:{};

  const selectTraining=t=>{
    setTrainingType(t);setChapter(null);setMode(null);setShowModes(false);setShowCount(false);
    if(t==="mixed")setTimeout(()=>setShowModes(true),80);
  };
  const selectChapter=c=>{
    setChapter(c);setMode(null);setShowModes(false);setShowCount(false);
    setTimeout(()=>setShowModes(true),80);
  };
  const selectMode=m=>{
    setMode(m);setShowCount(false);
    if(m==="quiz")setTimeout(()=>setShowCount(true),80);
  };

  return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Matières</button>
      <div className="setup-pill"><span>{subject.icon}</span><span style={{color:subject.color}}>{subject.label}</span></div>
      <div className="section-title">Comment veux-tu t'entraîner ?</div>
      <div className="training-grid">
        {[
          {id:"mixed",icon:subject.id==="anglais"?"📖":"🎯",label:subject.id==="anglais"?"Révision générale":"Tout ce qui tombe au brevet",desc:"Sujets les plus probables"},
          {id:"chapter",icon:"📖",label:"Par chapitre",desc:"Cible un chapitre précis"},
        ].map(t=>(
          <div key={t.id} className="training-card" style={ss(trainingType===t.id)} onClick={()=>{playCardSelect();selectTraining(t.id);}}>
            <div className="training-icon">{t.icon}</div><div className="training-label">{t.label}</div><div className="training-desc">{t.desc}</div>
          </div>
        ))}
      </div>

      {trainingType==="chapter"&&(
        <div className="fade-in">
          <div className="section-title">Choisis un chapitre</div>
          <div className="chapter-chips">
            {chapters.map(c=>(
              <div key={c} className="chapter-chip"
                style={chapter===c?{borderColor:subject.color,background:`${subject.color}15`,color:subject.color,fontWeight:700,transform:"translateY(-2px)"}:{}}
                onClick={()=>{playChip();selectChapter(c);}}>
                {c}
              </div>
            ))}
          </div>
        </div>
      )}

      {showModes&&(
        <div className="fade-in">
          <div className="section-title">Type de questions</div>
          <div className="mode-grid">
            {[
              {id:"quiz",  icon:"⚡", label:"Quiz",          desc:"QCM"},
              {id:"long",  icon:"✍️", label:"Question Longue",desc:"1 question ouverte"},
              {id:"stories",icon:"📱",label:"Stories",        desc:"Swipe !"},
            ].map(m=>(
              <div key={m.id} className="mode-card"
                style={mode===m.id?{borderColor:subject.color,background:`${subject.color}12`,boxShadow:`0 8px 0 ${subject.color}25`,transform:"translateY(-4px)"}:{}}
                onClick={()=>{playModeSelect();selectMode(m.id);}}>
                <div className="mode-icon">{m.icon}</div>
                <div className="mode-label">{m.label}</div>
                <div className="mode-desc">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCount&&(
        <div className="fade-in">
          <div className="section-title">Nombre de questions</div>
          <div className="count-selector">
            {[3,5,10].map(n=>(
              <button key={n} className={"count-btn"+(qCount===n?" selected":"")} onClick={()=>{playChip();setQCount(n);}}>
                {n} questions
              </button>
            ))}
          </div>
        </div>
      )}

      {mode&&(
        <div className="fade-in">
          <label className="sound-toggle">
            <input type="checkbox" defaultChecked onChange={e=>{soundEnabled.value=e.target.checked;}}/> Sons activés
          </label>
          <label className="sound-toggle" style={{marginBottom:10}}>
            <input type="checkbox" checked={showFiche} onChange={e=>setShowFiche(e.target.checked)}/> Mini-fiche avant de commencer
          </label>
          <div className="sticky-cta">
            <button className="btn-cta" disabled={!canStart}
              onClick={()=>{if(canStart){playCTA();onStart(trainingType==="chapter"?chapter:null,mode,qCount,showFiche);}}}>
              C'est parti 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const[screen,setScreen]=useState("home");
  const[subject,setSubject]=useState(null);
  const[chapter,setChapter]=useState(null);
  const[isMix,setIsMix]=useState(false);
  const[mode,setMode]=useState(null);
  const[qCount,setQCount]=useState(5);
  const[showFiche,setShowFiche]=useState(true);
  const[homeTab,setHomeTab]=useState("accueil");
  const[mixMode,setMixMode]=useState(null);
  const[stats,setStats]=useState(()=>getStats());
  const[subScreen,setSubScreen]=useState(null);
  const[planningKey,setPlanningKey]=useState(0);

  // Appliquer le thème au démarrage + écouter les changements système
  useEffect(()=>{
    const saved=getSavedTheme();
    applyTheme(saved);
    // Écouter les changements de mode clair/sombre du système
    const mq=window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange=()=>{ if(getSavedTheme()==="auto") applyTheme("auto"); };
    mq?.addEventListener("change",onChange);
    return()=>mq?.removeEventListener("change",onChange);
  },[]);

  const goHome=()=>{setScreen("home");setSubject(null);setChapter(null);setIsMix(false);setMode(null);setMixMode(null);setSubScreen(null);};
  const refresh=s=>setStats(s||getStats());

  const startPlanningSession=session=>{
    const s=SUBJECTS.find(s=>s.label===session.matiere);
    if(!s)return;
    setSubject(s);setChapter(session.chapitre||null);setIsMix(false);
    setMode(session.exercice?.toLowerCase().includes("long")?"long":"quiz");
    setQCount(5);setShowFiche(false);setScreen("play");
  };

  const startUrgent=(subId,ch)=>{
    const s=SUBJECTS.find(s=>s.id===subId);
    if(!s)return;
    setSubject(s);setChapter(ch);setIsMix(false);setMode("quiz");setQCount(5);setShowFiche(true);setScreen("play");
  };

  const renderPlay=()=>{
    if(mode==="quiz")return<QuizMode subject={subject} chapter={chapter} isMix={isMix} count={qCount} showFiche={showFiche} onBack={goHome} onStatsUpdate={refresh}/>;
    if(mode==="long")return<LongMode subject={subject} chapter={chapter} isMix={isMix} showFiche={showFiche} onBack={goHome} onStatsUpdate={refresh}/>;
    if(mode==="stories")return<StoriesMode subject={subject} chapter={chapter} isMix={isMix} onBack={goHome} onDone={(sc,tot)=>{let s=updateStreak(getStats());s=addSession(s,isMix?"Mix":subject?.label,sc,tot,"stories");const{updated}=addXP(s,sc*8,subject?.id||"mix");saveStats(updated);refresh(updated);goHome();}}/>;
    if(mode==="exam")return<ExamMode onBack={goHome} onStatsUpdate={refresh}/>;
    if(mode==="veille")return<VeilleMode onBack={goHome} onStatsUpdate={refresh}/>;
    return null;
  };

  return(
    <>
      <style>{css}</style>
      <div className="app">
        <div className="container">
          {screen==="home"&&(
            <>
              <div className="header">
                <div className="badge-pill"><span className="badge-dot"/>Révision Brevet 3ème</div>
                <h1>Prépare ton <span className="h1-accent">Brevet</span> 📖</h1>
                <p>Questions IA · Programme officiel DNB</p>
              </div>
              <div className="home-tabs">
                <button className={`home-tab${homeTab==="accueil"?" active":""}`} onClick={()=>{playClick();setHomeTab("accueil");}}>🏠 Accueil</button>
                <button className={`home-tab${homeTab==="matieres"?" active":""}`} onClick={()=>{playClick();setHomeTab("matieres");}}>📚 Matières</button>
                <button className={`home-tab${homeTab==="mix"?" active":""}`} onClick={()=>{playClick();setHomeTab("mix");}}>🎲 Mix</button>
                <button className={`home-tab${homeTab==="carte"?" active":""}`} onClick={()=>{playClick();setHomeTab("carte");}}>🗺️ Carte</button>
                <button className={`home-tab${homeTab==="plus"?" active":""}`} onClick={()=>{playClick();setHomeTab("plus");}}>✨ Plus</button>
              </div>

              {homeTab==="accueil"&&(
                <>
                  {subScreen==="badges"?(
                    <BadgesPage stats={stats} onBack={()=>setSubScreen(null)}/>
                  ):(
                    <>
                      <WelcomeBack stats={stats} onStartUrgent={startUrgent}/>
                      <DailyGoal stats={stats}/>
                      <Dashboard stats={stats} onOpenBadges={()=>setSubScreen("badges")}/>
                      <TodayWidget onStartSession={startPlanningSession} planningKey={planningKey}/>
                  <div className="section-title">Lancer une session</div>
                  <button className="quick-btn" onClick={()=>{playCTA();setIsMix(true);setSubject(null);setChapter(null);setMode("quiz");setQCount(2);setShowFiche(false);setScreen("play");}}>
                    ⚡ Session express — 2 questions, moins d'1 minute
                  </button>
                  <div className="mode-grid">
                    {[
                      {id:"mix-quiz",icon:"🎲",label:"Mix Quiz",desc:"5 QCM toutes matières"},
                      {id:"mix-long",icon:"✍️",label:"Question longue",desc:"Façon brevet"},
                      {id:"exam",icon:"🎓",label:"Simulation examen",desc:"30 min chrono"},
                      {id:"veille",icon:"🎯",label:"Les essentiels",desc:"L'essentiel à savoir"},
                    ].map(m=>(
                      <div key={m.id} className="mode-card" onClick={()=>{
                        playClick();
                        if(m.id==="exam"){setMode("exam");setScreen("play");return;}
                        if(m.id==="veille"){setMode("veille");setScreen("play");return;}
                        setIsMix(true);setSubject(null);setChapter(null);
                        setMode(m.id==="mix-quiz"?"quiz":"long");setQCount(5);setShowFiche(false);setScreen("play");
                      }}>
                        <div className="mode-icon">{m.icon}</div><div className="mode-label">{m.label}</div><div className="mode-desc">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                    </>
                  )}
                </>
              )}

              {homeTab==="matieres"&&(
                <>
                  <div className="section-title">Choisis une matière</div>
                  <div className="subject-grid">
                    {SUBJECTS.map(s=>{const xp=stats.subjectXP?.[s.id]||0;const lv=getLevel(xp);return(
                      <div key={s.id} className="subject-card"
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=s.color;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="";}}
                        onClick={()=>{playCardSelect();setSubject(s);setScreen("setup");}}>
                        <div className="subject-icon">{s.icon}</div>
                        <div className="subject-label">{s.label}</div>
                        <div className="subject-lv" style={{color:lv.color}}>{xp>0?lv.label:""}</div>
                      </div>
                    );})}
                  </div>
                </>
              )}

              {homeTab==="mix"&&(
                <div className="mix-card">
                  <div className="mix-title">🎲 Mix Brevet</div>
                  <div className="mix-desc">Toutes les matières mélangées · Sujets les plus probables</div>
                  <div className="section-title" style={{marginBottom:12}}>Type de questions</div>
                  <div className="mode-grid" style={{marginBottom:10}}>
                    {[
                      {id:"quiz",icon:"⚡",label:"Quiz",desc:"QCM"},
                      {id:"long",icon:"✍️",label:"Question Longue",desc:"1 question ouverte"},
                      {id:"stories",icon:"📱",label:"Stories",desc:"Swipe !"},
                      {id:"veille",icon:"🎯",label:"Les essentiels",desc:"L'essentiel à savoir"},
                    ].map(m=>(
                      <div key={m.id} className="mode-card" style={mixMode===m.id?{borderColor:"#3B82F6",background:"#DBEAFE",boxShadow:"0 8px 0 #93C5FD",transform:"translateY(-4px)"}:{}} onClick={()=>{playModeSelect();setMixMode(m.id);}}>
                        <div className="mode-icon">{m.icon}</div><div className="mode-label">{m.label}</div><div className="mode-desc">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                  {mixMode==="quiz"&&(
                    <><div className="section-title">Nombre de questions</div>
                    <div className="count-selector" style={{marginBottom:14}}>{[3,5,10].map(n=><button key={n} className={"count-btn"+(qCount===n?" selected":"")} onClick={()=>{playChip();setQCount(n);}}>{n} Q</button>)}</div></>
                  )}
                  <button className="btn-cta" disabled={!mixMode} onClick={()=>{
                    playCTA();
                    if(!mixMode)return;
                    if(mixMode==="veille"){setMode("veille");setScreen("play");return;}
                    setIsMix(true);setSubject(null);setChapter(null);setMode(mixMode);setShowFiche(false);setScreen("play");
                  }}>C'est parti 🚀</button>
                </div>
              )}

              {homeTab==="carte"&&(
                subScreen==="history"?<SessionHistory stats={stats}/>:
                subScreen==="summary"?<AISummary stats={stats} onBack={()=>setSubScreen(null)}/>:
                <>
                  <MindMap stats={stats}/>
                  <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
                    <button className="btn-secondary" onClick={()=>setSubScreen("history")}>📊 Voir l'historique des sessions</button>
                    <button className="btn-secondary" style={{background:"linear-gradient(135deg,#EDE9FE,#F5F3FF)",borderColor:"#C4B5FD",color:"#6D28D9"}} onClick={()=>setSubScreen("summary")}>
                      🧠 Résumé IA personnalisé {stats.totalSessions<3?"(disponible après 3 sessions)":""}
                    </button>
                  </div>
                </>
              )}

              {homeTab==="plus"&&(
                <>
                  <div className="section-title">Outils & fonctionnalités</div>
                  <div className="mode-grid">
                    {[
                      {id:"planning",icon:"📅",label:"Mon Planning",desc:"Planning intelligent"},
                      {id:"veille",icon:"🎯",label:"Les essentiels",desc:"L'essentiel à savoir"},
                      {id:"exam",icon:"🎓",label:"Simulation examen",desc:"30 min chrono"},
                      {id:"summary",icon:"🧠",label:"Résumé IA",desc:"Analyse personnalisée"},
                    ].map(m=>(
                      <div key={m.id} className="mode-card" onClick={()=>{
                        if(m.id==="planning"){setHomeTab("planning-screen");return;}
                        if(m.id==="veille"){setMode("veille");setScreen("play");return;}
                        if(m.id==="exam"){setMode("exam");setScreen("play");return;}
                        if(m.id==="summary"){setHomeTab("carte");setSubScreen("summary");return;}
                      }}>
                        <div className="mode-icon">{m.icon}</div><div className="mode-label">{m.label}</div><div className="mode-desc">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                  <div className="divider"/>
                  <ThemeSelector/>
                  <DifficultySelector/>
                  <BackupPanel stats={stats} onStatsRefresh={()=>setStats(getStats())}/>
                  <div className="divider"/>
                  <div className="section-title">Réglages</div>
                  <label className="sound-toggle" style={{marginBottom:8}}>
                    <input type="checkbox" defaultChecked onChange={e=>{soundEnabled.value=e.target.checked;}}/> Sons de feedback activés
                  </label>
                  <button className="btn-danger" onClick={()=>{if(window.confirm("Tu veux vraiment tout effacer ? (XP, streak, badges…) Impossible de revenir en arrière !")){localStorage.removeItem("brevet_v3");setStats({...EMPTY});}}}>
                    🗑️ Réinitialiser mes stats
                  </button>
                </>
              )}

              {homeTab==="planning-screen"&&(
                <PlanningScreen onBack={()=>setHomeTab("plus")} onStartSession={startPlanningSession} onPlanningUpdate={()=>setPlanningKey(k=>k+1)}/>
              )}
            </>
          )}

          {screen==="setup"&&subject&&(
            <SetupScreen subject={subject} onBack={goHome} onStart={(ch,m,count,fiche)=>{setChapter(ch);setMode(m);setQCount(count||5);setShowFiche(fiche);setScreen("play");}}/>
          )}

          {screen==="play"&&renderPlay()}
        </div>
      </div>
    </>
  );
}
