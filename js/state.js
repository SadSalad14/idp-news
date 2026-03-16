// js/state.js
// Estado global compartilhado entre módulos.
// Fica separado para evitar importações circulares.

let _reputacao   = 50;
let _currentUser = null;

export function getReputacao()        { return _reputacao; }
export function setReputacao(val)     { _reputacao = val ?? 50; }
export function incrementReputacao(n) { _reputacao += n; }

export function getCurrentUserState()     { return _currentUser; }
export function setCurrentUserState(user) { _currentUser = user; }
