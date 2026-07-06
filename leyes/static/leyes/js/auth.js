/**
 * Auth UI + integración mock — Solo frontend
 */
(function () {
  "use strict";

  const Auth = window.LegalAuth;

  function togglePassword(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener("click", () => {
      const isPwd = input.type === "password";
      input.type = isPwd ? "text" : "password";
      btn.textContent = isPwd ? "Ocultar" : "Mostrar";
    });
  }

  function passwordStrength(inputId, barId) {
    const input = document.getElementById(inputId);
    const bar = document.getElementById(barId);
    if (!input || !bar) return;
    input.addEventListener("input", () => {
      const v = input.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      bar.style.width = (score / 4) * 100 + "%";
      const colors = ["#b91c1c", "#ea580c", "#ca8a04", "#0d9488"];
      bar.style.background = colors[Math.max(0, score - 1)] || colors[0];
    });
  }

  function initNavbarMobile() {
    /* Sidebar móvil: legal-shell.js */
  }

  function initLoginPage() {
    const form = document.getElementById("login-form");
    if (!form || !Auth) return;

    if (Auth.redirectIfAuthenticated()) return;

    const errorEl = document.getElementById("login-error");
    const userInput = document.getElementById("login-user");
    const pwdInput = document.getElementById("login-password");
    const btn = form.querySelector(".legal-btn-primary");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      Auth.hideError(errorEl);

      const user = userInput?.value || "";
      const pwd = pwdInput?.value || "";

      if (!user.trim() || !pwd) {
        Auth.showError(errorEl, "Complete usuario y contraseña.");
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Verificando…";
      }

      setTimeout(() => {
        const result = Auth.login(user, pwd);
        if (result.ok) {
          if (btn) btn.textContent = "✓ Acceso concedido";
          const params = new URLSearchParams(window.location.search);
          setTimeout(() => {
            window.location.href = params.get("next") || Auth.APP_HOME;
          }, 400);
        } else {
          Auth.showError(errorEl, result.message);
          if (btn) {
            btn.disabled = false;
            btn.textContent = btn.dataset.label || "Ingresar";
          }
        }
      }, 500);
    });

    document.querySelectorAll(".legal-demo-account").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (userInput) userInput.value = chip.dataset.user || "";
        if (pwdInput) pwdInput.value = "123456";
        Auth.hideError(errorEl);
      });
    });
  }

  function initRegisterPage() {
    const form = document.getElementById("register-form");
    if (!form || !Auth) return;
    const err = document.getElementById("register-error");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      Auth.showError(
        err,
        "En esta demo el registro está deshabilitado. Use Elias Cordero o Guillermo Gutierrez con contraseña 123456."
      );
    });
  }

  function initAppShell() {
    if (!document.body.classList.contains("legal-app")) return;
    if (!Auth) return;
    Auth.renderUserMenu();
    initNavbarMobile();
  }

  document.addEventListener("DOMContentLoaded", () => {
    togglePassword("toggle-login-pwd", "login-password");
    togglePassword("toggle-reg-pwd", "reg-password");
    togglePassword("toggle-reg-pwd2", "reg-password2");
    passwordStrength("reg-password", "pwd-strength-bar");
    initLoginPage();
    initRegisterPage();
    initAppShell();
  });
})();
