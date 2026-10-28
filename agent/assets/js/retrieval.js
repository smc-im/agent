/* =========================================================
   PHYS·LAB retrieval — lightweight local RAG over the
   experiment knowledge base (Chinese bigram + IDF scoring)
   ========================================================= */
(function () {
  'use strict';
  const PL = window.PhysLab;

  function strip(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function tokens(text) {
    const clean = strip(text).toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]+/g, ' ');
    const set = new Set();
    clean.split(/\s+/).forEach((word) => {
      if (!word) return;
      if (/^[a-z0-9]+$/.test(word)) {
        if (word.length >= 2) set.add(word);
        return;
      }
      for (let i = 0; i < word.length - 1; i++) set.add(word.substr(i, 2));
      if (word.length === 1) set.add(word);
    });
    return set;
  }

  class Retriever {
    constructor() {
      this.chunks = [];
      this.df = new Map();
      this.total = 0;
      this.build();
    }

    add(exp, section, text) {
      const clean = strip(text);
      if (!clean || clean.length < 4) return;
      const id = exp.id + ':' + this.chunks.length;
      const toks = Array.from(tokens(clean + ' ' + exp.name + ' ' + section));
      const tf = new Map();
      toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
      tf.forEach((v, t) => this.df.set(t, (this.df.get(t) || 0) + 1));
      this.chunks.push({
        id: id,
        expId: exp.id,
        expName: exp.name,
        section: section,
        text: clean,
        tf: tf
      });
      this.total++;
    }

    build() {
      (PL.experiments || []).forEach((exp) => {
        const l = exp.lesson;
        this.add(exp, '导入', l.lead);
        (l.points || []).forEach((p) => this.add(exp, '关键机制', p));
        (l.errors || []).forEach((e) => this.add(exp, '误差分析 · ' + e.title, e.body));
        (l.questions || []).forEach((q) => this.add(exp, '思考题 · ' + q.q, q.q + ' ' + q.a));
        (exp.qa || []).forEach((q) => this.add(exp, '答疑 · ' + q.q, q.q + ' ' + q.a));
        Object.keys(exp.annotations || {}).forEach((k) => {
          const a = exp.annotations[k];
          this.add(exp, '元件 · ' + a.title, a.title + ' ' + a.text);
        });
      });
    }

    search(query, expId, topK) {
      const q = tokens(query);
      if (!q.size) return [];
      const n = Math.max(1, this.chunks.length);
      const scored = this.chunks.map((chunk) => {
        let score = 0;
        q.forEach((term) => {
          const tf = chunk.tf.get(term) || 0;
          if (!tf) return;
          const df = this.df.get(term) || 1;
          const idf = Math.log(1 + n / df);
          score += (1 + Math.log(tf)) * idf;
        });
        if (expId && chunk.expId === expId) score *= 1.55;
        if (score > 0) {
          const phrase = strip(query).toLowerCase();
          if (phrase.length >= 4 && chunk.text.toLowerCase().indexOf(phrase.substr(0, 8)) >= 0) score += 2.4;
        }
        return { chunk: chunk, score: score };
      }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
      const k = topK || 3;
      return scored.slice(0, k).map((x) => ({
        id: x.chunk.id,
        expId: x.chunk.expId,
        expName: x.chunk.expName,
        section: x.chunk.section,
        text: x.chunk.text,
        score: x.score
      }));
    }
  }

  PL.Retriever = Retriever;
})();
