/* =========================================================
   Scene 04 — Simple pendulum
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;

  class PendulumScene extends PL.SceneBase {
    constructor(app, def) {
      super(app, def);
      this.theta = 0;
      this.omega = 0;
      this.simTime = 0;
      this.acc = 0;
      this.trailCount = 0;
      this.maxTrail = 460;
      this.measuredPeriod = null;
      this.lastCross = null;
    }

    build() {
      const S = this.scene;
      this.y0 = 0;
      U.addTable(S, 7.4, 4.6, { y: 0 });

      this.pivot = new THREE.Vector3(0, 3.36, 0);
      this.buildStand();
      this.buildProtractor();
      this.buildPendulum();

      this.cameraHome.set(4.8, 3.55, 6.6);
      this.cameraTarget.set(0, 1.95, 0);
      this.controls.minDistance = 3.0;
      this.controls.maxDistance = 20;

      this.buildLabels();
      this.resetSim();
      this.explodeAmount = 0;
      this.explodeTarget = 0;
    }

    buildStand() {
      const S = this.scene;
      const base = U.box(1.7, 0.12, 0.9, U.metal(0x384b60, 0.42));
      base.position.set(-1.42, 0.06, 0);
      S.add(base);
      const baseTop = U.box(1.5, 0.03, 0.72, U.metal(0x536a82, 0.35));
      baseTop.position.set(-1.42, 0.135, 0);
      S.add(baseTop);

      const post = U.cyl(0.065, 0.085, 3.42, U.metal(0x71879e, 0.28), 28);
      post.position.set(-1.42, 1.84, 0);
      S.add(post);
      const collar = U.cyl(0.105, 0.105, 0.12, U.metal(0x35485e, 0.38), 28);
      collar.position.set(-1.42, 3.3, 0);
      S.add(collar);

      const arm = U.cyl(0.055, 0.055, 1.2, U.metal(0x7c93aa, 0.26), 24);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(-0.58, 3.3, 0);
      S.add(arm);
      const clamp = U.cyl(0.14, 0.14, 0.16, U.metal(0x2d4055, 0.4), 28);
      clamp.position.set(-0.02, 3.3, 0);
      S.add(clamp);

      // pivot pin
      const pin = U.cyl(0.035, 0.035, 0.22, U.metal(0xc1d4e6, 0.2), 20);
      pin.rotation.x = Math.PI / 2;
      pin.position.set(0, 3.32, 0);
      S.add(pin);
    }

    buildProtractor() {
      const S = this.scene;
      const group = new THREE.Group();
      group.position.set(0, 3.3, -0.12);
      const radius = 1.02;
      const mat = new THREE.LineBasicMaterial({ color: 0x6da8d0, transparent: true, opacity: 0.38 });
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const a = (-70 + (140 * i) / 48) * U.deg;
        pts.push(new THREE.Vector3(Math.sin(a) * radius, -Math.cos(a) * radius, 0));
      }
      group.add(U.line(pts, 0x6da8d0, 0.35));
      const ticks = [];
      for (let deg = -65; deg <= 65; deg += 5) {
        const a = deg * U.deg;
        const big = deg % 30 === 0;
        const r0 = radius;
        const r1 = radius - (big ? 0.10 : 0.055);
        ticks.push(
          new THREE.Vector3(Math.sin(a) * r0, -Math.cos(a) * r0, 0),
          new THREE.Vector3(Math.sin(a) * r1, -Math.cos(a) * r1, 0)
        );
      }
      group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: 0x79b4dc, transparent: true, opacity: 0.42 })));
      const center = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), new THREE.MeshBasicMaterial({ color: 0xbdefff, transparent: true, opacity: 0.7 }));
      group.add(center);
      // angle labels on the protractor
      [-60, 0, 60].forEach((deg) => {
        const a = deg * U.deg;
        const canvas = document.createElement('canvas');
        canvas.width = 96; canvas.height = 48;
        const ctx = canvas.getContext('2d');
        ctx.font = '26px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(160,215,245,.75)';
        ctx.textAlign = 'center';
        ctx.fillText(deg + '°', 48, 32);
        const tex = new THREE.CanvasTexture(canvas);
        tex.encoding = THREE.sRGBEncoding;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false }));
        sprite.position.set(Math.sin(a) * (radius + 0.16), -Math.cos(a) * (radius + 0.16), 0);
        sprite.scale.set(0.32, 0.16, 1);
        group.add(sprite);
      });
      S.add(group);
      this.protractor = group;
      this.protractorBase = group.position.clone();
    }

    buildPendulum() {
      const S = this.scene;
      this.stringMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 1, 8),
        new THREE.MeshStandardMaterial({ color: 0xdce9f4, roughness: 0.55, metalness: 0.35 })
      );
      this.stringMesh.castShadow = true;
      S.add(this.stringMesh);

      const bobMat = new THREE.MeshStandardMaterial({
        color: 0xffc56f,
        roughness: 0.19,
        metalness: 0.88,
        emissive: 0x4a2604,
        emissiveIntensity: 0.32
      });
      this.bob = U.sphere(0.155, bobMat, 40);
      S.add(this.bob);
      this.bobGlow = U.glow(0xffc46b, 1.05, 0.2);
      S.add(this.bobGlow);

      // small highlight cap
      const cap = U.sphere(0.035, new THREE.MeshBasicMaterial({ color: 0xfff2d3 }), 16);
      cap.position.set(-0.04, 0.08, 0.08);
      this.bob.add(cap);

      // trail
      const geo = new THREE.BufferGeometry();
      const arr = new Float32Array(this.maxTrail * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      geo.setDrawRange(0, 0);
      const trail = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xffb55e,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      S.add(trail);
      this.trail = trail;
      this.trailArr = arr;

      // equilibrium dashed guide
      const guide = U.line([
        new THREE.Vector3(0, 3.34, -0.02),
        new THREE.Vector3(0, 1.00, -0.02)
      ], 0x6e94b4, 0.25, true);
      S.add(guide);
      this.guide = guide;

      this.bobPos = new THREE.Vector3(0, 0, 0);
    }

    buildLabels() {
      this.addLabel('悬点 O', new THREE.Vector3(0, 3.62, 0), { accent: 'cyan', key: 'pivot', dx: 0, dy: -6 });
      this.labLength = this.addLabel('摆长 L', () => {
        const p = this.pivot.clone().lerp(this.bobPos, 0.52);
        p.x += 0.24;
        p.z += 0.05;
        return p;
      }, { accent: 'amber', key: 'string', dx: 12, dy: -16 });
      this.addLabel('摆球', () => this.bobPos.clone(), { accent: 'amber', key: 'bob', dx: 32, dy: 14 });
      this.addLabel('平衡位置', new THREE.Vector3(0.02, 1.16, -0.02), { accent: 'green', key: 'equilibrium', dx: 12, dy: 8 });
      this.addLabel('摆角 θ', () => this.protractor.position.clone().add(new THREE.Vector3(-0.86, -0.85, -0.02)), { accent: 'violet', key: 'arc', dx: -6, dy: 8 });
    }

    resetSim() {
      this.theta = this.params.theta0 * U.deg;
      this.omega = 0;
      this.simTime = 0;
      this.acc = 0;
      this.measuredPeriod = null;
      this.lastCross = null;
      this.trailCount = 0;
      if (this.trail) {
        this.trail.geometry.setDrawRange(0, 0);
        this.trail.geometry.attributes.position.needsUpdate = true;
      }
      this.updateBob();
    }

    onParamsChanged(changed) {
      this.resetSim();
      this.updateBob();
    }

    updateBob() {
      if (!this.bob) return;
      const L = this.params.L;
      this.bobPos.set(
        Math.sin(this.theta) * L,
        this.pivot.y - Math.cos(this.theta) * L,
        0
      );
      this.bob.position.copy(this.bobPos);
      this.bobGlow.position.copy(this.bobPos);
      this.bobGlow.position.z -= 0.03;

      const dir = this.bobPos.clone().sub(this.pivot);
      const len = dir.length();
      if (len > 0.001) {
        this.stringMesh.position.copy(this.pivot).add(this.bobPos).multiplyScalar(0.5);
        this.stringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        this.stringMesh.scale.set(1, len, 1);
      }
      if (this.labLength) {
        const txt = 'L = ' + this.params.L.toFixed(2) + ' m';
        this.labLength.el.querySelector('.lab-text').textContent = txt;
      }
    }

    pushTrail() {
      const arr = this.trailArr;
      if (this.trailCount >= this.maxTrail) {
        arr.copyWithin(0, 3);
        this.trailCount--;
      }
      const i = this.trailCount * 3;
      arr[i] = this.bobPos.x;
      arr[i + 1] = this.bobPos.y;
      arr[i + 2] = this.bobPos.z - 0.04;
      this.trailCount++;
      this.trail.geometry.setDrawRange(0, this.trailCount);
      this.trail.geometry.attributes.position.needsUpdate = true;
    }

    integrate(h) {
      const L = this.params.L;
      const g = this.params.g;
      const b = this.params.damping;
      const f = (th, om) => -(g / L) * Math.sin(th) - b * om;
      const k1t = this.omega;
      const k1o = f(this.theta, this.omega);
      const k2t = this.omega + h * 0.5 * k1o;
      const k2o = f(this.theta + h * 0.5 * k1t, this.omega + h * 0.5 * k1o);
      const k3t = this.omega + h * 0.5 * k2o;
      const k3o = f(this.theta + h * 0.5 * k2t, this.omega + h * 0.5 * k2o);
      const k4t = this.omega + h * k3o;
      const k4o = f(this.theta + h * k3t, this.omega + h * k3o);
      const prev = this.theta;
      this.theta += (h / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
      this.omega += (h / 6) * (k1o + 2 * k2o + 2 * k3o + k4o);
      this.simTime += h;
      // measure period at upward zero crossing
      if (prev < 0 && this.theta >= 0 && this.omega > 0) {
        if (this.lastCross != null) {
          this.measuredPeriod = this.simTime - this.lastCross;
        }
        this.lastCross = this.simTime;
      }
    }

    onExploded(value) {
      this.explodeTarget = value ? 1 : 0;
    }

    step(dt) {
      const e = 1 - Math.exp(-6 * dt);
      this.explodeAmount += (this.explodeTarget - this.explodeAmount) * e;
      if (this.protractor) {
        this.protractor.position.copy(this.protractorBase).add(new THREE.Vector3(0, 0, -this.explodeAmount * 0.6));
        this.protractor.position.z += 0;
      }

      this.acc += Math.min(dt, 0.05);
      const h = 1 / 240;
      let guard = 0;
      while (this.acc >= h && guard < 30) {
        this.integrate(h);
        this.acc -= h;
        guard++;
      }
      this.updateBob();
      this.pushTrail();

      if (this.bobGlow) {
        this.bobGlow.material.opacity = 0.16 + 0.08 * Math.sin(this.elapsed * 2.2);
      }
      if (this.stringMesh) {
        this.stringMesh.position.x += 0;
      }
      // auto-restart if damping has nearly stopped the bob
      if (this.simTime > 4 && Math.abs(this.theta) < 0.012 && Math.abs(this.omega) < 0.02) {
        this.resetSim();
      }
    }

    getMetrics() {
      const T0 = 2 * Math.PI * Math.sqrt(this.params.L / this.params.g);
      const a0 = this.params.theta0 * U.deg;
      const Tfinite = T0 * (1 + a0 * a0 / 16 + 11 * Math.pow(a0, 4) / 3072);
      return [
        { label: '理论周期 T₀', value: T0.toFixed(3), unit: 's' },
        { label: '有限振幅修正', value: Tfinite.toFixed(3), unit: 's' },
        { label: '实测周期', value: this.measuredPeriod ? this.measuredPeriod.toFixed(3) : '测量中', unit: this.measuredPeriod ? 's' : '' },
        { label: '摆长 L', value: this.params.L.toFixed(2), unit: 'm' }
      ];
    }
  }

  PL.registerScene('pendulum', PendulumScene);
})();
