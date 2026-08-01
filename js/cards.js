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
      const angle = ((heroAngle + i * (360 / n)) * Math.PI) / 180;
      const x = 50 + 36 * Math.cos(angle);
      const y = 50 + 34 * Math.sin(angle);
      const pos = ordered[i];
      const isHero = pos === heroPos;
      const sub = isHero ? "你" : "对手";
      html += '<div class="seat' + (isHero ? " hero" : "") + '" style="left:' + x.toFixed(1) +
        "%;top:" + y.toFixed(1) + '%"><span class="seat-main">' + pos +
        '</span><span class="seat-sub">' + sub + "</span></div>";
    }
    // hero 手牌（底部）
    html += '<div class="hero-cards">' + holdingHtml(heroHolding) + "</div>";
    return html;
  }

  /* 翻牌后：IP/OOP 对坐 */
  function renderHeadsUp(heroPos, heroHolding) {
    const opp = heroPos === "IP" ? "OOP" : "IP";
    return (
      '<div class="seat hero" style="left:50%;top:86%"><span class="seat-main">' + heroPos +
      '（你）</span></div>' +
      '<div class="seat" style="left:50%;top:14%"><span class="seat-main">' + opp +
      "（对手）</span></div>" +
      '<div class="hero-cards">' + holdingHtml(heroHolding) + "</div>"
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

  function renderActionLine(question) {
    const parts = [];
    // 翻前动作
    if (question.street === "preflop") {
      for (const ev of question.prevLine || []) {
        parts.push('<span>' + ev.who + " " + actText(ev.act, ev.who === question.heroPos) + "</span>");
      }
    } else {
      // 翻牌后：先显示简短的翻前动作，再显示翻牌后动作
      for (const ev of (question.preflopAction || []).slice(-4)) {
        parts.push('<span>' + ev.who + " " + actText(ev.act, false) + "</span>");
      }
      if ((question.preflopAction || []).length > 4) {
        parts.unshift('<span class="deal">…</span>');
      }
      if ((question.postflopAction || []).length) {
        parts.push('<span class="deal">▸ 翻牌后</span>');
      }
      for (const ev of question.postflopAction || []) {
        if (ev.type === "deal") {
          const p = cardParts(ev.card);
          parts.push('<span class="deal">发牌 ' + p.rank + p.sym + "</span>");
        } else {
          parts.push("<span>" + ev.who + " " + actText(ev.act, ev.who === question.heroPos) + "</span>");
        }
      }
    }
    return parts.join(" → ");
  }

  /* 完整牌桌渲染 */
  function renderTable(question) {
    const stageName = { preflop: "翻前", flop: "翻牌", turn: "转牌", river: "河牌" }[question.street];
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
    const potLabel = question.street === "preflop" ? "底池" : "底池";
    return (
      '<div class="table-wrap"><div class="table-inner">' +
      seats +
      board +
      (question.street !== "preflop" ? '<div class="board-label">' + stageName + "公共牌</div>" : "") +
      '<div class="pot-badge"><small>' + potLabel + "</small>" + fmtPot(question.potSize) + " bb</div>" +
      "</div></div>"
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
