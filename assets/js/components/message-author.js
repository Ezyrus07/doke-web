(function (window, document) {
  'use strict';

  function text(value) { return String(value || '').trim(); }
  function initials(name, fallback) {
    var parts = text(name).split(/\s+/).filter(Boolean);
    var value = parts.slice(0, 2).map(function (part) { return part.charAt(0); }).join('').toUpperCase();
    return value || text(fallback).slice(0, 2).toUpperCase() || 'DK';
  }
  function avatarUrl(source) {
    source = source || {};
    var candidate = source.avatarUrl || source.avatar || source.photoUrl || source.photo || source.imageUrl || source.picture || '';
    candidate = text(candidate);
    return /^(data:image\/|blob:|https?:\/\/|\.\.\/|\.\/|assets\/|\/)/i.test(candidate) ? candidate : '';
  }
  function resolve(source, fallbackName) {
    source = source || {};
    var name = text(source.name || source.displayName || source.author || fallbackName || 'Membro');
    return {
      name: name,
      url: avatarUrl(source),
      initials: text(source.initials || source.avatarInitials) || initials(name, 'DK')
    };
  }
  function createAvatar(source, options) {
    options = options || {};
    var author = resolve(source, options.fallbackName);
    var node = document.createElement('span');
    node.className = options.className || 'message-author-avatar doke-avatar';
    node.setAttribute('aria-hidden', 'true');
    if (author.url) {
      var image = document.createElement('img');
      image.src = author.url;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      node.appendChild(image);
    } else {
      node.textContent = author.initials;
    }
    return node;
  }
  function key(message) {
    message = message || {};
    return text(message.authorAccountKey || message.authorId || message.authorEmail || message.senderId || message.author || (message.mine ? 'current-user' : 'peer')).toLowerCase();
  }
  function timeValue(message) {
    var value = message && (message.createdAt || message.sentAt || message.timestamp);
    var parsed = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }
  function startsGroup(messages, index, maxGapMs) {
    if (!Array.isArray(messages) || index <= 0) return true;
    var current = messages[index] || {};
    var previous = messages[index - 1] || {};
    if (key(current) !== key(previous)) return true;
    var currentTime = timeValue(current);
    var previousTime = timeValue(previous);
    if (currentTime !== null && previousTime !== null && currentTime - previousTime > (maxGapMs || 300000)) return true;
    return false;
  }

  window.DokeMessageAuthor = {
    resolve: resolve,
    createAvatar: createAvatar,
    startsGroup: startsGroup,
    getKey: key
  };
})(window, document);
