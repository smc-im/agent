/* =========================================================
   Scene 09 — Cavendish torsion balance
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;
  const G = 6.674e-11;

  const A = 0.32;
  const D = 0.14;

  class CavendishScene extends PL.SceneBase {
    constructor(app, def) {
      super(app, def);
      this.theta = 0;
      this.vel = 0;
      this.noExplode = true;
      this.thetaEq = 0;
      this.tau = 0;
      this.I = 0;
      this.wn = 0;
    }

    build() {
      const S = this.scene;
      U.addTable(S, 7.8, 5.0, { y: 0 });

      this.buildFrame();
      this.buildTorsion();
      this.buildLargeMasses();
      this.buildOptics();

      this.cameraHome.set(5.1, 4.0, 6.9);
      this.cameraTarget.set(0.2, 1.92, 0.7);
      this.controls.minDistance = 3.8;
      this.controls.maxDistance = 24;

      this.buildLabels();
      this.recompute();
      this.theta = 0;
      this.vel = 0;
    }

    buildFrame() {
      const S = this.scene;
      const base = new THREE.Group();
      const wood = new THREE.MeshStandardMaterial({ color: 0x1c2c3b, roughness: 0.5, metalness: 0.3 });
      const metal = U.metal(0x62778c, 0.34);

      const foot = U.box(2.9, 0.12, 0.5, wood);
      foot.position.y = 0.07;
      S.add(foot);
      [-1.28, 1.28].forEach((x) => {
        const post = U.cyl(0.055, 0.075, 3.3, metal, 20);
        post.position.set(x, 1.72, 0);
        S.add(post);
        const top = U.box(2.65, 0.1, 0.14, metal);
        top.position.set(0, 3.35, 0);
        S.add(top);
      });
      const topBar = U.box(2.65, 0.12, 0.16, metal);
      topBar.position.set(0, 3.35, 0);
      S.add(topBar);
      const clamp = U.cyl(0.15, 0.18, 0.14, metal, 28);
      clamp.position.set(0, 3.28, 0);
      S.add(clamp);

      // hanging point
      const pivot = U.cyl(0.04, 0.04, 0.2, U.metal(0xc2d6e7, 0.2), 18);
      pivot.position.set(0, 3.14, 0);
      S.add(pivot);
      this.topY = 3.12;
    }

    buildTorsion() {
      const S = this.scene;
      this.torsionGroup = new THREE.Group();
      this.torsionGroup.position.set(0, 1.86, 0);
      S.add(this.torsionGroup);

      const rod = U.cyl(0.018, 0.018, 0.78, U.metal(0x9fb4c8, 0.26), 20);
      rod.rotation.z = Math.PI / 2;
      this.torsionGroup.add(rod);

      const smallMat = new THREE.MeshStandardMaterial({ color: 0xd8b06a, roughness: 0.3, metalness: 0.88, emissive: 0x2a1805, emissiveIntensity: 0.45 });
      this.smallL = U.sphere(0.095, smallMat, 28);
      this.smallR = U.sphere(0.095, smallMat, 28);
      this.smallL.position.set(-A, 0, 0);
      this.smallR.position.set(A, 0, 0);
      this.torsionGroup.add(this.smallL, this.smallR);

      const mirror = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xe4f3ff, roughness: 0.04, metalness: 1, side: THREE.DoubleSide })
      );
      mirror.position.set(0, 0.38, 0);
      mirror.rotation.y = Math.PI / 4;
      this.torsionGroup.add(mirror);
      this.mirror = mirror;
      const mirrorBack = U.box(0.32, 0.32, 0.02, U.metal(0x263a4c, 0.38));
      mirrorBack.position.set(0, 0.38, -0.015);
      mirrorBack.rotation.y = Math.PI / 4;
      this.torsionGroup.add(mirrorBack);

      // torsion wire from the top pivot to the mirror
      const wire = U.cyl(0.006, 0.006, this.topY - 2.24, U.metal(0xd7e5ef, 0.4), 8);
      wire.position.set(0, 2.68, 0);
      S.add(wire);
      this.wire = wire;

      // small mirror-holder stem
      const stem = U.cyl(0.012, 0.012, 0.4, U.metal(0x9fb4c8, 0.3), 10);
      stem.position.set(0, 0.18, 0);
      this.torsionGroup.add(stem);
    }

    buildLargeMasses() {
      const S = this.scene;
      const lead = new THREE.MeshStandardMaterial({ color: 0x6b737b, roughness: 0.38, metalness: 0.82, emissive: 0x0b0f13, emissiveIntensity: 0.45 });
      const bx = A + this.params.gap + 0.325;
      const positions = [
        { x: bx, z: D },
        { x: -bx, z: -D }
      ];
      this.largeMasses = [];
      this.largeSupports = [];
      positions.forEach((p, i) => {
        const g = new THREE.Group();
        g.position.set(p.x, 1.86, p.z);
        const ball = U.sphere(0.23, lead, 32);
        g.add(ball);
        const cap = U.cyl(0.06, 0.09, 0.08, U.metal(0xbecbd6, 0.24), 20);
        cap.position.y = 0.24;
        g.add(cap);
        S.add(g);
        this.largeMasses.push(g);

        // supporting post from the table
        const post = U.cyl(0.04, 0.055, 1.86 - 0.23, U.metal(0x4e6478, 0.38), 18);
        post.position.set(p.x, (1.86 - 0.23) / 2, p.z);
        S.add(post);
        const pad = U.cyl(0.16, 0.2, 0.06, U.metal(0x3d5165, 0.45), 24);
        pad.position.set(p.x, 0.03, p.z);
        S.add(pad);
        this.largeSupports.push({ post: post, pad: pad });
      });
    }

    buildOptics() {
      const S = this.scene;
      const laser = new THREE.Group();
      laser.position.set(-3.15, 2.34, 0);
      const body = U.cyl(0.13, 0.13, 0.9, U.metal(0x50657b, 0.26), 28);
      body.rotation.z = Math.PI / 2;
      laser.add(body);
      const nose = U.cyl(0.07, 0.1, 0.2, U.metal(0x2c3d4f, 0.24), 20);
      nose.rotation.z = Math.PI / 2;
      nose.position.x = 0.55;
      laser.add(nose);
      const glow = U.glow(0xff5869, 0.55, 0.5);
      glow.position.x = 0.62;
      laser.add(glow);
      S.add(laser);
      this.laser = laser;
      const stand = U.cyl(0.05, 0.07, 2.2, U.metal(0x52687d, 0.38), 18);
      stand.position.set(-3.15, 1.1, 0);
      S.add(stand);

      const beamIn = U.beam(new THREE.Vector3(-2.52, 2.34, 0), new THREE.Vector3(0, 2.24, 0), 0xff5466, 0.65, 0.012);
      S.add(beamIn);

      // optical lever screen
      const screenGroup = new THREE.Group();
      screenGroup.position.set(0, 1.9, 3.8);
      const frame = U.box(2.45, 1.3, 0.05, U.metal(0x30465a, 0.4));
      screenGroup.add(frame);
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#061016';
      ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = 'rgba(130,210,235,.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 10; i++) {
        const x = 28 + i * 45.6;
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, i % 5 === 0 ? 74 : 60);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(150,220,245,.65)';
      ctx.font = '18px "Cascadia Code", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OPTICAL LEVER  /  光杠杆', 256, 26);
      ctx.font = '14px "Cascadia Code", monospace';
      ctx.fillText('-', 28, 96);
      ctx.fillText('0', 256, 96);
      ctx.fillText('+', 484, 96);
      const tex = new THREE.CanvasTexture(canvas);
      tex.encoding = THREE.sRGBEncoding;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.32, 1.16), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
      face.position.z = 0.03;
      screenGroup.add(face);
      S.add(screenGroup);
      this.screenGroup = screenGroup;
      const stand2 = U.cyl(0.04, 0.055, 1.9 - 0.58, U.metal(0x52687d, 0.38), 16);
      stand2.position.set(0, (1.9 - 0.58) / 2, 3.8);
      S.add(stand2);
      const pad2 = U.cyl(0.18, 0.22, 0.05, U.metal(0x3d5165, 0.45), 24);
      pad2.position.set(0, 0.025, 3.8);
      S.add(pad2);

      // reflected beam and spot are updated dynamically
      const beamGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 2.24, 0.04),
        new THREE.Vector3(0, 1.9, 3.78)
      ]);
      this.beamOut = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0xff5d6e, transparent: true, opacity: 0.7 }));
      S.add(this.beamOut);
      this.spot = U.glow(0xff5d6e, 0.32, 0.95);
      this.spot.position.set(0, 1.9, 3.8);
      S.add(this.spot);

      // faint local glow at the mirror
      this.mirrorGlow = U.glow(0xff6b7a, 0.5, 0.28);
      this.mirrorGlow.position.set(0, 2.24, 0);
      S.add(this.mirrorGlow);
    }

    buildLabels() {
      this.addLabel('悬丝', new THREE.Vector3(0.2, 2.86, 0), { accent: 'cyan', key: 'wire', dx: 16, dy: -4 });
      this.addLabel('平面镜', new THREE.Vector3(0.64, 2.56, 0.22), { accent: 'cyan', key: 'mirror', dx: 22, dy: -8 });
      this.addLabel('大铅球 M', () => this.largeMasses[0].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.34, 0)), { accent: 'violet', key: 'large', dx: 28, dy: -18 });
      this.addLabel('小铅球 m', () => this.smallR.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.2, 0)), { accent: 'amber', key: 'small', dx: -56, dy: 24 });
      this.addLabel('光杠杆标尺', new THREE.Vector3(0, 2.62, 3.8), { accent: 'red', key: 'scale', dx: 0, dy: -8 });
      this.addLabel('He–Ne 激光', new THREE.Vector3(-3.1, 2.72, 0), { accent: 'red', key: 'laser', dx: -8, dy: -6 });
    }

    recompute() {
      const p = this.params;
      const r = Math.sqrt(p.gap * p.gap + D * D);
      this.F = G * p.m * p.M / (r * r);
      this.tau = 2 * A * this.F * D / r;
      this.I = 2 * p.m * A * A;
      this.kappa = p.kappa * 1e-5;
      this.wn = Math.sqrt(this.kappa / this.I);
      this.thetaEq = this.tau / this.kappa;

      const bx = A + p.gap + 0.325;
      if (this.largeMasses) {
        this.largeMasses[0].position.set(bx, 1.86, D);
        this.largeMasses[1].position.set(-bx, 1.86, -D);
      }
      if (this.largeSupports) {
        this.largeSupports[0].post.position.x = bx;
        this.largeSupports[0].post.position.z = D;
        this.largeSupports[0].pad.position.x = bx;
        this.largeSupports[0].pad.position.z = D;
        this.largeSupports[1].post.position.x = -bx;
        this.largeSupports[1].post.position.z = -D;
        this.largeSupports[1].pad.position.x = -bx;
        this.largeSupports[1].pad.position.z = -D;
      }
    }

    onParamsChanged() {
      this.recompute();
    }

    step(dt) {
      const p = this.params;
      const timeScale = p.timeScale || 40;
      let total = Math.min(dt, 0.04) * timeScale;
      const h = 0.02;
      let guard = 0;
      while (total >= h && guard < 220) {
        const damp = 2 * 0.32 * this.wn * this.I * this.vel;
        const alpha = (this.tau - this.kappa * this.theta - damp) / this.I;
        this.vel += alpha * h;
        this.theta += this.vel * h;
        total -= h;
        guard++;
      }
      const vis = U.clamp(this.theta * p.gain, -0.45, 0.45);
      if (this.torsionGroup) this.torsionGroup.rotation.y = vis;
      if (this.mirror) this.mirror.rotation.y = Math.PI / 4 + vis;
      if (this.beamOut) {
        const spotX = U.clamp(Math.tan(2 * vis) * 3.78, -1.02, 1.02);
        this.spotX = spotX;
        const arr = this.beamOut.geometry.attributes.position.array;
        arr[0] = 0; arr[1] = 2.24; arr[2] = 0.04;
        arr[3] = spotX; arr[4] = 1.9; arr[5] = 3.78;
        this.beamOut.geometry.attributes.position.needsUpdate = true;
        if (this.spot) this.spot.position.set(spotX, 1.9, 3.81);
      }
      if (this.mirrorGlow) this.mirrorGlow.material.opacity = 0.2 + 0.08 * Math.sin(this.elapsed * 5);
      if (this.wire) this.wire.material.opacity = 0.9;
    }

    getMetrics() {
      const p = this.params;
      const period = this.wn > 0 ? 2 * Math.PI / this.wn : 0;
      return [
        { label: '平衡偏角 θ', value: (this.thetaEq * 1e6).toFixed(1), unit: 'µrad' },
        { label: '当前偏角', value: (this.theta * 1e6).toFixed(1), unit: 'µrad' },
        { label: '万有引力 F', value: (this.F * 1e9).toFixed(2), unit: 'nN' },
        { label: '扭摆周期 T', value: period.toFixed(1), unit: 's' }
      ];
    }

    getMeasurement() {
      return {
        M: this.params.M,
        m: this.params.m,
        gap: this.params.gap,
        thetaEq: this.thetaEq * 1e6,
        theta: this.theta * 1e6,
        F: this.F * 1e9,
        period: this.wn > 0 ? 2 * Math.PI / this.wn : 0
      };
    }
  }

  PL.registerScene('cavendish', CavendishScene);
})();
