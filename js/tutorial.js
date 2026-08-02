/* ============ 新手教学（自包含模块，不依赖 app.js） ============ */
const TUTORIALS = [
  {
    id: "basics",
    icon: "📜",
    title: "基本规则",
    subtitle: "三分钟看懂这个游戏",
    content: `
<h3>游戏目标：两种赢法</h3>
<p>德州扑克的目标是赢下底池（桌上的所有筹码），只有两种方式：</p>
<ul>
  <li><b>摊牌最大</b>：打到最后，用手中的牌组成最大的牌型</li>
  <li><b>逼所有人弃牌</b>：你下注或加注到对手不敢跟，他们全部弃牌，你直接收下底池——<b>不需要亮牌</b></li>
</ul>
<div class="tip-box">记住第二点：<b>诈唬的合法性</b>就建立在这里——让对手弃掉比你好的牌，也是一种胜利。这也是 GTO 策略存在的意义。</div>

<h3>盲注：游戏的引擎</h3>
<p>每手牌开始前，按钮位（BTN）左手边的两位玩家强制投入：<b>小盲（SB）</b>和<b>大盲（BB）</b>（大盲通常是下注单位，如 2bb 里的 "bb" 就是大盲）。</p>
<p>盲注保证每个底池都有钱可抢，否则大家都弃牌就永远没人下注了。</p>

<h3>四条街：一手牌的完整流程</h3>
<div class="svg-box">
<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg">
  <g font-size="12" text-anchor="middle">
    <rect x="10" y="20" width="70" height="52" rx="8" fill="#1d6b3d" stroke="#d4af37" stroke-width="1.5"/>
    <text x="45" y="42" fill="#f0d479">翻前</text>
    <text x="45" y="60" fill="#e8e6df" font-size="10">发 2 张底牌</text>
    <rect x="90" y="20" width="70" height="52" rx="8" fill="#1d6b3d" stroke="#d4af37" stroke-width="1.5"/>
    <text x="125" y="42" fill="#f0d479">翻牌</text>
    <text x="125" y="60" fill="#e8e6df" font-size="10">发 3 张公共牌</text>
    <rect x="170" y="20" width="70" height="52" rx="8" fill="#1d6b3d" stroke="#d4af37" stroke-width="1.5"/>
    <text x="205" y="42" fill="#f0d479">转牌</text>
    <text x="205" y="60" fill="#e8e6df" font-size="10">发第 4 张</text>
    <rect x="250" y="20" width="62" height="52" rx="8" fill="#1d6b3d" stroke="#d4af37" stroke-width="1.5"/>
    <text x="281" y="42" fill="#f0d479">河牌</text>
    <text x="281" y="60" fill="#e8e6df" font-size="10">发第 5 张</text>
    <text x="45" y="100" fill="#9aa79f" font-size="10">每人 2 张</text>
    <text x="125" y="100" fill="#9aa79f" font-size="10">3 张公共牌</text>
    <text x="205" y="100" fill="#9aa79f" font-size="10">4 张公共牌</text>
    <text x="281" y="100" fill="#9aa79f" font-size="10">5 张公共牌</text>
    <text x="160" y="130" fill="#f0d479" font-size="11">每发一次牌 → 一轮下注 → 下一街</text>
    <text x="160" y="145" fill="#9aa79f" font-size="10">河牌下注结束后摊牌比大小</text>
  </g>
</svg>
</div>
<ul>
  <li><b>翻前</b>：每人发 2 张底牌（只有自己能看到），枪口位（UTG）先行动</li>
  <li><b>翻牌</b>：发 3 张公共牌（所有人共享），按钮位左手边第一个仍在局的玩家先行动</li>
  <li><b>转牌</b>：发第 4 张公共牌</li>
  <li><b>河牌</b>：发第 5 张公共牌，这是最后一轮下注</li>
  <li><b>摊牌</b>：河牌下注结束后，仍在局的玩家亮牌，最大牌型赢下底池</li>
</ul>
<div class="tip-box">每轮下注可以<b>过牌</b>（没人下注时）或<b>下注</b>；有人下注后，你可以<b>跟注</b>、<b>加注</b>或<b>弃牌</b>。如果所有人弃牌只剩一人，他直接赢走底池。</div>

<h3>下注规则（无限注）</h3>
<ul>
  <li><b>最小加注</b>：必须至少加一个"上一个下注或加注"的金额。比如对手下注 10，你加注至少要到 20</li>
  <li><b>无上限</b>：只要筹码够，你可以加注到任意数量，包括<b>全下</b></li>
  <li><b>全下跟注</b>：对手全下而你筹码不够跟，可以只投入剩余筹码，最后只争你投入的那部分底池</li>
</ul>

<h3>牌型大小（从大到小）</h3>
<table class="teach-table">
  <tr><th>牌型</th><th>例子</th><th>说明</th></tr>
  <tr><td>皇家同花顺</td><td>A♠K♠Q♠J♠10♠</td><td>最大的同花顺</td></tr>
  <tr><td>同花顺</td><td>9♥8♥7♥6♥5♥</td><td>同花且连续</td></tr>
  <tr><td>四条</td><td>K♣K♦K♥K♠3♦</td><td>四张相同</td></tr>
  <tr><td>葫芦</td><td>Q♣Q♦Q♥7♠7♦</td><td>三条 + 一对</td></tr>
  <tr><td>同花</td><td>A♥J♥7♥4♥2♥</td><td>五张同花色</td></tr>
  <tr><td>顺子</td><td>8♠7♦6♣5♥4♠</td><td>五张连续</td></tr>
  <tr><td>三条</td><td>J♠J♦J♥A♣5♦</td><td>三张相同</td></tr>
  <tr><td>两对</td><td>10♠10♦7♣7♥A♦</td><td>两对 + 踢脚</td></tr>
  <tr><td>一对</td><td>9♠9♦K♥Q♣4♠</td><td>一对 + 三张踢脚</td></tr>
  <tr><td>高牌</td><td>A♠J♦8♣5♥2♠</td><td>什么牌型都没有</td></tr>
</table>

<h3>新手最容易懵的三个细节</h3>
<ul>
  <li><b>顺子的 A 可高可低</b>：A-K-Q-J-10 是最大的顺子，A-2-3-4-5 是最小的顺子（轮子），但 Q-K-A-2-3 不算顺子</li>
  <li><b>7 选 5</b>：你手里的 2 张牌 + 桌上的 5 张公共牌，<b>选最好的 5 张</b>比大小，不是全部都要</li>
  <li><b>踢脚</b>：牌型相同时比"踢脚"（剩余牌里最大的牌）。比如都是两对 A 和 8，你的踢脚 K 大于对手的 Q，你赢</li>
</ul>

<h3>一手牌的完整流程示例</h3>
<div class="example-box">
你拿 A♠K♠，翻前加注到 3bb，两人跟注。<br>
翻牌 8♠6♠2♣（你有同花听牌），你下注 5bb，一人弃牌一人跟注。<br>
转牌 J♥（没中），你过牌，对手也过牌。<br>
河牌 3♠（同花成了！），你下注 12bb，对手跟注。<br>
摊牌：你的 A 高同花赢下底池。<br>
—— 这就是一手牌从翻前到摊牌的完整结构。
</div>
`,
  },
  {
    id: "language",
    icon: "🗣️",
    title: "训练器语言",
    subtitle: "先读懂题目的每一个词",
    content: `
<h3>动作四兄弟</h3>
<p>训练器里的选项永远是这几个动作，先分清它们：</p>
<ul>
  <li><b>弃牌 Fold</b>：放弃这手牌，退出底池争夺</li>
  <li><b>跟注 Call</b>：支付相同的筹码，继续玩下去</li>
  <li><b>加注 Raise</b>：在别人下注的基础上提高价格</li>
  <li><b>过牌 Check</b>：没人下注时选择不下注，把行动权交给下一位</li>
  <li><b>全下 All-in</b>：把全部筹码推入底池</li>
</ul>
<div class="tip-box">
<b>Bet 和 Raise 的区别</b>：Bet（下注）是<b>第一个</b>往底池里投钱；Raise（加注）是<b>回应别人</b>的下注并抬高价格。选项里写着 "下注 24" 说明你是第一个下注的；写着 "加注 88" 说明你要回应对手。
</div>

<h3>筹码单位 bb</h3>
<p>训练器里所有数字都以 <b>bb</b>（大盲注）为单位，不看具体金额。为什么？因为 GTO 策略和底池大小是<b>比例关系</b>，而不是绝对金额。0.5/1 的牌局和 5/10 的牌局，策略一模一样。</p>
<p>所以你会看到 "加注到 3.0bb"、"下注 24" 这样的选项——它们都是相对底池的比例。</p>

<h3>位置：谁是先手</h3>
<div class="svg-box">
<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="160" cy="90" rx="130" ry="70" fill="#14532d" stroke="#7a4a21" stroke-width="5"/>
  <g font-size="11" text-anchor="middle" fill="#e8e6df">
    <text x="160" y="25">BTN 按钮</text>
    <text x="255" y="50">SB 小盲</text>
    <text x="275" y="105">BB 大盲</text>
    <text x="200" y="158">UTG 枪口</text>
    <text x="110" y="158">HJ 劫位</text>
    <text x="45" y="105">CO 关位</text>
    <text x="45" y="50">CO 关位</text>
  </g>
</svg>
</div>
<p>六人桌位置：<b>UTG → HJ → CO → BTN → SB → BB</b>（从枪口开始行动，按钮是最后一个行动位）。越靠后行动，信息越多。</p>
<ul>
  <li><b>IP（In Position）</b>：有位置，翻牌后<b>后行动</b>——先看对手出牌再决定</li>
  <li><b>OOP（Out of Position）</b>：无位置，翻牌后<b>先行动</b>——在信息最少时先做决定</li>
</ul>
<div class="tip-box">训练器里标题写着"你 IP / 对手 OOP"，意思就是：你后行动，占着便宜；反过来你要加倍小心。</div>

<h3>怎么读动作序列</h3>
<p>题目里的一行字符，就是一手牌的"回放"：</p>
<div class="example-box">HJ 2.0bb → CO call → BTN 3bet 7.5bb → SB fold</div>
<p>翻译成人话：劫位加注到 2bb → 关位跟注 → 按钮位加注到 7.5bb → 小盲弃牌。<b>位置名 + 动作</b>，从左往右就是出牌顺序。</p>
`,
  },
  {
    id: "odds",
    icon: "🧮",
    title: "底池赔率",
    subtitle: "GTO 的第一块基石",
    content: `
<h3>一句话版本</h3>
<p><b>底池赔率 = 你能赢多少 : 你要花多少。</b>它回答一个问题：跟注这笔钱，划不划算？</p>

<h3>怎么算</h3>
<div class="example-box">
底池 32，对手下注 10，你考虑跟注：<br>
赔率 = 底池 : 跟注额 = 32 : 10 ≈ <b>3.2 : 1</b><br>
所需胜率 ≈ 跟注额 ÷ (底池 + 跟注额) = 10 ÷ 42 ≈ <b>24%</b>
</div>
<p>意思是：只要你的牌有约四分之一的机会赢，跟注就不亏。</p>

<h3>直觉化：四个档位</h3>
<table class="teach-table">
  <tr><th>赔率</th><th>所需胜率</th><th>体感</th></tr>
  <tr><td>1.5 : 1</td><td>40%</td><td>很贵，牌要好才跟</td></tr>
  <tr><td>2 : 1</td><td>33%</td><td>中等，听牌要掂量</td></tr>
  <tr><td>3 : 1</td><td>25%</td><td>不错，多数听牌可跟</td></tr>
  <tr><td>4 : 1</td><td>20%</td><td>便宜，几乎什么都能跟</td></tr>
</table>

<h3>训练器里怎么用</h3>
<p>训练器的讲解里经常出现"底池赔率约 X:1，你需要约 Y% 胜率"——这是判断跟注是否成立的核心依据。你不需要心算，但要能看懂这个逻辑：<b>赔率够，跟注；赔率不够，弃牌</b>。</p>
<div class="tip-box">
<b>常见误解</b>：赔率好 ≠ 一定跟注。如果你的牌几乎赢不了（比如对手范围全是比你大的牌），赔率再高也没用。赔率是"要不要继续"的门槛，范围是"能不能赢"的答案——两者配合使用。
</div>
`,
  },
  {
    id: "position",
    icon: "📍",
    title: "位置优势",
    subtitle: "为什么同一手牌，换个位置打法完全不同",
    content: `
<h3>位置的本质：信息</h3>
<p>扑克是<b>不完全信息博弈</b>。位置的价值在于：<b>后行动的人，看到了先行动的人的动作，再做决定</b>。IP（有位置）每轮都比 OOP（无位置）晚一步出手——这一步就是信息差。</p>
<div class="svg-box">
<svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="15" width="280" height="90" rx="12" fill="#101814" stroke="#d4af37" stroke-width="1.5"/>
  <g font-size="13" text-anchor="middle">
    <text x="90" y="45" fill="#e8e6df">OOP 先行动</text>
    <text x="90" y="68" fill="#9aa79f">（看不到信息）</text>
    <text x="90" y="88" fill="#ff8a80">劣势</text>
    <text x="230" y="45" fill="#e8e6df">IP 后行动</text>
    <text x="230" y="68" fill="#9aa79f">（看完再决定）</text>
    <text x="230" y="88" fill="#7fd4a0">优势</text>
  </g>
</svg>
</div>

<h3>位置影响什么</h3>
<ul>
  <li><b>翻前范围</b>：位置越好，可以玩的牌越多（BTN 能玩约 40% 的牌，UTG 只能玩约 15%）</li>
  <li><b>翻后控制</b>：IP 可以看对手过牌后决定是否下注，OOP 只能先表态</li>
  <li><b>价值提取</b>：IP 在河牌更容易从对手的弱牌里榨出价值</li>
</ul>

<h3>训练器里的体现</h3>
<p>你会在题目里看到：同样一手牌，<b>IP 位正确答案是下注，OOP 位正确答案是过牌</b>——不是题出错了，是位置改变了最优解。讲解里"没位置很难玩"这句话，就是 OOP 的真实代价。</p>
<div class="tip-box">
<b>一句话记忆</b>：位置是扑克里唯一不用花钱就能获得优势的方式。能拿就拿，拿不到（OOP）就收紧范围、降低期望。
</div>
`,
  },
  {
    id: "range",
    icon: "🎯",
    title: "范围思维",
    subtitle: "新手到玩家的分水岭",
    content: `
<h3>从"一手牌"到"一个范围"</h3>
<p>新手想的是：<b>我这手牌怎么打？</b><br>
玩家想的是：<b>我在这个位置、这个场景下，会用哪些牌做这个动作？</b></p>
<p>这个"哪些牌"的集合，就是<b>范围（Range）</b>。GTO 打法的核心不是某一手牌的对错，而是<b>你整个范围在不同动作里的分配是否合理</b>。</p>

<h3>为什么必须这么想</h3>
<p>对手看不见你的牌，只能通过你的动作推断你的范围。如果你的动作太"诚实"——加注就一定是强牌，过牌就一定是弱牌——对手就可以精准剥削你。</p>
<div class="tip-box">
<b>经典例子</b>：如果你只在有强牌时才加注，对手看到你加注就弃牌，你的强牌永远拿不到价值；如果你偶尔用听牌或中等牌加注，对手就不敢轻易弃牌。
</div>

<h3>怎么推断对手范围</h3>
<p>训练器讲解里最常出现的一句话是"这类场景下对手通常拿着XX"。推断的依据就一条：</p>
<p style="text-align:center"><b>动作越强 → 范围越强</b></p>
<ul>
  <li>翻前跟注 → 范围宽，什么都有</li>
  <li>翻前加注 → 范围收窄，强牌居多</li>
  <li>3bet → 更窄：大对子 + 强高张 + 少量诈唬</li>
  <li>一路过牌-跟注到河牌 → 中等成牌为主，强牌很少（强牌通常主动下注）</li>
</ul>

<h3>你的动作也代表范围</h3>
<p>训练器要求你关注的另一半：<b>你的跟注/加注/过牌，在对手眼里代表什么范围</b>。比如"跟注是防守范围的标准动作，你的牌在其中属于中等偏上强度"——这就是在告诉你：你的动作和你的牌力是否匹配。</p>
<div class="tip-box">
<b>一句话记忆</b>：每出一个动作，都在向对手发送一份"我的范围说明书"。发得越真实、越平衡，越难被剥削。
</div>
`,
  },
  {
    id: "concepts",
    icon: "✨",
    title: "进阶概念速览",
    subtitle: "遇到不慌，了解即可",
    content: `
<p>训练器讲解偶尔会出现下面几个词，这里各用两三句话讲明白，<b>不要求会用，混个脸熟</b>。</p>

<h3>极化 Polarized</h3>
<p>范围只含<b>最强牌</b>和<b>诈唬</b>，没有中间地带。河牌的大额加注通常是极化的：要么坚果，要么空气。对手极化时，你的中等牌（比如一对）就处境尴尬——打不过价值段，赢不了诈唬段。</p>

<h3>线性 Linear</h3>
<p>范围和牌力<b>按顺序排列</b>：从强到弱连续分布，没有断层。翻牌圈的小额下注通常是线性的（价值 + 中等牌一起下注）。</p>

<h3>坚果优势 Nut Advantage</h3>
<p>你的范围里拥有<b>更多"最强牌"组合</b>。比如翻牌 A-Q-7，翻前 3bet 过的人范围里更可能有 <b>AA、QQ</b> 这类坚果组合和 AK 强两对，而对手跟注范围里多是 AQ、KQ、JJ 等中等牌力——3bet 一方就握有坚果优势，可以更激进地下注。</p>

<h3>阻挡牌 Blockers</h3>
<p>你手里有某张牌，就<b>减少了对手拿到相关组合的可能性</b>。比如你手里有 A，对手拿 AA 的组合就从 6 种减到 3 种。讲解里说"KQ 有阻断效应"，就是这个意思——KQ 让对手更难拿到 KK、QQ。</p>

<h3>频率 Frequency</h3>
<p>一个动作在某个场景下应该出现的<b>比例</b>。GTO 不是"永远加注"或"永远弃牌"，而是"60% 加注、40% 跟注"这类混合策略，让对手无法预测。</p>

<div class="tip-box">
<b>使用建议</b>：这些词在讲解里出现时，你能大概知道它在说什么就行。真正掌握它们，是刷几百道题之后的事。
</div>
`,
  },
  {
    id: "guide",
    icon: "📖",
    title: "训练器使用指南",
    subtitle: "每个功能是干什么的",
    content: `
<h3>界面怎么看</h3>
<div class="svg-box">
<svg viewBox="0 0 320 190" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="160" cy="85" rx="130" ry="60" fill="#1d6b3d" stroke="#7a4a21" stroke-width="4"/>
  <rect x="115" y="55" width="20" height="28" rx="3" fill="#f7f5ef"/>
  <rect x="140" y="55" width="20" height="28" rx="3" fill="#f7f5ef"/>
  <rect x="165" y="55" width="20" height="28" rx="3" fill="#f7f5ef"/>
  <rect x="120" y="135" width="22" height="31" rx="3" fill="#f7f5ef"/>
  <rect x="147" y="135" width="22" height="31" rx="3" fill="#f7f5ef"/>
  <text x="160" y="35" font-size="11" text-anchor="middle" fill="#e8e6df">公共牌（牌面）</text>
  <text x="160" y="182" font-size="11" text-anchor="middle" fill="#e8e6df">你的手牌</text>
</svg>
</div>
<ul>
  <li><b>桌子中央</b>：公共牌（按街显示 3/4/5 张）</li>
  <li><b>桌子下方</b>：你的手牌，永远在下方</li>
  <li><b>顶部徽章</b>：对手位置和底池大小</li>
  <li><b>动作序列</b>：按翻前/翻牌/转牌/河牌分行的牌局回放</li>
</ul>

<h3>功能地图</h3>
<table class="teach-table">
  <tr><th>功能</th><th>用途</th></tr>
  <tr><td>随机练习</td><td>全街随机抽题，检验综合水平</td></tr>
  <tr><td>专项练习</td><td>按街/位置/人数/视角定向训练</td></tr>
  <tr><td>错题本</td><td>自动收录错题，支持重练（做对自动移除）</td></tr>
  <tr><td>统计</td><td>各维度正确率，低于 60% 标红提示</td></tr>
  <tr><td>代码检索</td><td>输入题目代码（如 R1024）直达指定题目</td></tr>
</table>

<h3>讲解怎么读</h3>
<p>答完题，下方出现三段式讲解，这是训练器的精华：</p>
<ul>
  <li><b>为什么正确</b>：这个动作成立的理由（范围 + 赔率 + 逻辑链）</li>
  <li><b>常见误区</b>：你最容易犯的错，以及错在哪</li>
  <li><b>一句话总结</b>：可带走的记忆点</li>
</ul>
<div class="tip-box"><b>使用方法</b>：先自己答，再读讲解对照思路；<b>不看讲解就做下一题 = 浪费</b>。</div>
`,
  },
  {
    id: "path",
    icon: "🧭",
    title: "学习路径",
    subtitle: "30 天从懵懂到有章法",
    content: `
<h3>阶段一：翻前打底（第 1 周）</h3>
<p>翻前是最好学的 GTO 部分，也是后面所有决策的地基。</p>
<ul>
  <li>专项练习 → 翻前，先刷 <b>2 人桌</b>（单挑逻辑最简单）</li>
  <li>再到 3 人、4 人桌，感受位置对范围的影响</li>
  <li>重点看讲解里"开局范围/3bet 范围"的段落</li>
</ul>

<h3>阶段二：翻牌构建（第 2 周）</h3>
<p>翻牌后策略开始分化，先学<b>翻牌圈</b>：</p>
<ul>
  <li>专项练习 → 翻牌，先 IP 视角（后行动更好理解）</li>
  <li>再切 OOP，体会"先行动"的约束</li>
  <li>关注讲解里"下注范围/过牌范围"的表述</li>
</ul>

<h3>阶段三：转牌河牌（第 3 周）</h3>
<p>转牌河牌是"计划执行"阶段：</p>
<ul>
  <li>转牌题主要看"尺度变化"（为什么这街下注变大/变小）</li>
  <li>河牌题重点理解"极化下注"和"摊牌价值"</li>
  <li>这个阶段正确率低是正常的，别气馁</li>
</ul>

<h3>每周复盘习惯</h3>
<ul>
  <li><b>错题本清零制</b>：每周把错题重练到清零</li>
  <li><b>统计页当体检报告</b>：哪个维度标红，下周就专攻哪个</li>
  <li><b>正确率目标</b>：翻前 70%+、翻牌后 60%+，就算过关</li>
</ul>

<div class="tip-box">
<b>最重要的一条</b>：训练器练的是"决策肌肉记忆"，不是"背答案"。同一道题隔两周再做，答案可能不同——不是题变了，是你对范围的理解变了。
</div>
`,
  },
];

