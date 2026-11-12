/* Nasser Askar — portfolio & booking site
   All text, projects, photos, packages and contact settings live in content/site.json */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMobile = () => innerWidth <= 860;
  const hasGsap = !!window.gsap;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger, Flip);

  let C = null;            // content
  let lang = "en";
  let lenis = null;
  let activeCat = "all";
  const FIRST = 16, STEP = 24;   // cards shown first, and how many "Show more" adds
  let viewLimit = FIRST;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };

  /* ------------------------------------------------------------------ i18n */
  const t = (key) => (C.i18n[lang] && C.i18n[lang][key]) ?? C.i18n.en[key] ?? key;
  const L = (obj) => (obj && typeof obj === "object") ? (obj[lang] ?? obj.en) : obj;

  function applyI18n() {
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.title = lang === "ar" ? "ناصر عسكر | تصوير فيديو وفوتو وصناعة محتوى في لبنان" : "Nasser Askar | Videographer, Photographer & Content Creation in Lebanon";
  }

  /* ------------------------------------------------------------- WhatsApp */
  const waNumber = () => String(C.contact.whatsapp || "").replace(/\D/g, "");
  const waUrl = (text) => `https://wa.me/${waNumber()}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  function wireWa() {
    const hello = lang === "ar" ? "مرحبا ناصر! شفت موقعك وبدّي احكي معك عن مشروع." : "Hi Nasser! I saw your website and I'd like to talk about a project.";
    $$(".js-wa").forEach(a => a.href = waUrl(hello));
  }

  /* --------------------------------------------------------------- loader */
  function runLoader(ready) {
    const num = $("#loaderNum");
    const start = performance.now();
    const MIN = 1100, MAX = 4000; // never longer than 4 s, even on slow networks
    return new Promise(resolve => {
      // setInterval (not requestAnimationFrame) so it keeps counting even when frames are paused
      const iv = setInterval(() => {
        const elapsed = performance.now() - start;
        const p = Math.min(1, elapsed / MIN);
        const eased = 1 - Math.pow(1 - p, 3);
        const done = (ready.done && p >= 1) || elapsed > MAX;
        num.textContent = done ? 100 : Math.round(eased * (ready.done ? 100 : 92));
        if (done) { clearInterval(iv); resolve(); }
      }, 30);
    }).then(() => new Promise(res => {
      document.body.classList.remove("is-loading");
      if (!hasGsap || reduce) { $("#loader").remove(); return res(); }
      const tl = gsap.timeline({ onComplete: () => { $("#loader").remove(); res(); } });
      tl.to(".loader__count, .loader__name", { yPercent: -40, opacity: 0, duration: .5, ease: "power3.in" })
        .to(".loader__curtain--red", { y: "0%", duration: .55, ease: "expo.inOut" }, "-=.2")
        .to(".loader__curtain:not(.loader__curtain--red)", { y: "0%", duration: .55, ease: "expo.inOut" }, "-=.35")
        .set("#loader", { background: "transparent" })
        .set(".loader__curtain--red", { opacity: 0 })
        .to(".loader__curtain:not(.loader__curtain--red)", { y: "-100%", duration: .8, ease: "expo.inOut" });
    }));
  }

  /* ---------------------------------------------------------- smooth scroll */
  function initScroll() {
    if (!hasGsap || reduce || !window.Lenis || isMobile()) return;
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = $(id); if (!el) return;
      e.preventDefault(); closeMenu();
      lenis.scrollTo(el, { offset: id === "#top" ? 0 : -70, duration: 1.4 });
    }));
  }
  function scrollToEl(el) { lenis ? lenis.scrollTo(el, { offset: -70 }) : el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }

  /* --------------------------------------------------------------- render */
  const verticals = () => shuffled("verticals", C.projects.filter(p => p.orientation === "vertical"));

  function renderWall() {
    const inner = $("#wallInner");
    const vids = verticals();
    const cols = isMobile() ? 4 : 6;
    const perCol = 4;
    let k = 0, liveBudget = isMobile() ? 4 : 10;
    inner.innerHTML = "";
    for (let c = 0; c < cols; c++) {
      const col = document.createElement("div");
      col.className = "wall__col";
      const tiles = [];
      for (let i = 0; i < perCol; i++) {
        const p = vids[(k++ * 7) % vids.length];
        const live = liveBudget > 0 && (i === 1 || i === 2);
        if (live) liveBudget--;
        tiles.push(live
          ? `<div class="wall__tile"><video src="${p.preview}" poster="${p.poster}" muted loop playsinline autoplay preload="metadata"></video></div>`
          : `<div class="wall__tile"><img src="${p.poster}" alt="" loading="lazy" decoding="async"></div>`);
      }
      col.innerHTML = tiles.join("") + tiles.join(""); // duplicate for seamless loop
      inner.appendChild(col);
    }
    if (hasGsap && !reduce) {
      $$(".wall__col", inner).forEach((col, i) => {
        const up = i % 2 === 0;
        gsap.fromTo(col, { yPercent: up ? 0 : -50 }, { yPercent: up ? -50 : 0, duration: 40 + i * 6, ease: "none", repeat: -1 });
      });
    }
  }

  function renderMarquee() {
    const items = C.clients.map(c => `<span class="marquee__item">${c}</span>`).join("");
    $("#marquee").innerHTML = items + items;
  }

  function renderManifesto() {
    const raw = t("manifesto");
    const tokens = [];
    raw.replace(/\*\*(.+?)\*\*|\*(.+?)\*|([^*\s]+)/g, (m, k, s, w) => {
      if (k) k.split(/\s+/).forEach(x => tokens.push(`<span class="w k">${x}</span>`));
      else if (s) s.split(/\s+/).forEach(x => tokens.push(`<span class="w s">${x}</span>`));
      else tokens.push(`<span class="w">${w}</span>`);
    });
    $("#manifestoText").innerHTML = tokens.join(" ");
  }

  function catCount(cat) {
    if (cat === "all") return C.projects.length + C.photos.length;
    if (cat === "photo") return C.photos.length;
    return C.projects.filter(p => p.category === cat).length + C.photos.filter(p => p.category === cat).length;
  }

  function renderFilters() {
    const wrap = $("#filters");
    $$("button", wrap).forEach(b => b.remove());
    C.categories.filter(c => catCount(c) > 0).forEach(cat => {
      const b = document.createElement("button");
      b.type = "button"; b.role = "tab"; b.dataset.cat = cat;
      b.setAttribute("aria-selected", cat === activeCat);
      b.innerHTML = `${t("cat." + cat)}<sup>${catCount(cat)}</sup>`;
      b.addEventListener("click", () => setCategory(cat));
      wrap.appendChild(b);
    });
    requestAnimationFrame(moveIndicator);
  }
  function moveIndicator() {
    const b = $(`#filters button[aria-selected="true"]`);
    const ind = $("#filterInd");
    if (!b) return;
    ind.style.width = b.offsetWidth + "px";
    ind.style.transform = `translateX(${b.offsetLeft}px)`;
  }

  function cardHTML(p) {
    const h = p.orientation === "horizontal";
    const dur = `${Math.floor(p.duration / 60)}:${String(p.duration % 60).padStart(2, "0")}`;
    return `<article class="card ${h ? "card--h" : ""}" data-cat="${p.category}" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.client}: ${L(p.title)}">
      <div class="card__media"><img src="${p.poster}" alt="${p.client} – ${L(p.title)}, video by Nasser Askar" loading="lazy" decoding="async"><video data-src="${p.preview}" muted loop playsinline preload="none"></video></div>
      <span class="card__shine"></span>
      <span class="card__cat">${t("cat." + p.category)}</span>
      <span class="card__play" aria-hidden="true">▶</span>
      <div class="card__info"><div><span class="card__client">${p.client}</span><span class="card__title">${L(p.title)}</span></div><span class="card__dur">${dur}</span></div>
    </article>`;
  }
  function photoCardHTML(ph, i) {
    return `<article class="card card--photo" data-cat="photo" data-photo="${i}" tabindex="0" role="button" aria-label="${ph.client} photo">
      <div class="card__media"><img src="${ph.src}" alt="${ph.client} – ${t("cat." + ph.category)} photography by Nasser Askar" loading="lazy" decoding="async"></div>
      <span class="card__shine"></span>
      <span class="card__cat">${t("cat.photo")}</span>
      <div class="card__info"><div><span class="card__client">${ph.client}</span></div></div>
    </article>`;
  }

  // New random order on every visit (stable while the visitor stays on the page)
  const shuffled = (() => { const cache = {}; return (key, arr) => {
    if (!cache[key] || cache[key].length !== arr.length) {
      const idx = arr.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      cache[key] = idx;
    }
    return cache[key].map(i => arr[i]);
  }; })();

  function renderGrid() {
    const grid = $("#grid");
    // "All": categories mixed round-robin, a photo after every 4 videos.
    // Each category view: grouped by client, newest first (order of site.json).
    const groups = {};
    shuffled("projects", C.projects).forEach(p => (groups[p.category] ||= []).push(p));
    const mixed = [];
    const queues = shuffled("groups", Object.values(groups)).map(q => q.slice());
    while (queues.some(q => q.length)) queues.forEach(q => q.length && mixed.push(q.shift()));
    const parts = [];
    let pi = 0;
    const photoOrder = shuffled("photos", C.photos.map((_, i) => i));
    mixed.forEach((p, i) => {
      parts.push(cardHTML(p));
      if (i % 4 === 3 && pi < photoOrder.length) { parts.push(photoCardHTML(C.photos[photoOrder[pi]], photoOrder[pi])); pi++; }
    });
    for (; pi < photoOrder.length; pi++) parts.push(photoCardHTML(C.photos[photoOrder[pi]], photoOrder[pi]));
    grid.innerHTML = parts.join("");
    // fixed order per category, so the same filter always gives the same, tidy layout
    const cards = $$(".card", grid);
    cards.forEach((c, i) => c.dataset.allOrder = i);
    let k = 0;
    cards.filter(c => c.dataset.photo === undefined).forEach(c => c.dataset.catOrder = k++);
    cards.filter(c => c.dataset.photo !== undefined).forEach(c => c.dataset.catOrder = k++);
    applyFilter(false);
    bindCards();
  }

  // Masonry: every visible card goes into the shortest column, in a fixed order.
  // Positions are absolute, so nothing can jump around or overlap.
  function cardRatio(card) {
    if (card.dataset.photo !== undefined) {
      const ph = C.photos[+card.dataset.photo];
      if (ph.w && ph.h) return ph.h / ph.w;
      const img = $("img", card);
      return img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1.25;
    }
    return card.classList.contains("card--h") ? 9 / 16 : 16 / 9;
  }
  function gridColumns() { return innerWidth > 1100 ? 4 : innerWidth > 860 ? 3 : 2; }
  function layoutGrid(animate = false) {
    const grid = $("#grid");
    const W = grid.clientWidth;
    const cols = gridColumns();
    const gap = innerWidth > 860 ? 18 : 12;
    const cw = (W - gap * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);
    const rtl = html.dir === "rtl";
    const visible = $$(".card", grid).filter(c => !c.hidden)
      .sort((a, b) => activeCat === "all" ? a.dataset.allOrder - b.dataset.allOrder : a.dataset.catOrder - b.dataset.catOrder);
    visible.forEach(card => {
      const h = Math.round(cw * cardRatio(card));
      let col = 0;
      for (let i = 1; i < cols; i++) if (heights[i] < heights[col] - 1) col = i;
      const xLtr = col * (cw + gap);
      const x = rtl ? W - cw - xLtr : xLtr;
      const y = heights[col];
      heights[col] += h + gap;
      card.style.width = cw + "px";
      card.style.height = h + "px";
      if (hasGsap) {
        if (animate && !reduce && card.dataset.placed) gsap.to(card, { x, y, duration: .8, ease: "expo.out", overwrite: "auto" });
        else gsap.set(card, { x, y });
      } else card.style.transform = `translate(${x}px,${y}px)`;
      card.dataset.placed = "1";
    });
    grid.style.height = Math.max(0, Math.max(...heights) - gap) + "px";
  }

  // a photo belongs to "Photography" and to its client's category (e.g. F&B photos show under F&B)
  function cardMatches(c) {
    if (activeCat === "all") return true;
    if (c.dataset.photo !== undefined) return activeCat === "photo" || C.photos[+c.dataset.photo].category === activeCat;
    return c.dataset.cat === activeCat;
  }
  let filterTl = null;
  function applyFilter(animate = true) {
    const cards = $$("#grid .card");
    const isShown = c => !c.hidden;
    const before = new Set(cards.filter(isShown));
    let shown = 0;
    const order = activeCat === "all" ? "allOrder" : "catOrder";
    const ordered = cards.slice().sort((a, b) => a.dataset[order] - b.dataset[order]);
    const next = new Set();
    ordered.forEach(c => {
      const match = cardMatches(c);
      if (match && shown < viewLimit) next.add(c);
      if (match) shown++;
    });
    const moreBtn = $("#moreWork");
    moreBtn.hidden = false;
    moreBtn.dataset.mode = shown > viewLimit ? "more" : (activeCat === "all" ? "none" : "all");
    if (moreBtn.dataset.mode === "none") moreBtn.hidden = true;
    $("span", moreBtn).textContent = moreBtn.dataset.mode === "all" ? t("work.all") : t("work.more");

    if (!animate || !hasGsap || reduce) {
      cards.forEach(c => { c.hidden = !next.has(c); });
      layoutGrid(false);
      hasGsap && ScrollTrigger.refresh();
      return;
    }
    filterTl && filterTl.kill();
    const leaving = [...before].filter(c => !next.has(c));
    const entering = [...next].filter(c => !before.has(c));
    filterTl = gsap.timeline({ onComplete: () => ScrollTrigger.refresh() });
    if (leaving.length) filterTl.to(leaving, { autoAlpha: 0, scale: .9, duration: .25, ease: "power2.in" });
    filterTl.add(() => {
        cards.forEach(c => { c.hidden = !next.has(c); });
        entering.forEach(c => { delete c.dataset.placed; });
        gsap.set(entering, { autoAlpha: 0, scale: .9 });
        layoutGrid(true);
      })
    if (entering.length) filterTl.to(entering, { autoAlpha: 1, scale: 1, duration: .6, ease: "expo.out", stagger: .03 }, "+=.05");
  }

  function setCategory(cat) {
    if (cat === activeCat) return;
    activeCat = cat;
    viewLimit = FIRST;
    $$("#filters button").forEach(b => b.setAttribute("aria-selected", b.dataset.cat === cat));
    moveIndicator();
    flash(.18);
    applyFilter(true);
    // bring the grid top into view so the result is visible right away
    const top = $("#filters").getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * .5) scrollToEl($("#filters"));
  }

  /* ---------------------------------------------------------------- cards */
  const playing = new Set();
  function playCard(card) {
    const v = $("video", card); if (!v) return;
    if (!v.src) v.src = v.dataset.src;
    v.play().then(() => { card.classList.add("is-playing"); playing.add(card); }).catch(() => {});
  }
  function stopCard(card) {
    const v = $("video", card); if (!v) return;
    v.pause(); card.classList.remove("is-playing"); playing.delete(card);
  }

  function bindCards() {
    $$("#grid .card").forEach(card => {
      card.addEventListener("click", () => openCard(card));
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCard(card); } });
      if (finePointer) {
        card.addEventListener("mouseenter", () => { playCard(card); cursorState(card.dataset.photo !== undefined ? "view" : "play"); });
        card.addEventListener("mouseleave", () => {
          stopCard(card); cursorState(null);
          if (hasGsap) gsap.to(card, { rotateX: 0, rotateY: 0, duration: .8, ease: "expo.out" });
        });
        card.addEventListener("mousemove", e => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          card.style.setProperty("--mx", `${x * 100}%`); card.style.setProperty("--my", `${y * 100}%`);
          if (hasGsap && !reduce) gsap.to(card, { rotateY: (x - .5) * 8, rotateX: (.5 - y) * 8, transformPerspective: 900, duration: .6, ease: "power3.out" });
        });
      }
    });
    if (!finePointer && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          const card = en.target;
          if (en.isIntersecting && en.intersectionRatio > .6) { if (playing.size < 4) playCard(card); }
          else stopCard(card);
        });
      }, { threshold: [0, .6, 1] });
      $$("#grid .card:not(.card--photo)").forEach(c => io.observe(c));
    }
  }

  /* ------------------------------------------------------------- lightbox */
  const lb = { el: null, video: null, last: null };
  function openCard(card) {
    lb.last = card;
    const box = $("#lightbox"), v = $("#lbVideo"), stage = $(".lightbox__stage");
    let client, title, msgItem;
    if (card.dataset.photo !== undefined) {
      const ph = C.photos[+card.dataset.photo];
      v.hidden = true; v.removeAttribute("src");
      let img = $("img", stage);
      if (!img) { img = document.createElement("img"); stage.appendChild(img); }
      img.src = ph.src; img.alt = ph.client; img.hidden = false;
      img.style.cssText = "max-height:86vh;max-width:min(80vw,1300px);object-fit:contain";
      client = t("cat.photo"); title = ph.client; msgItem = `${ph.client} (${t("cat.photo")})`;
    } else {
      const p = C.projects.find(x => x.id === card.dataset.id);
      const img = $("img", stage); if (img) img.hidden = true;
      v.hidden = false; v.poster = p.poster; v.src = p.video;
      v.play().catch(() => {});
      client = `${p.client} · ${t("cat." + p.category)}`; title = L(p.title); msgItem = `${p.client} — ${L(p.title)}`;
    }
    $("#lbClient").textContent = client;
    $("#lbTitle").textContent = title;
    $(".js-wa-project").href = waUrl(`${t("wa.project")}\n${msgItem}`);
    box.classList.add("is-open"); box.setAttribute("aria-hidden", "false");
    lenis && lenis.stop();
    $("#lbClose").focus();
  }
  function closeLightbox() {
    const box = $("#lightbox"), v = $("#lbVideo");
    if (!box.classList.contains("is-open")) return;
    box.classList.remove("is-open"); box.setAttribute("aria-hidden", "true");
    v.pause(); setTimeout(() => v.removeAttribute("src"), 400);
    lenis && lenis.start();
    lb.last && lb.last.focus({ preventScroll: true });
  }

  /* -------------------------------------------------------------- process */
  function renderProcess() {
    $("#steps").innerHTML = C.process.map(s => `<div class="step glass"><div class="step__n">${s.n}</div><h3>${L(s.title)}</h3><p>${L(s.text)}</p></div>`).join("");
    const screen = $("#phoneScreen");
    if (!screen.children.length) {
      screen.innerHTML = C.process.map((s, i) => {
        const p = C.projects.find(x => x.id === s.video) || verticals()[i];
        return `<video src="${p.preview}" poster="${p.poster}" muted loop playsinline preload="metadata" class="${i === 0 ? "on" : ""}"></video>`;
      }).join("");
    }
  }
  function setPhoneStep(i) {
    $$("#phoneScreen video").forEach((v, k) => {
      const on = k === i;
      v.classList.toggle("on", on);
      on ? v.play().catch(() => {}) : v.pause();
    });
  }

  /* ---------------------------------------------------------------- photos */
  function renderPhotos() {
    $("#photosTrack").innerHTML = shuffled("strip", C.photos).slice(0, 12).map(ph => `<figure class="ph"><img src="${ph.src}" alt="${ph.client}" loading="lazy" decoding="async"><figcaption>${ph.client}</figcaption></figure>`).join("");
  }

  /* -------------------------------------------------------------- services */
  function renderServices() {
    $("#servicesGrid").innerHTML = C.services.map((s, i) => `<article class="svc glass"><span class="svc__n">0${i + 1}</span><div class="svc__icon" aria-hidden="true">${s.icon}</div><div><h3>${L(s.title)}</h3><p>${L(s.text)}</p></div></article>`).join("");
    $$(".svc").forEach(el => el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`); el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }));
  }

  function renderStats() {
    $("#statsRow").innerHTML = C.stats.map(s => `<div class="stat"><div class="stat__num"><span data-to="${s.value}">0</span><em>${s.suffix}</em></div><div class="stat__label">${L(s.label)}</div></div>`).join("");
  }

  /* --------------------------------------------------------------- builder */
  const B = { business: null, services: new Set(), reels: 8, photos: 20, days: 2, budget: null, start: null };
  function chipGroup(name, items, type) {
    return `<div class="chips">${items.map(it => `<label class="chip"><input type="${type}" name="${name}" value="${it.id}" ${
      (type === "radio" ? B[name] === it.id : B.services.has(it.id)) ? "checked" : ""}><span>${it[lang] || it.en}</span></label>`).join("")}</div>`;
  }
  function rangeRow(name, min, max, step) {
    return `<div class="range"><input type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${B[name]}" aria-label="${t("q." + name)}"><output>${B[name]}</output></div>`;
  }
  function renderBuilder() {
    const b = C.builder;
    $("#builderSteps").innerHTML = `
      <div class="q"><h3 class="q__label"><b>01</b>${t("q.business")}</h3>${chipGroup("business", b.business, "radio")}</div>
      <div class="q"><h3 class="q__label"><b>02</b>${t("q.services")}</h3><p class="q__hint">${t("q.services_hint")}</p>${chipGroup("services", b.services, "checkbox")}</div>
      <div class="q"><h3 class="q__label"><b>03</b>${t("q.reels")}</h3>${rangeRow("reels", 0, 30, 1)}</div>
      <div class="q"><h3 class="q__label"><b>04</b>${t("q.photos")}</h3>${rangeRow("photos", 0, 100, 5)}</div>
      <div class="q"><h3 class="q__label"><b>05</b>${t("q.days")}</h3>${rangeRow("days", 1, 8, 1)}</div>
      <div class="q"><h3 class="q__label"><b>06</b>${t("q.budget")}</h3>${chipGroup("budget", b.budget, "radio")}</div>
      <div class="q"><h3 class="q__label"><b>07</b>${t("q.start")}</h3>${chipGroup("start", b.start, "radio")}</div>`;
    $$("#builderSteps input[type=range]").forEach(r => paintRange(r));
    updateSummary(false);
  }
  function paintRange(r) {
    const p = ((r.value - r.min) / (r.max - r.min)) * 100;
    r.style.setProperty("--p", p + "%");
    r.nextElementSibling.textContent = r.value;
  }
  function score() {
    let s = B.reels * 1.4 + B.photos / 6 + B.days * 3;
    C.builder.services.forEach(x => { if (B.services.has(x.id)) s += x.w * 1.5; });
    return Math.round(s);
  }
  function updateSummary(pop = true) {
    const sc = score();
    const tiers = C.builder.tiers;
    const tier = [...tiers].reverse().find(x => sc >= x.min) || tiers[0];
    const tierEl = $("#sumTier");
    const name = L(tier.name);
    if (tierEl.textContent !== name) {
      tierEl.textContent = name;
      if (pop && hasGsap && !reduce) gsap.fromTo(tierEl, { yPercent: 60, opacity: 0, skewY: 6 }, { yPercent: 0, opacity: 1, skewY: 0, duration: .7, ease: "expo.out" });
    }
    $("#sumTagline").textContent = L(tier.tagline);
    const find = (arr, id) => (arr.find(x => x.id === id) || {})[lang];
    const li = [];
    if (B.business) li.push(find(C.builder.business, B.business));
    C.builder.services.forEach(x => B.services.has(x.id) && li.push(x[lang]));
    li.push(`${B.reels} ${t("q.reels").toLowerCase()}`);
    if (B.photos) li.push(`${B.photos} ${t("q.photos").toLowerCase()}`);
    li.push(`${B.days} ${t("q.days").toLowerCase()}`);
    if (B.budget) li.push(find(C.builder.budget, B.budget));
    if (B.start) li.push(find(C.builder.start, B.start));
    $("#sumList").innerHTML = li.map(x => `<li>${x}</li>`).join("");
    $("#sumMeter").style.width = Math.min(100, (sc / 70) * 100) + "%";
  }
  function packageText(f) {
    const find = (arr, id) => (arr.find(x => x.id === id) || {})[lang] || "-";
    const svc = C.builder.services.filter(x => B.services.has(x.id)).map(x => x[lang]).join(", ");
    const ar = lang === "ar";
    return [
      t("wa.greeting"), "",
      `📦 ${ar ? "الباقة" : "Package"}: ${$("#sumTier").textContent}`,
      `🏢 ${ar ? "البزنس" : "Business"}: ${f.company} (${find(C.builder.business, B.business)})`,
      `🎬 ${ar ? "الخدمات" : "Services"}: ${svc}`,
      `📱 ${t("q.reels")}: ${B.reels}`,
      `📸 ${t("q.photos")}: ${B.photos}`,
      `📅 ${t("q.days")}: ${B.days}`,
      `💰 ${t("q.budget")}: ${find(C.builder.budget, B.budget)}`,
      `⏱ ${t("q.start")}: ${find(C.builder.start, B.start)}`, "",
      `👤 ${f.name}`, `📞 ${f.phone}`, f.instagram ? `📷 ${f.instagram}` : null,
      f.notes ? `📝 ${f.notes}` : null
    ].filter(x => x !== null).join("\n");
  }
  function bindBuilder() {
    const form = $("#builder");
    form.addEventListener("input", e => {
      const el = e.target;
      if (el.type === "range") { B[el.name] = +el.value; paintRange(el); updateSummary(); }
      if (el.type === "radio") { B[el.name] = el.value; updateSummary(); }
      if (el.type === "checkbox" && el.name === "services") { el.checked ? B.services.add(el.value) : B.services.delete(el.value); updateSummary(); }
      if (el.classList.contains("is-invalid")) el.classList.remove("is-invalid");
    });
    form.addEventListener("submit", e => {
      e.preventDefault();
      const err = $("#formError");
      const fd = Object.fromEntries(new FormData(form).entries());
      if (fd.botcheck) return;
      if (!B.business || !B.services.size) { err.textContent = t("form.err_pick"); scrollToEl($("#builderSteps")); return; }
      const req = ["name", "company", "phone"].filter(k => !String(fd[k] || "").trim());
      req.forEach(k => form.elements[k].classList.add("is-invalid"));
      if (req.length) { err.textContent = t("form.err_required"); form.elements[req[0]].focus(); return; }
      err.textContent = t("form.sent");
      const text = packageText(fd);
      window.open(waUrl(text), "_blank", "noopener");
      // Email copy of every request (sent even if the visitor never presses "send" in WhatsApp).
      // Uses FormSubmit (no account): contact.formEmail, or contact.email. Web3Forms key also supported.
      const subject = `New package request: ${fd.company} (${$("#sumTier").textContent})`;
      const to = C.contact.formEmail || C.contact.email;
      if (C.contact.web3formsKey) {
        fetch("https://api.web3forms.com/submit", {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ access_key: C.contact.web3formsKey, subject, from_name: "nasser website", message: text, name: fd.name, phone: fd.phone })
        }).catch(() => {});
      } else if (to) {
        fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ _subject: subject, _template: "box", _captcha: "false", name: fd.name, business: fd.company,
            whatsapp: fd.phone, instagram: fd.instagram || "-", package: $("#sumTier").textContent, details: text })
        }).catch(() => {});
      }
    });
  }

  /* ------------------------------------------------------------------ book */
  function renderBook() {
    const panel = $("#bookPanel");
    if (C.contact.calendarUrl) {
      panel.innerHTML = `<iframe src="${C.contact.calendarUrl}" title="Book a call with Nasser" loading="lazy"></iframe>`;
      return;
    }
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    const heads = (lang === "ar" ? ["ن", "ث", "ر", "خ", "ج", "س", "ح"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]).map(h => `<span class="h">${h}</span>`).join("");
    let cells = "";
    for (let i = 0; i < first; i++) cells += "<span></span>";
    for (let i = 1; i <= days; i++) {
      const wd = (first + i - 1) % 7;
      const cls = i === d.getDate() ? "today" : (i > d.getDate() && wd < 6 && i % 3 !== 0 ? "free" : "");
      cells += `<span class="${cls}">${i}</span>`;
    }
    panel.innerHTML = `<div class="book__empty"><div class="cal" aria-hidden="true">${heads}${cells}</div>
      <div><h3>${t("book.empty_title")}</h3><p>${t("book.empty_text")}</p>
      <div class="book__btns"><a class="btn btn--red magnetic js-wa" target="_blank" rel="noopener" href="#"><span class="wa-dot"></span>${t("cta.whatsapp")}</a></div></div></div>`;
    wireWa();
    if (hasGsap && !reduce) gsap.from(".cal span.free", { scale: 0, opacity: 0, stagger: { each: .04, from: "random" }, duration: .6, ease: "back.out(2)", scrollTrigger: { trigger: panel, start: "top 75%" } });
  }

  function renderFooter() {
    const c = C.contact;
    const links = [
      [`https://instagram.com/${c.instagram}`, "Instagram"],
      [waUrl(""), "WhatsApp"],
      c.email ? [`mailto:${c.email}`, "Email"] : null,
      c.phone && !/X/.test(c.phone) ? [`tel:${c.phone.replace(/\s/g, "")}`, lang === "ar" ? "اتصل" : "Call"] : null
    ].filter(Boolean);
    $("#footerLinks").innerHTML = links.map(([h, l]) => `<a href="${h}" target="_blank" rel="noopener">${l}</a>`).join("");
    $("#year").textContent = new Date().getFullYear();
  }

  function renderAll() {
    applyI18n();
    renderManifesto(); renderFilters(); renderGrid(); renderProcess(); renderServices(); renderStats();
    renderBuilder(); renderBook(); renderFooter(); wireWa();
  }

  /* -------------------------------------------------------------- motion */
  function flash(strength = .35) {
    if (!hasGsap || reduce) return;
    gsap.fromTo("#flash", { opacity: strength }, { opacity: 0, duration: .45, ease: "power2.out" });
  }

  function heroIntro() {
    if (!hasGsap || reduce) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(".wall", { scale: 1.25, opacity: 0, duration: 2 }, 0)
      .from(".hero__title .ln > span", { yPercent: 115, rotate: 3, duration: 1.3, stagger: .12 }, .1)
      .from(".hero__hey", { y: 20, opacity: 0, duration: 1 }, .3)
      .from(".hero__sub, .hero__ctas > *", { y: 30, opacity: 0, duration: 1, stagger: .08 }, .55)
      .add(() => flash(.25), .15);
  }

  let manifestoST = null;
  function motionManifesto() {
    if (!hasGsap || reduce) return;
    manifestoST && manifestoST.kill();
    const words = $$("#manifestoText .w");
    const tween = gsap.to(words, { opacity: 1, stagger: .5, ease: "none" });
    manifestoST = ScrollTrigger.create({ trigger: ".manifesto", start: "top 75%", end: "bottom 60%", scrub: .6, animation: tween });
    gsap.fromTo(".manifesto__text .k", { scale: .9 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".manifesto", start: "top 60%", end: "bottom 60%", scrub: true } });
  }

  function motion() {
    if (!hasGsap || reduce) {
      $$(".stat__num span").forEach(s => s.textContent = s.dataset.to);
      $("#finalVideo").src = C.finalVideo; $("#finalVideo").play().catch(() => {});
      return;
    }
    // hero: wall flattens and drifts on scroll, text lifts away
    gsap.to(".wall__inner", { rotateX: 8, rotateZ: lang === "ar" ? 4 : -4, scale: 1.45, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__content", { yPercent: -30, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 20%", scrub: true } });

    motionManifesto();

    // section heads reveal
    $$(".section-head").forEach(h => {
      gsap.from(h.children, { y: 50, opacity: 0, duration: 1.1, ease: "expo.out", stagger: .08, scrollTrigger: { trigger: h, start: "top 85%" } });
    });
    // work cards rise in
    ScrollTrigger.batch("#grid .card", {
      start: "top 92%", once: true,
      // reveal the inside of the card only, so the card's own position (masonry) is never touched
      onEnter: els => gsap.from(els.map(e => e.querySelector(".card__media")), { yPercent: 12, opacity: 0, scale: 1.08, duration: 1.1, ease: "expo.out", stagger: .06 })
    });
    ScrollTrigger.create({ trigger: "#work", start: "top 60%", once: true, onEnter: () => flash(.2) });

    // process: pinned phone with fanning glass cards (desktop)
    const mm = gsap.matchMedia();
    mm.add("(min-width: 861px)", () => {
      const steps = $$(".step");
      const fromX = [-1, -1, 1, 1];
      gsap.set(steps, { opacity: 0 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: ".process", start: "top top", end: "+=2600", pin: ".process__pin", scrub: 1,
        onUpdate: self => setPhoneStep(Math.min(3, Math.floor(self.progress * 4.2))) } });
      tl.fromTo("#phone", { rotateY: -25, rotateX: 10, scale: .85, transformPerspective: 1200 }, { rotateY: 0, rotateX: 0, scale: 1, duration: 1 }, 0);
      steps.forEach((s, i) => {
        const dir = fromX[i] * (lang === "ar" ? -1 : 1);
        tl.fromTo(s, { opacity: 0, x: -dir * 260, y: 40, rotate: -dir * 14, scale: .8 },
          { opacity: 1, x: 0, y: 0, rotate: dir * (i % 2 ? 2 : -3), scale: 1, duration: 1, ease: "power3.out" }, .6 + i * .9);
      });
      tl.to("#phone", { rotateY: 12, duration: 1.2 }, 2.4).to("#phone", { rotateY: 0, scale: 1.04, duration: 1 }, 3.6);
      return () => gsap.set(steps, { clearProps: "all" });
    });
    mm.add("(max-width: 860px)", () => {
      ScrollTrigger.create({ trigger: "#phone", start: "top 70%", onEnter: () => setPhoneStep(0) });
      $$(".step").forEach((s, i) => {
        gsap.from(s, { y: 60, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 88%", onEnter: () => setPhoneStep(i) } });
      });
    });

    // photos: horizontal pinned scroll on desktop, swipe on phones
    mm.add("(min-width: 861px)", () => {
      const track = $("#photosTrack");
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const len = () => "+=" + Math.round(dist() * 0.45); // gallery moves ~2x faster than the scroll
      gsap.to(track, { x: () => (html.dir === "rtl" ? 1 : -1) * dist(), ease: "none",
        scrollTrigger: { trigger: "#photosViewport", start: "center center", end: len, pin: ".photos", scrub: 1, invalidateOnRefresh: true } });
      $$(".ph img").forEach(img => gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: "none",
        scrollTrigger: { trigger: "#photosViewport", start: "center center", end: len, scrub: true, invalidateOnRefresh: true } }));
    });
    mm.add("(max-width: 860px)", () => {
      const vp = $("#photosViewport");
      vp.style.overflowX = "auto"; vp.style.scrollSnapType = "x mandatory"; vp.style.scrollbarWidth = "none";
      $$(".ph").forEach(p => p.style.scrollSnapAlign = "center");
    });

    // services stagger
    ScrollTrigger.batch(".svc", { start: "top 90%", once: true,
      onEnter: els => gsap.from(els, { y: 70, opacity: 0, scale: .94, duration: 1, ease: "expo.out", stagger: .08 }) });

    // stats count up
    $$(".stat__num span").forEach(s => {
      const o = { v: 0 };
      gsap.to(o, { v: +s.dataset.to, duration: 2, ease: "power3.out", scrollTrigger: { trigger: s, start: "top 90%", once: true },
        onUpdate: () => s.textContent = Math.round(o.v) });
    });

    // builder panels
    gsap.from(".builder__steps .q", { y: 40, opacity: 0, stagger: .07, duration: .9, ease: "expo.out", scrollTrigger: { trigger: "#builder", start: "top 80%" } });
    gsap.from("#summary", { y: 60, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: "#builder", start: "top 75%" } });

    // final: video inside the giant words
    ScrollTrigger.create({ trigger: ".final", start: "top bottom", once: true, onEnter: () => { const v = $("#finalVideo"); v.src = C.finalVideo; v.play().catch(() => {}); } });
    gsap.fromTo(".final__knock h2", { scale: 1.6, letterSpacing: "0.08em" }, { scale: 1, letterSpacing: "-0.01em", ease: "none", scrollTrigger: { trigger: ".final", start: "top bottom", end: "center center", scrub: true } });
    gsap.from(".final__ctas > *", { y: 40, opacity: 0, stagger: .1, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".final__ctas", start: "top 90%" } });

    // footer wordmark
    gsap.from(".footer__big", { yPercent: 40, opacity: 0, ease: "none", scrollTrigger: { trigger: ".footer", start: "top bottom", end: "top 40%", scrub: true } });
  }

  /* ------------------------------------------------------- chrome & ui */
  function navBehaviour() {
    let lastY = 0;
    const nav = $("#nav"), bar = $("#mbar");
    const onScroll = () => {
      const y = scrollY;
      nav.classList.toggle("is-hidden", y > lastY && y > 300 && !$("#menu").classList.contains("is-open"));
      bar.classList.toggle("is-on", y > innerHeight * .6);
      lastY = y;
    };
    addEventListener("scroll", onScroll, { passive: true });
  }
  function closeMenu() {
    $("#menu").classList.remove("is-open"); $("#menu").setAttribute("aria-hidden", "true");
    $("#burger").setAttribute("aria-expanded", "false");
    lenis && lenis.start();
  }
  function menuBehaviour() {
    $("#burger").addEventListener("click", () => {
      const open = !$("#menu").classList.contains("is-open");
      if (!open) return closeMenu();
      $("#menu").classList.add("is-open"); $("#menu").setAttribute("aria-hidden", "false");
      $("#burger").setAttribute("aria-expanded", "true");
      if (hasGsap && !reduce) gsap.from("#menu nav a", { yPercent: 100, opacity: 0, stagger: .06, duration: .8, ease: "expo.out", delay: .15 });
    });
    $$("#menu a").forEach(a => a.addEventListener("click", closeMenu));
  }

  function cursorState(state) {
    const c = $(".cursor"); if (!c) return;
    c.classList.toggle("is-play", state === "play" || state === "view");
    $(".cursor__label").textContent = state === "view" ? t("ui.view") : t("ui.play");
  }
  function cursor() {
    if (!finePointer || !hasGsap) return;
    const dot = $(".cursor__dot"), ring = $(".cursor__ring");
    const xd = gsap.quickTo(dot, "x", { duration: .1 }), yd = gsap.quickTo(dot, "y", { duration: .1 });
    const xr = gsap.quickTo(ring, "x", { duration: .45, ease: "power3" }), yr = gsap.quickTo(ring, "y", { duration: .45, ease: "power3" });
    addEventListener("mousemove", e => { xd(e.clientX); yd(e.clientY); xr(e.clientX); yr(e.clientY); });
    document.addEventListener("mouseover", e => {
      const link = e.target.closest("a, button, .chip, input[type=range]");
      $(".cursor").classList.toggle("is-link", !!link && !e.target.closest(".card"));
    });
  }
  function magnetic() {
    if (!finePointer || !hasGsap || reduce) return;
    document.addEventListener("mousemove", e => {
      $$(".magnetic").forEach(el => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * .9;
        gsap.to(el, { x: near ? dx * .25 : 0, y: near ? dy * .35 : 0, duration: .6, ease: "power3.out" });
      });
    });
  }

  function langToggle() {
    $("#langToggle").addEventListener("click", () => {
      lang = lang === "en" ? "ar" : "en";
      store.set("lang", lang);
      const swap = () => {
        renderAll();
        renderWall();
        if (hasGsap && !reduce) {
          motionManifesto();
          ScrollTrigger.refresh();
        }
      };
      if (hasGsap && !reduce) {
        gsap.timeline()
          .to("#flash", { opacity: .9, duration: .18, ease: "power2.in" })
          .add(swap)
          .to("#flash", { opacity: 0, duration: .5, ease: "power2.out" });
      } else swap();
    });
  }

  /* ---------------------------------------------------------------- boot */
  async function boot() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (!location.hash) scrollTo(0, 0);
    const ready = { done: false };
    const loader = runLoader(ready);
    try {
      C = await fetch("content/site.json", { cache: "no-cache" }).then(r => r.json());
    } catch (e) {
      console.error("Could not load content/site.json — open the site through a web server (see README).", e);
      return;
    }
    const q = new URLSearchParams(location.search).get("lang");
    lang = (q === "ar" || q === "en") ? q : (store.get("lang") || "en");
    renderAll(); renderMarquee(); renderWall(); renderPhotos();
    bindBuilder(); navBehaviour(); menuBehaviour(); cursor(); magnetic(); langToggle();
    try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch {}
    ready.done = true;
    await loader;
    if (!location.hash) scrollTo(0, 0); // undo the browser's scroll restoration
    initScroll();
    if (lenis && !location.hash) lenis.scrollTo(0, { immediate: true });
    heroIntro();
    motion();
    addEventListener("resize", () => { layoutGrid(); moveIndicator(); }, { passive: true });
    $("#moreWork").addEventListener("click", () => {
      if ($("#moreWork").dataset.mode === "all") return setCategory("all");
      viewLimit += STEP; applyFilter(true);
    });
    $("#lbClose").addEventListener("click", closeLightbox);
    $("#lightbox").addEventListener("click", e => { if (e.target.id === "lightbox") closeLightbox(); });
    addEventListener("keydown", e => { if (e.key === "Escape") { closeLightbox(); closeMenu(); } });
    setTimeout(() => { layoutGrid(); hasGsap && ScrollTrigger.refresh(); }, 600);
  }
  boot();
})();
