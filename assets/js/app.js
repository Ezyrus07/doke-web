/* Global shell interactions: sidebar, theme, auth avatar/profile menu. */
const body = document.body;
const toggleButton = document.querySelector("[data-sidebar-toggle]");
const collapseButton = document.querySelector("[data-sidebar-collapse]");
const scrim = document.querySelector("[data-sidebar-scrim]");
const themeToggleButtons = document.querySelectorAll("[data-theme-toggle]");
const sidebarLogoutButton = document.querySelector("[data-sidebar-logout]");
const profileMenuToggle = document.querySelector("[data-profile-menu-toggle]");
const profileMenu = document.querySelector("[data-profile-menu]");
const profileLogoutButton = document.querySelector("[data-profile-logout]");
const topbar = document.querySelector(".topbar");
const SIDEBAR_STORAGE_KEY = "doke.sidebar.collapsed";
const THEME_STORAGE_KEY = "doke.theme";

if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") {
  body.classList.add("sidebar-collapsed");
}

if (window.localStorage.getItem(THEME_STORAGE_KEY) === "dark") {
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

const authService = window.DokeAuth || null;

if (authService) {
  const avatar = document.querySelector(".avatar");
  const session = authService.getSession();

  if (avatar) {
    if (session && session.user) {
      avatar.textContent = session.user.initials || "DK";
      avatar.title = session.user.email || session.user.phone || session.user.name;
    } else {
      avatar.textContent = "DK";
      avatar.title = "Conta Doke";
    }
  }

  const profileHandle = document.querySelector(".profile-dropdown__header");
  if (profileHandle) {
    if (session && session.user) {
      const sourceName = session.user.name || session.user.email || session.user.phone || "gabriel";
      const handle = String(sourceName)
        .split("@")[0]
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      profileHandle.textContent = `@${handle || "gabriel"}`;
    } else {
      profileHandle.textContent = "@gabriel";
    }
  }
}

if (profileMenuToggle && profileMenu) {
  const closeProfileMenu = () => {
    profileMenu.hidden = true;
    profileMenuToggle.setAttribute("aria-expanded", "false");
  };

  const openProfileMenu = () => {
    profileMenu.hidden = false;
    profileMenuToggle.setAttribute("aria-expanded", "true");
  };

  profileMenuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (profileMenu.hidden === false) {
      closeProfileMenu();
    } else {
      openProfileMenu();
    }
  });

  profileMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".topbar-profile")) {
      closeProfileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProfileMenu();
    }
  });
}

if (profileLogoutButton && sidebarLogoutButton) {
  profileLogoutButton.addEventListener("click", () => {
    sidebarLogoutButton.click();
  });
}


if (topbar) {
  let ticking = false;
  const syncTopbarScrollState = () => {
    topbar.classList.toggle("is-scrolled", window.scrollY > 18);
    ticking = false;
  };

  syncTopbarScrollState();
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(syncTopbarScrollState);
      ticking = true;
    }
  }, { passive: true });
}
