/* ============ 本地存储封装（模块5） ============
 * IndexedDB 结构：
 * - records: 做题记录 { id(自增), questionId, street, heroPos, numPlayers, correct, picked, ts }
 * - wrong:   错题本   { questionId(主键), street, heroPos, holding, correct, moves, count, ts }
 */
const Storage = (function () {
  const DB_NAME = "gto_trainer";
  const DB_VER = 1;
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains("records")) {
          const st = d.createObjectStore("records", { keyPath: "id", autoIncrement: true });
          st.createIndex("questionId", "questionId", { unique: false });
          st.createIndex("street", "street", { unique: false });
          st.createIndex("ts", "ts", { unique: false });
        }
        if (!d.objectStoreNames.contains("wrong")) {
          const st = d.createObjectStore("wrong", { keyPath: "questionId" });
          st.createIndex("ts", "ts", { unique: false });
        }
      };
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(store, mode, fn) {
    return openDB().then((d) => new Promise((resolve, reject) => {
      const t = d.transaction(store, mode);
      const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
      t.onerror = () => reject(t.error);
    }));
  }

  function getAll(storeName) {
    return tx(storeName, "readonly", (s) => s.getAll());
  }

  return {
    /* ---- 做题记录 ---- */
    async recordAnswer(rec) {
      const d = await openDB();
      return new Promise((resolve, reject) => {
        const t = d.transaction("records", "readwrite");
        t.objectStore("records").add(rec);
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
    },
    getRecords: () => getAll("records"),
    async getRecordIds() {
      const recs = await getAll("records");
      return new Set(recs.map((r) => r.questionId));
    },
    async clearRecords() {
      const d = await openDB();
      return new Promise((resolve, reject) => {
        const t = d.transaction("records", "readwrite");
        t.objectStore("records").clear();
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
    },

    /* ---- 错题本 ---- */
    async addWrong(item) {
      const d = await openDB();
      return new Promise((resolve, reject) => {
        const t = d.transaction("wrong", "readwrite");
        const s = t.objectStore("wrong");
        const get = s.get(item.questionId);
        get.onsuccess = () => {
          if (get.result) {
            s.put({ ...get.result, count: get.result.count + 1, ts: item.ts });
          } else {
            s.put({ ...item, count: 1 });
          }
        };
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
    },
    async removeWrong(questionId) {
      const d = await openDB();
      return new Promise((resolve, reject) => {
        const t = d.transaction("wrong", "readwrite");
        t.objectStore("wrong").delete(questionId);
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
    },
    getWrong: () => getAll("wrong"),
    async clearWrong() {
      const d = await openDB();
      return new Promise((resolve, reject) => {
        const t = d.transaction("wrong", "readwrite");
        t.objectStore("wrong").clear();
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
    },

    /* ---- 统计聚合 ---- */
    async getStats() {
      const [recs, wrong] = await Promise.all([getAll("records"), getAll("wrong")]);
      const stats = {
        total: recs.length,
        correct: recs.filter((r) => r.correct).length,
        byStreet: {},
        byPos: {},
        byPlayers: {},
        wrongCount: wrong.length,
      };
      for (const r of recs) {
        if (!stats.byStreet[r.street]) stats.byStreet[r.street] = { n: 0, ok: 0 };
        stats.byStreet[r.street].n++;
        if (r.correct) stats.byStreet[r.street].ok++;
        const key = r.heroPos;
        if (!stats.byPos[key]) stats.byPos[key] = { n: 0, ok: 0 };
        stats.byPos[key].n++;
        if (r.correct) stats.byPos[key].ok++;
        if (r.numPlayers != null) {
          const k = "人数" + r.numPlayers;
          if (!stats.byPlayers[k]) stats.byPlayers[k] = { n: 0, ok: 0 };
          stats.byPlayers[k].n++;
          if (r.correct) stats.byPlayers[k].ok++;
        }
      }
      stats.rate = stats.total ? stats.correct / stats.total : null;
      for (const g of [stats.byStreet, stats.byPos, stats.byPlayers]) {
        for (const k in g) g[k].rate = g[k].n ? g[k].ok / g[k].n : 0;
      }
      return stats;
    },

    /* ---- 导入导出 ---- */
    async exportAll() {
      const [recs, wrong] = await Promise.all([getAll("records"), getAll("wrong")]);
      return JSON.stringify({ app: "gto-trainer", ver: 1, exportedAt: Date.now(), recs, wrong }, null, 1);
    },
    async importAll(jsonStr) {
      const data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.recs) || !Array.isArray(data.wrong)) {
        throw new Error("文件格式不正确");
      }
      const d = await openDB();
      return new Promise((resolve, reject) => {
        const t = d.transaction(["records", "wrong"], "readwrite");
        const rs = t.objectStore("records");
        const ws = t.objectStore("wrong");
        for (const r of data.recs) rs.add(r);
        for (const w of data.wrong) ws.put(w);
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
    },
  };
})();
