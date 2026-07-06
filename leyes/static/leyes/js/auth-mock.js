/**
 * Autenticación simulada (mock) — Solo frontend
 * Sesión en localStorage · Sin backend
 */
window.LegalAuth = (function () {
  "use strict";

  const SESSION_KEY = "legal_auth_session";
  const AVATAR_PREFIX = "legal_auth_avatar_";
  const LOGIN_PATH = "/static/leyes/auth/login.html";
  const APP_HOME = "/";
  const PROFILE_PATH = "/static/leyes/perfil.html";

  const MOCK_USERS = [
    {
      id: "elias",
      firstName: "Elias",
      lastName: "Cordero",
      name: "Elias Cordero",
      cargo: "Asistente Legal",
      password: "123456",
      initials: "EC",
    },
    {
      id: "guillermo",
      firstName: "Guillermo",
      lastName: "Gutierrez",
      name: "Guillermo Gutierrez",
      cargo: "G2",
      password: "123456",
      initials: "GG",
    },
  ];

  function normalize(str) {
    return (str || "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  }

  function findUser(username) {
    const v = normalize(username);
    if (!v) return null;
    return (
      MOCK_USERS.find((u) => {
        const name = normalize(u.name);
        const full = normalize(`${u.firstName} ${u.lastName}`);
        return (
          v === normalize(u.id) ||
          v === name ||
          v === full ||
          name.startsWith(v) ||
          name.includes(v) ||
          normalize(u.firstName) === v
        );
      }) || null
    );
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getAvatarKey(userId) {
    return AVATAR_PREFIX + (userId || "");
  }

  function getAvatarUrl(userId) {
    try {
      return localStorage.getItem(getAvatarKey(userId)) || null;
    } catch {
      return null;
    }
  }

  function setAvatarUrl(userId, dataUrl) {
    if (!userId) return;
    if (dataUrl) {
      localStorage.setItem(getAvatarKey(userId), dataUrl);
    } else {
      localStorage.removeItem(getAvatarKey(userId));
    }
  }

  function setSession(user) {
    const session = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      cargo: user.cargo,
      initials: user.initials,
      loginAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function updateSession(patch) {
    const session = getSession();
    if (!session) return null;
    const next = { ...session, ...patch };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    return next;
  }

  function getProfile() {
    const session = getSession();
    if (!session) return null;
    const user = MOCK_USERS.find((u) => u.id === session.id);
    return {
      ...session,
      cargo: session.cargo || user?.cargo || "—",
      firstName: session.firstName || user?.firstName || "",
      lastName: session.lastName || user?.lastName || "",
      avatarUrl: getAvatarUrl(session.id),
    };
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isAuthenticated() {
    return !!getSession();
  }

  function login(username, password) {
    const user = findUser(username);
    if (!user) {
      return {
        ok: false,
        message: "Usuario no reconocido. Use Elias Cordero o Guillermo Gutierrez.",
      };
    }
    if (password !== user.password) {
      return { ok: false, message: "Contraseña incorrecta. Para la demo use: 123456" };
    }
    const session = setSession(user);
    return { ok: true, session };
  }

  function logout() {
    clearSession();
    window.location.href = LOGIN_PATH;
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(LOGIN_PATH + (next ? "?next=" + next : ""));
      return false;
    }
    return true;
  }

  function redirectIfAuthenticated() {
    if (isAuthenticated()) {
      const params = new URLSearchParams(window.location.search);
      window.location.replace(params.get("next") || APP_HOME);
      return true;
    }
    return false;
  }

  function renderUserMenu() {
    const session = getSession();
    const actions = document.querySelector(".legal-nav-actions");
    if (!actions) return;

    if (!session) {
      actions.innerHTML = `
        <a href="${LOGIN_PATH}" class="legal-btn-nav legal-btn-nav-ghost">Ingresar</a>
        <a href="/static/leyes/auth/register.html" class="legal-btn-nav legal-btn-nav-gold">Registro</a>`;
      return;
    }

    const avatarUrl = getAvatarUrl(session.id);
    const avatarInner = avatarUrl
      ? `<img src="${avatarUrl}" alt="" class="legal-user-avatar-img">`
      : `<span class="legal-user-avatar-initials">${session.initials || "?"}</span>`;

    actions.innerHTML = `
      <div class="legal-user-menu">
        <a href="${PROFILE_PATH}" class="legal-user-pill" title="Información personal">
          <span class="legal-user-avatar">${avatarInner}</span>
          <div class="legal-user-info">
            <span class="legal-user-name">${session.name}</span>
            <span class="legal-user-role">${session.cargo || "—"}</span>
          </div>
        </a>
        <button type="button" class="legal-btn-nav legal-btn-nav-ghost" id="btn-logout">Salir</button>
      </div>`;

    document.getElementById("btn-logout")?.addEventListener("click", logout);
  }

  function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 500);
  }

  function hideError(el) {
    if (el) el.hidden = true;
  }

  return {
    MOCK_USERS,
    LOGIN_PATH,
    APP_HOME,
    PROFILE_PATH,
    getSession,
    getProfile,
    getAvatarUrl,
    setAvatarUrl,
    updateSession,
    isAuthenticated,
    login,
    logout,
    requireAuth,
    redirectIfAuthenticated,
    renderUserMenu,
    showError,
    hideError,
    findUser,
  };
})();
