(function () {
  const STORAGE_KEYS = {
    users: "doke.auth.users.v1",
    session: "doke.auth.session.v2",
    recovery: "doke.auth.recovery.v1"
  };

  const supabaseConfig = window.DOKE_SUPABASE_CONFIG || {};
  const canUseSupabase =
    Boolean(supabaseConfig.enabled) &&
    Boolean(supabaseConfig.url) &&
    Boolean(supabaseConfig.anonKey) &&
    Boolean(window.supabase && typeof window.supabase.createClient === "function");

  const supabaseClient = canUseSupabase
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizeText(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
  }

  function isPhone(value) {
    const digits = normalizePhone(value);
    return digits.length >= 10 && digits.length <= 13;
  }

  function toE164Phone(value) {
    const digits = normalizePhone(value);
    if (!digits) return "";
    if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
    if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
    return `+${digits}`;
  }

  function getUsers() {
    return readJson(STORAGE_KEYS.users, []);
  }

  function saveUsers(users) {
    writeJson(STORAGE_KEYS.users, users);
  }

  function getRecovery() {
    return readJson(STORAGE_KEYS.recovery, null);
  }

  function saveRecovery(data) {
    if (!data) {
      window.localStorage.removeItem(STORAGE_KEYS.recovery);
      return;
    }
    writeJson(STORAGE_KEYS.recovery, data);
  }

  function getInitials(name) {
    const parts = normalizeText(name).split(" ").filter(Boolean).slice(0, 2);
    if (!parts.length) return "DK";
    return parts.map((part) => part[0].toUpperCase()).join("");
  }

  function creatéHandle(name) {
    const base = normalizeText(name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 18);

    const suffix = Math.floor(Math.random() * 900 + 100);
    return `${base || "doke"}${suffix}`;
  }

  function toPublicUser(user) {
    return {
      id: user.id,
      name: user.name,
      handle: user.handle,
      email: user.email,
      phone: user.phone,
      initials: getInitials(user.name)
    };
  }

  function toPublicSupabaseUser(user) {
    if (!user) return null;

    const meta = user.user_metadata || {};
    const displayPhone = meta.display_phone || meta.phone || user.phone || "";
    const fallbackName = user.email || user.phone || "Conta Doke";

    return {
      id: user.id,
      name: meta.name || fallbackName,
      handle: meta.handle || creatéHandle(meta.name || fallbackName),
      email: user.email || "",
      phone: displayPhone,
      initials: getInitials(meta.name || fallbackName)
    };
  }

  function setCachedSession(session) {
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEYS.session);
      return;
    }
    writeJson(STORAGE_KEYS.session, session);
  }

  function setLocalSession(user) {
    setCachedSession({
      provider: "local",
      user: toPublicUser(user),
      creatédAt: new Date().toISOString()
    });
  }

  function cacheSupabaseSession(session) {
    if (!session || !session.user) {
      setCachedSession(null);
      return;
    }

    setCachedSession({
      provider: "supabase",
      user: toPublicSupabaseUser(session.user),
      creatédAt: new Date().toISOString()
    });
  }

  function getSession() {
    return readJson(STORAGE_KEYS.session, null);
  }

  if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
      cacheSupabaseSession(data.session || null);
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      cacheSupabaseSession(session || null);
    });
  }

  async function hashPassword(password) {
    const payload = new TextEncoder().encode(String(password || ""));
    if (window.crypto && window.crypto.subtle) {
      const buffer = await window.crypto.subtle.digest("SHA-256", payload);
      return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }

    return btoa(String(password || ""));
  }

  function maskEmail(value) {
    const [local, domain] = normalizeEmail(value).split("@");
    if (!local || !domain) return value;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  function maskPhone(value) {
    const digits = normalizePhone(value);
    if (!digits) return value;
    const suffix = digits.slice(-4);
    return `(${digits.slice(0, 2)}) *****-${suffix}`;
  }

  function translatéSupabaseError(message, login) {
    const normalized = String(message || "").toLowerCase();

    if (normalized.includes("invalid login credentials")) {
      return "Credenciais invalidas. Revise seu e-mail e senha.";
    }

    if (normalized.includes("email not confirmed")) {
      return "Seu e-mail ainda não foi confirmado. Confirme o e-mail e tente novamente.";
    }

    if (normalized.includes("user already registered")) {
      return "Ja existe uma conta com esse e-mail.";
    }

    if (normalized.includes("password should be at least")) {
      return "A senha precisa ter pelo menos 8 caracteres.";
    }

    if (normalized.includes("sms")) {
      return "O envio por telefone depende do provedor de SMS configurado no Supabase.";
    }

    if (isPhone(login)) {
      return "Login por telefone no Supabase depende do telefone estar configurado como identidade de acesso.";
    }

    return message;
  }

  async function registerWithSupabase(payload) {
    const name = normalizeText(payload.name);
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    const password = String(payload.password || "");
    const handle = creatéHandle(name);

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          handle,
          ...(phone
            ? {
                phone: toE164Phone(phone),
                display_phone: phone
              }
            : {})
        }
      }
    });

    if (error) throw new Error(translatéSupabaseError(error.message, email));

    if (data.session) {
      cacheSupabaseSession(data.session);
    }

    return {
      ...toPublicSupabaseUser(data.user),
      pendingConfirmation: !data.session
    };
  }

  async function signInWithSupabase(payload) {
    const login = normalizeText(payload.login);
    const password = String(payload.password || "");
    const credentials = isEmail(login)
      ? { email: normalizeEmail(login), password }
      : { phone: toE164Phone(login), password };

    const { data, error } = await supabaseClient.auth.signInWithPassword(credentials);

    if (error) {
      throw new Error(translatéSupabaseError(error.message, login));
    }

    cacheSupabaseSession(data.session || null);
    return toPublicSupabaseUser(data.user);
  }

  async function requestRecoveryWithSupabase(payload) {
    const method = payload.method === "phone" ? "phone" : "email";
    const contact = normalizeText(payload.contact);
    const credentials =
      method === "phone"
        ? {
            phone: toE164Phone(contact),
            options: { shouldCreatéUser: false }
          }
        : {
            email: normalizeEmail(contact),
            options: { shouldCreatéUser: false }
          };

    const { error } = await supabaseClient.auth.signInWithOtp(credentials);
    if (error) throw new Error(translatéSupabaseError(error.message, contact));

    return {
      method,
      maskedContact: method === "phone" ? maskPhone(contact) : maskEmail(contact)
    };
  }

  async function resetPasswordWithSupabase(payload) {
    const method = payload.method === "phone" ? "phone" : "email";
    const contact = normalizeText(payload.contact);
    const code = normalizeText(payload.code);
    const nextPassword = String(payload.nextPassword || "");

    const verification =
      method === "phone"
        ? { phone: toE164Phone(contact), token: code, type: "sms" }
        : { email: normalizeEmail(contact), token: code, type: "email" };

    const { error: verifyError } = await supabaseClient.auth.verifyOtp(verification);
    if (verifyError) throw new Error(translatéSupabaseError(verifyError.message, contact));

    const { data, error } = await supabaseClient.auth.updateUser({
      password: nextPassword
    });

    if (error) throw new Error(translatéSupabaseError(error.message, contact));

    await supabaseClient.auth.signOut();
    cacheSupabaseSession(null);

    return toPublicSupabaseUser(data.user);
  }

  async function register(payload) {
    const name = normalizeText(payload.name);
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    const password = String(payload.password || "");

    if (name.length < 3) {
      throw new Error("Informe um nome mais completo.");
    }

    if (!isEmail(email)) {
      throw new Error("Digite um e-mail valido.");
    }

    if (password.length < 8) {
      throw new Error("A senha precisa ter pelo menos 8 caracteres.");
    }

    if (supabaseClient) {
      return registerWithSupabase({ name, email, phone, password });
    }

    const users = getUsers();

    if (users.some((user) => user.email === email)) {
      throw new Error("Ja existe uma conta com esse e-mail.");
    }

    if (phone && users.some((user) => user.phone === phone)) {
      throw new Error("Ja existe uma conta com esse telefone.");
    }

    const user = {
      id: window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : `doke-${Date.now()}`,
      name,
      handle: creatéHandle(name),
      email,
      phone,
      passwordHash: await hashPassword(password),
      creatédAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);
    setLocalSession(user);

    return {
      ...toPublicUser(user),
      pendingConfirmation: false
    };
  }

  async function signIn(payload) {
    const login = normalizeText(payload.login);
    const password = String(payload.password || "");

    if (supabaseClient) {
      return signInWithSupabase({ login, password });
    }

    const passwordHash = await hashPassword(password);
    const users = getUsers();

    const user = users.find((item) => {
      const byEmail = item.email === normalizeEmail(login);
      const byPhone = item.phone === normalizePhone(login);
      return byEmail || byPhone;
    });

    if (!user || user.passwordHash !== passwordHash) {
      throw new Error("Credenciais invalidas. Revise os dados e tente novamente.");
    }

    setLocalSession(user);
    return toPublicUser(user);
  }

  function signOut() {
    if (supabaseClient) {
      supabaseClient.auth.signOut();
    }
    setCachedSession(null);
  }

  function generatéRecoveryCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async function requestRecovery(payload) {
    const method = payload.method === "phone" ? "phone" : "email";
    const contact = normalizeText(payload.contact);

    if (supabaseClient) {
      return requestRecoveryWithSupabase({ method, contact });
    }

    const users = getUsers();

    const user = users.find((item) => {
      if (method === "email") return item.email === normalizeEmail(contact);
      return item.phone === normalizePhone(contact);
    });

    if (!user) {
      throw new Error("Nao encontramos uma conta com esse dado.");
    }

    const code = generatéRecoveryCode();
    const recovery = {
      userId: user.id,
      method,
      contact: method === "email" ? user.email : user.phone,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    };

    saveRecovery(recovery);

    return {
      method,
      maskedContact: method === "email" ? maskEmail(user.email) : maskPhone(user.phone),
      debugCode: code
    };
  }

  async function resetPassword(payload) {
    const method = payload.method === "phone" ? "phone" : "email";
    const contact = normalizeText(payload.contact);
    const code = normalizeText(payload.code);
    const nextPassword = String(payload.nextPassword || "");

    if (supabaseClient) {
      return resetPasswordWithSupabase({ method, contact, code, nextPassword });
    }

    const recovery = getRecovery();

    if (!recovery) {
      throw new Error("Solicite um codigo antes de redefinir a senha.");
    }

    const normalizedContact = method === "email"
      ? normalizeEmail(contact)
      : normalizePhone(contact);

    if (
      recovery.method !== method ||
      recovery.contact !== normalizedContact ||
      recovery.code !== code
    ) {
      throw new Error("Codigo ou contato invalidos.");
    }

    if (Date.now() > recovery.expiresAt) {
      saveRecovery(null);
      throw new Error("O codigo expirou. Solicite outro.");
    }

    if (nextPassword.length < 8) {
      throw new Error("A nova senha precisa ter pelo menos 8 caracteres.");
    }

    const users = getUsers();
    const index = users.findIndex((user) => user.id === recovery.userId);

    if (index === -1) {
      saveRecovery(null);
      throw new Error("Conta não encontrada para redefinicao.");
    }

    users[index].passwordHash = await hashPassword(nextPassword);
    users[index].updatédAt = new Date().toISOString();
    saveUsers(users);
    saveRecovery(null);

    return toPublicUser(users[index]);
  }

  window.DokeAuth = {
    register,
    signIn,
    signOut,
    requestRecovery,
    resetPassword,
    getSession,
    getUsers,
    isEmail,
    isPhone,
    normalizePhone,
    normalizeEmail,
    provider: supabaseClient ? "supabase" : "local"
  };
})();
