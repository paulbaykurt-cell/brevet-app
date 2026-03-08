import { useState, useEffect, useRef } from "react";

const SUBJECTS = [
  { id: "maths",    label: "Mathématiques",   icon: "📐", color: "#60A5FA", glow: "rgba(96,165,250,0.35)"  },
  { id: "francais", label: "Français",         icon: "📚", color: "#A78BFA", glow: "rgba(167,139,250,0.35)" },
  { id: "histoire", label: "Histoire-Géo",     icon: "🌍", color: "#34D399", glow: "rgba(52,211,153,0.35)"  },
  { id: "svt",      label: "SVT",              icon: "🔬", color: "#FBBF24", glow: "rgba(251,191,36,0.35)"  },
  { id: "physique", label: "Physique-Chimie",  icon: "⚗️",  color: "#F87171", glow: "rgba(248,113,113,0.35)" },
  { id: "anglais",  label: "Anglais",          icon: "🗣️",  color: "#F472B6", glow: "rgba(244,114,182,0.35)" },
  { id: "emc",      label: "EMC",              icon: "⚖️",  color: "#22D3EE", glow: "rgba(34,211,238,0.35)"  },
  { id: "techno",   label: "Technologie",      icon: "🖥️",  color: "#FB923C", glow: "rgba(251,146,60,0.35)"  },
];

const CHAPTERS = {
  maths:    ["Géométrie plane","Calcul littéral","Statistiques & Probabilités","Fonctions","Calcul numérique","Pythagore & Thalès","Trigonométrie","Volumes & Aires"],
  francais: ["Grammaire","Orthographe & Conjugaison","Lecture & Compréhension","Expression écrite","Figures de style","Textes argumentatifs"],
  histoire: ["1ère Guerre Mondiale","2ème Guerre Mondiale","Guerre Froide","Décolonisation","La Ve République","Mondialisation","Géographie urbaine"],
  svt:      ["Génétique & Hérédité","Évolution des espèces","Corps humain & Santé","Écosystèmes","Géologie","Reproduction"],
  physique: ["Mécanique","Électricité","Optique","Chimie organique","Atomes & Molécules","Énergie & Puissance"],
  anglais:  ["Grammaire","Vocabulaire thématique","Compréhension écrite","Expression écrite","Temps & Conjugaison"],
  emc:      ["Démocratie & Citoyenneté","Droits & Libertés","Laïcité","Institutions françaises","Engagement citoyen"],
  techno:   ["Programmation & Algorithmes","Systèmes techniques","Réseaux & Internet","Développement durable","Projet technologique"],
};

const GEOMETRY_CHAPTERS = ["Géométrie plane","Pythagore & Thalès","Trigonométrie","Volumes & Aires"];

const MIX_SUBJECTS_LIST = SUBJECTS.map(s => s.label).join(", ");

async function callClaude(prompt, system) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: system || "Tu es un professeur bienveillant qui aide des élèves de 3ème à réviser le brevet des collèges (DNB) en France. Réponds UNIQUEMENT en JSON valide, sans balises markdown ni backticks.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || "Erreur API");
  const text = data.content?.[0]?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function callClaudeText(prompt, system) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: system || "Tu génères uniquement du SVG valide, sans explication ni markdown.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || "Erreur API");
  return data.content?.[0]?.text || "";
}

const buildQuizPrompt = (subject, chapter) =>
  `Génère exactement 5 questions de quiz à choix multiples sur "${subject}"${chapter ? ` chapitre "${chapter}"` : " (les sujets les plus susceptibles de tomber au brevet, tous chapitres)"}.
Niveau 3ème, programme officiel français.
Réponds UNIQUEMENT en JSON:
{"questions":[{"question":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."}]}`;

const buildMixQuizPrompt = () =>
  `Génère exactement 5 questions de quiz à choix multiples pour réviser le brevet des collèges. Mélange ces matières: ${MIX_SUBJECTS_LIST}. Mets 1 question par matière différente environ. Programme officiel 3ème.
Réponds UNIQUEMENT en JSON:
{"questions":[{"question":"...","matiere":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."}]}`;

const buildMixLongPrompt = () =>
  `Génère 1 question ouverte de type brevet. Choisis aléatoirement parmi: ${MIX_SUBJECTS_LIST}. Programme officiel 3ème.
Réponds UNIQUEMENT en JSON:
{"question":"...","matiere":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;

const buildLongPrompt = (subject, chapter) =>
  `Génère 1 question ouverte de type brevet sur "${subject}"${chapter ? ` chapitre "${chapter}"` : " (parmi les sujets les plus probables au brevet)"} pour un élève de 3ème.
