/**
 * Shell universal — Sidebar y navegación activa (solo frontend)
 */
(function () {
  "use strict";

  const NAV = [
    { id: "inicio", label: "Panel principal", href: "/", icon: "▣" },
    { id: "etapa1", label: "Reconocimiento", href: "/?etapa=1", icon: "◈" },
    { id: "etapa2", label: "Vinculación", href: "/?etapa=2", icon: "◇" },
    { id: "etapa3", label: "Verificación", href: "/?etapa=3", icon: "◎" },
    { id: "dashboard", label: "Inteligencia", href: "/dashboard/", icon: "◆" },
    { id: "perfil", label: "Información Personal", href: "/static/leyes/perfil.html", icon: "◉" },
  ];

  function detectActiveNav() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path.includes("perfil.html")) return "perfil";
    if (path.includes("dashboard")) return "dashboard";
    if (path === "/" || path.endsWith("/panel")) {
      const etapa = params.get("etapa");
      if (!etapa) return "inicio";
      if (etapa === "2") return "etapa2";
      if (etapa === "3") return "etapa3";
      return "etapa1";
    }
    return "";
  }

  function renderSidebar() {
    const mount = document.getElementById("legal-sidebar-mount");
    if (!mount) return;

    const active = mount.dataset.active || detectActiveNav();
    const links = NAV.map(
      (item) => `
      <a href="${item.href}" class="legal-sidebar-link${active === item.id ? " active" : ""}" data-nav="${item.id}">
        <span class="legal-sidebar-icon" aria-hidden="true">${item.icon}</span>
        <span class="legal-sidebar-label">${item.label}</span>
      </a>`
    ).join("");

    mount.innerHTML = `
      <aside class="legal-sidebar" role="navigation" aria-label="Menú principal">
        <div class="legal-sidebar-head">
          <span class="legal-sidebar-title">Módulos</span>
        </div>
        <nav class="legal-sidebar-nav">${links}</nav>
        <div class="legal-sidebar-foot">
          <span class="legal-sidebar-foot-text">Gestión normativa integrada</span>
        </div>
      </aside>`;
  }

  function initSidebarToggle() {
    const btn = document.getElementById("legal-sidebar-toggle");
    const layout = document.querySelector(".legal-app-body");
    if (!btn || !layout) return;
    btn.addEventListener("click", () => {
      layout.classList.toggle("sidebar-collapsed");
      btn.setAttribute(
        "aria-expanded",
        layout.classList.contains("sidebar-collapsed") ? "false" : "true"
      );
    });
  }

  function initMobileSidebarDefault() {
    const layout = document.querySelector(".legal-app-body");
    if (layout && window.matchMedia("(max-width: 900px)").matches) {
      layout.classList.add("sidebar-collapsed");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderSidebar();
    initSidebarToggle();
    initMobileSidebarDefault();
  });

  window.LegalShell = { NAV, detectActiveNav, renderSidebar };
})();