/* ---------- 自包含渲染（不依赖 app.js） ---------- */
function TutShow() {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById("page-tutorial").classList.add("active");
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.nav === "home");
  });
  TutRenderList();
  window.scrollTo(0, 0);
}

function TutRenderList() {
  const list = document.getElementById("tutorial-list");
  const view = document.getElementById("tutorial-view");
  list.style.display = "block";
  view.style.display = "none";
  document.getElementById("tutorial-head").textContent = "新手教学";
  if (!list.children.length) {
    TUTORIALS.forEach((t, i) => {
      const item = document.createElement("div");
      item.className = "tut-item";
      item.innerHTML =
        '<span class="tut-icon">' + t.icon + "</span>" +
        '<span class="tut-info"><span class="tut-title">' + (i + 1) + ". " + t.title +
        '</span><span class="tut-sub">' + t.subtitle + "</span></span>" +
        '<span class="tut-arrow">›</span>';
      item.onclick = () => TutOpen(t.id);
      list.appendChild(item);
    });
  }
}

function TutOpen(id) {
  const t = TUTORIALS.find((x) => x.id === id);
  if (!t) return;
  document.getElementById("tutorial-head").textContent = t.title;
  document.getElementById("tutorial-list").style.display = "none";
  const view = document.getElementById("tutorial-view");
  view.innerHTML = t.content;
  view.style.display = "block";
  window.scrollTo(0, 0);
}

function TutBack() {
  // 详情页返回 → 章节列表；列表页返回 → 首页
  if (document.getElementById("tutorial-view").style.display === "block") {
    TutRenderList();
    return;
  }
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById("page-home").classList.add("active");
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.nav === "home");
  });
  window.scrollTo(0, 0);
}
