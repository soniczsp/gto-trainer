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

PROMPT_TEMPLATE = """你是资深德州扑克GTO（博弈论最优）策略教练。学员有半年以上牌龄，正在微/小级别现金局练习，目标是建立GTO打底思维。你只根据本题数据讲解，不编造任何数据。

【题目数据】
牌局阶段：{street}
你的位置：{hero_pos}
你的手牌：{holding}
底池：{pot_size} bb
{extra}
可用动作：{moves}
正确答案：{correct}

【讲解规则】
1.【为什么正确】按以下顺序论证：
   a. 推断对手大致范围：基于动作序列与位置，用"这类场景下对手通常拿着XX"的表述；范围强度必须与行动强度一致（动作越强，范围越强）
   b. 引用题目事实与底池赔率：题目能算出赔率时必须实际计算并引用，算不出就完全不提数字
   c. 讲我方正确动作代表的范围：这个动作属于哪种范围（宽防守/极化/线性/价值或诈唬偏重），以及你的手牌在这个范围里扮演什么角色（如"跟注范围里的中等强度牌"）
   d. 对照双方范围与赔率，得出动作结论
2.【常见误区】：分析题目中真实出现的错误选项，重点写两类错误：误判对手范围（高估或低估对方牌力），或把手牌放错自己的范围（如把应跟注的牌拿去加注）
3.【一句话总结】：不超过30字，口语化，便于记忆
4. 范围描述规范：
   - 双方范围都必须基于题目动作序列推断，禁止凭空设定对手范围
   - 翻前允许引用标准范围表的近似值（如"约前20%的开局范围"）；翻牌后只用定性档位（紧/宽/极化/线性的成牌或听牌结构）与代表性手牌（"可能包括XX"）
   - 禁止编造精确百分比、组合数、EV、胜率等具体数据
   - 事实与算术层必须用肯定句；范围与原理层允许"通常/这类场景"表述
5. 每段60~150字，语言通俗，术语点到为止
6. 全程以"你"为第一视角描述（如"你在HJ位开局2bb，被CO加注到6.5bb"），动作序列里的位置名不要混淆
7. 论证过程自然衔接成文，不要使用a/b/c/d等编号
8. 严格按此格式输出，不要输出其他内容：
【为什么正确】
...
【常见误区】
...
【一句话总结】
...

【示例一·翻前】你 BB 位手持 KQo，HJ 开局加注 2bb，底池 5.5bb，选项[跟注/加注 6.5bb/弃牌]，正确答案：跟注
【为什么正确】HJ 位开局通常拿着约前 20% 的范围，含大量 AX、同花连张和中等口袋对。你在 BB 位以 3.5bb 跟注，底池赔率约 1.6:1。跟注是 BB 防守范围的标准动作，这个范围本身偏宽，KQo 在其中属于中等偏上的强度，既能压制对手范围的 QJ、KT 等牌，又不会像加注那样把被你压制的牌赶走。这类场景下跟注看翻牌是最稳的选择。
【常见误区】常见错误是把 KQo 拿去加注：加注是极化范围的动作，KQo 对抗对手跟注范围时经常被 AX 压制，翻后没位置很难玩；另一个错误是直接弃牌，低估了 BB 防守范围的宽度。
【一句话总结】BB 位面对中位开局，KQo 跟注看翻牌最稳。

【示例二·翻牌后】河牌，你 IP 位手持 88，底池 32，公共牌 Ks7h2d Jc 7c，对手翻前平跟后三条街一直过牌，河牌突然下注 24，选项[过牌/下注 24]，正确答案：过牌
【为什么正确】对手翻前平跟、一路过牌到河牌，范围里有大量中等成牌和破灭的听牌，河牌突然下注代表范围极化，主要是 K 牌和诈唬。你的 88 只能赢诈唬、打不过价值段，摊牌价值有限。过牌是正确选择，你的过牌范围本来也包含大量中等对子，不需要用 88 主动下注去隔离一个极化范围。
【常见误区】常见错误是跟注，觉得底池赔率不错；但对手河牌下注的范围里诈唬占比并不足以支撑跟注，88 在这种极化下注面前基本是抓诈唬的边缘牌。
【一句话总结】对手河牌突然极化，88 过牌摊牌就好。"""


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
        opp = "OOP" if q.get("heroPos") == "IP" else "IP"
        extra = "- 翻前动作：%s\n- 公共牌：%s\n- 翻牌后动作：%s\n- 攻防位置：你 %s / 对手 %s（进攻方 %s）" % (
            pre or "（无）",
            " ".join(q.get("board") or []),
            post or "（无）",
            q.get("heroPos", "?"), opp, q.get("aggressor", "?"))

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
            # 关闭思考模式：讲解生成不需要 CoT，更快且避免额外 token
            "thinking": {"type": "disabled"},
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
    ap.add_argument("--limit", type=int, default=0, help="只取前 N 题（调试用，0=不限制）")
    ap.add_argument("--sample", type=int, default=0, help="随机抽样 N 题（固定种子，便于复现）")
    ap.add_argument("--force", action="store_true", help="忽略已有结果，重新生成")
    ap.add_argument("--progress-file", default=None, help="实时进度文件（每完成一题更新一次）")
    ap.add_argument("--batch-size", type=int, default=0, help="每批最多生成 N 题，跑完自动退出（0=不限制）")
    args = ap.parse_args()

    cfg = load_config()
    if args.provider not in cfg:
        print("config.json 中缺少 %s 配置" % args.provider)
        sys.exit(1)
    provider = Provider(args.provider, cfg[args.provider])

    with open(DATA_FILE, encoding="utf-8") as f:
        questions = json.load(f)

    streets = [args.street] if args.street else STREETS
    batch_done = 0
    for street in streets:
        if args.batch_size and batch_done >= args.batch_size:
            print("已达到本批上限 %d 题，停止。" % args.batch_size)
            break
        qs = [q for q in questions if q["street"] == street]
        if args.sample:
            import random
            random.seed(20260801)
            qs = random.sample(qs, min(args.sample, len(qs)))
        elif args.limit:
            qs = qs[: args.limit]
        out_path = os.path.join(OUT_DIR, args.provider, street + ".json")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        # 断点续传：已有结果按 id 索引
        done = {}
        if os.path.exists(out_path) and not args.force:
            with open(out_path, encoding="utf-8") as f:
                for item in json.load(f):
                    done[item["id"]] = item
        if args.force:
            done = {}

        todo = [q for q in qs if q["id"] not in done]
        if args.batch_size:
            remaining = args.batch_size - batch_done
            if remaining <= 0:
                print("已达到本批上限 %d 题，停止。" % args.batch_size)
                break
            todo = todo[:remaining]
        print("[%s] %s: 共 %d 题，已完成 %d，待生成 %d" % (
            provider.name, street, len(qs), len(done), len(todo)))
        if not todo:
            continue

        lock = threading.Lock()
        results = list(done.values())
        fails = []

        progress = {s: 0 for s in STREETS}

        def save_progress():
            if args.progress_file:
                try:
                    with open(args.progress_file, "w", encoding="utf-8") as f:
                        json.dump({"updated": time.time(), "progress": progress}, f)
                except Exception:
                    pass

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
                        progress[street] += 1
                        save_progress()
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
        batch_done += len(todo) - len(fails)

        print("[%s] %s 完成：成功 %d / 失败 %d，耗时 %.1f 分钟" % (
            provider.name, street, len(results) - len(fails), len(fails),
            (time.time() - t0) / 60))
        if fails:
            print("  失败题目：", [x[0] for x in fails])


if __name__ == "__main__":
    main()
