# -*- coding: utf-8 -*-
"""
德州扑克GTO训练器 - 批量讲解生成脚本（模块12，V2 后置）
为题库中每道题调用大模型生成三段式讲解，支持双模型对比：
  DeepSeek V4 Flash  -> explanations/deepseek/
  Kimi               -> explanations/kimi/

特性：
- OpenAI 兼容接口（/v1/chat/completions），零第三方依赖（仅标准库）
- 按街分片输出，断点续传（已生成的题自动跳过）
- 并发控制、失败重试
- 生成的讲解字段单独存放，不污染题目数据；前端读取 explanations 目录后即可展示

用法：
  1. 复制 config.example.json 为 config.json，填入 API key 与模型
  2. python generate_explanations.py --provider deepseek --street preflop
  3. 全量：python generate_explanations.py --provider deepseek --all
"""
import argparse
import json
import os
import sys
import threading
import time
import urllib.request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "data", "all.json")
OUT_DIR = os.path.join(BASE_DIR, "explanations")
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

STREETS = ["preflop", "flop", "turn", "river"]

PROMPT_TEMPLATE = """你是一名德州扑克GTO（博弈论最优）策略教练。请根据下面这道题的结构化信息，生成三段式讲解，帮助学员理解为什么这个动作是GTO选择。

题目信息：
- 牌局阶段：{street}
- 你的位置：{hero_pos}
- 你的手牌：{holding}
- 底池大小：{pot_size} bb
{extra}
- 可用动作：{moves}
- 正确动作：{correct}

要求：
1. 第一段「为什么正确」：基于动作序列、位置、人数、底池等客观事实，解释正确动作成为 GTO 选择的原因。
2. 第二段「常见误区」：说明学员最可能犯的错误选择是什么、为什么它不是最优。
3. 第三段「一句话总结」：用一句通俗的话总结这个场景的核心原则。
4. 严格使用以下格式输出，不要有任何其他内容：
【为什么正确】
...
【常见误区】
...
【一句话总结】
...
5. 只基于题目给出的结构化信息解释，禁止编造任何数据（如EV、范围、胜率、阻挡牌等未提供的信息），禁止使用"可能""大概"等模糊表述。
6. 语言通俗易懂，面向有基础规则知识但策略经验不足的玩家，避免过多专业术语。"""


def build_prompt(q):
    extra = ""
    if q["street"] == "preflop":
        line = q.get("prevLine") or []
        acts = " → ".join("%s %s" % (e["who"], e["act"]) for e in line) or "（无，尚未行动）"
        extra = "- 前序动作：%s\n- 人数：%d 人桌\n- 下注轮数：%d" % (
            acts, q.get("numPlayers", "?"), q.get("numBets", "?"))
    else:
        pre = " → ".join("%s %s" % (e["who"], e["act"]) for e in (q.get("preflopAction") or []))
        post = " → ".join(
            ("发牌 " + e["card"]) if e.get("type") == "deal"
            else ("%s %s" % (e["who"], e["act"]))
            for e in (q.get("postflopAction") or []))
        extra = "- 翻前动作：%s\n- 公共牌：%s\n- 翻牌后动作：%s\n- 攻防位置：你 %s / 对手 %s" % (
            pre or "（无）",
            " ".join(q.get("board") or []),
            post or "（无）",
            q.get("heroPos", "?"), q.get("aggressor", "?"))

    moves = " / ".join(m["label"] for m in q["moves"])
    return PROMPT_TEMPLATE.format(
        street={"preflop": "翻前", "flop": "翻牌", "turn": "转牌", "river": "河牌"}.get(q["street"], q["street"]),
        hero_pos=q.get("heroPos", "?"),
        holding=" ".join(q.get("holding", [])),
        pot_size=q.get("potSize", "?"),
        extra=extra,
        moves=moves,
        correct=q["correct"]["label"],
    )


