/* =========================================================
   Scene 03 — Young's double-slit interference
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;

  class DoubleSlitScene extends PL.SceneBase {
    build() {
      const S = this.scene;
      this.y0 = 1.15;
      this.sepVisual = 0.4;
      U.addTable(S, 9.4, 5.0, { y: 0 });

      this.buildLaser();
      this.buildBarrier();
      this.buildScreen();
      this.buildWaveField();

      this.cameraHome.set(5.35, 4.0, 6.6);
      this.cameraTarget.set(0.9, 1.08, 0);
      this.controls.minDistance = 3.4;
      this.controls.maxDistance = 24;

      this.buildLabels();
      this.explodeAmount = 0;
      this.explodeTarget = 0;
      this.refreshPattern();
    }

    buildLaser() {
      const S = this.scene;
      const y = this.y0;
      const g = new THREE.Group();
      g.position.set(-3.7, y, 0);
      const body = U.cyl(0.17, 0.17, 1.35, U.metal(0x4d6278, 0.24), 36);
      body.rotation.z = Math.PI / 2;
      g.add(body);
      const head = U.cyl(0.105, 0.145, 0.26, U.metal(0x2d3c4d, 0.2), 28);
      head.rotation.z = Math.PI / 2;
      head.position.x = 0.73;
      g.add(head);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.013, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x75ffc6, transparent: true, opacity: 0.75 })
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.x = 0.86;
      g.add(ring);
      const glow = U.glow(0x76ffc9, 0.52, 0.55);
      glow.position.x = 0.9;
      g.add(glow);
      S.add(g);
      this.post(-3.7, 0, y - 0.18, 0.055);
      this.laserGroup = g;

      const beam = U.beam(new THREE.Vector3(-2.82, y, 0), new THREE.Vector3(-0.02, y, 0), 0x6fffc8, 0.55, 0.012);
      S.add(beam);
      this.laserBeam = beam;

      this.pulses = [];
      for (let i = 0; i < 3; i++) {
        const p = U.glow(0x8affd4, 0.2, 0.8);
        p.position.set(-2.8 + i * 0.9, y, 0);
        S.add(p);
        this.pulses.push({ obj: p, t: i / 3 });
      }
    }

    post(x, z, height, radius) {
      const post = U.cyl(radius || 0.04, (radius || 0.04) * 1.2, height, U.metal(0x60758d, 0.4), 18);
      post.position.set(x, height / 2, z);
      this.scene.add(post);
      const base = U.cyl(0.16, 0.2, 0.05, U.metal(0x3d5066, 0.5), 24);
      base.position.set(x, 0.025, z);
      this.scene.add(base);
    }

    buildBarrier() {
      const S = this.scene;
      const y = this.y0;
      const g = new THREE.Group();
      g.position.set(0, 0, 0);

      const frameMat = U.metal(0x354b63, 0.36);
      const top = U.box(0.08, 0.11, 1.72, frameMat);
      top.position.set(0, y + 1.12, 0);
      g.add(top);
      const bottom = U.box(0.08, 0.13, 1.72, frameMat);
      bottom.position.set(0, y - 1.10, 0);
      g.add(bottom);

      const sep = this.sepVisual;
      const outer = 0.74;
      const gapHalf = sep / 2;
      const edge = 0.045;
      const leftW = (outer - gapHalf - edge);
      const centerW = (gapHalf * 2 - edge * 2);
      const segs = [
        { z: -(gapHalf + edge + leftW / 2), w: leftW },
        { z: 0, w: centerW },
        { z: (gapHalf + edge + leftW / 2), w: leftW }
      ];
      segs.forEach((s) => {
        const bar = U.box(0.06, 2.1, s.w, new THREE.MeshStandardMaterial({ color: 0x182b40, roughness: 0.4, metalness: 0.72 }));
        bar.position.set(0, y, s.z);
        g.add(bar);
      });

      // luminous slit edges
      [-1, 1].forEach((dir) => {
        const z = dir * (gapHalf + edge);
        const line = U.box(0.015, 2.04, 0.008, new THREE.MeshBasicMaterial({ color: 0x78ffd0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
        line.position.set(0.042, y, z);
        g.add(line);
        const glow = U.glow(0x75ffca, 0.28, 0.6);
        glow.position.set(0.06, y, z);
        g.add(glow);
      });

      const slitLabelMat = new THREE.MeshBasicMaterial({ color: 0x75ffca, transparent: true, opacity: 0.24, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
      [-1, 1].forEach((dir) => {
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 2.0), slitLabelMat);
        sheet.position.set(0.055, y, dir * (gapHalf + edge));
        sheet.rotation.y = Math.PI / 2;
        g.add(sheet);
      });

      S.add(g);
      this.post(0, 0, 0.06, 0.055);
      this.barrierGroup = g;
      this.barrierBase = g.position.clone();

      // holder
      const holder = U.box(0.2, 0.5, 1.9, U.metal(0x2d4055, 0.4));
      holder.position.set(0, 0.28, 0);
      S.add(holder);
      this.barrierHolder = holder;

      const add = U.box(0.3, 0.08, 1.8, U.metal(0x25384c, 0.5));
      add.position.set(0, 0.035, 0);
      S.add(add);
    }

    buildScreen() {
      const S = this.scene;
      const y = this.y0;
      const g = new THREE.Group();
      g.position.set(3.35, y + 0.1, 0);
      g.rotation.y = Math.PI / 2;

      const frame = U.box(2.42, 2.12, 0.055, U.metal(0x2e4357, 0.4));
      g.add(frame);
      this.patternCanvas = document.createElement('canvas');
      this.patternCanvas.width = 512;
      this.patternCanvas.height = 512;
      this.patternTexture = null;
      const screenMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        toneMapped: false,
        side: THREE.DoubleSide
      });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(2.28, 1.98), screenMat);
      face.position.z = 0.035;
      g.add(face);
      this.screenFace = face;
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(2.42, 2.12, 0.06)),
        new THREE.LineBasicMaterial({ color: 0x66c7b3, transparent: true, opacity: 0.4 })
      );
      g.add(edge);

      // stand
      const standHeight = Math.max(0.16, y - 1.0);
      const rod = U.cyl(0.035, 0.045, standHeight, U.metal(0x526880, 0.38), 18);
      rod.position.set(0, -1.02 - standHeight / 2, 0);
      g.add(rod);
      const foot = U.cyl(0.28, 0.34, 0.05, U.metal(0x3c5068, 0.5), 28);
      foot.position.set(0, -1.02 - standHeight + 0.025, 0);
      g.add(foot);

      S.add(g);
      this.screenGroup = g;
      this.screenBase = g.position.clone();

      const light = new THREE.PointLight(0x68ffc2, 0.55, 4.5, 2);
      light.position.set(3.0, y + 0.2, 0);
      S.add(light);
      this.screenLight = light;
    }

    buildWaveField() {
      const y = this.y0 - 0.085;
      const geo = new THREE.PlaneGeometry(3.1, 2.35, 1, 1);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSep: { value: 0.18 },
          uPhase: { value: 15 },
          uColor: { value: new THREE.Color(0x62ffd0) },
          uOpacity: { value: 1 }
        },
        vertexShader: [
          'varying vec2 vUv;',
          'void main() {',
          '  vUv = uv;',
          '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
          '}'
        ].join('\n'),
        fragmentShader: [
          'uniform float uTime;',
          'uniform float uSep;',
          'uniform float uPhase;',
          'uniform vec3 uColor;',
          'uniform float uOpacity;',
          'varying vec2 vUv;',
          'void main() {',
          '  vec2 src = vec2(0.035, 0.5);',
          '  float r1 = distance(vUv, src + vec2(0.0, uSep));',
          '  float r2 = distance(vUv, src - vec2(0.0, uSep));',
          '  float phase = uPhase * (r2 - r1);',
          '  float wave = 0.5 + 0.5 * cos(phase * 6.28318);',
          '  float ripple = 0.5 + 0.5 * sin((r1 + r2) * 46.0 - uTime * 2.4);',
          '  float envelope = smoothstep(0.0, 0.20, vUv.x) * (1.0 - smoothstep(0.72, 1.0, vUv.x));',
          '  float side = 1.0 - smoothstep(0.43, 0.72, abs(vUv.y - 0.5));',
          '  float alpha = envelope * side * (0.055 + 0.18 * wave) * (0.65 + 0.35 * ripple);',
          '  gl_FragColor = vec4(uColor, alpha * uOpacity);',
          '}'
        ].join('\n'),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const plane = new THREE.Mesh(geo, mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(1.63, y, 0);
      this.scene.add(plane);
      this.wavePlane = plane;
      this.waveUniforms = mat.uniforms;

      // fine fan lines from the two slits
      const sep = this.sepVisual / 2;
      const rayMat = new THREE.LineBasicMaterial({ color: 0x65ffcf, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = -4; i <= 4; i++) {
        const endZ = i * 0.2;
        [-1, 1].forEach((dir) => {
          const geo2 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0.05, this.y0, dir * sep),
            new THREE.Vector3(3.25, this.y0, endZ)
          ]);
          this.scene.add(new THREE.Line(geo2, rayMat));
        });
      }
    }

    buildLabels() {
      const y = this.y0;
      this.labLaser = this.addLabel('激光器 · 532 nm', new THREE.Vector3(-3.7, y + 0.55, 0), { accent: 'green', dx: -8 });
      this.labSlit = this.addLabel('双缝板 · d = 0.25 mm', () => this.barrierGroup.position.clone().add(new THREE.Vector3(-0.02, y + 1.25, 0)), { accent: 'cyan', key: 'slit', dx: 2, dy: -10 });
      this.addLabel('观察屏', () => this.screenGroup.position.clone().add(new THREE.Vector3(0, 1.02, 0)), { accent: 'amber', key: 'screen', dx: 10, dy: -6 });
      this.addLabel('光波场（示意）', new THREE.Vector3(1.6, y - 0.06, -0.92), { accent: 'violet', key: 'wave', dx: -20, dy: 12 });
      this.addLabel('Δy = λL / d', () => this.screenGroup.position.clone().add(new THREE.Vector3(0, -0.68, 0.78)), { accent: 'green', key: 'spacing', dx: 12, dy: 16 });
    }

    onParamsChanged() {
      this.refreshWave();
      this.refreshPattern();
    }

    refreshWave() {
      if (!this.waveUniforms) return;
      const d = this.params.d;
      const lam = this.params.lambda;
      this.waveUniforms.uSep.value = 0.06 + (0.25 / d) * 0.09;
      this.waveUniforms.uPhase.value = 12 * (550 / lam) * (0.25 / d);
      this.waveUniforms.uColor.value.copy(U.wavelengthToColor(lam));
    }

    refreshPattern() {
      if (!this.patternCanvas) return;
      this.refreshWave();
      const canvas = this.patternCanvas;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const ph = 344;
      const lam = this.params.lambda;
      const d = this.params.d;
      const L = this.params.L;
      const spacing = (lam * 1e-9 * L) / (d * 1e-3) * 1000; // mm
      const widthMm = 30;
      const slitWidth = 0.08; // mm
      const css = U.wavelengthToCss(lam);
      const nums = css.match(/\d+/g);
      const cr = parseInt(nums[0], 10);
      const cg = parseInt(nums[1], 10);
      const cb = parseInt(nums[2], 10);

      ctx.fillStyle = '#03080c';
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x++) {
        const z = (x / w - 0.5) * widthMm;
        const phase = (2 * Math.PI * z) / spacing;
        const inter = 0.5 + 0.5 * Math.cos(phase);
        const a = slitWidth;
        const beta = (Math.PI * a * z) / (lam * 1e-6 * L * 1000);
        const sinc = Math.abs(beta) < 1e-8 ? 1 : Math.sin(beta) / beta;
        const envelope = sinc * sinc;
        let intensity = inter * envelope;
        intensity = 0.035 + 0.965 * Math.pow(intensity, 1.45);
        const edge = 1 - Math.pow(Math.abs(x / w - 0.5) * 2, 10);
        intensity *= 0.55 + 0.45 * edge;
        ctx.fillStyle = 'rgb(' + Math.round(cr * intensity) + ',' + Math.round(cg * intensity) + ',' + Math.round(cb * intensity) + ')';
        ctx.fillRect(x, 0, 1, ph);
      }
      const sheen = ctx.createLinearGradient(0, 0, 0, ph);
      sheen.addColorStop(0, 'rgba(255,255,255,.045)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
      sheen.addColorStop(1, 'rgba(0,0,0,.16)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, ph);

      // center tick & ruler
      ctx.fillStyle = 'rgba(4,10,14,.92)';
      ctx.fillRect(0, ph, w, h - ph);
      ctx.strokeStyle = 'rgba(160,235,220,.38)';
      ctx.lineWidth = 1;
      for (let mm = -15; mm <= 15; mm += 2.5) {
        const x = (mm / widthMm + 0.5) * w;
        const big = Math.abs(mm % 5) < 0.01;
        ctx.beginPath();
        ctx.moveTo(x, ph + 4);
        ctx.lineTo(x, ph + (big ? 22 : 14));
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(190,245,235,.65)';
      ctx.font = '17px "Cascadia Code", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('-10', ( -10 / widthMm + 0.5) * w, ph + 42);
      ctx.fillText('0', w / 2, ph + 42);
      ctx.fillText('+10 mm', (10 / widthMm + 0.5) * w, ph + 42);
      ctx.strokeStyle = 'rgba(220,255,250,.6)';
      ctx.beginPath();
      ctx.moveTo(w / 2, ph - 8);
      ctx.lineTo(w / 2, ph + 6);
      ctx.stroke();

      if (this.patternTexture) this.patternTexture.dispose();
      const tex = new THREE.CanvasTexture(canvas);
      tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = 4;
      this.patternTexture = tex;
      this.screenFace.material.map = tex;
      this.screenFace.material.needsUpdate = true;
      this.patternSpacing = spacing;
      const col = U.wavelengthToColor(lam);
      if (this.laserBeam) {
        this.laserBeam.traverse((o) => { if (o.material && o.material.color) o.material.color.copy(col); });
      }
      this.pulses.forEach((p) => { if (p.obj.material) p.obj.material.color.copy(col); });
      if (this.waveUniforms) this.waveUniforms.uColor.value.copy(col);
      if (this.labLaser) this.labLaser.el.querySelector('.lab-text').textContent = '激光器 · ' + this.params.lambda + ' nm';
      if (this.labSlit) this.labSlit.el.querySelector('.lab-text').textContent = '双缝板 · d = ' + this.params.d.toFixed(2) + ' mm';
      if (this.screenLight) this.screenLight.color.copy(col);
    }

    onExploded(value) {
      this.explodeTarget = value ? 1 : 0;
    }

    step(dt) {
      const k = 1 - Math.exp(-6 * dt);
      this.explodeAmount += (this.explodeTarget - this.explodeAmount) * k;
      const e = this.explodeAmount;
      if (this.screenGroup) {
        this.screenGroup.position.copy(this.screenBase).add(new THREE.Vector3(e * 1.0, e * 0.08, 0));
      }
      if (this.barrierGroup) {
        this.barrierGroup.position.x = this.barrierBase.x - e * 0.35;
      }
      if (this.barrierHolder) {
        this.barrierHolder.position.x = -e * 0.35;
      }
      if (this.waveUniforms) {
        this.waveUniforms.uTime.value = this.elapsed;
        this.waveUniforms.uOpacity.value = 1 - e * 0.65;
      }
      if (this.pulses) {
        this.pulses.forEach((p) => {
          p.t += dt * 0.24;
          if (p.t > 1) p.t -= 1;
          p.obj.position.x = -2.8 + p.t * 2.8;
          p.obj.material.opacity = 0.25 + 0.55 * Math.sin(p.t * Math.PI);
        });
      }
    }

    getMetrics() {
      const spacing = (this.params.lambda * 1e-9 * this.params.L) / (this.params.d * 1e-3) * 1000;
      const orders = Math.floor(15 / spacing);
      return [
        { label: '条纹间距 Δy', value: spacing.toFixed(2), unit: 'mm' },
        { label: '30 mm 内亮纹', value: (orders * 2 + 1).toString(), unit: '条' },
        { label: '光程差 d·sinθ', value: (this.params.d * 1000 * spacing / (this.params.L * 1000)).toFixed(2), unit: 'µm' },
        { label: '缝屏距离 L', value: this.params.L.toFixed(2), unit: 'm' }
      ];
    }
  }

  PL.registerScene('double-slit', DoubleSlitScene);
})();
