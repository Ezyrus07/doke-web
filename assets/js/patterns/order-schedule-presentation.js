/* Doke canonical order schedule presentation.
   Responsibility: derive deterministic, read-only schedule copy from the canonical order tuple.
   This module never sends commands, writes canonical fields or changes order state. */
(function (root, factory) {
  'use strict';

  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    var Doke = root.Doke || (root.Doke = {});
    var patterns = Doke.patterns || (Doke.patterns = {});
    patterns.orderSchedulePresentation = Object.freeze(api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var AUTHORITY_VALUES = Object.freeze([
    'none',
    'client_intent',
    'canonical_confirmed',
    'incomplete_projection'
  ]);

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeStatus(value) {
    return normalizeText(value).toLowerCase();
  }

  function readSchedulePreference(order) {
    var preference = order && order.schedulePreference;
    if (!preference || typeof preference !== 'object') return {};
    return preference;
  }

  function readDesiredDate(order) {
    var preference = readSchedulePreference(order);
    return normalizeText(
      order && (order.desiredDate || order.date || order.daté)
      || preference.desiredDate
      || preference.date
      || ''
    );
  }

  function readShift(order) {
    var preference = readSchedulePreference(order);
    return normalizeText(order && order.shift || preference.shift || '');
  }

  function readAvailability(order) {
    var snapshot = order && order.serviceSnapshot && typeof order.serviceSnapshot === 'object'
      ? order.serviceSnapshot
      : {};
    if (Array.isArray(order && order.serviceAvailabilitySchedule)) return order.serviceAvailabilitySchedule;
    if (Array.isArray(order && order.serviceSchedule)) return order.serviceSchedule;
    if (Array.isArray(snapshot.availabilitySchedule)) return snapshot.availabilitySchedule;
    return [];
  }

  function deriveAuthority(order) {
    order = order || {};
    var scheduleReservationId = normalizeText(order.scheduleReservationId || order.schedule_reservation_id || '');
    var scheduledAt = normalizeText(order.scheduledAt || order.scheduled_at || '');
    var status = normalizeStatus(order.status || order.backendStatus || '');
    var hasReservation = Boolean(scheduleReservationId);
    var hasScheduledAt = Boolean(scheduledAt);
    var isScheduled = status === 'scheduled';

    if (hasReservation && hasScheduledAt && isScheduled) return 'canonical_confirmed';
    if (hasReservation || hasScheduledAt || isScheduled) return 'incomplete_projection';
    if (readDesiredDate(order) || readShift(order)) return 'client_intent';
    return 'none';
  }

  function formatIntentDate(value, options) {
    var normalized = normalizeText(value);
    if (!normalized) return '';
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    var date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
      : new Date(normalized);
    if (Number.isNaN(date.getTime())) return normalized;
    return new Intl.DateTimeFormat('pt-BR', Object.assign({
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }, options && options.intentFormat || {})).format(date);
  }

  function formatCanonicalSchedule(value, options) {
    var date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return null;
    var timeZone = normalizeText(options && options.timeZone);
    if (!timeZone) {
      try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }
      catch (error) { timeZone = ''; }
    }
    var formatOptions = Object.assign({
      dateStyle: 'medium',
      timeStyle: 'short'
    }, options && options.canonicalFormat || {});
    if (timeZone) formatOptions.timeZone = timeZone;
    return Object.freeze({
      label: new Intl.DateTimeFormat('pt-BR', formatOptions).format(date),
      timeZone: timeZone
    });
  }

  function formatAvailability(order) {
    var schedule = readAvailability(order).filter(function (slot) {
      return slot && (slot.start || slot.time) && (slot.end || slot.time);
    }).slice(0, 3);
    if (!schedule.length) return 'Agenda a combinar';
    return schedule.map(function (slot) {
      var day = normalizeText(slot.label || slot.dayLabel || slot.day || 'Dia');
      var time = normalizeText(slot.time || '');
      if (!time) time = [normalizeText(slot.start), normalizeText(slot.end)].filter(Boolean).join('–');
      return [day, time].filter(Boolean).join(' ');
    }).filter(Boolean).join(' • ') || 'Agenda a combinar';
  }

  function incompletePresentation() {
    return Object.freeze({
      authority: 'incomplete_projection',
      title: 'Sincronização da agenda pendente',
      value: 'Nenhum horário confirmado',
      label: 'Agenda indisponível: atualize o pedido',
      detail: 'A projeção de agenda está incompleta. Nenhum horário deve ser tratado como confirmado.',
      badgeLabel: 'Agenda indisponível',
      tone: 'warning',
      visible: true,
      readOnly: true
    });
  }

  function getPresentation(order, options) {
    order = order || {};
    var authority = deriveAuthority(order);

    if (authority === 'canonical_confirmed') {
      var canonical = formatCanonicalSchedule(order.scheduledAt || order.scheduled_at, options);
      if (!canonical) return incompletePresentation();
      return Object.freeze({
        authority: 'canonical_confirmed',
        title: 'Horário confirmado',
        value: canonical.label,
        label: 'Agendado: ' + canonical.label,
        detail: 'Agendamento confirmado para ' + canonical.label + (canonical.timeZone ? ' (' + canonical.timeZone + ')' : ''),
        badgeLabel: 'Agendado',
        tone: 'confirmed',
        visible: true,
        readOnly: true
      });
    }

    if (authority === 'incomplete_projection') return incompletePresentation();

    if (authority === 'client_intent') {
      var intentDate = formatIntentDate(readDesiredDate(order), options);
      var shift = readShift(order);
      var intent = [intentDate, shift].filter(Boolean).join(' • ') || 'A combinar';
      return Object.freeze({
        authority: 'client_intent',
        title: 'Horário solicitado',
        value: intent,
        label: 'Data desejada: ' + intent,
        detail: 'Data desejada pelo cliente. O horário ainda não foi confirmado.',
        badgeLabel: '',
        tone: 'intent',
        visible: true,
        readOnly: true
      });
    }

    var availability = formatAvailability(order);
    return Object.freeze({
      authority: 'none',
      title: 'Disponibilidade do profissional',
      value: availability,
      label: 'Disponibilidade do anúncio: ' + availability,
      detail: 'Nenhum agendamento foi confirmado para este pedido.',
      badgeLabel: '',
      tone: 'availability',
      visible: true,
      readOnly: true
    });
  }

  return Object.freeze({
    AUTHORITY_VALUES: AUTHORITY_VALUES,
    deriveAuthority: deriveAuthority,
    formatCanonicalSchedule: formatCanonicalSchedule,
    formatIntentDate: formatIntentDate,
    formatAvailability: formatAvailability,
    getPresentation: getPresentation
  });
});
