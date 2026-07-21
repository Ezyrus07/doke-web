(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var DEFAULT_TIMEOUT = 4000;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function preload(url, timeout) {
    var source = clean(url);
    if (!source) return Promise.resolve({ ok: false, url: '' });

    return new Promise(function (resolve) {
      var settled = false;
      var image = new Image();
      var timer = window.setTimeout(function () { finish(false); }, Number(timeout || DEFAULT_TIMEOUT));

      function finish(ok) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        resolve({ ok: Boolean(ok), url: source });
      }

      image.onload = function () {
        if (typeof image.decode === 'function') {
          Promise.resolve(image.decode()).then(function () { finish(true); }).catch(function () { finish(true); });
          return;
        }
        finish(true);
      };
      image.onerror = function () { finish(false); };
      image.src = source;
      if (image.complete && image.naturalWidth > 0) finish(true);
    });
  }

  function applyImage(imageNode, fallbackNode, result, alt) {
    if (imageNode) {
      imageNode.hidden = !result.ok;
      if (result.ok) {
        imageNode.src = result.url;
        if (alt != null) imageNode.alt = alt;
      } else {
        imageNode.removeAttribute('src');
        if (alt != null) imageNode.alt = '';
      }
    }
    if (fallbackNode) fallbackNode.hidden = Boolean(result.ok);
  }

  function commit(options) {
    options = options || {};
    return Promise.all([
      preload(options.avatarUrl, options.timeout),
      preload(options.coverUrl, options.timeout)
    ]).then(function (results) {
      applyImage(options.avatarImage, options.avatarFallback, results[0], options.avatarAlt || '');
      applyImage(options.coverImage, options.coverFallback, results[1], options.coverAlt || '');
      return {
        avatarLoaded: results[0].ok,
        coverLoaded: results[1].ok,
        avatarReady: true,
        coverReady: true
      };
    });
  }

  Doke.profileMediaReadiness = {
    preload: preload,
    commit: commit
  };
})();
