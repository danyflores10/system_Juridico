/**
 * Vista Información Personal — Solo frontend
 */
(function () {
  "use strict";

  const Auth = window.LegalAuth;

  function renderAvatar(el, profile) {
    if (!el || !profile) return;
    if (profile.avatarUrl) {
      el.innerHTML = `<img src="${profile.avatarUrl}" alt="Foto de ${profile.name}">`;
      el.classList.add("has-photo");
    } else {
      el.innerHTML = `<span class="profile-avatar-initials">${profile.initials || "?"}</span>`;
      el.classList.remove("has-photo");
    }
  }

  function fillProfileCard(profile) {
    const fn = document.getElementById("profile-firstname");
    const ln = document.getElementById("profile-lastname");
    const cargo = document.getElementById("profile-cargo");
    const badge = document.getElementById("profile-cargo-badge");
    const email = document.getElementById("profile-email");
    const sessionDate = document.getElementById("profile-session");

    if (fn) fn.textContent = profile.firstName || "—";
    if (ln) ln.textContent = profile.lastName || "—";
    if (cargo) cargo.textContent = profile.cargo || "—";
    if (badge) badge.textContent = profile.cargo || "—";
    if (email) email.textContent = `${(profile.firstName || "user").toLowerCase()}.${(profile.lastName || "demo").toLowerCase()}@legislacion.demo`;
    if (sessionDate && profile.loginAt) {
      const d = new Date(profile.loginAt);
      sessionDate.textContent = d.toLocaleString("es-BO", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }

    renderAvatar(document.getElementById("profile-avatar"), profile);
  }

  function initAvatarUpload() {
    const input = document.getElementById("profile-photo-input");
    const btn = document.getElementById("profile-photo-btn");
    const avatar = document.getElementById("profile-avatar");

    if (!input || !avatar || !Auth) return;

    const openPicker = () => input.click();

    btn?.addEventListener("click", (e) => {
      e.preventDefault();
      openPicker();
    });

    avatar.addEventListener("click", () => {
      if (avatar.closest(".profile-avatar-wrap")) openPicker();
    });

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const session = Auth.getSession();
        if (!session) return;
        Auth.setAvatarUrl(session.id, dataUrl);
        const profile = Auth.getProfile();
        fillProfileCard(profile);
        Auth.renderUserMenu();
      };
      reader.readAsDataURL(file);
      input.value = "";
    });
  }

  function initProfilePage() {
    if (!document.body.classList.contains("legal-page-perfil")) return;
    if (!Auth || !Auth.requireAuth()) return;

    const profile = Auth.getProfile();
    if (!profile) return;

    fillProfileCard(profile);
    initAvatarUpload();
  }

  document.addEventListener("DOMContentLoaded", initProfilePage);
})();
