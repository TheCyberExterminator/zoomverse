// Shared progress saved to localStorage so stars carry across all three modes.
const KEY = "zoomverse.save";
const DEFAULT = { stars: 0, completed: {} };

export const Save = {
  load() {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
    catch { return { ...DEFAULT }; }
  },
  save(d) { localStorage.setItem(KEY, JSON.stringify(d)); },

  // award a level's reward once; replaying does not re-award
  complete(key, reward) {
    const d = this.load();
    d.completed = d.completed || {};
    if (d.completed[key]) return { awarded: false, stars: d.stars, reward: 0 };
    d.completed[key] = true;
    d.stars = (d.stars || 0) + reward;
    this.save(d);
    return { awarded: true, stars: d.stars, reward };
  },

  reset() { this.save({ stars: 0, completed: {}, upgrades: {} }); },

  // ----- garage upgrades: 6 tracks x 5 levels, costs match the tracker -----
  UPGRADE_COSTS: [10, 20, 35, 55, 80],
  level(key) { const d = this.load(); return (d.upgrades && d.upgrades[key]) || 0; },
  buy(key) {
    const d = this.load();
    d.upgrades = d.upgrades || {};
    const lvl = d.upgrades[key] || 0;
    if (lvl >= 5) return { ok: false, reason: "max", stars: d.stars };
    const cost = this.UPGRADE_COSTS[lvl];
    if ((d.stars || 0) < cost) return { ok: false, reason: "stars", stars: d.stars, cost };
    d.stars -= cost; d.upgrades[key] = lvl + 1;
    this.save(d);
    return { ok: true, level: lvl + 1, stars: d.stars };
  },

  // ----- settings (volumes 0..1, camera distance 0..1) -----
  getSettings() {
    const d = this.load();
    return { music: 0.6, sfx: 0.8, camDist: 0.5, ...(d.settings || {}) };
  },
  setSetting(key, val) {
    const d = this.load();
    d.settings = { music: 0.6, sfx: 0.8, camDist: 0.5, ...(d.settings || {}) };
    d.settings[key] = val;
    this.save(d);
  },

  // best lap/race time per level (lower is better)
  best(key, time) {
    const d = this.load();
    d.best = d.best || {};
    const prev = d.best[key];
    if (prev === undefined || time < prev) { d.best[key] = time; this.save(d); return { best: time, improved: true }; }
    return { best: prev, improved: false };
  },
};
