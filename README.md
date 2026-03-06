# Brevet App 📖

Application de révision pour le Brevet des collèges (DNB), générée par IA.

## Déploiement sur Vercel

### 1. Prépare le projet

```bash
npm install
```

### 2. Teste en local

```bash
npm run dev
```

### 3. Déploie sur Vercel

1. Va sur [vercel.com](https://vercel.com) et connecte ton compte GitHub
2. Crée un nouveau repo GitHub et pousse ce projet dedans
3. Importe le repo dans Vercel
4. Dans les **Environment Variables** de Vercel, ajoute :
   - `ANTHROPIC_API_KEY` = ta clé API Anthropic (disponible sur console.anthropic.com)
5. Clique sur **Deploy** ✅

### Comment ça marche

- Le frontend React tourne côté client
- Les appels à l'API Anthropic passent par `/api/claude.js` (fonction serverless Vercel)
- La clé API n'est jamais exposée dans le navigateur
