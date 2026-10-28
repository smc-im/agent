/* =========================================================
   Scene 08 — Bernoulli / Venturi tube
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;

  const R = 0.46;
  const R_PHYS = 0.15;
  const PIPE_Y = 1.55;

  class BernoulliScene extends PL.SceneBase {
    constructor(app, def) {
      super(app, def);
      this.noExplode = true;
      this.flow = [];
    }

    build() {
      const S = this.scene;
      U.addTable(S, 8.4, 5.0, { y: 0 });

      this.pipeGroup = null;
      this.buildPipe();
      this.buildFlow();
      this.buildLabels();

      this.cameraHome.set(5.9, 4.25, 7.1);
      this.cameraTarget.set(0, 1.55, 0);
      this.controls.minDistance = 3.4;
      this.controls.maxDistance = 22;

      this.recompute();
    }

    profile(x) {
      const ratio = this.params.ratio;
      const w = 0.78;
      const g = Math.exp(-(x * x) / (2 * w * w));
      return R * (1 - (1 - ratio) * g);
    }

    makeProfileMesh(offset, material, radialSegments, lengthSegments) {
      const pos = [];
      const idx = [];
      const N = lengthSegments || 90;
      const M = radialSegments || 40;
      for (let i = 0; i <= N; i++) {
        const x = -2.75 + (5.5 * i) / N;
        const r = this.profile(x) + offset;
        for (let j = 0; j < M; j++) {
          const a = (j / M) * Math.PI * 2;
          pos.push(x, Math.cos(a) * r, Math.sin(a) * r);
        }
      }
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < M; j++) {
          const a = i * M + j;
          const b = i * M + ((j + 1) % M);
          const c = (i + 1) * M + j;
          const d = (i + 1) * M + ((j + 1) % M);
          idx.push(a, c, b, b, c, d);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    buildPipe() {
      const S = this.scene;
      if (this.pipeGroup) {
        S.remove(this.pipeGroup);
        U.disposeObject(this.pipeGroup);
      }
      const g = new THREE.Group();
      g.position.y = PIPE_Y;
      S.add(g);
      this.pipeGroup = g;

      const glass = new THREE.MeshPhysicalMaterial({
        color: 0x9feaff,
        metalness: 0,
        roughness: 0.06,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
        clearcoat: 1,
        clearcoatRoughness: 0.04
      });
      g.add(this.makeProfileMesh(0.025, glass, 44, 110));

      const fluid = new THREE.MeshPhysicalMaterial({
        color: 0x1f8fd0,
        roughness: 0.12,
        metalness: 0.02,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        clearcoat: 0.8
      });
      g.add(this.makeProfileMesh(-0.018, fluid, 40, 100));

      // faint inner core to make the fluid readable
      const core = new THREE.MeshBasicMaterial({ color: 0x75e4ff, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      g.add(this.makeProfileMesh(-0.07, core, 28, 80));

      // metal flanges
      [-2.76, 2.76].forEach((x) => {
        const flange = U.cyl(R + 0.16, R + 0.16, 0.13, U.metal(0x50667c, 0.34), 48);
        flange.rotation.z = Math.PI / 2;
        flange.position.x = x;
        g.add(flange);
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(R + 0.16, 0.018, 8, 48),
          new THREE.MeshBasicMaterial({ color: 0x77dfff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        rim.rotation.y = Math.PI / 2;
        rim.position.x = x;
        g.add(rim);
      });

      // support cradles
      [-1.4, 1.4].forEach((x) => {
        const post = U.cyl(0.045, 0.06, PIPE_Y - R - 0.14, U.metal(0x536b82, 0.38), 18);
        post.position.set(x, -R - (PIPE_Y - R - 0.14) / 2, 0);
        g.add(post);
        const saddle = U.box(0.26, 0.12, 0.7, new THREE.MeshStandardMaterial({ color: 0x1b2d3f, roughness: 0.6, metalness: 0.24 }));
        saddle.position.set(x, -R - 0.12, 0);
        g.add(saddle);
      });

      this.buildTaps(g);
    }

    buildTaps(g) {
      const p1x = -1.6;
      const p2x = 0;
      const r1 = this.profile(p1x);
      const r2 = this.profile(p2x);

      const makeTap = (x, r, color) => {
        const base = new THREE.Group();
        base.position.set(x, r + 0.01, 0);
        const glass = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 1.35, 20, 1, true),
          new THREE.MeshPhysicalMaterial({ color: 0xbdefff, transparent: true, opacity: 0.17, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false })
        );
        glass.position.y = 0.675;
        base.add(glass);
        const fluid = new THREE.Mesh(
          new THREE.CylinderGeometry(0.042, 0.042, 1, 18),
          new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.92 })
        );
        fluid.position.y = 0.5;
        base.add(fluid);
        const cap = U.cyl(0.065, 0.065, 0.04, U.metal(0x6d8499, 0.3), 20);
        cap.position.y = 1.36;
        base.add(cap);
        const connector = U.cyl(0.035, 0.045, 0.2, U.metal(0x6d8499, 0.3), 16);
        connector.position.y = 0.02;
        base.add(connector);
        g.add(base);
        return { group: base, fluid: fluid };
      };
      this.tap1 = makeTap(p1x, r1, 0x49d9ff);
      this.tap2 = makeTap(p2x, r2, 0x9a7bff);

      // velocity arrows above the two sections
      const arrow1 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(p1x, r1 + 0.34, 0), 0.6, 0x7dffcf, 0.11, 0.07);
      const arrow2 = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(p2x, r2 + 0.34, 0), 0.9, 0x7dffcf, 0.11, 0.07);
      g.add(arrow1, arrow2);
      this.arrow1 = arrow1;
      this.arrow2 = arrow2;

      // static speed indication on the pipe body
      const readLabel = U.makeCanvasTexture(256, 64, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(6,16,28,.8)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(120,235,255,.85)';
        ctx.font = '20px "Cascadia Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VENTURI', w / 2, 38);
      });
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.74, 0.19),
        new THREE.MeshBasicMaterial({ map: readLabel, transparent: true, toneMapped: false })
      );
      badge.position.set(-2.2, R + 0.42, 0.38);
      g.add(badge);
    }

    buildFlow() {
      const S = this.scene;
      const count = 95;
      const arr = new Float32Array(count * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x8df4ff,
        size: 0.035,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      });
      const points = new THREE.Points(geo, mat);
      points.position.y = PIPE_Y;
      S.add(points);
      this.flowPoints = points;
      this.flowArr = arr;
      this.flow = [];
      for (let i = 0; i < count; i++) {
        this.flow.push({
          x: -2.7 + Math.random() * 5.4,
          radial: Math.random() * 0.78,
          angle: Math.random() * Math.PI * 2
        });
      }
      this.updateFlowPositions();
    }

    updateFlowPositions() {
      if (!this.flowArr) return;
      for (let i = 0; i < this.flow.length; i++) {
        const f = this.flow[i];
        const rr = this.profile(f.x) * f.radial;
        this.flowArr[i * 3] = f.x;
        this.flowArr[i * 3 + 1] = Math.cos(f.angle) * rr;
        this.flowArr[i * 3 + 2] = Math.sin(f.angle) * rr;
      }
      this.flowPoints.geometry.attributes.position.needsUpdate = true;
    }

    buildLabels() {
      this.addLabel('宽截面 A₁ · 低速', new THREE.Vector3(-1.6, PIPE_Y + 0.75, 0.2), { accent: 'cyan', key: 'wide', dx: -20, dy: -8 });
      this.addLabel('喉部 A₂ · 高速', new THREE.Vector3(0.0, PIPE_Y + 0.68, 0.15), { accent: 'violet', key: 'throat', dx: 12, dy: -8 });
      this.addLabel('压力计', new THREE.Vector3(-1.6, PIPE_Y + 2.12, 0), { accent: 'amber', key: 'manometer', dx: -30, dy: -4 });
      this.addLabel('流线 / 示踪粒子', new THREE.Vector3(1.35, PIPE_Y + 0.35, 0.42), { accent: 'green', key: 'flow', dx: 12, dy: 6 });
      this.addLabel('伯努利方程', new THREE.Vector3(2.05, PIPE_Y + 0.76, 0), { accent: 'violet', key: 'formula', dx: 6, dy: -4 });
    }

    recompute() {
      const p = this.params;
      const ratio = p.ratio;
      const A1 = Math.PI * R_PHYS * R_PHYS;
      const A2 = A1 * ratio * ratio;
      const v2 = p.v1 / (ratio * ratio);
      const p1 = p.p1 * 1000;
      const dp = 0.5 * p.rho * (v2 * v2 - p.v1 * p.v1);
      let p2 = p1 - dp;
      this.cavitation = p2 < 1000;
      p2 = Math.max(1000, p2);
      this.values = { A1, A2, v2, p1, p2, dp: p1 - p2, Q: A1 * p.v1 * 1000 };

      if (this.tap1) {
        const h1 = 0.32 + 0.58 * (p1 / (p.p1 * 1000));
        const h2 = 0.28 + 0.6 * U.clamp(p2 / p1, 0.06, 1);
        this.setColumn(this.tap1.fluid, h1);
        this.setColumn(this.tap2.fluid, h2);
      }
      if (this.arrow1) {
        this.arrow1.setLength(U.clamp(0.4 + p.v1 * 0.13, 0.35, 0.9), 0.1, 0.065);
        this.arrow2.setLength(U.clamp(0.4 + v2 * 0.07, 0.45, 1.15), 0.1, 0.065);
      }
    }

    setColumn(mesh, h) {
      mesh.scale.y = h;
      mesh.position.y = h * 0.5;
    }

    onParamsChanged(changed) {
      if (changed.indexOf('ratio') >= 0) {
        this.buildPipe();
      }
      this.recompute();
    }

    step(dt) {
      if (!this.values) return;
      const v1 = this.params.v1;
      for (let i = 0; i < this.flow.length; i++) {
        const f = this.flow[i];
        const localV = v1 * Math.pow(R / this.profile(f.x), 2);
        f.x += localV * dt * 0.82;
        if (f.x > 2.72) {
          f.x = -2.72;
          f.radial = Math.random() * 0.78;
          f.angle = Math.random() * Math.PI * 2;
        }
      }
      this.updateFlowPositions();
      if (this.tap1) {
        this.tap1.fluid.material.opacity = 0.82 + 0.08 * Math.sin(this.elapsed * 3.1);
        this.tap2.fluid.material.opacity = 0.82 + 0.08 * Math.sin(this.elapsed * 3.1 + 1.4);
      }
      if (this.flowPoints) this.flowPoints.material.opacity = 0.55 + 0.15 * Math.sin(this.elapsed * 2.2);
    }

    getMetrics() {
      const v = this.values || { v2: 0, p2: 0, dp: 0, Q: 0 };
      return [
        { label: '喉部流速 v₂', value: v.v2.toFixed(2), unit: 'm/s' },
        { label: '喉部压力 p₂', value: (v.p2 / 1000).toFixed(1), unit: 'kPa' },
        { label: '压差 Δp', value: (v.dp / 1000).toFixed(1), unit: 'kPa' },
        { label: '体积流量 Q', value: v.Q.toFixed(1), unit: 'L/s' }
      ];
    }
  }

  PL.registerScene('bernoulli', BernoulliScene);
})();
