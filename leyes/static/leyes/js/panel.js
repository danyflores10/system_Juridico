(function () {
  "use strict";

  const U = window.LEY_URLS || {};
  const LEYES = window.LEYES_DISPONIBLES || [];

  function getCookie(name) {
    const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return m ? m.pop() : "";
  }

  function showToast(msg, ok) {
    const box = document.getElementById("toast-container");
    if (!box) return;
    const t = document.createElement("div");
    t.className = "toast " + (ok ? "toast-ok" : "toast-err");
    t.textContent = msg;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 300);
    }, 5500);
  }

  function showAlert(msg, ok) {
    showToast(msg, ok);
    const el = document.getElementById("alert-global");
    if (el) {
      el.textContent = msg;
      el.className = "alert show " + (ok ? "alert-ok" : "alert-err");
    }
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    data._httpOk = res.ok;
    return data;
  }

  function etiquetaLey(l) {
    if (l.label && l.label.trim()) return l.label;
    const cod = l.codigo || l.codigo_ley || "?";
    const tit = (l.titulo || "").trim() || "Sin título";
    return "Ley " + cod + " — " + tit;
  }

  function poblarSelectLeyes(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const vacio = document.createElement("option");
    vacio.value = "";
    vacio.textContent = "— Seleccione ley original —";
    selectEl.appendChild(vacio);

    const lista = LEYES.length ? LEYES : [];
    if (!lista.length) {
      const aviso = document.createElement("option");
      aviso.value = "";
      aviso.textContent = "(No hay leyes en Etapa I — cargue leyes primero)";
      aviso.disabled = true;
      selectEl.appendChild(aviso);
      return;
    }

    lista.forEach((l) => {
      const o = document.createElement("option");
      o.value = String(l.id);
      o.textContent = etiquetaLey(l);
      selectEl.appendChild(o);
    });
  }

  function badgeClass(estado) {
    return (
      { pendiente: "badge-pendiente", vinculada: "badge-vinculada", procesado: "badge-modificada" }[
        estado
      ] || "badge-pendiente"
    );
  }

  function actualizarStats(stats) {
    if (!stats) return;
    const ids = {
      "stat-vinculadas": stats.mods_vinculadas,
      "stat-pendientes": stats.mods_pendientes,
    };
    Object.entries(ids).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
    document.querySelectorAll(".stats-bar .stat-card strong").forEach((el, i) => {
      const keys = ["leyes", "mods_vinculadas", "mods_pendientes", "resultados"];
      if (stats[keys[i]] !== undefined && !el.id) el.textContent = stats[keys[i]];
    });
  }

  function opcionesLeyesHtml() {
    if (!LEYES.length) {
      return '<option value="">(Cargue leyes en Etapa I)</option>';
    }
    return (
      '<option value="">— Seleccione ley original —</option>' +
      LEYES.map(
        (l) =>
          '<option value="' + l.id + '">' + escapeHtml(etiquetaLey(l)) + "</option>"
      ).join("")
    );
  }

  function renderFilaMod(m) {
    const vinculada = m.vinculada || !!m.ley;
    const procesado = m.procesado || m.estado === "procesado";
    let acciones = '<span class="text-muted-sm">—</span>';

    if (!procesado && !vinculada) {
      acciones =
        '<div class="vinculo-actions" data-mod-id="' + m.id + '">' +
        '<button type="button" class="btn btn-secondary btn-sm btn-reintentar" data-id="' + m.id + '" title="Escaneo profundo del PDF buscando leyes del sistema">Reintentar Vinculación</button>' +
        '<div class="vinculo-manual hidden">' +
        '<select class="select-ley-manual" aria-label="Seleccionar ley">' +
        opcionesLeyesHtml() +
        "</select>" +
        '<button type="button" class="btn btn-primary btn-sm btn-confirmar-vinculo" data-id="' + m.id + '">Confirmar</button>' +
        '<button type="button" class="btn btn-secondary btn-sm btn-cancelar-vinculo">Cancelar</button>' +
        "</div>" +
        '<button type="button" class="btn-icon btn-asignar-manual" data-id="' + m.id + '" title="Elegir ley manualmente">Asignar ▾</button>' +
        "</div>";
    } else if (vinculada && !procesado) {
      acciones =
        '<span class="badge badge-vinculada">Lista para motor</span>';
    } else if (procesado) {
      acciones = '<span class="badge badge-modificada">Procesado exitosamente</span>';
    }

    const leyCell = vinculada
      ? "Ley " + escapeHtml(m.ley || "")
      : '<span class="badge badge-warn">Ley no vinculada</span>';

    return (
      '<tr data-mod-id="' + m.id + '" data-estado="' + m.estado + '">' +
      "<td>" + escapeHtml(m.archivo) + "</td>" +
      '<td class="cell-codigo">' + escapeHtml(m.codigo || "—") + "</td>" +
      '<td class="cell-ley">' + leyCell + "</td>" +
      "<td>" + escapeHtml(m.claves || "—") + "</td>" +
      '<td class="cell-estado"><span class="badge badge-estado ' + badgeClass(m.estado) + '">' +
      escapeHtml(m.estado_label || m.estado) + "</span></td>" +
      '<td class="cell-acciones-vinculo">' + acciones + "</td></tr>"
    );
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = String(s ?? "");
    return d.innerHTML;
  }

  function renderTablaMods(mods) {
    const tbody = document.getElementById("tbody-modificaciones");
    const tabla = document.getElementById("tabla-modificaciones");
    const empty = document.getElementById("empty-mods");
    if (!tbody) return;
    if (!mods || !mods.length) {
      tbody.innerHTML = "";
      if (tabla) tabla.style.display = "none";
      if (empty) empty.style.display = "block";
      return;
    }
    tbody.innerHTML = mods.map(renderFilaMod).join("");
    if (tabla) tabla.style.display = "";
    if (empty) empty.style.display = "none";
    bindVinculoEvents();
  }

  async function refreshPanel() {
    if (!U.estadoPanel) return;
    const data = await fetchJson(U.estadoPanel);
    if (data.ok) {
      actualizarStats(data.stats);
      if (window.PANEL_ETAPA === "2" && data.modificaciones) {
        renderTablaMods(data.modificaciones);
      }
      if (data.leyes && data.leyes.length) {
        window.LEYES_DISPONIBLES = data.leyes;
      }
    }
  }

  function bindVinculoEvents() {
    document.querySelectorAll(".btn-reintentar").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        const textoOriginal = btn.textContent;
        btn.textContent = "Escaneando…";
        try {
          const data = await fetchJson(U.reintentarVinculo + id + "/", {
            method: "POST",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Content-Type": "application/json",
            },
          });
          showToast(data.mensaje, data.ok);
          if (data.stats) actualizarStats(data.stats);
          if (data.modificaciones) renderTablaMods(data.modificaciones);
          else if (data.modificacion) {
            const mods = await fetchJson(U.estadoPanel);
            if (mods.modificaciones) renderTablaMods(mods.modificaciones);
          }
        } catch (e) {
          showToast("Error de red: " + e.message, false);
        } finally {
          btn.disabled = false;
          btn.textContent = textoOriginal;
        }
      };
    });

    document.querySelectorAll(".btn-asignar-manual").forEach((btn) => {
      btn.onclick = () => {
        const wrap = btn.closest(".vinculo-actions");
        const manual = wrap.querySelector(".vinculo-manual");
        const sel = manual.querySelector(".select-ley-manual");
        manual.classList.remove("hidden");
        btn.style.display = "none";
        wrap.querySelector(".btn-reintentar").style.display = "none";
        poblarSelectLeyes(sel);
      };
    });

    document.querySelectorAll(".btn-cancelar-vinculo").forEach((btn) => {
      btn.onclick = () => {
        const wrap = btn.closest(".vinculo-actions");
        wrap.querySelector(".vinculo-manual").classList.add("hidden");
        wrap.querySelector(".btn-asignar-manual").style.display = "";
        wrap.querySelector(".btn-reintentar").style.display = "";
      };
    });

    document.querySelectorAll(".btn-confirmar-vinculo").forEach((btn) => {
      btn.onclick = async () => {
        const wrap = btn.closest(".vinculo-actions");
        const sel = wrap.querySelector(".select-ley-manual");
        if (!sel || !sel.value) {
          showToast("Seleccione una ley de la lista desplegable.", false);
          return;
        }
        btn.disabled = true;
        try {
          const data = await fetchJson(U.vincularManual + btn.dataset.id + "/", {
            method: "POST",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ley_id: parseInt(sel.value, 10) }),
          });
          showToast(
            data.ok ? "Vinculación forzada con éxito." : data.mensaje,
            data.ok
          );
          if (data.stats) actualizarStats(data.stats);
          if (data.modificaciones) renderTablaMods(data.modificaciones);
          else await refreshPanel();
        } catch (e) {
          showToast("Error: " + e.message, false);
        } finally {
          btn.disabled = false;
        }
      };
    });
  }

  function setupDropzone(zoneId, inputId, listId) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if (!zone || !input) return null;
    zone.addEventListener("click", () => input.click());
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      input.files = e.dataTransfer.files;
    });
    return input;
  }

  async function postFiles(url, input) {
    if (!input || !input.files.length) {
      showToast("Seleccione al menos un archivo.", false);
      return null;
    }
    const fd = new FormData();
    Array.from(input.files).forEach((f) => fd.append("archivos", f));
    return fetchJson(url, {
      method: "POST",
      headers: { "X-CSRFToken": getCookie("csrftoken") },
      body: fd,
    });
  }

  const inputLeyes = setupDropzone("dropzone-leyes", "input-leyes", "lista-leyes");
  const inputMods = setupDropzone("dropzone-mods", "input-mods", "lista-mods");

  const btnLeyes = document.getElementById("btn-subir-leyes");
  if (btnLeyes) {
    btnLeyes.addEventListener("click", async () => {
      btnLeyes.disabled = true;
      try {
        const data = await postFiles(U.cargarLeyes, inputLeyes);
        if (data) {
          showToast(data.mensaje, data.ok);
          if (data.ok) setTimeout(() => location.reload(), 1000);
        }
      } catch (e) {
        showToast("Error: " + e.message, false);
      } finally {
        btnLeyes.disabled = false;
      }
    });
  }

  const btnMods = document.getElementById("btn-subir-mods");
  if (btnMods) {
    btnMods.addEventListener("click", async () => {
      btnMods.disabled = true;
      try {
        const data = await postFiles(U.cargarMods, inputMods);
        if (data) {
          showToast(data.mensaje, data.ok);
          if (data.stats) actualizarStats(data.stats);
          if (data.modificaciones) renderTablaMods(data.modificaciones);
          if (data.leyes) window.LEYES_DISPONIBLES = data.leyes;
        }
      } catch (e) {
        showToast("Error: " + e.message, false);
      } finally {
        btnMods.disabled = false;
      }
    });
  }

  const btnProcesar = document.getElementById("btn-procesar");
  if (btnProcesar) {
    btnProcesar.addEventListener("click", async () => {
      if (
        !confirm(
          "¿Ejecutar el motor de cambios sobre todos los modificatorios vinculados?"
        )
      ) {
        return;
      }
      btnProcesar.disabled = true;
      const htmlOriginal = btnProcesar.innerHTML;
      btnProcesar.textContent = "Procesando…";
      try {
        const data = await fetchJson(U.procesar, {
          method: "POST",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json",
          },
        });
        showToast(data.mensaje, data.ok);
        if (data.stats) actualizarStats(data.stats);
        if (data.modificaciones) renderTablaMods(data.modificaciones);
        if (data.ok) {
          setTimeout(() => {
            window.location.href = "?etapa=3";
          }, 1500);
        }
      } catch (e) {
        showToast("Error: " + e.message, false);
      } finally {
        btnProcesar.disabled = false;
        btnProcesar.innerHTML = htmlOriginal;
      }
    });
  }

  document.querySelectorAll(".btn-desactivar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tipo = btn.dataset.tipo;
      const id = btn.dataset.id;
      if (!confirm("¿Desactivar este registro?")) return;
      const url =
        tipo === "ley" ? U.desactivarLey + id + "/" : U.desactivarResultado + id + "/";
      try {
        const data = await fetchJson(url, {
          method: "POST",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json",
          },
        });
        showToast(data.mensaje, data.ok);
        if (data.ok) setTimeout(() => location.reload(), 700);
      } catch (e) {
        showToast("Error: " + e.message, false);
      }
    });
  });

  document.querySelectorAll(".btn-descargar").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = U.descargar + btn.dataset.id + "/?formato=docx";
    });
  });
  document.querySelectorAll(".btn-descargar-pdf").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = U.descargar + btn.dataset.id + "/?formato=pdf";
    });
  });

  document.querySelectorAll(".select-ley-manual").forEach(poblarSelectLeyes);
  bindVinculoEvents();
})();
