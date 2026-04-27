(function(){
  const DEMO_VIDEOS = [
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://media.w3.org/2010/05/sintel/trailer.mp4",
    "https://media.w3.org/2010/05/bunny/trailer.mp4"
  ];

  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  function normText(value){
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function nearestSection(el){
    return el && (el.closest("section") || el.closest("main") || document.body);
  }

  function markWorkersSections(){
    const candidates = Array.from(document.querySelectorAll("h1,h2,h3,.sec-title,.section-title,.videos-header-top"));
    candidates.forEach((h) => {
      const t = normText(h.textContent);
      if(!(t.includes("workers") || t.includes("videos curtos") || t.includes("vídeos curtos"))) return;
      const section = nearestSection(h);
      if(section) section.setAttribute("data-doke-workers-preview", "1");
    });

    document.querySelectorAll("#galeria-dinamica").forEach((track) => {
      const section = nearestSection(track);
      if(section) section.setAttribute("data-doke-workers-preview", "1");
    });
  }

  function ensureWorkerVideos(){
    markWorkersSections();

    const cards = document.querySelectorAll(
      'section[data-doke-workers-preview="1"] .dp-reelCard, ' +
      'section[data-doke-workers-preview="1"] .tiktok-card, ' +
      'section[data-doke-workers-preview="1"] .worker-card, ' +
      'section[data-doke-workers-preview="1"] .short-video-card'
    );

    cards.forEach((card, index) => {
      if(!(card instanceof HTMLElement)) return;

      if(card.classList.contains("is-skeleton")) card.classList.remove("is-skeleton");

      let video = card.querySelector("video");
      if(!video){
        video = document.createElement("video");
        video.className = "doke-worker-preview-video";
        video.src = DEMO_VIDEOS[index % DEMO_VIDEOS.length];
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.setAttribute("aria-hidden", "true");
        card.insertBefore(video, card.firstChild);
      } else {
        video.classList.add("doke-worker-preview-video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "metadata";

        if(!video.getAttribute("src") && !video.querySelector("source")){
          video.src = DEMO_VIDEOS[index % DEMO_VIDEOS.length];
        }
      }

      if(!card.querySelector(".doke-worker-preview-hint")){
        const hint = document.createElement("span");
        hint.className = "doke-worker-preview-hint";
        hint.textContent = "Preview";
        card.appendChild(hint);
      }

      const play = () => {
        try {
          video.currentTime = Math.max(video.currentTime || 0, .01);
          const p = video.play();
          if(p && typeof p.catch === "function") p.catch(() => {});
        } catch(_) {}
      };

      const pause = () => {
        try {
          video.pause();
          video.currentTime = 0;
        } catch(_) {}
      };

      if(card.dataset.dokeWorkersPreviewBound !== "1"){
        card.dataset.dokeWorkersPreviewBound = "1";
        card.addEventListener("mouseenter", play);
        card.addEventListener("focusin", play);
        card.addEventListener("touchstart", play, {passive:true});
        card.addEventListener("mouseleave", pause);
        card.addEventListener("focusout", pause);
      }
    });
  }

  ready(() => {
    ensureWorkerVideos();
    setTimeout(ensureWorkerVideos, 250);
    setTimeout(ensureWorkerVideos, 900);
    setTimeout(ensureWorkerVideos, 1800);

    if("MutationObserver" in window){
      const mo = new MutationObserver(() => {
        clearTimeout(window.__dokeWorkersPreviewTimer);
        window.__dokeWorkersPreviewTimer = setTimeout(ensureWorkerVideos, 80);
      });
      mo.observe(document.body, {childList:true, subtree:true});
    }
  });
})();