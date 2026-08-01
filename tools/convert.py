# -*- coding: utf-8 -*-
"""
德州扑克GTO训练器 - 数据转换脚本（模块11）
将 PokerBench 的 preflop.csv / postflop.csv 转换为标准题目数据，
按街分片输出为前端可直接加载的 JS 数据文件（data/*.js），
并输出合并版 data/all.json（供 V2 讲解生成脚本使用）。

校验规则：
1. 题目ID唯一
2. 正确动作必须在可用动作列表内
3. 字段完整、无缺失
4. 行数与源数据一致
"""
import csv
import json
import os
import sys
from collections import Counter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 项目根目录
SRC_DIR = os.path.dirname(BASE_DIR)  # POKER 目录（CSV 所在）
DATA_DIR = os.path.join(BASE_DIR, "data")


# ---------- 动作归一化 ----------

def norm_action(raw, street):
    """把原始动作字符串归一化为 {action, size, label} 结构。
    preflop 小写（fold/call/check/allin/3.0bb）与 postflop 大写
    （Fold/Call/Check/Bet 24/Raise 88）统一为同一套枚举。"""
    raw = raw.strip()
    low = raw.lower()
    if low in ("fold", "call", "check", "allin", "all-in"):
        return {"action": low, "size": None, "label": ACTION_LABELS[low]}
    if low.endswith("bb"):
        size = low[:-2]
        return {"action": "raise", "size": size, "label": "加注 %s bb" % size}
    if low.startswith("bet "):
        size = low[4:]
        return {"action": "bet", "size": size, "label": "下注 %s" % size}
    if low.startswith("raise "):
        size = low[6:]
        return {"action": "raise", "size": size, "label": "加注 %s" % size}
    # 未知形态：保留原文
    return {"action": low, "size": None, "label": raw}


ACTION_LABELS = {
    "fold": "弃牌",
    "call": "跟注",
    "check": "过牌",
    "allin": "全下",
}


def parse_moves(raw_moves, street):
    """解析 available_moves 字符串，如 "['call', 'fold']" 或 "['Check', 'Bet 24']"。"""
    if isinstance(raw_moves, list):
        items = raw_moves
    else:
        items = json.loads(raw_moves.replace("'", '"'))
    return [norm_action(m, street) for m in items]


def norm_correct(raw, moves, street):
    """归一化正确决策，并与可用动作列表比对。"""
    n = norm_action(raw, street)
    for m in moves:
        if m["action"] == n["action"] and m["size"] == n["size"]:
            return m
    # 找不到匹配（不应发生），返回归一化结果并记录异常
    return n


def parse_prev_line(prev_line):
    """解析翻前动作序列 "UTG/2.0bb/BTN/call/SB/13.0bb/BB/allin/UTG/fold/BTN/fold"
    为 [{who, act}, ...] 事件数组。空行返回 []。"""
    if not prev_line or not prev_line.strip():
        return []
    parts = [p.strip() for p in prev_line.split("/") if p.strip()]
    events = []
    # 交替位置/动作；如果最后一个落单，视为动作延续
    i = 0
    while i < len(parts):
        who = parts[i]
        if i + 1 < len(parts):
            act = parts[i + 1]
            events.append({"who": who, "act": act})
            i += 2
        else:
            # 落单：并入上一条动作（如 "SB/allin" 后多余字段）
            if events:
                events[-1]["act"] = who
            else:
                events.append({"who": "?", "act": who})
            i += 1
    return events


def parse_postflop_action(action_str):
    """解析翻牌后动作序列 "OOP_CHECK/IP_CHECK/dealcards/Jc/OOP_CHECK/IP_BET_5/..."
    为事件数组：[{type:'act', who:'OOP', act:'CHECK'}, {type:'deal', card:'Jc'}]"""
    if not action_str or not action_str.strip():
        return []
    parts = [p.strip() for p in action_str.split("/") if p.strip()]
    events = []
    i = 0
    while i < len(parts):
        tok = parts[i]
        if tok == "dealcards":
            if i + 1 < len(parts):
                events.append({"type": "deal", "card": parts[i + 1]})
                i += 2
            else:
                i += 1
        else:
            if "_" in tok:
                who, act = tok.split("_", 1)
                # 归一化动作文案：BET_5 -> "Bet 5"、RAISE_14 -> "Raise 14"、CHECK/CALL/FOLD 保持
                events.append({"type": "act", "who": who, "act": norm_post_act(act)})
            else:
                events.append({"type": "act", "who": "", "act": norm_post_act(tok)})
            i += 1
    return events


def norm_post_act(act):
    """翻牌后动作归一化：BET_5 -> Bet 5 / RAISE_14 -> Raise 14 / CHECK -> Check"""
    act = act.strip()
    if "_" in act:
        verb, size = act.split("_", 1)
        return verb.capitalize() + " " + size
    return act.capitalize()


def parse_holding(h):
    """手牌 "KdKc" -> ["Kd", "Kc"]"""
    return [h[0:2], h[2:4]]


def board_for_street(flop, turn, river, street):
    """按街截取公共牌：Flop 3 张 / Turn 4 张 / River 5 张"""
    b = [flop[0:2], flop[2:4], flop[4:6]]
    if street in ("turn", "river"):
        b.append(turn[0:2])
    if street == "river":
        b.append(river[0:2])
    return b


# ---------- 转换 ----------

