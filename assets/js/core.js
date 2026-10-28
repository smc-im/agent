/* =========================================================
   PHYS·LAB core — Three.js scene base + shared helpers
   ========================================================= */
(function () {
  'use strict';

  const PL = (window.PhysLab = window.PhysLab || {});
  PL.scenes = PL.scenes || {};

  const TMP_V = new THREE.Vector3();
  const TMP_V2 = new THREE.Vector3();

  const util = (PL.util = {
    clamp(v, min, max) { return Math.min(max, Math.max(min, v)); },
    lerp(a, b, t) { return a + (b - a) * t; },
    damp(current, target, lambda, dt) { return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt)); },
    sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); },
    deg: Math.PI / 180,

    vec(x, y, z) { return new THREE.Vector3(x, y, z); },

    makeCanvasTexture(w, h, draw, opts) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      draw(ctx, w, h);
      const texture = new THREE.CanvasTexture(canvas);
      texture.encoding = THREE.sRGBEncoding;
      texture.anisotropy = 4;
      if (opts && opts.wrap) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
      texture.needsUpdate = true;
      return texture;
    },

    radialTexture(color, innerAlpha, outerAlpha) {
      const key = color + '|' + innerAlpha + '|' + outerAlpha;
      util._radial = util._radial || {};
      if (util._radial[key]) return util._radial[key];
      const tex = util.makeCanvasTexture(128, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        const c = new THREE.Color(color);
        g.addColorStop(0, `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${innerAlpha})`);
        g.addColorStop(0.35, `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${innerAlpha * 0.55})`);
        g.addColorStop(1, `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${outerAlpha})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.userData = tex.userData || {};
      tex.userData.shared = true;
      util._radial[key] = tex;
      return tex;
    },

    glow(color, size, opacity) {
      const material = new THREE.SpriteMaterial({
        map: util.radialTexture(color, 0.85, 0),
        color: 0xffffff,
        transparent: true,
        opacity: opacity == null ? 0.7 : opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.setScalar(size);
      return sprite;
    },

    standard(color, roughness, metalness, extra) {
      return new THREE.MeshStandardMaterial(Object.assign({
        color: color,
        roughness: roughness == null ? 0.45 : roughness,
        metalness: metalness == null ? 0.2 : metalness
      }, extra || {}));
    },

    metal(color, roughness) {
      return new THREE.MeshStandardMaterial({
        color: color == null ? 0x8da1b8 : color,
        roughness: roughness == null ? 0.28 : roughness,
        metalness: 0.88
      });
    },

    glass(color, opacity) {
      return new THREE.MeshPhysicalMaterial({
        color: color == null ? 0x8fe8ff : color,
        metalness: 0,
        roughness: 0.08,
        transparent: true,
        opacity: opacity == null ? 0.18 : opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        clearcoat: 1,
        clearcoatRoughness: 0.1
      });
    },

    box(w, h, d, material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    },

    cyl(radiusTop, radiusBottom, height, material, segments) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments || 32), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    },

    sphere(radius, material, segments) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments || 32, segments ? Math.max(8, segments / 2) : 20), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    },

    beam(a, b, color, opacity, radius) {
      const start = new THREE.Vector3(a.x, a.y, a.z);
      const end = new THREE.Vector3(b.x, b.y, b.z);
      const dir = end.clone().sub(start);
      const length = dir.length();
      const group = new THREE.Group();
      const r = radius == null ? 0.012 : radius;
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity == null ? 0.55 : opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 8), mat);
      core.position.copy(start).add(end).multiplyScalar(0.5);
      core.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      group.add(core);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: (opacity == null ? 0.55 : opacity) * 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const halo = new THREE.Mesh(new THREE.CylinderGeometry(r * 4.5, r * 4.5, length, 10), glowMat);
      halo.position.copy(core.position);
      halo.quaternion.copy(core.quaternion);
      group.add(halo);
      return group;
    },

    line(points, color, opacity, dashed) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = dashed
        ? new THREE.LineDashedMaterial({ color: color, transparent: true, opacity: opacity == null ? 0.6 : opacity, dashSize: 0.1, gapSize: 0.08 })
        : new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity == null ? 0.6 : opacity });
      const line = new THREE.Line(geometry, material);
      if (dashed) line.computeLineDistances();
      return line;
    },

    arc(radius, startAngle, endAngle, segments, color, opacity) {
      const pts = [];
      const n = segments || 48;
      for (let i = 0; i <= n; i++) {
        const a = startAngle + (endAngle - startAngle) * (i / n);
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      return util.line(pts, color, opacity == null ? 0.5 : opacity, false);
    },

    ring(inner, outer, material, segments) {
      const geo = new THREE.RingGeometry(inner, outer, segments || 64);
      const mesh = new THREE.Mesh(geo, material);
      mesh.receiveShadow = true;
      return mesh;
    },

    disposeObject(root) {
      root.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            Object.keys(m).forEach((k) => {
              if (m[k] && m[k].isTexture && !(m[k].userData && m[k].userData.shared)) m[k].dispose();
            });
            if (m.map && !(m.map.userData && m.map.userData.shared)) m.map.dispose();
            m.dispose();
          });
        }
      });
    },

    wavelengthToCss(nm, alpha) {
      let r = 0, g = 0, b = 0;
      if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
      else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
      else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
      else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
      else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
      else if (nm <= 780) { r = 1; }
      else { r = 0.7; g = 0.7; b = 0.7; }
      let factor = 1;
      if (nm > 700) factor = 0.3 + 0.7 * (780 - nm) / 80;
      if (nm < 420) factor = 0.3 + 0.7 * (nm - 380) / 40;
      const gamma = 0.85;
      const R = Math.round(255 * Math.pow(Math.max(0, r) * factor, gamma));
      const G = Math.round(255 * Math.pow(Math.max(0, g) * factor, gamma));
      const B = Math.round(255 * Math.pow(Math.max(0, b) * factor, gamma));
      return alpha == null ? `rgb(${R},${G},${B})` : `rgba(${R},${G},${B},${alpha})`;
    },

    wavelengthToColor(nm) {
      const css = util.wavelengthToCss(nm);
      const m = css.match(/\d+/g);
      return new THREE.Color(parseInt(m[0], 10) / 255, parseInt(m[1], 10) / 255, parseInt(m[2], 10) / 255);
    },

    addTable(scene, w, d, opts) {
      opts = opts || {};
      const group = new THREE.Group();
      const topY = opts.y == null ? 0 : opts.y;
      const slab = util.box(w, 0.2, d, new THREE.MeshStandardMaterial({
        color: 0x010309,
        roughness: 0.56,
        metalness: 0.3
      }));
      slab.position.y = topY - 0.1;
      group.add(slab);

      const surface = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.985, d * 0.985),
        new THREE.MeshStandardMaterial({ color: 0x01040a, roughness: 0.88, metalness: 0.02 })
      );
      surface.rotation.x = -Math.PI / 2;
      surface.position.y = topY + 0.002;
      surface.receiveShadow = true;
      group.add(surface);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.2, d)),
        new THREE.LineBasicMaterial({ color: 0x2b4c73, transparent: true, opacity: 0.5 })
      );
      edges.position.y = topY - 0.1;
      group.add(edges);

      const grid = new THREE.GridHelper(Math.max(w, d) * 0.94, Math.round(Math.max(w, d) * 3), 0x1b3a5c, 0x102a46);
      grid.position.y = topY + 0.012;
      grid.scale.z = d / Math.max(w, d);
      grid.material.transparent = true;
      grid.material.opacity = 0.2;
      grid.material.depthWrite = false;
      group.add(grid);

      const under = new THREE.PointLight(0x1d6b9e, 0.28, Math.max(w, d) * 1.5, 2);
      under.position.set(0, topY - 0.5, 0);
      group.add(under);
      scene.add(group);
      return { group: group, topY: topY, width: w, depth: d };
    },

    addBackdrop(scene, opts) {
      opts = opts || {};
      const geo = new THREE.PlaneGeometry(40, 24);
      const mat = new THREE.MeshBasicMaterial({
        color: opts.color == null ? 0x08111f : opts.color,
        transparent: true,
        opacity: opts.opacity == null ? 0.25 : opts.opacity,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 7, -14);
      scene.add(mesh);
      return mesh;
    },

    makeGlowRing(radius, color, opacity) {
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity == null ? 0.5 : opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.94, radius, 64), mat);
      return ring;
    },

    formatNumber(v, digits) {
      if (!isFinite(v)) return '—';
      return Number(v).toFixed(digits == null ? 2 : digits);
    }
  });

  /* ---------------------------------------------------------
     Base scene
     --------------------------------------------------------- */
  class SceneBase {
    constructor(app, def) {
      this.app = app;
      this.def = def;
      this.id = def.id;
      this.params = {};
      (def.params || []).forEach((p) => { this.params[p.key] = p.default; });
      this.labels = [];
      this.exploded = false;
      this.elapsed = 0;
      this._disposed = false;
      this._raf = 0;
      this._resizeObserver = null;
      this.cameraHome = new THREE.Vector3(6, 4.4, 7);
      this.cameraTarget = new THREE.Vector3(0, 0.9, 0);
    }

    init() {
      const el = this.app.viewerEl;
      this.width = Math.max(1, el.clientWidth);
      this.height = Math.max(1, el.clientHeight);

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x050a14, 0.023);

      this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.05, 120);
      this.camera.position.copy(this.cameraHome);

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(this.width, this.height, false);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.domElement.setAttribute('aria-hidden', 'true');
      el.appendChild(this.renderer.domElement);

      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.07;
      this.controls.rotateSpeed = 0.56;
      this.controls.zoomSpeed = 0.72;
      this.controls.panSpeed = 0.5;
      this.controls.minDistance = 2.2;
      this.controls.maxDistance = 28;
      this.controls.maxPolarAngle = Math.PI * 0.495;
      this.controls.minPolarAngle = Math.PI * 0.055;
      this.controls.target.copy(this.cameraTarget);
      this.controls.autoRotateSpeed = 0.55;

      this.setupLights();

      try {
        this.build();
      } catch (err) {
        console.error('[PHYS·LAB] scene build failed', err);
        throw err;
      }

      this.camera.position.copy(this.cameraHome);
      this.controls.target.copy(this.cameraTarget);
      this.controls.update();

      this._resize = this.resize.bind(this);
      this._resizeObserver = new ResizeObserver(this._resize);
      this._resizeObserver.observe(el);
      window.addEventListener('resize', this._resize);

      this._tick = this.tick.bind(this);
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick);
    }

    setupLights() {
      const hemi = new THREE.HemisphereLight(0xa8d8ff, 0x08111f, 0.5);
      this.scene.add(hemi);

      const key = new THREE.DirectionalLight(0xe9f5ff, 1.0);
      key.position.set(6, 10, 7);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 35;
      key.shadow.camera.left = -9;
      key.shadow.camera.right = 9;
      key.shadow.camera.top = 9;
      key.shadow.camera.bottom = -9;
      key.shadow.bias = -0.0007;
      key.shadow.normalBias = 0.025;
      this.scene.add(key);

      const fill = new THREE.DirectionalLight(0x517bff, 0.48);
      fill.position.set(-7, 5, 3);
      this.scene.add(fill);

      const rim = new THREE.PointLight(0x67e8ff, 1.1, 18, 2);
      rim.position.set(-3, 5.5, -5);
      this.scene.add(rim);

      const warm = new THREE.PointLight(0xffbd7a, 0.55, 14, 2);
      warm.position.set(5, 3.5, 5);
      this.scene.add(warm);
    }

    build() {}

    tick(dt, elapsed) {}

    resetCamera() {
      if (!this.camera || !this.controls) return;
      this.camera.position.copy(this.cameraHome);
      this.controls.target.copy(this.cameraTarget);
      this.controls.update();
    }

    resize() {
      if (this._disposed) return;
      const w = Math.max(1, this.app.viewerEl.clientWidth);
      const h = Math.max(1, this.app.viewerEl.clientHeight);
      if (w === this.width && h === this.height) return;
      this.width = w;
      this.height = h;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }

    tick(now) {
      if (this._disposed) return;
      const t = performance.now();
      let dt = (t - this._last) / 1000;
      this._last = t;
      if (dt > 0.08) dt = 0.08;
      this.elapsed += dt;

      if (this.controls) this.controls.update();
      try {
        this.step(dt, this.elapsed);
      } catch (err) {
        console.error('[PHYS·LAB] scene step failed', err);
      }
      this.renderer.render(this.scene, this.camera);
      this.updateLabels();
      this._raf = requestAnimationFrame(this._tick);
    }

    step(dt, elapsed) {}

    setParams(next) {
      const changed = [];
      Object.keys(next || {}).forEach((key) => {
        if (!(key in this.params)) return;
        const value = next[key];
        if (value !== this.params[key]) {
          this.params[key] = value;
          changed.push(key);
        }
      });
      if (changed.length && !this._disposed) {
        this.onParamsChanged(changed);
      }
    }

    setParam(key, value) {
      this.setParams({ [key]: value });
    }

    resetParams() {
      const next = {};
      (this.def.params || []).forEach((p) => { next[p.key] = p.default; });
      this.setParams(next);
      return next;
    }

    setExploded(value) {
      if (this.exploded === value) return;
      this.exploded = value;
      if (typeof this.onExploded === 'function') this.onExploded(value);
    }

    onParamsChanged(changed) {}
    onExploded(value) {}

    getMetrics() { return []; }

    addLabel(text, anchor, opts) {
      opts = opts || {};
      const el = document.createElement(opts.clickable === false ? 'div' : 'button');
      if (el.tagName === 'BUTTON') el.type = 'button';
      el.className = 'lab' + (opts.accent ? ' accent-' + opts.accent : '') + (opts.key ? ' clickable' : '');
      el.innerHTML = '<span class="lab-icon"></span><span class="lab-text"></span>';
      el.querySelector('.lab-text').textContent = text;
      if (opts.key) {
        el.addEventListener('click', () => {
          if (this.app && typeof this.app.onAnnotation === 'function') {
            this.app.onAnnotation(this.id, opts.key, text);
          }
        });
      }
      this.app.labelLayer.appendChild(el);
      const rec = {
        el: el,
        anchor: anchor,
        key: opts.key || null,
        dx: opts.dx || 0,
        dy: opts.dy || 0,
        visible: false
      };
      this.labels.push(rec);
      return rec;
    }

    updateLabels() {
      if (!this.camera || !this.renderer) return;
      const w = this.width;
      const h = this.height;
      const tmp = new THREE.Vector3();
      for (let i = 0; i < this.labels.length; i++) {
        const rec = this.labels[i];
        if (typeof rec.anchor === 'function') {
          const p = rec.anchor(tmp);
          if (p) tmp.copy(p);
        } else if (rec.anchor && rec.anchor.isObject3D) {
          rec.anchor.getWorldPosition(tmp);
        } else if (rec.anchor) {
          tmp.copy(rec.anchor);
        }
        tmp.project(this.camera);
        const visible = tmp.z > -1 && tmp.z < 1 && tmp.x > -1.25 && tmp.x < 1.25 && tmp.y > -1.2 && tmp.y < 1.2;
        if (visible) {
          const x = (tmp.x * 0.5 + 0.5) * w;
          const y = (-tmp.y * 0.5 + 0.5) * h;
          rec.el.style.transform = `translate(-50%, calc(-100% - 7px)) translate(${x + rec.dx}px, ${y + rec.dy}px)`;
          rec.el.style.left = '0px';
          rec.el.style.top = '0px';
          if (!rec.visible) {
            rec.el.classList.add('visible');
            rec.visible = true;
          }
        } else if (rec.visible) {
          rec.el.classList.remove('visible');
          rec.visible = false;
        }
      }
    }

    addBeam(a, b, color, opacity, radius) {
      const beam = util.beam(a, b, color, opacity, radius);
      this.scene.add(beam);
      return beam;
    }

    dispose() {
      if (this._disposed) return;
      this._disposed = true;
      cancelAnimationFrame(this._raf);
      if (this._resizeObserver) this._resizeObserver.disconnect();
      window.removeEventListener('resize', this._resize);
      if (this.controls) this.controls.dispose();
      this.labels.forEach((rec) => {
        if (rec.el && rec.el.parentNode) rec.el.parentNode.removeChild(rec.el);
      });
      this.labels = [];
      if (this.scene) util.disposeObject(this.scene);
      if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }
      this.scene = null;
      this.camera = null;
      this.renderer = null;
    }
  }

  PL.SceneBase = SceneBase;
  PL.registerScene = function (id, SceneClass) {
    PL.scenes[id] = SceneClass;
  };

  // Keep a numeric-friendly animation clock available to scenes.
  PL.TMP = { v1: TMP_V, v2: TMP_V2 };
})();
