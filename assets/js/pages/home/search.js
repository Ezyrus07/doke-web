(function () {
  window.DokeHomeSearch = {
    create({ signal }) {
      return function initHomeSearch() {
        const searchData = window.DokeSearchData || {};
        const searchBox = document.querySelector("[data-searchbox]");
        const searchInput = document.querySelector("[data-search-input]") || document.querySelector("#main-site-search");
        const searchDropdown = document.querySelector("[data-search-dropdown]");
        const searchRecommendationList = document.querySelector("[data-search-recommendation-list]");
        const searchHistoryList = document.querySelector("[data-search-history-list]");
        const searchResultsList = document.querySelector("[data-search-results-list]");
        const searchResultsSection = document.querySelector("[data-search-results-section]");
        const searchHistorySection = document.querySelector("[data-search-history-section]");
        const searchRefineSection = document.querySelector("[data-search-refine-section]");
        const searchClearButton = document.querySelector("[data-search-clear]");
        const searchEmptyState = document.querySelector("[data-search-empty]");
        const searchPrimaryCta = document.querySelector(".home-search-hero__cta--primary");
        const searchRefineChips = [...document.querySelectorAll(".search-refine-chip")];
        const searchField = document.querySelector(".home-search-hero__field");

        const searchRecommendations = searchData.recommendations || [];
        const getSearchHistory = searchData.getSearchHistory || (() => []);
        const saveSearchHistory = searchData.saveSearchHistory || (() => {});
        const addSearchHistory = searchData.addSearchHistory || (() => {});
        const getSuggestionMatches = searchData.getSuggestionMatches || (() => []);

        const searchItemIcon = (type = "search") => {
          if (type === "history") {
            return '<svg viewBox="0 0 24 24"><path d="M12 7.5v5l3 2"></path><path d="M4.8 12a7.2 7.2 0 1 0 2.1-5.1"></path><path d="M4.8 5.7v3.6h3.6"></path></svg>';
          }
          return '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.2-4.2"></path></svg>';
        };

        let activeSearchIndex = -1;
        const isMobileSearchViewport = () => window.innerWidth <= 760;
        const shouldUseSearchDropdown = () => !isMobileSearchViewport();

        const syncSearchOverlayState = (query = "") => {
          document.body.classList.toggle(
            "home-search-has-query",
            isMobileSearchViewport() && String(query || "").trim().length >= 2
          );
        };

        const createSuggestionButton = ({ label, meta, badge, value, type = "search" }) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "search-suggestion";
          button.dataset.value = value || label;
          button.innerHTML = `
            <span class="search-suggestion__main">
              <span class="search-suggestion__icon" aria-hidden="true">${searchItemIcon(type)}</span>
              <span class="search-suggestion__text">
                <span class="search-suggestion__label">${label}</span>
                <span class="search-suggestion__meta">${meta}</span>
              </span>
            </span>
            <span class="search-suggestion__badge">${badge}</span>
          `;
          return button;
        };

        const renderRecommendationChips = () => {
          if (!searchRecommendationList) return;
          searchRecommendationList.innerHTML = "";
          searchRecommendations.forEach((item) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "search-chip";
            button.dataset.value = item;
            button.innerHTML = `${searchItemIcon()}<span>${item}</span>`;
            searchRecommendationList.appendChild(button);
          });
        };

        const syncDropdownSections = (query = "") => {
          const cleanQuery = String(query || "").trim();
          const hasRecommendations = !!searchRecommendationList?.children.length;
          const hasHistory = !!searchHistoryList?.children.length;
          const hasQuery = cleanQuery.length >= 2;
          const hasVisibleResults = !!searchResultsList?.children.length;

          const recommendationSection = searchRecommendationList?.closest(".search-dropdown__section");
          if (recommendationSection) {
            recommendationSection.hidden = !hasRecommendations;
          }

          if (searchHistorySection) {
            searchHistorySection.hidden = !hasHistory || hasQuery;
          }

          if (searchRefineSection) {
            searchRefineSection.hidden = !hasQuery;
          }

          if (searchResultsSection) {
            searchResultsSection.hidden = !hasQuery;
          }

          if (searchEmptyState) {
            searchEmptyState.hidden = hasVisibleResults || !hasQuery;
          }
        };

        const renderSearchHistory = () => {
          if (!searchHistoryList || !searchHistorySection) return;
          const history = getSearchHistory();
          searchHistoryList.innerHTML = "";

          if (!history.length) {
            searchHistorySection.hidden = true;
            return;
          }

          searchHistorySection.hidden = false;
          const visibleHistory = isMobileSearchViewport() ? history.slice(0, 2) : history;
          visibleHistory.forEach((item) => {
            searchHistoryList.appendChild(createSuggestionButton({
              label: item,
              meta: "Pesquisa recente",
              badge: "Histórico",
              value: item,
              type: "history"
            }));
          });
        };

        const renderSearchSuggestions = (query = "") => {
          if (!searchResultsList || !searchResultsSection) return;

          searchResultsList.innerHTML = "";
          activeSearchIndex = -1;
          if (searchEmptyState) searchEmptyState.hidden = true;

          const cleanQuery = String(query || "").trim();
          if (cleanQuery.length < 2) {
            syncDropdownSections(cleanQuery);
            return;
          }

          const matches = getSuggestionMatches(cleanQuery);
          if (!matches.length) {
            syncDropdownSections(cleanQuery);
            return;
          }

          matches.forEach((item) => {
            searchResultsList.appendChild(createSuggestionButton(item));
          });
          syncDropdownSections(cleanQuery);
        };

        const openSearchDropdown = () => {
          if (!searchDropdown || !searchInput) return;
          if (!shouldUseSearchDropdown()) {
            closeSearchDropdown();
            return;
          }
          searchDropdown.hidden = false;
          searchBox?.classList.add("is-search-open");
          searchField?.classList.add("is-search-open");
          searchInput.setAttribute("aria-expanded", "true");
          if (isMobileSearchViewport()) {
            document.body.classList.add("home-search-overlay-active");
          }
          syncSearchOverlayState(searchInput.value);
        };

        const closeSearchDropdown = () => {
          if (!searchDropdown || !searchInput) return;
          searchDropdown.hidden = true;
          searchBox?.classList.remove("is-search-open");
          searchField?.classList.remove("is-search-open");
          searchInput.setAttribute("aria-expanded", "false");
          activeSearchIndex = -1;
          document.body.classList.remove("home-search-overlay-active");
          document.body.classList.remove("home-search-has-query");
          document.body.classList.remove("home-mobile-filters-open");
        };

        const goToSearchResults = (value) => {
          const cleanValue = String(value || "").trim();
          if (!cleanValue) return;
          addSearchHistory(cleanValue);
          const nextUrl = new URL("resultados.html", window.location.href);
          nextUrl.searchParams.set("q", cleanValue);

          if (window.DokeNavigate) {
            window.DokeNavigate(nextUrl.toString());
            return;
          }

          window.location.href = nextUrl.toString();
        };

        const getTagSearchValue = (value) => String(value || "").replace(/^#/, "").trim();

        const goToAdDetails = () => {
          const nextUrl = new URL("detalhe-anuncio.html", window.location.href);

          if (window.DokeNavigate) {
            window.DokeNavigate(nextUrl.toString());
            return;
          }

          window.location.href = nextUrl.toString();
        };

        const getVisibleSearchOptions = () => {
          if (!searchDropdown || searchDropdown.hidden) return [];
          return [...searchDropdown.querySelectorAll(".search-suggestion:not([hidden])")];
        };

        renderRecommendationChips();
        renderSearchHistory();
        renderSearchSuggestions("");
        syncDropdownSections("");
        if (searchDropdown) searchDropdown.hidden = true;
        if (searchInput) {
          searchInput.setAttribute("aria-haspopup", "dialog");
          searchInput.setAttribute("aria-controls", "main-search-dropdown");
          searchInput.setAttribute("aria-expanded", "false");
        }

        if (searchBox && searchInput && searchDropdown) {
          const syncSearchDropdown = () => {
            if (!shouldUseSearchDropdown()) {
              closeSearchDropdown();
              return;
            }

            const query = searchInput.value.trim();
            renderSearchHistory();
            renderSearchSuggestions(query);
            syncDropdownSections(query);
            syncSearchOverlayState(query);

            if (!query.length) {
              const hasRecommendations = !!searchRecommendationList?.children.length;
              const hasHistory = !!searchHistoryList?.children.length;
              if (hasRecommendations || hasHistory) {
                openSearchDropdown();
                return;
              }
            }

            if (query.length >= 2) {
              openSearchDropdown();
              return;
            }

            closeSearchDropdown();
          };

          searchInput.addEventListener("focus", syncSearchDropdown, { signal });
          searchInput.addEventListener("click", syncSearchDropdown, { signal });
          searchInput.addEventListener("input", syncSearchDropdown, { signal });

          searchInput.addEventListener("keydown", (event) => {
            if (!shouldUseSearchDropdown()) return;
            const options = getVisibleSearchOptions();

            if (event.key === "ArrowDown" && options.length) {
              event.preventDefault();
              activeSearchIndex = Math.min(activeSearchIndex + 1, options.length - 1);
              options.forEach((option, index) => option.classList.toggle("is-active", index === activeSearchIndex));
              options[activeSearchIndex].scrollIntoView({ block: "nearest" });
            }

            if (event.key === "ArrowUp" && options.length) {
              event.preventDefault();
              activeSearchIndex = Math.max(activeSearchIndex - 1, 0);
              options.forEach((option, index) => option.classList.toggle("is-active", index === activeSearchIndex));
              options[activeSearchIndex].scrollIntoView({ block: "nearest" });
            }

            if (event.key === "Enter") {
              event.preventDefault();
              if (activeSearchIndex >= 0 && options[activeSearchIndex]) {
                goToSearchResults(options[activeSearchIndex].dataset.value || options[activeSearchIndex].textContent);
                return;
              }
              goToSearchResults(searchInput.value);
            }

            if (event.key === "Escape") {
              closeSearchDropdown();
            }
          }, { signal });

          searchDropdown.addEventListener("click", (event) => {
            if (!shouldUseSearchDropdown()) return;
            const suggestion = event.target.closest(".search-suggestion, .search-chip");
            if (!suggestion) return;
            goToSearchResults(suggestion.dataset.value || suggestion.textContent);
          }, { signal });

          searchRefineChips.forEach((chip) => {
            chip.addEventListener("click", () => {
              const label = chip.textContent?.trim();
              if (!label) return;
              searchInput.value = label;
              syncSearchDropdown();
              goToSearchResults(label);
            }, { signal });
          });

          document.addEventListener("click", (event) => {
            if (!event.target.closest("[data-searchbox]")) {
              closeSearchDropdown();
            }
          }, { signal });

          searchBox.addEventListener("submit", (event) => {
            event.preventDefault();
            goToSearchResults(searchInput.value);
          }, { signal });
        }

        if (searchPrimaryCta && searchInput) {
          searchPrimaryCta.addEventListener("click", (event) => {
            event.preventDefault();
            goToSearchResults(searchInput.value);
          }, { signal });
        }

        document.addEventListener("click", (event) => {
          const tag = event.target.closest(".service-card__tags span");
          if (!tag) return;

          event.preventDefault();
          goToSearchResults(getTagSearchValue(tag.textContent));
        }, { signal });

        document.addEventListener("click", (event) => {
          const card = event.target.closest(".service-card");
          if (!card) return;

          if (event.target.closest(".service-card__profile, .service-card__tags, .service-card__favorite")) {
            return;
          }

          event.preventDefault();
          goToAdDetails();
        }, { signal });

        window.addEventListener("resize", () => {
          if (!isMobileSearchViewport()) {
            document.body.classList.remove("home-search-overlay-active");
            document.body.classList.remove("home-search-has-query");
          } else if (searchDropdown && !searchDropdown.hidden) {
            document.body.classList.add("home-search-overlay-active");
            syncSearchOverlayState(searchInput?.value || "");
          }
        }, { signal });

        if (searchClearButton) {
          searchClearButton.addEventListener("click", () => {
            saveSearchHistory([]);
            renderSearchHistory();
          }, { signal });
        }
      };
    }
  };
})();