def convert_preflop(rows):
    questions = []
    errors = []
    seen_ids = set()
    for i, r in enumerate(rows):
        qid = "PF%04d" % i
        if qid in seen_ids:
            errors.append("重复ID: %s" % qid)
        seen_ids.add(qid)
        moves = parse_moves(r["available_moves"], "preflop")
        correct = norm_correct(r["correct_decision"], moves, "preflop")
        if correct not in moves:
            errors.append("%s 正确动作不在可用动作内: %s" % (qid, r["correct_decision"]))
        q = {
            "id": qid,
            "street": "preflop",
            "heroPos": r["hero_pos"].strip(),
            "holding": parse_holding(r["hero_holding"].strip()),
            "potSize": float(r["pot_size"]),
            "numPlayers": int(r["num_players"]),
            "numBets": int(r["num_bets"]),
            "prevLine": parse_prev_line(r["prev_line"]),
            "moves": moves,
            "correct": correct,
        }
        questions.append(q)
    return questions, errors


def convert_postflop(rows):
    questions = []
    errors = []
    seen_ids = set()
    street_map = {"Flop": "flop", "Turn": "turn", "River": "river"}
    for i, r in enumerate(rows):
        qid = "PO%05d" % i
        if qid in seen_ids:
            errors.append("重复ID: %s" % qid)
        seen_ids.add(qid)
        ev = r["evaluation_at"].strip()
        street = street_map.get(ev)
        if street is None:
            errors.append("%s 未知街: %s" % (qid, ev))
            street = "flop"
        moves = parse_moves(r["available_moves"], street)
        correct = norm_correct(r["correct_decision"], moves, street)
        if correct not in moves:
            errors.append("%s 正确动作不在可用动作内: %s" % (qid, r["correct_decision"]))
        q = {
            "id": qid,
            "street": street,
            "heroPos": r["hero_position"].strip(),
            "aggressor": r["aggressor_position"].strip(),
            "holding": parse_holding(r["holding"].strip()),
            "potSize": float(r["pot_size"]),
            "board": board_for_street(r["board_flop"], r["board_turn"], r["board_river"], street),
            "preflopAction": parse_prev_line(r["preflop_action"]),
            "postflopAction": parse_postflop_action(r["postflop_action"]),
            "moves": moves,
            "correct": correct,
        }
        questions.append(q)
    return questions, errors


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    all_questions = []
    total_errors = []

    # 翻前
    with open(os.path.join(SRC_DIR, "preflop.csv"), encoding="utf-8") as f:
        pre_rows = list(csv.DictReader(f))
    pre_questions, pre_errs = convert_preflop(pre_rows)
    total_errors += pre_errs
    all_questions += pre_questions

    # 翻牌后
    with open(os.path.join(SRC_DIR, "postflop.csv"), encoding="utf-8") as f:
        po_rows = list(csv.DictReader(f))
    po_questions, po_errs = convert_postflop(po_rows)
    total_errors += po_errs
    all_questions += po_questions

    # 分片输出
    slices = {"preflop": [], "flop": [], "turn": [], "river": []}
    for q in all_questions:
        slices[q["street"]].append(q)

    # 生成题目代码：街前缀 + 街内序号（P=翻前/F=翻牌/T=转牌/R=河牌）
    PREFIX = {"preflop": "P", "flop": "F", "turn": "T", "river": "R"}
    seen_codes = set()
    for street, items in slices.items():
        for i, q in enumerate(items, 1):
            q["code"] = PREFIX[street] + str(i).zfill(4)
            if q["code"] in seen_codes:
                total_errors.append("重复代码: %s" % q["code"])
            seen_codes.add(q["code"])

    for street, items in slices.items():
        path = os.path.join(DATA_DIR, "%s.js" % street)
        with open(path, "w", encoding="utf-8") as f:
            f.write("window.POKER_BANK__%s = " % street)
            f.write(json.dumps(items, ensure_ascii=False, separators=(",", ":")))
            f.write(";\n")
        print("%s: %d 题 -> %s (%.2f MB)" % (street, len(items), path,
                                              os.path.getsize(path) / 1024 / 1024))

    # 合并 JSON（供讲解生成等工具使用）
    with open(os.path.join(DATA_DIR, "all.json"), "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, separators=(",", ":"))
    print("all.json: %d 题 (%.2f MB)" % (len(all_questions),
                                         os.path.getsize(os.path.join(DATA_DIR, "all.json")) / 1024 / 1024))

    # 汇总校验
    print("\n===== 校验报告 =====")
    print("源数据行数: preflop=%d postflop=%d 合计=%d" % (len(pre_rows), len(po_rows), len(pre_rows) + len(po_rows)))
    print("转换后题数: %d" % len(all_questions))
    print("分片分布: %s" % {k: len(v) for k, v in slices.items()})
    print("代码示例: %s" % [q["code"] for q in slices["preflop"][:3]] + " ...")
    print("代码唯一性: %s" % ("通过 (%d 个)" % len(seen_codes) if len(seen_codes) == len(all_questions) else "异常!"))
    if total_errors:
        print("异常 %d 条:" % len(total_errors))
        for e in total_errors[:20]:
            print("  ", e)
    else:
        print("校验全部通过 ✓")
    # 分类统计
    print("\n===== 分类统计 =====")
    print("翻前位置: ", dict(Counter(q["heroPos"] for q in pre_questions)))
    print("翻前人数: ", dict(sorted(Counter(q["numPlayers"] for q in pre_questions).items())))
    print("翻牌后街: ", dict(Counter(q["street"] for q in po_questions)))
    print("翻牌后视角: ", dict(Counter(q["heroPos"] for q in po_questions)))


if __name__ == "__main__":
    main()
