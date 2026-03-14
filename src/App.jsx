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
  {id:"first",   icon:"🎯",label:"Premier Quiz",       check:s=>s.totalSessions>=1},
  {id:"streak3", icon:"🔥",label:"3 jours de suite",   check:s=>s.streak>=3},
  {id:"streak7", icon:"🌟",label:"Une semaine !",      check:s=>s.streak>=7},
  {id:"xp100",   icon:"💎",label:"100 XP",             check:s=>s.xp>=100},
  {id:"xp500",   icon:"🏆",label:"500 XP",             check:s=>s.xp>=500},
  {id:"perfect", icon:"⭐",label:"Quiz parfait",       check:s=>s.bestScore>=5},
  {id:"rainbow", icon:"🌈",label:"Toutes les matières",check:s=>Object.keys(s.subjectXP||{}).length>=7},
  {id:"maths100",icon:"📐",label:"Maître des Maths",   check:s=>(s.subjectXP?.maths||0)>=100},
  {id:"hist100", icon:"🌍",label:"As de l'Histoire",   check:s=>(s.subjectXP?.histoire||0)>=100},
  {id:"sess10",  icon:"🎓",label:"10 sessions",        check:s=>s.totalSessions>=10},
  {id:"veille",  icon:"🎯",label:"Les essentiels",check:s=>s.badges?.includes("veille")||false},
];

const LOADING_MESSAGES = [
  "Je prépare tes questions…","L'IA réfléchit pour toi…","On prépare tes questions…",
  "Je cherche les meilleures questions…","Presque prêt…","Je calibre la difficulté…",
  "Questions du brevet en approche…","Concentration maximale…",
];

// ── STATS ─────────────────────────────────────────────────────────────────────
const EMPTY = {streak:0,lastSession:null,xp:0,totalSessions:0,bestScore:0,badges:[],subjectXP:{},weakChapters:{},sessionHistory:[],dailyGoal:2,todaySessions:0,lastGoalDate:null};
function getStats(){try{const d=localStorage.getItem("brevet_v3");return d?{...EMPTY,...JSON.parse(d)}:{...EMPTY};}catch{return {...EMPTY};}}
function saveStats(s){try{localStorage.setItem("brevet_v3",JSON.stringify(s));}catch{}}

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

function savePlanning(p,d){try{localStorage.setItem("brevet_plan",JSON.stringify({planning:p,brevetDate:d}));}catch{}}
function loadPlanning(){try{const d=localStorage.getItem("brevet_plan");return d?JSON.parse(d):null;}catch{return null;}}

