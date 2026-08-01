# 德州扑克 GTO 策略训练器

基于 PokerBench 全量预求解数据集（11000 道题）的离线策略训练工具。
纯前端应用，双击即可使用，数据与进度全部保存在本机浏览器，不联网、不上传。

## 快速开始

**直接双击 `index.html`** 即可打开使用（建议 Chrome / Edge 浏览器）。
手机端也可使用：把整个文件夹放到手机（或局域网共享），用浏览器打开 index.html。

## 功能

| 功能 | 说明 |
|------|------|
| 随机练习 | 四条街全库随机抽题，优先抽未做过的题，做完一轮自动进入复习模式 |
| 专项练习 | 先选阶段（翻前/翻牌/转牌/河牌），翻前可按位置、人数筛选；翻牌后可按 IP/OOP 视角筛选 |
| 动态选项 | 选项与尺度完全来自求解数据，如「下注 24」「加注 88」「加注 3.0bb」「全下」 |
| 结果反馈 | 选后立即显示对错与正确动作，正确变绿、错误变红 |
| 错题本 | 答错自动收录，支持单题回顾、重练（做对自动移除）、手动删除 |
| 统计 | 总正确率、各阶段/位置/人数正确率，低于 60% 标红提示重点练习 |
| 进度保存 | 自动存入浏览器 IndexedDB，刷新不丢失；支持导出/导入记录文件 |
| 讲解（V2） | 前端已预留讲解展示位，生成讲解数据后自动显示三段式讲解 |

## 题库数据

| 分片 | 题数 | 说明 |
|------|------|------|
| 翻前 preflop | 1000 | 6 位置 × 1~5 人桌，含 open / 3bet / 4bet / allin / 大盲防守等场景 |
| 翻牌 flop | 635 | 干湿面、对子面、连张面等 |
| 转牌 turn | 4097 | — |
| 河牌 river | 5268 | — |

数据源：PokerBench（AAAI 2025 德州扑克评测基准）公开预求解数据集。
转换脚本 `tools/convert.py` 完成字段归一化与四重校验（ID 唯一、正确动作必在可用动作内、字段完整、数量一致），全部通过。

## 目录结构

```
V DEEPSEEK V4 FLASH/
├── index.html              # 应用入口，双击打开
├── css/style.css           # 样式
├── js/
│   ├── storage.js          # IndexedDB 本地存储封装
│   ├── cards.js            # 牌局展示（桌位/手牌/公共牌/动作序列）
│   └── app.js              # 页面与做题逻辑
├── data/                   # 按街分片题库（js 格式，前端按需加载）
│   ├── preflop.js  flop.js  turn.js  river.js  all.json
└── tools/
    ├── convert.py          # CSV → 题库转换与校验（模块11）
    ├── generate_explanations.py  # V2 讲解批量生成（模块12）
    └── config.example.json # 讲解生成 API 配置模板
```

## V2 讲解生成（可选，后置模块）

V1 核心训练闭环不依赖讲解。需要讲解时：

1. 复制 `tools/config.example.json` 为 `tools/config.json`，填入 API Key
2. 生成（DeepSeek 与 Kimi 双模型各一份，便于对比择优）：
   ```
   python tools/generate_explanations.py --provider deepseek --all
   python tools/generate_explanations.py --provider kimi --all
   ```
3. 输出到 `explanations/deepseek/` 与 `explanations/kimi/`，按街分片，支持断点续传
4. 前端会在题目有讲解字段时自动展示三段式讲解（为什么正确 / 常见误区 / 一句话总结）

> 注意：生成 11000 道题的讲解需要调用大模型 API，会产生费用，建议先用 `--limit 20 --street preflop` 试跑小批量。

## 其他

- 进度重置：首页底部「重置进度」，清空做题记录与错题本
- 换设备：首页「导出记录」生成 json 文件，新设备「导入记录」即可迁移
- 合规：本工具仅用于策略训练与智力运动练习，不含任何现金/赌博相关内容
