/* =========================================================
   Scene 05 — Photoelectric effect
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;

  class PhotoelectricScene extends PL.SceneBase {
    constructor(app, def) {
      super(app, def);
      this.photons = [];
      this.electrons = [];
      this.photonTimer = 0;
      this.reachCount = 0;
      this.reachWindow = 0;
      this.current = 0;
      this.Kmax = 0;
      this.Us = 0;
      this.y0 = 1.95;
    }

    build() {
      const S = this.scene;
      U.addTable(S, 8.6, 5.2, { y: 0 });

      this.buildSupport();
      this.buildTube();
      this.buildElectrodes();
      this.buildLight();
      this.buildReadout();

      this.cameraHome.set(4.85, 4.05, 7.9);
      this.cameraTarget.set(0.05, 1.86, 0);
      this.controls.minDistance = 3.4;
      this.controls.maxDistance = 22;

      this.buildLabels();
      this.explodeAmount = 0;
      this.explodeTarget = 0;
      this.recompute();
    }

    buildSupport() {
      const S = this.scene;
      const rail = U.box(4.0, 0.08, 0.7, U.metal(0x2d4055, 0.45));
      rail.position.set(0, 0.04, 0);
      S.add(rail);
      [-1.32, 1.32].forEach((x) => {
        const post = U.cyl(0.045, 0.06, 1.35, U.metal(0x526a82, 0.36), 20);
        post.position.set(x, 0.72, 0);
        S.add(post);
        const saddle = U.box(0.3, 0.13, 0.62, new THREE.MeshStandardMaterial({ color: 0x1a2b3c, roughness: 0.62, metalness: 0.22 }));
        saddle.position.set(x, 1.31, 0);
        S.add(saddle);
      });
      const plate = U.box(1.2, 0.04, 0.85, U.metal(0x3b5066, 0.4));
      plate.position.set(0, 0.08, 0);
      S.add(plate);
    }

    buildTube() {
      const S = this.scene;
      const g = new THREE.Group();
      g.position.set(0, this.y0, 0);
      this.tubeBaseY = this.y0;

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x9fe9ff,
        metalness: 0,
        roughness: 0.05,
        transparent: true,
        opacity: 0.055,
        side: THREE.DoubleSide,
        depthWrite: false,
        clearcoat: 1,
        clearcoatRoughness: 0.05
      });
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 3.65, 56, 1, true), glassMat);
      tube.rotation.z = Math.PI / 2;
      g.add(tube);
      this.glass = tube;

      // faint longitudinal highlights make the glass envelope legible
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.22;
        const pts = [];
        for (let k = 0; k <= 12; k++) {
          const x = -1.82 + (3.64 * k) / 12;
          pts.push(new THREE.Vector3(x, Math.cos(a) * 0.642, Math.sin(a) * 0.642));
        }
        const line = U.line(pts, 0x85dfff, 0.11);
        g.add(line);
      }

      [-1.825, 1.825].forEach((x) => {
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(0.642, 0.022, 8, 44),
          U.metal(0x738ea6, 0.22)
        );
        rim.rotation.y = Math.PI / 2;
        rim.position.x = x;
        g.add(rim);
      });

      // thin latitude rings on the glass envelope
      [-0.85, 0.85].forEach((x) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.643, 0.004, 4, 56),
          new THREE.MeshBasicMaterial({ color: 0x7fdcff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        ring.rotation.y = Math.PI / 2;
        ring.position.x = x;
        g.add(ring);
      });

      // inner faint cylinder wall
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.615, 0.615, 3.5, 40, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x143b53, transparent: true, opacity: 0.055, side: THREE.BackSide, depthWrite: false })
      );
      inner.rotation.z = Math.PI / 2;
      g.add(inner);

      S.add(g);
      this.tubeGroup = g;
      this.tubeBase = g.position.clone();

      // internal glow
      const glow = U.glow(0x6bd9ff, 1.5, 0.09);
      glow.position.set(0, this.y0, 0);
      S.add(glow);
      this.tubeGlow = glow;
    }

    buildElectrodes() {
      const S = this.scene;
      const y = this.y0;

      // cathode plate
      const cathode = new THREE.Group();
      cathode.position.set(-0.92, y, 0);
      const plate = U.box(0.07, 1.05, 0.95, new THREE.MeshStandardMaterial({
        color: 0x8e7a55,
        roughness: 0.4,
        metalness: 0.8,
        emissive: 0x231505,
        emissiveIntensity: 0.55
      }));
      cathode.add(plate);
      const plateGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.86),
        new THREE.MeshBasicMaterial({ color: 0xffbe6a, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      plateGlow.rotation.y = Math.PI / 2;
      plateGlow.position.x = 0.045;
      cathode.add(plateGlow);
      const stem = U.cyl(0.025, 0.025, 0.7, U.metal(0x9dafc1, 0.3), 12);
      stem.position.set(-0.16, -0.82, 0);
      cathode.add(stem);
      S.add(cathode);
      this.cathode = cathode;
      this.cathodeImpact = U.glow(0xffd49a, 1.0, 0.18);
      this.cathodeImpact.position.set(-0.86, y, 0.05);
      S.add(this.cathodeImpact);

      // anode ring + grid
      const anode = new THREE.Group();
      anode.position.set(0.88, y, 0);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.045, 12, 48),
        U.metal(0xb3c6d8, 0.2)
      );
      ring.rotation.y = Math.PI / 2;
      anode.add(ring);
      const gridMat = new THREE.LineBasicMaterial({ color: 0xa9c9df, transparent: true, opacity: 0.36 });
      for (let i = -3; i <= 3; i++) {
        const z = i * 0.11;
        const h = Math.sqrt(Math.max(0, 0.36 * 0.36 - z * z));
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -h, z),
          new THREE.Vector3(0, h, z)
        ]);
        anode.add(new THREE.Line(geo, gridMat));
      }
      const stem2 = U.cyl(0.025, 0.025, 1.0, U.metal(0x9dafc1, 0.3), 12);
      stem2.position.set(0.18, -0.9, 0);
      anode.add(stem2);
      S.add(anode);
      this.anode = anode;

      // field lines between electrodes
      const fieldMat = new THREE.LineBasicMaterial({ color: 0x6688ff, transparent: true, opacity: 0.14 });
      this.fieldLines = [];
      for (let i = -2; i <= 2; i++) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.82, y + i * 0.22, 0),
          new THREE.Vector3(0.74, y + i * 0.22, 0)
        ]);
        const line = new THREE.Line(geo, fieldMat);
        S.add(line);
        this.fieldLines.push(line);
      }
      const fieldLabel = U.line([new THREE.Vector3(0, y - 0.62, 0), new THREE.Vector3(0, y - 0.85, 0)], 0x6f8cff, 0.3);
      S.add(fieldLabel);
    }

    buildLight() {
      const S = this.scene;
      const start = new THREE.Vector3(-3.05, 3.1, 0.6);
      const end = new THREE.Vector3(-0.95, 2.06, 0.08);
      const color = U.wavelengthToColor(this.params.lambda);
      const beam = U.beam(start, end, color, 0.4, 0.03);
      S.add(beam);
      this.lightBeam = beam;

      const halo = U.glow(color, 0.75, 0.3);
      halo.position.copy(start);
      S.add(halo);
      this.lightHalo = halo;

      // little source lamp
      const lamp = U.cyl(0.18, 0.23, 0.32, U.metal(0x3d5368, 0.3), 28);
      lamp.position.copy(start).add(new THREE.Vector3(-0.12, 0.1, 0));
      lamp.rotation.z = Math.PI / 3.8;
      S.add(lamp);
      this.lamp = lamp;

      this.photonGeo = new THREE.SphereGeometry(0.025, 8, 6);
      this.photonMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      this.lightStart = start;
      this.lightEnd = end;
    }

    buildReadout() {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const tex = new THREE.CanvasTexture(canvas);
      tex.encoding = THREE.sRGBEncoding;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(1.42, 0.71, 1);
      sprite.position.set(3.06, 2.74, 0.3);
      this.scene.add(sprite);
      this.readout = sprite;
      this.readoutCanvas = canvas;
      this.readoutTexture = tex;
    }

    buildLabels() {
      const y = this.y0;
      this.addLabel('阴极 K', new THREE.Vector3(-0.94, y + 0.75, 0), { key: 'K', accent: 'amber', dx: -18, dy: -8 });
      this.addLabel('阳极 A', new THREE.Vector3(0.9, y + 0.55, 0), { key: 'A', accent: 'cyan', dx: 20, dy: -8 });
      this.addLabel('入射光 hν', new THREE.Vector3(-2.3, 2.9, 0.48), { key: 'light', accent: 'violet', dx: -12, dy: -6 });
      this.addLabel('光电子', new THREE.Vector3(-0.15, y - 0.52, 0.1), { key: 'electron', accent: 'green', dx: 0, dy: 10 });
      this.addLabel('真空光电管', () => this.tubeGroup.position.clone().add(new THREE.Vector3(0.05, 0.82, -0.3)), { key: 'tube', accent: 'cyan', dx: 0, dy: -8 });
    }

    recompute() {
      const mat = PL.materials[this.params.material] || PL.materials.Cs;
      const photonEnergy = 1240 / this.params.lambda;
      this.photonEnergy = photonEnergy;
      this.work = mat.work;
      this.Kmax = Math.max(0, photonEnergy - mat.work);
      this.Us = this.Kmax;
      this.emission = this.Kmax > 0.001;
      const absU = Math.abs(Math.min(0, this.params.voltage));
      if (!this.emission) {
        this.current = 0;
      } else if (this.Us < 0.001) {
        this.current = this.params.intensity;
      } else {
        this.current = this.params.intensity * Math.max(0, 1 - Math.pow(U.clamp(absU / this.Us, 0, 1.2), 1.35));
      }
      if (this.emission && absU >= this.Us) this.current = 0;
      if (this.lightBeam) {
        const color = U.wavelengthToColor(this.params.lambda);
        this.lightBeam.traverse((o) => {
          if (o.material && o.material.color) o.material.color.copy(color);
        });
        if (this.photonMat) this.photonMat.color.copy(color);
        if (this.lightHalo) this.lightHalo.material.color.copy(color);
      }
      if (this.cathodeImpact) {
        this.cathodeImpact.material.color.copy(U.wavelengthToColor(this.params.lambda));
      }
      this.updateReadout();
    }

    updateReadout() {
      if (!this.readoutCanvas) return;
      const ctx = this.readoutCanvas.getContext('2d');
      const w = 512, h = 256;
      ctx.clearRect(0, 0, w, h);
      const rr = 22;
      ctx.beginPath();
      ctx.moveTo(rr, 0);
      ctx.lineTo(w - rr, 0);
      ctx.quadraticCurveTo(w, 0, w, rr);
      ctx.lineTo(w, h - rr);
      ctx.quadraticCurveTo(w, h, w - rr, h);
      ctx.lineTo(rr, h);
      ctx.quadraticCurveTo(0, h, 0, h - rr);
      ctx.lineTo(0, rr);
      ctx.quadraticCurveTo(0, 0, rr, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(4,12,22,.94)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(94,227,255,.28)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,180,215,.62)';
      ctx.font = '20px "Cascadia Code", monospace';
      ctx.fillText('PHOTOELECTRIC', 24, 34);
      ctx.fillStyle = 'rgba(94,227,255,.92)';
      ctx.font = '25px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillText(this.emission ? '光电子发射中' : '低于截止频率', 24, 72);

      ctx.font = '21px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = 'rgba(200,220,240,.9)';
      ctx.fillText('hν  = ' + this.photonEnergy.toFixed(2) + ' eV', 24, 112);
      ctx.fillText('W   = ' + this.work.toFixed(2) + ' eV', 24, 143);
      ctx.fillStyle = this.emission ? 'rgba(120,255,200,.95)' : 'rgba(255,140,120,.95)';
      ctx.fillText('Eₖ  = ' + this.Kmax.toFixed(2) + ' eV', 24, 174);
      ctx.fillStyle = 'rgba(190,210,235,.85)';
      ctx.fillText('I ≈ ' + this.current.toFixed(0) + ' a.u.', 24, 205);

      // bar
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(300, 190, 180, 8);
      const barW = 180 * U.clamp(this.current / 100, 0, 1);
      const grd = ctx.createLinearGradient(300, 0, 480, 0);
      grd.addColorStop(0, '#5ee3ff');
      grd.addColorStop(1, '#7dffc4');
      ctx.fillStyle = grd;
      ctx.fillRect(300, 190, barW, 8);
      this.readoutTexture.needsUpdate = true;
    }

    onParamsChanged(changed) {
      if (changed.indexOf('voltage') >= 0 && this.electrons) {
        const absU = Math.abs(Math.min(0, this.params.voltage));
        this.electrons.forEach((el) => {
          if (this.Us > 0.001) {
            const v0 = Math.sqrt(el.vx * el.vx + el.vy * el.vy + el.vz * el.vz);
            el.acc = -(Math.min(absU, this.Us * 1.2) / this.Us) * (v0 * v0) / (2 * 1.68);
          }
        });
      }
      this.recompute();
    }

    spawnPhoton() {
      if (!this.photonGeo) return;
      if (this.photons.length > 24) return;
      const mesh = new THREE.Mesh(this.photonGeo, this.photonMat);
      mesh.position.copy(this.lightStart);
      this.scene.add(mesh);
      this.photons.push({
        mesh: mesh,
        t: 0,
        speed: 0.65 + Math.random() * 0.2,
        offset: new THREE.Vector3((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.08)
      });
    }

    spawnElectron() {
      if (!this.emission || this.electrons.length > 55) return;
      const mat = new THREE.SpriteMaterial({
        map: U.radialTexture(0x8ff7ff, 0.95, 0),
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Sprite(mat);
      mesh.scale.setScalar(0.22);
      const y = this.y0 + (Math.random() - 0.5) * 0.55;
      const z = (Math.random() - 0.5) * 0.5;
      mesh.position.set(-0.84, y, z);
      this.scene.add(mesh);
      const v0 = 0.52 + 0.4 * Math.sqrt(Math.max(0.05, this.Kmax / 3));
      const absU = Math.abs(Math.min(0, this.params.voltage));
      let acc = 0;
      if (this.Us > 0.001) {
        acc = -(Math.min(absU, this.Us * 1.2) / this.Us) * (v0 * v0) / (2 * 1.68);
      }
      this.electrons.push({
        mesh: mesh,
        vx: v0,
        vy: (Math.random() - 0.5) * 0.08,
        vz: (Math.random() - 0.5) * 0.08,
        acc: acc,
        life: 0
      });
      // impact flash
      if (this.cathodeImpact) this.cathodeImpact.material.opacity = 0.5;
    }

    onExploded(value) {
      this.explodeTarget = value ? 1 : 0;
    }

    step(dt) {
      const e = 1 - Math.exp(-5 * dt);
      this.explodeAmount += (this.explodeTarget - this.explodeAmount) * e;
      if (this.tubeGroup) {
        this.tubeGroup.position.copy(this.tubeBase).add(new THREE.Vector3(0, this.explodeAmount * 0.72, 0));
        if (this.glass) this.glass.material.opacity = 0.055 * (1 - this.explodeAmount * 0.75);
      }
      if (this.readout) {
        this.readout.position.y = 2.74 + this.explodeAmount * 0.12;
      }

      // photon emission rate scales with intensity
      this.photonTimer -= dt;
      if (this.photonTimer <= 0) {
        this.photonTimer = 0.16 / Math.max(0.05, this.params.intensity / 60);
        this.spawnPhoton();
      }

      const start = this.lightStart;
      const end = this.lightEnd;
      for (let i = this.photons.length - 1; i >= 0; i--) {
        const p = this.photons[i];
        p.t += dt * p.speed;
        if (p.t >= 1) {
          this.scene.remove(p.mesh);
          this.photons.splice(i, 1);
          if (this.emission) this.spawnElectron();
          if (this.cathodeImpact) this.cathodeImpact.material.opacity = 0.55;
          continue;
        }
        const t = p.t;
        p.mesh.position.lerpVectors(start, end, t);
        p.mesh.position.x += Math.sin(t * 14) * 0.012;
        p.mesh.position.y += Math.cos(t * 12) * 0.01;
        const s = 0.8 + Math.sin(t * Math.PI) * 0.8;
        p.mesh.scale.setScalar(s);
      }

      for (let i = this.electrons.length - 1; i >= 0; i--) {
        const el = this.electrons[i];
        el.life += dt;
        el.vx += el.acc * dt;
        el.mesh.position.x += el.vx * dt;
        el.mesh.position.y += el.vy * dt;
        el.mesh.position.z += el.vz * dt;
        if (el.mesh.position.x >= 0.84) {
          this.reachCount++;
          this.scene.remove(el.mesh);
          if (el.mesh.geometry) el.mesh.geometry.dispose();
          el.mesh.material.dispose();
          this.electrons.splice(i, 1);
          continue;
        }
        if (el.mesh.position.x < -0.94 || el.life > 8) {
          this.scene.remove(el.mesh);
          if (el.mesh.geometry) el.mesh.geometry.dispose();
          el.mesh.material.dispose();
          this.electrons.splice(i, 1);
        }
      }

      if (this.reachCount > 0) {
        this.reachWindow += dt;
        if (this.reachWindow > 1) {
          this.reachWindow = 0;
          this.reachCount = Math.max(0, Math.round(this.reachCount * 0.5));
        }
      }

      if (this.cathodeImpact) {
        this.cathodeImpact.material.opacity = Math.max(0.08, this.cathodeImpact.material.opacity - dt * 1.8);
        const s = 0.85 + Math.sin(this.elapsed * 7) * 0.1;
        this.cathodeImpact.scale.setScalar(s);
      }
      if (this.tubeGlow) {
        this.tubeGlow.material.opacity = this.emission ? 0.07 + 0.025 * Math.sin(this.elapsed * 2) : 0.025;
      }
      if (this.fieldLines) {
        const fieldOn = this.params.voltage < -0.01;
        this.fieldLines.forEach((l) => { l.material.opacity = fieldOn ? 0.17 : 0.07; });
      }
    }

    getMetrics() {
      return [
        { label: '光子能量 hν', value: this.photonEnergy.toFixed(2), unit: 'eV' },
        { label: '逸出功 W', value: this.work.toFixed(2), unit: 'eV' },
        { label: '最大初动能', value: this.Kmax.toFixed(2), unit: 'eV' },
        { label: '遏止电压 Uₛ', value: this.Us.toFixed(2), unit: 'V' }
      ];
    }

    getMeasurement() {
      const nu = 299792458 / (this.params.lambda * 1e-9);
      return {
        lambda: this.params.lambda,
        nu: nu / 1e14,
        Us: this.Us,
        current: this.current,
        material: this.params.material
      };
    }
  }

  PL.registerScene('photoelectric', PhotoelectricScene);
})();
