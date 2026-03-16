// js/state.js
// Módulo de estado global leve — não importa nenhum outro módulo do projeto.
// Existe para quebrar dependências circulares entre auth.js, publicacao.js e noticias.js.

let _reputacao    = 50;
let _currentUser  = null;

// ─── Reputação ────────────────────────────────────────────────────────────────
export function getReputacao()          { return _reputacao; }
export function setReputacao(val)       { _reputacao = val ?? 50; }
export function incrementReputacao(n)   { _reputacao += n; }

// ─── Usuário atual (espelho leve do Firebase Auth) ────────────────────────────
// Mantido aqui para que noticias.js e votacao.js possam ler o usuário
// sem importar auth.js (que criaria o círculo).
export function getCurrentUserState()       { return _currentUser; }
export function setCurrentUserState(user)   { _currentUser = user; }
