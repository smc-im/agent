/* =========================================================
   PHYS·LAB app — UI shell, scene manager, parameter bridge
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const GROUP_ORDER = ['光学', '力学', '电磁学', '近代物理'];

  function linearFit(xs, ys) {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return null;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - mx;
      const dy = ys[i] - my;
      sxx += dx * dx;
      sxy += dx * dy;
      syy += dy * dy;
    }
    if (sxx === 0) return null;
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    let sse = 0;
    for (let i = 0; i < n; i++) {
      const e = ys[i] - (slope * xs[i] + intercept);
      sse += e * e;
    }
    const r2 = syy === 0 ? 1 : 1 - sse / syy;
    const seSlope = n > 2 ? Math.sqrt((sse / (n - 2)) / sxx) : 0;
    return { n, slope, intercept, r2, seSlope };
  }

  const DEEP_QUIZ = {
    michelson: {
      predict: {
        q: 'M1 沿光轴移动 λ/2，视场中心会移过几条条纹？',
        options: ['0.5 条', '1 条', '2 条'],
        answer: 1,
        explain: '往返光程差改变 2·(λ/2)=λ，相位改变 2π，所以中心移过 1 条。'
      },
      quiz: {
        q: '如果 M1 移动 2λ，中心大约移过几条条纹？',
        options: ['2 条', '4 条', '8 条'],
        answer: 1,
        explain: '每移动 λ/2 移过 1 条，移动 2λ 对应 4 个 λ/2，所以移过 4 条。',
        misconception: '把单程位移直接当成条纹数（忘记往返光程差）'
      }
    },
    photoelectric: {
      predict: {
        q: '只增大光强，遏止电压 Uₛ 会怎样？',
        options: ['增大', '不变', '减小'],
        answer: 1,
        explain: '光强只增加光子数，不改变单个光子能量 hν，所以最大初动能和 Uₛ 不变。'
      },
      quiz: {
        q: '改用频率更高的光照射同一阴极，Uₛ 会怎样？',
        options: ['增大', '不变', '减小'],
        answer: 0,
        explain: 'Uₛ = (h/e)ν − W/e。频率升高，光子能量增大，遏止电压升高。',
        misconception: '认为遏止电压由光强决定'
      }
    },
    cavendish: {
      predict: {
        q: '保持几何不变，增大铅球质量 M，扭秤平衡偏角 θ 会怎样？',
        options: ['增大', '减小', '不变'],
        answer: 0,
        explain: '引力矩近似与 M 成正比，悬丝恢复力矩为 κθ，所以 θ ≈ τ/κ 随 M 增大。'
      },
      quiz: {
        q: '把大铅球移得更远（增大球间距离），θ 会怎样？',
        options: ['增大', '减小', '不变'],
        answer: 1,
        explain: '万有引力按 r² 衰减，引力矩随之减小，平衡偏角减小。',
        misconception: '认为引力偏角与距离无关'
      }
    }
  };

  const DEMO_DEFS = {
    michelson: {
      act: '光学 · 测出激光波长',
      buildParams: { d: 6.0, lambda: 632.8, tilt: 0.08 },
      intro: '条纹计数是迈克尔逊干涉仪最经典的定量任务：移动动镜，数移过中心的条纹，就能反推激光波长。',
      resultTitle: '用 5 组条纹数据拟合 λ',
      quiz: DEEP_QUIZ.michelson
    },
    photoelectric: {
      act: '量子 · 测出普朗克常量',
      buildParams: { lambda: 365, material: 'Cs', intensity: 60, voltage: 0 },
      intro: '光电效应把“光的能量”变成可测的遏止电压。改变波长、记录 Uₛ，作 Uₛ–ν 图，斜率就是 h/e。',
      resultTitle: '用 5 个波长点拟合 h',
      quiz: DEEP_QUIZ.photoelectric
    },
    cavendish: {
      act: '引力 · 称量地球',
      buildParams: { M: 10, m: 0.1, gap: 0.05, kappa: 3, gain: 2000, timeScale: 40 },
      intro: '卡文迪许用扭秤把极微弱的万有引力放大成可测的偏角。改变大铅球质量、记录平衡偏角，就能反推 G。',
      resultTitle: '用 5 个质量点拟合 G',
      quiz: DEEP_QUIZ.cavendish
    }
  };

  const MEASUREMENT_SPECS = {
    michelson: {
      deep: true,
      title: '条纹计数法测量激光波长',
      task: '先记录一个基准位置，再移动动镜 M1。每移过 N 条条纹，记录一次 d。用 N–d 直线斜率求 λ = 2 / slope。',
      columns: [
        { key: 'd', label: '动镜位移 d / µm', digits: 2 },
        { key: 'N', label: '移过条纹 N / 条', digits: 2 }
      ],
      record() {
        const s = this.currentScene;
        return s.getMeasurement ? s.getMeasurement() : null;
      },
      fit(rows) {
        const pts = rows.filter((r) => isFinite(r.d) && isFinite(r.N));
        if (pts.length < 2) return null;
        const fit = linearFit(pts.map((r) => r.d), pts.map((r) => r.N));
        if (!fit || fit.slope <= 0) return null;
        const lam = 2000 / fit.slope;
        const uLam = lam * fit.seSlope / Math.abs(fit.slope);
        return {
          equation: 'N = ' + fit.slope.toFixed(3) + ' · d + ' + fit.intercept.toFixed(2),
          metrics: [
            { label: '拟合斜率', value: fit.slope.toFixed(3), unit: '条/µm' },
            { label: 'λ = 2 / slope', value: lam.toFixed(1), unit: 'nm' },
            { label: 'u(λ)', value: uLam.toFixed(1), unit: 'nm' },
            { label: 'R²', value: fit.r2.toFixed(4), unit: '' }
          ],
          note: 'λ 的 A 类不确定度由斜率标准误传播；若只测一个点，可改用 u(λ)=λ·(u(d)/d)。'
        };
      }
    },
    photoelectric: {
      deep: true,
      title: '遏止电压法测量普朗克常量',
      task: '改变入射光波长，记录对应的遏止电压 Uₛ。作 Uₛ–ν 图，斜率 = h/e，截距 = −W/e。',
      columns: [
        { key: 'lambda', label: '波长 λ / nm', digits: 0 },
        { key: 'nu', label: '频率 ν / 10¹⁴Hz', digits: 3 },
        { key: 'Us', label: 'Uₛ / V', digits: 3 }
      ],
      record() {
        const s = this.currentScene;
        return s.getMeasurement ? s.getMeasurement() : null;
      },
      fit(rows) {
        const pts = rows.filter((r) => isFinite(r.nu) && isFinite(r.Us));
        if (pts.length < 2) return null;
        const fit = linearFit(pts.map((r) => r.nu), pts.map((r) => r.Us));
        if (!fit) return null;
        const eV = 1.602176634e-19;
        const h = fit.slope * eV / 1e14;
        const uh = Math.abs(fit.seSlope * eV / 1e14);
        const work = -fit.intercept;
        return {
          equation: 'Uₛ = ' + fit.slope.toFixed(3) + ' · ν + (' + fit.intercept.toFixed(3) + ')',
          metrics: [
            { label: 'h（拟合）', value: (h / 1e-34).toFixed(2), unit: '×10⁻³⁴ J·s' },
            { label: 'u(h)', value: (uh / 1e-34).toFixed(2), unit: '×10⁻³⁴ J·s' },
            { label: '逸出功 W', value: work.toFixed(2), unit: 'eV' },
            { label: 'R²', value: fit.r2.toFixed(4), unit: '' }
          ],
          note: '斜率的单位是 V/(10¹⁴Hz)。用 h = slope·e/10¹⁴ 转换；截距给出逸出功。'
        };
      }
    },
    cavendish: {
      deep: true,
      title: '扭秤偏角法测量万有引力常量',
      task: '保持小铅球质量与几何不变，改变大铅球质量 M，记录平衡偏角 θ。作 θ–M 图，由斜率反推 G。',
      columns: [
        { key: 'M', label: '大球质量 M / kg', digits: 1 },
        { key: 'thetaEq', label: '平衡偏角 θ / µrad', digits: 1 },
        { key: 'gap', label: '间距 d₀ / m', digits: 3 }
      ],
      record() {
        const s = this.currentScene;
        return s.getMeasurement ? s.getMeasurement() : null;
      },
      fit(rows) {
        const pts = rows.filter((r) => isFinite(r.M) && isFinite(r.thetaEq) && isFinite(r.gap));
        if (pts.length < 2) return null;
        const fit = linearFit(pts.map((r) => r.M), pts.map((r) => r.thetaEq));
        if (!fit || fit.slope <= 0) return null;
        const last = pts[pts.length - 1];
        const D = 0.14, a = 0.32, kappa = this.currentScene.params.kappa * 1e-5;
        const m = this.currentScene.params.m;
        const r = Math.sqrt(last.gap * last.gap + D * D);
        const G = fit.slope * 1e-6 * kappa * Math.pow(r, 3) / (2 * m * a * D);
        const uG = G * fit.seSlope / Math.abs(fit.slope);
        return {
          equation: 'θ = ' + fit.slope.toFixed(2) + ' · M + ' + fit.intercept.toFixed(2),
          metrics: [
            { label: 'G（拟合）', value: (G / 1e-11).toFixed(3), unit: '×10⁻¹¹' },
            { label: 'u(G)', value: (uG / 1e-11).toFixed(3), unit: '×10⁻¹¹' },
            { label: '拟合斜率', value: fit.slope.toFixed(2), unit: 'µrad/kg' },
            { label: 'R²', value: fit.r2.toFixed(4), unit: '' }
          ],
          note: '由 θ = 2GmMaD/(κr³) 反解 G；保持 m、d₀、κ 不变时 θ 与 M 近似线性。'
        };
      }
    },
    'angular-momentum': {
      deep: false,
      title: '验证角动量守恒',
      task: '改变配重半径 r，记录角速度 ω 与角动量 L。理想情况下 L 应保持近似不变。',
      columns: [
        { key: 'r', label: '半径 r / m', digits: 2 },
        { key: 'I', label: 'I / kg·m²', digits: 3 },
        { key: 'omega', label: 'ω / rad/s', digits: 2 },
        { key: 'L', label: 'L / kg·m²/s', digits: 3 }
      ],
      record() {
        const s = this.currentScene;
        if (!s.getMeasurement) return null;
        return s.getMeasurement();
      },
      fit(rows) {
        if (rows.length < 2) return null;
        const mean = rows.reduce((a, r) => a + r.L, 0) / rows.length;
        const sd = Math.sqrt(rows.reduce((a, r) => a + Math.pow(r.L - mean, 2), 0) / Math.max(1, rows.length - 1));
        return {
          equation: 'L̄ = ' + mean.toFixed(3) + ' kg·m²/s',
          metrics: [
            { label: '平均 L', value: mean.toFixed(3), unit: 'kg·m²/s' },
            { label: '标准差', value: sd.toFixed(3), unit: 'kg·m²/s' },
            { label: '相对离散', value: (Math.abs(sd / mean) * 100).toFixed(2), unit: '%' },
            { label: '样本数', value: String(rows.length), unit: '' }
          ],
          note: '若 L 的相对离散很小，说明在实验精度内角动量守恒；摩擦会使 L 缓慢衰减。'
        };
      }
    }
  };

  class App {
    constructor() {
      this.currentExp = null;
      this.currentScene = null;
      this.currentMetrics = [];
      this.activeTab = 'lesson';
      this.busy = false;
      this.exploded = false;
      this.autorotate = false;
      this._urlTimer = null;
      this._paramRaf = 0;
      this._pendingParams = {};
      this._hideTimer = null;
      this._metricTimer = null;
      this.measurements = this.loadJSON('physlab.measurements.v1', {});
      this.memory = this.loadJSON('physlab.memory.v1', {
        experiments: {},
        tools: 0,
        knowledgeHits: 0,
        measurements: 0,
        quiz: { correct: 0, total: 0 },
        misconceptions: {},
        events: [],
        demoData: false
      });
      if (!this.memory.events) this.memory.events = [];
      if (!this.memory.experiments) this.memory.experiments = {};
      if (!this.memory.misconceptions) this.memory.misconceptions = {};
      if (!this.memory.quiz) this.memory.quiz = { correct: 0, total: 0 };
      this.trace = [];
      this.lastRetrieval = [];
      this.demo = { active: false, expId: null, step: 0, prediction: null, quiz: null };
    }

    init() {
      this.cacheEls();
      this.updateTraceCount();
      this.checkWebGL();
      this.renderExperimentList();
      this.renderPhetList();
      this.bindEvents();
      this.initChat();
      this.setBusy(false);

      const q = new URLSearchParams(location.search);
      let id = q.get('sim') || 'michelson';
      if (!PL.expById[id]) {
        id = 'michelson';
        if (q.get('sim')) this.toast('未知的实验标识，已打开默认实验', 'warn');
      }
      const exp = PL.expById[id];
      const params = {};
      exp.params.forEach((p) => {
        if (!q.has(p.key)) return;
        const raw = q.get(p.key);
        if (p.type === 'select') params[p.key] = raw;
        else {
          const num = parseFloat(raw);
          if (isFinite(num)) params[p.key] = U.clamp(num, p.min, p.max);
        }
      });

      this.showLoading('正在初始化三维实验台', '加载实验库 · 检查 WebGL · 准备渲染', 18);
      this.resetWorkflow();
      this.flow('parse', 'active', '读取实验配置');
      this.setAgentState('初始化', 'busy');

      setTimeout(async () => {
        this.flow('parse', 'done', '已读取实验配置');
        this.flow('plan', 'active', '规划场景');
        this.showLoading('正在构建 ' + exp.name, '组件 · 光路 · 材质 · 交互', 44);
        await this.buildExperiment(id, params, { initial: true });
        this.flow('plan', 'done', '场景规划完成');
        this.flow('render', 'done', 'WebGL 就绪');
        this.flow('teach', 'done', '教学面板已同步');
        this.setAgentState('已就绪', 'done');
        this.showLoading('场景已就绪', '拖动旋转 · 滚轮缩放 · 右侧调参', 100);
        await sleep(380);
        this.hideLoading();
        if (q.get('sim')) this.toast('已恢复预览链接中的实验与参数', 'ok');
      }, 360);

      this._metricTimer = setInterval(() => this.updateMetrics(), 280);
    }

    cacheEls() {
      this.el = {
        experimentList: document.getElementById('experimentList'),
        expCount: document.getElementById('expCount'),
        search: document.getElementById('searchInput'),
        sceneTitle: document.getElementById('sceneTitle'),
        sceneSub: document.getElementById('sceneSub'),
        sceneCategory: document.getElementById('sceneCategory'),
        sceneTags: document.getElementById('sceneTags'),
        viewer: document.getElementById('viewer'),
        viewerCard: document.getElementById('viewerCard'),
        labelLayer: document.getElementById('labelLayer'),
        quickParams: document.getElementById('quickParams'),
        suggestions: document.getElementById('suggestions'),
        command: document.getElementById('commandInput'),
        btnSend: document.getElementById('btnSend'),
        btnShare: document.getElementById('btnShare'),
        btnGuide: document.getElementById('btnGuide'),
        btnPhet: document.getElementById('btnPhet'),
        btnRotate: document.getElementById('btnRotate'),
        btnExplode: document.getElementById('btnExplode'),
        btnResetView: document.getElementById('btnResetView'),
        btnFullscreen: document.getElementById('btnFullscreen'),
        loading: document.getElementById('loadingOverlay'),
        loadingTitle: document.getElementById('loadingTitle'),
        loadingSub: document.getElementById('loadingSub'),
        loadingBar: document.getElementById('loadingBar'),
        agentState: document.getElementById('agentState'),
        flowParse: document.getElementById('flowParse'),
        flowPlan: document.getElementById('flowPlan'),
        flowRender: document.getElementById('flowRender'),
        flowTeach: document.getElementById('flowTeach'),
        panelLesson: document.getElementById('panelLesson'),
        panelParams: document.getElementById('panelParams'),
        panelQA: document.getElementById('panelQA'),
        chat: document.getElementById('chat'),
        qaInput: document.getElementById('qaInput'),
        btnQaSend: document.getElementById('btnQaSend'),
        tabDot: document.getElementById('tabDot'),
        shareModal: document.getElementById('shareModal'),
        shareUrl: document.getElementById('shareUrl'),
        shareMeta: document.getElementById('shareMeta'),
        btnCopyLink: document.getElementById('btnCopyLink'),
        btnOpenLink: document.getElementById('btnOpenLink'),
        guideModal: document.getElementById('guideModal'),
        phetModal: document.getElementById('phetModal'),
        phetList: document.getElementById('phetList'),
        toastStack: document.getElementById('toastStack'),
        webglDot: document.getElementById('webglDot'),
        webglState: document.getElementById('webglState'),
        btnResetChat: document.getElementById('btnResetChat')
      };
      this.viewerEl = this.el.viewer;
      this.labelLayer = this.el.labelLayer;
      const ids = [
        'btnDashboard', 'btnDemo', 'btnTrace', 'traceCount', 'btnMeasure',
        'panelData', 'traceModal', 'traceSummary', 'traceList', 'btnTraceCopy',
        'dashboardModal', 'dashStats', 'dashChart', 'dashMisconceptions', 'dashTimeline',
        'btnSeedDashboard', 'btnResetMemory', 'demoModal', 'btnDemoDashboard',
        'demoCoach', 'demoAct', 'demoProgress', 'demoBody', 'btnCloseDemo'
      ];
      ids.forEach((id) => {
        const key = id.replace(/^btn/, 'btn').replace(/^panel/, 'panel');
        this.el[key] = document.getElementById(id);
      });
      this.el.panelData = document.getElementById('panelData');
      this.el.btnDashboard = document.getElementById('btnDashboard');
      this.el.btnDemo = document.getElementById('btnDemo');
      this.el.btnTrace = document.getElementById('btnTrace');
      this.el.traceCount = document.getElementById('traceCount');
      this.el.btnMeasure = document.getElementById('btnMeasure');
      this.el.demoCoach = document.getElementById('demoCoach');
      this.el.demoAct = document.getElementById('demoAct');
      this.el.demoProgress = document.getElementById('demoProgress');
      this.el.demoBody = document.getElementById('demoBody');
      this.el.btnCloseDemo = document.getElementById('btnCloseDemo');
      this.el.dashHint = document.getElementById('dashHint');
    }

    checkWebGL() {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
        if (gl) {
          this.el.webglDot.classList.add('ok');
          this.el.webglState.textContent = 'WebGL 2D/3D 加速';
        } else {
          throw new Error('WebGL unavailable');
        }
      } catch (err) {
        this.el.webglDot.classList.add('err');
        this.el.webglState.textContent = 'WebGL 不可用';
      }
    }

    loadJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    }

    saveJSON(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
    }

    saveMemory() {
      this.saveJSON('physlab.memory.v1', this.memory);
    }

    timeString(ts) {
      const d = ts ? new Date(ts) : new Date();
      return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
    }

    recordTool(tool, detail, status, meta) {
      const entry = {
        id: 't' + Date.now() + Math.random().toString(16).slice(2, 5),
        tool: tool,
        detail: detail,
        status: status || 'ok',
        time: Date.now(),
        meta: meta || null
      };
      this.trace.push(entry);
      if (this.trace.length > 80) this.trace.shift();
      this.memory.tools = (this.memory.tools || 0) + 1;
      if (tool === 'knowledge.search' && meta && meta.hits) {
        this.memory.knowledgeHits = (this.memory.knowledgeHits || 0) + meta.hits;
        this.lastRetrieval = meta.results || [];
      }
      this.saveMemory();
      this.updateTraceCount();
      if (this.el.traceModal && this.el.traceModal.classList.contains('show')) this.renderTrace();
      return entry;
    }

    updateTraceCount() {
      if (this.el.traceCount) this.el.traceCount.textContent = String(this.trace.length);
    }

    recordEvent(type, label, meta) {
      this.memory.events.unshift({ type: type, label: label, meta: meta || null, time: Date.now() });
      if (this.memory.events.length > 40) this.memory.events.length = 40;
      this.saveMemory();
    }

    recordQuizResult(correct, misconception, question) {
      if (!this.memory.quiz) this.memory.quiz = { correct: 0, total: 0 };
      this.memory.quiz.total += 1;
      if (correct) this.memory.quiz.correct += 1;
      if (!correct && misconception) {
        this.memory.misconceptions[misconception] = (this.memory.misconceptions[misconception] || 0) + 1;
      }
      this.recordEvent(correct ? 'quiz.correct' : 'quiz.wrong', (correct ? '答对：' : '误区：') + (question || ''), { misconception: misconception || null });
      this.saveMemory();
    }

    validateScene() {
      if (!this.currentScene) return { ok: false, checks: 0 };
      let metrics = [];
      try { metrics = this.currentScene.getMetrics() || []; } catch (e) { metrics = []; }
      const numeric = metrics.every((m) => {
        const s = String(m.value);
        const v = parseFloat(s.replace(/[^0-9eE+.\-]/g, ''));
        if (isFinite(v)) return true;
        return /测量中|—|无光电子|等待/.test(s);
      });
      const paramsOk = this.currentExp.params.every((p) => {
        if (p.type === 'select') return p.options.some((o) => o.value === this.currentScene.params[p.key]);
        const v = this.currentScene.params[p.key];
        return isFinite(v) && v >= p.min - 1e-9 && v <= p.max + 1e-9;
      });
      const ok = numeric && paramsOk && metrics.length > 0;
      this.recordTool('physics.validate', ok ? '参数范围、单位与数值有限性检查通过' : '发现异常参数或非有限读数', ok ? 'ok' : 'warn', {
        checks: metrics.length + this.currentExp.params.length
      });
      return { ok: ok, checks: metrics.length + this.currentExp.params.length };
    }

    /* ---------------- Data / library ---------------- */
    renderExperimentList(query) {
      const q = (query || '').trim().toLowerCase();
      const groups = new Map();
      PL.experiments.forEach((exp) => {
        const hay = [exp.name, exp.en, exp.category, exp.tagline, exp.keywords.join(' '), exp.lesson.lead].join(' ').toLowerCase();
        if (q && hay.indexOf(q) < 0) return;
        if (!groups.has(exp.category)) groups.set(exp.category, []);
        groups.get(exp.category).push(exp);
      });
      const cats = GROUP_ORDER.filter((c) => groups.has(c));
      let html = '';
      cats.forEach((cat) => {
        html += '<div class="exp-group"><div class="exp-group-title">' + this.escape(cat) + '</div>';
        groups.get(cat).forEach((exp) => {
          const active = this.currentExp && this.currentExp.id === exp.id ? ' active' : '';
          const deep = MEASUREMENT_SPECS[exp.id] && MEASUREMENT_SPECS[exp.id].deep;
          html += '<button class="exp-item' + active + '" data-id="' + exp.id + '" type="button" role="listitem">' +
            '<span class="exp-icon">' + exp.icon + '</span>' +
            '<span class="exp-copy"><strong>' + this.escape(exp.name) + '</strong><small>' + this.escape(exp.enShort || exp.en) + '</small></span>' +
            (deep ? '<span class="deep-badge">深度</span>' : '') +
            '<svg class="exp-arrow" viewBox="0 0 20 20" fill="none"><path d="M7 4.5 12.5 10 7 15.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>';
        });
        html += '</div>';
      });
      if (!html) html = '<div class="exp-empty">没有匹配的实验<br>试试“干涉”“单摆”或“光电”</div>';
      this.el.experimentList.innerHTML = html;
      this.el.expCount.textContent = String(PL.experiments.length);
    }

    renderPhetList() {
      let html = '';
      PL.experiments.forEach((exp, i) => {
        html += '<a class="phet-row" href="' + exp.phet.url + '" target="_blank" rel="noopener">' +
          '<span class="phet-no">0' + (i + 1) + '</span>' +
          '<span class="phet-row-copy"><strong>' + this.escape(exp.name) + ' → ' + this.escape(exp.phet.name) + '</strong><small>' + this.escape(exp.phet.note) + '</small></span>' +
          '<svg viewBox="0 0 20 20" fill="none"><path d="M7 4.5h8.5V13M15 5 5 15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' +
          '</a>';
      });
      this.el.phetList.innerHTML = html;
    }

    /* ---------------- Scene lifecycle ---------------- */
    async buildExperiment(id, params, opts) {
      opts = opts || {};
      if (this.demo && this.demo.active && !opts.fromDemo) this.closeDemo(true);
      const exp = PL.expById[id];
      if (!exp) return;
      if (this.currentScene) {
        this.currentScene.dispose();
        this.currentScene = null;
      }
      this.currentExp = exp;
      this.exploded = false;
      this.autorotate = false;
      this.el.btnRotate.classList.remove('active');
      this.el.btnRotate.setAttribute('aria-pressed', 'false');
      this.el.btnExplode.classList.remove('active');
      this.el.btnExplode.setAttribute('aria-pressed', 'false');
      this.el.viewerCard.style.setProperty('--scene-accent', exp.accent);

      const SceneClass = PL.scenes[id];
      if (!SceneClass) {
        this.renderError('实验场景尚未注册');
        return;
      }
      const scene = new SceneClass(this, exp);
      this.currentScene = scene;
      try {
        scene.init();
      } catch (err) {
        console.error(err);
        this.renderError('三维场景初始化失败：' + err.message);
        return;
      }
      if (params && Object.keys(params).length) scene.setParams(params);
      scene.controls.autoRotate = false;
      this.el.btnExplode.disabled = !!scene.noExplode;
      this.el.btnExplode.title = scene.noExplode ? '该实验暂不支持拆解视图' : '拆解视图';

      this.renderExperimentUI();
      this.updateUrl(true);
      if (!this.memory.experiments) this.memory.experiments = {};
      this.memory.experiments[id] = (this.memory.experiments[id] || 0) + 1;
      this.saveMemory();
      this.recordTool('scene.build', '构建 ' + exp.name + ' · ' + exp.params.length + ' 个可调参数', 'ok', { expId: id });
      this.recordEvent('scene.open', '打开实验 · ' + exp.name, { expId: id });
      this.validateScene();
      await sleep(120);
      return scene;
    }

    renderError(message) {
      this.el.viewer.innerHTML = '<div style="position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;padding:30px;text-align:center;color:#ffb3a8;font-size:12px;line-height:1.7">' +
        '<strong style="font-size:15px;color:#ffd0c9">无法初始化 3D 场景</strong>' +
        '<span>' + this.escape(message) + '</span>' +
        '<span style="color:#7d8fac">请确认浏览器已开启硬件加速，或尝试使用 Chrome / Edge 最新版。</span>' +
        '</div>';
    }

    async switchExperiment(id, params) {
      if (this.busy) return;
      if (this.currentExp && this.currentExp.id === id) {
        this.switchTab('lesson');
        return;
      }
      const exp = PL.expById[id];
      if (!exp) return;
      this.busy = true;
      this.setBusy(true);
      this.resetWorkflow();
      this.setAgentState('构建中', 'busy');
      this.flow('parse', 'done', '从实验库选择');
      this.flow('plan', 'active', '规划 ' + exp.name);
      this.showLoading('正在切换三维实验', exp.name + ' · 场景规划', 28);
      await sleep(180);
      this.flow('plan', 'done', '场景规划完成');
      this.flow('render', 'active', '加载 Three.js 场景');
      this.showLoading('正在构建 ' + exp.name, '几何 · 材质 · 注释', 58);
      await this.buildExperiment(id, params || null, { fromLibrary: true });
      await sleep(220);
      this.flow('render', 'done', 'WebGL 实时渲染');
      this.flow('teach', 'done', '讲解已同步');
      this.setAgentState('已完成', 'done');
      this.showLoading('场景已就绪', '可拖动旋转或调整参数', 100);
      await sleep(230);
      this.hideLoading();
      this.busy = false;
      this.setBusy(false);
    }

    /* ---------------- Experiment UI ---------------- */
    renderExperimentUI() {
      const exp = this.currentExp;
      if (!exp) return;
      this.el.sceneTitle.textContent = exp.name;
      this.el.sceneSub.textContent = exp.subtitle;
      this.el.sceneCategory.textContent = exp.category;
      this.el.sceneTags.innerHTML = exp.tags.map((t) => '<span>' + this.escape(t) + '</span>').join('');
      this.renderExperimentList(this.el.search.value);
      this.renderLesson();
      this.renderParams();
      this.renderMeasurement();
      this.renderQuickParams();
      this.renderSuggestions();
      this.updateMetrics();
      this.switchTab('lesson');
      this.el.panelLesson.scrollTop = 0;
    }

    metricHTML(metrics, mode) {
      if (!metrics || !metrics.length) return '';
      return metrics.map((m, i) => {
        if (mode === 'readout') {
          return '<div class="readout-row"><span>' + this.escape(m.label) + '</span><strong data-readout="' + i + '">' + this.escape(String(m.value)) + (m.unit ? ' ' + this.escape(m.unit) : '') + '</strong></div>';
        }
        return '<div class="metric"><span>' + this.escape(m.label) + '</span><strong data-metric="' + i + '">' + this.escape(String(m.value)) + (m.unit ? '<em>' + this.escape(m.unit) + '</em>' : '') + '</strong></div>';
      }).join('');
    }

    renderLesson() {
      const exp = this.currentExp;
      const lesson = exp.lesson;
      const metrics = this.currentScene ? this.currentScene.getMetrics() : [];
      this.currentMetrics = metrics;
      const errs = lesson.errors.map((e, i) => (
        '<div class="acc-item"><button class="acc-head" type="button">' + this.escape(e.title) + '<span class="acc-plus"></span></button>' +
        '<div class="acc-body"><div class="acc-body-inner">' + e.body + '</div></div></div>'
      )).join('');
      const questions = lesson.questions.map((q, i) => (
        '<div class="question-card"><div class="q"><b>Q' + (i + 1) + '</b>' + this.escape(q.q) + '</div><div class="a">' + q.a + '</div></div>'
      )).join('');
      const anns = Object.keys(exp.annotations || {}).map((key) => {
        const a = exp.annotations[key];
        return '<button class="ann-chip" type="button" data-ann="' + key + '">' + this.escape(a.title) + '</button>';
      }).join('');

      this.el.panelLesson.innerHTML =
        '<div class="lesson-hero">' +
          '<span class="eyebrow">' + this.escape(exp.category) + ' · ' + this.escape(exp.en.toUpperCase()) + '</span>' +
          '<h2>' + this.escape(exp.name) + '</h2>' +
          '<div class="lesson-en">' + this.escape(exp.en) + '</div>' +
          '<p class="lesson-lead">' + lesson.lead + '</p>' +
          '<div class="lesson-tags">' + exp.tags.map((t) => '<span>' + this.escape(t) + '</span>').join('') + '</div>' +
        '</div>' +
        '<div class="formula-card">' +
          '<div class="formula-label">CORE RELATION / 核心关系</div>' +
          '<div class="formula">' + lesson.formula + '</div>' +
          '<p class="formula-note">' + lesson.formulaNote + '</p>' +
        '</div>' +
        '<div class="metric-grid" id="metricGrid">' + this.metricHTML(metrics) + '</div>' +
        '<div class="lesson-section"><h3>关键机制</h3><ul class="key-points">' + lesson.points.map((p) => '<li>' + p + '</li>').join('') + '</ul></div>' +
        (anns ? '<div class="lesson-section"><h3>3D 元件注解</h3><div class="ann-chips">' + anns + '</div><p class="micro-hint">点击芯片或场景中的标签，查看该元件的作用。</p></div>' : '') +
        '<div class="lesson-section"><h3>误差分析</h3><div class="accordion">' + errs + '</div></div>' +
        '<div class="lesson-section"><h3>思考题拆解</h3><div class="question-list">' + questions + '</div></div>' +
        '<div class="phet-ref"><span class="phet-mini">P</span><div><span>PHET RESOURCE</span><strong>' + this.escape(exp.phet.name) + '</strong></div><a href="' + exp.phet.url + '" target="_blank" rel="noopener">打开 ↗</a></div>';
    }

    renderParams() {
      const exp = this.currentExp;
      const params = this.currentScene ? this.currentScene.params : {};
      const rows = exp.params.map((def) => {
        const value = params[def.key];
        if (def.type === 'select') {
          const opts = def.options.map((o) => '<option value="' + this.escape(o.value) + '"' + (o.value === value ? ' selected' : '') + '>' + this.escape(o.label) + '</option>').join('');
          return '<div class="param-row" data-key="' + def.key + '">' +
            '<div class="param-top"><span class="param-label">' + this.escape(def.label) + '</span><span class="param-symbol">' + this.escape(def.symbol || '') + '</span><span class="param-value" data-value="' + def.key + '">' + this.escape(this.selectLabel(def, value)) + '</span></div>' +
            '<div class="select-wrap"><select data-param="' + def.key + '">' + opts + '</select></div>' +
            '<div class="param-desc">' + this.escape(def.desc || '') + '</div></div>';
        }
        const pct = ((value - def.min) / (def.max - def.min)) * 100;
        return '<div class="param-row" data-key="' + def.key + '">' +
          '<div class="param-top"><span class="param-label">' + this.escape(def.label) + '</span><span class="param-symbol">' + this.escape(def.symbol || '') + '</span><span class="param-value" data-value="' + def.key + '">' + this.escape(this.formatValue(def, value)) + '<em>' + this.escape(def.unit || '') + '</em></span></div>' +
          '<div class="range-wrap"><input type="range" data-param="' + def.key + '" min="' + def.min + '" max="' + def.max + '" step="' + def.step + '" value="' + value + '" style="--fill:' + pct + '%" aria-label="' + this.escape(def.label) + '"></div>' +
          '<div class="param-scale"><span>' + this.escape(this.formatValue(def, def.min, false)) + '</span><span>' + this.escape(this.formatValue(def, def.max, false)) + '</span></div>' +
          '<div class="param-desc">' + this.escape(def.desc || '') + '</div></div>';
      }).join('');

      const note = this.paramNote(exp);
      const metrics = this.currentScene ? this.currentScene.getMetrics() : [];
      this.currentMetrics = metrics;
      this.el.panelParams.innerHTML =
        '<div class="params-head"><h3>实时参数</h3><p>拖动滑块，三维现象、公式读数与预览链接会同步更新。参数为教学演示设置，已标注视觉放大项。</p></div>' +
        '<div class="param-list">' + rows + '</div>' +
        '<div class="live-readouts"><h4><i></i>LIVE READOUTS</h4><div id="liveReadouts">' + this.metricHTML(metrics, 'readout') + '</div></div>' +
        '<div class="param-actions"><button class="btn btn-ghost" id="btnResetParams" type="button">恢复默认参数</button><button class="btn btn-ghost" id="btnGoShare" type="button">复制预览链接</button></div>' +
        (note ? '<div class="note-card">' + note + '</div>' : '');
      const resetBtn = document.getElementById('btnResetParams');
      if (resetBtn) resetBtn.addEventListener('click', () => this.resetParams());
      const shareBtn = document.getElementById('btnGoShare');
      if (shareBtn) shareBtn.addEventListener('click', () => this.openShare());
    }

    measurementSpec() {
      if (!this.currentExp) return null;
      if (MEASUREMENT_SPECS[this.currentExp.id]) return MEASUREMENT_SPECS[this.currentExp.id];
      const metrics = this.currentScene ? this.currentScene.getMetrics() : [];
      return {
        deep: false,
        title: '记录当前实验数据',
        task: '记录当前参数与物理读数，形成可追溯的实验记录。该实验暂未配置专用拟合任务。',
        columns: metrics.slice(0, 3).map((m, i) => ({ key: 'm' + i, label: m.label + (m.unit ? ' / ' + m.unit : ''), digits: 2, raw: true })),
        record() {
          const s = this.currentScene;
          if (!s) return null;
          const ms = s.getMetrics() || [];
          const out = {};
          ms.slice(0, 3).forEach((m, i) => { out['m' + i] = parseFloat(String(m.value)); });
          return out;
        },
        fit() { return null; }
      };
    }

    measurementRows() {
      if (!this.currentExp) return [];
      return this.measurements[this.currentExp.id] || [];
    }

    measureValue(col, row) {
      const v = row[col.key];
      if (v == null || !isFinite(v)) return '—';
      if (col.raw) return String(row[col.key]);
      return Number(v).toFixed(col.digits == null ? 2 : col.digits);
    }

    renderMeasurement() {
      if (!this.el.panelData) return;
      const exp = this.currentExp;
      if (!exp) {
        this.el.panelData.innerHTML = '<div class="data-empty">先选择一个实验。</div>';
        return;
      }
      const spec = this.measurementSpec();
      const rows = this.measurementRows();
      const reading = this.currentScene && spec.record ? spec.record.call(this) : null;
      const fit = rows.length >= 2 ? spec.fit.call(this, rows) : null;
      const quiz = DEEP_QUIZ[exp.id];

      const readings = reading && spec.columns ? spec.columns.map((col) => (
        '<div class="measure-reading"><span>' + this.escape(col.label) + '</span><strong>' + this.escape(this.measureValue(col, reading)) + '</strong></div>'
      )).join('') : '';

      const head = '<div class="measure-hero">' +
        '<span class="eyebrow">' + (spec.deep ? 'DEEP EXPERIMENT · 精密测量' : 'MEASUREMENT NOTE') + '</span>' +
        '<h3>' + this.escape(spec.title) + '</h3>' +
        '<p>' + this.escape(spec.task) + '</p>' +
      '</div>';

      const toolbar = '<div class="measure-actions">' +
        '<button class="measure-btn primary" data-mact="record" type="button">＋ 记录当前数据</button>' +
        '<button class="measure-btn" data-mact="demo" type="button">生成 5 组示例数据</button>' +
        '<button class="measure-btn" data-mact="csv" type="button">复制 CSV</button>' +
        '<button class="measure-btn" data-mact="report" type="button">打印实验报告</button>' +
        '<button class="measure-btn danger" data-mact="clear" type="button">清空</button>' +
      '</div>';

      const current = readings ? '<div class="measure-current">' + readings + '</div>' : '';

      let table = '';
      if (rows.length) {
        const th = '<th>#</th>' + spec.columns.map((c) => '<th>' + this.escape(c.label) + '</th>').join('') + '<th>t</th>';
        const tr = rows.map((row, i) => '<tr><td>' + (i + 1) + '</td>' + spec.columns.map((c) => '<td>' + this.escape(this.measureValue(c, row)) + '</td>').join('') + '<td>' + this.timeString(row._time) + '</td></tr>').join('');
        table = '<div class="data-table-wrap"><table class="data-table"><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table></div>';
      } else {
        table = '<div class="data-empty">还没有数据。移动参数后点击「记录当前数据」，至少记录 2 组才能拟合。</div>';
      }

      let fitHTML = '';
      if (fit) {
        fitHTML = '<div class="fit-card"><h4>FIT / 拟合与不确定度</h4>' +
          '<div class="fit-eq">' + this.escape(fit.equation) + '</div>' +
          '<div class="fit-grid">' + fit.metrics.map((m) => '<div><span>' + this.escape(m.label) + '</span><strong>' + this.escape(String(m.value)) + (m.unit ? ' ' + this.escape(m.unit) : '') + '</strong></div>').join('') + '</div>' +
          '<div class="fit-note">' + this.escape(fit.note) + '</div></div>';
      } else if (rows.length >= 1) {
        fitHTML = '<div class="fit-card"><h4>FIT / 拟合与不确定度</h4><div class="fit-note">再记录至少 1 组数据，系统会自动进行线性拟合并传播不确定度。</div></div>';
      }

      const quizHTML = quiz ? this.renderQuizBlock(exp.id, quiz.predict, 'predict') + this.renderQuizBlock(exp.id, quiz.quiz, 'quiz') : '';

      this.el.panelData.innerHTML = head + toolbar + current + table + fitHTML + quizHTML;
    }

    renderQuizBlock(expId, q, type) {
      this.quizState = this.quizState || {};
      const state = (this.quizState[expId] || {})[type];
      const label = type === 'predict' ? '先预测 · PREDICT' : '再检测 · CHECK';
      let options = '';
      q.options.forEach((opt, i) => {
        let cls = 'quiz-option';
        if (state) {
          if (i === q.answer) cls += ' correct';
          if (state.choice === i && i !== q.answer) cls += ' wrong';
        }
        options += '<button class="' + cls + '" data-quiz="' + expId + '" data-qtype="' + type + '" data-choice="' + i + '" type="button">' + this.escape(opt) + '</button>';
      });
      const feedback = state ? '<div class="quiz-feedback show ' + (state.correct ? 'ok' : 'no') + '"><b>' + (state.correct ? '判断正确。' : '需要修正。') + '</b> ' + this.escape(q.explain) + '</div>' : '';
      return '<div class="quiz-card"><h4>' + label + '</h4><p>' + this.escape(q.q) + '</p><div class="quiz-options">' + options + '</div>' + feedback + '</div>';
    }

    answerQuiz(expId, type, choice) {
      const quiz = DEEP_QUIZ[expId];
      if (!quiz) return;
      const q = type === 'predict' ? quiz.predict : quiz.quiz;
      const correct = choice === q.answer;
      this.quizState = this.quizState || {};
      this.quizState[expId] = this.quizState[expId] || {};
      this.quizState[expId][type] = { choice: choice, correct: correct };
      this.recordQuizResult(correct, correct ? null : q.misconception, q.q);
      this.recordTool('quiz.evaluate', (correct ? '回答正确' : '识别误区') + ' · ' + q.q.slice(0, 24), correct ? 'ok' : 'warn', { expId: expId, type: type });
      this.renderMeasurement();
      this.toast(correct ? '回答正确，已记录学习证据' : '已记录误区，可在答疑中继续追问', correct ? 'ok' : 'warn');
    }

    recordMeasurement(options) {
      options = options || {};
      const spec = this.measurementSpec();
      if (!spec || !this.currentScene) return null;
      const reading = spec.record ? spec.record.call(this) : null;
      if (!reading) return null;
      const row = Object.assign({}, reading, { _id: 'm' + Date.now() + Math.random().toString(16).slice(2, 5), _time: Date.now() });
      const id = this.currentExp.id;
      if (!this.measurements[id]) this.measurements[id] = [];
      this.measurements[id].push(row);
      if (this.measurements[id].length > 40) this.measurements[id].shift();
      this.memory.measurements = (this.memory.measurements || 0) + 1;
      this.saveJSON('physlab.measurements.v1', this.measurements);
      this.saveMemory();
      this.recordTool('measurement.record', id + ' · ' + spec.title, 'ok', { row: row });
      this.recordEvent('measurement.record', '记录测量数据 · ' + this.currentExp.name);
      if (!options.silent) {
        this.renderMeasurement();
        this.toast('已记录第 ' + this.measurements[id].length + ' 组数据', 'ok');
      }
      return row;
    }

    clearMeasurements() {
      if (!this.currentExp) return;
      this.measurements[this.currentExp.id] = [];
      this.saveJSON('physlab.measurements.v1', this.measurements);
      this.renderMeasurement();
      this.toast('已清空当前实验数据', 'ok');
    }

    loadDemoMeasurements(expId) {
      const exp = PL.expById[expId];
      if (!exp || !this.currentScene || this.currentExp.id !== expId) return null;
      this.measurements[expId] = [];
      this.quizState = this.quizState || {};
      const emit = (values) => {
        this.currentScene.setParams(values);
        this.recordMeasurement({ silent: true });
      };
      if (expId === 'michelson') {
        [2, 4, 6, 8, 10].forEach((d) => emit({ d: d }));
      } else if (expId === 'photoelectric') {
        [365, 405, 436, 500, 546].forEach((lambda) => emit({ lambda: lambda, material: 'Cs' }));
      } else if (expId === 'cavendish') {
        [5, 8, 10, 12, 15].forEach((M) => emit({ M: M, gap: 0.05, kappa: 3 }));
      } else if (expId === 'angular-momentum') {
        [0.2, 0.35, 0.5, 0.7, 0.9].forEach((r) => emit({ r: r }));
      }
      // realistic readout jitter for the demo so the fit has a non-zero uncertainty
      this.measurements[expId].forEach((row, i) => {
        const j = Math.sin(i * 1.7) * 0.15;
        if (expId === 'michelson') row.N += j;
        if (expId === 'photoelectric') row.Us += Math.sin(i * 1.3) * 0.006;
        if (expId === 'cavendish') row.thetaEq += Math.sin(i * 1.4) * 0.35;
      });
      this.saveJSON('physlab.measurements.v1', this.measurements);
      this.syncParamControls();
      this.updateMetrics();
      this.updateUrl();
      this.renderMeasurement();
      const fit = this.buildFit();
      this.recordTool('measurement.demo_series', '生成 5 组可复现的演示测量数据', 'ok', { expId: expId });
      this.recordEvent('measurement.demo', '生成测量演示数据 · ' + exp.name);
      this.toast('已生成 5 组测量数据' + (fit ? '，并完成拟合' : ''), 'ok');
      return fit;
    }

    buildFit() {
      const spec = this.measurementSpec();
      const rows = this.measurementRows();
      if (!spec || rows.length < 2) return null;
      return spec.fit.call(this, rows);
    }

    copyMeasurementsCSV() {
      const spec = this.measurementSpec();
      const rows = this.measurementRows();
      if (!spec || !rows.length) { this.toast('还没有可复制的数据', 'warn'); return; }
      const header = ['time'].concat(spec.columns.map((c) => c.label));
      const lines = [header.join(',')].concat(rows.map((row) => [this.timeString(row._time)].concat(spec.columns.map((c) => row[c.key])).join(',')));
      const text = lines.join('\n');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => this.toast('CSV 已复制到剪贴板', 'ok')).catch(() => this.toast('复制失败，请使用打印报告', 'warn'));
      } else {
        this.toast('当前环境不支持剪贴板，请使用打印报告', 'warn');
      }
      this.recordTool('measurement.export_csv', '导出 ' + rows.length + ' 行 CSV', 'ok');
    }

    printMeasurementReport() {
      const exp = this.currentExp;
      const spec = this.measurementSpec();
      const rows = this.measurementRows();
      if (!exp || !spec) return;
      const fit = rows.length >= 2 ? spec.fit.call(this, rows) : null;
      const w = window.open('', '_blank');
      if (!w) { this.toast('浏览器拦截了报告窗口，请允许弹出窗口', 'warn'); return; }
      const th = spec.columns.map((c) => '<th>' + this.escape(c.label) + '</th>').join('');
      const tr = rows.map((row, i) => '<tr><td>' + (i + 1) + '</td>' + spec.columns.map((c) => '<td>' + this.escape(this.measureValue(c, row)) + '</td>').join('') + '</tr>').join('');
      const fitHTML = fit ? '<h2>拟合结果</h2><p class="eq">' + this.escape(fit.equation) + '</p><table>' + fit.metrics.map((m) => '<tr><td>' + this.escape(m.label) + '</td><td>' + this.escape(String(m.value)) + ' ' + this.escape(m.unit || '') + '</td></tr>').join('') + '</table><p>' + this.escape(fit.note) + '</p>' : '<p>数据不足，未进行拟合。</p>';
      const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>PHYS·LAB 实验报告</title><style>' +
        'body{font-family:"Microsoft YaHei",Arial,sans-serif;color:#182333;max-width:820px;margin:36px auto;padding:0 24px;line-height:1.7}h1{font-size:24px;margin:0 0 4px}.sub{color:#66758a;font-size:12px;margin-bottom:24px}h2{font-size:16px;margin-top:24px;border-left:3px solid #168aad;padding-left:8px}table{width:100%;border-collapse:collapse;font-size:12px;margin:8px 0}th,td{border:1px solid #ccd6e2;padding:6px 8px;text-align:right}th{background:#f2f7fa;text-align:center}td:first-child{text-align:center;color:#66758a}.eq{font-family:Cambria,serif;font-size:15px;background:#f5fafc;padding:8px 10px;border-radius:5px}.note{color:#66758a;font-size:11px;margin-top:20px;border-top:1px solid #dde6ee;padding-top:10px}a{color:#168aad}@media print{body{margin:0}.no-print{display:none}}' +
        '</style></head><body>' +
        '<h1>PHYS·LAB 实验报告</h1><div class="sub">' + this.escape(exp.name) + ' · ' + this.escape(exp.en) + ' · ' + new Date().toLocaleString('zh-CN') + '</div>' +
        '<h2>实验任务</h2><p>' + this.escape(spec.title) + '</p><p>' + this.escape(spec.task) + '</p>' +
        '<h2>数据记录</h2>' + (rows.length ? '<table><thead><tr><th>#</th>' + th + '</tr></thead><tbody>' + tr + '</tbody></table>' : '<p>暂无数据。</p>') +
        fitHTML +
        '<h2>本次实验读数</h2><table>' + (this.currentScene.getMetrics() || []).map((m) => '<tr><td>' + this.escape(m.label) + '</td><td>' + this.escape(String(m.value)) + ' ' + this.escape(m.unit || '') + '</td></tr>').join('') + '</table>' +
        '<h2>预览链接</h2><p><a href="' + this.buildShareUrl() + '">' + this.buildShareUrl() + '</a></p>' +
        '<p class="note">本报告由 PHYS·LAB 本地生成。三维场景中的视觉放大项已在界面中标注；公式与读数由确定性物理引擎计算。</p>' +
        '<p class="no-print"><button onclick="window.print()">打印 / 另存为 PDF</button></p></body></html>';
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
      this.recordTool('measurement.report', '生成实验报告 · ' + exp.name, 'ok', { rows: rows.length });
      this.recordEvent('report.print', '打印实验报告 · ' + exp.name);
    }

    paramNote(exp) {
      if (exp.id === 'coriolis') return '轨迹横向偏转经过视觉放大，便于在短距离内观察；右侧 f 与 a<sub>C</sub> 读数按真实地球自转角速度计算。';
      if (exp.id === 'double-slit') return '为使双缝可见，3D 中的缝距与波长比例经过示意化处理；条纹间距、波长和屏距读数按真实公式计算。';
      if (exp.id === 'photoelectric') return '电子数量与运动速度为教学可视化；光子能量、逸出功和遏止电压按真实常量计算。';
      if (exp.id === 'angular-momentum') return '三维场景对平台显示转速做了上限限制；角速度、角动量和转动惯量读数按公式实时计算。';
      if (exp.id === 'bernoulli') return '压力计液柱高度按相对压力缩放显示；流速、压差与流量读数按连续性方程和伯努利方程计算。';
      if (exp.id === 'cavendish') return '真实扭秤偏角只有微弧度量级；场景将转角和光点位移视觉放大，万有引力与力矩读数仍按真实常量计算。';
      return '';
    }

    renderQuickParams() {
      const exp = this.currentExp;
      const params = this.currentScene ? this.currentScene.params : {};
      const preferred = {
        photoelectric: ['lambda', 'voltage', 'intensity'],
        pendulum: ['L', 'g', 'theta0'],
        coriolis: ['lat', 'speed', 'azimuth'],
        'angular-momentum': ['r', 'omega0', 'm'],
        bernoulli: ['v1', 'ratio', 'p1'],
        cavendish: ['M', 'gap', 'kappa']
      };
      const keys = preferred[exp.id];
      const defs = keys
        ? keys.map((k) => exp.params.find((p) => p.key === k)).filter(Boolean)
        : exp.params.slice(0, 3);
      this.el.quickParams.innerHTML = defs.map((def) => {
        let val = def.type === 'select' ? this.selectLabel(def, params[def.key]) : this.formatValue(def, params[def.key], false);
        return '<button class="qp" data-tab="params" data-key="' + def.key + '" type="button"><span>' + this.escape(def.symbol || def.label) + '</span><code>' + this.escape(val) + '</code>' + (def.unit && def.type !== 'select' ? '<span>' + this.escape(def.unit) + '</span>' : '') + '</button>';
      }).join('');
    }

    renderSuggestions() {
      const map = {
        michelson: ['把波长调到 550 nm', '为什么条纹会移动？', '误差主要来自哪里？', '生成预览链接'],
        coriolis: ['把纬度改成 55 度', '为什么北半球向右偏？', '误差与模型局限', '生成预览链接'],
        'double-slit': ['把缝距调到 0.35 mm', '为什么中央总是亮纹？', '误差主要来自哪里？', '生成预览链接'],
        pendulum: ['把重力改成月球', '周期与摆长有什么关系？', '误差主要来自哪里？', '生成预览链接'],
        photoelectric: ['把波长调到 300 nm', '为什么光强不影响遏止电压？', '误差分析', '生成预览链接'],
        faraday: ['把磁铁频率调到 1.5 Hz', '楞次定律怎么判断方向？', '误差分析', '生成预览链接'],
        'angular-momentum': ['把配重半径收到 0.2 米', '为什么收臂会加速？', '角动量守恒条件', '生成预览链接'],
        bernoulli: ['把喉部半径比调到 0.5', '为什么喉部压力低？', '误差分析', '生成预览链接'],
        cavendish: ['把大铅球质量调到 15 kg', '为什么要用光杠杆？', '误差分析', '生成预览链接']
      };
      const list = map[this.currentExp.id] || ['生成预览链接'];
      this.el.suggestions.innerHTML = '<span class="suggestion-label">TRY</span>' + list.map((s, i) =>
        '<button class="sugg' + (i === 0 ? ' accent' : '') + '" type="button" data-cmd="' + this.escape(s) + '">' + this.escape(s) + '</button>'
      ).join('');
    }

    /* ---------------- Parameters ---------------- */
    formatValue(def, value, withUnit) {
      if (value == null || isNaN(value)) return '—';
      const digits = def.digits == null ? 2 : def.digits;
      const txt = Number(value).toFixed(digits);
      return txt;
    }

    selectLabel(def, value) {
      const o = def.options.find((x) => x.value === value);
      return o ? o.label : String(value);
    }

    queueParam(key, value) {
      this._pendingParams[key] = value;
      this.updateParamDisplay(key, value);
      if (!this._paramRaf) {
        this._paramRaf = requestAnimationFrame(() => {
          const next = this._pendingParams;
          this._pendingParams = {};
          this._paramRaf = 0;
          this.setParams(next, { fromUI: true });
        });
      }
    }

    updateParamDisplay(key, value) {
      const exp = this.currentExp;
      if (!exp) return;
      const def = exp.params.find((p) => p.key === key);
      if (!def) return;
      const row = this.el.panelParams.querySelector('.param-row[data-key="' + key + '"]');
      if (!row) return;
      if (def.type === 'select') {
        const el = row.querySelector('.param-value');
        if (el) el.textContent = this.selectLabel(def, value);
      } else {
        const el = row.querySelector('.param-value');
        if (el) el.innerHTML = this.escape(this.formatValue(def, value)) + '<em>' + this.escape(def.unit || '') + '</em>';
        const input = row.querySelector('input[type="range"]');
        if (input) {
          input.value = value;
          const pct = ((value - def.min) / (def.max - def.min)) * 100;
          input.style.setProperty('--fill', pct + '%');
        }
      }
      const qp = this.el.quickParams.querySelector('.qp[data-key="' + key + '"]');
      if (qp) {
        const code = qp.querySelector('code');
        if (code) code.textContent = def.type === 'select' ? this.selectLabel(def, value) : this.formatValue(def, value, false);
      }
    }

    setParams(next, opts) {
      if (!this.currentScene) return;
      this.currentScene.setParams(next);
      this.syncParamControls();
      this.updateUrl();
      this.updateMetrics();
      if (this.activeTab === 'data') {
        if (this._dataRaf) cancelAnimationFrame(this._dataRaf);
        this._dataRaf = requestAnimationFrame(() => {
          this._dataRaf = 0;
          if (this.activeTab === 'data') this.renderMeasurement();
        });
      }
      if (opts && opts.fromUI) {
        // UI already reflects the value; keep URL lightweight during drags.
      }
    }

    syncParamControls() {
      if (!this.currentExp || !this.currentScene) return;
      this.currentExp.params.forEach((def) => {
        this.updateParamDisplay(def.key, this.currentScene.params[def.key]);
      });
    }

    resetParams() {
      if (!this.currentScene) return;
      this.currentScene.resetParams();
      this.syncParamControls();
      this.updateMetrics();
      this.updateUrl();
      this.toast('已恢复默认参数', 'ok');
    }

    highlightParam(key) {
      if (!key) return;
      this.switchTab('params');
      const row = this.el.panelParams.querySelector('.param-row[data-key="' + key + '"]');
      if (!row) return;
      row.classList.remove('flash');
      void row.offsetWidth;
      row.classList.add('flash');
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    updateMetrics() {
      if (!this.currentScene) return;
      let metrics = [];
      try { metrics = this.currentScene.getMetrics() || []; } catch (e) { return; }
      this.currentMetrics = metrics;
      const grid = document.getElementById('metricGrid');
      if (grid) grid.innerHTML = this.metricHTML(metrics);
      const live = document.getElementById('liveReadouts');
      if (live) live.innerHTML = this.metricHTML(metrics, 'readout');
    }

    refreshReadouts() {
      this.updateMetrics();
    }

    /* ---------------- Chat ---------------- */
    initChat() {
      this.el.chat.innerHTML = '';
      this.addChat('assistant',
        '<p>你好，我是<b>物理助教小理</b>。我可以把一句话变成可交互的 3D 实验，也能陪你拆解原理、误差和思考题。</p>' +
        '<p>试试下面这些：</p>' +
        '<div class="qa-chips">' +
        '<button class="qa-chip" data-cmd="画出迈克尔逊干涉仪结构，标出分光板位置">画出迈克尔逊干涉仪</button>' +
        '<button class="qa-chip" data-cmd="演示科里奥利力在地球自转中的效果">演示科里奥利力</button>' +
        '<button class="qa-chip" data-cmd="把双缝间距调到 0.35 毫米">调双缝间距</button>' +
        '</div>', false, true);
    }

    addChat(role, content, isUser, silent) {
      const msg = document.createElement('div');
      msg.className = 'msg ' + (role === 'user' || isUser ? 'user' : 'assistant');
      const now = new Date();
      const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      msg.innerHTML = '<div class="msg-avatar">' + (role === 'user' || isUser ? '你' : '理') + '</div>' +
        '<div class="msg-body"><div class="msg-name"><span>' + (role === 'user' || isUser ? '你' : '小理') + '</span><time>' + time + '</time></div>' +
        '<div class="bubble"></div></div>';
      const bubble = msg.querySelector('.bubble');
      if (role === 'user' || isUser) bubble.textContent = content;
      else bubble.innerHTML = content;
      this.el.chat.appendChild(msg);
      if (!silent) {
        this.el.chat.scrollTop = this.el.chat.scrollHeight;
        if (this.activeTab !== 'qa' && role !== 'user') this.setTabDot(true);
      }
      return msg;
    }

    clearChat() {
      this.initChat();
      this.setTabDot(false);
    }

    switchTab(name) {
      this.activeTab = name;
      document.querySelectorAll('.teach-tab').forEach((b) => {
        const on = b.dataset.tab === name;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.teach-content').forEach((p) => {
        p.classList.toggle('active', p.dataset.panel === name);
      });
      if (name === 'qa') {
        this.setTabDot(false);
        this.el.chat.scrollTop = this.el.chat.scrollHeight;
      }
      if (name === 'data') this.renderMeasurement();
    }

    setTabDot(show) {
      this.el.tabDot.classList.toggle('show', !!show);
    }

    /* ---------------- Workflow ---------------- */
    resetWorkflow() {
      document.querySelectorAll('.flow-step').forEach((s) => s.classList.remove('is-active', 'is-done'));
      ['flowParse', 'flowPlan', 'flowRender', 'flowTeach'].forEach((k) => { this.el[k].textContent = '等待指令'; });
    }

    flow(step, state, text) {
      const node = document.querySelector('.flow-step[data-step="' + step + '"]');
      if (!node) return;
      node.classList.remove('is-active', 'is-done');
      if (state) node.classList.add('is-' + state);
      const map = { parse: 'flowParse', plan: 'flowPlan', render: 'flowRender', teach: 'flowTeach' };
      const t = this.el[map[step]];
      if (t && text) t.textContent = text;
    }

    setAgentState(text, cls) {
      this.el.agentState.textContent = text;
      this.el.agentState.className = 'agent-state' + (cls ? ' ' + cls : '');
    }

    showLoading(title, sub, progress) {
      clearTimeout(this._hideTimer);
      this.el.loading.classList.add('show');
      if (title) this.el.loadingTitle.textContent = title;
      if (sub) this.el.loadingSub.textContent = sub;
      if (progress != null) this.el.loadingBar.style.width = progress + '%';
    }

    hideLoading() {
      this.el.loadingBar.style.width = '100%';
      this._hideTimer = setTimeout(() => {
        this.el.loading.classList.remove('show');
        this.el.loadingBar.style.width = '0%';
      }, 180);
    }

    setBusy(busy) {
      this.busy = busy;
      this.el.btnSend.disabled = busy;
      this.el.btnQaSend.disabled = busy;
      this.el.command.disabled = busy;
      this.el.qaInput.disabled = busy;
    }

    /* ---------------- Commands / events ---------------- */
    sendCommand(text) {
      const val = (text != null ? text : this.el.command.value).trim();
      if (!val) return;
      if (this.busy) {
        this.toast('智能体正在工作，请稍候…', 'warn');
        return;
      }
      this.el.command.value = '';
      this.agent.reply(val);
    }

    sendQA() {
      const val = this.el.qaInput.value.trim();
      if (!val) return;
      this.el.qaInput.value = '';
      if (this.busy) {
        this.toast('智能体正在构建场景，请稍候…', 'warn');
        return;
      }
      this.agent.reply(val);
    }

    openShare() {
      if (!this.currentExp) return;
      const url = this.buildShareUrl();
      this.el.shareUrl.value = url;
      this.el.btnOpenLink.href = url;
      this.el.shareMeta.innerHTML = '<span>' + this.escape(this.currentExp.name) + '</span>' + this.currentExp.params.map((p) => {
        const v = this.currentScene ? this.currentScene.params[p.key] : p.default;
        return '<span>' + this.escape(p.symbol || p.key) + ' = ' + this.escape(p.type === 'select' ? this.selectLabel(p, v) : this.formatValue(p, v) + ' ' + (p.unit || '')) + '</span>';
      }).join('');
      this.openModal('shareModal');
    }

    buildShareUrl() {
      const base = location.protocol === 'file:'
        ? location.href.split('?')[0]
        : location.origin + location.pathname;
      const q = new URLSearchParams();
      q.set('sim', this.currentExp.id);
      this.currentExp.params.forEach((p) => {
        q.set(p.key, this.currentScene ? this.currentScene.params[p.key] : p.default);
      });
      return base + '?' + q.toString();
    }

    updateUrl(force) {
      if (!this.currentExp) return;
      clearTimeout(this._urlTimer);
      const apply = () => {
        let url = this.buildShareUrl();
        try { history.replaceState(null, '', url); } catch (e) { /* file:// or sandbox */ }
      };
      if (force) apply();
      else this._urlTimer = setTimeout(apply, 160);
    }

    toggleAutorotate() {
      if (!this.currentScene) return;
      this.autorotate = !this.autorotate;
      this.currentScene.controls.autoRotate = this.autorotate;
      this.el.btnRotate.classList.toggle('active', this.autorotate);
      this.el.btnRotate.setAttribute('aria-pressed', this.autorotate ? 'true' : 'false');
      this.toast(this.autorotate ? '自动旋转已开启' : '自动旋转已关闭', 'ok');
    }

    toggleExplode() {
      if (!this.currentScene) return;
      if (this.currentScene.noExplode) {
        this.toast('该实验暂不支持拆解视图', 'warn');
        return;
      }
      this.exploded = !this.exploded;
      this.currentScene.setExploded(this.exploded);
      this.el.btnExplode.classList.toggle('active', this.exploded);
      this.el.btnExplode.setAttribute('aria-pressed', this.exploded ? 'true' : 'false');
      this.toast(this.exploded ? '拆解视图：元件已分离' : '已恢复装配视图', 'ok');
    }

    toggleFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (this.el.viewerCard.requestFullscreen) {
        this.el.viewerCard.requestFullscreen().catch(() => this.toast('浏览器未允许全屏', 'warn'));
      }
    }

    highlightLabel(key) {
      if (!this.currentScene) return;
      const rec = this.currentScene.labels.find((l) => l.key === key);
      if (!rec) return;
      rec.el.classList.remove('flash');
      void rec.el.offsetWidth;
      rec.el.classList.add('flash');
      setTimeout(() => rec.el.classList.remove('flash'), 2600);
    }

    onAnnotation(expId, key, labelText) {
      if (!this.currentExp || this.currentExp.id !== expId) return;
      const ann = this.currentExp.annotations && this.currentExp.annotations[key];
      if (!ann) {
        this.addChat('assistant', '<p><b>' + this.escape(labelText) + '</b> 是当前实验的关键部件。继续问我它的作用，或查看右侧原理讲解。</p>');
      } else {
        this.addChat('assistant', '<p><b>' + this.escape(ann.title) + '</b></p><p>' + ann.text + '</p>');
      }
      this.switchTab('qa');
    }

    /* ---------------- Modals ---------------- */
    openTrace() {
      this.renderTrace();
      this.openModal('traceModal');
    }

    renderTrace() {
      if (!this.el.traceSummary || !this.el.traceList) return;
      const validations = this.trace.filter((t) => t.tool === 'physics.validate').length;
      const measurements = this.trace.filter((t) => t.tool === 'measurement.record').length;
      this.el.traceSummary.innerHTML =
        '<div class="trace-chip"><span>工具调用</span><strong>' + this.trace.length + '</strong></div>' +
        '<div class="trace-chip"><span>知识检索命中</span><strong>' + (this.memory.knowledgeHits || 0) + '</strong></div>' +
        '<div class="trace-chip"><span>物理校验</span><strong>' + validations + '</strong></div>' +
        '<div class="trace-chip"><span>测量记录</span><strong>' + measurements + '</strong></div>';
      const list = this.trace.slice().reverse().slice(0, 40).map((t) => (
        '<div class="trace-item"><span class="trace-dot ' + (t.status === 'warn' ? 'warn' : '') + '"></span>' +
        '<div class="trace-main"><div class="trace-top"><span class="trace-tool">' + this.escape(t.tool) + '</span><span class="trace-time">' + this.timeString(t.time) + '</span></div>' +
        '<div class="trace-detail">' + this.escape(t.detail) + '</div></div></div>'
      )).join('');
      const rag = (this.lastRetrieval || []).slice(0, 3).map((h) => '<div>· <b>' + this.escape(h.expName) + ' / ' + this.escape(h.section) + '</b> — ' + this.escape(h.text.slice(0, 90)) + '…</div>').join('');
      this.el.traceList.innerHTML = (list || '<div class="dash-empty">还没有工具调用。发出第一条指令后这里会记录完整轨迹。</div>') +
        (rag ? '<div class="trace-rag"><b>最近一次 RAG 检索</b>' + rag + '</div>' : '');
    }

    copyTrace() {
      const text = this.trace.map((t) => '[' + this.timeString(t.time) + '] ' + t.tool + ' :: ' + t.detail).join('\n');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => this.toast('Agent 轨迹已复制', 'ok')).catch(() => this.toast('复制失败', 'warn'));
      } else {
        this.toast('当前环境不支持剪贴板', 'warn');
      }
    }

    openDashboard() {
      this.renderDashboard();
      this.openModal('dashboardModal');
    }

    renderDashboard() {
      if (!this.el.dashStats) return;
      const m = this.memory;
      const quiz = m.quiz || { correct: 0, total: 0 };
      const acc = quiz.total ? Math.round((quiz.correct / quiz.total) * 100) + '%' : '—';
      this.el.dashStats.innerHTML =
        '<div class="dash-stat"><span>实验覆盖</span><strong>' + Object.keys(m.experiments || {}).length + '<small>/9</small></strong></div>' +
        '<div class="dash-stat"><span>工具调用</span><strong>' + (m.tools || 0) + '</strong></div>' +
        '<div class="dash-stat"><span>知识命中</span><strong>' + (m.knowledgeHits || 0) + '</strong></div>' +
        '<div class="dash-stat"><span>测量记录</span><strong>' + (m.measurements || 0) + '</strong></div>' +
        '<div class="dash-stat"><span>答题正确率</span><strong>' + acc + '</strong></div>';

      const usage = Object.keys(m.experiments || {}).map((id) => ({
        id: id,
        name: PL.expById[id] ? PL.expById[id].name : id,
        n: m.experiments[id]
      })).sort((a, b) => b.n - a.n);
      const max = Math.max(1, ...usage.map((u) => u.n));
      this.el.dashChart.innerHTML = usage.length ? usage.map((u) => (
        '<div class="dash-bar"><span title="' + this.escape(u.name) + '">' + this.escape(u.name) + '</span><i><b style="width:' + Math.round((u.n / max) * 100) + '%"></b></i><em>' + u.n + '</em></div>'
      )).join('') : '<div class="dash-empty">还没有实验记录。</div>';

      const misconceptions = Object.keys(m.misconceptions || {}).sort((a, b) => m.misconceptions[b] - m.misconceptions[a]);
      this.el.dashMisconceptions.innerHTML = misconceptions.length ? misconceptions.slice(0, 6).map((k) => (
        '<div class="mis-item"><b>' + m.misconceptions[k] + '×</b><span>' + this.escape(k) + '</span></div>'
      )).join('') : '<div class="dash-empty">尚未记录误区。完成一次检测后会出现在这里。</div>';

      const events = (m.events || []).slice(0, 9);
      this.el.dashTimeline.innerHTML = events.length ? events.map((e) => (
        '<div class="dash-event"><time>' + this.timeString(e.time) + '</time><span>' + this.escape(e.label) + '</span></div>'
      )).join('') : '<div class="dash-empty">还没有学习事件。</div>';
      if (m.demoData) this.el.dashStats.setAttribute('data-demo', 'true');
      if (this.el.dashHint) {
        const covered = Object.keys(m.experiments || {}).length;
        this.el.dashHint.textContent = m.demoData
          ? '当前显示的是“演示数据”，用于评委展示班级学习画像；点击「清空本机数据」可恢复到真实会话。'
          : covered < 3
            ? '当前只覆盖 ' + covered + '/9 个实验。继续运行另外两条评委演示线，或点击「载入演示数据」查看完整班级样例。'
            : '数据来自本机真实操作记录：实验切换、工具调用、测量、答题与误区都会写入这里。';
      }
    }

    seedDashboard() {
      this.memory = {
        experiments: {
          michelson: 3, photoelectric: 2, cavendish: 2, 'angular-momentum': 2, bernoulli: 1
        },
        tools: 42,
        knowledgeHits: 14,
        measurements: 15,
        quiz: { correct: 5, total: 7 },
        misconceptions: {
          '认为遏止电压由光强决定': 3,
          '把单程位移直接当成条纹数': 2,
          '认为引力偏角与距离无关': 1
        },
        events: [
          { type: 'quiz.wrong', label: '误区：认为遏止电压由光强决定', time: Date.now() - 1000 * 60 * 18 },
          { type: 'measurement.record', label: '记录测量数据 · 光电效应', time: Date.now() - 1000 * 60 * 21 },
          { type: 'scene.open', label: '打开实验 · 卡文迪许实验', time: Date.now() - 1000 * 60 * 27 },
          { type: 'quiz.correct', label: '答对：M1 移动 λ/2 条纹移过一条', time: Date.now() - 1000 * 60 * 31 },
          { type: 'measurement.record', label: '记录测量数据 · 迈克尔逊干涉仪', time: Date.now() - 1000 * 60 * 34 }
        ],
        demoData: true
      };
      this.saveMemory();
      this.renderDashboard();
      this.toast('已载入演示学习数据（用于评委展示）', 'ok');
    }

    resetMemory() {
      this.memory = {
        experiments: {},
        tools: 0,
        knowledgeHits: 0,
        measurements: 0,
        quiz: { correct: 0, total: 0 },
        misconceptions: {},
        events: [],
        demoData: false
      };
      this.measurements = {};
      this.trace = [];
      this.lastRetrieval = [];
      this.quizState = {};
      this.saveMemory();
      this.saveJSON('physlab.measurements.v1', {});
      this.renderDashboard();
      this.renderMeasurement();
      this.updateTraceCount();
      this.toast('本机学习数据已清空', 'ok');
    }

    openDemoModal() {
      this.openModal('demoModal');
    }

    async startDemo(expId) {
      const def = DEMO_DEFS[expId];
      if (!def) return;
      this.closeModal('demoModal');
      this.demo = { active: true, expId: expId, step: 0, prediction: null, quiz: null, fit: null };
      this.el.demoCoach.hidden = false;
      this.el.demoAct.textContent = def.act;
      this.el.demoBody.innerHTML = '<h4>正在准备演示场景</h4><p>构建 ' + this.escape(PL.expById[expId].name) + '，并准备可复现的测量数据…</p>';
      this.el.demoProgress.innerHTML = Array.from({ length: 5 }).map((_, i) => '<i class="' + (i === 0 ? 'on' : '') + '"></i>').join('');
      this.recordTool('demo.start', '启动评委演示 · ' + def.act, 'ok', { expId: expId });
      this.recordEvent('demo.start', '评委演示 · ' + def.act, { expId: expId });
      try {
        await this.buildExperiment(expId, def.buildParams, { fromDemo: true });
      } catch (err) {
        this.el.demoBody.innerHTML = '<h4>场景构建失败</h4><p>' + this.escape(err.message) + '</p>';
        return;
      }
      if (this.agent) this.agent.retrieve(PL.expById[expId].name + ' ' + def.intro, expId);
      this.switchTab('lesson');
      this.renderDemo();
    }

    closeDemo(silent) {
      if (!this.demo || !this.demo.active) {
        if (this.el.demoCoach) this.el.demoCoach.hidden = true;
        return;
      }
      const act = this.demo.expId;
      this.demo.active = false;
      if (this.el.demoCoach) this.el.demoCoach.hidden = true;
      this.recordEvent('demo.stop', '退出评委演示 · ' + (PL.expById[act] ? PL.expById[act].name : act));
      if (!silent) this.toast('已退出演示模式，实验仍可继续操作', 'ok');
    }

    demoNext(step) {
      this.demo.step = step;
      this.renderDemo();
    }

    renderDemo() {
      if (!this.demo || !this.demo.active) return;
      const def = DEMO_DEFS[this.demo.expId];
      if (!def) return;
      this.el.demoProgress.innerHTML = Array.from({ length: 5 }).map((_, i) => '<i class="' + (i <= this.demo.step ? 'on' : '') + '"></i>').join('');
      const q = def.quiz;
      let html = '';
      if (this.demo.step === 0) {
        html = '<h4>' + this.escape(def.act) + '</h4><p>' + this.escape(def.intro) + '</p>' +
          '<div class="coach-actions"><button class="measure-btn primary" data-demo-action="next" type="button">进入：先让学生预测</button></div>';
      } else if (this.demo.step === 1) {
        if (!this.demo.prediction) {
          html = '<h4>先预测，再观察</h4><p>' + this.escape(q.predict.q) + '</p><div class="coach-choices">' +
            q.predict.options.map((o, i) => '<button class="coach-choice" data-demo-action="predict" data-choice="' + i + '" type="button">' + this.escape(o) + '</button>').join('') +
            '</div>';
        } else {
          const p = this.demo.prediction;
          html = '<h4>先预测，再观察</h4><p>' + this.escape(q.predict.q) + '</p>' +
            '<div class="coach-feedback ' + (p.correct ? 'ok' : 'no') + '"><b>' + (p.correct ? '预测正确。' : '这个前概念需要修正。') + '</b> ' + this.escape(q.predict.explain) + '</div>' +
            '<div class="coach-actions"><button class="measure-btn primary" data-demo-action="next" type="button">观察真实现象</button></div>';
        }
      } else if (this.demo.step === 2) {
        html = '<h4>观察 + 采样</h4><p>现在让同一套物理引擎生成 5 组可复现的测量数据，并立即拟合并传播不确定度。</p>' +
          '<div class="coach-actions"><button class="measure-btn primary" data-demo-action="measure" type="button">生成 5 组测量数据</button></div>';
      } else if (this.demo.step === 3) {
        const f = this.demo.fit;
        if (f) {
          html = '<h4>' + this.escape(def.resultTitle) + '</h4><div class="coach-formula">' + this.escape(f.equation) + '</div><div class="coach-metrics">' +
            f.metrics.slice(0, 4).map((m) => '<div class="coach-metric"><span>' + this.escape(m.label) + '</span><strong>' + this.escape(String(m.value)) + ' ' + this.escape(m.unit || '') + '</strong></div>').join('') +
            '</div><p>' + this.escape(f.note) + '</p><div class="coach-actions"><button class="measure-btn primary" data-demo-action="next" type="button">进入迁移检测</button></div>';
        } else {
          html = '<h4>数据不足</h4><p>请先记录至少两组数据。</p><div class="coach-actions"><button class="measure-btn" data-demo-action="measure" type="button">重新采样</button></div>';
        }
      } else if (this.demo.step === 4) {
        if (!this.demo.quiz) {
          html = '<h4>迁移检测</h4><p>' + this.escape(q.quiz.q) + '</p><div class="coach-choices">' +
            q.quiz.options.map((o, i) => '<button class="coach-choice" data-demo-action="quiz" data-choice="' + i + '" type="button">' + this.escape(o) + '</button>').join('') +
            '</div>';
        } else {
          const z = this.demo.quiz;
          html = '<h4>迁移检测</h4><p>' + this.escape(q.quiz.q) + '</p>' +
            '<div class="coach-feedback ' + (z.correct ? 'ok' : 'no') + '"><b>' + (z.correct ? '回答正确。' : '已识别误区并写入学习档案。') + '</b> ' + this.escape(q.quiz.explain) + '</div>' +
            '<div class="coach-actions"><button class="measure-btn primary" data-demo-action="dashboard" type="button">查看学习看板</button></div>';
        }
      } else {
        html = '<h4>演示完成</h4><p>这条演示线已产生：真实测量数据、拟合结果、答题记录和误区记录。打开学习看板查看本机学习证据。</p>' +
          '<div class="coach-actions"><button class="measure-btn primary" data-demo-action="dashboard" type="button">打开学习看板</button><button class="measure-btn" data-demo-action="close" type="button">结束演示</button></div>';
      }
      this.el.demoBody.innerHTML = html;
    }

    handleDemoAction(action, choice) {
      if (!this.demo || !this.demo.active) return;
      const def = DEMO_DEFS[this.demo.expId];
      if (action === 'next') {
        this.demo.step += 1;
        this.renderDemo();
        this.recordTool('demo.step', '演示推进到步骤 ' + this.demo.step, 'ok');
      } else if (action === 'predict') {
        const q = def.quiz.predict;
        const correct = choice === q.answer;
        this.demo.prediction = { choice: choice, correct: correct };
        this.recordQuizResult(correct, correct ? null : q.misconception, q.q);
        this.recordTool('quiz.evaluate', '演示预测 · ' + (correct ? '正确' : '识别前概念'), correct ? 'ok' : 'warn');
        this.renderDemo();
      } else if (action === 'measure') {
        const fit = this.loadDemoMeasurements(this.demo.expId);
        this.demo.fit = fit;
        this.demo.step = 3;
        this.switchTab('data');
        this.renderDemo();
      } else if (action === 'quiz') {
        const q = def.quiz.quiz;
        const correct = choice === q.answer;
        this.demo.quiz = { choice: choice, correct: correct };
        this.recordQuizResult(correct, correct ? null : q.misconception, q.q);
        this.recordTool('quiz.evaluate', '演示迁移题 · ' + (correct ? '正确' : '识别误区'), correct ? 'ok' : 'warn');
        this.renderDemo();
      } else if (action === 'dashboard') {
        this.recordEvent('demo.complete', '评委演示完成 · ' + def.act);
        this.closeDemo(true);
        this.openDashboard();
      } else if (action === 'close') {
        this.closeDemo();
      }
    }

    openModal(id) {
      const m = document.getElementById(id);
      if (!m) return;
      m.classList.add('show');
      m.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    closeModal(id) {
      const m = document.getElementById(id);
      if (!m) return;
      m.classList.remove('show');
      m.setAttribute('aria-hidden', 'true');
      if (!document.querySelector('.modal-backdrop.show')) document.body.style.overflow = '';
    }

    copyLink() {
      const text = this.el.shareUrl.value;
      const done = () => this.toast('预览链接已复制', 'ok');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(() => this.fallbackCopy(text, done));
      } else {
        this.fallbackCopy(text, done);
      }
    }

    fallbackCopy(text, done) {
      this.el.shareUrl.select();
      this.el.shareUrl.setSelectionRange(0, 99999);
      try { document.execCommand('copy'); done(); } catch (e) { this.toast('复制失败，请手动选择链接', 'warn'); }
    }

    toast(message, type, duration) {
      const t = document.createElement('div');
      t.className = 'toast ' + (type || '');
      t.textContent = message;
      this.el.toastStack.appendChild(t);
      setTimeout(() => {
        t.classList.add('out');
        setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
      }, duration || 2800);
    }

    escape(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    /* ---------------- Events ---------------- */
    bindEvents() {
      this.agent = new PL.Agent(this);

      this.el.experimentList.addEventListener('click', (e) => {
        const item = e.target.closest('.exp-item');
        if (!item) return;
        this.switchExperiment(item.dataset.id);
      });

      this.el.search.addEventListener('input', () => {
        this.renderExperimentList(this.el.search.value);
      });

      this.el.command.addEventListener('keydown', (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendCommand();
        }
      });
      this.el.btnSend.addEventListener('click', () => this.sendCommand());

      this.el.qaInput.addEventListener('keydown', (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendQA();
        }
      });
      this.el.btnQaSend.addEventListener('click', () => this.sendQA());

      this.el.suggestions.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cmd]');
        if (!b) return;
        this.el.command.value = b.dataset.cmd;
        this.sendCommand(b.dataset.cmd);
      });

      this.el.chat.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-cmd]');
        if (chip) {
          this.el.command.value = chip.dataset.cmd;
          this.sendCommand(chip.dataset.cmd);
        }
      });

      document.querySelectorAll('.teach-tab').forEach((btn) => {
        btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
      });

      this.el.panelLesson.addEventListener('click', (e) => {
        const acc = e.target.closest('.acc-head');
        if (acc) {
          const item = acc.parentElement;
          const body = item.querySelector('.acc-body');
          const open = item.classList.toggle('open');
          if (body) body.style.maxHeight = open ? body.scrollHeight + 'px' : '0px';
          return;
        }
        const q = e.target.closest('.question-card');
        if (q) {
          q.classList.toggle('open');
          return;
        }
        const ann = e.target.closest('.ann-chip');
        if (ann) {
          this.onAnnotation(this.currentExp.id, ann.dataset.ann, ann.textContent);
        }
      });

      this.el.panelParams.addEventListener('input', (e) => {
        const input = e.target.closest('[data-param]');
        if (!input) return;
        const key = input.dataset.param;
        const def = this.currentExp.params.find((p) => p.key === key);
        if (!def) return;
        const value = def.type === 'select' ? input.value : parseFloat(input.value);
        this.queueParam(key, value);
      });

      this.el.btnRotate.addEventListener('click', () => this.toggleAutorotate());
      this.el.btnExplode.addEventListener('click', () => this.toggleExplode());
      this.el.btnResetView.addEventListener('click', () => {
        if (this.currentScene) {
          this.currentScene.resetCamera();
          this.toast('视角已重置', 'ok');
        }
      });
      this.el.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
      this.el.btnShare.addEventListener('click', () => this.openShare());
      this.el.btnGuide.addEventListener('click', () => this.openModal('guideModal'));
      this.el.btnPhet.addEventListener('click', () => this.openModal('phetModal'));
      this.el.btnCopyLink.addEventListener('click', () => this.copyLink());
      this.el.btnResetChat.addEventListener('click', () => this.clearChat());

      this.el.btnMeasure.addEventListener('click', () => this.switchTab('data'));
      this.el.btnTrace.addEventListener('click', () => this.openTrace());
      this.el.btnDashboard.addEventListener('click', () => this.openDashboard());
      this.el.btnDemo.addEventListener('click', () => this.openDemoModal());
      this.el.btnTraceCopy.addEventListener('click', () => this.copyTrace());
      this.el.btnSeedDashboard.addEventListener('click', () => this.seedDashboard());
      this.el.btnResetMemory.addEventListener('click', () => this.resetMemory());
      this.el.btnDemoDashboard.addEventListener('click', () => { this.closeModal('demoModal'); this.openDashboard(); });
      document.querySelectorAll('[data-demo]').forEach((b) => {
        b.addEventListener('click', () => this.startDemo(b.dataset.demo));
      });
      this.el.btnCloseDemo.addEventListener('click', () => this.closeDemo());
      this.el.demoBody.addEventListener('click', (e) => {
        const b = e.target.closest('[data-demo-action]');
        if (!b) return;
        this.handleDemoAction(b.dataset.demoAction, b.dataset.choice != null ? Number(b.dataset.choice) : null);
      });

      this.el.panelData.addEventListener('click', (e) => {
        const act = e.target.closest('[data-mact]');
        if (act) {
          const a = act.dataset.mact;
          if (a === 'record') this.recordMeasurement();
          else if (a === 'demo') this.loadDemoMeasurements(this.currentExp.id);
          else if (a === 'clear') this.clearMeasurements();
          else if (a === 'csv') this.copyMeasurementsCSV();
          else if (a === 'report') this.printMeasurementReport();
          return;
        }
        const q = e.target.closest('[data-quiz]');
        if (q) this.answerQuiz(q.dataset.quiz, q.dataset.qtype, Number(q.dataset.choice));
      });

      document.querySelectorAll('[data-close]').forEach((b) => {
        b.addEventListener('click', () => this.closeModal(b.dataset.close));
      });
      document.querySelectorAll('.modal-backdrop').forEach((m) => {
        m.addEventListener('click', (e) => {
          if (e.target === m) this.closeModal(m.id);
        });
      });

      document.addEventListener('fullscreenchange', () => {
        if (this.currentScene) setTimeout(() => this.currentScene.resize(), 100);
      });

      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.el.search.focus();
        }
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-backdrop.show').forEach((m) => this.closeModal(m.id));
        }
      });

      window.addEventListener('popstate', () => {
        const q = new URLSearchParams(location.search);
        const id = q.get('sim');
        if (id && PL.expById[id] && (!this.currentExp || this.currentExp.id !== id)) {
          const exp = PL.expById[id];
          const params = {};
          exp.params.forEach((p) => {
            if (q.has(p.key)) {
              params[p.key] = p.type === 'select' ? q.get(p.key) : parseFloat(q.get(p.key));
            }
          });
          this.buildExperiment(id, params, { pop: true });
        }
      });
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.__PHYS_LAB__ = app;
    app.init();
  });
})();
