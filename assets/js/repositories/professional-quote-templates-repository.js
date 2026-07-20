(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.repositories = Doke.repositories || {};

  var TABLE = 'professional_quote_templates';
  var MAX_TEMPLATES = 30;

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function text(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength || 200);
  }

  function getClient() {
    var client = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
      ? root.DokeSupabase.getClient()
      : null;
    if (!client) throw new Error('Conecte-se à internet para acessar seus modelos.');
    return client;
  }

  function getUser(client) {
    return Promise.resolve(client.auth.getUser()).then(function (result) {
      if (result.error) throw result.error;
      var user = result.data && result.data.user;
      if (!user || !user.id) throw new Error('Faça login com sua conta profissional para acessar seus modelos.');
      return user;
    });
  }

  function normalizeQuestion(raw, index) {
    raw = raw || {};
    var options = Array.isArray(raw.options) ? raw.options : [];
    return {
      id: text(raw.id, 80) || ('saved_question_' + index),
      type: text(raw.type, 40) || 'short_text',
      label: text(raw.label, 120),
      helpText: text(raw.helpText, 180),
      required: raw.required === true,
      position: index,
      options: options.map(function (option) {
        return text(typeof option === 'object' ? option.label || option.value : option, 80);
      }).filter(Boolean).slice(0, 5),
      maxLength: Math.min(1000, Math.max(1, Number(raw.maxLength) || (raw.type === 'long_text' ? 1000 : 180)))
    };
  }

  function normalizePayload(payload) {
    payload = payload || {};
    var questions = Array.isArray(payload.questions) ? payload.questions : [];
    questions = questions.slice(0, 10).map(normalizeQuestion).filter(function (question) {
      return Boolean(question.label);
    });
    if (!questions.length) throw new Error('Adicione pelo menos uma pergunta antes de salvar o modelo.');
    return {
      version: 1,
      status: 'active',
      source: 'personal_template',
      questions: questions
    };
  }

  function mapRow(row) {
    row = row || {};
    var payload = row.template_payload && typeof row.template_payload === 'object' ? row.template_payload : {};
    return {
      id: text(row.id, 80),
      professionalId: text(row.professional_id, 80),
      name: text(row.name, 60),
      category: text(row.category, 80),
      template: normalizePayload(payload),
      questionCount: Array.isArray(payload.questions) ? payload.questions.length : 0,
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function unwrap(result, fallbackMessage) {
    if (result && result.error) {
      if (result.error.code === '23505') throw new Error('Você já possui um modelo com esse nome.');
      if (result.error.code === '23514' && String(result.error.message || '').includes('PROFESSIONAL_QUOTE_TEMPLATE_LIMIT_REACHED')) {
        throw new Error('Você atingiu o limite de 30 modelos salvos. Exclua um modelo antigo para criar outro.');
      }
      throw new Error(result.error.message || fallbackMessage || 'Não foi possível concluir a operação.');
    }
    return result ? result.data : null;
  }

  function list() {
    var client = getClient();
    return getUser(client).then(function (user) {
      return Promise.resolve(client.from(TABLE)
        .select('id,professional_id,name,category,template_payload,created_at,updated_at')
        .eq('professional_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(MAX_TEMPLATES));
    }).then(function (result) {
      return (unwrap(result, 'Não foi possível carregar seus modelos.') || []).map(mapRow);
    });
  }

  function create(input) {
    input = input || {};
    var client = getClient();
    var name = text(input.name, 60);
    var category = text(input.category, 80) || null;
    var template = normalizePayload(input.template);
    if (name.length < 3) return Promise.reject(new Error('O nome do modelo precisa ter pelo menos 3 caracteres.'));

    return getUser(client).then(function (user) {
      return Promise.resolve(client.from(TABLE).insert({
        professional_id: user.id,
        name: name,
        category: category,
        template_payload: template
      }).select('id,professional_id,name,category,template_payload,created_at,updated_at').single());
    }).then(function (result) {
      return mapRow(unwrap(result, 'Não foi possível salvar o modelo.'));
    });
  }

  function update(templateId, patch) {
    patch = patch || {};
    var id = text(templateId, 80);
    if (!id) return Promise.reject(new Error('Modelo inválido.'));
    var client = getClient();
    var changes = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
      changes.name = text(patch.name, 60);
      if (changes.name.length < 3) return Promise.reject(new Error('O nome do modelo precisa ter pelo menos 3 caracteres.'));
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'category')) changes.category = text(patch.category, 80) || null;
    if (Object.prototype.hasOwnProperty.call(patch, 'template')) changes.template_payload = normalizePayload(patch.template);
    if (!Object.keys(changes).length) return Promise.reject(new Error('Nenhuma alteração foi informada.'));

    return getUser(client).then(function (user) {
      return Promise.resolve(client.from(TABLE).update(changes)
        .eq('id', id)
        .eq('professional_id', user.id)
        .select('id,professional_id,name,category,template_payload,created_at,updated_at')
        .single());
    }).then(function (result) {
      return mapRow(unwrap(result, 'Não foi possível atualizar o modelo.'));
    });
  }

  function remove(templateId) {
    var id = text(templateId, 80);
    if (!id) return Promise.reject(new Error('Modelo inválido.'));
    var client = getClient();
    return getUser(client).then(function (user) {
      return Promise.resolve(client.from(TABLE).delete().eq('id', id).eq('professional_id', user.id).select('id').single());
    }).then(function (result) {
      var row = unwrap(result, 'Não foi possível excluir o modelo.');
      return Boolean(row && row.id);
    });
  }

  Doke.repositories.professionalQuoteTemplates = Object.freeze({
    list: list,
    create: create,
    update: update,
    remove: remove,
    normalizePayload: normalizePayload,
    maxTemplates: MAX_TEMPLATES,
    clone: clone
  });
})(window);
