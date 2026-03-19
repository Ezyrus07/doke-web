const body = document.body;
const toggleButton = document.querySelector("[data-sidebar-toggle]");
const collapseButton = document.querySelector("[data-sidebar-collapse]");
const scrim = document.querySelector("[data-sidebar-scrim]");
const themeToggleButtons = document.querySelectorAll("[data-theme-toggle]");
const sidebarLogoutButton = document.querySelector("[data-sidebar-logout]");
const sidebarLogoutLabel = sidebarLogoutButton?.querySelector(".nav-link__start > span:last-child") || null;
const SIDEBAR_STORAGE_KEY = "doke.sidebar.collapsed";
const THEME_STORAGE_KEY = "doke.theme";

if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") {
  body.classList.add("sidebar-collapsed");
}

const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
if (savedTheme === "dark") {
  body.classList.add("theme-dark");
}

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    body.classList.toggle("sidebar-open");
  });
}

if (collapseButton) {
  collapseButton.addEventListener("click", () => {
    body.classList.toggle("sidebar-collapsed");
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      body.classList.contains("sidebar-collapsed") ? "true" : "false"
    );
  });
}

if (scrim) {
  scrim.addEventListener("click", () => {
    body.classList.remove("sidebar-open");
  });
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) {
    body.classList.remove("sidebar-open");
  }
});

themeToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    body.classList.toggle("theme-dark");
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      body.classList.contains("theme-dark") ? "dark" : "light"
    );
  });
});

document.querySelectorAll("[data-chip-group]").forEach((group) => {
  group.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    if (chip.dataset.locked === "true") return;

    if (group.dataset.mode === "single") {
      group.querySelectorAll(".chip").forEach((item) => item.classList.remove("is-active"));
      chip.classList.add("is-active");
      return;
    }

    chip.classList.toggle("is-active");
  });
});

const authService = window.DokeAuth || null;

if (authService) {
  const topbarRight = document.querySelector(".topbar__right");
  const topbarMeta = document.querySelector(".topbar__meta, .topbar-status");
  const avatar = document.querySelector(".avatar");
  const session = authService.getSession();

  if (topbarRight) {
    let authAction = topbarRight.querySelector("[data-auth-action]");

    if (!authAction) {
      authAction = document.createElement("button");
      authAction.type = "button";
      authAction.className = "button button--ghost button--sm";
      authAction.setAttribute("data-auth-action", "true");
      topbarRight.insertBefore(authAction, avatar || null);
    }

    if (session && session.user) {
      authAction.textContent = "Sair";
      const signOut = () => {
        authService.signOut();
        window.location.reload();
      };
      authAction.addEventListener("click", signOut);
      if (sidebarLogoutButton) {
        if (sidebarLogoutLabel) sidebarLogoutLabel.textContent = "Sair";
        sidebarLogoutButton.addEventListener("click", signOut);
      }

      if (topbarMeta) {
        topbarMeta.innerHTML = `
          <span class="badge-dot" style="color: var(--color-secondary-strong);">Sessao ativa</span>
          <strong>${session.user.name}</strong>
        `;
      }

      if (avatar) {
        avatar.textContent = session.user.initials || "DK";
        avatar.title = session.user.email || session.user.phone || session.user.name;
      }
    } else {
      authAction.textContent = "Entrar";
      const signIn = () => {
        window.location.href = "auth/login.html";
      };
      authAction.addEventListener("click", signIn);
      if (sidebarLogoutButton) {
        if (sidebarLogoutLabel) sidebarLogoutLabel.textContent = "Entrar";
        sidebarLogoutButton.addEventListener("click", signIn);
      }

      if (topbarMeta) {
        topbarMeta.innerHTML = `
          <span class="badge-dot" style="color: var(--color-primary-strong);">Visitante</span>
          <strong>Entre para acessar</strong>
        `;
      }

      if (avatar) {
        avatar.textContent = "DK";
        avatar.title = "Conta Doke";
      }
    }
  }
}
