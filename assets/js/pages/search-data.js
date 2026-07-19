window.DokeSearchData = (() => {
  const SEARCH_HISTORY_STORAGE_KEY = "doke.search.history";

  const recommendations = [
    "Eletricista 24h",
    "Diarista perto de mim",
    "Marceneiro sob medida",
    "Frete pequeno"
  ];

  const suggestionPool = [
    { label: "Eletricista residencial", meta: "Instalacao e reparo", badge: "Servico", value: "eletricista residencial" },
    { label: "Encanador urgente", meta: "Vazamentos e tubulacao", badge: "Servico", value: "encanador urgente" },
    { label: "Pintor profissional", meta: "Paredes e acabamento", badge: "Servico", value: "pintor profissional" },
    { label: "Marceneiro sob medida", meta: "Moveis planejados", badge: "Servico", value: "marceneiro sob medida" },
    { label: "Diarista semanal", meta: "Limpeza residencial", badge: "Servico", value: "diarista semanal" },
    { label: "Frete para mudanca", meta: "Transporte local", badge: "Servico", value: "frete para mudanca" },
    { label: "Aulas de ingles", meta: "Professor particular", badge: "Catégoria", value: "aulas de ingles" },
    { label: "Designer para logo", meta: "Criativo e branding", badge: "Profissional", value: "designer para logo" },
    { label: "Rua Maranhao, 343", meta: "Localizacao atual", badge: "Endereco", value: "Rua Maranhao, 343" }
  ];

  const servicePool = [];

  const userPool = [
    {
      id: "usr-carlos",
      name: "Carlos Andrade",
      handle: "@carlospintura",
      role: "Pintor residencial",
      location: "Centro, Belo Horizonte, MG",
      rating: 4.9,
      jobs: 128,
      avatarClass: "service-card__avatar--carlos",
      keywords: ["carlos", "pintor", "pintura", "acabamento", "residencial"]
    },
    {
      id: "usr-marcos",
      name: "Marcos Luz",
      handle: "@marcos24h",
      role: "Eletricista 24h",
      location: "Savassi, Belo Horizonte, MG",
      rating: 4.8,
      jobs: 96,
      avatarClass: "service-card__avatar--marcos",
      keywords: ["marcos", "eletricista", "eletrica", "24h", "manutencao"]
    },
    {
      id: "usr-elaine",
      name: "Elaine Santos",
      handle: "@elainepremium",
      role: "Diarista premium",
      location: "Funcionarios, Belo Horizonte, MG",
      rating: 4.9,
      jobs: 74,
      avatarClass: "service-card__avatar--elaine",
      keywords: ["elaine", "diarista", "limpeza", "casa", "faxina"]
    },
    {
      id: "usr-renata",
      name: "Renata Alves",
      handle: "@renataensina",
      role: "Professora particular",
      location: "Sion, Belo Horizonte, MG",
      rating: 4.9,
      jobs: 52,
      avatarClass: "service-card__avatar--renata",
      keywords: ["renata", "professora", "aulas", "reforco", "particular"]
    }
  ];

  const shortVideoPool = [
    {
      id: "vid-pintura",
      title: "Como renovar parede sem sujeira",
      author: "Carlos Andrade",
      description: "Dicas rápidas de pintura",
      views: "48 mil",
      durationShort: "0:32",
      mediaClass: "video-card--one",
      keywords: ["worker", "workers", "video", "pintura", "parede", "acabamento", "reforma", "carlos"]
    },
    {
      id: "vid-cozinha",
      title: "Antes e depois de cozinha planejada",
      author: "Studio Casa Viva",
      description: "Reforma e marcenaria",
      views: "36 mil",
      durationShort: "0:41",
      mediaClass: "video-card--two",
      keywords: ["worker", "workers", "video", "cozinha", "planejada", "marcenaria", "reforma", "antes e depois"]
    },
    {
      id: "vid-eletrica",
      title: "5 erros elétricos que custam caro",
      author: "Marcos Luz",
      description: "Dicas rápidas de elétrica",
      views: "52 mil",
      durationShort: "0:28",
      mediaClass: "video-card--three",
      keywords: ["worker", "workers", "video", "eletrica", "eletricista", "fiacao", "seguranca", "marcos"]
    },
    {
      id: "vid-limpeza",
      title: "Limpeza pós-obra em 40 segundos",
      author: "Elaine Santos",
      description: "Dicas rápidas de limpeza",
      views: "29 mil",
      durationShort: "0:24",
      mediaClass: "video-card--four",
      keywords: ["worker", "workers", "video", "limpeza", "pos-obra", "diarista", "faxina", "elaine"]
    }
  ];

  const beforeAfterPool = [
    {
      id: "ba-cozinha",
      title: "Cozinha com marcenaria sob medida",
      author: "Studio Casa Viva",
      rating: 4.9,
      previewId: "case-kitchen",
      visualClass: "comparison-card__visual--kitchen",
      likes: 142,
      comments: 28,
      saves: 36,
      keywords: ["cozinha", "marcenaria", "foto", "publicacao", "reforma"]
    },
    {
      id: "ba-sala",
      title: "Tour rápido da reforma",
      author: "Renato Acabamentos",
      rating: 4.9,
      previewId: "case-reforma",
      visualClass: "comparison-card__visual--reforma",
      likes: 98,
      comments: 19,
      saves: 22,
      keywords: ["reforma", "sala", "tour", "video", "acabamento", "antes", "depois"]
    },
    {
      id: "ba-banheiro",
      title: "Banheiro revitalizado sem quebra-quebra",
      author: "Renato Acabamentos",
      rating: 4.8,
      previewId: "case-bathroom",
      visualClass: "comparison-card__visual--bathroom",
      likes: 176,
      comments: 31,
      saves: 45,
      keywords: ["banheiro", "reforma", "acabamento", "antes", "depois"]
    }
  ];

  const quickFilters = [
    "Com garantia",
    "Emergencia",
    "Disponivel hoje",
    "Perto de mim"
  ];

  const catégories = [
    "Eletricista",
    "Encanador",
    "Pintura",
    "Limpeza",
    "Frete",
    "Tecnologia",
    "Aulas",
    "Beleza",
    "Reforma",
    "Montagem"
  ];

  const locationOptions = {
    statés: ["MG", "SP", "RJ"],
    citiesByStaté: {
      MG: ["Belo Horizonte", "Contagem", "Nova Lima"],
      SP: ["São Paulo", "Campinas"],
      RJ: ["Rio de Janeiro", "Niteroi"]
    },
    neighborhoodsByCity: {
      "Belo Horizonte": [
        "Belvedere",
        "Buritis",
        "Centro",
        "Funcionarios",
        "Lourdes",
        "Mangabeiras",
        "Prado",
        "Santo Agostinho",
        "Savassi",
        "Sion"
      ],
      Contagem: ["Eldorado", "Inconfidentes"],
      "Nova Lima": ["Vila da Serra"],
      "São Paulo": ["Pinheiros", "Moema"],
      Campinas: ["Cambuí", "Taquaral"],
      "Rio de Janeiro": ["Botafogo", "Barra da Tijuca"],
      Niteroi: ["Icarai", "Charitas"]
    },
    cepLookup: {
      "30130-110": { staté: "MG", city: "Belo Horizonte", neighborhood: "Centro" },
      "30140-071": { staté: "MG", city: "Belo Horizonte", neighborhood: "Funcionarios" },
      "30380-435": { staté: "MG", city: "Belo Horizonte", neighborhood: "Belvedere" },
      "30350-540": { staté: "MG", city: "Belo Horizonte", neighborhood: "Mangabeiras" },
      "30411-186": { staté: "MG", city: "Belo Horizonte", neighborhood: "Prado" },
      "30380-000": { staté: "MG", city: "Belo Horizonte", neighborhood: "Savassi" }
    }
  };

  const normalize = (value = "") => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const getSearchHistory = () => {
    try {
      const raw = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 4) : [];
    } catch (error) {
      return [];
    }
  };

  const saveSearchHistory = (items) => {
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(items.filter(Boolean).slice(0, 4))
    );
  };

  const addSearchHistory = (value) => {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return;
    const nextItems = getSearchHistory().filter((item) => normalize(item) !== normalize(cleanValue));
    nextItems.unshift(cleanValue);
    saveSearchHistory(nextItems);
  };

  const getSuggestionMatches = (query = "") => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];

    const baseMatches = suggestionPool
      .filter((item) => normalize(`${item.label} ${item.meta} ${item.value}`).includes(normalizedQuery))
      .slice(0, 3);

    const userMatches = userPool
      .filter((item) => normalize(`${item.name} ${item.handle} ${item.role} ${item.location} ${item.keywords.join(" ")}`).includes(normalizedQuery))
      .slice(0, 2)
      .map((item) => ({
        label: item.name,
        meta: `${item.role} • ${item.location}`,
        badge: "Usuario",
        value: item.name
      }));

    const workerMatches = shortVideoPool
      .filter((item) => normalize(`${item.title} ${item.author} ${item.keywords.join(" ")}`).includes(normalizedQuery))
      .slice(0, 2)
      .map((item) => ({
        label: item.title,
        meta: `${item.author} • Worker em vídeo`,
        badge: "Worker",
        value: item.title
      }));

    return [...baseMatches, ...workerMatches, ...userMatches].slice(0, 6);
  };

  const getUserMatches = (query = "") => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];

    return userPool.filter((item) => normalize(
      `${item.name} ${item.handle} ${item.role} ${item.location} ${item.keywords.join(" ")}`
    ).includes(normalizedQuery));
  };

  const getShortVideoMatches = (query = "") => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];

    return shortVideoPool.filter((item) => normalize(
      `${item.title} ${item.author} ${item.keywords.join(" ")}`
    ).includes(normalizedQuery));
  };

  const getBeforeAfterMatches = (query = "") => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];
    if (normalizedQuery.includes("antes e depois") || normalizedQuery.includes("antes depois")) {
      return beforeAfterPool;
    }

    return beforeAfterPool.filter((item) => normalize(
      `${item.title} ${item.author} ${item.keywords.join(" ")}`
    ).includes(normalizedQuery));
  };

  const getWorkerCardMeta = (item = {}) => {
    const author = String(item.author || item.title || "Workers").trim();
    const initials = author
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "WK";

    return {
      badgeLabel: item.badgeLabel || "Workers",
      author,
      description: item.description || item.title || "Dicas rápidas",
      views: item.views || "48 mil",
      durationShort: item.durationShort || item.duration || "0:32",
      avatarInitials: item.avatarInitials || initials
    };
  };

  const getServiceMatches = (query = "", filters = {}) => {
    const normalizedQuery = normalize(query.trim());

    return servicePool.filter((item) => {
      const haystack = normalize([
        item.title,
        item.catégory,
        item.location,
        item.region,
        item.badge,
        ...item.tags,
        ...item.keywords
      ].join(" "));

      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const catégoryFilters = Array.isArray(filters.catégories) ? filters.catégories.filter(Boolean) : [];
      const matchesCatégory = !catégoryFilters.length
        || catégoryFilters.some((catégory) => normalize(item.catégory).includes(normalize(catégory)));
      const matchesRegion = !filters.region || normalize(item.region).includes(normalize(filters.region));
      const matchesStaté = !filters.staté || normalize(item.staté).includes(normalize(filters.staté));
      const matchesCity = !filters.city || normalize(item.city).includes(normalize(filters.city));
      const matchesNeighborhood = !filters.neighborhood || normalize(item.neighborhood).includes(normalize(filters.neighborhood));
      const matchesGuarantee = !filters.guaranteed || item.guaranteed;
      const matchesEmergency = !filters.emergency || item.emergency;
      const matchesOnline = !filters.online || item.online;
      const matchesToday = !filters.availableToday || item.availableToday;
      const matchesRating = !filters.minRating || item.rating >= Number(filters.minRating);

      return matchesQuery
        && matchesCatégory
        && matchesRegion
        && matchesStaté
        && matchesCity
        && matchesNeighborhood
        && matchesGuarantee
        && matchesEmergency
        && matchesOnline
        && matchesToday
        && matchesRating;
    });
  };

  return {
    SEARCH_HISTORY_STORAGE_KEY,
    recommendations,
    catégories,
    locationOptions,
    suggestionPool,
    servicePool,
    userPool,
    shortVideoPool,
    beforeAfterPool,
    quickFilters,
    normalize,
    getSearchHistory,
    saveSearchHistory,
    addSearchHistory,
    getSuggestionMatches,
    getServiceMatches,
    getUserMatches,
    getShortVideoMatches,
    getBeforeAfterMatches,
    getWorkerCardMeta
  };
})();
