/* ============ GTO 策略训练器 - 主逻辑 ============ */
(function () {
  "use strict";

  /* ---------- 题库加载（按街分片，按需加载） ---------- */
  const BANK = {
    preflop: null, flop: null, turn: null, river: null,
  };
  const BANK_ORDER = ["preflop", "flop", "turn", "river"];

  function loadBank(street) {
    if (BANK[street]) return Promise.resolve(BANK[street]);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "data/" + street + ".js?v=" + (window.POKER_DATA_VERSION || 1);
      s.onload = () => {
        BANK[street] = window["POKER_BANK__" + street] || [];
        resolve(BANK[street]);
      };
      s.onerror = () => reject(new Error("题库加载失败：" + street));
      document.head.appendChild(s);
    });
  }

  function loadBanks(streets) {
    return Promise.all(streets.map(loadBank)).then(() => streets.reduce((a, s) => a.concat(BANK[s]), []));
  }

  /* ---------- 工具 ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  const STREET_CN = { preflop: "翻前", flop: "翻牌", turn: "转牌", river: "河牌" };
  const STREET_CN_FULL = { preflop: "翻前", flop: "翻牌阶段", turn: "转牌阶段", river: "河牌阶段" };

  /* ---------- 页面路由 ---------- */
  let currentPage = "home";
  const pages = ["home", "select", "quiz", "wrong", "stats"];

  function showPage(name) {
    currentPage = name;
    for (const p of pages) {
      const el = $("page-" + p);
      if (el) el.classList.toggle("active", p === name);
    }
    document.querySelectorAll(".nav-item").forEach((b) => {
      b.classList.toggle("active", b.dataset.nav === name || (name === "quiz" && (b.dataset.nav === "home")));
    });
    if (name === "home") refreshHome();
    if (name === "wrong") renderWrong();
    if (name === "stats") renderStats();
    window.scrollTo(0, 0);
  }

  /* ---------- 加载遮罩 ---------- */
  function showLoading(text) {
    $("loading-text").textContent = text || "加载中…";
    $("loading-mask").style.display = "flex";
  }
  function hideLoading() {
    $("loading-mask").style.display = "none";
  }

  /* ---------- 题目代码检索 ---------- */
  const CODE_STREETS = { P: "preflop", F: "flop", T: "turn", R: "river" };

  async function searchQuestion(code) {
    const c = String(code || "").trim().toUpperCase();
    if (!c) return;
    const street = CODE_STREETS[c[0]];
    if (!street) {
      alert("代码格式不对：应以 P / F / T / R 开头（P=翻前 F=翻牌 T=转牌 R=河牌）");
      return;
    }
    showLoading("查找题目…");
    try {
      const bank = await loadBank(street);
      const q = bank.find((x) => x.code === c);
      if (!q) {
        alert("未找到题目 " + c + "，请检查代码后重试");
        return;
      }
      Quiz.start("search", [q]);
    } finally {
      hideLoading();
    }
  }

  /* ---------- 首页 ---------- */
  async function refreshHome() {
    try {
      const stats = await Storage.getStats();
      $("home-total").textContent = stats.total;
      $("home-rate").textContent = stats.rate == null ? "--" : Math.round(stats.rate * 100) + "%";
      $("home-wrong").textContent = stats.wrongCount;
    } catch (e) {
      /* 存储不可用时静默 */
    }
  }

  /* ---------- 专项选择 ---------- */
  const selState = { street: null, pos: null, players: null, view: null };
  let selBankCount = 0;

  function initSelect() {
    $("sel-street").querySelectorAll(".chip").forEach((c) => {
      c.classList.toggle("selected", c.dataset.street === selState.street);
    });
    buildSubChips();
  }

  function buildSubChips() {
    const group = $("sel-sub-group");
    const sub = $("sel-sub");
    const info = $("sel-info");
    const start = $("sel-start");
    if (!selState.street) {
      group.style.display = "none";
      start.style.display = "none";
      info.textContent = "";
      return;
    }
    group.style.display = "block";
    sub.innerHTML = "";
    if (selState.street === "preflop") {
      $("sel-sub-title").textContent = "筛选条件（可不选）";
      const posChips = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
      const posRow = document.createElement("div");
      posRow.className = "chip-row";
      posRow.style.marginBottom = "10px";
      ["不限", ...posChips].forEach((p) => {
        const b = document.createElement("button");
        b.className = "chip" + (selState.pos === null && p === "不限" || selState.pos === p ? " selected" : "");
        b.textContent = p === "不限" ? "位置：不限" : "位置：" + p;
        b.onclick = () => {
          selState.pos = p === "不限" ? null : p;
          buildSubChips();
        };
        posRow.appendChild(b);
      });
      const numRow = document.createElement("div");
      numRow.className = "chip-row";
      ["不限", "1", "2", "3", "4", "5"].forEach((n) => {
        const b = document.createElement("button");
        const val = n === "不限" ? null : parseInt(n, 10);
        b.className = "chip" + (selState.players === val ? " selected" : "");
        b.textContent = n === "不限" ? "人数：不限" : "人数：" + n + " 人";
        b.onclick = () => {
          selState.players = val;
          buildSubChips();
        };
        numRow.appendChild(b);
      });
      sub.appendChild(posRow);
      sub.appendChild(numRow);
    } else {
      $("sel-sub-title").textContent = "选择视角";
      const viewRow = document.createElement("div");
      viewRow.className = "chip-row";
      ["不限", "IP", "OOP"].forEach((v) => {
        const b = document.createElement("button");
        const val = v === "不限" ? null : v;
        b.className = "chip" + (selState.view === val ? " selected" : "");
        b.textContent = v === "不限" ? "视角：不限" : v + "（" + (v === "IP" ? "有位置" : "无位置") + "）";
        b.onclick = () => {
          selState.view = val;
          buildSubChips();
        };
        viewRow.appendChild(b);
      });
      sub.appendChild(viewRow);
    }
    updateSelCount();
  }

  async function updateSelCount() {
    const info = $("sel-info");
    const start = $("sel-start");
    try {
      const bank = await loadBank(selState.street);
      let count = bank.length;
      if (selState.street === "preflop") {
        if (selState.pos) count = bank.filter((q) => q.heroPos === selState.pos).length;
        if (selState.players != null) count = bank.filter((q) => q.numPlayers === selState.players).length;
        if (selState.pos && selState.players != null)
          count = bank.filter((q) => q.heroPos === selState.pos && q.numPlayers === selState.players).length;
      } else {
        if (selState.view) count = bank.filter((q) => q.heroPos === selState.view).length;
      }
      selBankCount = count;
      info.innerHTML =
        "「<b>" + STREET_CN[selState.street] + "</b>」题库共 <b>" + bank.length + "</b> 道" +
        (count !== bank.length ? "，当前筛选 <b>" + count + "</b> 道" : "");
      start.style.display = "block";
    } catch (e) {
      info.textContent = "加载失败：" + e.message;
      start.style.display = "none";
    }
  }

  /* ---------- 做题会话 ---------- */
  const Quiz = {
    mode: null,        // random / special / wrong
    queue: [],         // 题目数组
    idx: 0,
    current: null,
    answered: false,
    lastCorrect: false,
    lastStats: null,   // 会话内做对/做错统计

    start(mode, questions, stats) {
      this.mode = mode;
      this.queue = questions;
      this.idx = 0;
      this.answered = false;
      this.lastCorrect = false;
      this.lastStats = stats || { n: 0, ok: 0 };
      $("quiz-result").style.display = "none";
      $("btn-next").style.display = "none";
      $("btn-next").textContent = "下一题";
      $("btn-next").onclick = goNextDefault;
      showPage("quiz");
      if (this.queue.length === 0) {
        this.showEmpty();
        return;
      }
      this.load();
    },

    showEmpty() {
      const meta = $("quiz-meta");
      meta.textContent = "";
      $("table-area").innerHTML =
        '<div class="empty-tip">没有符合条件的题目<br>试试其他分类，或重置进度</div>';
      $("action-line").innerHTML = "";
      $("quiz-options").innerHTML = "";
      $("quiz-progress").textContent = "";
      $("quiz-result").style.display = "none";
      $("btn-next").style.display = "none";
    },

    load() {
      const q = this.queue[this.idx];
      this.current = q;
      this.answered = false;
      $("quiz-result").style.display = "none";
      $("btn-next").style.display = "none";

      // 进度
      $("quiz-progress").textContent =
        "第 " + (this.idx + 1) + " / " + this.queue.length + " 题" +
        (q.code ? " · " + q.code : "") +
        (this.lastStats.n ? " · 本次 " + this.lastStats.ok + "/" + this.lastStats.n : "");

      // 元信息
      const metaParts = [];
      if (q.street === "preflop") {
        metaParts.push('<span class="meta-tag hl">翻前</span>');
        metaParts.push('<span class="meta-tag">位置 ' + q.heroPos + "</span>");
        metaParts.push('<span class="meta-tag">' + q.numPlayers + " 人桌</span>");
        metaParts.push('<span class="meta-tag">下注轮 ' + q.numBets + "</span>");
      } else {
        metaParts.push('<span class="meta-tag hl">' + STREET_CN_FULL[q.street] + "</span>");
        metaParts.push('<span class="meta-tag">你 ' + q.heroPos + "</span>");
        metaParts.push('<span class="meta-tag">对手 ' + (q.heroPos === "IP" ? "OOP" : "IP") + "</span>");
        metaParts.push('<span class="meta-tag">进攻方 ' + q.aggressor + "</span>");
      }
      $("quiz-meta").innerHTML = metaParts.join("");

      // 牌桌
      $("table-area").innerHTML = Cards.renderTable(q);
      $("action-line").innerHTML = Cards.renderActionLine(q);

      // 选项
      const opts = $("quiz-options");
      opts.innerHTML = "";
      q.moves.forEach((m, i) => {
        const b = document.createElement("button");
        b.className = "opt-btn";
        b.innerHTML = esc(m.label);
        b.onclick = () => this.answer(i, b);
        opts.appendChild(b);
      });
    },

    answer(idx, btnEl) {
      if (this.answered) return;
      this.answered = true;
      const q = this.current;
      const picked = q.moves[idx];
      const isCorrect =
        picked.action === q.correct.action && picked.size === q.correct.size;
      this.lastCorrect = isCorrect;

      // 选项状态
      const btns = $("quiz-options").querySelectorAll(".opt-btn");
      btns.forEach((b, i) => {
        b.disabled = true;
        const m = q.moves[i];
        const isRight = m.action === q.correct.action && m.size === q.correct.size;
        if (isRight) b.classList.add("correct");
        else if (i === idx) b.classList.add("wrong");
        else b.classList.add("dimmed");
      });

      // 记录
      const rec = {
        questionId: q.id, street: q.street, heroPos: q.heroPos,
        numPlayers: q.street === "preflop" ? q.numPlayers : null,
        correct: isCorrect ? 1 : 0, picked: picked.label, ts: Date.now(),
      };
      Storage.recordAnswer(rec).catch(() => {});
      if (!isCorrect) {
        Storage.addWrong({
          questionId: q.id, code: q.code, street: q.street, heroPos: q.heroPos,
          holding: q.holding, correct: q.correct.label,
          moves: q.moves.map((m) => m.label), ts: Date.now(),
        }).catch(() => {});
      }

      this.lastStats.n++;
      if (isCorrect) this.lastStats.ok++;

      // 结果反馈
      const res = $("quiz-result");
      res.className = "quiz-result " + (isCorrect ? "ok" : "bad");
      res.innerHTML =
        '<div class="r-title">' + (isCorrect ? "✓ 回答正确" : "✗ 回答错误") + "</div>" +
        '<div class="r-line">正确动作：<span class="r-correct">' + esc(q.correct.label) + "</span></div>" +
        '<div class="r-line">你的选择：' + esc(picked.label) + "</div>";
      res.style.display = "block";

      $("btn-next").style.display = "block";
    },

    next() {
      // 错题重练：做对自动移出错题本
      if (this.mode === "wrong" && this.lastCorrect) {
        Storage.removeWrong(this.current.id).catch(() => {});
      }
      this.lastCorrect = false;
      this.idx++;
      if (this.idx >= this.queue.length) {
        const res = $("quiz-result");
        res.className = "quiz-result ok";
        res.innerHTML =
          '<div class="r-title">本组完成</div>' +
          '<div class="r-line">本次答题 ' + this.lastStats.n + " 道，正确 " + this.lastStats.ok +
          " 道（" + Math.round((this.lastStats.ok / this.lastStats.n) * 100) + "%）</div>" +
          (this.mode === "wrong" ? '<div class="r-line">答对的题已从错题本移除</div>' : "");
        res.style.display = "block";
        $("btn-next").textContent = "完成";
        $("btn-next").onclick = () => { $("btn-next").onclick = goNextDefault; showPage("home"); };
        return;
      }
      $("btn-next").onclick = goNextDefault;
      this.load();
    },
  };

  function goNextDefault() { Quiz.next(); }

  /* ---------- 启动各种练习 ---------- */
  async function startRandom() {
    showLoading("加载全量题库…");
    try {
      const all = await loadBanks(BANK_ORDER);
      const done = await Storage.getRecordIds();
      const fresh = all.filter((q) => !done.has(q.id));
      const pool = fresh.length ? fresh : all;
      const questions = shuffle(pool);
      if (!fresh.length) {
        // 全做完提示
        alert("题库已全部练完！现在进入复习模式（可重复抽题）。\n想清零记录可在首页「重置进度」。");
      }
      Quiz.start("random", questions);
    } catch (e) {
      alert("加载失败：" + e.message);
    } finally {
      hideLoading();
    }
  }

  async function startSpecial() {
    if (!selState.street) return;
    showLoading("加载题库…");
    try {
      const bank = await loadBank(selState.street);
      let pool = bank.slice();
      if (selState.street === "preflop") {
        if (selState.pos) pool = pool.filter((q) => q.heroPos === selState.pos);
        if (selState.players != null) pool = pool.filter((q) => q.numPlayers === selState.players);
      } else {
        if (selState.view) pool = pool.filter((q) => q.heroPos === selState.view);
      }
      if (!pool.length) {
        alert("该分类下没有题目");
        hideLoading();
        return;
      }
      const done = await Storage.getRecordIds();
      const fresh = pool.filter((q) => !done.has(q.id));
      const finalPool = fresh.length ? fresh : pool;
      const questions = shuffle(finalPool);
      if (!fresh.length) {
        alert("该分类已全部练完，进入复习模式。");
      }
      Quiz.start("special", questions);
    } catch (e) {
      alert("加载失败：" + e.message);
    } finally {
      hideLoading();
    }
  }

  async function startWrongRetry() {
    const wrong = await Storage.getWrong();
    if (!wrong.length) {
      alert("错题本是空的");
      return;
    }
    showLoading("加载错题…");
    try {
      const streets = [...new Set(wrong.map((w) => w.street))];
      await loadBanks(streets);
      const byId = {};
      for (const s of streets) for (const q of BANK[s]) byId[q.id] = q;
      const questions = [];
      for (const w of wrong) {
        if (byId[w.questionId]) questions.push(byId[w.questionId]);
      }
      Quiz.start("wrong", shuffle(questions));
    } catch (e) {
      alert("加载失败：" + e.message);
    } finally {
      hideLoading();
    }
  }

  /* ---------- 错题本 ---------- */
  async function renderWrong() {
    const wrong = await Storage.getWrong();
    const list = $("wrong-list");
    const empty = $("wrong-empty");
    if (!wrong.length) {
      list.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    wrong.sort((a, b) => b.ts - a.ts);
    list.innerHTML = "";
    for (const w of wrong) {
      const item = document.createElement("div");
      item.className = "wrong-item";
      const holding = w.holding.map((c) => {
        const red = "hd".includes((c[1] || "").toLowerCase());
        return '<span class="' + (red ? "red" : "") + '">' + esc(c) + "</span>";
      }).join(" ");
      item.innerHTML =
        '<div class="wi-top"><div class="wi-tags">' +
        '<span class="wi-tag">' + esc(w.code || w.questionId) + "</span>" +
        '<span class="wi-tag">' + STREET_CN[w.street] + "</span>" +
        '<span class="wi-tag">' + esc(w.heroPos) + "</span>" +
        '<span class="wi-tag">错 ' + (w.count || 1) + " 次</span>" +
        "</div><span class='wi-holding'>" + holding + "</span></div>" +
        '<div class="wi-bottom"><span>正确：<span class="wi-answer">' + esc(w.correct) +
        '</span></span><span class="wi-del">删除</span></div>';
      item.onclick = () => retryOne(w);
      item.querySelector(".wi-del").onclick = (e) => {
        e.stopPropagation();
        Storage.removeWrong(w.questionId).then(renderWrong);
      };
      list.appendChild(item);
    }
  }

  async function retryOne(w) {
    // 从该错题开始重练
    const wrong = await Storage.getWrong();
    const streets = [...new Set(wrong.map((x) => x.street))];
    await loadBanks(streets);
    const byId = {};
    for (const s of streets) for (const q of BANK[s]) byId[q.id] = q;
    const target = byId[w.questionId];
    if (!target) return;
    const others = wrong.filter((x) => x.questionId !== w.questionId)
      .map((x) => byId[x.questionId]).filter(Boolean);
    Quiz.start("wrong", shuffle([target, ...others]));
  }

  /* ---------- 统计 ---------- */
  async function renderStats() {
    const stats = await Storage.getStats();
    const body = $("stats-body");
    if (!stats.total) {
      body.innerHTML = '<div class="stats-empty">还没有做题记录<br>开始练习后这里会展示你的薄弱点</div>';
      return;
    }
    const rate = Math.round(stats.rate * 100);
    let html =
      '<div class="stats-total">' +
      '<div class="stat-card"><div class="stat-num">' + stats.total + '</div><div class="stat-label">总做题数</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + rate + '%</div><div class="stat-label">总正确率</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + stats.wrongCount + '</div><div class="stat-label">错题数</div></div>' +
      "</div>";

    html += barCard("按牌局阶段", stats.byStreet, (k) => STREET_CN[k]);
    if (Object.keys(stats.byPos).length) {
      html += barCard("按位置 / 视角", stats.byPos, (k) => k);
    }
    if (Object.keys(stats.byPlayers).length) {
      html += barCard("按人数", stats.byPlayers, (k) => k);
    }
    body.innerHTML = html;
  }

  function barCard(title, groups, nameFn) {
    let html = '<div class="stats-card"><h3>' + title + "</h3>";
    const entries = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], "zh"));
    let has = false;
    for (const [k, g] of entries) {
      if (!g.n) continue;
      has = true;
      const pct = Math.round(g.rate * 100);
      const warn = g.rate < 0.6;
      html +=
        '<div class="bar-row"><div class="bar-top"><span class="bar-name">' + esc(nameFn(k)) +
        '</span><span class="bar-val' + (warn ? " warn" : "") + '">' + pct + "% (" + g.ok + "/" + g.n + ")" +
        (warn ? " 建议重点练习" : "") + "</span></div>" +
        '<div class="bar-track"><div class="bar-fill' + (warn ? " warn" : "") +
        '" style="width:' + pct + '%"></div></div></div>';
    }
    if (!has) html += '<div class="stats-empty" style="padding:12px 0">暂无数据</div>';
    return html + "</div>";
  }

  /* ---------- 导出 / 导入 / 重置 ---------- */
  function exportData() {
    Storage.exportAll().then((jsonStr) => {
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
      a.href = url;
      a.download = "gto-trainer-record-" + stamp + ".json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Storage.importAll(String(reader.result)).then(() => {
          alert("导入成功");
          refreshHome();
        });
      } catch (e) {
        alert("导入失败：" + e.message);
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!confirm("确定清空所有做题记录和错题本？此操作不可恢复。")) return;
    Promise.all([Storage.clearRecords(), Storage.clearWrong()]).then(() => {
      alert("已重置");
      refreshHome();
    });
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    document.querySelectorAll("[data-goto]").forEach((b) => {
      b.onclick = () => {
        const g = b.dataset.goto;
        if (g === "random") startRandom();
        else if (g === "select") { initSelect(); showPage("select"); }
        else if (g === "wrong") showPage("wrong");
        else if (g === "stats") showPage("stats");
      };
    });

    document.querySelectorAll("[data-back]").forEach((b) => {
      b.onclick = () => showPage("home");
    });

    document.querySelectorAll(".nav-item").forEach((b) => {
      b.onclick = () => {
        const n = b.dataset.nav;
        if (n === "select") initSelect();
        showPage(n);
      };
    });

    $("sel-street").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      selState.street = chip.dataset.street;
      selState.pos = null;
      selState.players = null;
      selState.view = null;
      initSelect();
    });

    $("sel-start").onclick = startSpecial;

    $("code-search-btn").onclick = () => searchQuestion($("code-input").value);
    $("code-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchQuestion($("code-input").value);
    });

    $("btn-next").onclick = goNextDefault;

    $("btn-export").onclick = exportData;
    $("btn-import").onclick = () => $("import-file").click();
    $("import-file").onchange = (e) => {
      if (e.target.files.length) importData(e.target.files[0]);
      e.target.value = "";
    };
    $("btn-reset").onclick = resetAll;

    $("btn-wrong-retry").onclick = startWrongRetry;
    $("btn-wrong-clear").onclick = () => {
      if (!confirm("确定清空错题本？")) return;
      Storage.clearWrong().then(renderWrong);
    };
  }

  /* ---------- 启动 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    refreshHome();
    showPage("home");
  });
})();
