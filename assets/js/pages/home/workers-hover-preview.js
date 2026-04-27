/* v27 — Workers hover/focus video preview. */
(function () {
  const SELECTOR = '.worker-card video, .workers-card video, .dp-reelCard video, [data-worker-preview] video';

  function setupVideo(video) {
    if (!video || video.dataset.dokeWorkerPreviewReady === '1') return;
    video.dataset.dokeWorkerPreviewReady = '1';
    video.muted = true;
    video.playsInline = true;
    video.preload = video.getAttribute('preload') || 'metadata';

    const card = video.closest('.worker-card, .workers-card, .dp-reelCard, [data-worker-preview]') || video.parentElement;
    if (!card) return;
    if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');

    const play = () => {
      try {
        video.muted = true;
        const promise = video.play();
        if (promise && typeof promise.catch === 'function') promise.catch(function () {});
      } catch (_) {}
    };

    const stop = () => {
      try {
        video.pause();
        video.currentTime = 0;
      } catch (_) {}
    };

    card.addEventListener('mouseenter', play);
    card.addEventListener('focusin', play);
    card.addEventListener('mouseleave', stop);
    card.addEventListener('focusout', stop);
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach(setupVideo);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.addEventListener('doke:content-updated', init);
})();