// ── SOUND (Web Audio API) ─────────────────────────────────────────────────────
function playSound(type){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    if(type==="correct"){osc.frequency.setValueAtTime(523,ctx.currentTime);osc.frequency.setValueAtTime(659,ctx.currentTime+0.1);gain.gain.setValueAtTime(0.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);}
    else if(type==="wrong"){osc.frequency.setValueAtTime(300,ctx.currentTime);osc.frequency.setValueAtTime(200,ctx.currentTime+0.15);gain.gain.setValueAtTime(0.2,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);}
    else if(type==="badge"){osc.frequency.setValueAtTime(523,ctx.currentTime);osc.frequency.setValueAtTime(659,ctx.currentTime+0.08);osc.frequency.setValueAtTime(784,ctx.currentTime+0.16);gain.gain.setValueAtTime(0.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);}
    osc.start();osc.stop(ctx.currentTime+0.5);
  }catch{}
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
  return JSON.parse((data.content?.[0]?.text||"").replace(/```json|```/g,"").trim());
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
const buildQuizPrompt=(subject,chapter,weak=[],count=5)=>{
  const seed=Math.floor(Math.random()*99999);
  const hint=weak.length?` Priorité sur ces chapitres fragiles: ${weak.join(", ")}.`:"";
  return`[Seed:${seed}] Génère exactement ${count} QCM variés sur "${subject}"${chapter?` chapitre "${chapter}"`:" (sujets les plus probables au brevet)"}.${hint}
Programme officiel 3ème. Varie les formulations, niveaux, angles d'approche.
JSON:{"questions":[{"question":"...","chapter":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."}]}`;
};
const buildMixPrompt=()=>{const seed=Math.floor(Math.random()*99999);return`[Seed:${seed}] Génère 5 QCM mélangés et variés pour le brevet. Matières: ${MIX_LIST}.
JSON:{"questions":[{"question":"...","matiere":"...","chapter":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."}]}`;};
const buildMixLongPrompt=()=>`Génère 1 question ouverte type brevet. Matières: ${MIX_LIST}.
JSON:{"question":"...","matiere":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;
const buildLongPrompt=(subject,chapter)=>{
  if(chapter==="Développement construit")return`Génère 1 développement construit Histoire-Géo type brevet 3ème (10 pts).\nJSON:{"question":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;
  if(subject==="Anglais")return`Génère 1 exercice anglais niveau 3ème${chapter?` sur "${chapter}"`:""}.\nJSON:{"question":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;
  return`Génère 1 question ouverte type brevet sur "${subject}"${chapter?` chapitre "${chapter}"`:" (sujets les plus probables)"} élève 3ème.\nJSON:{"question":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;
};
const buildExamPrompt=()=>`Génère sujet brevet complet. 1 question par matière parmi: ${MIX_LIST}. Mélange QCM et ouvertes.\nJSON:{"questions":[{"type":"qcm","matiere":"...","question":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."},{"type":"open","matiere":"...","question":"...","correction":"..."}]}`;
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
const buildPlanningPrompt=(dateStr,daysLeft)=>{
  const phase=daysLeft>60?"FONDATIONS":daysLeft>21?"CIBLAGE":daysLeft>7?"INTENSIF":"FINAL";
  return`Brevet: ${dateStr}. Jours restants: ${daysLeft}. Phase: ${phase}.
Planning jour par jour. Matières: Mathématiques, Français, Histoire-Géo, SVT, Physique-Chimie, EMC, Technologie. Weekends légers.
JSON:{"jours":[{"date":"DD/MM","dateISO":"YYYY-MM-DD","jour":"Lundi","sessions":[{"matiere":"...","chapitre":"...","duree":"20 min","exercice":"Quiz QCM"}]}]}`;
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
  .xp-fill{height:100%;background:linear-gradient(90deg,#3B82F6,#1D4ED8);border-radius:999px;transition:width .6s;}
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
  .home-tab.active{background:#2563EB;color:#fff;box-shadow:0 3px 8px rgba(37,99,235,.3);}
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
  .btn-cta{display:block;width:100%;padding:15px 20px;border-radius:14px;border:none;background:linear-gradient(180deg,#3B82F6,#1D4ED8);color:#fff;font-family:var(--font-d);font-size:15px;font-weight:800;cursor:pointer;transition:transform .16s cubic-bezier(.34,1.56,.64,1),box-shadow .16s;box-shadow:0 6px 0 #1E40AF,0 8px 24px rgba(29,78,216,.3);user-select:none;position:relative;overflow:hidden;}
  .btn-cta::before{content:'';position:absolute;top:0;left:0;right:0;height:50%;background:rgba(255,255,255,.15);border-radius:14px 14px 0 0;pointer-events:none;}
  .btn-cta:hover{transform:translateY(-2px);box-shadow:0 8px 0 #1E3A8A,0 12px 32px rgba(29,78,216,.4);}
  .btn-cta:active{transform:translateY(5px)!important;box-shadow:0 1px 0 #1E40AF!important;transition-duration:.08s!important;}
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
  .progress-fill{height:100%;background:linear-gradient(90deg,#3B82F6,#1D4ED8);border-radius:999px;transition:width .5s;position:relative;}
  .progress-fill::after{content:'';position:absolute;right:-5px;top:50%;transform:translateY(-50%);width:14px;height:14px;background:#fff;border-radius:50%;border:3px solid #3B82F6;}

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

  /* Exam */
  .exam-timer{text-align:center;font-family:var(--font-d);font-size:30px;font-weight:800;color:#0C2340;margin-bottom:14px;}
  .exam-timer.warn{color:#DC2626;animation:pulse .5s ease-in-out infinite;}

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

  .divider{height:1px;background:var(--border);margin:16px 0;}
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
function Dashboard({stats}){
  const lv=getLevel(stats.xp);
  const progress=lv.next?Math.min(100,((stats.xp-lv.min)/(lv.next-lv.min))*100):100;
  const earned=BADGES.filter(b=>stats.badges.includes(b.id));
  return(
    <div className="dashboard">
      <div className="dash-card"><div className="dash-label">🔥 Streak</div><div className="dash-big">{stats.streak}</div><div className="dash-sub">jour{stats.streak>1?"s":""} de suite</div></div>
      <div className="dash-card"><div className="dash-label">⚡ XP Total</div><div className="dash-big">{stats.xp}</div><div className="dash-sub" style={{color:lv.color,fontWeight:700}}>{lv.label}</div>{lv.next&&<div className="xp-bar"><div className="xp-fill" style={{width:`${progress}%`}}/></div>}</div>
      {earned.length>0&&<div className="dash-card dash-full"><div className="dash-label">🏅 Badges ({earned.length}/{BADGES.length})</div><div className="badges-wrap">{earned.map(b=><div key={b.id} className="badge-chip">{b.icon} {b.label}</div>)}</div></div>}
    </div>
  );
}

// ── Today Widget ──────────────────────────────────────────────────────────────
function TodayWidget({onStartSession}){
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
  useEffect(()=>{
    const prompt=isMix?buildMixPrompt():buildQuizPrompt(subject.label,chapter);
    withMinDelay(callClaude(prompt)).then(d=>{setQuestions(d.questions||[]);setState("quiz");}).catch(()=>setState("error"));
  },[]);
  useEffect(()=>{
    const onKey=e=>{if(e.key==="ArrowRight"&&selected!==null)next();};
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  },[selected,idx,score,questions]);
  const next=()=>{if(idx<questions.length-1){setIdx(i=>i+1);setSelected(null);}else onDone(score,questions.length);};
  if(state==="loading")return<Spinner text="Chargement des stories…"/>;
  if(state==="error")return<p className="err">Erreur. Réessaie !</p>;
  const q=questions[idx];
  return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="story-dots">{questions.map((_,i)=><div key={i} className={"story-dot"+(i<=idx?" active":"")}/>)}</div>
      <div className="story-card" onTouchStart={e=>touchX.current=e.touches[0].clientX} onTouchEnd={e=>{if(touchX.current-e.changedTouches[0].clientX>50&&selected!==null)next();}}>
        <div className="q-label">{isMix?`🎲 ${q.matiere||""}`:`${subject?.icon} ${subject?.label}`}</div>
        <div className="q-text" style={{flex:1,marginBottom:16}}>{q.question}</div>
        <div className="choices" style={{marginBottom:0}}>
          {q.choices.map(c=>{let cls="choice-btn";if(selected!==null){if(c.startsWith(q.answer))cls+=" correct";else if(c===selected)cls+=" wrong";}
          return<button key={c} className={cls} disabled={selected!==null} onClick={()=>{setSelected(c);if(c.startsWith(q.answer)){setScore(s=>s+1);if(soundEnabled.value)playSound("correct");}else if(soundEnabled.value)playSound("wrong");}}>{c}</button>;})}
        </div>
        {selected&&<div style={{marginTop:10}}><div className="explanation"><strong>💡</strong>{q.explanation}</div><button className="btn-cta" onClick={next}>{idx===questions.length-1?"Voir mon score →":"Suivant → (ou → clavier)"}</button></div>}
      </div>
      <p style={{textAlign:"center",fontSize:11,color:"var(--muted)",marginTop:8}}>📱 Swipe · ⌨️ touche → sur PC</p>
    </div>
  );
}

// ── Exam Mode ─────────────────────────────────────────────────────────────────
function ExamMode({onBack}){
  const[state,setState]=useState("loading");
  const[questions,setQuestions]=useState([]);
  const[idx,setIdx]=useState(0);
  const[answers,setAnswers]=useState({});
  const[timeLeft,setTimeLeft]=useState(30*60);
  useEffect(()=>{withMinDelay(callClaude(buildExamPrompt()),900).then(d=>{setQuestions(d.questions||[]);setState("exam");}).catch(()=>setState("error"));},[]);
  useEffect(()=>{if(state!=="exam")return;const t=setInterval(()=>setTimeLeft(v=>{if(v<=1){clearInterval(t);setState("done");return 0;}return v-1;}),1000);return()=>clearInterval(t);},[state]);
  if(state==="loading")return<Spinner text="Préparation de l'examen…"/>;
  if(state==="error")return<p className="err">Erreur.</p>;
  const mm=String(Math.floor(timeLeft/60)).padStart(2,"0"),ss=String(timeLeft%60).padStart(2,"0");
  const qcms=questions.filter(q=>q.type==="qcm");
  const score=qcms.filter(q=>answers[questions.indexOf(q)]?.startsWith(q.answer)).length;
  if(state==="done"||idx>=questions.length)return(<div className="score-wrap"><button className="btn-ghost" onClick={onBack}>← Retour</button><div style={{fontSize:48,marginBottom:12}}>🎓</div><div className="score-ring" style={{borderColor:"#3B82F6",color:"#3B82F6"}}>{score}/{qcms.length}</div><div className="score-message">Examen terminé !</div><div className="score-sub">QCM réussis · Questions ouvertes à auto-évaluer</div><button className="btn-cta" onClick={onBack}>Retour</button></div>);
  const q=questions[idx];
  return(<div><button className="btn-ghost" onClick={onBack}>← Arrêter</button><div className={`exam-timer${timeLeft<300?" warn":""}`}>⏱ {mm}:{ss}</div><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#5A85AA",fontWeight:600,marginBottom:10}}><span>Q{idx+1}/{questions.length}</span><span style={{background:SUBJECT_COLORS[q.matiere]||"#3B82F6",color:"#fff",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{q.matiere}</span></div><div className="question-card"><div className="q-label">{q.type==="qcm"?"QCM":"Question ouverte"}</div><div className="q-text">{q.question}</div></div>{q.type==="qcm"?(<div className="choices">{q.choices.map(c=>{const ans=answers[idx];let cls="choice-btn";if(ans){if(c.startsWith(q.answer))cls+=" correct";else if(c===ans)cls+=" wrong";}return<button key={c} className={cls} disabled={!!ans} onClick={()=>{setAnswers(a=>({...a,[idx]:c}));if(c.startsWith(q.answer)&&soundEnabled.value)playSound("correct");else if(soundEnabled.value)playSound("wrong");}}>{c}</button>;})} {answers[idx]&&<button className="btn-cta" style={{marginTop:10}} onClick={()=>setIdx(i=>i+1)}>Suivant →</button>}</div>):(<><textarea className="answer-area" placeholder="Rédige ta réponse…" value={answers[idx]||""} onChange={e=>setAnswers(a=>({...a,[idx]:e.target.value}))}/><button className="btn-cta" onClick={()=>{if(idx===questions.length-1)setState("done");else setIdx(i=>i+1);}}>{idx===questions.length-1?"Terminer":"Suivant →"}</button></>)}</div>);
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
  const weak=getWeak(getStats(),subject?.id||"");
  const qCount=count||5;

  const loadQuestions=useCallback(()=>{
    const prompt=isMix?buildMixPrompt():buildQuizPrompt(subject.label,chapter,weak,qCount);
    withMinDelay(callClaude(prompt)).then(d=>{setQuestions(d.questions||[]);setPhase("question");}).catch(()=>setPhase("error"));
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
        <div className="progress-info"><span>Q{idx+1}/{questions.length}</span><span>{score} ⭐</span></div>
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
function PlanningScreen({onBack,onStartSession}){
  const saved=loadPlanning();
  const[date,setDate]=useState(saved?.brevetDate||"");
  const[weeks,setWeeks]=useState(8);
  const[useWeeks,setUseWeeks]=useState(!saved?.brevetDate);
  const[state,setState]=useState(saved?"done":"form");
  const[planning,setPlanning]=useState(saved?.planning||null);
  const[restDays,setRestDays]=useState([]);

  const generate=async()=>{
    let dateStr,daysLeft;
    if(useWeeks){daysLeft=weeks*7;const d=new Date(Date.now()+daysLeft*86400000);dateStr=d.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});}
    else{const obj=new Date(date);daysLeft=Math.ceil((obj-new Date())/86400000);dateStr=obj.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});}
    setState("loading");
    try{const d=await withMinDelay(callClaude(buildPlanningPrompt(dateStr,daysLeft),null,3000),600);const j=d.jours||[];setPlanning(j);savePlanning(j,date||"");setState("done");}
    catch{setState("error");}
  };

  if(state==="loading")return<><button className="btn-ghost" onClick={onBack}>← Retour</button><Spinner text="Génération du planning…"/></>;
  if(state==="error")return<><button className="btn-ghost" onClick={onBack}>← Retour</button><p className="err">Erreur. Réessaie !</p></>;

  return(
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      {state==="form"&&(
        <div className="planning-header">
          <div style={{fontSize:44,marginBottom:10}}>📅</div>
          <div className="planning-title">Mon Planning Brevet</div>
          <div className="planning-desc">Entre la date du brevet OU le nombre de semaines restantes.</div>
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
          <button className="btn-cta" disabled={!useWeeks&&!date} onClick={generate}>Générer mon planning →</button>
        </div>
      )}
      {state==="done"&&planning&&(
        <>
          <div className="planning-header">
            <div className="planning-title">📅 Planning Brevet</div>
            <div className="planning-desc">Clique sur une session pour la faire directement !</div>
            <button className="btn-secondary" onClick={()=>setState("form")}>↩ Recréer</button>
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
                {isRest?<div style={{padding:"10px 14px",fontSize:12,color:"#5A85AA",fontStyle:"italic"}}>Jour de repos 😴</div>:(
                  <div className="planning-sessions-list">
                    {(jour.sessions||[]).map((s,j)=>(
                      <div key={j} className="planning-session" onClick={()=>onStartSession(s)}>
                        <div className="session-mat" style={{color:SUBJECT_COLORS[s.matiere]||"#2563EB"}}>{s.matiere}</div>
                        <div className="session-info"><div className="session-chap">{s.chapitre}</div><div className="session-exo">{s.exercice}</div></div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}><div className="session-dur">⏱ {s.duree}</div><span style={{fontSize:13}}>{s.exercice?.toLowerCase().includes("long")?"✍️":"⚡"}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
  const chapters=CHAPTERS[subject.id]||[];
  const canStart=mode&&(trainingType==="mixed"||(trainingType==="chapter"&&chapter));
  const ss=a=>a?{borderColor:subject.color,background:`${subject.color}15`,boxShadow:`0 9px 0 ${subject.color}30`,transform:"translateY(-4px)"}:{};

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
          <div key={t.id} className="training-card" style={ss(trainingType===t.id)} onClick={()=>{setTrainingType(t.id);setChapter(null);setMode(null);}}>
            <div className="training-icon">{t.icon}</div><div className="training-label">{t.label}</div><div className="training-desc">{t.desc}</div>
          </div>
        ))}
      </div>
      {trainingType==="chapter"&&(
        <><div className="section-title">Choisis un chapitre</div>
        <div className="chapter-chips">{chapters.map(c=><div key={c} className="chapter-chip" style={chapter===c?{borderColor:subject.color,background:`${subject.color}15`,color:subject.color,fontWeight:700,transform:"translateY(-2px)"}:{}} onClick={()=>setChapter(c)}>{c}</div>)}</div></>
      )}
      {trainingType&&(trainingType==="mixed"||chapter)&&(
        <>
          <div className="divider"/>
          <div className="section-title">Type de questions</div>
          <div className="mode-grid">
            {[
              {id:"quiz",icon:"⚡",label:"Quiz",desc:"QCM"},
              {id:"long",icon:"✍️",label:"Question Longue",desc:"1 question ouverte"},
              {id:"stories",icon:"📱",label:"Stories",desc:"Swipe !"},
            ].map(m=>(
              <div key={m.id} className="mode-card" style={mode===m.id?{borderColor:subject.color,background:`${subject.color}12`,boxShadow:`0 8px 0 ${subject.color}25`,transform:"translateY(-4px)"}:{}} onClick={()=>setMode(m.id)}>
                <div className="mode-icon">{m.icon}</div><div className="mode-label">{m.label}</div><div className="mode-desc">{m.desc}</div>
              </div>
            ))}
          </div>
          {mode==="quiz"&&(
            <>
              <div className="section-title">Nombre de questions</div>
              <div className="count-selector">
                {[3,5,10].map(n=><button key={n} className={"count-btn"+(qCount===n?" selected":"")} onClick={()=>setQCount(n)}>{n} questions</button>)}
              </div>
            </>
          )}
          <label className="sound-toggle">
            <input type="checkbox" defaultChecked onChange={e=>{soundEnabled.value=e.target.checked;}}/> Sons activés
          </label>
          <label className="sound-toggle" style={{marginBottom:16}}>
            <input type="checkbox" checked={showFiche} onChange={e=>setShowFiche(e.target.checked)}/> Afficher mini-fiche avant de commencer
          </label>
          <button className="btn-cta" disabled={!canStart} onClick={()=>canStart&&onStart(trainingType==="chapter"?chapter:null,mode,qCount,showFiche)}>C'est parti 🚀</button>
        </>
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
    if(mode==="exam")return<ExamMode onBack={goHome}/>;
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
                <button className={`home-tab${homeTab==="accueil"?" active":""}`} onClick={()=>setHomeTab("accueil")}>🏠 Accueil</button>
                <button className={`home-tab${homeTab==="matieres"?" active":""}`} onClick={()=>setHomeTab("matieres")}>📚 Matières</button>
                <button className={`home-tab${homeTab==="mix"?" active":""}`} onClick={()=>setHomeTab("mix")}>🎲 Mix</button>
                <button className={`home-tab${homeTab==="carte"?" active":""}`} onClick={()=>setHomeTab("carte")}>🗺️ Carte</button>
                <button className={`home-tab${homeTab==="plus"?" active":""}`} onClick={()=>setHomeTab("plus")}>✨ Plus</button>
              </div>

              {homeTab==="accueil"&&(
                <>
                  <WelcomeBack stats={stats} onStartUrgent={startUrgent}/>
                  <DailyGoal stats={stats}/>
                  <Dashboard stats={stats}/>
                  <TodayWidget onStartSession={startPlanningSession}/>
                  <div className="section-title">Lancer une session</div>
                  <button className="quick-btn" onClick={()=>{setIsMix(true);setSubject(null);setChapter(null);setMode("quiz");setQCount(2);setShowFiche(false);setScreen("play");}}>
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

              {homeTab==="matieres"&&(
                <>
                  <div className="section-title">Choisis une matière</div>
                  <div className="subject-grid">
                    {SUBJECTS.map(s=>{const xp=stats.subjectXP?.[s.id]||0;const lv=getLevel(xp);return(
                      <div key={s.id} className="subject-card"
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=s.color;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="";}}
                        onClick={()=>{setSubject(s);setScreen("setup");}}>
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
                      <div key={m.id} className="mode-card" style={mixMode===m.id?{borderColor:"#3B82F6",background:"#DBEAFE",boxShadow:"0 8px 0 #93C5FD",transform:"translateY(-4px)"}:{}} onClick={()=>setMixMode(m.id)}>
                        <div className="mode-icon">{m.icon}</div><div className="mode-label">{m.label}</div><div className="mode-desc">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                  {mixMode==="quiz"&&(
                    <><div className="section-title">Nombre de questions</div>
                    <div className="count-selector" style={{marginBottom:14}}>{[3,5,10].map(n=><button key={n} className={"count-btn"+(qCount===n?" selected":"")} onClick={()=>setQCount(n)}>{n} Q</button>)}</div></>
                  )}
                  <button className="btn-cta" disabled={!mixMode} onClick={()=>{
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
                <PlanningScreen onBack={()=>setHomeTab("plus")} onStartSession={startPlanningSession}/>
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
