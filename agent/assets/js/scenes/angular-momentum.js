/* =========================================================
   Scene 07 — Conservation of angular momentum
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;

  class AngularMomentumScene extends PL.SceneBase {
    constructor(app, def) {
      super(app, def);
      this.angle = 0;
      this.L = null;
      this.omega = 0;
      this.visualR = def.params.find((p) => p.key === 'r').default;
      this.noExplode = true;
    }

    build() {
      const S = this.scene;
      U.addTable(S, 7.8, 5.2, { y: 0 });

      this.buildBase();
      this.buildRotor();
      this.buildVectors();

      this.cameraHome.set(5.8, 4.35, 7.2);
      this.cameraTarget.set(0, 1.05, 0);
      this.controls.minDistance = 3.2;
      this.controls.maxDistance = 22;

      this.buildLabels();
      this.recompute(null, true);
    }

    buildBase() {
      const S = this.scene;
      const base = U.cyl(0.78, 0.92, 0.16, U.metal(0x26394d, 0.42), 48);
      base.position.y = 0.08;
      S.add(base);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.84, 0.018, 8, 72),
        new THREE.MeshBasicMaterial({ color: 0x5ee3ff, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.17;
      S.add(ring);

      const motor = U.cyl(0.48, 0.55, 0.32, U.metal(0x445b73, 0.3), 40);
      motor.position.y = 0.3;
      S.add(motor);
      const collar = U.cyl(0.34, 0.34, 0.08, U.metal(0x8ca0b5, 0.24), 36);
      collar.position.y = 0.5;
      S.add(collar);

      const axis = U.cyl(0.035, 0.045, 2.55, U.metal(0x9db4c8, 0.25), 20);
      axis.position.y = 1.57;
      S.add(axis);
      this.axis = axis;

      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const foot = U.cyl(0.055, 0.075, 0.24, U.metal(0x576c82, 0.4), 16);
        foot.position.set(Math.cos(a) * 0.7, 0.12, Math.sin(a) * 0.7);
        S.add(foot);
      }
    }

    buildRotor() {
      const S = this.scene;
      this.rotor = new THREE.Group();
      this.rotor.position.set(0, 0.78, 0);
      S.add(this.rotor);

      const diskMat = new THREE.MeshStandardMaterial({
        color: 0x10253a,
        roughness: 0.36,
        metalness: 0.58,
        emissive: 0x04111d,
        emissiveIntensity: 0.55
      });
      const disk = U.cyl(1.16, 1.16, 0.14, diskMat, 64);
      disk.position.y = 0;
      this.rotor.add(disk);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.16, 0.022, 8, 80),
        new THREE.MeshBasicMaterial({ color: 0x80e7ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.075;
      this.rotor.add(rim);

      const tex = U.makeCanvasTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#07121f';
        ctx.fillRect(0, 0, w, h);
        ctx.translate(w / 2, h / 2);
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          ctx.strokeStyle = i % 3 === 0 ? 'rgba(110,220,255,.32)' : 'rgba(90,150,190,.15)';
          ctx.lineWidth = i % 3 === 0 ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
          ctx.lineTo(Math.cos(a) * 236, Math.sin(a) * 236);
          ctx.stroke();
        }
        for (let r = 60; r < 250; r += 44) {
          ctx.strokeStyle = 'rgba(90,170,210,.18)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(94,227,255,.6)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 238, -0.6, 0.35);
        ctx.stroke();
        ctx.fillStyle = '#5ee3ff';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      });
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(1.14, 64),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide })
      );
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.072;
      this.rotor.add(face);

      // radial rails
      const railMat = U.metal(0x8fa6bc, 0.3);
      [-0.1, 0.1].forEach((z) => {
        const rail = U.box(2.36, 0.045, 0.045, railMat);
        rail.position.set(0, 0.085, z);
        this.rotor.add(rail);
      });

      // sliding weights
      this.weightL = this.makeWeight();
      this.weightR = this.makeWeight();
      this.rotor.add(this.weightL, this.weightR);

      this.weightAnchorL = new THREE.Object3D();
      this.weightAnchorR = new THREE.Object3D();
      this.weightL.add(this.weightAnchorL);
      this.weightR.add(this.weightAnchorR);
      this.weightAnchorL.position.y = 0.3;
      this.weightAnchorR.position.y = 0.3;

      // hub
      const hub = U.cyl(0.22, 0.28, 0.18, U.metal(0xb3c7d9, 0.2), 36);
      hub.position.y = 0.16;
      this.rotor.add(hub);

      this.updateWeights(0);
    }

    makeWeight() {
      const g = new THREE.Group();
      const body = U.cyl(0.16, 0.19, 0.28, new THREE.MeshStandardMaterial({
        color: 0xd6a44e,
        roughness: 0.28,
        metalness: 0.9,
        emissive: 0x2d1705,
        emissiveIntensity: 0.35
      }), 32);
      body.position.y = 0.16;
      g.add(body);
      const cap = U.cyl(0.08, 0.08, 0.06, U.metal(0xe6edf4, 0.2), 24);
      cap.position.y = 0.33;
      g.add(cap);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.012, 6, 40),
        new THREE.MeshBasicMaterial({ color: 0xffd285, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      g.add(ring);
      return g;
    }

    buildVectors() {
      const S = this.scene;
      this.LArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1.6, 0), 1.1, 0xa78bfa, 0.15, 0.09);
      this.omegaArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1.75, 0), 0.7, 0x5ee3ff, 0.12, 0.07);
      S.add(this.LArrow, this.omegaArrow);

      // curved angular-velocity indicator around the axis
      const arcPts = [];
      for (let i = 0; i <= 32; i++) {
        const a = 0.2 + (i / 32) * Math.PI * 1.55;
        arcPts.push(new THREE.Vector3(Math.cos(a) * 0.48, 2.18, Math.sin(a) * 0.48));
      }
      this.spinArc = U.line(arcPts, 0x5ee3ff, 0.5);
      S.add(this.spinArc);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.18, 8),
        new THREE.MeshBasicMaterial({ color: 0x5ee3ff })
      );
      tip.position.copy(arcPts[arcPts.length - 1]);
      tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1));
      this.spinArrow = tip;
      S.add(tip);
    }

    buildLabels() {
      this.addLabel('旋转平台', new THREE.Vector3(-0.95, 1.1, 0.9), { accent: 'cyan', key: 'disk', dx: -22, dy: 12 });
      this.addLabel('可滑动配重', () => this.weightR.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.38, 0)), { accent: 'amber', key: 'weights', dx: 18, dy: -6 });
      this.addLabel('转轴 · 竖直方向', new THREE.Vector3(0, 2.62, 0), { accent: 'violet', key: 'axis', dx: 0, dy: -8 });
      this.addLabel('角动量 L', () => this.LArrow.position.clone().add(new THREE.Vector3(0, this.LArrow.children[0].scale.y + 0.12, 0)), { accent: 'violet', key: 'L', dx: -10, dy: 0 });
      this.addLabel('角速度 ω', new THREE.Vector3(0.7, 2.3, -0.25), { accent: 'cyan', key: 'omega', dx: 14, dy: 6 });
    }

    recompute(changed, initial) {
      const p = this.params;
      const I = p.I0 + 2 * p.m * p.r * p.r;
      if (initial || !this.L || (changed && changed.indexOf('omega0') >= 0)) {
        this.L = I * p.omega0;
      }
      this.omega = U.clamp(this.L / I, 0.05, 24);
      this.I = I;
      this.updateVectors();
    }

    updateVectors() {
      if (!this.LArrow) return;
      const lLen = U.clamp(this.L / 22, 0.55, 1.7);
      const wLen = U.clamp(this.omega / 8, 0.35, 1.2);
      this.LArrow.setLength(lLen, 0.15, 0.09);
      this.omegaArrow.setLength(wLen, 0.12, 0.07);
    }

    updateWeights(dt) {
      const target = this.params.r;
      if (dt > 0) this.visualR = U.damp(this.visualR, target, 7, dt);
      else this.visualR = target;
      if (this.weightL && this.weightR) {
        this.weightL.position.x = -this.visualR;
        this.weightR.position.x = this.visualR;
      }
    }

    onParamsChanged(changed) {
      this.recompute(changed, false);
    }

    step(dt) {
      this.updateWeights(dt);
      const visualOmega = Math.min(this.omega, 14);
      this.angle += visualOmega * dt;
      if (this.rotor) this.rotor.rotation.y = this.angle;
      if (this.spinArc) this.spinArc.material.opacity = 0.32 + 0.16 * Math.sin(this.elapsed * 2.4);
      if (this.spinArrow) this.spinArrow.rotation.y += dt * 0.4;
    }

    getMetrics() {
      const I = this.params.I0 + 2 * this.params.m * this.params.r * this.params.r;
      const omega = this.omega || this.params.omega0;
      const L = this.L || I * this.params.omega0;
      return [
        { label: '转动惯量 I', value: I.toFixed(3), unit: 'kg·m²' },
        { label: '当前角速度 ω', value: omega.toFixed(2), unit: 'rad/s' },
        { label: '角动量 L = Iω', value: L.toFixed(3), unit: 'kg·m²/s' },
        { label: '转速', value: (omega * 60 / (Math.PI * 2)).toFixed(1), unit: 'rpm' }
      ];
    }

    getMeasurement() {
      return {
        r: this.params.r,
        I: this.I || (this.params.I0 + 2 * this.params.m * this.params.r * this.params.r),
        omega: this.omega,
        L: this.L
      };
    }
  }

  PL.registerScene('angular-momentum', AngularMomentumScene);
})();
