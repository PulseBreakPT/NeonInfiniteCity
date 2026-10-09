const KEY = 'neon-infinite-city-save-v1';
export function freshSave(seed = Math.floor(Math.random() * 899999) + 100000) {
  return { seed, score: 0, collected: [], bestCombo: 0, totalFlights: 0 };
}
export function loadSave() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    if (!value || !Number.isSafeInteger(value.seed) || !Array.isArray(value.collected)) return freshSave();
    return { ...freshSave(value.seed), ...value, collected: value.collected.filter(x => typeof x === 'string').slice(-10000) };
  } catch { return freshSave(); }
}
export function saveGame(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* blocked/full storage: game remains playable */ }
}
