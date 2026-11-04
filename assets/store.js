/* D3wa storefront behaviour, shared by every store page. Plain ES5-friendly JS,
   no dependencies, safe to load deferred on low-end Android browsers. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var C = window.D3WA || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function isEn() { return doc.classList.contains("en"); }

  /* ── language: Arabic is the document default, English is remembered ── */
  function swapImages() {
    $$("img[data-en], button[data-en]").forEach(function (el) {
      var attr = el.tagName === "IMG" ? "src" : "data-src";
      if (!el.hasAttribute("data-ar")) el.setAttribute("data-ar", el.getAttribute(attr));
      el.setAttribute(attr, el.getAttribute(isEn() ? "data-en" : "data-ar"));
    });
  }
  function setLang(en) {
    doc.classList.toggle("en", en);
    doc.lang = en ? "en" : "ar";
    doc.dir = en ? "ltr" : "rtl";
    try { localStorage.setItem("d3wa-lang", en ? "en" : "ar"); } catch (e) {}
    swapImages();
    document.dispatchEvent(new CustomEvent("d3wa:lang"));
  }
  var langBtn = $("#langBtn");
  if (langBtn) langBtn.addEventListener("click", function () { setLang(!isEn()); });
  /* a missing English screenshot falls back to the Arabic one */
  $$("img[data-en]").forEach(function (img) {
    img.addEventListener("error", function () {
      var ar = img.getAttribute("data-ar");
      if (ar && img.getAttribute("src") !== ar) img.src = ar;
    });
  });
  if (isEn()) swapImages();

  /* ── mobile menu ── */
  var menuBtn = $("#menuBtn"), nav = $("#nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }); });
  }

  /* ── collection filter (templates/) ── */
  var chips = $("#chips"), grid = $("#grid");
  if (chips && grid) {
    var params = new URLSearchParams(location.search);
    var pkgRank = { classic: 0, signature: 1, royale: 2 };
    var pkg = params.get("pkg");
    var mins = {};
    (C.templates || []).forEach(function (t) { mins[t.k] = t.minPkg; });
    var count = $("#count");
    var apply = function (f) {
      var shown = 0;
      $$(".tile", grid).forEach(function (tile) {
        var k = (tile.querySelector(".mount").getAttribute("href").match(/templates\/([a-z]+)\.html/) || [])[1];
        var okOcc = f === "all" || (" " + tile.getAttribute("data-occ") + " ").indexOf(" " + f + " ") > -1;
        var okPkg = !pkg || !mins[k] || pkgRank[mins[k]] <= pkgRank[pkg];
        tile.hidden = !(okOcc && okPkg);
        if (!tile.hidden) shown++;
      });
      $$(".chip", chips).forEach(function (c) { c.setAttribute("aria-pressed", c.getAttribute("data-f") === f ? "true" : "false"); });
      if (count) {
        var p = (C.packages || []).filter(function (x) { return x.k === pkg; })[0];
        count.innerHTML = '<span class="t-ar">' + shown.toLocaleString("ar-EG") + " تصميم" + (p ? " متاح في باقة " + p.ar : "") + '</span><span class="t-en">' +
          shown + (shown === 1 ? " design" : " designs") + (p ? " available in " + p.en : "") + "</span>";
      }
    };
    $$(".chip", chips).forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.getAttribute("data-f");
        apply(f);
        var u = new URL(location.href);
        if (f === "all") u.searchParams.delete("occ"); else u.searchParams.set("occ", f);
        history.replaceState(null, "", u);
      });
    });
    apply(params.get("occ") || "all");
    /* carry a package chosen on the pricing table through to the product page */
    if (pkgRank[pkg] != null) {
      $$(".tile a[href*='templates/']", grid).forEach(function (a) {
        a.href = a.getAttribute("href").replace(/\.html(\?.*)?$/, ".html?pkg=" + pkg);
      });
    }
  }

  /* ── product page: package picker, gallery, live demo ── */
  var pick = $("#pick");
  if (pick) {
    var tpl = document.body.getAttribute("data-tpl");
    var setBuy = function () {
      var sel = $("input[name=pkg]:checked", pick);
      if (!sel) return;
      ["#buy", "#buy2"].forEach(function (id) {
        var a = $(id);
        if (a) a.href = a.getAttribute("href").replace(/order\.html.*$/, "order.html?t=" + tpl + "&p=" + sel.value);
      });
    };
    pick.addEventListener("change", setBuy);
    var want = $("input[name=pkg][value='" + new URLSearchParams(location.search).get("pkg") + "']", pick);
    if (want && !want.disabled) want.checked = true;
    setBuy();
  }
  var thumbs = $("#thumbs"), still = $("#still"), scr = $("#scr"), play = $("#play");
  function stopDemo() {
    var f = scr && $("iframe", scr);
    if (f) f.remove();
    if (still) still.hidden = false;
    if (play) play.hidden = false;
  }
  if (thumbs && still) {
    $$("button", thumbs).forEach(function (b) {
      b.addEventListener("click", function () {
        stopDemo();
        $$("button", thumbs).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        still.setAttribute("data-ar", b.getAttribute("data-ar") || b.getAttribute("data-src"));
        still.setAttribute("data-en", b.getAttribute("data-en"));
        still.src = isEn() ? b.getAttribute("data-en") : (b.getAttribute("data-ar") || b.getAttribute("data-src"));
      });
    });
  }
  if (play && scr) {
    var fit = function (f) { f.style.transform = "scale(" + (scr.clientWidth / 390) + ")"; f.style.height = Math.ceil(scr.clientHeight * 390 / scr.clientWidth) + "px"; };
    play.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.title = isEn() ? "Live invitation demo" : "ديمو الدعوة";
      f.src = play.getAttribute("data-src");
      scr.appendChild(f);
      fit(f);
      still.hidden = true;
      play.hidden = true;
      $$("button", thumbs).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
    });
    window.addEventListener("resize", function () { var f = $("iframe", scr); if (f) fit(f); });
  }

  /* the floating WhatsApp button stays out of the way until the hero has scrolled past */
  var fab = $(".fab-wa"), heroEl = $(".hero");
  if (fab && heroEl && "IntersectionObserver" in window) {
    fab.classList.add("away");
    new IntersectionObserver(function (es) { fab.classList.toggle("away", es[0].isIntersecting); }, { threshold: .15 }).observe(heroEl);
  }

  /* ── hero: the invitation arriving in the family group ── */
  var stage = $(".hero-stage");
  if (stage) {
    var run = function () {
      stage.classList.remove("stage-run", "stage-done");
      void stage.offsetWidth;
      stage.classList.add("stage-run");
      setTimeout(function () { stage.classList.add("stage-done"); }, 5200);
    };
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: .4 });
        io.observe(stage);
      } else run();
    }
    var replay = $(".replay", stage);
    if (replay) replay.addEventListener("click", run);
  }
})();
