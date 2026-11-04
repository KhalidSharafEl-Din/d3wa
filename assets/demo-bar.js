/* Store bar for template demos. Shows only when a demo is opened directly
   (demos/<slug>.html, top-level window). Inside the checkout preview, the
   product-page phone, or a published invitation (served at /<slug>) it does nothing. */
(function () {
  "use strict";
  var m = location.pathname.match(/\/demos\/([a-z]+)\.html$/);
  /* file: is the screenshot pipeline (scripts/shots.mjs); the store bar stays out of product images */
  if (!m || window.top !== window.self || location.protocol === "file:") return;
  var slug = m[1];
  var base = location.pathname.replace(/demos\/[a-z]+\.html$/, "");
  var s = document.createElement("script");
  s.src = base + "assets/catalog.js";
  s.onload = build;
  document.head.appendChild(s);

  function build() {
    var C = window.D3WA;
    var t = C && C.templates.filter(function (x) { return x.k === slug; })[0];
    if (!t) return;
    var price = C.packages.filter(function (p) { return p.k === t.minPkg; })[0].price;
    var bar = document.createElement("div");
    bar.id = "d3wa-demo-bar";
    bar.setAttribute("role", "region");
    var css = document.createElement("style");
    css.textContent =
      "#d3wa-demo-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;align-items:center;gap:10px;" +
      "padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#5a1426;color:#f7f0ec;" +
      "font:400 14px/1.35 'Readex Pro',system-ui,sans-serif;box-shadow:0 -8px 24px -12px rgba(20,6,10,.6);" +
      "translate:0 110%;transition:translate .5s cubic-bezier(.16,1,.3,1)}" +
      "#d3wa-demo-bar.on{translate:0 0}" +
      "#d3wa-demo-bar .dd-t{flex:1;min-width:0}" +
      "#d3wa-demo-bar .dd-t b{display:block;font-weight:600;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      "#d3wa-demo-bar .dd-t small{color:#d9b8be;font-size:12.5px}" +
      "#d3wa-demo-bar a{flex:none;display:inline-flex;align-items:center;min-height:42px;padding:0 16px;border-radius:6px;" +
      "background:#f7f0ec;color:#5a1426;font-weight:600;text-decoration:none;font-size:14px}" +
      "#d3wa-demo-bar button{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid rgba(247,240,236,.3);" +
      "background:transparent;color:#f7f0ec;font-size:18px;line-height:1;cursor:pointer}" +
      "#d3wa-demo-bar a:focus-visible,#d3wa-demo-bar button:focus-visible{outline:2px solid #c9a46a;outline-offset:2px}" +
      "@media (prefers-reduced-motion:reduce){#d3wa-demo-bar{transition:none}}";
    document.head.appendChild(css);

    function paint() {
      var en = (document.documentElement.lang || "").indexOf("en") === 0;
      bar.dir = en ? "ltr" : "rtl";
      bar.setAttribute("aria-label", en ? "D3wa store" : "متجر دعوة");
      bar.innerHTML =
        '<span class="dd-t"><b>' + (en ? "Demo: " + t.en : "ديمو: " + t.ar) + "</b><small>" +
        (en ? "From EGP " + price.toLocaleString("en-US") + ", with your names"
            : "من " + price.toLocaleString("ar-EG") + " جنيه، بأساميكم") + "</small></span>" +
        '<a href="' + base + "templates/" + slug + '.html">' + (en ? "Order this design" : "اطلبوا التصميم ده") + "</a>" +
        '<button type="button" aria-label="' + (en ? "Close" : "إغلاق") + '">&times;</button>';
      bar.querySelector("button").addEventListener("click", close);
    }
    /* lift the template's own fixed bottom controls (music, share) above the bar */
    var lifted = [];
    function lift(by) {
      lifted.forEach(function (l) { l.el.style.bottom = l.orig; });
      lifted = [];
      if (!by) return;
      Array.prototype.forEach.call(document.body.querySelectorAll("*"), function (el) {
        if (el === bar || bar.contains(el)) return;
        var cs = getComputedStyle(el);
        if (cs.position !== "fixed") return;
        var b = parseFloat(cs.bottom);
        if (isNaN(b) || b > 140 || el.offsetHeight > 200) return;
        lifted.push({ el: el, orig: el.style.bottom });
        el.style.bottom = (b + by) + "px";
      });
    }
    function close() {
      bar.classList.remove("on");
      lift(0);
      try { sessionStorage.setItem("d3wa-demo-bar", "off"); } catch (e) {}
    }
    try { if (sessionStorage.getItem("d3wa-demo-bar") === "off") return; } catch (e) {}
    paint();
    document.body.appendChild(bar);
    new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    setTimeout(function () { bar.classList.add("on"); lift(bar.offsetHeight); }, 1800);
  }
})();
