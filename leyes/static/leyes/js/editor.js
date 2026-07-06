(function () {
  "use strict";

  function getCookie(name) {
    const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return m ? m.pop() : "";
  }

  function showAlert(msg, ok) {
    const el = document.getElementById("alert-global");
    if (!el) return;
    el.textContent = msg;
    el.className = "alert show " + (ok ? "alert-ok" : "alert-err");
  }

  function cargarHtmlEnQuill(quill, html) {
    if (!html || !html.trim()) return;
    quill.setText("");
    if (typeof quill.clipboard.dangerouslyPasteHTML === "function") {
      quill.clipboard.dangerouslyPasteHTML(0, html);
    } else {
      quill.root.innerHTML = html;
    }
  }

  function obtenerContenidoHtml(quill) {
    return quill.root.innerHTML.trim();
  }

  const scriptEl = document.getElementById("contenido-inicial");
  const textoInicial = scriptEl ? JSON.parse(scriptEl.textContent) : "";

  const quill = new Quill("#editor-container", {
    theme: "snow",
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["clean"],
      ],
    },
    placeholder: "Revise y corrija el texto consolidado de la norma…",
  });

  if (textoInicial) {
    cargarHtmlEnQuill(quill, textoInicial);
  }

  async function guardarContenido() {
    const contenido = obtenerContenidoHtml(quill);
    const res = await fetch(window.GUARDAR_URL, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contenido }),
    });
    return res.json();
  }

  async function sincronizarAntesDescarga() {
    const contenido = obtenerContenidoHtml(quill);
    const res = await fetch(window.DESCARGAR_URL, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contenido }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.mensaje || "Error al sincronizar contenido");
    }
  }

  const btnGuardar = document.getElementById("btn-guardar-final");
  if (btnGuardar && window.GUARDAR_URL) {
    btnGuardar.addEventListener("click", async () => {
      btnGuardar.disabled = true;
      try {
        const data = await guardarContenido();
        showAlert(data.mensaje, data.ok);
        if (data.ok) {
          btnGuardar.textContent = "Versión Final Guardada";
          setTimeout(() => location.reload(), 1200);
        }
      } catch (e) {
        showAlert("Error al guardar: " + e.message, false);
      } finally {
        btnGuardar.disabled = false;
      }
    });
  }

  async function descargar(formato) {
    try {
      await sincronizarAntesDescarga();
      window.location.href =
        window.DESCARGAR_URL + "?formato=" + formato;
    } catch (e) {
      showAlert(e.message, false);
    }
  }

  const btnDocx = document.getElementById("btn-descargar-docx");
  if (btnDocx) btnDocx.addEventListener("click", () => descargar("docx"));

  const btnPdf = document.getElementById("btn-descargar-pdf");
  if (btnPdf) btnPdf.addEventListener("click", () => descargar("pdf"));

  const btnDes = document.querySelector(".btn-desactivar-editor");
  if (btnDes && window.DESACTIVAR_URL) {
    btnDes.addEventListener("click", async () => {
      if (!confirm("¿Desactivar este resultado?")) return;
      try {
        const res = await fetch(window.DESACTIVAR_URL, {
          method: "POST",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        showAlert(data.mensaje, data.ok);
        if (data.ok) setTimeout(() => (window.location.href = window.PANEL_URL), 800);
      } catch (e) {
        showAlert("Error: " + e.message, false);
      }
    });
  }

  const btnTogglePreinforme = document.getElementById("btn-toggle-preinforme");
  if (btnTogglePreinforme) {
    btnTogglePreinforme.addEventListener("click", () => {
      const panel = document.getElementById("preinforme-panel");
      if (!panel) return;
      const abierto = panel.classList.toggle("abierto");
      btnTogglePreinforme.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
  }
})();