Réponds UNIQUEMENT en JSON:
{"question":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;

const buildSvgPrompt = (question) =>
  `Crée un SVG simple (viewBox="0 0 220 180") illustrant la figure géométrique pour cette question de maths: "${question}".
Règles: fond transparent, utilise stroke="#93C5FD" fill="none" strokeWidth="2" pour les traits, texte en fill="#E0E7FF" fontSize="12", labels courts.
Réponds UNIQUEMENT avec le code SVG complet (commence par <svg et finit par </svg>), sans markdown.`;

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --font-d: -apple-system, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
    --font-b: -apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
    --bg: #0E0C1E; --surface: rgba(255,255,255,0.06); --surface-hover: rgba(255,255,255,0.1);
    --border: rgba(255,255,255,0.11); --text: #F0EEFF; --muted: rgba(210,200,255,0.45);
  }
  body { font-family: var(--font-b); background: var(--bg); min-height: 100vh; color: var(--text); }

  .app { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 28px 16px 100px; position: relative; overflow: hidden; }

  .bg-grid { position: fixed; inset: 0; z-index: 0;
    background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%);
    -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%);
  }
  .orb { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; animation: drift 20s ease-in-out infinite alternate; }
  .orb-1 { width: 600px; height: 600px; background: radial-gradient(circle, #7C3AED, transparent 70%); opacity: 0.2; top: -200px; left: -150px; animation-duration: 22s; }
  .orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, #F59E0B, transparent 70%); opacity: 0.16; bottom: -150px; right: -100px; animation-duration: 26s; animation-delay: -8s; }
  .orb-3 { width: 400px; height: 400px; background: radial-gradient(circle, #06B6D4, transparent 70%); opacity: 0.12; top: 40%; left: 55%; transform: translate(-50%,-50%); animation-duration: 18s; animation-delay: -4s; }
  .orb-4 { width: 300px; height: 300px; background: radial-gradient(circle, #EC4899, transparent 70%); opacity: 0.1; top: 20%; right: 5%; animation-duration: 24s; animation-delay: -14s; }
  @keyframes drift { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(25px,-35px) scale(1.05)} 100%{transform:translate(-15px,20px) scale(0.97)} }

  .container { position: relative; z-index: 1; width: 100%; max-width: 680px; }

  /* Header */
  .header { text-align: center; margin-bottom: 32px; }
  .badge { display: inline-flex; align-items: center; gap: 7px; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.4); color: #FBBF24; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; padding: 6px 16px; border-radius: 999px; margin-bottom: 18px; box-shadow: 0 0 20px rgba(251,191,36,0.12); }
  .badge-dot { width: 6px; height: 6px; background: #FBBF24; border-radius: 50%; box-shadow: 0 0 6px #FBBF24; animation: pulse-dot 2s ease-in-out infinite; }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
  .header h1 { font-family: var(--font-d); font-size: clamp(30px, 6.5vw, 52px); font-weight: 800; line-height: 1.0; letter-spacing: -1.5px; margin-bottom: 10px; }
  .h1-plain { color: #E8E0FF; }
  .h1-accent { background: linear-gradient(135deg, #FBBF24 0%, #F97316 60%, #FB923C 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 0 20px rgba(251,191,36,0.5)); }
  .header p { color: var(--muted); font-size: 14px; }

  /* Home Tabs */
  .home-tabs { display: flex; gap: 8px; margin-bottom: 24px; background: rgba(255,255,255,0.05); border-radius: 14px; padding: 5px; border: 1px solid rgba(255,255,255,0.09); }
  .home-tab { flex: 1; padding: 10px; border-radius: 10px; border: none; background: transparent; color: rgba(200,190,255,0.5); font-family: var(--font-b); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .home-tab.active { background: rgba(255,255,255,0.1); color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }

  .section-title { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(200,190,255,0.38); margin-bottom: 14px; font-weight: 600; }

  /* Subject grid */
  .subject-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
  @media (max-width:520px) { .subject-grid { grid-template-columns: repeat(2,1fr); } }
  .subject-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 18px; padding: 20px 12px; cursor: pointer; text-align: center; transition: transform .18s cubic-bezier(.34,1.56,.64,1), background .15s, border-color .15s, box-shadow .18s; box-shadow: 0 5px 0 rgba(0,0,0,0.5), 0 10px 28px rgba(0,0,0,0.3); user-select: none; position: relative; overflow: hidden; }
  .subject-card::before { content:''; position:absolute; inset:0; border-radius:17px; background: linear-gradient(135deg,rgba(255,255,255,0.07) 0%,transparent 60%); pointer-events:none; }
  .subject-card:hover { background: var(--surface-hover); transform: translateY(-5px) scale(1.02); }
  .subject-card:active { transform: translateY(3px) scale(0.97)!important; box-shadow: 0 1px 0 rgba(0,0,0,0.5)!important; transition-duration:.07s!important; }
  .subject-icon { font-size: 30px; margin-bottom: 9px; line-height:1; }
  .subject-label { font-size: 12px; font-weight: 600; color: rgba(230,220,255,0.85); line-height:1.3; }

  /* Mix tab */
  .mix-card { background: linear-gradient(135deg, rgba(251,191,36,0.1), rgba(249,115,22,0.08)); border: 1.5px solid rgba(251,191,36,0.3); border-radius: 20px; padding: 28px 24px; text-align: center; margin-bottom: 20px; box-shadow: 0 0 40px rgba(251,191,36,0.08); }
  .mix-title { font-family: var(--font-d); font-size: 22px; font-weight: 800; color: #FDE68A; margin-bottom: 8px; }
  .mix-desc { font-size: 14px; color: var(--muted); margin-bottom: 20px; line-height: 1.6; }

  /* Setup pill */
  .setup-pill { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 999px; border: 2px solid; font-family: var(--font-d); font-size: 15px; font-weight: 800; margin-bottom: 28px; }

  /* Training cards */
  .training-grid { display: grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }
  @media (max-width:480px) { .training-grid { grid-template-columns:1fr; } }
  .training-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 20px; padding: 24px 18px; cursor: pointer; text-align: center; transition: transform .18s cubic-bezier(.34,1.56,.64,1), background .15s, border-color .15s, box-shadow .18s; box-shadow: 0 5px 0 rgba(0,0,0,0.5), 0 12px 32px rgba(0,0,0,0.3); user-select: none; position: relative; overflow: hidden; }
  .training-card::before { content:''; position:absolute; inset:0; border-radius:19px; background: linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 55%); pointer-events:none; }
  .training-card:hover { background: var(--surface-hover); transform: translateY(-4px); box-shadow: 0 9px 0 rgba(0,0,0,0.45), 0 20px 48px rgba(0,0,0,0.35); }
  .training-card:active { transform: translateY(4px) scale(0.98)!important; box-shadow: 0 1px 0 rgba(0,0,0,0.5)!important; transition-duration:.07s!important; }
  .training-icon { font-size: 36px; margin-bottom: 10px; }
  .training-label { font-family: var(--font-d); font-size: 14px; font-weight: 800; margin-bottom: 6px; line-height:1.3; color:#EDE9FF; }
  .training-desc { font-size: 12px; color: var(--muted); line-height:1.55; }

  /* Chapter chips */
  .chapter-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
  .chapter-chip { padding: 8px 15px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: rgba(210,200,255,0.7); font-size: 13px; font-weight: 500; cursor: pointer; transition: transform .14s cubic-bezier(.34,1.56,.64,1), background .12s, border-color .12s, box-shadow .14s, color .12s; box-shadow: 0 3px 0 rgba(0,0,0,0.45); user-select: none; }
  .chapter-chip:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.28); transform: translateY(-2px); box-shadow: 0 5px 0 rgba(0,0,0,0.4); color:#fff; }
  .chapter-chip:active { transform: translateY(2px) scale(0.97)!important; box-shadow: 0 1px 0 rgba(0,0,0,0.45)!important; transition-duration:.06s!important; }

  /* Mode cards */
  .mode-grid { display: grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:22px; }
  @media (max-width:480px) { .mode-grid { grid-template-columns:1fr; } }
  .mode-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 18px; padding: 20px 16px; cursor: pointer; transition: transform .18s cubic-bezier(.34,1.56,.64,1), background .15s, border-color .15s, box-shadow .18s; box-shadow: 0 5px 0 rgba(0,0,0,0.5), 0 12px 28px rgba(0,0,0,0.3); user-select: none; position: relative; overflow: hidden; }
  .mode-card::before { content:''; position:absolute; inset:0; border-radius:17px; background: linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 55%); pointer-events:none; }
  .mode-card:hover { background: var(--surface-hover); transform: translateY(-4px); box-shadow: 0 9px 0 rgba(0,0,0,0.45), 0 20px 40px rgba(0,0,0,0.35); }
  .mode-card:active { transform: translateY(4px) scale(0.98)!important; box-shadow: 0 1px 0 rgba(0,0,0,0.5)!important; transition-duration:.07s!important; }
  .mode-icon { font-size: 28px; margin-bottom: 8px; }
  .mode-label { font-family: var(--font-d); font-size: 15px; font-weight: 800; margin-bottom: 4px; color:#EDE9FF; }
  .mode-desc { font-size: 12px; color: var(--muted); line-height:1.5; }

  /* CTA Button */
  .btn-cta { display: block; width: 100%; padding: 18px 24px; border-radius: 16px; border: none; background: linear-gradient(135deg, #FBBF24 0%, #F97316 100%); color: #1a0a00; font-family: var(--font-d); font-size: 16px; font-weight: 800; cursor: pointer; letter-spacing: 0.3px; transition: transform .16s cubic-bezier(.34,1.56,.64,1), box-shadow .16s; box-shadow: 0 6px 0 #92400E, 0 10px 32px rgba(251,191,36,0.3); user-select: none; position: relative; overflow: hidden; }
  .btn-cta::before { content:''; position:absolute; top:0; left:0; right:0; height:50%; background: rgba(255,255,255,0.18); border-radius:16px 16px 0 0; pointer-events:none; }
  .btn-cta:hover { transform: translateY(-3px) scale(1.01); box-shadow: 0 9px 0 #78350F, 0 16px 48px rgba(251,191,36,0.45); }
  .btn-cta:active { transform: translateY(5px) scale(0.99)!important; box-shadow: 0 1px 0 #92400E, 0 4px 16px rgba(251,191,36,0.2)!important; transition-duration:.08s!important; }
  .btn-cta:disabled { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); box-shadow: 0 4px 0 rgba(0,0,0,0.4)!important; cursor: not-allowed; transform: none!important; }
  .btn-cta:disabled::before { display:none; }

  /* Ghost button */
  .btn-ghost { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.12); color: rgba(200,190,255,0.6); padding: 9px 16px; border-radius: 10px; font-family: var(--font-b); font-size: 13px; font-weight: 500; cursor: pointer; margin-bottom: 24px; transition: transform .14s cubic-bezier(.34,1.56,.64,1), background .12s, box-shadow .14s, color .12s; box-shadow: 0 3px 0 rgba(0,0,0,0.45); user-select: none; }
  .btn-ghost:hover { background: rgba(255,255,255,0.12); color: rgba(230,220,255,0.95); transform: translateY(-2px); box-shadow: 0 5px 0 rgba(0,0,0,0.4); }
  .btn-ghost:active { transform: translateY(2px)!important; box-shadow: 0 1px 0 rgba(0,0,0,0.45)!important; transition-duration:.06s!important; }

  /* Spinner */
  .loading { text-align: center; padding: 72px 0; }
  .spinner-ring { width: 52px; height: 52px; margin: 0 auto 20px; position: relative; }
  .spinner-ring::before, .spinner-ring::after { content:''; position:absolute; inset:0; border-radius:50%; }
  .spinner-ring::before { border: 3px solid rgba(255,255,255,0.06); }
  .spinner-ring::after { border: 3px solid transparent; border-top-color: #FBBF24; border-right-color: #F97316; animation: spin .75s linear infinite; filter: drop-shadow(0 0 6px rgba(251,191,36,0.6)); }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading p { color: var(--muted); font-size: 14px; }

  /* Progress */
  .progress-wrap { margin-bottom: 22px; }
  .progress-info { display: flex; justify-content: space-between; font-size: 12px; color: rgba(200,190,255,0.5); margin-bottom: 9px; font-weight: 600; }
  .progress-bar { height: 7px; background: rgba(255,255,255,0.07); border-radius: 999px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.3); }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #FBBF24, #F97316); border-radius: 999px; transition: width .5s cubic-bezier(.4,0,.2,1); box-shadow: 0 0 10px rgba(251,191,36,0.5); position: relative; }
  .progress-fill::after { content:''; position:absolute; right:0; top:50%; transform:translateY(-50%); width:10px; height:10px; background:#fff; border-radius:50%; box-shadow: 0 0 8px rgba(251,191,36,0.9), 0 0 20px rgba(251,191,36,0.4); }

  /* Question card */
  .question-card { background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%); border: 1px solid rgba(255,255,255,0.12); border-radius: 22px; padding: 28px; margin-bottom: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07); position: relative; overflow: hidden; }
  .question-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); }
  .q-label { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: rgba(200,190,255,0.4); margin-bottom: 12px; font-weight: 600; }
  .q-text { font-family: var(--font-d); font-size: 18px; font-weight: 700; line-height: 1.45; color: #F0EEFF; }
  .q-context { font-size: 13px; color: rgba(200,190,255,0.65); margin-top: 14px; line-height: 1.65; padding: 14px 16px; background: rgba(251,191,36,0.07); border-radius: 12px; border-left: 3px solid #FBBF24; }

  /* Geo figure */
  .geo-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 7px 14px; border-radius: 9px; border: 1.5px solid rgba(96,165,250,0.3); background: rgba(96,165,250,0.08); color: #93C5FD; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; user-select: none; box-shadow: 0 2px 0 rgba(0,0,0,0.3); }
  .geo-btn:hover { background: rgba(96,165,250,0.15); border-color: rgba(96,165,250,0.5); transform: translateY(-1px); }
  .geo-btn:active { transform: translateY(1px)!important; }
  .geo-figure { margin-top: 14px; background: rgba(96,165,250,0.06); border: 1px solid rgba(96,165,250,0.2); border-radius: 14px; padding: 16px; display: flex; align-items: center; justify-content: center; min-height: 120px; }
  .geo-figure svg { max-width: 100%; }

  /* Choices */
  .choices { display: grid; gap: 10px; margin-bottom: 16px; }
  .choice-btn { width: 100%; padding: 15px 18px; border-radius: 14px; border: 1.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #EDE9FF; font-family: var(--font-b); font-size: 15px; text-align: left; cursor: pointer; transition: transform .14s cubic-bezier(.34,1.56,.64,1), background .12s, border-color .12s, box-shadow .14s; box-shadow: 0 4px 0 rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.2); user-select: none; position: relative; overflow: hidden; }
  .choice-btn::before { content:''; position:absolute; inset:0; border-radius:13px; background: linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 60%); pointer-events:none; }
  .choice-btn:hover:not(:disabled) { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.26); transform: translateY(-3px); box-shadow: 0 7px 0 rgba(0,0,0,0.4), 0 12px 28px rgba(0,0,0,0.25); color:#fff; }
  .choice-btn:active:not(:disabled) { transform: translateY(3px) scale(0.99)!important; box-shadow: 0 1px 0 rgba(0,0,0,0.45)!important; transition-duration:.07s!important; }
  .choice-btn.correct { background: rgba(52,211,153,0.16); border-color: #34D399; color: #6EE7B7; box-shadow: 0 4px 0 rgba(16,185,129,0.4), 0 0 24px rgba(52,211,153,0.2); animation: popCorrect .4s cubic-bezier(.34,1.56,.64,1) forwards; }
  .choice-btn.wrong { background: rgba(248,113,113,0.13); border-color: #F87171; color: #FCA5A5; box-shadow: 0 4px 0 rgba(239,68,68,0.25); animation: shakeWrong .45s ease forwards; }
  @keyframes popCorrect { 0%{transform:scale(1)} 45%{transform:scale(1.04) translateY(-3px)} 100%{transform:scale(1)} }
  @keyframes shakeWrong { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(2px)} }

  .explanation { background: linear-gradient(135deg, rgba(52,211,153,0.1) 0%, rgba(52,211,153,0.04) 100%); border: 1px solid rgba(52,211,153,0.28); border-radius: 14px; padding: 16px; margin-bottom: 16px; font-size: 14px; line-height: 1.65; color: rgba(200,255,230,0.85); box-shadow: 0 0 24px rgba(52,211,153,0.07); }
  .explanation strong { color: #34D399; display: block; margin-bottom: 7px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }

  .correction-card { background: linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0.04) 100%); border: 1px solid rgba(167,139,250,0.28); border-radius: 18px; padding: 22px; margin-bottom: 14px; box-shadow: 0 0 32px rgba(139,92,246,0.07); }
  .correction-card h3 { font-family: var(--font-d); font-size: 14px; color: #C4B5FD; margin-bottom: 12px; font-weight: 700; }
  .correction-text { font-size: 14px; line-height: 1.75; color: rgba(220,210,255,0.82); }
  .points-cles { margin-top: 16px; display: flex; flex-direction: column; gap: 9px; }
  .point { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: rgba(200,190,255,0.7); }
  .point::before { content:'✓'; color: #34D399; font-weight: 700; flex-shrink: 0; margin-top: 1px; text-shadow: 0 0 8px rgba(52,211,153,0.6); }

  .answer-area { width: 100%; min-height: 140px; background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 16px; color: #EDE9FF; font-family: var(--font-b); font-size: 15px; line-height: 1.6; resize: vertical; outline: none; margin-bottom: 12px; transition: border-color .2s, box-shadow .2s; }
  .answer-area:focus { border-color: #A78BFA; box-shadow: 0 0 0 3px rgba(167,139,250,0.15); }
  .answer-area::placeholder { color: rgba(200,190,255,0.28); }

  .score-wrap { text-align: center; padding: 10px 0 28px; }
  .score-ring { width: 130px; height: 130px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-family: var(--font-d); font-size: 38px; font-weight: 800; border: 4px solid; }
  .score-message { font-family: var(--font-d); font-size: 24px; font-weight: 800; margin-bottom: 6px; }
  .score-sub { font-size: 13px; color: var(--muted); margin-bottom: 28px; }

  .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); margin: 24px 0; }
  .hint { text-align: center; font-size: 12px; color: rgba(200,190,255,0.28); margin-top: 8px; }
  .err { color: #F87171; text-align: center; padding: 40px 0; font-family: var(--font-b); }

  /* ── Floating tools ── */
  .float-tools { position: fixed; bottom: 24px; right: 14px; display: flex; flex-direction: column; gap: 12px; z-index: 100; }
  .float-btn { width: 64px; height: 64px; border-radius: 20px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 24px; transition: transform .16s cubic-bezier(.34,1.56,.64,1), box-shadow .16s; user-select: none; }
  .float-btn .fb-label { font-size: 10px; font-weight: 700; letter-spacing: 0.3px; line-height: 1; }
  .float-btn:hover { transform: scale(1.1) translateY(-3px); }
  .float-btn:active { transform: scale(0.92)!important; transition-duration:.07s!important; }
  .float-btn-calc { background: linear-gradient(135deg, #3B82F6, #1D4ED8); box-shadow: 0 5px 0 #1e3a8a, 0 8px 24px rgba(59,130,246,0.5); color: white; }
  .float-btn-calc.active { box-shadow: 0 2px 0 #1e3a8a, 0 0 32px rgba(59,130,246,0.6) !important; transform: scale(0.96) !important; }
  .float-btn-notes { background: linear-gradient(135deg, #8B5CF6, #6D28D9); box-shadow: 0 5px 0 #4c1d95, 0 8px 24px rgba(139,92,246,0.5); color: white; }
  .float-btn-notes.active { box-shadow: 0 2px 0 #4c1d95, 0 0 32px rgba(139,92,246,0.6) !important; transform: scale(0.96) !important; }

  /* ── Side panels (non-blocking) ── */
  .side-panels { position: fixed; bottom: 110px; right: 14px; display: flex; flex-direction: column; gap: 12px; z-index: 99; }
  .panel { background: #1A1630; border: 1px solid rgba(255,255,255,0.14); border-radius: 20px; width: 300px; max-width: calc(100vw - 28px); padding: 16px; box-shadow: -4px 4px 32px rgba(0,0,0,0.6); animation: slideInRight .25s cubic-bezier(.34,1.56,.64,1); }
  @keyframes slideInRight { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
  .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .panel-title { font-family: var(--font-d); font-size: 14px; font-weight: 800; color: #EDE9FF; }
  .panel-close { background: rgba(255,255,255,0.1); border: none; color: rgba(255,255,255,0.6); width: 26px; height: 26px; border-radius: 50%; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: all .15s; }
  .panel-close:hover { background: rgba(255,255,255,0.2); color: #fff; }

  /* Calculator */
  .calc-display { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 16px; text-align: right; font-family: var(--font-d); font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 12px; min-height: 56px; word-break: break-all; }
  .calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .calc-btn { padding: 14px 8px; border-radius: 12px; border: none; font-family: var(--font-d); font-size: 16px; font-weight: 700; cursor: pointer; transition: transform .12s cubic-bezier(.34,1.56,.64,1), box-shadow .12s; user-select: none; }
  .calc-btn:active { transform: scale(0.92) translateY(2px)!important; transition-duration:.07s!important; }
  .calc-num { background: rgba(255,255,255,0.1); color: #EDE9FF; box-shadow: 0 3px 0 rgba(0,0,0,0.4); }
  .calc-num:hover { background: rgba(255,255,255,0.16); transform: translateY(-2px); box-shadow: 0 5px 0 rgba(0,0,0,0.4); }
  .calc-op { background: rgba(251,191,36,0.2); color: #FBBF24; box-shadow: 0 3px 0 rgba(0,0,0,0.4); }
  .calc-op:hover { background: rgba(251,191,36,0.3); transform: translateY(-2px); }
  .calc-eq { background: linear-gradient(135deg,#FBBF24,#F97316); color: #1a0a00; box-shadow: 0 3px 0 #92400E; }
  .calc-eq:hover { transform: translateY(-2px); box-shadow: 0 5px 0 #78350F; }
  .calc-clear { background: rgba(248,113,113,0.2); color: #F87171; box-shadow: 0 3px 0 rgba(0,0,0,0.4); }
  .calc-clear:hover { background: rgba(248,113,113,0.3); transform: translateY(-2px); }

  /* Notes */
  .notes-area { width: 100%; min-height: 200px; background: rgba(0,0,0,0.25); border: 1.5px solid rgba(139,92,246,0.25); border-radius: 12px; padding: 14px; color: #EDE9FF; font-family: var(--font-b); font-size: 14px; line-height: 1.7; resize: none; outline: none; transition: border-color .2s; }
  .notes-area:focus { border-color: #A78BFA; box-shadow: 0 0 0 3px rgba(167,139,250,0.1); }
  .notes-area::placeholder { color: rgba(200,190,255,0.3); }
`;

// ── Calculator ────────────────────────────────────────────────────────────────
function Calculator({ onClose }) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [reset, setReset] = useState(false);

  const press = (val) => {
    if (val === "C") { setDisplay("0"); setPrev(null); setOp(null); setReset(false); return; }
    if (val === "±") { setDisplay(d => String(-parseFloat(d))); return; }
    if (val === "%") { setDisplay(d => String(parseFloat(d) / 100)); return; }
    if (["+","-","×","÷"].includes(val)) {
      setPrev(parseFloat(display)); setOp(val); setReset(true); return;
    }
    if (val === "=") {
      if (op && prev !== null) {
        const cur = parseFloat(display);
        let res;
        if (op === "+") res = prev + cur;
        else if (op === "-") res = prev - cur;
        else if (op === "×") res = prev * cur;
        else if (op === "÷") res = cur !== 0 ? prev / cur : "Erreur";
        setDisplay(String(parseFloat(res.toFixed(10))));
        setPrev(null); setOp(null); setReset(true);
      }
      return;
    }
    if (val === ".") {
      if (reset) { setDisplay("0."); setReset(false); return; }
      if (!display.includes(".")) setDisplay(d => d + ".");
      return;
    }
    if (reset) { setDisplay(String(val)); setReset(false); }
    else setDisplay(d => d === "0" ? String(val) : d + val);
  };

  const btns = [
    ["C","±","%","÷"],
    [7,8,9,"×"],
    [4,5,6,"-"],
    [1,2,3,"+"],
    [0,".","="],
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">🧮 Calculatrice</span>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>
      <div className="calc-display">{display}</div>
      <div className="calc-grid">
        {btns.flat().map((b, i) => {
          let cls = "calc-btn ";
          if (b === "C") cls += "calc-clear";
          else if (b === "=") cls += "calc-eq";
          else if (["+","-","×","÷","%","±"].includes(String(b))) cls += "calc-op";
          else cls += "calc-num";
          const isZero = b === 0;
          return (
            <button key={i} className={cls}
              style={isZero ? { gridColumn: "span 2" } : {}}
              onClick={() => press(b)}>
              {b}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────────
function Notes({ onClose }) {
  const [text, setText] = useState(() => {
    try { return sessionStorage.getItem("brevet_notes") || ""; } catch { return ""; }
  });
  const save = (v) => {
    setText(v);
    try { sessionStorage.setItem("brevet_notes", v); } catch {}
  };
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">📝 Mes notes</span>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>
      <textarea className="notes-area" placeholder="Écris tes notes, formules, astuces..." value={text} onChange={e => save(e.target.value)} rows={6} />
    </div>
  );
}

// ── FloatTools ────────────────────────────────────────────────────────────────
function FloatTools({ showCalc }) {
  const [calc, setCalc] = useState(false);
  const [notes, setNotes] = useState(false);
  return (
    <>
      <div className="float-tools">
        {showCalc && (
          <button className={"float-btn float-btn-calc" + (calc ? " active" : "")} onClick={() => setCalc(v => !v)}>
            🧮<span className="fb-label">Calc</span>
          </button>
        )}
        <button className={"float-btn float-btn-notes" + (notes ? " active" : "")} onClick={() => setNotes(v => !v)}>
          📝<span className="fb-label">Notes</span>
        </button>
      </div>
      <div className="side-panels">
        {calc && showCalc && <Calculator onClose={() => setCalc(false)} />}
        {notes && <Notes onClose={() => setNotes(false)} />}
      </div>
    </>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ text = "Génération en cours…" }) {
  return <div className="loading"><div className="spinner-ring" /><p>{text}</p></div>;
}

// ── GeoFigure ─────────────────────────────────────────────────────────────────
function GeoFigure({ question }) {
  const [state, setState] = useState("idle");
  const [svg, setSvg] = useState(null);

  const generate = async () => {
    setState("loading");
    try {
      const raw = await callClaudeText(buildSvgPrompt(question));
      const match = raw.match(/<svg[\s\S]*<\/svg>/i);
      setSvg(match ? match[0] : null);
      setState("done");
    } catch { setState("error"); }
  };

  if (state === "idle") return (
    <button className="geo-btn" onClick={generate}>📐 Voir la figure</button>
  );
  if (state === "loading") return <p style={{fontSize:12,color:"#93C5FD",marginTop:10}}>Génération de la figure…</p>;
  if (state === "error") return <p style={{fontSize:12,color:"#F87171",marginTop:10}}>Impossible de générer la figure</p>;
  if (!svg) return null;
  return <div className="geo-figure" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// ── QuizMode ──────────────────────────────────────────────────────────────────
function QuizMode({ subject, chapter, isMix, onBack }) {
  const [state, setState] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const isGeo = subject?.id === "maths" && GEOMETRY_CHAPTERS.includes(chapter);

  useEffect(() => {
    const prompt = isMix ? buildMixQuizPrompt() : buildQuizPrompt(subject.label, chapter);
    callClaude(prompt)
      .then(data => { setQuestions(data.questions || []); setState("question"); })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <><Spinner text="Génération des questions…" /><FloatTools showCalc={subject?.id === "maths"} /></>;
  if (state === "error") return <p className="err">Une erreur est survenue. Réessaie !</p>;

  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const scoreColor = score >= 4 ? "#34D399" : score >= 2 ? "#FBBF24" : "#F87171";
  const scoreGlow = score >= 4 ? "rgba(52,211,153,0.4)" : score >= 2 ? "rgba(251,191,36,0.4)" : "rgba(248,113,113,0.4)";
  const scoreMsg = score >= 4 ? "🎉 Excellent !" : score >= 2 ? "👍 Pas mal !" : "💪 Continue à réviser !";

  if (state === "done") return (
    <div className="score-wrap">
      <button className="btn-ghost" onClick={onBack}>← Retour à l'accueil</button>
      <div className="score-ring" style={{ borderColor: scoreColor, color: scoreColor, boxShadow: `0 0 40px ${scoreGlow}` }}>
        {score}/{questions.length}
      </div>
      <div className="score-message" style={{ color: scoreColor }}>{scoreMsg}</div>
      <div className="score-sub">{isMix ? "🎲 Mix Brevet" : `${subject.icon} ${subject.label}${chapter ? ` · ${chapter}` : ""}`}</div>
      <button className="btn-cta" onClick={onBack}>Recommencer ↩</button>
    </div>
  );

  return (
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="progress-wrap">
        <div className="progress-info">
          <span>Question {idx + 1} / {questions.length}</span>
          <span>{score} ⭐</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="question-card">
        <div className="q-label">{isMix ? `🎲 Mix · ${q.matiere || ""}` : `${subject.icon} ${chapter || subject.label}`}</div>
        <div className="q-text">{q.question}</div>
        {isGeo && <GeoFigure question={q.question} />}
      </div>
      <div className="choices">
        {q.choices.map((c) => {
          let cls = "choice-btn";
          if (selected !== null) {
            if (c.startsWith(q.answer)) cls += " correct";
            else if (c === selected) cls += " wrong";
          }
          return (
            <button key={c} className={cls}
              onClick={() => { if (selected !== null) return; setSelected(c); if (c.startsWith(q.answer)) setScore(s => s + 1); }}
              disabled={selected !== null}>
              {c}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <>
          <div className="explanation"><strong>💡 Explication</strong>{q.explanation}</div>
          <button className="btn-cta" onClick={() => {
            if (isLast) { setState("done"); return; }
            setIdx(i => i + 1); setSelected(null);
          }}>
            {isLast ? "Voir mon score →" : "Question suivante →"}
          </button>
        </>
      )}
      <FloatTools showCalc={subject?.id === "maths"} />
    </div>
  );
}

// ── LongMode ──────────────────────────────────────────────────────────────────
function LongMode({ subject, chapter, isMix, onBack }) {
  const [state, setState] = useState("loading");
  const [data, setData] = useState(null);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const isGeo = subject?.id === "maths" && GEOMETRY_CHAPTERS.includes(chapter);

  useEffect(() => {
    const prompt = isMix ? buildMixLongPrompt() : buildLongPrompt(subject.label, chapter);
    callClaude(prompt)
      .then(d => { setData(d); setState("question"); })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <><Spinner text="Génération de la question…" /><FloatTools showCalc={subject?.id === "maths"} /></>;
  if (state === "error") return <p className="err">Une erreur est survenue. Réessaie !</p>;

  return (
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="question-card">
        <div className="q-label">{isMix ? `🎲 Mix · ${data.matiere || ""}` : `${subject.icon} ${chapter || subject.label}`} — Question ouverte</div>
        <div className="q-text">{data.question}</div>
        {data.context && <div className="q-context">{data.context}</div>}
        {isGeo && <GeoFigure question={data.question} />}
      </div>
      {!revealed ? (
        <>
          <textarea className="answer-area" placeholder="Écris ta réponse ici… prends le temps de réfléchir !" value={answer} onChange={e => setAnswer(e.target.value)} />
          <button className="btn-cta" onClick={() => setRevealed(true)} disabled={answer.trim().length < 10}>Voir la correction</button>
          {answer.length > 0 && answer.trim().length < 10 && <p className="hint">Rédige une réponse un peu plus longue !</p>}
        </>
      ) : (
        <>
          <div className="correction-card">
            <h3>📝 Correction type</h3>
            <div className="correction-text">{data.correction}</div>
            {data.points_cles?.length > 0 && (
              <>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#C4B5FD", marginTop: 16, marginBottom: 10, fontWeight: 700 }}>Points clés attendus</div>
                <div className="points-cles">{data.points_cles.map((p, i) => <div key={i} className="point">{p}</div>)}</div>
              </>
            )}
          </div>
          <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(200,190,255,0.3)", marginBottom: 10, fontWeight: 700 }}>Ta réponse</div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(200,190,255,0.65)", whiteSpace: "pre-wrap" }}>{answer}</div>
          </div>
          <button className="btn-cta" onClick={onBack}>Nouvelle question →</button>
        </>
      )}
      <FloatTools showCalc={subject?.id === "maths"} />
    </div>
  );
}

// ── SetupScreen ───────────────────────────────────────────────────────────────
function SetupScreen({ subject, onStart, onBack }) {
  const [trainingType, setTrainingType] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [mode, setMode] = useState(null);
  const chapters = CHAPTERS[subject.id] || [];
  const canStart = mode && (trainingType === "mixed" || (trainingType === "chapter" && chapter));

  return (
    <div>
      <button className="btn-ghost" onClick={onBack}>← Changer de matière</button>
      <div className="setup-pill" style={{ borderColor: subject.color, color: subject.color, background: `${subject.color}18`, boxShadow: `0 0 24px ${subject.glow}` }}>
        <span>{subject.icon}</span><span>{subject.label}</span>
      </div>
      <div className="section-title">Comment veux-tu t'entraîner ?</div>
      <div className="training-grid">
        {[
          { id: "mixed",   icon: "🎯", label: "Tout ce qui tombe au brevet", desc: "Les sujets les plus probables, tous chapitres mélangés" },
          { id: "chapter", icon: "📖", label: "Par chapitre",                desc: "Cible un chapitre précis pour des révisions ciblées" },
        ].map(t => (
          <div key={t.id} className="training-card"
            style={trainingType === t.id ? { borderColor: subject.color, background: `${subject.color}14`, boxShadow: `0 9px 0 rgba(0,0,0,0.4), 0 0 32px ${subject.glow}`, transform: "translateY(-4px)" } : {}}
            onClick={() => { setTrainingType(t.id); setChapter(null); setMode(null); }}>
            <div className="training-icon">{t.icon}</div>
            <div className="training-label">{t.label}</div>
            <div className="training-desc">{t.desc}</div>
          </div>
        ))}
      </div>
      {trainingType === "chapter" && (
        <>
          <div className="section-title">Choisis un chapitre</div>
          <div className="chapter-chips">
            {chapters.map(c => (
              <div key={c} className="chapter-chip"
                style={chapter === c ? { borderColor: subject.color, background: `${subject.color}1A`, color: "#fff", fontWeight: 700, transform: "translateY(-2px)", boxShadow: `0 5px 0 rgba(0,0,0,0.4), 0 0 16px ${subject.glow}` } : {}}
                onClick={() => setChapter(c)}>
                {c}
              </div>
            ))}
          </div>
        </>
      )}
      {trainingType && (trainingType === "mixed" || chapter) && (
        <>
          <div className="divider" />
          <div className="section-title">Quel type de questions ?</div>
          <div className="mode-grid">
            {[
              { id: "quiz", icon: "⚡", label: "Quiz Rapide",     desc: "5 QCM · environ 3 min",           color: "#FBBF24", glow: "rgba(251,191,36,0.35)" },
              { id: "long", icon: "✍️", label: "Question Longue", desc: "1 question ouverte façon brevet", color: "#A78BFA", glow: "rgba(167,139,250,0.35)" },
            ].map(m => (
              <div key={m.id} className="mode-card"
                style={mode === m.id ? { borderColor: m.color, background: `${m.color}16`, boxShadow: `0 9px 0 rgba(0,0,0,0.4), 0 0 32px ${m.glow}`, transform: "translateY(-4px)" } : {}}
                onClick={() => setMode(m.id)}>
                <div className="mode-icon">{m.icon}</div>
                <div className="mode-label">{m.label}</div>
                <div className="mode-desc">{m.desc}</div>
              </div>
            ))}
          </div>
          <button className="btn-cta" disabled={!canStart}
            onClick={() => canStart && onStart(trainingType === "chapter" ? chapter : null, mode)}>
            C'est parti ! →
          </button>
        </>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [subject, setSubject] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [isMix, setIsMix] = useState(false);
  const [homeTab, setHomeTab] = useState("matieres");
  const [mixMode, setMixMode] = useState(null);

  const goHome = () => { setScreen("home"); setSubject(null); setChapter(null); setIsMix(false); setMixMode(null); };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="bg-grid" />
        <div className="orb orb-1" /><div className="orb orb-2" />
        <div className="orb orb-3" /><div className="orb orb-4" />

        <div className="container">
          {screen === "home" && (
            <>
              <div className="header">
                <div className="badge"><span className="badge-dot" />Révision Brevet 3ème</div>
                <h1>
                  <span className="h1-plain">Prépare ton</span><br />
                  <span className="h1-accent">Brevet</span> <span>📖</span>
                </h1>
                <p>Questions générées par IA · Programme officiel DNB</p>
              </div>

              <div className="home-tabs">
                <button className={`home-tab${homeTab === "matieres" ? " active" : ""}`} onClick={() => setHomeTab("matieres")}>📚 Par matière</button>
                <button className={`home-tab${homeTab === "mix" ? " active" : ""}`} onClick={() => setHomeTab("mix")}>🎲 Mix Brevet</button>
              </div>

              {homeTab === "matieres" && (
                <>
                  <div className="section-title">Choisis une matière</div>
                  <div className="subject-grid">
                    {SUBJECTS.map(s => (
                      <div key={s.id} className="subject-card"
                        onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.boxShadow = `0 8px 0 rgba(0,0,0,0.4), 0 0 32px ${s.glow}`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = ""; }}
                        onClick={() => { setSubject(s); setScreen("setup"); }}>
                        <div className="subject-icon">{s.icon}</div>
                        <div className="subject-label">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {homeTab === "mix" && (
                <>
                  <div className="mix-card">
                    <div className="mix-title">🎲 Mix Brevet</div>
                    <div className="mix-desc">Toutes les matières mélangées · Les sujets les plus susceptibles de tomber au brevet</div>
                    <div className="section-title" style={{marginBottom:12}}>Quel type de questions ?</div>
                    <div className="mode-grid" style={{marginBottom:16}}>
                      {[
                        { id: "quiz", icon: "⚡", label: "Quiz Rapide",     desc: "5 QCM · toutes matières",       color: "#FBBF24", glow: "rgba(251,191,36,0.35)" },
                        { id: "long", icon: "✍️", label: "Question Longue", desc: "1 question ouverte au hasard",  color: "#A78BFA", glow: "rgba(167,139,250,0.35)" },
                      ].map(m => (
                        <div key={m.id} className="mode-card"
                          style={mixMode === m.id ? { borderColor: m.color, background: `${m.color}16`, boxShadow: `0 9px 0 rgba(0,0,0,0.4), 0 0 32px ${m.glow}`, transform: "translateY(-4px)" } : {}}
                          onClick={() => setMixMode(m.id)}>
                          <div className="mode-icon">{m.icon}</div>
                          <div className="mode-label">{m.label}</div>
                          <div className="mode-desc">{m.desc}</div>
                        </div>
                      ))}
                    </div>
                    <button className="btn-cta" disabled={!mixMode}
                      onClick={() => { if (mixMode) { setIsMix(true); setScreen(mixMode); } }}>
                      C'est parti ! →
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {screen === "setup" && subject && (
            <SetupScreen subject={subject} onBack={goHome}
              onStart={(ch, mode) => { setChapter(ch); setScreen(mode); }} />
          )}
          {screen === "quiz" && <QuizMode subject={subject} chapter={chapter} isMix={isMix} onBack={goHome} />}
          {screen === "long" && <LongMode subject={subject} chapter={chapter} isMix={isMix} onBack={goHome} />}
        </div>
      </div>
    </>
  );
}
