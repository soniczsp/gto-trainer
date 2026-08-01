# -*- coding: utf-8 -*-
"""查看全量讲解生成进度。
双击「查看生成进度.bat」即可运行。"""
import json
import os
import subprocess
import time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXP_DIR = os.path.join(BASE, "explanations", "deepseek")
TOTAL = {"preflop": 1000, "flop": 635, "turn": 4097, "river": 5268}
TOTAL_ALL = sum(TOTAL.values())


def find_generator_pids():
    """查找正在运行的生成脚本进程"""
    try:
        ps = (
            "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" "
            "| Where-Object { $_.CommandLine -like '*generate_explanations*' } "
            "| Select-Object -ExpandProperty ProcessId"
        )
        out = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps],
            capture_output=True, text=True, timeout=20,
        )
        return [int(x) for x in out.stdout.split() if x.strip().isdigit()]
    except Exception:
        return []


def get_progress():
    counts = {}
    newest = 0
    # 优先读实时进度文件
    pf = os.path.join(BASE, "explanations", "progress.json")
    if os.path.exists(pf) and time.time() - os.path.getmtime(pf) < 3600:
        try:
            with open(pf, encoding="utf-8") as f:
                data = json.load(f)
            live = data.get("progress", {})
            for street in TOTAL:
                counts[street] = live.get(street, 0)
            newest = data.get("updated", 0)
            return counts, newest, True
        except Exception:
            pass
    for street, total in TOTAL.items():
        p = os.path.join(EXP_DIR, street + ".json")
        if os.path.exists(p):
            newest = max(newest, os.path.getmtime(p))
            try:
                with open(p, encoding="utf-8") as f:
                    counts[street] = len(json.load(f))
            except Exception:
                counts[street] = 0  # 正在写入，暂时读不了
        else:
            counts[street] = 0
    return counts, newest, False


def fmt_time(ts):
    if not ts:
        return "（尚无输出）"
    return time.strftime("%H:%M:%S", time.localtime(ts))


def main():
    pids = find_generator_pids()
    counts, newest, is_live = get_progress()
    done = sum(counts.values())

    print("=" * 46)
    print("  GTO 讲解生成 · 进度查看")
    print("=" * 46)
    print()
    print("  进程状态：" + ("运行中（PID %s）" % "、".join(map(str, pids)) if pids else "未运行 / 已结束"))
    print()
    print("  %-10s %8s %10s" % ("阶段", "已完成", "总数"))
    print("  " + "-" * 32)
    for street, total in TOTAL.items():
        name = {"preflop": "翻前", "flop": "翻牌", "turn": "转牌", "river": "河牌"}[street]
        print("  %-10s %8d %10d" % (name, counts[street], total))
    print("  " + "-" * 32)
    print("  %-10s %8d %10d" % ("合计", done, TOTAL_ALL))
    print()
    if TOTAL_ALL:
        print("  总进度：%.1f%%" % (done / TOTAL_ALL * 100))
    print("  最近完成：%s" % fmt_time(newest))
    print("  数据来源：" + ("实时进度（每完成一题刷新）" if is_live else "按街汇总（每条街完成时刷新）"))
    print()
    if pids:
        if done == 0:
            print("  提示：正在生成第一批题目，第一条街通常 5~10 分钟")
            print("        完成，属正常等待。")
        elif newest and time.time() - newest > 600:
            print("  提示：输出已超过 10 分钟未更新，可能网络卡住，")
            print("        脚本会自动重试，可再等几分钟观察。")
        else:
            print("  提示：文件大小在增长 / 时间在刷新，就是在正常干活。")
    else:
        print("  提示：进程已结束。若题目数不足 11000，")
        print("        说明中途停止过，可重新运行脚本继续（断点续传）。")
    print()
    print("=" * 46)


if __name__ == "__main__":
    main()
    try:
        input("\n按回车键关闭窗口...")
    except EOFError:
        pass
