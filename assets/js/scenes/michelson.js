/* =========================================================
   Scene 01 — Michelson Interferometer
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;

  class MichelsonScene extends PL.SceneBase {
    build() {
      const S = this.scene;
      const y0 = 1.05;
      this.opticalY = y0;

      U.addTable(S, 9.2, 6.6, { y: 0 });
      this.buildLaser(y0);
      this.buildBeamSplitter(y0);
      this.buildMirrors(y0);
      this.buildScreen(y0);
      this.buildBeams(y0);

      this.cameraHome.set(5.45, 4.25, 7.3);
      this.cameraTarget.set(0.12, 1.15, 0.15);
      this.controls.minDistance = 3.2;
      this.controls.maxDistance = 24;

      this.buildLabels();
      this.explodeAmount = 0;
      this.explodeTarget = 0;
      this.autoPulse = 0;
      this.refreshFringes();
    }

    post(x, z, height, radius, color) {
      const S = this.scene;
      const mat = U.metal(color || 0x66798e, 0.4);
      const post = U.cyl(radius || 0.045, (radius || 0.045) * 1.25, height, mat, 20);
      post.position.set(x, height / 2, z);
      S.add(post);
      const base = U.cyl(0.17, 0.21, 0.055, U.metal(0x3e5169, 0.48), 28);
      base.position.set(x, 0.028, z);
      S.add(base);
      return post;
    }

    buildLaser(y) {
      const S = this.scene;
      const g = new THREE.Group();
      g.position.set(-3.62, y, 0);
      const body = U.cyl(0.19, 0.19, 1.5, U.metal(0x53677e, 0.25), 36);
      body.rotation.z = Math.PI / 2;
      body.position.x = -0.12;
      g.add(body);
      const shroud = U.cyl(0.215, 0.215, 0.2, U.metal(0x71879f, 0.18), 36);
      shroud.rotation.z = Math.PI / 2;
      shroud.position.x = -0.9;
      g.add(shroud);
      const nose = U.cyl(0.095, 0.13, 0.27, U.metal(0x2d3c4d, 0.2), 28);
      nose.rotation.z = Math.PI / 2;
      nose.position.x = 0.76;
      g.add(nose);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.155, 0.016, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xff4e5e, transparent: true, opacity: 0.75 })
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.x = 0.89;
      g.add(ring);
      const glow = U.glow(0xff5361, 0.7, 0.55);
      glow.position.x = 0.93;
      g.add(glow);
      const tag = U.box(0.48, 0.16, 0.02, new THREE.MeshBasicMaterial({ color: 0xe8f2ff, transparent: true, opacity: 0.65 }));
      tag.position.set(-0.25, 0.24, 0.19);
      g.add(tag);
      S.add(g);
      this.post(-3.62, 0, y - 0.19, 0.06);
      this.laserGroup = g;

      const beam = U.beam(new THREE.Vector3(-2.78, y, 0), new THREE.Vector3(0, y, 0), 0xff4f5e, 0.65, 0.013);
      S.add(beam);
      this.inputBeam = beam;

      // light dust along input
      this.pulses = [];
      for (let i = 0; i < 3; i++) {
        const p = U.glow(0xff6874, 0.22, 0.8);
        p.position.set(-2.8 + i * 0.9, y, 0);
        S.add(p);
        this.pulses.push({ obj: p, t: i / 3 });
      }
    }

    buildBeamSplitter(y) {
      const S = this.scene;
      const g = new THREE.Group();
      g.position.set(0, y, 0);

      const frameMat = U.metal(0x52667f, 0.34);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.18, 0.05), frameMat);
      frame.castShadow = true;
      g.add(frame);

      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 0.025), U.glass(0x8cecff, 0.3));
      glass.position.z = 0.032;
      g.add(glass);

      const splitLine = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 0.014),
        new THREE.MeshBasicMaterial({ color: 0xa8f4ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      splitLine.position.set(0, 0, 0.056);
      g.add(splitLine);

      const knob = U.cyl(0.09, 0.09, 0.2, U.metal(0x8da4bd, 0.25), 24);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(0.38, -0.55, 0.18);
      g.add(knob);

      g.rotation.y = -Math.PI / 4;
      S.add(g);
      this.post(0, 0, y - 0.63, 0.055);
      this.g1Group = g;

      // compensator, parallel to G1 and displaced along transmitted arm
      const cg = new THREE.Group();
      cg.position.set(0.63, y, 0);
      const cFrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.06, 0.04), U.metal(0x374b61, 0.42));
      cg.add(cFrame);
      const cGlass = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.94, 0.022), U.glass(0x7ee7d4, 0.2));
      cGlass.position.z = 0.028;
      cg.add(cGlass);
      cg.rotation.y = -Math.PI / 4;
      S.add(cg);
      this.post(0.63, 0.02, y - 0.63, 0.045);
      this.g2Group = cg;
    }

    buildMirrors(y) {
      const S = this.scene;
      const mirrorMat = new THREE.MeshStandardMaterial({
        color: 0xc5e8ff,
        roughness: 0.055,
        metalness: 0.98,
        emissive: 0x12293d,
        emissiveIntensity: 0.55
      });
      const backMat = U.metal(0x263b52, 0.3);

      // M1 — movable mirror on a translation stage
      const m1 = new THREE.Group();
      m1.position.set(0, y, 2.55);
      const m1Back = U.box(1.3, 1.34, 0.09, backMat);
      m1.add(m1Back);
      const m1Face = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.2), mirrorMat);
      m1Face.position.z = -0.052;
      m1Face.rotation.y = Math.PI;
      m1.add(m1Face);
      const m1Edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.32, 1.36, 0.1)),
        new THREE.LineBasicMaterial({ color: 0x80dfff, transparent: true, opacity: 0.35 })
      );
      m1.add(m1Edge);
      // mount & micrometer
      const m1Mount = U.box(0.46, 0.5, 0.28, U.metal(0x40546b, 0.38));
      m1Mount.position.set(0, -0.88, 0);
      m1.add(m1Mount);
      const barrel = U.cyl(0.13, 0.13, 0.38, U.metal(0x9aafc5, 0.2), 28);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0.42, -0.88, 0.18);
      m1.add(barrel);
      const drum = U.cyl(0.16, 0.16, 0.15, U.metal(0xbdcedd, 0.24), 32);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(0.42, -0.88, 0.42);
      m1.add(drum);
      const scaleRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.008, 6, 40),
        new THREE.MeshBasicMaterial({ color: 0x9fe9ff, transparent: true, opacity: 0.5 })
      );
      scaleRing.rotation.x = Math.PI / 2;
      scaleRing.position.set(0.42, -0.88, 0.5);
      m1.add(scaleRing);
      S.add(m1);
      this.post(0, 2.55, y - 0.68, 0.06);
      this.m1Group = m1;
      this.m1Base = m1.position.clone();
      this.scaleRing = scaleRing;

      // M2 — fixed mirror
      const m2 = new THREE.Group();
      m2.position.set(2.55, y, 0);
      const m2Back = U.box(0.09, 1.34, 1.3, backMat);
      m2.add(m2Back);
      const m2Face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.18), mirrorMat);
      m2Face.position.x = -0.052;
      m2Face.rotation.y = -Math.PI / 2;
      m2.add(m2Face);
      const m2Edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.1, 1.36, 1.32)),
        new THREE.LineBasicMaterial({ color: 0x80dfff, transparent: true, opacity: 0.35 })
      );
      m2.add(m2Edge);
      const m2Mount = U.box(0.28, 0.5, 0.46, U.metal(0x40546b, 0.38));
      m2Mount.position.set(0, -0.88, 0);
      m2.add(m2Mount);
      const adjust = U.cyl(0.07, 0.07, 0.2, U.metal(0xaabccd, 0.25), 20);
      adjust.position.set(0.26, -0.55, -0.5);
      adjust.rotation.z = Math.PI / 2;
      m2.add(adjust);
      S.add(m2);
      this.post(2.55, 0, y - 0.68, 0.06);
      this.m2Group = m2;
      this.m2Base = m2.position.clone();

      // dashed optical axis
      const axis = U.line([new THREE.Vector3(-4.1, y, 0), new THREE.Vector3(3.3, y, 0)], 0x7fcfff, 0.12, true);
      S.add(axis);
    }

    buildScreen(y) {
      const S = this.scene;
      const g = new THREE.Group();
      g.position.set(0, y + 0.38, -2.78);

      const frameMat = U.metal(0x2b3d52, 0.45);
      const frame = U.box(2.18, 2.18, 0.06, frameMat);
      g.add(frame);

      this.fringeTexture = U.makeCanvasTexture(512, 512, () => {});
      const screenMat = new THREE.MeshBasicMaterial({
        map: this.fringeTexture,
        toneMapped: false,
        side: THREE.DoubleSide
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.04, 2.04), screenMat);
      screen.position.z = 0.038;
      g.add(screen);

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(2.18, 2.18, 0.065)),
        new THREE.LineBasicMaterial({ color: 0x5ab4d8, transparent: true, opacity: 0.45 })
      );
      g.add(edge);

      // ruler at bottom
      for (let i = -8; i <= 8; i++) {
        const tick = U.box(0.012, i % 4 === 0 ? 0.08 : 0.045, 0.01, new THREE.MeshBasicMaterial({ color: 0x78a7c4, transparent: true, opacity: 0.55 }));
        tick.position.set(i * 0.12, -1.12, 0.05);
        g.add(tick);
      }

      const stand = U.cyl(0.04, 0.055, y + 0.38 - 0.08, U.metal(0x4a5f76, 0.4), 20);
      stand.position.y = -(y + 0.3) / 2;
      g.add(stand);
      const foot = U.cyl(0.24, 0.3, 0.05, U.metal(0x3e5169, 0.5), 28);
      foot.position.set(0, -(y + 0.38) + 0.025, 0);
      g.add(foot);

      S.add(g);
      this.screenGroup = g;
      this.screenBase = g.position.clone();

      const light = new THREE.PointLight(0xff6b5e, 0.7, 4.5, 2);
      light.position.set(0, y + 0.38, -2.4);
      S.add(light);
      this.screenLight = light;

      // halo behind screen
      const halo = U.glow(0xff5f52, 2.5, 0.12);
      halo.position.set(0, y + 0.38, -2.86);
      S.add(halo);
    }

    buildBeams(y) {
      const S = this.scene;
      const beamColor = 0xff5260;
      const paths = [
        [new THREE.Vector3(0, y, 0), new THREE.Vector3(0, y, 2.48)],
        [new THREE.Vector3(0, y, 2.48), new THREE.Vector3(0, y, 0)],
        [new THREE.Vector3(0, y, 0), new THREE.Vector3(2.48, y, 0)],
        [new THREE.Vector3(2.48, y, 0), new THREE.Vector3(0.58, y, 0)],
        [new THREE.Vector3(0, y, 0), new THREE.Vector3(0, y, -2.74)]
      ];
      this.beamGroup = new THREE.Group();
      paths.forEach((p, i) => {
        const b = U.beam(p[0], p[1], beamColor, i === 4 ? 0.8 : 0.4, i === 4 ? 0.016 : 0.011);
        this.beamGroup.add(b);
      });
      S.add(this.beamGroup);

      // small return arrow labels on beams
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xff707b, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const arrowGeo = new THREE.ConeGeometry(0.045, 0.16, 8);
      [[0, y, 1.35, 0], [1.9, y, 0, -Math.PI / 2], [0, y, -1.6, Math.PI]].forEach((d) => {
        const a = new THREE.Mesh(arrowGeo, arrowMat);
        a.position.set(d[0], d[1], d[2]);
        a.rotation.z = d[3];
        S.add(a);
      });
    }

    buildLabels() {
      const y = this.opticalY;
      this.addLabel('激光器 He–Ne', new THREE.Vector3(-3.65, y + 0.42, 0), { key: 'L', accent: 'red', dx: -16, dy: -4 });
      this.addLabel('分光板 G1 · 45°', new THREE.Vector3(0.18, y + 0.68, 0.18), { key: 'G1', accent: 'cyan', dx: 42, dy: -10 });
      this.addLabel('补偿板 G2', () => this.g2Group.position.clone().add(new THREE.Vector3(0.05, 0.55, 0.46)), { key: 'G2', accent: 'green', dx: 54, dy: 22 });
      this.addLabel('动镜 M1', () => this.m1Group.position.clone().add(new THREE.Vector3(0.55, 0.94, 0)), { key: 'M1', accent: 'amber', dx: 12, dy: -6 });
      this.addLabel('定镜 M2', () => this.m2Group.position.clone().add(new THREE.Vector3(0, 0.84, -0.62)), { key: 'M2', accent: 'amber', dx: 16, dy: -4 });
      this.addLabel('观察屏 · 等倾圆环', () => this.screenGroup.position.clone().add(new THREE.Vector3(0, 1.1, 0)), { key: 'S', accent: 'red', dx: 0, dy: -12 });
    }

    onParamsChanged() {
      this.refreshFringes();
    }

    refreshFringes() {
      if (!this.fringeTexture) return;
      const canvas = this.fringeTexture.image;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const img = ctx.createImageData(w, h);
      const data = img.data;
      const d = this.params.d * 1e-6;
      const lam = this.params.lambda * 1e-9;
      const tilt = this.params.tilt || 0;
      const css = U.wavelengthToCss(this.params.lambda);
      const nums = css.match(/\d+/g);
      const cr = parseInt(nums[0], 10);
      const cg = parseInt(nums[1], 10);
      const cb = parseInt(nums[2], 10);
      const phaseScale = (4 * Math.PI * d) / lam;
      const thetaMax = 0.44;
      const sx = 1 + tilt * 1.05;
      const sy = 1 - tilt * 0.28;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = (x - w / 2) / (w / 2);
          const ny = (y - h / 2) / (h / 2);
          const rr = Math.sqrt((nx * sx) ** 2 + (ny * sy) ** 2);
          if (rr > 1.08) {
            const idx = (y * w + x) * 4;
            data[idx] = 2; data[idx + 1] = 4; data[idx + 2] = 8; data[idx + 3] = 255;
            continue;
          }
          const cosTheta = Math.cos(Math.min(1, rr) * thetaMax);
          const phase = phaseScale * cosTheta + tilt * 2.4;
          let intensity = 0.5 + 0.5 * Math.cos(phase);
          intensity = 0.055 + 0.945 * Math.pow(intensity, 1.15);
          const edge = Math.max(0, 1 - Math.pow(Math.max(0, rr - 0.72) / 0.36, 2));
          intensity *= 0.35 + 0.65 * edge;
          const gl = 0.4 + 0.6 * (cr / 255);
          const idx = (y * w + x) * 4;
          data[idx] = Math.round(cr * intensity * gl);
          data[idx + 1] = Math.round(cg * intensity * gl);
          data[idx + 2] = Math.round(cb * intensity * gl);
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      // subtle screen gloss
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, 'rgba(255,255,255,.05)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,.025)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      this.fringeTexture.needsUpdate = true;
      if (this.screenLight) {
        const c = U.wavelengthToColor(this.params.lambda);
        this.screenLight.color.copy(c);
      }
    }

    onExploded(value) {
      this.explodeTarget = value ? 1 : 0;
    }

    step(dt) {
      const k = 1 - Math.exp(-6 * dt);
      this.explodeAmount += (this.explodeTarget - this.explodeAmount) * k;
      const e = this.explodeAmount;
      if (this.m1Group) {
        this.m1Group.position.copy(this.m1Base).add(new THREE.Vector3(0, e * 0.18, e * 1.0));
      }
      if (this.m2Group) {
        this.m2Group.position.copy(this.m2Base).add(new THREE.Vector3(e * 1.05, e * 0.18, 0));
      }
      if (this.screenGroup) {
        this.screenGroup.position.copy(this.screenBase).add(new THREE.Vector3(0, e * 0.15, -e * 1.0));
      }
      if (this.g2Group) {
        this.g2Group.position.y = this.opticalY + e * 0.62;
        this.g2Group.position.x = 0.63 + e * 0.28;
      }

      if (this.pulses) {
        this.pulses.forEach((p) => {
          p.t += dt * 0.2;
          if (p.t > 1) p.t -= 1;
          p.obj.position.x = -2.8 + p.t * 2.8;
          p.obj.material.opacity = 0.28 + 0.5 * Math.sin(p.t * Math.PI);
        });
      }
      if (this.scaleRing) {
        this.scaleRing.rotation.z += dt * 0.25;
      }
      if (this.screenLight) {
        this.screenLight.intensity = 0.58 + 0.08 * Math.sin(this.elapsed * 1.8);
      }
    }

    getMetrics() {
      const lam = this.params.lambda;
      const d = this.params.d;
      const m = (2 * d * 1000) / lam;
      return [
        { label: '中心干涉级次', value: m.toFixed(1), unit: '级' },
        { label: '等效移过条纹', value: m.toFixed(1), unit: '条' },
        { label: '单条条纹位移', value: (lam / 2000).toFixed(3), unit: 'µm' },
        { label: '往返光程差', value: (2 * d).toFixed(2), unit: 'µm' }
      ];
    }

    getMeasurement() {
      const d = this.params.d;
      const lambda = this.params.lambda;
      return {
        d: d,
        N: (2 * d * 1000) / lambda,
        lambda: lambda,
        contrast: this.params.tilt
      };
    }
  }

  PL.registerScene('michelson', MichelsonScene);
})();
