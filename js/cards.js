/* ============ 牌局展示组件（模块1） ============ */
const Cards = (function () {
  const SUITS = { s: ["♠", false], h: ["♥", true], d: ["♦", true], c: ["♣", false] };
  const SUIT_CN = { s: "黑桃", h: "红心", d: "方块", c: "梅花" };

  function cardParts(card) {
    if (!card || card.length < 2) return { rank: "?", suit: "s", red: false, cn: "未知" };
    const rank = card[0];
    const suit = card[1].toLowerCase();
    const info = SUITS[suit] || ["?", false];
    return { rank, suit, sym: info[0], red: info[1], cn: SUIT_CN[suit] || suit };
  }

  function cardHtml(card, small) {
    const p = cardParts(card);
    return '<div class="pcard' + (p.red ? " red" : "") + (small ? " small" : "") + '">' +
      '<div class="rank">' + p.rank + '</div><div class="suit">' + p.sym + "</div></div>";
  }

  function holdingHtml(holding) {
    return holding.map((c) => cardHtml(c)).join("");
  }

  /* 标准位置环序（逆时针行动顺序） */
  const POS_ORDER = ["BTN", "SB", "BB", "UTG", "HJ", "CO"];

  /* 翻前：环形桌位。hero 固定底部，其余位置按标准环序展开 */
  function renderSeats(positions, heroPos, heroHolding) {
    const set = new Set(positions);
    set.add(heroPos);
    let ordered = POS_ORDER.filter((p) => set.has(p));
    // 以 hero 为起点重排（环序后继依次排开）
    const idx = ordered.indexOf(heroPos);
    ordered = ordered.slice(idx).concat(ordered.slice(0, idx));
    // 补齐未知位置（prev_line 解析失败的兜底）
    if (ordered.length === 0) ordered = [heroPos];

    const n = ordered.length;
    const heroAngle = 90; // 正下方
    let html = "";
    for (let i = 0; i < n; i++) {
      // 椭圆参数：横向 42%，纵向 34%，hero 固定在正下方
      const angle = ((heroAngle + i * (360 / n)) * Math.PI) / 180;
      const x = 50 + 42 * Math.cos(angle);
      const y = 50 + 34 * Math.sin(angle);
      const pos = ordered[i];
      const isHero = pos === heroPos;
      const sub = isHero ? "你" : "对手";
      html += '<div class="seat' + (isHero ? " hero" : "") + '" style="left:' + x.toFixed(1) +
        "%;top:" + y.toFixed(1) + '%"><span class="seat-main">' + pos +
        '</span><span class="seat-sub">' + sub + "</span></div>";
    }
    return html;
  }

  /* 翻牌后：我的位置永远在下方，对手在上方（桌子外） */
  function renderHeadsUp(heroPos, heroHolding) {
    const opp = heroPos === "IP" ? "OOP" : "IP";
    return (
      '<div class="seat" style="left:50%;top:-12px"><span class="seat-main">' + opp +
      '</span><span class="seat-sub">对手</span></div>' +
      '<div class="seat hero" style="left:50%;top:88%"><span class="seat-main">' + heroPos +
      '</span><span class="seat-sub">你</span></div>'
    );
  }

  /* 动作文案映射 */
  function actText(act, isHero) {
    const low = act.toLowerCase();
    const cls = isHero ? ' class="act-you"' : "";
    if (low === "call") return "<b" + cls + ">跟注</b>";
    if (low === "fold") return "<b" + cls + ">弃牌</b>";
    if (low === "check") return "<b" + cls + ">过牌</b>";
    if (low === "allin") return "<b" + cls + ">全下</b>";
    if (/^\d+(\.\d+)?bb$/i.test(low)) return "<b" + cls + ">加注到 " + low + "</b>";
    if (low.startsWith("bet ")) return "<b" + cls + ">下注 " + low.slice(4) + "</b>";
    if (low.startsWith("raise ")) return "<b" + cls + ">加注 " + low.slice(6) + "</b>";
    return "<b" + cls + ">" + act + "</b>";
  }

  /* 按街拆分翻牌后动作序列：deal 事件作为新街起点 */
  function splitPostflop(events) {
    const out = { flop: [], turn: [], river: [] };
    let cur = "flop";
    for (const ev of events) {
      if (ev.type === "deal") cur = cur === "flop" ? "turn" : "river";
      out[cur].push(ev);
    }
    return out;
  }

  /* 动作序列按街分段渲染：翻前 / 翻牌 / 转牌 / 河牌 */
  function renderActionLine(question) {
    const segs = [];
    const STREET_NAMES = { preflop: "翻前", flop: "翻牌", turn: "转牌", river: "河牌" };

    function evHtml(ev) {
      if (ev.type === "deal") {
        const p = cardParts(ev.card);
        return '<span class="deal">发牌 ' + p.rank + p.sym + "</span>";
      }
      return "<span>" + ev.who + " " + actText(ev.act, ev.who === question.heroPos) + "</span>";
    }

    function pushSeg(label, items, maxItems) {
      const list = maxItems && items.length > maxItems ? items.slice(-maxItems) : items;
      if (!list.length) return;
      const html = list.map(evHtml).join(" → ");
      segs.push('<div class="as-row"><span class="as-label">' + label +
        "</span><span class=\"as-line\">" + html + "</span></div>");
    }

    if (question.street === "preflop") {
      const line = question.prevLine || [];
      pushSeg("翻前", line, 10);
      if (line.length > 10) {
        segs.push('<div class="as-row"><span class="as-label">…</span>' +
          '<span class="as-line">动作较多，已省略前 ' + (line.length - 10) + " 个</span></div>");
      }
    } else {
      pushSeg("翻前", question.preflopAction || [], 6);
      const byStreet = splitPostflop(question.postflopAction || []);
      const order = ["flop", "turn", "river"];
      const stopIdx = { flop: 0, turn: 1, river: 2 }[question.street];
      if (stopIdx === undefined) {
        // 兜底：显示全部
      }
      for (let i = 0; i <= (stopIdx === undefined ? 2 : stopIdx); i++) {
        pushSeg(STREET_NAMES[order[i]], byStreet[order[i]]);
      }
    }
    return segs.join("");
  }

  /* 完整牌桌渲染：桌子 + 下方独立的手牌行 */
  function renderTable(question) {
    let seats;
    if (question.street === "preflop") {
      const positions = (question.prevLine || []).map((e) => e.who);
      seats = renderSeats(positions, question.heroPos, question.holding);
    } else {
      seats = renderHeadsUp(question.heroPos, question.holding);
    }

    let board = "";
    if (question.street !== "preflop") {
      board = '<div class="board-cards">' + question.board.map((c) => cardHtml(c)).join("") + "</div>";
    }
    // 底池徽章：翻前放桌心（无公共牌），翻牌后放顶部（公共牌上方）
    const potCls = question.street === "preflop" ? "pot-badge center" : "pot-badge";
    return (
      '<div class="table-wrap"><div class="table-inner">' +
      seats +
      board +
      '<div class="' + potCls + '">底池 ' + fmtPot(question.potSize) + " bb</div>" +
      "</div></div>" +
      '<div class="hero-hand"><span class="hero-hand-label">你的手牌 (' +
      question.heroPos + ")</span><span class=\"hero-cards\">" +
      holdingHtml(question.holding) + "</span></div>"
    );
  }

  function fmtPot(v) {
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  return {
    cardHtml,
    holdingHtml,
    renderTable,
    renderActionLine,
    fmtPot,
    SUITS,
  };
})();
