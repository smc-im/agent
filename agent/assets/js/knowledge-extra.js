/* =========================================================
   PHYS·LAB knowledge pack 02 — angular momentum, Bernoulli,
   Cavendish torsion balance
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;

  const icon = {
    angular: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 13h16M7 10.5V13M17 10.5V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="4" cy="14.5" r="2" stroke="currentColor" stroke-width="1.3"/><circle cx="20" cy="14.5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M8.5 5.4a5.2 5.2 0 0 1 7 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="m15.2 3.7.8 1.8-2 .3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="13" r="1.2" fill="currentColor"/></svg>',
    bernoulli: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 8.5h4.5c1.2 0 1.8 1.5 2.2 3.5.5 2.5 1.1 3.5 2.3 3.5h4c1.2 0 1.8-1 2.3-3.5.4-2 1-3.5 2.2-3.5H21" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M3 15.5h4.5c1.2 0 1.8-1.5 2.2-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".55"/><path d="M7 6.2h2M13 6.2h2M18.5 6.2h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".55"/><path d="M5 12h2M10.8 12h2.4M17 12h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    cavendish: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.8v5.3M4 8.1h16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M12 8.1v8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M4.2 16.1h15.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="5.5" cy="16.1" r="1.7" stroke="currentColor" stroke-width="1.3"/><circle cx="18.5" cy="16.1" r="1.7" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="8.1" r="1.1" fill="currentColor"/><path d="M12 3.8h4.5" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity=".6"/></svg>'
  };

  const extra = [
    {
      id: 'angular-momentum',
      order: 7,
      name: '角动量守恒',
      en: 'Angular Momentum Conservation',
      enShort: 'Angular Momentum',
      category: '力学',
      icon: icon.angular,
      accent: '#7ddcff',
      tagline: '转动惯量 · 收臂加速 · L = Iω',
      subtitle: '转动惯量 · 收臂加速 · L = Iω',
      tags: ['转动惯量', '角动量', '收臂'],
      keywords: ['角动量', '角动量守恒', '转动惯量', '角速度', '收臂', '旋转平台', '花样滑冰', '陀螺', 'angular momentum', '转动'],
      phet: {
        name: 'Ladybug Revolution · 旋转运动',
        url: 'https://phet.colorado.edu/zh_CN/simulations/rotation',
        note: '用旋转运动模拟对照角速度、角加速度与转动惯量，再观察本场景中收臂导致的加速。'
      },
      params: [
        { key: 'omega0', label: '初始角速度', symbol: 'ω₀', min: 1.0, max: 6.0, step: 0.1, default: 3.0, unit: 'rad/s', digits: 1, desc: '系统在配重半径为初始值时的角速度。改变它会把系统重新“起转”。' },
        { key: 'r', label: '配重半径', symbol: 'r', min: 0.20, max: 0.90, step: 0.01, default: 0.55, unit: 'm', digits: 2, desc: '两个滑动配重到转轴的距离。收臂时 r 减小，转动惯量减小，角速度增大。' },
        { key: 'm', label: '单个配重质量', symbol: 'm', min: 0.5, max: 5.0, step: 0.1, default: 2.0, unit: 'kg', digits: 1, desc: '每个滑动配重的质量。质量越大，改变半径时转动惯量变化越明显。' },
        { key: 'I0', label: '转台转动惯量', symbol: 'I₀', min: 0.5, max: 3.0, step: 0.1, default: 1.5, unit: 'kg·m²', digits: 1, desc: '空载转台与电机的等效转动惯量，是系统的基础惯量。' }
      ],
      lesson: {
        lead: '旋转平台与两个可滑动配重组成一个近似孤立的转动系统。没有外力矩时，系统的角动量 L 守恒；当配重被拉向转轴，转动惯量 I 减小，角速度 ω 就必须增大，这就是“收臂加速”的本质。',
        formula: 'L = Iω = 常量<br>I = I<sub>0</sub> + 2mr<sup>2</sup> &nbsp;&nbsp; ω = L / I',
        formulaNote: '角动量是矢量，方向沿转轴。若系统受到合外力矩为零，L 的大小和方向都保持不变；本场景用竖直转轴，L 沿 +y。',
        points: [
          '<b>角动量：</b>L = Iω，单位 kg·m²/s，方向由右手螺旋定则沿转轴。',
          '<b>转动惯量：</b>I 反映质量相对转轴的分布。配重越靠外，I 越大；收臂使 I 减小。',
          '<b>守恒条件：</b>合外力矩为零（或可忽略）。轴承摩擦、空气阻力会形成微小外力矩，使 L 缓慢衰减。',
          '<b>收臂加速：</b>L 不变时，I 减小导致 ω 增大。把配重拉回需要做机械功，系统转动动能增加。',
          '<b>生活实例：</b>花样滑冰运动员收臂加速、跳水运动员抱膝、直升机尾桨配平等。'
        ],
        errors: [
          { title: '轴承摩擦与空气阻力', body: '真实转台存在轴承摩擦和空气阻力，角速度会缓慢衰减，L 并非严格守恒。应尽量降低转速、使用气浮或磁悬浮轴承，并在短时间内测量。' },
          { title: '系统不是刚体', body: '配重滑动、支架形变和电机转子都会改变质量分布，使 I 随时间变化。分析时应明确“系统”包含哪些部件，并统一取同一转轴。' },
          { title: '半径与质量测量', body: 'r 应从转轴中心量到配重质心，而不是配重边缘；m 与 I0 的标定误差会直接进入 I。应多次测量并检查转台空载惯量。' },
          { title: '视觉转速放大', body: '三维场景中平台转速经过显示限制，屏幕上不一定能看出真实的高速旋转；角速度、角动量读数按物理公式计算。' }
        ],
        questions: [
          { q: '为什么收臂后转速会变快？', a: '合外力矩近似为零，角动量 L = Iω 守恒。收臂使配重靠近转轴，I 减小，因此 ω = L/I 增大。把配重拉回需要克服离心趋势做功，这部分功转化为转动动能。' },
          { q: '角动量守恒的条件是什么？', a: '系统所受合外力矩为零（或外力矩远小于内力矩、可忽略）。注意是对选定的转轴和系统而言；如果轴承摩擦不可忽略，L 会缓慢减小。' },
          { q: '转动惯量为什么与半径平方有关？', a: '质点对转轴的转动惯量为 mr²，r 是质点到转轴的垂直距离。配重越靠外，同样的质量对转动的“抵抗”越大，所以 I 随 r² 增长。' },
          { q: '角动量与转动动能有什么区别？', a: 'L = Iω 是矢量，守恒时大小和方向都不变；转动动能 E = ½Iω² 是标量，收臂时 I 减小、ω 增大，E 会增加，增加量来自收臂所做的功。' },
          { q: '花样滑冰运动员为什么能越转越快？', a: '运动员收臂和收腿使质量向转轴集中，I 减小；冰面摩擦力矩很小，L 近似守恒，所以 ω 增大。张开手臂时 I 增大，转速又降下来。' }
        ]
      },
      annotations: {
        disk: { title: '旋转平台', text: '由电机驱动的水平转台，可近似看作绕竖直轴转动的刚体。平台与配重共同组成待研究的转动系统。' },
        weights: { title: '可滑动配重', text: '两个质量相等的配重，可沿径向轨道滑动。改变它们到转轴的距离 r，就改变了系统的转动惯量 I。' },
        axis: { title: '竖直转轴', text: '系统的转轴。角动量 L 与角速度 ω 都沿此轴方向，遵循右手螺旋定则。' },
        L: { title: '角动量 L', text: 'L = Iω。在没有合外力矩的情况下，L 的大小和方向保持不变。' },
        omega: { title: '角速度 ω', text: '系统单位时间转过的角度。收臂使 I 减小，ω 随之增大；读数按真实公式计算。' }
      },
      qa: [
        { q: '为什么收臂会加速？', keywords: ['收臂', '加速', '为什么', '变快', '半径减小'], a: 'L = Iω 守恒。收臂让配重靠近转轴，I = I₀ + 2mr² 减小，所以 ω = L/I 增大。这个过程需要做机械功，转动动能增加。' },
        { q: '角动量守恒的条件？', keywords: ['条件', '守恒', '外力矩', '什么时候'], a: '对选定系统和转轴，合外力矩为零（或可忽略）时角动量守恒。轴承摩擦、空气阻力会提供微小外力矩，使 L 缓慢衰减。' },
        { q: '角动量和转动惯量是什么关系？', keywords: ['转动惯量', '关系', '公式', 'I'], a: 'L = Iω。转动惯量 I 是质量相对转轴分布的度量；同样的角动量下，I 越小，ω 越大。配重的贡献是 2mr²。' },
        { q: '为什么角动量是矢量？', keywords: ['方向', '矢量', '右手', '转轴'], a: '角动量定义为 r × p，方向垂直于位矢和动量，遵循右手螺旋定则。本场景中转轴竖直，L 沿 +y 方向。' },
        { q: '收臂时能量守恒吗？', keywords: ['能量', '守恒', '做功', '动能'], a: '机械能不一定守恒，因为人（或电机）把配重拉回时做了功。角动量守恒，但转动动能 E = L²/(2I) 会随 I 减小而增大。' }
      ]
    },

    {
      id: 'bernoulli',
      order: 8,
      name: '伯努利方程与文丘里管',
      en: 'Bernoulli Equation / Venturi Tube',
      enShort: 'Bernoulli / Venturi',
      category: '力学',
      icon: icon.bernoulli,
      accent: '#60e6ff',
      tagline: '理想流体 · 连续性方程 · 压差测量',
      subtitle: '理想流体 · 连续性方程 · 压差测量',
      tags: ['理想流体', '文丘里', '压差'],
      keywords: ['伯努利', '伯努利方程', '文丘里', '文丘里管', '流体', '压强', '流速', '连续性方程', '喉部', '半径比', '压差', 'bernoulli', 'venturi'],
      phet: {
        name: 'Fluid Pressure and Flow · 流体压强与流动',
        url: 'https://phet.colorado.edu/zh_CN/simulations/fluid-pressure-and-flow',
        note: 'PhET 用可视化水流展示压强、流速与截面积的关系，可与本场景的喉部加速和压差对照。'
      },
      params: [
        { key: 'v1', label: '宽截面流速', symbol: 'v₁', min: 0.5, max: 2.2, step: 0.1, default: 1.8, unit: 'm/s', digits: 1, desc: '流体在宽截面处的平均速度。由于连续性，喉部速度会按面积比放大。' },
        { key: 'ratio', label: '喉部/宽截面半径比', symbol: 'r₂/r₁', min: 0.50, max: 0.90, step: 0.01, default: 0.55, unit: '', digits: 2, desc: '喉部半径与宽截面半径之比。比值越小，喉部越细，流速越大、压力越低。' },
        { key: 'rho', label: '流体密度', symbol: 'ρ', min: 800, max: 1200, step: 10, default: 1000, unit: 'kg/m³', digits: 0, desc: '默认水的密度 1000 kg/m³。密度越大，同样的速度变化对应更大的压差。' },
        { key: 'p1', label: '宽截面压力', symbol: 'p₁', min: 30, max: 60, step: 1, default: 40, unit: 'kPa', digits: 0, desc: '宽截面处的参考压力。喉部压力由伯努利方程计算，可能因速度过大而接近空化限制。' }
      ],
      lesson: {
        lead: '不可压缩理想流体在变截面管道中稳定流动时，质量守恒要求截面小的地方流速大（连续性方程）；伯努利方程进一步指出，流速大的地方压强小。文丘里管正是利用喉部压差来测量流量。',
        formula: 'A<sub>1</sub>v<sub>1</sub> = A<sub>2</sub>v<sub>2</sub><br>p<sub>1</sub> + ½ρv<sub>1</sub><sup>2</sup> = p<sub>2</sub> + ½ρv<sub>2</sub><sup>2</sup><br>v<sub>2</sub> = v<sub>1</sub> / (r<sub>2</sub>/r<sub>1</sub>)<sup>2</sup>',
        formulaNote: '这里取同一高度，ρgh 项相消。若考虑高度差，应在两边同时加上 ρgh。实际流体还有黏性损失，伯努利方程是理想化近似。',
        points: [
          '<b>连续性方程：</b>A₁v₁ = A₂v₂。不可压缩流体在细截面必须流得更快。',
          '<b>伯努利方程：</b>p + ½ρv² + ρgh = 常量。沿同一流线，速度增大时压强减小。',
          '<b>文丘里效应：</b>喉部流速最大、静压最低；两侧压力计液柱高度差反映压差 Δp。',
          '<b>流量测量：</b>Q = A₁v₁ = A₂v₂。已知几何尺寸并测得 Δp，就可以反推流量。',
          '<b>适用条件：</b>定常、不可压缩、无黏、沿同一流线。真实管道需考虑黏性、湍流和压力损失。'
        ],
        errors: [
          { title: '理想流体假设', body: '伯努利方程忽略黏性。真实流体在管壁附近有边界层，喉部下游还可能发生分离和湍流，导致实测压差偏离理论值。' },
          { title: '取压孔位置与形状', body: '压力计取压孔应与管壁齐平、垂直于流线，避免毛刺和方向偏差。取压孔位置不同，测到的压力也会不同。' },
          { title: '流量与流速分布', body: '公式中的 v 是平均流速。实际管内速度分布不均匀，靠近管壁较慢；用中心流速代替平均流速会高估流量。' },
          { title: '空化与可压缩性', body: '喉部压力过低时液体可能发生空化，产生气泡并破坏流动；气体高速流动时还必须考虑可压缩性。本场景在压力过低时给出限制提示。' }
        ],
        questions: [
          { q: '为什么喉部流速更大？', a: '不可压缩流体满足连续性方程 A₁v₁ = A₂v₂。喉部截面积 A₂ 更小，所以 v₂ = v₁A₁/A₂ 更大。' },
          { q: '为什么喉部压力更低？', a: '沿同一流线，伯努利方程 p + ½ρv² 近似不变。喉部速度大，动压 ½ρv² 大，静压 p 就必须小。' },
          { q: '如何用文丘里管测流量？', a: '测出宽截面与喉部压差 Δp，由 Δp = ½ρ(v₂²-v₁²) 和连续性方程解出 v₁，再乘以截面积得到 Q = A₁v₁。实际使用时要乘以流量系数修正黏性与结构损失。' },
          { q: '伯努利方程适用于什么流体？', a: '适用于定常、不可压缩、无黏（或黏性可忽略）且沿同一流线的理想流体。黏性、可压缩性和非定常流动需要更完整的方程。' },
          { q: '为什么飞机机翼会产生升力？', a: '常见简化解释是机翼上下表面流速不同造成压差。真实机翼升力还涉及环量、攻角和下洗气流，不能只靠“路程长短”解释；伯努利方程提供的是沿流线的压力关系。' }
        ]
      },
      annotations: {
        wide: { title: '宽截面 A₁', text: '截面积较大的管段。此处流速较小、静压较高，压力计液柱较高。' },
        throat: { title: '喉部 A₂', text: '文丘里管的收缩段。截面积最小，流速最大，静压最低，是测量压差的关键位置。' },
        manometer: { title: '压力计', text: '两根竖直测压管，液柱高度反映静压。宽截面与喉部的液柱高度差对应 Δp。' },
        flow: { title: '流线 / 示踪粒子', text: '示踪粒子沿管道运动，在喉部明显加速，直观展示连续性方程。' },
        formula: { title: '伯努利关系', text: 'p + ½ρv² + ρgh = 常量。沿同一流线，速度大的位置静压小。' }
      },
      qa: [
        { q: '为什么细的地方流速快？', keywords: ['细', '流速', '快', '连续性', '为什么'], a: '不可压缩流体的体积流量守恒：A₁v₁ = A₂v₂。截面积减小，流速必须增大。' },
        { q: '为什么流速大压强小？', keywords: ['压强', '小', '流速', '伯努利', '为什么'], a: '沿同一流线 p + ½ρv² 近似为常量。速度增大使动压增大，静压就必须减小。' },
        { q: '压差怎么算？', keywords: ['压差', '计算', 'Δp', '公式'], a: '由连续性 v₂ = v₁/(r₂/r₁)²，再代入 Δp = ½ρ(v₂² − v₁²)。本场景右侧会直接给出压差读数。' },
        { q: '文丘里管有什么应用？', keywords: ['应用', '文丘里', '流量计', '化油器'], a: '文丘里管可用于流量计、化油器、喷雾器和射流泵等。它通过测量喉部压差来推断流量或产生负压。' },
        { q: '为什么实际测量会有偏差？', keywords: ['误差', '偏差', '实际', '黏性'], a: '实际流体有黏性、边界层和湍流损失，压力计取压位置、孔口形状、流速分布也会引入误差。工程上常用流量系数进行修正。' }
      ]
    },

    {
      id: 'cavendish',
      order: 9,
      name: '卡文迪许实验',
      en: 'Cavendish Torsion Balance',
      enShort: 'Cavendish Balance',
      category: '力学',
      icon: icon.cavendish,
      accent: '#d7b5ff',
      tagline: '万有引力 · 扭秤 · 光杠杆',
      subtitle: '万有引力 · 扭秤 · 光杠杆',
      tags: ['万有引力', '扭秤', '光杠杆'],
      keywords: ['卡文迪许', '卡文迪什', '扭秤', '万有引力', '引力常量', 'G', '光杠杆', '铅球', 'cavendish', 'torsion'],
      phet: {
        name: 'Gravity Force Lab · 万有引力实验',
        url: 'https://phet.colorado.edu/zh_CN/simulations/gravity-force-lab',
        note: 'PhET 可改变两球质量与距离，观察万有引力变化；本场景进一步展示如何用扭秤和光杠杆放大微小引力。'
      },
      params: [
        { key: 'M', label: '大铅球质量', symbol: 'M', min: 2, max: 20, step: 0.5, default: 10, unit: 'kg', digits: 1, desc: '两个大铅球各自的质量。质量越大，对小铅球的引力矩越大。' },
        { key: 'm', label: '小铅球质量', symbol: 'm', min: 0.02, max: 0.20, step: 0.005, default: 0.10, unit: 'kg', digits: 3, desc: '扭秤两端小铅球的质量。它也决定扭秤的转动惯量和周期。' },
        { key: 'gap', label: '球间最近距离', symbol: 'd₀', min: 0.03, max: 0.10, step: 0.005, default: 0.05, unit: 'm', digits: 3, desc: '大球表面到小球表面的最近距离。距离越小，万有引力按平方反比迅速增大。' },
        { key: 'kappa', label: '悬丝扭转常数', symbol: 'κ', min: 1, max: 10, step: 0.5, default: 3, unit: '×10⁻⁵ N·m/rad', digits: 1, desc: '悬丝抵抗扭转的强弱。κ 越小，同样的引力矩产生的偏角越大。' },
        { key: 'gain', label: '转角视觉放大', symbol: '×', min: 1000, max: 4000, step: 100, default: 2000, unit: '×', digits: 0, desc: '真实偏角只有微弧度量级，场景把转角与光点位移放大显示；读数仍按真实公式计算。' },
        { key: 'timeScale', label: '演示时间倍率', symbol: '×', min: 20, max: 80, step: 5, default: 40, unit: '×', digits: 0, desc: '真实扭摆周期长达数十秒到数分钟，场景加速演化以便观察。' }
      ],
      lesson: {
        lead: '卡文迪许用一根极细的悬丝悬挂一根水平轻杆，杆两端各有一个小铅球；两个大铅球靠近小铅球时，微弱的万有引力使杆绕悬丝扭转。悬丝的扭转角与引力矩平衡，再用平面镜和光杠杆把微小转角放大成可观测的光点位移。',
        formula: 'F = G <span class="frac"><span class="num">mM</span><span class="den">r<sup>2</sup></span></span><br>κθ = τ &nbsp;&nbsp; τ ≈ 2aF<sub>z</sub><br>θ = <span class="frac"><span class="num">2GmMa d</span><span class="den">κ r<sup>3</sup></span></span>',
        formulaNote: 'a 为扭秤半臂长，d 为大球相对小球的横向偏移，r = √(d₀²+d²)。光杠杆把镜面转角 θ 放大为 2θ 的光束偏转。',
        points: [
          '<b>万有引力：</b>F = GmM/r²，方向沿两球连线，大小与距离平方成反比。',
          '<b>引力矩：</b>两个大球对小球的引力形成同向力矩，使扭秤转动；力矩大小与 M、m、a、d 有关。',
          '<b>扭秤平衡：</b>悬丝的恢复力矩 κθ 与引力矩平衡，θ = τ/κ。κ 越小，偏角越明显。',
          '<b>光杠杆：</b>镜面转动 θ，反射光束转动 2θ。远处的标尺把微小转角放大为可读的光点位移。',
          '<b>测量 G：</b>测出 θ、κ、质量和几何尺寸，即可反推万有引力常量 G，因此卡文迪许实验被称为“称量地球”的实验。'
        ],
        errors: [
          { title: '气流与温度扰动', body: '引力矩极小，空气流动、温度变化和对流都会干扰扭秤。实验通常把装置放在密闭箱中，并避免人员靠近和热源。' },
          { title: '静电与磁干扰', body: '铅球和悬丝可能带静电，周围铁磁物体也会产生磁力。应采取接地、屏蔽和无磁材料等措施。' },
          { title: '悬丝参数标定', body: '扭转常数 κ 往往通过测量扭摆周期 T = 2π√(I/κ) 间接得到，I 的计算和周期测量误差会传递到 G。' },
          { title: '光杠杆读数与视觉放大', body: '光点位置需要多次测量并消除漂移；本场景的转角和光点位移经过视觉放大，真实偏角只有微弧度量级。' }
        ],
        questions: [
          { q: '为什么卡文迪许实验能“称量地球”？', a: '实验测出万有引力常量 G 后，结合地球表面的重力加速度 g 和地球半径 R，可由 g = GM⊕/R² 求出地球质量 M⊕，所以被称为“称量地球”。' },
          { q: '为什么要用光杠杆？', a: '引力矩极小，扭秤转角只有微弧度量级，直接读数很困难。镜面转动 θ 时反射光转动 2θ，远处的光点位移被放大，便于精确测量。' },
          { q: '增大铅球质量，偏角怎样变化？', a: '引力矩近似与 M 成正比，而悬丝恢复力矩只与 θ 有关，所以平衡偏角 θ ≈ τ/κ 随 M 增大而增大。' },
          { q: '为什么扭秤会来回摆动？', a: '扭秤是一个扭转振子。释放后引力矩与悬丝恢复力矩共同作用，形成围绕平衡位置的阻尼振荡；周期 T = 2π√(I/κ)。' },
          { q: '卡文迪许实验的主要困难是什么？', a: '万有引力极其微弱，必须排除气流、温度、静电、磁力和地面振动等干扰，并精确标定悬丝扭转常数与光杠杆的几何关系。' }
        ]
      },
      annotations: {
        wire: { title: '悬丝', text: '极细的石英丝或金属丝，提供微小的扭转恢复力矩。它的扭转常数 κ 决定仪器的灵敏度。' },
        small: { title: '小铅球 m', text: '固定在轻杆两端的小质量。大铅球的引力使它产生绕悬丝的力矩。' },
        large: { title: '大铅球 M', text: '两个大质量铅球，放在小铅球附近以产生可测的引力。交换它们的位置可以改变力矩方向。' },
        mirror: { title: '平面镜', text: '固定在扭秤上，随悬丝一起转动。它把入射激光反射到远处的标尺，实现光杠杆放大。' },
        scale: { title: '光杠杆标尺', text: '接收反射光点的标尺。镜面转角 θ 对应光点位移约 2θL，L 为镜面到标尺的距离。' }
      },
      qa: [
        { q: '卡文迪许实验测出了什么？', keywords: ['测出', '测量', 'G', '引力常量', '目的'], a: '它首次在实验室中较精确地测出了万有引力常量 G，并由此推算了地球的质量和平均密度。' },
        { q: '为什么偏角这么小？', keywords: ['偏角', '小', '为什么', '微弱'], a: '万有引力是最弱的基本相互作用，两个实验室尺度铅球之间的引力只有纳牛量级；悬丝又必须足够细才能灵敏，因此真实偏角只有微弧度量级。' },
        { q: '光杠杆如何放大？', keywords: ['光杠杆', '放大', '镜面', '反射'], a: '镜面转动 θ 时，反射光线转动 2θ。若镜面到标尺距离为 L，光点位移约为 2θL，因此可以把微小转角放大到可读的毫米量级。' },
        { q: '怎样求 G？', keywords: ['求G', '计算', '公式', 'G'], a: '由平衡条件 κθ = τ 和引力矩的几何关系求出 τ，再结合 F = GmM/r² 解出 G。实际实验中还需测量扭摆周期来确定 κ。' },
        { q: '为什么要抽真空或密封？', keywords: ['真空', '密封', '气流', '干扰'], a: '气流和对流会产生远大于引力的扰动力矩。密封、防振和恒温可以显著降低这些系统误差。' }
      ]
    }
  ];

  extra.forEach((exp) => {
    PL.experiments.push(exp);
    PL.expById[exp.id] = exp;
  });

  const overview = PL.generalQA.find((q) => q.q === '支持哪些实验？');
  if (overview) {
    overview.a = '当前内置 9 个大学物理经典实验：<b>迈克尔逊干涉仪</b>、<b>科里奥利力</b>、<b>杨氏双缝干涉</b>、<b>单摆周期测量</b>、<b>光电效应</b>、<b>法拉第电磁感应</b>、<b>角动量守恒</b>、<b>伯努利方程与文丘里管</b>、<b>卡文迪许实验</b>。左侧实验库可切换，也可以直接用一句话让我打开。';
  }
})();
