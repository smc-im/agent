/* =========================================================
   Scene 02 — Coriolis effect on a rotating Earth
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;
  const U = PL.util;
  const C = PL.constants;

  const R = 2.05;

  class CoriolisScene extends PL.SceneBase {
    constructor(app, def) {
      super(app, def);
      this.launchLat = def.params.find((p) => p.key === 'lat').default;
      this.simT = 0;
      this.simPhase = 'run';
      this.holdT = 0;
      this.headPos = new THREE.Vector3();
      this.headWorld = new THREE.Vector3();
      this.trailCount = 0;
      this.maxTrail = 900;
      this.scale = 0.006;
      this.simDuration = 14;
    }

    build() {
      this.buildPlatform();
      this.buildStars();
      this.buildEarth();
      this.buildAxis();
      this.buildOrbitRing();
      this.buildTangentPlane();
      this.resetSim();

      this.cameraHome.set(6.5, 5.7, 7.9);
      this.cameraTarget.set(0.1, 2.62, 0.1);
      this.controls.minDistance = 4.2;
      this.controls.maxDistance = 22;
      this.explodeAmount = 0;
      this.explodeTarget = 0;
    }

    buildPlatform() {
      const S = this.scene;
      const floor = new THREE.GridHelper(15, 24, 0x12324f, 0x0b2036);
      floor.position.y = -0.36;
      floor.material.transparent = true;
      floor.material.opacity = 0.18;
      floor.material.depthWrite = false;
      S.add(floor);

      const plate = U.cyl(3.35, 3.55, 0.16, new THREE.MeshStandardMaterial({
        color: 0x07111e,
        roughness: 0.52,
        metalness: 0.38
      }), 72);
      plate.position.y = -0.2;
      plate.receiveShadow = true;
      S.add(plate);

      for (let i = 0; i < 3; i++) {
        const r = 2.55 + i * 0.34;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r, i === 0 ? 0.012 : 0.006, 5, 128),
          new THREE.MeshBasicMaterial({
            color: i === 0 ? 0x3fa9d8 : 0x1d5d88,
            transparent: true,
            opacity: i === 0 ? 0.28 : 0.14,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.1;
        S.add(ring);
      }

      const under = new THREE.PointLight(0x2f9bcf, 0.8, 7.5, 2);
      under.position.set(0, -0.8, 0);
      S.add(under);
    }

    buildStars() {
      const geo = new THREE.BufferGeometry();
      const n = 700;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const r = 16 + Math.random() * 26;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = r * Math.cos(ph) + 3;
        pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x9bd8ff,
        size: 0.035,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        depthWrite: false
      });
      this.scene.add(new THREE.Points(geo, mat));
    }

    drawEarthTexture() {
      return U.makeCanvasTexture(1024, 512, (ctx, w, h) => {
        const ocean = ctx.createLinearGradient(0, 0, 0, h);
        ocean.addColorStop(0, '#0c2a4a');
        ocean.addColorStop(0.32, '#0b3c66');
        ocean.addColorStop(0.55, '#0e4f78');
        ocean.addColorStop(0.8, '#0a3658');
        ocean.addColorStop(1, '#071d33');
        ctx.fillStyle = ocean;
        ctx.fillRect(0, 0, w, h);

        // subtle ocean texture
        for (let i = 0; i < 900; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          ctx.fillStyle = `rgba(90,190,230,${0.012 + Math.random() * 0.022})`;
          ctx.beginPath();
          ctx.arc(x, y, 1 + Math.random() * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        const xy = (lon, lat) => [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
        const drawLand = (points, fill, stroke) => {
          ctx.beginPath();
          points.forEach((p, i) => {
            const q = xy(p[0], p[1]);
            if (i === 0) ctx.moveTo(q[0], q[1]);
            else ctx.lineTo(q[0], q[1]);
          });
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
          if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }
        };

        // North America
        drawLand([[-168, 66], [-150, 71], [-125, 70], [-105, 73], [-80, 63], [-60, 52], [-65, 44], [-75, 25], [-97, 18], [-106, 24], [-118, 33], [-126, 45], [-140, 58]], '#2e5b49', 'rgba(140,205,160,.28)');
        // Greenland
        drawLand([[-52, 60], [-24, 64], [-20, 78], [-38, 83], [-57, 76], [-62, 66]], '#c8e8ec', 'rgba(220,250,255,.4)');
        // South America
        drawLand([[-81, 12], [-61, 11], [-45, 0], [-36, -18], [-48, -45], [-63, -55], [-74, -48], [-78, -26], [-82, -6]], '#346b4a', 'rgba(140,205,160,.28)');
        // Africa
        drawLand([[-17, 36], [7, 37], [32, 32], [43, 12], [36, -3], [40, -22], [24, -35], [12, -27], [4, -8], [-8, 5], [-17, 16]], '#47704b', 'rgba(170,220,150,.25)');
        // Europe + Asia
        drawLand([[-10, 36], [15, 42], [32, 41], [45, 47], [68, 55], [100, 56], [128, 52], [145, 60], [168, 58], [158, 45], [140, 35], [122, 25], [112, 8], [97, 6], [90, 22], [73, 24], [58, 27], [47, 35], [30, 37], [17, 36]], '#3c684d', 'rgba(160,215,155,.25)');
        // India
        drawLand([[68, 24], [88, 25], [90, 9], [78, 7], [73, 17]], '#4b754d', null);
        // Australia
        drawLand([[112, -11], [132, -10], [151, -22], [153, -35], [140, -40], [120, -34], [113, -24]], '#72694b', 'rgba(220,200,150,.2)');
        // Antarctica
        ctx.fillStyle = '#d5edf2';
        ctx.fillRect(0, h - 16, w, 18);
        // Arctic ice
        const arctic = ctx.createLinearGradient(0, 0, 0, 48);
        arctic.addColorStop(0, 'rgba(220,244,250,.92)');
        arctic.addColorStop(1, 'rgba(220,244,250,0)');
        ctx.fillStyle = arctic;
        ctx.fillRect(0, 0, w, 48);

        // graticule
        ctx.strokeStyle = 'rgba(160,225,255,.12)';
        ctx.lineWidth = 1;
        for (let lat = -60; lat <= 60; lat += 30) {
          const y = ((90 - lat) / 180) * h;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        for (let lon = -180; lon <= 180; lon += 30) {
          const x = ((lon + 180) / 360) * w;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(190,240,255,.2)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        // cloud streaks
        for (let i = 0; i < 26; i++) {
          const x = Math.random() * w;
          const y = 50 + Math.random() * (h - 100);
          const rw = 25 + Math.random() * 90;
          const rh = 4 + Math.random() * 10;
          ctx.fillStyle = `rgba(235,250,255,${0.025 + Math.random() * 0.05})`;
          ctx.beginPath();
          ctx.ellipse(x, y, rw, rh, Math.random() * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    buildEarth() {
      this.tiltGroup = new THREE.Group();
      this.tiltGroup.position.set(0, 2.45, 0);
      this.tiltGroup.rotation.z = -23.5 * U.deg;
      this.scene.add(this.tiltGroup);

      this.earthGroup = new THREE.Group();
      this.tiltGroup.add(this.earthGroup);

      const tex = this.drawEarthTexture();
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.78,
        metalness: 0.12,
        emissive: 0x061a2a,
        emissiveIntensity: 0.9
      });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), mat);
      earth.castShadow = true;
      earth.receiveShadow = true;
      this.earthGroup.add(earth);
      this.earthMesh = earth;

      // atmosphere rim
      const atmoMat = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(0x4ecbff) },
          intensity: { value: 0.82 }
        },
        vertexShader: [
          'varying vec3 vNormal;',
          'void main() {',
          '  vNormal = normalize(normalMatrix * normal);',
          '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
          '}'
        ].join('\n'),
        fragmentShader: [
          'uniform vec3 glowColor;',
          'uniform float intensity;',
          'varying vec3 vNormal;',
          'void main() {',
          '  float rim = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);',
          '  gl_FragColor = vec4(glowColor, clamp(rim, 0.0, 1.0) * intensity);',
          '}'
        ].join('\n'),
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
      });
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.055, 64, 40), atmoMat);
      this.earthGroup.add(atmo);

      // inner glow
      const inner = U.glow(0x3fc7ff, 7.4, 0.1);
      inner.position.set(-0.4, 0.1, -0.4);
      this.tiltGroup.add(inner);

      // equator ring, thin and luminous
      const eq = new THREE.Mesh(
        new THREE.TorusGeometry(R + 0.012, 0.009, 6, 160),
        new THREE.MeshBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      eq.rotation.x = Math.PI / 2;
      this.earthGroup.add(eq);

      // equator anchor
      const eqAnchor = new THREE.Object3D();
      eqAnchor.position.set(R + 0.02, 0, 0);
      this.earthGroup.add(eqAnchor);
      this.eqAnchor = eqAnchor;

      // soft base light
      const under = new THREE.PointLight(0x2b8bc4, 1.0, 8, 2);
      under.position.set(0, -2.6, 0);
      this.tiltGroup.add(under);
    }

    buildAxis() {
      const axisGroup = new THREE.Group();
      axisGroup.position.set(0, 0, 0);
      const axis = U.cyl(0.012, 0.012, 6.2, new THREE.MeshBasicMaterial({ color: 0x9deeff, transparent: true, opacity: 0.55 }), 12);
      axis.position.y = 0;
      axisGroup.add(axis);
      const north = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.32, 16),
        new THREE.MeshBasicMaterial({ color: 0x9deeff, transparent: true, opacity: 0.85 })
      );
      north.position.y = 3.15;
      axisGroup.add(north);
      const south = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.24, 16),
        new THREE.MeshBasicMaterial({ color: 0x577d9c, transparent: true, opacity: 0.55 })
      );
      south.position.y = -3.15;
      south.rotation.z = Math.PI;
      axisGroup.add(south);

      // rotation direction ring near north pole
      const spin = new THREE.Group();
      spin.position.y = 2.72;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.008, 5, 72),
        new THREE.MeshBasicMaterial({ color: 0x5ee3ff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2;
      spin.add(ring);
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.16, 8),
        new THREE.MeshBasicMaterial({ color: 0x8df0ff })
      );
      arrow.position.set(0.58, 0.52, 0);
      arrow.rotation.z = -Math.PI / 2;
      spin.add(arrow);
      this.spinArrow = arrow;
      axisGroup.add(spin);

      this.tiltGroup.add(axisGroup);
      this.axisGroup = axisGroup;
      this.northAnchor = north;
    }

    buildOrbitRing() {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(R * 1.32, 0.006, 4, 160),
        new THREE.MeshBasicMaterial({ color: 0x5bc8ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.45;
      this.scene.add(ring);
      this.orbitRing = ring;

      for (let i = 0; i < 4; i++) {
        const dot = U.glow(0x6bdcff, 0.28, 0.55);
        dot.position.set(Math.cos(i * Math.PI / 2) * R * 1.32, 2.45, Math.sin(i * Math.PI / 2) * R * 1.32);
        this.scene.add(dot);
      }
    }

    latLonUp(lat, lon) {
      const phi = lat * U.deg;
      const theta = lon * U.deg;
      return new THREE.Vector3(
        Math.cos(phi) * Math.sin(theta),
        Math.sin(phi),
        Math.cos(phi) * Math.cos(theta)
      );
    }

    makeBasis(lat, lon) {
      const up = this.latLonUp(lat, lon).normalize();
      const east = new THREE.Vector3(0, 1, 0).cross(up).normalize();
      // for near-pole fallback
      if (east.lengthSq() < 0.01) east.set(1, 0, 0);
      const north = up.clone().cross(east).normalize();
      return { up: up, east: east, north: north };
    }

    buildTangentPlane() {
      if (this.planeGroup) {
        this.earthGroup.remove(this.planeGroup);
        U.disposeObject(this.planeGroup);
        this.planeGroup = null;
        this.predicted = null;
        this.predictionDots = null;
      }
      this.clearLabels();

      const lat = this.params.lat;
      const lon = 8;
      const basis = this.makeBasis(lat, lon);
      this.basis = basis;
      this.up = basis.up;
      this.east = basis.east;
      this.north = basis.north;
      this.launchLocal = basis.up.clone().multiplyScalar(R + 0.60);

      const group = new THREE.Group();
      group.position.copy(this.launchLocal);
      const m = new THREE.Matrix4().makeBasis(basis.east, basis.north, basis.up);
      group.quaternion.setFromRotationMatrix(m);
      this.earthGroup.add(group);
      this.planeGroup = group;

      // surface launch marker + visual stalk to the schematic tangent plane
      if (this.surfaceExtras) {
        this.earthGroup.remove(this.surfaceExtras);
        U.disposeObject(this.surfaceExtras);
      }
      const extras = new THREE.Group();
      const surfacePoint = basis.up.clone().multiplyScalar(R + 0.02);
      const anchor = new THREE.Object3D();
      anchor.position.copy(surfacePoint);
      extras.add(anchor);
      this.launchAnchor = anchor;
      const surfaceGlow = U.glow(0xffc46b, 0.34, 0.8);
      surfaceGlow.position.copy(surfacePoint);
      extras.add(surfaceGlow);
      const stalk = U.line([surfacePoint, this.launchLocal], 0xffc46b, 0.35);
      extras.add(stalk);
      this.earthGroup.add(extras);
      this.surfaceExtras = extras;

      // translucent tangent disk
      const disk = new THREE.Mesh(
        new THREE.CircleGeometry(1.08, 72),
        new THREE.MeshBasicMaterial({ color: 0x06202f, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
      );
      disk.position.z = 0.002;
      disk.renderOrder = 0;
      group.add(disk);

      // local grid
      const gridPts = [];
      for (let i = -3; i <= 3; i++) {
        const v = i * 0.32;
        gridPts.push(new THREE.Vector3(v, -1.04, 0.012), new THREE.Vector3(v, 1.04, 0.012));
        gridPts.push(new THREE.Vector3(-1.04, v, 0.012), new THREE.Vector3(1.04, v, 0.012));
      }
      const grid = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(gridPts),
        new THREE.LineBasicMaterial({ color: 0x67bce8, transparent: true, opacity: 0.56, depthWrite: false })
      );
      group.add(grid);
      grid.renderOrder = 1;

      const border = new THREE.Mesh(
        new THREE.RingGeometry(1.04, 1.08, 96),
        new THREE.MeshBasicMaterial({ color: 0x6fdcff, transparent: true, opacity: 0.44, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      group.add(border);
      border.renderOrder = 2;

      // east / north direction marks
      const eastArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.72, -0.95, 0.02), 0.34, 0x63e6b0, 0.09, 0.05);
      const northArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.95, 0.72, 0.02), 0.34, 0xffc46b, 0.09, 0.05);
      group.add(eastArrow, northArrow);

      // launch pad
      const pad = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.014, 8, 40),
        new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      pad.position.z = 0.02;
      group.add(pad);
      const padGlow = U.glow(0xffc46b, 0.45, 0.55);
      padGlow.position.z = 0.04;
      group.add(padGlow);

      // trajectory line
      const trailGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(this.maxTrail * 3);
      trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      trailGeo.setDrawRange(0, 0);
      const trailMat = new THREE.LineBasicMaterial({ color: 0x67f0d0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
      const trail = new THREE.Line(trailGeo, trailMat);
      trail.position.z = 0.035;
      trail.renderOrder = 6;
      group.add(trail);
      this.trail = trail;
      this.trailPositions = positions;

      // no-deflection dashed path
      const dashedGeo = new THREE.BufferGeometry();
      const dashedPositions = new Float32Array(6);
      dashedGeo.setAttribute('position', new THREE.BufferAttribute(dashedPositions, 3));
      const dashed = new THREE.Line(dashedGeo, new THREE.LineDashedMaterial({ color: 0x89a6c9, transparent: true, opacity: 0.42, dashSize: 0.1, gapSize: 0.09 }));
      dashed.position.z = 0.028;
      dashed.renderOrder = 3;
      group.add(dashed);
      this.dashedPath = dashed;
      this.dashedPositions = dashedPositions;

      // faint predicted curved trajectory, visible immediately
      this.predicted = null;

      // moving object
      const head = new THREE.Group();
      const ball = U.sphere(0.055, new THREE.MeshBasicMaterial({ color: 0xffdf9e }), 20);
      head.add(ball);
      const headGlow = U.glow(0xffc46b, 0.52, 0.95);
      head.add(headGlow);
      head.position.z = 0.045;
      head.renderOrder = 8;
      group.add(head);
      this.head = head;

      // velocity & coriolis arrows
      const velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.34, 0x63e6b0, 0.09, 0.055);
      const corArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.26, 0xffc46b, 0.085, 0.05);
      velArrow.position.z = 0.06;
      corArrow.position.z = 0.065;
      group.add(velArrow, corArrow);
      this.velArrow = velArrow;
      this.corArrow = corArrow;

      this.headLocal = new THREE.Vector3(0, 0, 0.05);
      this.headWorld = new THREE.Vector3();
      this.updateHeadWorld();

      this.buildLabels();
      this.resetSim();
    }

    clearLabels() {
      this.labels.forEach((rec) => {
        if (rec.el && rec.el.parentNode) rec.el.parentNode.removeChild(rec.el);
      });
      this.labels = [];
    }

    buildLabels() {
      if (!this.planeGroup) return;
      const planePoint = (x, y, z) => {
        const p = new THREE.Vector3(x, y, z);
        this.planeGroup.localToWorld(p);
        return p;
      };
      this.addLabel('地球自转轴', () => this.northAnchor.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.55, 0)), { accent: 'cyan', key: 'axis', dx: 14, dy: -8 });
      this.addLabel('赤道 · φ = 0°', () => this.eqAnchor.getWorldPosition(new THREE.Vector3()), { accent: 'green', key: 'axis', dx: -12, dy: 6 });
      this.addLabel('局地切线平面', () => planePoint(1.05, 0.98, 0.05), { accent: 'violet', key: 'plane', dx: 20, dy: -10 });
      this.addLabel('发射点', () => this.launchAnchor.getWorldPosition(new THREE.Vector3()), { accent: 'amber', key: 'launch', dx: -58, dy: 26 });
      this.addLabel('偏转轨迹', () => this.headWorld.clone(), { accent: 'green', key: 'trail', dx: 56, dy: -34 });
      this.addLabel('科里奥利力', () => planePoint(0.38, -0.58, 0.08), { accent: 'amber', key: 'force', dx: 24, dy: 18 });
    }

    updateHeadWorld() {
      if (!this.planeGroup || !this.head) return;
      this.head.getWorldPosition(this.headWorld);
    }

    onParamsChanged(changed) {
      if (changed.indexOf('lat') >= 0) {
        this.explodeAmount = 0;
        this.explodeTarget = 0;
        this.buildTangentPlane();
      } else {
        this.resetSim();
      }
    }

    resetSim() {
      this.simT = 0;
      this.simAcc = 0;
      this.simPhase = 'run';
      this.holdT = 0;
      this.trailCount = 0;
      if (this.trail) {
        this.trail.geometry.setDrawRange(0, 0);
        this.trail.geometry.attributes.position.needsUpdate = true;
      }
      this.speed = this.params.speed;
      this.gain = this.params.gain;
      this.az = this.params.azimuth * U.deg;
      this.u0 = this.speed * Math.sin(this.az);
      this.v0 = this.speed * Math.cos(this.az);
      this.u = this.u0;
      this.v = this.v0;
      this.E = 0;
      this.N = 0;
      this.c = 2 * C.omegaEarth * Math.sin(this.params.lat * U.deg) * this.gain;
      this.scale = 0.96 / Math.max(30, this.speed * this.simDuration);
      if (this.head) {
        this.head.position.set(0, 0, 0.045);
        this.headLocal.set(0, 0, 0.045);
      }
      if (this.dashedPositions) {
        const dx = this.u0 * this.simDuration * this.scale;
        const dy = this.v0 * this.simDuration * this.scale;
        this.dashedPositions[0] = 0; this.dashedPositions[1] = 0; this.dashedPositions[2] = 0.028;
        this.dashedPositions[3] = dx; this.dashedPositions[4] = dy; this.dashedPositions[5] = 0.028;
        this.dashedPath.geometry.attributes.position.needsUpdate = true;
        this.dashedPath.computeLineDistances();
      }
      if (this.velArrow) {
        this.velArrow.position.set(0, 0, 0.06);
        this.velArrow.setDirection(new THREE.Vector3(this.u0, this.v0, 0).normalize());
      }
      if (this.corArrow) {
        this.corArrow.position.set(0, 0, 0.065);
        this.corArrow.visible = Math.abs(this.c) > 1e-7;
        this.corArrow.setDirection(new THREE.Vector3(0, 1, 0));
      }
      this.updateHeadWorld();
      this.buildPrediction();
    }

    buildPrediction() {
      if (!this.planeGroup) return;
      if (this.predicted) {
        this.planeGroup.remove(this.predicted);
        this.predicted.geometry.dispose();
        this.predicted.material.dispose();
        this.predicted = null;
      }
      if (this.predictionDots) {
        this.planeGroup.remove(this.predictionDots);
        this.predictionDots.geometry.dispose();
        this.predictionDots.material.dispose();
        this.predictionDots = null;
      }
      const T = this.simDuration;
      const h = 0.04;
      let E = 0, N = 0, u = this.u0, v = this.v0, t = 0;
      const pts = [new THREE.Vector3(0, 0, 0.026)];
      while (t < T) {
        const k1u = this.c * v, k1v = -this.c * u;
        const k2u = this.c * (v + h * 0.5 * k1v), k2v = -this.c * (u + h * 0.5 * k1u);
        const k3u = this.c * (v + h * 0.5 * k2v), k3v = -this.c * (u + h * 0.5 * k2u);
        const k4u = this.c * (v + h * k3v), k4v = -this.c * (u + h * k3u);
        u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
        v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
        E += u * h;
        N += v * h;
        pts.push(new THREE.Vector3(E * this.scale, N * this.scale, 0.026));
        t += h;
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
        color: 0x70f2d5,
        transparent: true,
        opacity: 0.72,
        dashSize: 0.05,
        gapSize: 0.04,
        depthWrite: false
      }));
      line.computeLineDistances();
      line.renderOrder = 5;
      this.planeGroup.add(line);
      this.predicted = line;

      const dotPts = [];
      for (let i = 4; i < pts.length; i += 12) dotPts.push(pts[i].clone());
      const dotGeo = new THREE.BufferGeometry().setFromPoints(dotPts);
      const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({
        color: 0x8effe3,
        size: 0.06,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      }));
      dots.renderOrder = 6;
      this.planeGroup.add(dots);
      this.predictionDots = dots;
    }

    step(dt) {
      // explosion offset
      const k = 1 - Math.exp(-5 * dt);
      this.explodeAmount += (this.explodeTarget - this.explodeAmount) * k;
      if (this.planeGroup) {
        this.planeGroup.position.copy(this.up).multiplyScalar(R + 0.60 + this.explodeAmount * 0.62);
      }

      if (this.spinArrow) {
        const a = this.elapsed * 0.8;
        this.spinArrow.position.set(Math.cos(a) * 0.58, this.spinArrow.position.y, Math.sin(a) * 0.58);
        this.spinArrow.rotation.y = -a;
      }
      if (this.orbitRing) this.orbitRing.rotation.z += dt * 0.02;

      if (this.simPhase === 'run') {
        const h = 0.02;
        this.simAcc = Math.min(0.5, (this.simAcc || 0) + dt * 2.2);
        let guard = 0;
        while (this.simAcc >= h && guard < 80) {
          // RK4 for u' = c v, v' = -c u
          const u = this.u, v = this.v;
          const k1u = this.c * v, k1v = -this.c * u;
          const k2u = this.c * (v + h * 0.5 * k1v), k2v = -this.c * (u + h * 0.5 * k1u);
          const k3u = this.c * (v + h * 0.5 * k2v), k3v = -this.c * (u + h * 0.5 * k2u);
          const k4u = this.c * (v + h * k3v), k4v = -this.c * (u + h * k3u);
          this.u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
          this.v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
          this.E += this.u * h;
          this.N += this.v * h;
          this.simT += h;
          this.simAcc -= h;
          guard++;
        }

        const x = this.E * this.scale;
        const y = this.N * this.scale;
        if (this.head) this.head.position.set(x, y, 0.045);
        this.headLocal.set(x, y, 0.045);
        this.pushTrail(x, y);
        this.updateHeadWorld();

        if (this.velArrow) {
          this.velArrow.position.set(x, y, 0.06);
          this.velArrow.setDirection(new THREE.Vector3(this.u, this.v, 0).normalize());
        }
        if (this.corArrow) {
          const ax = this.c * this.v;
          const ay = -this.c * this.u;
          const len = Math.hypot(ax, ay);
          this.corArrow.position.set(x, y, 0.065);
          this.corArrow.visible = len > 1e-7;
          if (len > 1e-7) {
            this.corArrow.setDirection(new THREE.Vector3(ax / len, ay / len, 0));
            const stretch = U.clamp(len / 4, 0.8, 2.1);
            this.corArrow.setLength(0.24 * stretch, 0.085, 0.05);
          }
        }

        if (this.simT >= this.simDuration) {
          this.simPhase = 'hold';
          this.holdT = 0;
        }
      } else {
        this.holdT += dt;
        if (this.holdT > 2.2) this.resetSim();
      }
      this.updateHeadWorld();
    }

    pushTrail(x, y) {
      if (!this.trail) return;
      const count = this.trailCount;
      if (count >= this.maxTrail) return;
      const p = this.trailPositions;
      p[count * 3] = x;
      p[count * 3 + 1] = y;
      p[count * 3 + 2] = 0.035;
      this.trailCount++;
      this.trail.geometry.setDrawRange(0, this.trailCount);
      this.trail.geometry.attributes.position.needsUpdate = true;
    }

    onExploded(value) {
      this.explodeTarget = value ? 1 : 0;
    }

    getMetrics() {
      const phi = this.params.lat * U.deg;
      const f = 2 * C.omegaEarth * Math.sin(phi);
      const a = Math.abs(f * this.speed);
      const realDef = 0.5 * a * this.simDuration * this.simDuration * 100;
      const t = Math.min(this.simT, this.simDuration);
      const simDef = Math.hypot(this.E - this.u0 * t, this.N - this.v0 * t);
      return [
        { label: '科里奥利参数 f', value: f.toExponential(2), unit: 's⁻¹' },
        { label: '横向加速度', value: a.toExponential(2), unit: 'm/s²' },
        { label: '真实横向偏转', value: realDef.toFixed(1), unit: 'cm / 14s' },
        { label: '模拟偏转距离', value: simDef.toFixed(1), unit: 'm' }
      ];
    }
  }

  PL.registerScene('coriolis', CoriolisScene);
})();

