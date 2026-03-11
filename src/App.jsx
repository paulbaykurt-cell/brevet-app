import { useState, useEffect } from "react";

const SUBJECTS = [
  { id: "maths",    label: "Mathématiques",   icon: "📐", color: "#3B82F6", shadow: "#1D4ED8" },
  { id: "francais", label: "Français",         icon: "📚", color: "#7C3AED", shadow: "#5B21B6" },
  { id: "histoire", label: "Histoire-Géo",     icon: "🌍", color: "#059669", shadow: "#065F46" },
  { id: "svt",      label: "SVT",              icon: "🔬", color: "#D97706", shadow: "#92400E" },
  { id: "physique", label: "Physique-Chimie",  icon: "⚗️",  color: "#DC2626", shadow: "#991B1B" },
  { id: "anglais",  label: "Anglais",          icon: "🗣️",  color: "#DB2777", shadow: "#9D174D" },
  { id: "emc",      label: "EMC",              icon: "⚖️",  color: "#0891B2", shadow: "#155E75" },
  { id: "techno",   label: "Technologie",      icon: "🖥️",  color: "#EA580C", shadow: "#9A3412" },
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

const GEOMETRY_CHAPTERS = ["Géométrie plane","Pythagore & Thalès","Trigonométrie","Volumes & Aires"];
const MIX_SUBJECTS_LIST = SUBJECTS.map(s => s.label).join(", ");

async function callClaude(prompt, system) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
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
  `Génère exactement 5 questions de quiz à choix multiples pour réviser le brevet. Mélange: ${MIX_SUBJECTS_LIST}. Programme officiel 3ème.
Réponds UNIQUEMENT en JSON:
{"questions":[{"question":"...","matiere":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"answer":"A","explanation":"..."}]}`;

const buildMixLongPrompt = () =>
  `Génère 1 question ouverte de type brevet. Choisis parmi: ${MIX_SUBJECTS_LIST}. Programme officiel 3ème.
Réponds UNIQUEMENT en JSON:
{"question":"...","matiere":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;

const buildLongPrompt = (subject, chapter) => {
  const isDev = chapter === "Développement construit";
  return isDev
    ? `Génère 1 sujet de développement construit d'Histoire-Géographie de type brevet pour un élève de 3ème. Le développement construit est une question de synthèse notée sur 10 points au vrai brevet.
Réponds UNIQUEMENT en JSON:
{"question":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`
    : `Génère 1 question ouverte de type brevet sur "${subject}"${chapter ? ` chapitre "${chapter}"` : " (parmi les sujets les plus probables au brevet)"} pour un élève de 3ème.
Réponds UNIQUEMENT en JSON:
{"question":"...","context":"...","correction":"...","points_cles":["...","...","..."]}`;
};

const buildErrorExplainPrompt = (question, wrongChoice, correctAnswer, explanation) =>
  `Un élève de 3ème a répondu "${wrongChoice}" à cette question: "${question}". La bonne réponse était "${correctAnswer}". Explique-lui de façon très claire et pédagogique POURQUOI sa réponse était fausse et pourquoi la bonne réponse est correcte. Maximum 4 phrases simples.
Réponds UNIQUEMENT en JSON: {"explication_erreur":"..."}`;

const buildPlanningPrompt = (dateStr) =>
  `Aujourd'hui nous sommes le ${new Date().toLocaleDateString("fr-FR")}. Le brevet est le ${dateStr}.
Crée un planning de révision COMPLET et détaillé jour par jour jusqu'au brevet pour un élève de 3ème.
Matières: Mathématiques, Français, Histoire-Géo, SVT, Physique-Chimie, EMC, Technologie.
Chaque jour doit avoir 2-3 sessions de révision précises (matière + chapitre + durée + type d'exercice).
Respecte des weekends plus légers. Les derniers jours avant le brevet = révisions légères.
Réponds UNIQUEMENT en JSON:
{"jours":[{"date":"DD/MM","jour":"Lundi","sessions":[{"matiere":"...","chapitre":"...","duree":"20 min","exercice":"..."}]}]}`;

const buildSvgPrompt = (question) =>
  `Crée un SVG simple (viewBox="0 0 220 180") illustrant la figure géométrique pour cette question: "${question}".
Fond transparent, stroke="#3B82F6" fill="none" strokeWidth="2", texte en fill="#1E3A5F" fontSize="12".
Réponds UNIQUEMENT avec le SVG complet.`;

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --font-d: -apple-system, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
    --font-b: -apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif;
    --bg: #F5F0E8;
    --bg2: #EDE8DC;
    --surface: #FFFFFF;
    --surface2: #F9F6F0;
    --border: #D8D0C0;
    --border2: #C8BFA8;
    --text: #2C2416;
    --text2: #6B5E48;
    --muted: #9A8E7A;
    --accent: #C17F3E;
    --accent2: #8B5A2B;
  }
  body { font-family: var(--font-b); background: var(--bg); min-height: 100vh; color: var(--text); }

  .app { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 28px 16px 110px; }

  .container { width: 100%; max-width: 680px; }

  /* Header */
  .header { text-align: center; margin-bottom: 28px; }
  .badge { display: inline-flex; align-items: center; gap: 7px; background: #FEF3C7; border: 1.5px solid #D97706; color: #92400E; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 6px 16px; border-radius: 999px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(217,119,6,0.2), inset 0 1px 0 rgba(255,255,255,0.6); }
  .badge-dot { width: 6px; height: 6px; background: #D97706; border-radius: 50%; animation: pulse-dot 2s ease-in-out infinite; }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
  .header h1 { font-family: var(--font-d); font-size: clamp(28px, 6vw, 48px); font-weight: 800; line-height: 1.05; letter-spacing: -1.5px; margin-bottom: 8px; color: var(--text); }
  .h1-accent { color: #C17F3E; }
  .header p { color: var(--muted); font-size: 14px; }

  /* Home Tabs */
  .home-tabs { display: flex; gap: 6px; margin-bottom: 22px; background: var(--bg2); border-radius: 14px; padding: 5px; border: 1.5px solid var(--border); box-shadow: inset 0 2px 6px rgba(0,0,0,0.06); }
  .home-tab { flex: 1; padding: 10px 8px; border-radius: 10px; border: none; background: transparent; color: var(--muted); font-family: var(--font-b); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .home-tab.active { background: var(--surface); color: var(--text); box-shadow: 0 3px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08); }

  .section-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; font-weight: 700; }

  /* Subject grid */
  .subject-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
  .subject-card { width: calc(25% - 8px); min-width: 130px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 18px; padding: 20px 12px; cursor: pointer; text-align: center; transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s; box-shadow: 0 4px 0 var(--border2), 0 6px 16px rgba(0,0,0,0.08); user-select: none; position: relative; overflow: hidden; }
  .subject-card::before { content:''; position:absolute; inset:0; border-radius:17px; background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, transparent 60%); pointer-events:none; }
  .subject-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 8px 0 var(--border2), 0 12px 28px rgba(0,0,0,0.12); }
  .subject-card:active { transform: translateY(3px) scale(0.97)!important; box-shadow: 0 1px 0 var(--border2)!important; transition-duration:.07s!important; }
  @media (max-width:520px) { .subject-card { width: calc(50% - 6px); } }
  .subject-icon { font-size: 30px; margin-bottom: 9px; line-height:1; }
  .subject-label { font-size: 12px; font-weight: 600; color: var(--text2); line-height:1.3; }

  /* Mix card */
  .mix-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 20px; padding: 26px 22px; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 0 var(--border2), 0 8px 24px rgba(0,0,0,0.07); }
  .mix-title { font-family: var(--font-d); font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
  .mix-desc { font-size: 14px; color: var(--muted); margin-bottom: 20px; line-height: 1.6; }

  /* Setup pill */
  .setup-pill { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: 999px; font-family: var(--font-d); font-size: 14px; font-weight: 800; margin-bottom: 24px; background: var(--surface); box-shadow: 0 3px 0 var(--border2), 0 4px 12px rgba(0,0,0,0.08); border: 1.5px solid var(--border); }

  /* Training cards */
  .training-grid { display: grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:18px; }
  @media (max-width:480px) { .training-grid { grid-template-columns:1fr; } }
  .training-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 18px; padding: 22px 16px; cursor: pointer; text-align: center; transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s; box-shadow: 0 5px 0 var(--border2), 0 8px 20px rgba(0,0,0,0.07); user-select: none; position: relative; overflow: hidden; }
  .training-card::before { content:''; position:absolute; inset:0; border-radius:17px; background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 60%); pointer-events:none; }
  .training-card:hover { transform: translateY(-4px); box-shadow: 0 9px 0 var(--border2), 0 14px 32px rgba(0,0,0,0.1); }
  .training-card:active { transform: translateY(4px) scale(0.98)!important; box-shadow: 0 1px 0 var(--border2)!important; transition-duration:.07s!important; }
  .training-icon { font-size: 34px; margin-bottom: 10px; }
  .training-label { font-family: var(--font-d); font-size: 14px; font-weight: 800; margin-bottom: 5px; color: var(--text); }
  .training-desc { font-size: 12px; color: var(--muted); line-height:1.5; }

  /* Chapter chips */
  .chapter-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .chapter-chip { padding: 8px 14px; border-radius: 10px; border: 1.5px solid var(--border); background: var(--surface); color: var(--text2); font-size: 13px; font-weight: 500; cursor: pointer; transition: transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s; box-shadow: 0 3px 0 var(--border2), 0 4px 10px rgba(0,0,0,0.06); user-select: none; }
  .chapter-chip:hover { background: var(--bg2); transform: translateY(-2px); box-shadow: 0 5px 0 var(--border2); }
  .chapter-chip:active { transform: translateY(2px)!important; box-shadow: 0 1px 0 var(--border2)!important; }

  /* Mode cards */
  .mode-grid { display: grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px; }
  @media (max-width:480px) { .mode-grid { grid-template-columns:1fr; } }
  .mode-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; padding: 18px 14px; cursor: pointer; transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s; box-shadow: 0 4px 0 var(--border2), 0 6px 16px rgba(0,0,0,0.07); user-select: none; position: relative; overflow: hidden; }
  .mode-card::before { content:''; position:absolute; inset:0; border-radius:15px; background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 60%); pointer-events:none; }
  .mode-card:hover { transform: translateY(-4px); box-shadow: 0 8px 0 var(--border2), 0 12px 28px rgba(0,0,0,0.1); }
  .mode-card:active { transform: translateY(3px) scale(0.98)!important; box-shadow: 0 1px 0 var(--border2)!important; }
  .mode-icon { font-size: 26px; margin-bottom: 7px; }
  .mode-label { font-family: var(--font-d); font-size: 14px; font-weight: 800; margin-bottom: 3px; color: var(--text); }
  .mode-desc { font-size: 12px; color: var(--muted); }

  /* CTA Button */
  .btn-cta { display: block; width: 100%; padding: 16px 24px; border-radius: 14px; border: none; background: linear-gradient(180deg, #D97706 0%, #B45309 100%); color: #FFF8F0; font-family: var(--font-d); font-size: 16px; font-weight: 800; cursor: pointer; transition: transform .16s cubic-bezier(.34,1.56,.64,1), box-shadow .16s; box-shadow: 0 6px 0 #92400E, 0 8px 24px rgba(180,83,9,0.3); user-select: none; position: relative; overflow: hidden; }
  .btn-cta::before { content:''; position:absolute; top:0; left:0; right:0; height:50%; background: rgba(255,255,255,0.15); border-radius:14px 14px 0 0; pointer-events:none; }
  .btn-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 0 #78350F, 0 12px 32px rgba(180,83,9,0.4); }
  .btn-cta:active { transform: translateY(5px)!important; box-shadow: 0 1px 0 #92400E!important; transition-duration:.08s!important; }
  .btn-cta:disabled { background: var(--bg2); color: var(--muted); box-shadow: 0 3px 0 var(--border)!important; cursor: not-allowed; transform: none!important; }

  /* Ghost button */
  .btn-ghost { display: inline-flex; align-items: center; gap: 6px; background: var(--surface); border: 1.5px solid var(--border); color: var(--text2); padding: 9px 16px; border-radius: 10px; font-family: var(--font-b); font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 22px; transition: transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s; box-shadow: 0 3px 0 var(--border2), 0 4px 10px rgba(0,0,0,0.06); user-select: none; }
  .btn-ghost:hover { transform: translateY(-2px); box-shadow: 0 5px 0 var(--border2); background: var(--bg2); }
  .btn-ghost:active { transform: translateY(2px)!important; box-shadow: 0 1px 0 var(--border2)!important; }

  /* Secondary button */
  .btn-secondary { display: inline-flex; align-items: center; gap: 6px; background: var(--surface2); border: 1.5px solid var(--border); color: var(--text2); padding: 10px 16px; border-radius: 10px; font-family: var(--font-b); font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 10px; transition: transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s; box-shadow: 0 3px 0 var(--border2); user-select: none; width: 100%; justify-content: center; }
  .btn-secondary:hover { transform: translateY(-2px); box-shadow: 0 5px 0 var(--border2); }
  .btn-secondary:active { transform: translateY(2px)!important; box-shadow: 0 1px 0 var(--border2)!important; }

  /* Spinner */
  .loading { text-align: center; padding: 72px 0; }
  .spinner-ring { width: 48px; height: 48px; margin: 0 auto 20px; position: relative; }
  .spinner-ring::before { content:''; position:absolute; inset:0; border-radius:50%; border: 3px solid var(--border); }
  .spinner-ring::after { content:''; position:absolute; inset:0; border-radius:50%; border: 3px solid transparent; border-top-color: #D97706; border-right-color: #B45309; animation: spin .75s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading p { color: var(--muted); font-size: 14px; }

  /* Progress */
  .progress-wrap { margin-bottom: 20px; }
  .progress-info { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
  .progress-bar { height: 8px; background: var(--bg2); border-radius: 999px; overflow: visible; box-shadow: inset 0 2px 4px rgba(0,0,0,0.08); }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #D97706, #B45309); border-radius: 999px; transition: width .5s cubic-bezier(.4,0,.2,1); position: relative; }
  .progress-fill::after { content:''; position:absolute; right:-4px; top:50%; transform:translateY(-50%); width:14px; height:14px; background:#fff; border-radius:50%; border: 3px solid #D97706; box-shadow: 0 2px 6px rgba(217,119,6,0.4); }

  /* Question card */
  .question-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 20px; padding: 24px; margin-bottom: 14px; box-shadow: 0 4px 0 var(--border2), 0 6px 20px rgba(0,0,0,0.07); position: relative; overflow: hidden; }
  .question-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background: linear-gradient(90deg, #D97706, #B45309); border-radius:20px 20px 0 0; }
  .q-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; font-weight: 700; }
  .q-text { font-family: var(--font-d); font-size: 17px; font-weight: 700; line-height: 1.5; color: var(--text); }
  .q-context { font-size: 13px; color: var(--text2); margin-top: 12px; line-height: 1.65; padding: 12px 14px; background: #FEF9EE; border-radius: 10px; border-left: 3px solid #D97706; }

  /* Brevet criteria banner */
  .brevet-banner { background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; display: flex; gap: 10px; align-items: flex-start; }
  .brevet-banner-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .brevet-banner-text { font-size: 13px; color: #1E40AF; line-height: 1.55; font-weight: 500; }
  .brevet-banner-text strong { display: block; font-weight: 700; margin-bottom: 3px; }

  /* Geo figure */
  .geo-btn { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 7px 12px; border-radius: 9px; border: 1.5px solid #BFDBFE; background: #EFF6FF; color: #1D4ED8; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; box-shadow: 0 2px 0 #BFDBFE; }
  .geo-btn:hover { background: #DBEAFE; transform: translateY(-1px); }
  .geo-figure { margin-top: 12px; background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 12px; padding: 14px; display: flex; align-items: center; justify-content: center; }
  .geo-figure svg { max-width: 100%; }

  /* Choices */
  .choices { display: grid; gap: 9px; margin-bottom: 14px; }
  .choice-btn { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--surface); color: var(--text); font-family: var(--font-b); font-size: 15px; text-align: left; cursor: pointer; transition: transform .14s cubic-bezier(.34,1.56,.64,1), box-shadow .14s; box-shadow: 0 4px 0 var(--border2), 0 5px 14px rgba(0,0,0,0.06); user-select: none; position: relative; overflow: hidden; }
  .choice-btn::before { content:''; position:absolute; top:0; left:0; right:0; height:50%; background: rgba(255,255,255,0.5); pointer-events:none; }
  .choice-btn:hover:not(:disabled) { background: var(--bg2); transform: translateY(-2px); box-shadow: 0 6px 0 var(--border2), 0 8px 20px rgba(0,0,0,0.08); }
  .choice-btn:active:not(:disabled) { transform: translateY(3px)!important; box-shadow: 0 1px 0 var(--border2)!important; }
  .choice-btn.correct { background: #ECFDF5; border-color: #10B981; color: #065F46; box-shadow: 0 4px 0 #A7F3D0; animation: popCorrect .4s cubic-bezier(.34,1.56,.64,1); }
  .choice-btn.wrong { background: #FEF2F2; border-color: #EF4444; color: #991B1B; box-shadow: 0 4px 0 #FECACA; animation: shakeWrong .45s ease; }
  @keyframes popCorrect { 0%{transform:scale(1)} 45%{transform:scale(1.03) translateY(-2px)} 100%{transform:scale(1)} }
  @keyframes shakeWrong { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(2px)} }

  .explanation { background: #F0FDF4; border: 1.5px solid #A7F3D0; border-radius: 12px; padding: 14px; margin-bottom: 12px; font-size: 14px; line-height: 1.65; color: #065F46; }
  .explanation strong { color: #059669; display: block; margin-bottom: 6px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }

  .error-explain { background: #FFF7ED; border: 1.5px solid #FED7AA; border-radius: 12px; padding: 14px; margin-bottom: 12px; font-size: 14px; line-height: 1.65; color: #7C2D12; }
  .error-explain strong { color: #EA580C; display: block; margin-bottom: 6px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }

  .correction-card { background: #F5F3FF; border: 1.5px solid #C4B5FD; border-radius: 16px; padding: 20px; margin-bottom: 12px; }
  .correction-card h3 { font-family: var(--font-d); font-size: 13px; color: #6D28D9; margin-bottom: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .correction-text { font-size: 14px; line-height: 1.75; color: #3B0764; }
  .points-cles { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
  .point { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: var(--text2); }
  .point::before { content:'✓'; color: #059669; font-weight: 700; flex-shrink: 0; margin-top: 1px; }

  .answer-area { width: 100%; min-height: 130px; background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px; padding: 14px; color: var(--text); font-family: var(--font-b); font-size: 15px; line-height: 1.6; resize: vertical; outline: none; margin-bottom: 12px; box-shadow: inset 0 2px 6px rgba(0,0,0,0.05); transition: border-color .2s, box-shadow .2s; }
  .answer-area:focus { border-color: #D97706; box-shadow: inset 0 2px 6px rgba(0,0,0,0.05), 0 0 0 3px rgba(217,119,6,0.12); }
  .answer-area::placeholder { color: var(--muted); }

  .score-wrap { text-align: center; padding: 8px 0 24px; }
  .score-ring { width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; font-family: var(--font-d); font-size: 36px; font-weight: 800; border: 4px solid; background: var(--surface); box-shadow: 0 6px 0 var(--border2), 0 10px 28px rgba(0,0,0,0.1); }
  .score-message { font-family: var(--font-d); font-size: 22px; font-weight: 800; margin-bottom: 5px; color: var(--text); }
  .score-sub { font-size: 13px; color: var(--muted); margin-bottom: 24px; }

  .divider { height: 1px; background: var(--border); margin: 20px 0; }
  .hint { text-align: center; font-size: 12px; color: var(--muted); margin-top: 8px; }
  .err { color: #DC2626; text-align: center; padding: 40px 0; }

  /* Planning */
  .planning-header { background: var(--surface); border: 1.5px solid var(--border); border-radius: 20px; padding: 24px; margin-bottom: 20px; box-shadow: 0 4px 0 var(--border2), 0 6px 20px rgba(0,0,0,0.07); text-align: center; }
  .planning-title { font-family: var(--font-d); font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
  .planning-desc { font-size: 14px; color: var(--muted); margin-bottom: 20px; }
  .date-input { width: 100%; padding: 13px 16px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--bg2); color: var(--text); font-family: var(--font-b); font-size: 16px; outline: none; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); transition: border-color .2s; margin-bottom: 14px; }
  .date-input:focus { border-color: #D97706; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05), 0 0 0 3px rgba(217,119,6,0.12); }

  .planning-day { background: var(--surface); border: 1.5px solid var(--border); border-radius: 16px; margin-bottom: 12px; overflow: hidden; box-shadow: 0 3px 0 var(--border2), 0 5px 14px rgba(0,0,0,0.06); }
  .planning-day-header { padding: 13px 18px; background: var(--bg2); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .planning-day-title { font-family: var(--font-d); font-size: 14px; font-weight: 800; color: var(--text); }
  .planning-day-date { font-size: 12px; color: var(--muted); font-weight: 600; }
  .planning-sessions { padding: 12px 18px; display: flex; flex-direction: column; gap: 9px; }
  .planning-session { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--bg2); border: 1px solid var(--border); }
  .session-matiere { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #D97706; min-width: 80px; }
  .session-info { flex: 1; }
  .session-chapitre { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
  .session-details { font-size: 12px; color: var(--muted); }
  .session-duree { font-size: 12px; font-weight: 700; color: var(--text2); white-space: nowrap; }

  /* ── Floating tools ── */
  .float-tools { position: fixed; bottom: 24px; right: 14px; display: flex; flex-direction: column; gap: 12px; z-index: 100; }
  .float-btn { width: 64px; height: 64px; border-radius: 20px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 24px; transition: transform .16s cubic-bezier(.34,1.56,.64,1), box-shadow .16s; user-select: none; }
  .float-btn .fb-label { font-size: 10px; font-weight: 700; letter-spacing: 0.3px; line-height: 1; }
  .float-btn:hover { transform: scale(1.1) translateY(-3px); }
  .float-btn:active { transform: scale(0.92)!important; transition-duration:.07s!important; }
  .float-btn-calc { background: linear-gradient(180deg, #3B82F6, #1D4ED8); box-shadow: 0 5px 0 #1e3a8a, 0 8px 20px rgba(59,130,246,0.4); color: white; }
  .float-btn-calc.active { box-shadow: 0 2px 0 #1e3a8a!important; transform: scale(0.96)!important; }
  .float-btn-notes { background: linear-gradient(180deg, #8B5CF6, #6D28D9); box-shadow: 0 5px 0 #4c1d95, 0 8px 20px rgba(139,92,246,0.4); color: white; }
  .float-btn-notes.active { box-shadow: 0 2px 0 #4c1d95!important; transform: scale(0.96)!important; }

  /* ── Side panels ── */
  .side-panels { position: fixed; bottom: 110px; right: 14px; display: flex; flex-direction: column; gap: 12px; z-index: 99; }
  .panel { background: #FFFDF9; border: 1.5px solid var(--border); border-radius: 20px; width: 300px; max-width: calc(100vw - 28px); padding: 16px; box-shadow: -4px 4px 24px rgba(0,0,0,0.12), 0 4px 0 var(--border2); animation: slideInRight .25s cubic-bezier(.34,1.56,.64,1); }
  @keyframes slideInRight { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
  .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .panel-title { font-family: var(--font-d); font-size: 14px; font-weight: 800; color: var(--text); }
  .panel-close { background: var(--bg2); border: 1.5px solid var(--border); color: var(--muted); width: 26px; height: 26px; border-radius: 50%; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; transition: all .15s; box-shadow: 0 2px 0 var(--border2); }
  .panel-close:hover { background: var(--border); color: var(--text); }

  /* Calculator */
  .calc-display { background: var(--bg2); border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; text-align: right; font-family: var(--font-d); font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 10px; min-height: 52px; word-break: break-all; box-shadow: inset 0 2px 5px rgba(0,0,0,0.06); }
  .calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
  .calc-btn { padding: 12px 8px; border-radius: 10px; border: 1.5px solid var(--border); font-family: var(--font-d); font-size: 15px; font-weight: 700; cursor: pointer; transition: transform .12s cubic-bezier(.34,1.56,.64,1), box-shadow .12s; user-select: none; }
  .calc-btn:active { transform: scale(0.92) translateY(2px)!important; transition-duration:.07s!important; }
  .calc-num { background: var(--surface); color: var(--text); box-shadow: 0 3px 0 var(--border2); }
  .calc-num:hover { background: var(--bg2); transform: translateY(-1px); }
  .calc-op { background: #FEF3C7; color: #92400E; border-color: #FDE68A; box-shadow: 0 3px 0 #FDE68A; }
  .calc-op:hover { background: #FDE68A; transform: translateY(-1px); }
  .calc-eq { background: linear-gradient(180deg,#D97706,#B45309); color: white; border-color: #B45309; box-shadow: 0 3px 0 #92400E; }
  .calc-eq:hover { transform: translateY(-2px); box-shadow: 0 5px 0 #78350F; }
  .calc-clear { background: #FEF2F2; color: #991B1B; border-color: #FECACA; box-shadow: 0 3px 0 #FECACA; }
  .calc-clear:hover { background: #FECACA; transform: translateY(-1px); }

  /* Notes */
  .notes-area { width: 100%; min-height: 180px; background: var(--bg2); border: 1.5px solid var(--border); border-radius: 10px; padding: 12px; color: var(--text); font-family: var(--font-b); font-size: 14px; line-height: 1.7; resize: none; outline: none; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); transition: border-color .2s; }
  .notes-area:focus { border-color: #D97706; }
  .notes-area::placeholder { color: var(--muted); }
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
    if (["+","-","×","÷"].includes(val)) { setPrev(parseFloat(display)); setOp(val); setReset(true); return; }
    if (val === "=") {
      if (op && prev !== null) {
        const cur = parseFloat(display);
        let res = op === "+" ? prev+cur : op === "-" ? prev-cur : op === "×" ? prev*cur : cur !== 0 ? prev/cur : "Erreur";
        setDisplay(String(parseFloat(res.toFixed ? res.toFixed(10) : res)));
        setPrev(null); setOp(null); setReset(true);
      }
      return;
    }
    if (val === ".") { if (reset) { setDisplay("0."); setReset(false); return; } if (!display.includes(".")) setDisplay(d => d + "."); return; }
    if (reset) { setDisplay(String(val)); setReset(false); }
    else setDisplay(d => d === "0" ? String(val) : d + val);
  };

  const btns = [["C","±","%","÷"],[7,8,9,"×"],[4,5,6,"-"],[1,2,3,"+"],[0,".","="]];
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">🧮 Calculatrice</span>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>
      <div className="calc-display">{display}</div>
      <div className="calc-grid">
        {btns.flat().map((b, i) => {
          let cls = "calc-btn " + (b==="C"?"calc-clear":b==="="?"calc-eq":["+","-","×","÷","%","±"].includes(String(b))?"calc-op":"calc-num");
          return <button key={i} className={cls} style={b===0?{gridColumn:"span 2"}:{}} onClick={() => press(b)}>{b}</button>;
        })}
      </div>
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────────
function Notes({ onClose }) {
  const [text, setText] = useState(() => { try { return sessionStorage.getItem("brevet_notes") || ""; } catch { return ""; } });
  const save = (v) => { setText(v); try { sessionStorage.setItem("brevet_notes", v); } catch {} };
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">📝 Mes notes</span>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>
      <textarea className="notes-area" placeholder="Formules, astuces, points à retenir..." value={text} onChange={e => save(e.target.value)} rows={6} />
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
        {showCalc && <button className={"float-btn float-btn-calc"+(calc?" active":"")} onClick={() => setCalc(v=>!v)}>🧮<span className="fb-label">Calc</span></button>}
        <button className={"float-btn float-btn-notes"+(notes?" active":"")} onClick={() => setNotes(v=>!v)}>📝<span className="fb-label">Notes</span></button>
      </div>
      <div className="side-panels">
        {calc && showCalc && <Calculator onClose={() => setCalc(false)} />}
        {notes && <Notes onClose={() => setNotes(false)} />}
      </div>
    </>
  );
}

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
  if (state === "idle") return <button className="geo-btn" onClick={generate}>📐 Voir la figure</button>;
  if (state === "loading") return <p style={{fontSize:12,color:"#3B82F6",marginTop:10}}>Génération de la figure…</p>;
  if (state === "error") return <p style={{fontSize:12,color:"#DC2626",marginTop:10}}>Impossible de générer la figure</p>;
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
  const [errorExplain, setErrorExplain] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const isGeo = subject?.id === "maths" && GEOMETRY_CHAPTERS.includes(chapter);

  useEffect(() => {
    const prompt = isMix ? buildMixQuizPrompt() : buildQuizPrompt(subject.label, chapter);
    callClaude(prompt).then(data => { setQuestions(data.questions || []); setState("question"); }).catch(() => setState("error"));
  }, []);

  const askErrorExplain = async (q, wrong) => {
    setLoadingExplain(true);
    try {
      const data = await callClaude(buildErrorExplainPrompt(q.question, wrong, q.answer, q.explanation));
      setErrorExplain(data.explication_erreur);
    } catch { setErrorExplain("Impossible de charger l'explication."); }
    setLoadingExplain(false);
  };

  if (state === "loading") return <><Spinner text="Génération des questions…" /><FloatTools showCalc={subject?.id === "maths"} /></>;
  if (state === "error") return <p className="err">Une erreur est survenue. Réessaie !</p>;

  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const isWrong = selected && !selected.startsWith(q.answer);
  const scoreColor = score >= 4 ? "#059669" : score >= 2 ? "#D97706" : "#DC2626";
  const scoreBorder = score >= 4 ? "#A7F3D0" : score >= 2 ? "#FDE68A" : "#FECACA";
  const scoreMsg = score >= 4 ? "🎉 Excellent !" : score >= 2 ? "👍 Pas mal !" : "💪 Continue à réviser !";

  if (state === "done") return (
    <div className="score-wrap">
      <button className="btn-ghost" onClick={onBack}>← Retour à l'accueil</button>
      <div className="score-ring" style={{ borderColor: scoreColor, color: scoreColor, boxShadow: `0 6px 0 ${scoreBorder}, 0 10px 28px rgba(0,0,0,0.1)` }}>
        {score}/{questions.length}
      </div>
      <div className="score-message">{scoreMsg}</div>
      <div className="score-sub">{isMix ? "🎲 Mix Brevet" : `${subject.icon} ${subject.label}${chapter ? ` · ${chapter}` : ""}`}</div>
      <button className="btn-cta" onClick={onBack}>Recommencer ↩</button>
    </div>
  );

  return (
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="progress-wrap">
        <div className="progress-info"><span>Question {idx+1} / {questions.length}</span><span>{score} ⭐</span></div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${(idx/questions.length)*100}%` }} /></div>
      </div>
      <div className="question-card">
        <div className="q-label">{isMix ? `🎲 Mix · ${q.matiere||""}` : `${subject.icon} ${chapter||subject.label}`}</div>
        <div className="q-text">{q.question}</div>
        {isGeo && <GeoFigure question={q.question} />}
      </div>
      <div className="choices">
        {q.choices.map(c => {
          let cls = "choice-btn";
          if (selected !== null) { if (c.startsWith(q.answer)) cls += " correct"; else if (c === selected) cls += " wrong"; }
          return (
            <button key={c} className={cls}
              onClick={() => { if (selected !== null) return; setSelected(c); if (c.startsWith(q.answer)) setScore(s=>s+1); setErrorExplain(null); }}
              disabled={selected !== null}>{c}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <>
          <div className="explanation"><strong>💡 Explication</strong>{q.explanation}</div>
          {isWrong && (
            <>
              {!errorExplain && !loadingExplain && (
                <button className="btn-secondary" onClick={() => askErrorExplain(q, selected)}>
                  🤔 Pourquoi ma réponse était fausse ?
                </button>
              )}
              {loadingExplain && <p style={{textAlign:"center",fontSize:13,color:"#D97706",marginTop:8}}>Analyse de ton erreur…</p>}
              {errorExplain && (
                <div className="error-explain"><strong>🔍 Comprendre ton erreur</strong>{errorExplain}</div>
              )}
            </>
          )}
          <button className="btn-cta" style={{marginTop:12}} onClick={() => { if (isLast) { setState("done"); return; } setIdx(i=>i+1); setSelected(null); setErrorExplain(null); }}>
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
  const isDev = chapter === "Développement construit";

  useEffect(() => {
    const prompt = isMix ? buildMixLongPrompt() : buildLongPrompt(subject.label, chapter);
    callClaude(prompt).then(d => { setData(d); setState("question"); }).catch(() => setState("error"));
  }, []);

  if (state === "loading") return <><Spinner text="Génération de la question…" /><FloatTools showCalc={subject?.id === "maths"} /></>;
  if (state === "error") return <p className="err">Une erreur est survenue. Réessaie !</p>;

  return (
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour</button>
      <div className="question-card">
        <div className="q-label">{isMix ? `🎲 Mix · ${data.matiere||""}` : `${subject.icon} ${isDev ? "Développement construit" : (chapter||subject.label)}`}</div>
        <div className="q-text">{data.question}</div>
        {data.context && <div className="q-context">{data.context}</div>}
        {isGeo && <GeoFigure question={data.question} />}
      </div>
      {!revealed && (
        <div className="brevet-banner">
          <span className="brevet-banner-icon">📋</span>
          <div className="brevet-banner-text">
            <strong>Critères de notation du vrai brevet</strong>
            {isDev
              ? "Tu seras évalué sur : l'organisation en introduction / développement / conclusion, la pertinence des arguments et exemples historiques, et la maîtrise de la langue. (Barème sur 10 points)"
              : "Tu seras évalué sur : la pertinence et complétude de ta réponse, l'organisation des idées, et la maîtrise de la langue écrite."}
          </div>
        </div>
      )}
      {!revealed ? (
        <>
          <textarea className="answer-area" placeholder={isDev ? "Rédige ton développement construit (introduction, développement, conclusion)…" : "Écris ta réponse ici… prends le temps de réfléchir !"} value={answer} onChange={e => setAnswer(e.target.value)} />
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
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#6D28D9", marginTop: 14, marginBottom: 8, fontWeight: 700 }}>Points clés attendus</div>
                <div className="points-cles">{data.points_cles.map((p,i) => <div key={i} className="point">{p}</div>)}</div>
              </>
            )}
          </div>
          <div style={{ marginBottom: 14, background: "#F9F6F0", borderRadius: 12, padding: 14, border: "1.5px solid #D8D0C0" }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#9A8E7A", marginBottom: 8, fontWeight: 700 }}>Ta réponse</div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "#6B5E48", whiteSpace: "pre-wrap" }}>{answer}</div>
          </div>
          <button className="btn-cta" onClick={onBack}>Nouvelle question →</button>
        </>
      )}
      <FloatTools showCalc={subject?.id === "maths"} />
    </div>
  );
}

// ── PlanningScreen ────────────────────────────────────────────────────────────
function PlanningScreen({ onBack }) {
  const [date, setDate] = useState("");
  const [state, setState] = useState("form");
  const [planning, setPlanning] = useState(null);

  const generate = async () => {
    if (!date) return;
    const formatted = new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    setState("loading");
    try {
      const data = await callClaude(buildPlanningPrompt(formatted));
      setPlanning(data.jours || []);
      setState("done");
    } catch { setState("error"); }
  };

  const subjectColors = { "Mathématiques": "#3B82F6", "Français": "#7C3AED", "Histoire-Géo": "#059669", "SVT": "#D97706", "Physique-Chimie": "#DC2626", "Anglais": "#DB2777", "EMC": "#0891B2", "Technologie": "#EA580C" };

  if (state === "loading") return <><button className="btn-ghost" onClick={onBack}>← Retour</button><Spinner text="Génération de ton planning…" /></>;
  if (state === "error") return <><button className="btn-ghost" onClick={onBack}>← Retour</button><p className="err">Une erreur est survenue. Réessaie !</p></>;

  return (
    <div>
      <button className="btn-ghost" onClick={onBack}>← Retour à l'accueil</button>
      {state === "form" && (
        <div className="planning-header">
          <div style={{fontSize:48,marginBottom:12}}>📅</div>
          <div className="planning-title">Mon Planning de Révision</div>
          <div className="planning-desc">Entre la date de ton brevet et je crée un planning personnalisé jour par jour jusqu'au grand jour !</div>
          <input type="date" className="date-input" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
          <button className="btn-cta" disabled={!date} onClick={generate}>Générer mon planning →</button>
        </div>
      )}
      {state === "done" && planning && (
        <>
          <div className="planning-header">
            <div className="planning-title">📅 Ton Planning Brevet</div>
            <div className="planning-desc">{planning.length} jours de révision · Toutes les matières couvertes</div>
            <button className="btn-secondary" onClick={() => setState("form")}>↩ Changer la date</button>
          </div>
          {planning.map((jour, i) => (
            <div key={i} className="planning-day">
              <div className="planning-day-header">
                <span className="planning-day-title">{jour.jour}</span>
                <span className="planning-day-date">{jour.date}</span>
              </div>
              <div className="planning-sessions">
                {(jour.sessions||[]).map((s, j) => (
                  <div key={j} className="planning-session">
                    <div className="session-matiere" style={{color: subjectColors[s.matiere]||"#D97706"}}>{s.matiere}</div>
                    <div className="session-info">
                      <div className="session-chapitre">{s.chapitre}</div>
                      <div className="session-details">{s.exercice}</div>
                    </div>
                    <div className="session-duree">⏱ {s.duree}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
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

  const subjectStyle = (active) => active ? { borderColor: subject.color, background: `${subject.color}15`, boxShadow: `0 9px 0 ${subject.color}30`, transform: "translateY(-4px)" } : {};

  return (
    <div>
      <button className="btn-ghost" onClick={onBack}>← Changer de matière</button>
      <div className="setup-pill">
        <span>{subject.icon}</span><span style={{color: subject.color}}>{subject.label}</span>
      </div>
      <div className="section-title">Comment veux-tu t'entraîner ?</div>
      <div className="training-grid">
        {[
          { id: "mixed", icon: "🎯", label: "Tout ce qui tombe au brevet", desc: "Sujets les plus probables, tous chapitres" },
          { id: "chapter", icon: "📖", label: "Par chapitre", desc: "Cible un chapitre précis" },
        ].map(t => (
          <div key={t.id} className="training-card" style={subjectStyle(trainingType===t.id)}
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
                style={chapter===c ? { borderColor: subject.color, background: `${subject.color}15`, color: subject.color, fontWeight: 700, transform: "translateY(-2px)" } : {}}
                onClick={() => setChapter(c)}>{c}</div>
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
              { id: "quiz", icon: "⚡", label: "Quiz Rapide", desc: "5 QCM · environ 3 min" },
              { id: "long", icon: "✍️", label: "Question Longue", desc: "1 question ouverte façon brevet" },
            ].map(m => (
              <div key={m.id} className="mode-card"
                style={mode===m.id ? { borderColor: subject.color, background: `${subject.color}12`, boxShadow: `0 8px 0 ${subject.color}25`, transform: "translateY(-4px)" } : {}}
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
        <div className="container">
          {screen === "home" && (
            <>
              <div className="header">
                <div className="badge"><span className="badge-dot" />Révision Brevet 3ème</div>
                <h1>Prépare ton <span className="h1-accent">Brevet</span> 📖</h1>
                <p>Questions générées par IA · Programme officiel DNB</p>
              </div>

              <div className="home-tabs">
                <button className={`home-tab${homeTab==="matieres"?" active":""}`} onClick={() => setHomeTab("matieres")}>📚 Par matière</button>
                <button className={`home-tab${homeTab==="mix"?" active":""}`} onClick={() => setHomeTab("mix")}>🎲 Mix Brevet</button>
                <button className={`home-tab${homeTab==="planning"?" active":""}`} onClick={() => setHomeTab("planning")}>📅 Planning</button>
              </div>

              {homeTab === "matieres" && (
                <>
                  <div className="section-title">Choisis une matière</div>
                  <div className="subject-grid">
                    {SUBJECTS.map(s => (
                      <div key={s.id} className="subject-card"
                        onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.boxShadow = `0 8px 0 ${s.shadow}40, 0 12px 28px rgba(0,0,0,0.1)`; }}
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
                <div className="mix-card">
                  <div className="mix-title">🎲 Mix Brevet</div>
                  <div className="mix-desc">Toutes les matières mélangées · Sujets les plus susceptibles de tomber</div>
                  <div className="section-title" style={{marginBottom:12}}>Quel type de questions ?</div>
                  <div className="mode-grid" style={{marginBottom:16}}>
                    {[
                      { id: "quiz", icon: "⚡", label: "Quiz Rapide", desc: "5 QCM · toutes matières" },
                      { id: "long", icon: "✍️", label: "Question Longue", desc: "1 question au hasard" },
                    ].map(m => (
                      <div key={m.id} className="mode-card"
                        style={mixMode===m.id ? { borderColor: "#D97706", background: "#FEF3C7", boxShadow: "0 8px 0 #FDE68A", transform: "translateY(-4px)" } : {}}
                        onClick={() => setMixMode(m.id)}>
                        <div className="mode-icon">{m.icon}</div>
                        <div className="mode-label">{m.label}</div>
                        <div className="mode-desc">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-cta" disabled={!mixMode} onClick={() => { if(mixMode){setIsMix(true);setScreen(mixMode);} }}>C'est parti ! →</button>
                </div>
              )}

              {homeTab === "planning" && <PlanningScreen onBack={goHome} />}
            </>
          )}

          {screen === "setup" && subject && (
            <SetupScreen subject={subject} onBack={goHome} onStart={(ch, mode) => { setChapter(ch); setScreen(mode); }} />
          )}
          {screen === "quiz" && <QuizMode subject={subject} chapter={chapter} isMix={isMix} onBack={goHome} />}
          {screen === "long" && <LongMode subject={subject} chapter={chapter} isMix={isMix} onBack={goHome} />}
        </div>
      </div>
    </>
  );
}
