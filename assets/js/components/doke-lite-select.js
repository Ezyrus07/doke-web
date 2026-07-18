/*
 * DokeLiteSelect
 * Lightweight custom select for Doke forms.
 * Top-layer safe: when used inside <dialog>, the dropdown is appended inside the dialog,
 * not document.body. This prevents the menu from disappearing behind the modal.
 */
(() => {
  const SELECTOR = "select[data-doke-select], .profile-budget-modal select";
  let activeSelect = null;
  let activeTrigger = null;
  let menu = null;

  const getMenuHost = (select) =>
    select?.closest("dialog") ||
    select?.closest(".wallet-modal") ||
    select?.closest(".doke-overlay") ||
    select?.closest(".profile-budget-modal") ||
    document.body;

  const createMenu = (select) => {
    const host = getMenuHost(select);

    if (!menu) {
      menu = document.createElement("div");
      menu.className = "doke-select-menu";
      menu.hidden = true;
      menu.setAttribute("role", "listbox");
    }

    if (menu.parentElement !== host) {
      host.appendChild(menu);
    }

    return menu;
  };

  const getSelectedLabel = (select) => {
    const selected = select.options[select.selectedIndex];
    return selected?.textContent?.trim() || select.options[0]?.textContent?.trim() || "Selecione";
  };

  const syncTrigger = (select) => {
    const root = select.closest("[data-doke-select-root]");
    const label = root?.querySelector("[data-doke-select-label]");
    if (!label) return;

    label.textContent = getSelectedLabel(select);
    root.classList.toggle("has-value", Boolean(select.value));
  };

  const closeMenu = () => {
    if (menu) {
      menu.hidden = true;
      menu.innerHTML = "";
      menu.removeAttribute("style");
    }

    document.querySelectorAll(".doke-select.is-open").forEach((node) => {
      node.classList.remove("is-open");
      node.querySelector(".doke-select__trigger")?.setAttribute("aria-expanded", "false");
    });

    activeSelect = null;
    activeTrigger = null;
  };

  const placeMenu = () => {
    if (!menu || !activeTrigger || menu.hidden || !activeSelect) return;

    const triggerRect = activeTrigger.getBoundingClientRect();
    const host = getMenuHost(activeSelect);
    const hostRect = host === document.body
      ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
      : host.getBoundingClientRect();

    const viewportPadding = 12;
    const gap = 8;
    const targetWidth = triggerRect.width;
    const maxWanted = Math.min(menu.scrollHeight || 240, 260);
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding - gap;
    const spaceAbove = triggerRect.top - viewportPadding - gap;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;

    const viewportTop = openUp
      ? Math.max(viewportPadding, triggerRect.top - gap - Math.min(maxWanted, spaceAbove))
      : Math.min(window.innerHeight - viewportPadding - 44, triggerRect.bottom + gap);

    const viewportLeft = Math.min(
      Math.max(viewportPadding, triggerRect.left),
      Math.max(viewportPadding, window.innerWidth - targetWidth - viewportPadding)
    );

    const left = host === document.body ? viewportLeft : viewportLeft - hostRect.left;
    const top = host === document.body ? viewportTop : viewportTop - hostRect.top;

    menu.classList.toggle("is-up", openUp);
    menu.style.width = `${Math.round(targetWidth)}px`;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.maxHeight = `${Math.round(Math.max(128, Math.min(260, openUp ? spaceAbove : spaceBelow)))}px`;
  };

  const openMenu = (select, trigger) => {
    const root = select.closest("[data-doke-select-root]");
    const menuNode = createMenu(select);

    closeMenu();

    activeSelect = select;
    activeTrigger = trigger;

    root?.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");

    menuNode.innerHTML = "";

    [...select.options].forEach((nativeOption, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "doke-select-menu__option";
      item.dataset.dokeSelectValue = nativeOption.value;
      item.textContent = nativeOption.textContent;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(nativeOption.value === select.value));

      if (nativeOption.disabled) {
        item.disabled = true;
        item.setAttribute("aria-disabled", "true");
      }

      if (nativeOption.value === select.value) {
        item.classList.add("is-selected");
      }

      if (index === 0 && nativeOption.value === "") {
        item.classList.add("is-placeholder");
      }

      item.addEventListener("click", () => {
        if (nativeOption.disabled) return;
        select.selectedIndex = index;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        syncTrigger(select);
        closeMenu();
      });

      menuNode.appendChild(item);
    });

    menuNode.hidden = false;
    placeMenu();
  };

  const enhance = (select) => {
    if (!select || select.dataset.dokeLiteSelectReady === "true") return;
    if (select.multiple) return;

    let root = select.closest("[data-doke-select-root]");
    let trigger = root?.querySelector(":scope > .doke-select__trigger");

    if (!root) {
      root = document.createElement("div");
      root.className = "doke-select";
      root.dataset.dokeSelectRoot = "true";
      select.parentNode.insertBefore(root, select);
      root.appendChild(select);
    } else {
      root.classList.add("doke-select");
      root.dataset.dokeSelectRoot = "true";
    }

    select.dataset.dokeLiteSelectReady = "true";
    select.classList.add("doke-select__native");
    select.classList.remove("doke-select");

    if (!trigger) {
      trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "doke-select__trigger";
      trigger.innerHTML = `
        <span class="doke-select__value" data-doke-select-label></span>
        <span class="doke-select__chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"></path></svg>
        </span>
      `;
      root.appendChild(trigger);
    }

    trigger.type = "button";
    trigger.classList.add("doke-select__trigger");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    if (!trigger.querySelector("[data-doke-select-label]")) {
      const label = document.createElement("span");
      label.className = "doke-select__value";
      label.dataset.dokeSelectLabel = "";
      trigger.prepend(label);
    }

    if (!trigger.querySelector(".doke-select__chevron")) {
      const chevron = document.createElement("span");
      chevron.className = "doke-select__chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.innerHTML = '<svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"></path></svg>';
      trigger.appendChild(chevron);
    }

    syncTrigger(select);

    if (trigger.dataset.dokeLiteSelectBound === "true") return;
    trigger.dataset.dokeLiteSelectBound = "true";

    trigger.addEventListener("click", () => {
      if (activeSelect === select) {
        closeMenu();
        return;
      }

      openMenu(select, trigger);
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMenu(select, trigger);
      }
    });

    select.addEventListener("change", () => syncTrigger(select));
  };

  const enhanceAll = (root = document) => {
    root.querySelectorAll(SELECTOR).forEach(enhance);
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest(".doke-select") || event.target.closest(".doke-select-menu")) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", placeMenu, { passive: true });
  window.addEventListener("scroll", placeMenu, { passive: true });

  window.DokeLiteSelect = { enhance, enhanceAll, closeMenu };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => enhanceAll(), { once: true });
  } else {
    enhanceAll();
  }
})();
