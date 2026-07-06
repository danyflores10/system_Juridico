/**
 * Centro de Inteligencia Legislativa — Dashboard interactivo
 */
window.DashboardApp = (function () {
  const COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#fb923c", "#22d3ee", "#e879f9"];
  let charts = {};
  let state = {
    leyFilter: "all",
    actionFilter: null,
    cloudWords: [],
    cloudAnim: null,
  };

  let DATA = {
    acciones: [],
    palabrasMods: [],
    palabrasRes: [],
    metadatos: [],
    leyesStats: [],
    cronologia: [],
    alertas: [],
    keywords: {},
    topWords: [],
  };

  /* ── Helpers ── */
  function $(id) { return document.getElementById(id); }
  function parse(id) {
    const el = $(id);
    return el ? JSON.parse(el.textContent) : [];
  }

  function animateCount(el, target, duration = 900) {
    if (!el) return;
    const start = parseInt(el.textContent, 10) || 0;
    const diff = target - start;
    const t0 = performance.now();
    function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + diff * ease);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function animateAllKpis(stats, totalMods) {
    const map = {
      "kpi-leyes": stats?.leyes,
      "kpi-pendientes": stats?.mods_pendientes,
      "kpi-vinculadas": stats?.mods_vinculadas,
      "kpi-procesadas": stats?.mods_procesadas,
      "kpi-resultados": stats?.resultados,
      "kpi-total-mods": totalMods,
    };
    Object.entries(map).forEach(([id, val]) => {
      if (val != null) animateCount($(id), val);
    });
  }

  /* ── Particle background ── */
  function initParticles() {
    const canvas = $("dash-bg-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, particles = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function mkParticle() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        a: Math.random() * 0.35 + 0.1,
      };
    }

    function init() {
      resize();
      particles = Array.from({ length: 55 }, mkParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.a})`;
        ctx.fill();
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x, dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.06 * (1 - dist / 100)})`;
            ctx.stroke();
          }
        });
      });
      requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", resize);
  }

  /* ── Charts ── */
  function destroyCharts() {
    Object.values(charts).forEach((c) => c.destroy());
    charts = {};
  }

  Chart.defaults.color = "#94a3b8";
  Chart.defaults.borderColor = "rgba(148,163,184,0.1)";

  function renderRadar(acciones) {
    const el = $("chartRadar");
    if (!el) return;
    if (charts.radar) charts.radar.destroy();
    const labels = acciones.map((a) => a.accion.replace("SE ", ""));
    const data = acciones.map((a) => a.count);
    charts.radar = new Chart(el, {
      type: "radar",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: "rgba(56, 189, 248, 0.18)",
          borderColor: "#38bdf8",
          borderWidth: 2,
          pointBackgroundColor: "#a78bfa",
          pointRadius: 4,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            grid: { color: "rgba(148,163,184,0.12)" },
            angleLines: { color: "rgba(148,163,184,0.08)" },
            ticks: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.raw} ocurrencias` },
          },
        },
      },
    });
  }

  function renderBarChart(canvasId, palabras, maxItems = 12) {
    const el = $(canvasId);
    if (!el || !palabras.length) return;
    if (charts[canvasId]) charts[canvasId].destroy();
    const slice = palabras.slice(0, maxItems);
    charts[canvasId] = new Chart(el, {
      type: "bar",
      data: {
        labels: slice.map((p) => p.palabra),
        datasets: [{
          data: slice.map((p) => p.count),
          backgroundColor: slice.map((_, i) => COLORS[i % COLORS.length]),
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: "rgba(148,163,184,0.08)" } },
          y: { grid: { display: false } },
        },
      },
    });
  }

  /* ── Keyword pulse meters ── */
  function renderKeywordPulse(keywords) {
    const box = $("keyword-pulse");
    if (!box || !keywords) return;
    const items = [
      { key: "modifica", label: "modifica", color: "#38bdf8" },
      { key: "sustituye", label: "sustituye", color: "#a78bfa" },
      { key: "deroga", label: "deroga", color: "#fbbf24" },
      { key: "derogación", label: "derogación", color: "#fb923c" },
      { key: "abroga", label: "abroga", color: "#f87171" },
      { key: "abrogación", label: "abrogación", color: "#ef4444" },
    ];
    const maxVal = Math.max(...items.map((i) => keywords[i.key] || 0), 1);
    box.innerHTML = items.map((item) => {
      const val = keywords[item.key] || 0;
      const pct = Math.round((val / maxVal) * 100);
      const circ = 2 * Math.PI * 26;
      const offset = circ - (circ * pct / 100);
      return `
        <div class="dash-kw-meter" title="${item.label}: ${val}">
          <div class="dash-kw-ring">
            <svg viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
              <circle cx="32" cy="32" r="26" fill="none" stroke="${item.color}" stroke-width="5"
                stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
                style="transition:stroke-dashoffset 1s ease"/>
            </svg>
            <span class="dash-kw-val">${val}</span>
          </div>
          <div class="dash-kw-label">${item.label}</div>
        </div>`;
    }).join("");
  }

  /* ── Top words bars ── */
  function renderTopWords(words) {
    const box = $("top-words-bars");
    if (!box || !words.length) return;
    const max = words[0]?.count || 1;
    box.innerHTML = words.slice(0, 8).map((w) => `
      <div class="dash-word-bar">
        <span class="dash-word-bar-label">${w.palabra}</span>
        <div class="dash-word-bar-track">
          <div class="dash-word-bar-fill" data-width="${Math.round(w.count / max * 100)}"></div>
        </div>
        <span class="dash-word-bar-count">${w.count}</span>
      </div>`).join("");
    requestAnimationFrame(() => {
      box.querySelectorAll(".dash-word-bar-fill").forEach((el) => {
        el.style.width = el.dataset.width + "%";
      });
    });
  }

  /* ── Action chips + table ── */
  function renderActionChips(acciones) {
    const box = $("action-chips");
    if (!box) return;
    box.innerHTML = acciones.map((a) =>
      `<button type="button" class="dash-action-chip" data-action="${a.accion}">${a.accion} (${a.count})</button>`
    ).join("");
    box.querySelectorAll(".dash-action-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.action;
        state.actionFilter = state.actionFilter === act ? null : act;
        box.querySelectorAll(".dash-action-chip").forEach((b) =>
          b.classList.toggle("active", b.dataset.action === state.actionFilter)
        );
        renderAccionesTable(acciones.filter((a) =>
          !state.actionFilter || a.accion === state.actionFilter
        ));
      });
    });
  }

  function renderAccionesTable(acciones) {
    const tbody = $("tabla-acciones-body");
    if (!tbody) return;
    if (!acciones.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="dash-empty">Sin datos para este filtro</td></tr>`;
      return;
    }
    const max = acciones[0].count || 1;
    tbody.innerHTML = acciones.map((item) => `
      <tr>
        <td><strong>${item.accion}</strong></td>
        <td>${item.count}</td>
        <td><div class="dash-impact-bar"><div class="dash-impact-fill" style="width:${Math.round(item.count / max * 100)}%"></div></div></td>
      </tr>`).join("");
  }

  /* ── Word cloud (canvas) ── */
  function initWordCloud(words) {
    const canvas = $("word-cloud-canvas");
    if (!canvas || !words.length) return;
    const ctx = canvas.getContext("2d");
    state.cloudWords = [];
    let hovered = null;

    function layout() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      const W = rect.width, H = rect.height;
      const max = words[0]?.count || 1;
      state.cloudWords = [];
      const placed = [];

      words.slice(0, 35).forEach((w, i) => {
        const size = 12 + (w.count / max) * 28;
        for (let attempt = 0; attempt < 80; attempt++) {
          const x = 40 + Math.random() * (W - 80);
          const y = 30 + Math.random() * (H - 50);
          const box = { x: x - size * w.palabra.length * 0.28, y: y - size, w: size * w.palabra.length * 0.55, h: size * 1.3 };
          const hit = placed.some((p) =>
            box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y
          );
          if (!hit) {
            placed.push(box);
            state.cloudWords.push({ ...w, x, y, size, color: COLORS[i % COLORS.length], box });
            break;
          }
        }
      });
    }

    function draw() {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      state.cloudWords.forEach((w) => {
        const isHov = hovered === w;
        ctx.font = `${isHov ? "700" : "500"} ${w.size}px IBM Plex Sans, sans-serif`;
        ctx.fillStyle = isHov ? "#fff" : w.color;
        ctx.shadowColor = isHov ? w.color : "transparent";
        ctx.shadowBlur = isHov ? 16 : 0;
        ctx.fillText(w.palabra, w.x, w.y);
      });
      ctx.shadowBlur = 0;
      state.cloudAnim = requestAnimationFrame(draw);
    }

    layout();
    if (state.cloudAnim) cancelAnimationFrame(state.cloudAnim);
    draw();

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      hovered = state.cloudWords.find((w) =>
        mx >= w.box.x && mx <= w.box.x + w.box.w && my >= w.box.y && my <= w.box.y + w.box.h
      ) || null;
      const detail = $("cloud-detail");
      if (detail) {
        detail.innerHTML = hovered
          ? `<strong>${hovered.palabra}</strong> — ${hovered.count} ocurrencias en el corpus`
          : "Pasa el cursor sobre una palabra";
      }
    };

    window.addEventListener("resize", () => { layout(); });
  }

  /* ── Timeline ── */
  function renderTimeline(cronologia) {
    const track = $("timeline-track");
    if (!track) return;
    const sorted = [...cronologia].sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
    track.innerHTML = sorted.map((item, i) => {
      const cls = item.procesado ? "procesado" : item.estado === "Ley no vinculada" ? "pendiente" : "";
      const year = (item.fecha || "—").slice(0, 4);
      return `
        <div class="dash-tl-node ${cls}" data-idx="${i}" tabindex="0">
          <div class="dash-tl-dot"></div>
          <div class="dash-tl-card">
            <div class="dash-tl-year">${year} · ${item.tipo || "?"}</div>
            <div class="dash-tl-norma">${(item.norma || "").slice(0, 40)}</div>
          </div>
        </div>`;
    }).join("");

    track.querySelectorAll(".dash-tl-node").forEach((node) => {
      const idx = parseInt(node.dataset.idx, 10);
      const show = () => {
        track.querySelectorAll(".dash-tl-node").forEach((n) => n.classList.remove("active"));
        node.classList.add("active");
        const item = sorted[idx];
        const detail = $("timeline-detail");
        if (detail && item) {
          detail.innerHTML = `
            <strong>${item.norma || item.archivo}</strong><br>
            📅 ${item.fecha || "—"} · Tipo ${item.tipo}<br>
            🎯 Ley objetivo: <span class="dash-highlight">${item.ley_objetivo || "?"}</span><br>
            📋 Estado: ${item.estado} · ${item.procesado ? "✅ Procesado" : "⏳ Pendiente"}<br>
            <em>${item.descripcion || ""}</em>`;
        }
      };
      node.addEventListener("click", show);
      node.addEventListener("keydown", (e) => { if (e.key === "Enter") show(); });
    });
  }

  /* ── Alerts ── */
  function renderAlertas(alertas) {
    const box = $("alertas-panel");
    const count = $("alert-count");
    if (count) count.textContent = alertas.length;
    if (!box) return;
    if (!alertas.length) {
      box.innerHTML = '<p class="dash-empty">✓ Sin alertas — corpus en orden</p>';
      return;
    }
    box.innerHTML = alertas.slice(0, 20).map((a) => `
      <div class="dash-alert-item ${a.nivel || "info"}">
        <div class="dash-alert-tag">${a.icono || ""} ${a.etiqueta || a.nivel}</div>
        <div>${a.mensaje}</div>
      </div>`).join("");
  }

  /* ── Ley summary grid ── */
  function renderLeyGrid(leyes) {
    const box = $("ley-summary-grid");
    if (!box) return;
    box.innerHTML = leyes.map((l) => `
      <div class="dash-ley-summary" data-ley="${l.codigo}" style="cursor:pointer">
        <div class="dash-ley-summary-code">${l.codigo}</div>
        <div class="dash-ley-summary-title">${l.titulo}</div>
        <div class="dash-ley-summary-stats">${l.n_mods} mod · ${l.n_resultados} res</div>
      </div>`).join("");
    box.querySelectorAll(".dash-ley-summary").forEach((el) => {
      el.addEventListener("click", () => selectLaw(el.dataset.ley));
    });
  }

  /* ── Ticker ── */
  function renderTicker(acciones, cronologia) {
    const track = $("dash-ticker");
    if (!track) return;
    const items = [
      ...acciones.slice(0, 4).map((a) => `<span>${a.accion}</span> × ${a.count}`),
      ...cronologia.slice(0, 4).map((c) => `<span>${c.norma?.slice(0, 30) || c.archivo}</span> → Ley ${c.ley_objetivo || "?"}`),
    ];
    const html = items.join(" · ") + " · ";
    track.innerHTML = html + html;
  }

  /* ── Law filter ── */
  function selectLaw(codigo) {
    state.leyFilter = codigo;
    document.querySelectorAll(".dash-law-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.ley === codigo);
    });
    const label = $("dash-filter-label");
    if (label) {
      label.textContent = codigo === "all"
        ? "Vista: corpus completo"
        : `Filtrado: Ley ${codigo}`;
    }
    applyLawFilter();
  }

  function applyLawFilter() {
    let acciones = DATA.acciones;
    let topWords = DATA.topWords;
    let keywords = DATA.keywords;

    if (state.leyFilter !== "all") {
      const meta = DATA.metadatos.find((m) =>
        m.ley_original?.includes(state.leyFilter)
      );
      if (meta?.palabras_frecuentes_modificadas?.length) {
        topWords = meta.palabras_frecuentes_modificadas.map((p, i) => ({
          palabra: p, count: meta.palabras_frecuentes_modificadas.length - i,
        }));
      }
      const cronFiltered = DATA.cronologia.filter((c) =>
        String(c.ley_objetivo) === state.leyFilter
      );
      renderTimeline(cronFiltered.length ? cronFiltered : DATA.cronologia);
    } else {
      renderTimeline(DATA.cronologia);
    }

    renderRadar(acciones);
    renderActionChips(acciones);
    renderAccionesTable(acciones);
    renderKeywordPulse(keywords);
    renderTopWords(topWords);
    initWordCloud(topWords.length ? topWords : DATA.palabrasMods);
  }

  /* ── Tabs ── */
  function initTabs() {
    document.querySelectorAll(".dash-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".dash-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".dash-panel-view").forEach((p) => {
          p.classList.remove("active");
          p.hidden = true;
        });
        tab.classList.add("active");
        const panel = $(`tab-${tab.dataset.tab}`);
        if (panel) {
          panel.classList.add("active");
          panel.hidden = false;
        }
      });
    });
  }

  /* ── Search ── */
  function initSearch() {
    const input = $("dash-search");
    if (!input) return;
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
    });
    input.addEventListener("input", () => {
      const q = input.value.toLowerCase().trim();
      document.querySelectorAll(".dash-law-chip").forEach((chip) => {
        const text = chip.textContent.toLowerCase();
        chip.style.opacity = !q || text.includes(q) ? "1" : "0.25";
      });
      document.querySelectorAll(".dash-tl-node").forEach((node) => {
        const text = node.textContent.toLowerCase();
        node.style.opacity = !q || text.includes(q) ? "1" : "0.2";
      });
    });
  }

  /* ── Refresh ── */
  async function refresh(apiUrl) {
    const btn = $("btn-refresh-dash");
    if (btn) btn.classList.add("spinning");
    try {
      const r = await fetch(apiUrl);
      const data = await r.json();
      if (!data.ok) return;
      DATA.acciones = data.acciones || [];
      DATA.palabrasMods = data.palabras || [];
      DATA.palabrasRes = data.palabras_res || [];
      DATA.alertas = data.alertas || [];
      DATA.cronologia = data.cronologia || [];
      DATA.keywords = data.palabras_clave_obligatorias || DATA.keywords;
      DATA.topWords = data.top_palabras_general || DATA.topWords;
      if (data.metadatos_por_ley) DATA.metadatos = data.metadatos_por_ley;

      animateAllKpis(data.stats, data.total_modificatorios);
      applyLawFilter();
      renderAlertas(DATA.alertas);
      renderBarChart("chartPalabrasMods", DATA.palabrasMods);
      renderBarChart("chartPalabrasRes", DATA.palabrasRes);
      renderTicker(DATA.acciones, DATA.cronologia);

      const ts = $("dash-timestamp");
      if (ts) ts.textContent = "Sincronizado · " + (data.generado_en || new Date().toLocaleString());
    } finally {
      if (btn) setTimeout(() => btn.classList.remove("spinning"), 800);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(DATA.metadatos, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "metadatos_legislativos.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ── Init ── */
  function init() {
    DATA.acciones = parse("data-acciones");
    DATA.palabrasMods = parse("data-palabras-mods");
    DATA.palabrasRes = parse("data-palabras-res");
    DATA.metadatos = parse("data-metadatos");
    DATA.leyesStats = parse("data-leyes-stats");
    DATA.cronologia = parse("data-cronologia");
    DATA.alertas = parse("data-alertas");
    DATA.keywords = parse("data-keywords") || {};
    DATA.topWords = parse("data-top-words") || [];

    initParticles();
    initTabs();
    initSearch();

    document.querySelectorAll(".dash-kpi-num").forEach((el) => {
      animateCount(el, parseInt(el.dataset.target, 10) || 0);
    });

    document.querySelectorAll(".dash-law-chip").forEach((chip) => {
      chip.addEventListener("click", () => selectLaw(chip.dataset.ley));
    });

    $("btn-refresh-dash")?.addEventListener("click", () =>
      refresh(window.DASHBOARD_CONFIG?.apiUrl)
    );
    $("btn-export-json")?.addEventListener("click", exportJson);

    applyLawFilter();
    renderAlertas(DATA.alertas);
    renderLeyGrid(DATA.leyesStats);
    renderBarChart("chartPalabrasMods", DATA.palabrasMods);
    renderBarChart("chartPalabrasRes", DATA.palabrasRes);
    renderTicker(DATA.acciones, DATA.cronologia);
  }

  return { init, refresh, exportJson };
})();

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("dash-cockpit")) DashboardApp.init();
});
