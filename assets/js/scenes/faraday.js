/* =========================================================
   Scene 06 — Faraday electromagnetic induction
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;

  class FaradayScene extends PL.SceneBase {
    constructor(app, def) {
      super(app, def);
      this.phase = 0;
      this.emf = 0;
      this.emfRef = 30;
      this.needleAngle = 0;
      this.currentOffset = 0;
      this.noExplode = true;
      this.flux = 0;
    }

    build() {
      const S = this.scene;
      U.addTable(S, 8.8, 5.2, { y: 0 });

      this.buildCoil();
      this.buildMagnet();
      this.buildMeter();
      this.buildWires();

      this.cameraHome.set(5.15, 3.95, 6.8);
      this.cameraTarget.set(0.5, 1.5, 0.15);
      this.controls.minDistance = 3.2;
      this.controls.maxDistance = 22;

      this.buildLabels();
      this.updateNeedle(1);
    }

    buildCoil() {
      const S = this.scene;
      if (this.coilGroup) {
        S.remove(this.coilGroup);
        U.disposeObject(this.coilGroup);
      }
      const g = new THREE.Group();
      g.position.set(0, 1.55, 0);
      const turns = this.params.turns;
      const radius = 0.55;
      const length = 1.55;
      const pts = [];
      const steps = Math.max(120, turns * 28);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = -length / 2 + length * t;
        const a = t * turns * Math.PI * 2;
        pts.push(new THREE.Vector3(x, Math.cos(a) * radius, Math.sin(a) * radius));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      this.helixCurve = curve;
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, steps, 0.027, 7, false),
        new THREE.MeshStandardMaterial({ color: 0xc47c43, roughness: 0.26, metalness: 0.92, emissive: 0x2a1204, emissiveIntensity: 0.5 })
      );
      tube.castShadow = true;
      g.add(tube);

      // supporting end rings
      [-1, 1].forEach((dir) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(radius + 0.018, 0.038, 8, 44),
          U.metal(0x9aafc2, 0.3)
        );
        ring.rotation.y = Math.PI / 2;
        ring.position.x = dir * length / 2;
        g.add(ring);
      });

      // mounting rail
      const rail = U.box(length + 0.2, 0.055, 0.18, U.metal(0x31475d, 0.42));
      rail.position.set(0, -radius - 0.16, 0);
      g.add(rail);
      [-0.62, 0.62].forEach((x) => {
        const post = U.cyl(0.032, 0.045, 1.55 - radius - 0.22, U.metal(0x506981, 0.38), 16);
        post.position.set(x, -radius - 0.16 - (1.55 - radius - 0.22) / 2, 0);
        g.add(post);
      });

      S.add(g);
      this.coilGroup = g;
      this.coilTurns = turns;

      // current dots along the helix
      if (this.currentPoints) {
        S.remove(this.currentPoints);
        this.currentPoints.geometry.dispose();
        this.currentPoints.material.dispose();
      }
      const n = 28;
      const arr = new Float32Array(n * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffc46b,
        size: 0.055,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      });
      const points = new THREE.Points(geo, mat);
      S.add(points);
      this.currentPoints = points;
      this.currentArray = arr;
      this.currentN = n;
    }

    buildMagnet() {
      const S = this.scene;
      const g = new THREE.Group();
      g.position.set(-1.75, 1.55, 0);
      this.magnetGroup = g;

      const red = new THREE.MeshStandardMaterial({ color: 0xd8494f, roughness: 0.32, metalness: 0.55, emissive: 0x2c0508, emissiveIntensity: 0.5 });
      const blue = new THREE.MeshStandardMaterial({ color: 0x3f79c9, roughness: 0.32, metalness: 0.55, emissive: 0x041329, emissiveIntensity: 0.55 });

      const north = U.cyl(0.22, 0.22, 0.46, red, 32);
      north.rotation.z = Math.PI / 2;
      north.position.x = 0.23;
      g.add(north);
      const south = U.cyl(0.22, 0.22, 0.46, blue, 32);
      south.rotation.z = Math.PI / 2;
      south.position.x = -0.23;
      g.add(south);
      const band = U.cyl(0.225, 0.225, 0.02, U.metal(0xdfe9f2, 0.2), 32);
      band.rotation.z = Math.PI / 2;
      g.add(band);

      // poles labels as sprites
      const mkLabel = (text, x, color) => {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');
        ctx.font = '700 82px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 22;
        ctx.fillText(text, 64, 92);
        const tex = new THREE.CanvasTexture(c);
        tex.encoding = THREE.sRGBEncoding;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
        sp.scale.set(0.3, 0.3, 1);
        sp.position.set(x, 0.33, 0);
        return sp;
      };
      g.add(mkLabel('N', 0.55, '#ffb1a8'));
      g.add(mkLabel('S', -0.55, '#a8c8ff'));

      // dipole field loops
      const fieldGroup = new THREE.Group();
      const loopMat = new THREE.LineBasicMaterial({ color: 0x8fa8ff, transparent: true, opacity: 0.22 });
      for (let k = 0; k < 6; k++) {
        const rot = (k / 6) * Math.PI * 2;
        const raw = [
          [0.38, 0.24], [0.72, 0.62], [0.98, 0.95], [0.55, 1.18],
          [-0.55, 1.18], [-0.98, 0.95], [-0.72, 0.62], [-0.38, 0.24]
        ];
        const points = raw.map((p) => new THREE.Vector3(p[0], Math.cos(rot) * p[1], Math.sin(rot) * p[1]));
        const curve = new THREE.CatmullRomCurve3(points);
        const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
        fieldGroup.add(new THREE.Line(geo, loopMat));
      }
      g.add(fieldGroup);
      this.fieldLoops = fieldGroup;

      S.add(g);
    }

    buildMeter() {
      const S = this.scene;
      const g = new THREE.Group();
      g.position.set(2.55, 1.25, 0.55);
      g.rotation.y = -0.36;

      const body = U.box(0.98, 0.76, 0.2, new THREE.MeshStandardMaterial({
        color: 0x17283a,
        roughness: 0.32,
        metalness: 0.4
      }));
      g.add(body);
      const bezel = U.box(1.06, 0.84, 0.05, U.metal(0x506a82, 0.3));
      bezel.position.z = -0.07;
      g.add(bezel);

      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 512, 400);
      const grad = ctx.createRadialGradient(256, 200, 20, 256, 200, 215);
      grad.addColorStop(0, '#f4f8ef');
      grad.addColorStop(0.68, '#d7e1d4');
      grad.addColorStop(1, '#a9b7a8');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(256, 200, 190, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,60,54,.55)';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.translate(256, 200);
      ctx.strokeStyle = 'rgba(35,52,48,.8)';
      for (let i = -6; i <= 6; i++) {
        const a = -Math.PI / 2 + i * (Math.PI / 16);
        const r0 = 145;
        const r1 = i % 3 === 0 ? 162 : 152;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(35,52,48,.72)';
      ctx.font = '26px "Cascadia Code", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('μA', 0, -58);
      ctx.font = '18px "Cascadia Code", monospace';
      ctx.fillText('G', 0, 122);
      const tex = new THREE.CanvasTexture(canvas);
      tex.encoding = THREE.sRGBEncoding;
      const dial = new THREE.Mesh(
        new THREE.PlaneGeometry(0.72, 0.56),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
      );
      dial.position.z = 0.115;
      g.add(dial);

      const needlePivot = new THREE.Group();
      needlePivot.position.set(0, 0.02, 0.14);
      const needle = U.box(0.012, 0.27, 0.008, new THREE.MeshBasicMaterial({ color: 0x8c2c2c }));
      needle.position.y = 0.11;
      needlePivot.add(needle);
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), new THREE.MeshBasicMaterial({ color: 0x3a3430 }));
      cap.position.z = 0.004;
      needlePivot.add(cap);
      g.add(needlePivot);
      this.needle = needlePivot;

      // glass cover
      const glass = new THREE.Mesh(
        new THREE.CircleGeometry(0.36, 40),
        new THREE.MeshPhysicalMaterial({ color: 0xd9f4ff, transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      glass.position.z = 0.16;
      g.add(glass);

      // terminals
      [-0.32, 0.32].forEach((x) => {
        const knob = U.cyl(0.045, 0.045, 0.08, U.metal(0xc4a36a, 0.25), 18);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(x, -0.31, 0.12);
        g.add(knob);
      });

      S.add(g);
      this.meterGroup = g;
      this.meterBase = g.position.clone();
    }

    buildWires() {
      const S = this.scene;
      const mat = new THREE.MeshStandardMaterial({ color: 0x1c2a36, roughness: 0.55, metalness: 0.22 });
      const makeWire = (pts) => {
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.014, 6, false), mat);
        S.add(tube);
        return tube;
      };
      this.wires = [
        makeWire([
          new THREE.Vector3(-0.78, 1.55, 0.55),
          new THREE.Vector3(-0.95, 1.1, 0.85),
          new THREE.Vector3(1.2, 0.18, 1.2),
          new THREE.Vector3(2.3, 0.94, 0.8)
        ]),
        makeWire([
          new THREE.Vector3(0.78, 1.55, -0.55),
          new THREE.Vector3(0.95, 1.05, -0.8),
          new THREE.Vector3(1.9, 0.22, -0.9),
          new THREE.Vector3(2.7, 0.94, 0.25)
        ])
      ];
    }

    buildLabels() {
      const turns = this.params.turns;
      this.addLabel('感应线圈 · ' + turns + ' 匝', new THREE.Vector3(0, 2.45, 0), { accent: 'amber', key: 'coil', dx: 0, dy: -8 });
      this.addLabel('条形磁铁', () => this.magnetGroup.position.clone().add(new THREE.Vector3(0, 0.5, 0)), { accent: 'violet', key: 'magnet', dx: 0, dy: -6 });
      this.addLabel('检流计 G', new THREE.Vector3(2.55, 1.86, 0.55), { accent: 'green', key: 'meter', dx: 12, dy: -8 });
      this.addLabel('感应电流方向', new THREE.Vector3(0.1, 1.0, 0.62), { accent: 'cyan', key: 'current', dx: 8, dy: 10 });
    }

    refreshCoilLabel() {
      const label = this.labels.find((l) => l.el && l.el.textContent.indexOf('感应线圈') >= 0);
      if (label) label.el.querySelector('.lab-text').textContent = '感应线圈 · ' + this.params.turns + ' 匝';
    }

    onParamsChanged(changed) {
      if (changed.indexOf('turns') >= 0) {
        this.buildCoil();
        this.refreshCoilLabel();
      }
    }

    step(dt) {
      const f = this.params.speed;
      const turns = this.params.turns;
      const B = this.params.field;
      const A = Math.PI * 0.55 * 0.55;
      const amp = 1.68;
      const sigma = 0.58;
      const omega = 2 * Math.PI * f;
      this.phase += omega * dt;
      if (this.phase > Math.PI * 2) this.phase -= Math.PI * 2;

      const x = amp * Math.sin(this.phase);
      const v = amp * omega * Math.cos(this.phase);
      const gauss = Math.exp(-(x * x) / (2 * sigma * sigma));
      const dFlux = B * A * gauss * (-x / (sigma * sigma)) * v;
      this.emf = -turns * dFlux;
      this.flux = B * A * gauss;

      this.emfRef = Math.max(0.01, turns * B * A * amp * omega / sigma * Math.exp(-0.5));
      const norm = U.clamp(this.emf / this.emfRef, -1, 1);

      if (this.magnetGroup) {
        this.magnetGroup.position.x = x;
        this.magnetGroup.position.y = 1.55;
        if (this.fieldLoops) {
          this.fieldLoops.children.forEach((line, i) => {
            line.material.opacity = 0.16 + 0.1 * Math.abs(norm);
          });
        }
      }

      const target = norm * 1.02;
      this.needleAngle += (target - this.needleAngle) * (1 - Math.exp(-9 * dt));
      if (this.needle) this.needle.rotation.z = -this.needleAngle;

      // current dots
      if (this.currentPoints && this.helixCurve) {
        const visible = Math.abs(norm);
        this.currentPoints.material.opacity = 0.12 + visible * 0.85;
        this.currentPoints.material.size = 0.035 + visible * 0.045;
        this.currentOffset += -Math.sign(norm) * dt * 0.15;
        if (this.currentOffset > 1) this.currentOffset -= 1;
        if (this.currentOffset < 0) this.currentOffset += 1;
        for (let i = 0; i < this.currentN; i++) {
          let t = (i / this.currentN + this.currentOffset) % 1;
          if (t < 0) t += 1;
          const p = this.helixCurve.getPointAt(t);
          const rr = Math.hypot(p.y, p.z) || 1;
          const scale = (rr + 0.045) / rr;
          this.currentArray[i * 3] = p.x;
          this.currentArray[i * 3 + 1] = p.y * scale + 1.55;
          this.currentArray[i * 3 + 2] = p.z * scale;
        }
        this.currentPoints.geometry.attributes.position.needsUpdate = true;
      }

      if (this.meterGroup) {
        this.meterGroup.position.y = 1.25 + Math.sin(this.elapsed * 0.9) * 0.002;
      }
    }

    updateNeedle(dt) {
      if (this.needle) this.needle.rotation.z = -this.needleAngle;
    }

    getMetrics() {
      const f = this.params.speed;
      const turns = this.params.turns;
      const B = this.params.field;
      const A = Math.PI * 0.55 * 0.55;
      const amp = 1.68;
      const sigma = 0.58;
      const omega = 2 * Math.PI * f;
      const peak = turns * B * A * amp * omega / sigma * Math.exp(-0.5);
      return [
        { label: '感应电动势峰值', value: peak.toFixed(1), unit: 'V' },
        { label: '瞬时电动势', value: this.emf.toFixed(1), unit: 'V' },
        { label: '磁通量 Φ', value: (this.flux * 1000).toFixed(1), unit: 'mWb' },
        { label: '变化频率', value: f.toFixed(2), unit: 'Hz' }
      ];
    }
  }

  PL.registerScene('faraday', FaradayScene);
})();
