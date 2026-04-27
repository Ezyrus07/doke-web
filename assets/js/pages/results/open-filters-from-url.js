(() => {
  const key = "__DOKE_RESULTS_OPEN_FILTERS_FROM_URL__";
  if (window[key]) return;
  window[key] = true;

  const params = new URLSearchParams(window.location.search || "");
  const wantsFiltersOpen = ["open", "1", "true", "yes"].includes(String(params.get("filters") || "").toLowerCase());
  if (!wantsFiltersOpen) return;

  const openFilters = () => {
    const button = document.querySelector("[data-results-filters-open]");
    const layout = document.querySelector("[data-results-layout]");
    const backdrop = document.querySelector("[data-results-filters-backdrop]");

    document.body.classList.add("results-filters-open", "results-filters-open-from-home");
    if (button instanceof HTMLElement) button.setAttribute("aria-expanded", "true");
    if (layout instanceof HTMLElement) layout.classList.remove("is-filters-collapsed");
    if (backdrop instanceof HTMLElement && window.innerWidth <= 960) backdrop.hidden = false;
  };

  const schedule = () => {
    openFilters();
    window.setTimeout(openFilters, 80);
    window.setTimeout(openFilters, 260);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();
