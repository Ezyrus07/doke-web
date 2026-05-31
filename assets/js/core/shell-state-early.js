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
      return (window.innerWidth || root.clientWidth || 0) >= 1025;
    }
  }

  function isMobileRuntime() {
    try {
      return window.matchMedia("(max-width: 760px)").matches;
    } catch (error) {
      return (window.innerWidth || root.clientWidth || 0) <= 760;
    }
  }

  function syncViewportContract() {
    var viewportHeight = window.innerHeight || root.clientHeight || 0;
    var viewportWidth = window.innerWidth || root.clientWidth || 0;
    var scrollbarWidth = Math.max(0, viewportWidth - root.clientWidth);
    var mobile = isMobileRuntime();

    root.classList.toggle("doke-js-mobile", mobile);
    root.classList.toggle("doke-js-desktop", !mobile);
    root.style.setProperty("--doke-js-vh", ((viewportHeight || 0) * 0.01).toFixed(2) + "px");
    root.style.setProperty("--doke-window-width", viewportWidth + "px");
    root.style.setProperty("--doke-layout-width", Math.max(0, viewportWidth - scrollbarWidth) + "px");
    root.style.setProperty("--doke-scrollbar-width", scrollbarWidth + "px");
  }

  function readCollapsed() {
    try {
      return window.localStorage.getItem(storageKey) === "true";
    } catch (error) {
      return false;
    }
  }

  function applyShellState() {
    var desktopShell = isDesktopShell();
    var shouldCollapse = desktopShell && readCollapsed();
    var sidebarWidth = desktopShell ? (shouldCollapse ? "96px" : "272px") : "0px";

    syncViewportContract();
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
  window.addEventListener("resize", applyShellState, { passive: true });
  window.addEventListener("orientationchange", applyShellState, { passive: true });
})();
