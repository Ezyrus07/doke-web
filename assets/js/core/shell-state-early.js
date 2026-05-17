/* Doke shell state early bootstrap.
   Runs in <head> before CSS so sidebar/workspace geometry starts in the
   same state used after app.js hydrates the shell. */
(function () {
  var root = document.documentElement;
  var storageKey = "doke.sidebar.collapsed";
  var READY = "doke-shell-state-ready";
  var COLLAPSED = "doke-sidebar-collapsed";
  var EXPANDED = "doke-sidebar-expanded";
  var LEGACY_WIDTH_VARS = [
    "--doke-home-desktop-gutter",
    "--doke-home-desktop-workspace",
    "--home-desktop-content-width"
  ];

  function isDesktopShell() {
    try {
      return window.matchMedia("(min-width: 1025px)").matches;
    } catch (error) {
      return true;
    }
  }

  function readCollapsed() {
    try {
      return window.localStorage.getItem(storageKey) === "true";
    } catch (error) {
      return false;
    }
  }

  function applyShellState() {
    var shouldCollapse = isDesktopShell() && readCollapsed();
    var sidebarWidth = shouldCollapse ? "96px" : "272px";

    root.classList.toggle(COLLAPSED, shouldCollapse);
    root.classList.toggle(EXPANDED, !shouldCollapse);
    root.classList.add(READY);

    root.style.setProperty("--doke-current-sidebar-width", sidebarWidth);
    root.style.setProperty("--sidebar-width", sidebarWidth);
    root.style.setProperty("--doke-desktop-sidebar-width", sidebarWidth);
    root.style.setProperty("--doke-app-sidebar-width", sidebarWidth);
    root.style.setProperty("--doke-app-shell-sidebar-width", sidebarWidth);
    root.style.setProperty("--doke-home-sidebar-width", sidebarWidth);
    LEGACY_WIDTH_VARS.forEach(function (name) {
      root.style.removeProperty(name);
    });
  }

  applyShellState();
  window.addEventListener("pageshow", applyShellState, { passive: true });
})();
