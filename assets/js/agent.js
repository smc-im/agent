/* =========================================================
   PHYS·LAB agent — local semantic parser + teaching composer
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const PLANS = {
    michelson: '识别 4 个核心元件 · 布置 3 条光路 · 生成等倾干涉场',
    coriolis: '建立球面地球 · 局地切平面 · 求解旋转参考系轨迹',
    'double-slit': '布置双缝光路 · 生成相干波场 · 计算条纹间距',
    pendulum: '搭建单摆支架 · 积分非线性运动方程 · 测量周期',
    photoelectric: '构建真空光电管 · 生成光子/电子流 · 计算遏止电压',
    faraday: '绕制感应线圈 · 驱动磁铁 · 解算磁通量与感应电动势',
    'angular-momentum': '搭建旋转平台 · 布置滑动配重 · 解算角动量守恒',
    bernoulli: '生成文丘里管 · 布置压力计 · 求解连续性与伯努利方程',
    cavendish: '搭建扭秤 · 放置铅球 · 生成光杠杆与引力矩'
  };

  const PLAN_STEPS = {
    michelson: '分光板 / 补偿板 / 双镜 / 观察屏',
    coriolis: '地球 / 自转轴 / 切平面 / 轨迹',
    'double-slit': '激光 / 双缝 / 屏 / 干涉场',
    pendulum: '支架 / 摆线 / 摆球 / 角度标尺',
    photoelectric: '阴极 / 阳极 / 光束 / 电子',
    faraday: '线圈 / 磁铁 / 检流计 / 磁场线',
    'angular-momentum': '转台 / 配重 / 转轴 / 角动量矢量',
    bernoulli: '文丘里管 / 压力计 / 流线 / 压差',
    cavendish: '悬丝 / 铅球 / 平面镜 / 光杠杆'
  };

  class Agent {
    constructor(app) {
      this.app = app;
      this.busy = false;
      this.retriever = PL.Retriever ? new PL.Retriever() : null;
    }

    get experiments() { return PL.experiments; }

    normalize(text) {
      return String(text || '')
        .replace(/\u3000/g, ' ')
        .replace(/[？?！!]+/g, (m) => m[0])
        .trim();
    }

    matchExperiment(text) {
      const t = text.toLowerCase();
      let best = null;
      let bestScore = 0;
      this.experiments.forEach((exp) => {
        let score = 0;
        if (t.indexOf(exp.name.toLowerCase()) >= 0) score += 80;
        if (t.indexOf(exp.en.toLowerCase()) >= 0) score += 50;
        exp.keywords.forEach((kw) => {
          if (!kw) return;
          const k = kw.toLowerCase();
          if (t.indexOf(k) >= 0) score += Math.min(12, 3 + k.length * 1.3);
        });
        if (score > bestScore) {
          bestScore = score;
          best = exp;
        }
      });
      return bestScore >= 5 ? { exp: best, score: bestScore } : { exp: null, score: bestScore };
    }

    hasAny(text, words) {
      return words.some((w) => text.indexOf(w) >= 0);
    }

    retrieve(query, expId) {
      if (!this.retriever) return [];
      const hits = this.retriever.search(query, expId, 3);
      this.app.lastRetrieval = hits;
      this.app.recordTool(
        'knowledge.search',
        '“' + query.slice(0, 26) + '” → ' + hits.length + ' 条知识',
        'ok',
        { hits: hits.length, results: hits.slice(0, 3), expId: expId }
      );
      return hits;
    }

    citationHTML(hits) {
      if (!hits || !hits.length) return '';
      return '<div class="cite">依据：' + hits.slice(0, 2).map((h) => this.app.escape(h.expName + ' · ' + h.section)).join('；') + '</div>';
    }

    detectIntent(text, exp) {
      const t = text;
      if (this.hasAny(t, ['清空对话', '清空聊天', '清除对话'])) return 'clear-chat';
      if (this.hasAny(t, ['分享', '链接', '预览地址', '生成链接', '导出链接', '二维码'])) return 'share';
      if (this.hasAny(t, ['全屏'])) return 'fullscreen';
      if (this.hasAny(t, ['拆解', '分解视图', '爆炸图'])) return 'explode';
      if (this.hasAny(t, ['自动旋转', '旋转场景'])) return 'autorotate';
      if (this.hasAny(t, ['复位', '重置参数', '恢复默认', '重置场景', '恢复初始'])) return 'reset';
      if (this.hasAny(t, ['误差', '不确定度', '系统误差', '随机误差', '准确度', '精度', '改进实验', '减小误差'])) return 'error';
      if (this.hasAny(t, ['思考题', '习题', '课后题', '这道题', '题目'])) return 'thought';
      if (this.hasAny(t, ['画出', '绘制', '生成', '演示', '展示', '打开', '建模', '构建', '搭建', '切换', '进入', '做一个', '做个', '看看', '观察', '渲染'])) return 'build';
      if (this.hasAny(t, ['原理', '解释', '公式', '推导', '含义', '怎么算', '如何计算', '是什么'])) return 'explain';
      if (!/为什么|怎么|如何|什么原理/.test(t) &&
          this.hasAny(t, ['调', '改', '设置', '变成', '增大', '减小', '提高', '降低', '变长', '变短', '把', '让', '设定', '换成']) &&
          (/波长|缝距|间距|摆长|纬度|速度|电压|光强|重力|匝数|频率|放大|位移|倾角|方位|阻尼|角速度|半径|转动惯量|配重|密度|压力|压强|扭转|时间倍率|质量|收臂|展臂|角动量/.test(t))) return 'param';
      if (this.hasAny(t, ['调', '改', '设置', '变成', '增大', '减小', '提高', '降低', '变长', '变短', '把', '让', '设定', '换成', '收臂', '展臂'])) {
        if (/\d/.test(t) || /调大|调小|增大|减小|提高|降低|变长|变短|收臂|展臂/.test(t)) return 'param';
      }
      if (this.hasAny(t, ['为什么', '怎么', '如何', '吗', '呢', '?', '？'])) return 'question';
      if (exp && t.length <= 18) return 'build';
      return 'chat';
    }

    num(text, re) {
      const m = text.match(re);
      if (!m) return null;
      const v = parseFloat(m[1]);
      return isFinite(v) ? v : null;
    }

    parseParams(text, exp) {
      const out = {};
      const rel = [];
      const t = text.replace(/\s+/g, '');
      if (!exp) return { values: out, rel: rel };

      const add = (key, value) => {
        if (value != null && isFinite(value)) out[key] = value;
      };

      if (exp.id === 'michelson') {
        const nm = this.num(t, /(\d{3,4}(?:\.\d+)?)\s*(?:nm|纳米)/i) != null
          ? this.num(t, /(\d{3,4}(?:\.\d+)?)\s*(?:nm|纳米)/i)
          : this.num(t, /(?:波长|λ)[^0-9]{0,8}(\d{3,4}(?:\.\d+)?)/i);
        if (nm != null) add('lambda', nm);
        const d = this.num(t, /(?:位移|动镜|光程差|d)[^0-9\-]{0,10}(-?\d+(?:\.\d+)?)\s*(nm|纳米|µm|um|微米|mm|毫米)?/i);
        if (d != null) {
          const unit = (t.match(/(?:位移|动镜|光程差|d)[^0-9\-]{0,10}-?\d+(?:\.\d+)?\s*(nm|纳米|µm|um|微米|mm|毫米)/i) || [])[1] || 'µm';
          let val = d;
          if (/nm|纳米/.test(unit)) val = d / 1000;
          else if (/mm|毫米/.test(unit)) val = d * 1000;
          add('d', val);
        }
        if (/倾角|倾斜/.test(t)) {
          const tilt = this.num(t, /(?:倾角|倾斜)[^0-9]{0,8}(\d+(?:\.\d+)?)/);
          if (tilt != null) add('tilt', tilt);
        }
        if (/调大|增大|提高|变大/.test(t) && /波长|λ/.test(t)) rel.push({ key: 'lambda', dir: 1 });
        if (/调小|减小|降低|变小/.test(t) && /波长|λ/.test(t)) rel.push({ key: 'lambda', dir: -1 });
        if (/调大|增大|提高|变大/.test(t) && /位移|动镜|光程差/.test(t)) rel.push({ key: 'd', dir: 1 });
        if (/调小|减小|降低|变小/.test(t) && /位移|动镜|光程差/.test(t)) rel.push({ key: 'd', dir: -1 });
      }

      if (exp.id === 'double-slit') {
        const nm = this.num(t, /(\d{3,4}(?:\.\d+)?)\s*(?:nm|纳米)/i) != null
          ? this.num(t, /(\d{3,4}(?:\.\d+)?)\s*(?:nm|纳米)/i)
          : this.num(t, /(?:波长|λ)[^0-9]{0,8}(\d{3,4}(?:\.\d+)?)/i);
        if (nm != null) add('lambda', nm);
        const d = this.num(t, /(?:缝距|缝间距|双缝间距|间距|d)[^0-9]{0,8}(\d+(?:\.\d+)?)\s*(mm|毫米|µm|um|微米)?/i);
        if (d != null) {
          const isUm = /µm|um|微米/i.test(t.slice(Math.max(0, t.indexOf(String(d)) - 8), t.indexOf(String(d)) + 12));
          add('d', isUm ? d / 1000 : d);
        }
        const L = this.num(t, /(?:屏距|缝屏距离|屏的距离|距离|L)[^0-9]{0,8}(\d+(?:\.\d+)?)\s*(m|米|cm|厘米)?/i);
        if (L != null) add('L', /cm|厘米/i.test(t) ? L / 100 : L);
        if (/调大|增大|提高|变疏/.test(t) && /缝距|间距|d/.test(t)) rel.push({ key: 'd', dir: 1 });
        if (/调小|减小|降低|变密/.test(t) && /缝距|间距|d/.test(t)) rel.push({ key: 'd', dir: -1 });
        if (/调大|增大|提高/.test(t) && /屏距|距离|L/.test(t)) rel.push({ key: 'L', dir: 1 });
        if (/调小|减小|降低/.test(t) && /屏距|距离|L/.test(t)) rel.push({ key: 'L', dir: -1 });
      }

      if (exp.id === 'pendulum') {
        const L = this.num(t, /(?:摆长|长度|L)[^0-9]{0,8}(\d+(?:\.\d+)?)\s*(m|米|cm|厘米)?/i);
        if (L != null) add('L', /cm|厘米/i.test(t) ? L / 100 : L);
        const g = this.num(t, /(?:重力加速度|重力|g)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (g != null) add('g', g);
        if (/月球/.test(t)) add('g', 1.6);
        if (/地球/.test(t) && /重力|g/.test(t)) add('g', 9.8);
        if (/木星/.test(t)) add('g', 24.8);
        const th = this.num(t, /(?:摆角|初始角|角度|θ)[^0-9]{0,8}(\d+(?:\.\d+)?)/);
        if (th != null) add('theta0', th);
        const b = this.num(t, /(?:阻尼|摩擦)[^0-9]{0,8}(\d+(?:\.\d+)?)/);
        if (b != null) add('damping', b);
        if (/调大|增大|提高/.test(t) && /摆长|长度/.test(t)) rel.push({ key: 'L', dir: 1 });
        if (/调小|减小|降低/.test(t) && /摆长|长度/.test(t)) rel.push({ key: 'L', dir: -1 });
      }

      if (exp.id === 'coriolis') {
        const lat = this.num(t, /(?:纬度|φ)[^0-9\-]{0,6}(-?\d+(?:\.\d+)?)/);
        if (lat != null) add('lat', lat);
        if (/北极/.test(t)) add('lat', 70);
        if (/南极/.test(t)) add('lat', -70);
        if (/赤道/.test(t)) add('lat', 0);
        const sp = this.num(t, /(?:速度|初速|v)[^0-9]{0,6}(\d+(?:\.\d+)?)/);
        if (sp != null) add('speed', sp);
        const az = this.num(t, /(?:方位|方向|方位角|A)[^0-9]{0,6}(\d+(?:\.\d+)?)/);
        if (az != null) add('azimuth', az);
        const gain = this.num(t, /(?:放大|倍率|增强)[^0-9]{0,6}(\d+)/);
        if (gain != null) add('gain', gain);
      }

      if (exp.id === 'photoelectric') {
        const nm = this.num(t, /(\d{3,4}(?:\.\d+)?)\s*(?:nm|纳米)/i) != null
          ? this.num(t, /(\d{3,4}(?:\.\d+)?)\s*(?:nm|纳米)/i)
          : this.num(t, /(?:波长|λ)[^0-9]{0,8}(\d{3,4}(?:\.\d+)?)/i);
        if (nm != null) add('lambda', nm);
        const vol = this.num(t, /(?:电压|偏压|U)[^0-9\-]{0,8}(-?\d+(?:\.\d+)?)\s*(?:v|伏)?/i);
        if (vol != null) add('voltage', vol);
        const inten = this.num(t, /(?:光强|强度|I)[^0-9]{0,6}(\d+(?:\.\d+)?)\s*%?/i);
        if (inten != null) add('intensity', inten);
        if (/铯|Cs/i.test(t)) add('material', 'Cs');
        if (/锌|Zn/i.test(t)) add('material', 'Zn');
        if (/铂|Pt/i.test(t)) add('material', 'Pt');
      }

      if (exp.id === 'faraday') {
        const f = this.num(t, /(?:频率|速度|f)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (f != null) add('speed', f);
        const turns = this.num(t, /(?:匝数|线圈|N)[^0-9]{0,8}(\d+)/i);
        if (turns != null) add('turns', Math.round(turns));
        const b = this.num(t, /(?:磁场|磁感应强度|磁性|B)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (b != null) add('field', b);
      }

      if (exp.id === 'angular-momentum') {
        const w = this.num(t, /(?:初始角速度|角速度|ω0|ω₀|omega)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (w != null) add('omega0', w);
        const r = this.num(t, /(?:配重半径|半径|r)[^0-9]{0,8}(\d+(?:\.\d+)?)\s*(m|米|cm|厘米)?/i);
        if (r != null) add('r', /cm|厘米/i.test(t) ? r / 100 : r);
        const m = this.num(t, /(?:配重质量|质量|m)[^0-9]{0,8}(\d+(?:\.\d+)?)\s*(kg|千克)?/i);
        if (m != null) add('m', m);
        const i0 = this.num(t, /(?:转台转动惯量|转动惯量|I0|I₀)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (i0 != null) add('I0', i0);
        if (/调大|增大|提高|展臂/.test(t) && /半径|配重|臂/.test(t)) rel.push({ key: 'r', dir: 1 });
        if (/调小|减小|降低|收臂/.test(t) && /半径|配重|臂/.test(t)) rel.push({ key: 'r', dir: -1 });
      }

      if (exp.id === 'bernoulli') {
        const v1 = this.num(t, /(?:宽截面流速|流速|速度|v1|v₁)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (v1 != null) add('v1', v1);
        const ratio = this.num(t, /(?:半径比|比值|ratio|喉部)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (ratio != null) add('ratio', ratio);
        const rho = this.num(t, /(?:流体密度|密度|ρ|rho)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (rho != null) add('rho', rho);
        const p1 = this.num(t, /(?:宽截面压力|压力|压强|p1|p₁)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (p1 != null) add('p1', p1);
        if (/调大|增大|提高/.test(t) && /半径比|比值/.test(t)) rel.push({ key: 'ratio', dir: 1 });
        if (/调小|减小|降低/.test(t) && /半径比|比值/.test(t)) rel.push({ key: 'ratio', dir: -1 });
      }

      if (exp.id === 'cavendish') {
        const big = this.num(t, /(?:大铅球|大球|M)[^0-9]{0,8}(\d+(?:\.\d+)?)\s*(kg|千克)?/);
        if (big != null) add('M', big);
        const small = this.num(t, /(?:小铅球|小球|m)[^0-9]{0,8}(\d+(?:\.\d+)?)\s*(kg|千克)?/);
        if (small != null) add('m', small);
        const gap = this.num(t, /(?:球间距离|最近距离|距离|间隙|d0|d₀)[^0-9]{0,8}(\d+(?:\.\d+)?)\s*(mm|毫米|cm|厘米|m|米)?/i);
        if (gap != null) add('gap', /mm|毫米/i.test(t) ? gap / 1000 : /cm|厘米/i.test(t) ? gap / 100 : gap);
        const kappa = this.num(t, /(?:扭转常数|悬丝|κ|kappa)[^0-9]{0,8}(\d+(?:\.\d+)?)/i);
        if (kappa != null) add('kappa', kappa);
        const gain = this.num(t, /(?:转角视觉放大|视觉放大|放大|倍率)[^0-9]{0,8}(\d+)/);
        if (gain != null) add('gain', gain);
        const ts = this.num(t, /(?:时间倍率|时间加速|加速)[^0-9]{0,8}(\d+)/);
        if (ts != null) add('timeScale', ts);
      }

      // clamp and normalize
      const values = {};
      exp.params.forEach((def) => {
        if (!(def.key in out)) return;
        let v = out[def.key];
        if (def.type === 'select') {
          if (def.options.some((o) => o.value === v)) values[def.key] = v;
          return;
        }
        if (def.unit === '°' && (def.key === 'lat' || def.key === 'azimuth')) {
          // allow 0-360 for latitude? clamp with signed wrap only for az
          if (def.key === 'azimuth') v = ((v % 360) + 360) % 360;
        }
        v = U.clamp(v, def.min, def.max);
        values[def.key] = v;
      });
      return { values: values, rel: rel };
    }

    async reply(text) {
      const clean = this.normalize(text);
      if (!clean) return;
      if (this.busy) {
        this.app.toast('智能体正在构建场景，请稍候…', 'warn');
        return;
      }
      const match = this.matchExperiment(clean);
      const exp = match.exp;
      const current = this.app.currentExp;
      const intent = this.detectIntent(clean, exp);

      if (intent === 'clear-chat') {
        this.app.clearChat();
        this.app.toast('对话已清空', 'ok');
        return;
      }
      if (intent === 'share') {
        this.app.openShare();
        this.app.addChat('user', clean, true);
        this.app.addChat('assistant', '预览链接已生成。链接中包含当前实验与全部参数，打开后会自动恢复同一组三维场景。');
        this.app.switchTab('qa');
        return;
      }
      if (intent === 'fullscreen') {
        this.app.toggleFullscreen();
        return;
      }
      if (intent === 'explode') {
        this.app.toggleExplode();
        return;
      }
      if (intent === 'autorotate') {
        this.app.toggleAutorotate();
        return;
      }
      if (intent === 'reset') {
        this.app.addChat('user', clean, true);
        this.app.resetParams();
        this.app.addChat('assistant', '已恢复当前实验的默认参数与初始状态。你可以继续调参，或换一个实验。');
        this.app.switchTab('qa');
        return;
      }

      this.app.addChat('user', clean, true);

      const general = this.findGeneral(clean);
      if (general && !exp) {
        this.app.addChat('assistant', general);
        this.app.switchTab('qa');
        return;
      }

      if (intent === 'build') {
        if (!exp) {
          const amb = this.ambiguousExperiment(clean);
          if (amb.length > 1) {
            this.app.addChat('assistant', this.clarify(amb));
          } else {
            this.app.addChat('assistant', this.noMatch(clean));
          }
          this.app.switchTab('qa');
          return;
        }
        const parsedBuild = this.parseParams(clean, exp);
        await this.runBuild(exp, clean, parsedBuild.values);
        return;
      }

      if (intent === 'param') {
        const targetExp = exp || current;
        if (!targetExp) {
          this.app.addChat('assistant', '先选择一个实验，我才能帮你调参。');
          return;
        }
        const parsed = this.parseParams(clean, targetExp);
        const hasValues = Object.keys(parsed.values).length > 0;
        if (!hasValues && !parsed.rel.length) {
          this.app.addChat('assistant', '我听到了调参意图，但没有识别到具体数值。可以这样说：<br><span class="hl">“把双缝间距调到 0.35 mm”</span><br><span class="hl">“纬度改成 45 度”</span>');
          this.app.switchTab('qa');
          return;
        }
        await this.applyParams(targetExp, parsed, clean);
        return;
      }

      if (intent === 'error') {
        const target = exp || current;
        const rag = this.retrieve(clean, target ? target.id : null);
        this.app.addChat('assistant', this.errorAnswer(target) + this.citationHTML(rag));
        this.app.switchTab('qa');
        this.app.setTabDot(false);
        return;
      }

      if (intent === 'thought') {
        const target = exp || current;
        const rag = this.retrieve(clean, target ? target.id : null);
        this.app.addChat('assistant', this.thoughtAnswer(target) + this.citationHTML(rag));
        this.app.switchTab('qa');
        return;
      }

      if (intent === 'explain' || intent === 'question') {
        const target = exp || current;
        if (!target) {
          this.app.addChat('assistant', this.noMatch(clean));
          this.app.switchTab('qa');
          return;
        }
        let answer = null;
        if (intent === 'question') answer = this.findQA(target, clean);
        if (!answer) answer = this.explainAnswer(target);
        const rag = this.retrieve(clean, target.id);
        this.app.addChat('assistant', answer + this.citationHTML(rag));
        this.app.switchTab('qa');
        if (exp && current && exp.id !== current.id) {
          this.app.toast('已匹配到「' + exp.name + '」；输入“打开' + exp.name + '”即可查看 3D 场景。', 'warn', 4200);
        }
        return;
      }

      // general / fallback
      const fallbackGeneral = this.findGeneral(clean);
      if (fallbackGeneral) {
        this.app.addChat('assistant', fallbackGeneral);
        this.app.switchTab('qa');
        return;
      }
      if (exp && exp.id !== (current && current.id)) {
        this.app.addChat('assistant', '你提到了<b>' + exp.name + '</b>。我可以直接把它构建成 3D 场景：<br><span class="hl">“画出' + exp.name + '”</span><br>也可以先问原理、误差或思考题。');
        this.app.switchTab('qa');
        return;
      }
      this.app.addChat('assistant', this.noMatch(clean));
      this.app.switchTab('qa');
    }

    async runBuild(exp, text, buildParams) {
      this.busy = true;
      this.app.setBusy(true);
      this.app.resetWorkflow();
      this.app.setAgentState('理解中', 'busy');
      this.app.switchTab('qa');
      this.app.recordTool('intent.parse', '识别实验意图 · ' + exp.name, 'ok', { expId: exp.id });
      this.retrieve(text, exp.id);

      this.app.flow('parse', 'active', '解析自然语言');
      this.app.showLoading('正在理解你的实验意图', '语义解析 · 关键词与参数抽取', 12);
      await sleep(240);
      this.app.flow('parse', 'done', '识别：' + exp.name);
      this.app.flow('plan', 'active', '规划三维场景');
      this.app.showLoading('正在规划三维实验场景', PLAN_STEPS[exp.id] || '组件与参数规划', 30);
      await sleep(330);
      this.app.flow('plan', 'done', PLAN_STEPS[exp.id] || '场景规划完成');

      this.app.flow('render', 'active', '创建 Three.js 场景');
      this.app.showLoading('正在渲染 ' + exp.name, '几何构建 · 材质 · 光路 · WebGL', 56);
      try {
        await this.app.buildExperiment(exp.id, buildParams || null, { fromAgent: true });
      } catch (err) {
        console.error(err);
        this.app.hideLoading();
        this.app.setBusy(false);
        this.app.setAgentState('构建失败', '');
        this.busy = false;
        this.app.addChat('assistant', '<p>三维场景构建失败：' + this.app.escape(err.message) + '</p><p>请刷新页面后重试，或换一个实验。</p>');
        return;
      }
      await sleep(300);
      this.app.flow('render', 'done', 'WebGL 实时渲染');
      this.app.flow('teach', 'active', '编排讲解与参数');
      this.app.showLoading('正在生成配套教学', '原理 · 公式 · 误差 · 思考题', 82);
      await sleep(280);
      this.app.flow('teach', 'done', '教学面板已同步');
      this.app.showLoading('场景已就绪', '预览链接已同步到地址栏', 100);
      await sleep(260);
      this.app.hideLoading();

      this.app.setBusy(false);
      this.app.setAgentState('已完成', 'done');
      this.busy = false;

      const annotate = /(标出|标注|标签|指出|位置|结构)/.test(text);
      let html = '<p>已为你构建 <b>' + exp.name + '</b> 三维场景。</p>' +
        '<p>' + (PLANS[exp.id] || '') + '。</p>' +
        (buildParams && Object.keys(buildParams).length ? '<p style="color:#8fd8bc">已同时应用指令中识别到的参数。</p>' : '') +
        '<p>' + this.shortLead(exp) + '</p>' +
        '<div class="mini-formula">' + exp.lesson.formula.split('<br>')[0] + '</div>';
      if (annotate) {
        const key = this.annotationKeyFor(exp, text);
        if (key) {
          const ann = exp.annotations[key];
          html += '<p>已在场景中标注关键部件：<b>' + (ann ? ann.title : '核心元件') + '</b>。点击 3D 标签可以查看元件注解。</p>';
          html += '<p><span class="hl">交互提示：</span>拖动旋转，滚轮缩放；打开右侧「参数调节」可实时改变物理量。</p>';
        } else {
          html += '<p>关键部件已加上 3D 标签，点击标签可以查看元件说明。</p>';
        }
      } else {
        html += '<p>右侧已同步原理、公式与参数面板。你可以直接说：<span class="hl">“把波长调到 550 纳米”</span> 或 <span class="hl">“分析一下误差”</span>。</p>';
      }
      html += '<p style="color:#8fd8bc">预览链接已更新：<a href="' + this.app.buildShareUrl() + '" target="_blank" rel="noopener">打开当前参数的三维预览 ↗</a></p>';
      this.app.addChat('assistant', html);
      this.app.switchTab('qa');
      this.app.recordTool('teaching.compose', '生成讲解 · ' + exp.name + ' · 公式 / 参数 / 误差入口', 'ok');
      this.app.recordEvent('agent.build', '智能体生成场景 · ' + exp.name, { expId: exp.id });

      if (annotate) {
        const key = this.annotationKeyFor(exp, text);
        if (key) this.app.highlightLabel(key);
      }
    }

    annotationKeyFor(exp, text) {
      const map = {
        michelson: [
          ['分光板', 'G1'], ['G1', 'G1'], ['补偿板', 'G2'], ['G2', 'G2'],
          ['动镜', 'M1'], ['M1', 'M1'], ['定镜', 'M2'], ['M2', 'M2'], ['观察屏', 'S'], ['屏幕', 'S']
        ],
        coriolis: [['轨迹', 'trail'], ['科里奥利', 'force'], ['切线', 'plane'], ['发射点', 'launch'], ['自转轴', 'axis']],
        'double-slit': [['双缝', 'slit'], ['缝', 'slit'], ['屏', 'screen'], ['波', 'wave'], ['间距', 'spacing']],
        pendulum: [['悬点', 'pivot'], ['摆长', 'string'], ['摆球', 'bob'], ['平衡', 'equilibrium'], ['角度', 'arc']],
        photoelectric: [['阴极', 'K'], ['阳极', 'A'], ['电子', 'electron'], ['光', 'light'], ['管', 'tube']],
        faraday: [['线圈', 'coil'], ['磁铁', 'magnet'], ['检流计', 'meter'], ['电流', 'current']],
        'angular-momentum': [['配重', 'weights'], ['转轴', 'axis'], ['角动量', 'L'], ['角速度', 'omega'], ['平台', 'disk']],
        bernoulli: [['宽截面', 'wide'], ['喉部', 'throat'], ['压力计', 'manometer'], ['流线', 'flow'], ['伯努利', 'formula']],
        cavendish: [['悬丝', 'wire'], ['小铅球', 'small'], ['大铅球', 'large'], ['平面镜', 'mirror'], ['标尺', 'scale'], ['激光', 'laser']]
      };
      const list = map[exp.id] || [];
      for (let i = 0; i < list.length; i++) {
        if (text.indexOf(list[i][0]) >= 0) return list[i][1];
      }
      return null;
    }

    async applyParams(exp, parsed, text) {
      const isCurrent = this.app.currentExp && this.app.currentExp.id === exp.id;
      const base = isCurrent ? Object.assign({}, this.app.currentScene.params) : {};
      exp.params.forEach((p) => { if (!(p.key in base)) base[p.key] = p.default; });
      const next = {};
      Object.keys(parsed.values).forEach((k) => { next[k] = parsed.values[k]; });
      parsed.rel.forEach((r) => {
        const def = exp.params.find((p) => p.key === r.key);
        if (!def) return;
        const span = def.max - def.min;
        const delta = r.key === 'lambda' ? 20 : span * 0.08;
        next[r.key] = U.clamp((next[r.key] != null ? next[r.key] : base[r.key]) + r.dir * delta, def.min, def.max);
      });

      this.busy = true;
      this.app.setBusy(true);
      this.app.setAgentState('调整中', 'busy');
      this.app.flow('parse', 'done', '识别调参意图');
      this.app.recordTool('param.parse', '解析参数 · ' + JSON.stringify(next), 'ok', { expId: exp.id });

      // ensure experiment is open
      if (!isCurrent) {
        this.app.addChat('assistant', '这个参数属于<b>' + exp.name + '</b>，我先为你打开该实验。');
        await this.app.buildExperiment(exp.id, next, { fromAgent: true, silent: true });
      } else {
        this.app.setParams(next, { silent: true });
      }

      const active = this.app.currentScene;
      const values = Object.assign({}, active.params);
      this.app.updateUrl();
      this.app.refreshReadouts();
      this.app.recordTool('scene.set_param', '写入 ' + Object.keys(next).join(' / ') + '，重算场景与读数', 'ok', { params: next });
      this.app.validateScene();

      const changes = Object.keys(parsed.values).concat(parsed.rel.map((r) => r.key));
      const unique = Array.from(new Set(changes));
      const html = this.paramAnswer(exp, unique, values, parsed.values);
      this.app.addChat('assistant', html);
      this.app.switchTab('qa');
      this.app.setTabDot(false);
      this.app.highlightParam(unique[0]);
      this.app.toast('参数已更新，三维现象同步变化', 'ok');
      await sleep(250);
      this.app.setBusy(false);
      this.app.setAgentState('已完成', 'done');
      this.busy = false;
    }

    paramAnswer(exp, keys, values, explicit) {
      const names = keys.map((k) => {
        const d = exp.params.find((p) => p.key === k);
        return d ? d.label : k;
      }).join('、');
      let body = '<p>已更新 <b>' + (names || '实验参数') + '</b>，三维场景正在实时响应。</p>';
      if (exp.id === 'double-slit') {
        const spacing = (values.lambda * 1e-9 * values.L) / (values.d * 1e-3) * 1000;
        body += '<p>当前条纹间距 <span class="hl">Δy = λL/d = ' + spacing.toFixed(2) + ' mm</span>。' +
          (spacing > 8 ? '条纹变得很疏，屏上可见的亮纹数量减少。' : spacing < 2 ? '条纹变得很密，建议增大屏距或减小缝距。' : '条纹疏密适中，便于测量。') + '</p>';
      } else if (exp.id === 'michelson') {
        const m = (2 * values.d * 1000) / values.lambda;
        body += '<p>往返光程差 <span class="hl">2d = ' + (2 * values.d).toFixed(2) + ' µm</span>，等效移过 ' + m.toFixed(1) + ' 条条纹。' +
          (values.tilt > 0.6 ? '镜面倾角较大，圆环已明显变为椭圆/弧形。' : '等倾圆环保持清晰。') + '</p>';
      } else if (exp.id === 'pendulum') {
        const T = 2 * Math.PI * Math.sqrt(values.L / values.g);
        body += '<p>小角度理论周期 <span class="hl">T₀ = ' + T.toFixed(3) + ' s</span>。' +
          (values.theta0 > 30 ? '当前摆角较大，实际周期会略长于 T₀。' : '当前摆角较小，简谐近似较好。') + '</p>';
      } else if (exp.id === 'coriolis') {
        const f = 2 * PL.constants.omegaEarth * Math.sin(values.lat * U.deg);
        const a = Math.abs(f * values.speed);
        body += '<p>科里奥利参数 <span class="hl">f = ' + f.toExponential(2) + ' s⁻¹</span>，横向加速度约 ' + a.toExponential(2) + ' m/s²。' +
          (Math.abs(values.lat) < 1 ? '赤道附近水平偏转趋近于零，轨迹几乎为直线。' : values.lat > 0 ? '北半球：沿运动方向向右偏。' : '南半球：沿运动方向向左偏。') + '</p>';
      } else if (exp.id === 'photoelectric') {
        const pc = 1240 / values.lambda;
        const W = (PL.materials[values.material] || PL.materials.Cs).work;
        const K = Math.max(0, pc - W);
        body += '<p>光子能量 <span class="hl">hν = ' + pc.toFixed(2) + ' eV</span>，逸出功 W = ' + W.toFixed(2) + ' eV，最大初动能 ' + K.toFixed(2) + ' eV。' +
          (K <= 0 ? '<span class="warn">低于截止频率，没有光电子逸出。</span>' : '可发生光电效应，遏止电压约 ' + K.toFixed(2) + ' V。') + '</p>';
      } else if (exp.id === 'faraday') {
        const A = Math.PI * 0.55 * 0.55;
        const peak = values.turns * values.field * A * 1.68 * (2 * Math.PI * values.speed) / 0.58 * Math.exp(-0.5);
        body += '<p>感应电动势峰值约 <span class="hl">' + peak.toFixed(1) + ' V</span>。磁铁运动越快、匝数越多、磁场越强，检流计偏转越明显。</p>';
      } else if (exp.id === 'angular-momentum') {
        const I = values.I0 + 2 * values.m * values.r * values.r;
        const L = I * values.omega0;
        body += '<p>转动惯量 <span class="hl">I = ' + I.toFixed(3) + ' kg·m²</span>；若以当前半径起转，角动量 L = Iω₀ = ' + L.toFixed(2) + ' kg·m²/s。</p>' +
          '<p>把配重半径改小，I 减小，角速度会按 ω = L/I 增大。</p>';
      } else if (exp.id === 'bernoulli') {
        const v2 = values.v1 / (values.ratio * values.ratio);
        const dp = 0.5 * values.rho * (v2 * v2 - values.v1 * values.v1) / 1000;
        body += '<p>由连续性方程，喉部流速 <span class="hl">v₂ = ' + v2.toFixed(2) + ' m/s</span>；由伯努利方程，理论压差 Δp ≈ ' + Math.max(0, dp).toFixed(1) + ' kPa。</p>' +
          '<p>喉部越细，流速越大、压力越低；压力计液柱高度随之变化。</p>';
      } else if (exp.id === 'cavendish') {
        const r = Math.sqrt(values.gap * values.gap + 0.14 * 0.14);
        const F = 6.674e-11 * values.m * values.M / (r * r);
        const tau = 2 * 0.32 * F * 0.14 / r;
        const theta = tau / (values.kappa * 1e-5);
        body += '<p>两球间万有引力约 <span class="hl">F = ' + (F * 1e9).toFixed(2) + ' nN</span>，引力矩约 ' + (tau * 1e9).toFixed(2) + ' nN·m，平衡偏角约 ' + (theta * 1e6).toFixed(1) + ' µrad。</p>' +
          '<p>真实偏角极小，场景中的转角和光点位移经过视觉放大；右侧读数仍按真实公式计算。</p>';
      }
      body += '<p style="color:#7d8fac">提示：参数已写入预览链接，刷新或分享后会保持当前设置。</p>';
      body += '<p><a href="' + this.app.buildShareUrl() + '" target="_blank" rel="noopener">打开当前参数的三维预览 ↗</a></p>';
      return body;
    }

    errorAnswer(exp) {
      if (!exp) return '先选择一个实验，我可以按“系统误差 / 随机误差 / 改进方法”逐条分析。';
      const items = exp.lesson.errors.slice(0, 3);
      let html = '<p><b>' + exp.name + '</b>的主要误差来源与改进方向：</p><ul>';
      items.forEach((it) => {
        html += '<li><b>' + it.title + '：</b>' + this.stripTags(it.body) + '</li>';
      });
      html += '</ul><p>完整的误差清单和思考题解析已放在右侧「原理讲解」底部，可以逐项展开。</p>';
      return html;
    }

    thoughtAnswer(exp) {
      if (!exp) return '先选择一个实验，我可以带你拆解课后思考题。';
      const qs = exp.lesson.questions.slice(0, 3);
      let html = '<p><b>' + exp.name + '</b>的思考题拆解：</p>';
      qs.forEach((q, i) => {
        html += '<p><b>' + (i + 1) + '. ' + q.q + '</b></p><p>' + q.a + '</p>';
      });
      html += '<p>更多问题可以在「原理讲解」的思考题区展开，或直接追问我。</p>';
      return html;
    }

    explainAnswer(exp) {
      if (!exp) return '先选择一个实验，我会给出原理、公式与关键机制。';
      return '<p><b>' + exp.name + '</b></p><p>' + exp.lesson.lead + '</p>' +
        '<div class="mini-formula">' + exp.lesson.formula + '</div>' +
        '<p style="color:#8fa2bd">' + this.stripTags(exp.lesson.formulaNote) + '</p>' +
        '<p>需要更具体的方向吗？可以问“误差主要来自哪里”或“这道思考题怎么理解”。</p>';
    }

    findQA(exp, text) {
      if (!exp) return null;
      const list = (exp.qa || []).slice();
      (exp.lesson.questions || []).forEach((q) => list.push({ q: q.q, keywords: [], a: q.a, fromLesson: true }));
      let best = null;
      let bestScore = 0;
      list.forEach((item) => {
        let score = 0;
        (item.keywords || []).forEach((kw) => {
          if (text.indexOf(kw) >= 0) score += 2;
        });
        // character overlap with the question text
        const q = item.q || '';
        for (let i = 0; i < q.length - 1; i++) {
          const pair = q.substr(i, 2);
          if (text.indexOf(pair) >= 0) score += 0.55;
        }
        if (score > bestScore) {
          bestScore = score;
          best = item;
        }
      });
      if (best && bestScore >= 1.1) {
        return '<p>' + best.a + '</p>';
      }
      return null;
    }

    findGeneral(text) {
      if (/你好|您好|hi|hello|嗨/.test(text.toLowerCase())) {
        return '你好，我是物理助教小理。你可以让我<b>生成 3D 实验</b>、<b>修改参数</b>，或直接问原理、误差和思考题。比如：“演示科里奥利力在地球自转中的效果”。';
      }
      const t = text.toLowerCase();
      let best = null;
      let score = 0;
      PL.generalQA.forEach((item) => {
        let s = 0;
        item.keywords.forEach((kw) => { if (t.indexOf(kw.toLowerCase()) >= 0) s += 2; });
        if (s > score) { score = s; best = item; }
      });
      if (best && score >= 2) return '<p>' + best.a + '</p>';
      return null;
    }

    ambiguousExperiment(text) {
      const ids = [];
      if (/干涉/.test(text) && !/双缝|杨氏/.test(text)) ids.push('michelson', 'double-slit');
      if (/线圈|磁/.test(text) && !/法拉第|感应/.test(text)) ids.push('faraday');
      return ids;
    }

    clarify(ids) {
      const names = ids.map((id) => PL.expById[id].name).join('、');
      return '<p>你的描述可能对应多个实验：<b>' + names + '</b>。</p><p>请补充一个关键词，例如“<span class="hl">迈克尔逊干涉仪</span>”或“<span class="hl">杨氏双缝</span>”，我就能准确构建。</p>';
    }

    noMatch(text) {
      const current = this.app.currentExp;
      let html = '<p>我还没完全理解这条指令。当前场景是 <b>' + (current ? current.name : '未选择') + '</b>。</p>';
      html += '<p>可以试试这些说法：</p><ul>' +
        '<li>“画出迈克尔逊干涉仪结构，标出分光板位置”</li>' +
        '<li>“演示科里奥利力在地球自转中的效果”</li>' +
        '<li>“把双缝间距调到 0.35 毫米”</li>' +
        '<li>“分析这个实验的误差来源”</li></ul>';
      return html;
    }

    shortLead(exp) {
      const s = exp.lesson.lead;
      return s.length > 92 ? s.slice(0, 92) + '…' : s;
    }

    stripTags(html) {
      const d = document.createElement('div');
      d.innerHTML = html;
      return (d.textContent || '').replace(/\s+/g, ' ').trim();
    }
  }

  PL.Agent = Agent;
})();
