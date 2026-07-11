/* The Next Mission — shared behaviour. Spec: docs/design-brief-v2.md.
   All vanilla, deterministic, reduced-motion safe. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- DAY / NIGHT THEME TOGGLE (§9.2)
     The no-flash init runs inline in each page's <head> (see snippet below) and sets
     data-theme on <html> before paint. This wires the nav control + persistence. */
  var root = document.documentElement;
  var META_THEME = { dark: "#1C1613", light: "#EFE9DE" };
  function currentTheme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function paintToggle(t) {
    var btn = document.getElementById("themetoggle");
    if (!btn) return;
    var isLight = t === "light";
    btn.setAttribute("aria-pressed", isLight ? "true" : "false");
    btn.setAttribute("aria-label", isLight ? "Switch to night mode" : "Switch to day mode");
    var lbl = btn.querySelector(".tt-label");
    if (lbl) lbl.textContent = isLight ? "Day" : "Night";
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", META_THEME[t]);
  }
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("tnm-theme", t); } catch (e) {}
    paintToggle(t);
  }
  paintToggle(currentTheme());
  var toggle = document.getElementById("themetoggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      setTheme(currentTheme() === "light" ? "dark" : "light");
    });
  }

  /* CONFIG — wire real endpoints here. Empty payment link = route to /join call form. */
  var CFG = {
    FORMSPREE: "https://formspree.io/f/mykvnqvb",       // Chris's existing discovery-call endpoint
    PAY_MANUAL: "",                                      // Stripe Payment Link / Skool checkout when live
    PAY_COHORT: "",
    PAY_BROTHERHOOD: "",
  };
  document.querySelectorAll("[data-pay]").forEach(function (a) {
    var url = CFG["PAY_" + a.dataset.pay.toUpperCase()];
    if (url) { a.href = url; }
    else { a.href = (a.dataset.joinPath || "join.html") + "?interest=" + a.dataset.pay + "#call"; }
  });
  var form = document.getElementById("callform");
  if (form) {
    form.action = CFG.FORMSPREE;
    var interest = new URLSearchParams(location.search).get("interest");
    var sel = form.querySelector("select[name=interest]");
    if (interest && sel) sel.value = interest;
    form.addEventListener("submit", function () {
      var b = form.querySelector("button[type=submit]");
      if (b) { b.disabled = true; b.textContent = "Sending…"; }
    });
  }

  /* ---------------------------------------------------------------- scramble-decrypt on mono codes */
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·-";
  function scramble(el) {
    var final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    if (reduced) { el.textContent = final; return; }
    var frame = 0, total = Math.max(14, final.length * 1.6);
    (function step() {
      var out = "";
      for (var i = 0; i < final.length; i++) {
        var ch = final[i];
        if (ch === " " || frame / total * final.length > i) out += ch;
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (frame++ < total) requestAnimationFrame(step);
      else el.textContent = final;
    })();
  }

  /* ---------------------------------------------------------------- reveals + scramble triggers */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        en.target.querySelectorAll(".code[data-scramble]").forEach(scramble);
        if (en.target.matches(".code[data-scramble]")) scramble(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal, .code[data-scramble]").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------------------------------------------------------------- MANIFESTO staggered reveal (§5 #7) */
  document.querySelectorAll(".creed").forEach(function (creed) {
    var lines = creed.querySelectorAll(".creed-line");
    if (reduced || !("IntersectionObserver" in window)) {
      lines.forEach(function (l) { l.classList.add("in"); });
      return;
    }
    var mo = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        lines.forEach(function (l, i) {
          l.style.transitionDelay = (i * 130) + "ms";
          l.querySelectorAll(".creed-code, .creed-txt").forEach(function (n) { n.style.transitionDelay = (i * 130) + "ms"; });
          l.classList.add("in");
        });
        mo.unobserve(en.target);
      });
    }, { threshold: 0.3 });
    mo.observe(creed);
  });

  /* ---------------------------------------------------------------- TRAJECTORY count-up (§5 #5) */
  document.querySelectorAll(".traj").forEach(function (traj) {
    var vals = traj.querySelectorAll("[data-count]");
    var plot = traj.querySelector(".plot");
    function settle() {
      vals.forEach(function (v) { v.textContent = v.dataset.count; });
      if (plot) plot.style.strokeDashoffset = "0";
    }
    if (reduced || !("IntersectionObserver" in window)) { settle(); return; }
    if (plot) {
      var len = plot.getTotalLength ? plot.getTotalLength() : 0;
      if (len) { plot.style.strokeDasharray = len; plot.style.strokeDashoffset = len; plot.style.transition = "stroke-dashoffset 1.1s var(--ease,ease)"; }
    }
    vals.forEach(function (v) { v.textContent = "0"; });   // start from zero; count up when observed (no-JS keeps the authored final value)
    var to = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (plot) plot.style.strokeDashoffset = "0";
        var start = null, dur = 950;
        function tick(ts) {
          if (start === null) start = ts;
          var p = Math.min(1, (ts - start) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          vals.forEach(function (v) { v.textContent = Math.round(e * parseFloat(v.dataset.count)); });
          if (p < 1) requestAnimationFrame(tick); else settle();
        }
        requestAnimationFrame(tick);
        setTimeout(settle, dur + 600);   // safety net: rAF throttles in background tabs — guarantee final values land
        to.unobserve(en.target);
      });
    }, { threshold: 0.35 });
    to.observe(traj);
  });

  /* ---------------------------------------------------------------- MAGNETIC arm-the-CTA (§5 #13)
     <=4px pointer-follow; arm-tick is a pure CSS :hover state; magnet off under reduced-motion. */
  if (!reduced) {
    var MAG = 4;
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        btn.style.setProperty("--mx", (Math.max(-1, Math.min(1, dx)) * MAG).toFixed(1) + "px");
        btn.style.setProperty("--my", (Math.max(-1, Math.min(1, dy)) * MAG).toFixed(1) + "px");
      });
      btn.addEventListener("pointerleave", function () {
        btn.style.setProperty("--mx", "0px");
        btn.style.setProperty("--my", "0px");
      });
    });
  }

  /* ---------------------------------------------------------------- comparison slider */
  document.querySelectorAll(".compare").forEach(function (c) {
    function set(x) {
      var r = c.getBoundingClientRect();
      var pct = Math.max(8, Math.min(92, (x - r.left) / r.width * 100));
      c.style.setProperty("--cut", pct + "%");
    }
    c.addEventListener("pointerdown", function (e) { set(e.clientX); c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", function (e) { if (e.buttons) set(e.clientX); });
  });

  /* ---------------------------------------------------------------- redaction flashlight */
  document.querySelectorAll(".redact").forEach(function (r) {
    r.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      r.querySelectorAll(".blk").forEach(function (b) {
        var br = b.getBoundingClientRect();
        var d = Math.hypot(e.clientX - (br.left + br.width / 2), e.clientY - (br.top + br.height / 2));
        b.classList.toggle("reveal", d < 110);
      });
    });
    r.addEventListener("click", function () { r.classList.toggle("on"); });
  });

  /* ---------------------------------------------------------------- cinematic film hero (index) */
  var film = document.getElementById("film");
  if (film) {
    var vid = document.getElementById("herovid");
    var cue = document.getElementById("filmplay");
    cue.addEventListener("click", function () { vid.play().catch(function () {}); });
    vid.addEventListener("play", function () { cue.classList.add("hidden"); });
    vid.addEventListener("ended", function () { cue.classList.remove("hidden"); try { vid.currentTime = 0; } catch (e) {} });
  }
})();