def parse_explanation(text):
    """把模型输出解析为三段结构；失败则原样保存。"""
    out = {"why": "", "mistake": "", "summary": ""}
    try:
        why = text.split("【为什么正确】")[1].split("【常见误区】")[0].strip()
        mistake = text.split("【常见误区】")[1].split("【一句话总结】")[0].strip()
        summary = text.split("【一句话总结】")[1].strip()
        out = {"why": why, "mistake": mistake, "summary": summary}
    except Exception:
        out = {"why": text, "mistake": "", "summary": ""}
    return out


class Provider:
    def __init__(self, name, cfg):
        self.name = name
        self.url = cfg["base_url"].rstrip("/") + "/chat/completions"
        self.api_key = cfg["api_key"]
        self.model = cfg["model"]
        self.timeout = cfg.get("timeout", 120)

    def generate(self, prompt):
        body = json.dumps({
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 800,
        }).encode("utf-8")
        req = urllib.request.Request(self.url, data=body, method="POST", headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + self.api_key,
        })
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip()


def load_config():
    if not os.path.exists(CONFIG_FILE):
        print("未找到 config.json，请先复制 config.example.json 并填写 API key。")
        sys.exit(1)
    with open(CONFIG_FILE, encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser(description="批量生成 GTO 讲解")
    ap.add_argument("--provider", required=True, choices=["deepseek", "kimi"], help="模型供应商")
    ap.add_argument("--street", choices=STREETS, help="只生成某条街（不传则全部）")
    ap.add_argument("--all", action="store_true", help="生成全部（默认）")
    ap.add_argument("--workers", type=int, default=4, help="并发数")
    ap.add_argument("--limit", type=int, default=0, help="只生成前 N 题（调试用，0=不限制）")
    args = ap.parse_args()

    cfg = load_config()
    if args.provider not in cfg:
        print("config.json 中缺少 %s 配置" % args.provider)
        sys.exit(1)
    provider = Provider(args.provider, cfg[args.provider])

    with open(DATA_FILE, encoding="utf-8") as f:
        questions = json.load(f)

    streets = [args.street] if args.street else STREETS
    for street in streets:
        qs = [q for q in questions if q["street"] == street]
        if args.limit:
            qs = qs[: args.limit]
        out_path = os.path.join(OUT_DIR, args.provider, street + ".json")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        # 断点续传：已有结果按 id 索引
        done = {}
        if os.path.exists(out_path):
            with open(out_path, encoding="utf-8") as f:
                for item in json.load(f):
                    done[item["id"]] = item

        todo = [q for q in qs if q["id"] not in done]
        print("[%s] %s: 共 %d 题，已完成 %d，待生成 %d" % (
            provider.name, street, len(qs), len(done), len(todo)))
        if not todo:
            continue

        lock = threading.Lock()
        results = list(done.values())
        fails = []

        def work(q):
            for attempt in range(3):
                try:
                    text = provider.generate(build_prompt(q))
                    expl = parse_explanation(text)
                    item = {
                        "id": q["id"],
                        "street": q["street"],
                        "explanation": expl,
                        "raw": text,
                        "model": provider.model,
                    }
                    with lock:
                        results.append(item)
                    return
                except Exception as e:
                    if attempt == 2:
                        with lock:
                            fails.append((q["id"], str(e)))
                        print("  失败 %s: %s" % (q["id"], e))
                    else:
                        time.sleep(2 * (attempt + 1))

        from concurrent.futures import ThreadPoolExecutor
        t0 = time.time()
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            list(ex.map(work, todo))

        results.sort(key=lambda x: x["id"])
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=0)

        print("[%s] %s 完成：成功 %d / 失败 %d，耗时 %.1f 分钟" % (
            provider.name, street, len(results) - len(fails), len(fails),
            (time.time() - t0) / 60))
        if fails:
            print("  失败题目：", [x[0] for x in fails])


if __name__ == "__main__":
    main()
