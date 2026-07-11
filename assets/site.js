/* The Next Mission — shared behaviour. Spec: docs/design-brief.md. */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* [21st.dev] scramble-decrypt on mono section codes — fires once per element */
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

  /* reveals + scramble triggers */
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

  /* [21st.dev] comparison slider */
  document.querySelectorAll(".compare").forEach(function (c) {
    function set(x) {
      var r = c.getBoundingClientRect();
      var pct = Math.max(8, Math.min(92, (x - r.left) / r.width * 100));
      c.style.setProperty("--cut", pct + "%");
    }
    c.addEventListener("pointerdown", function (e) { set(e.clientX); c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", function (e) { if (e.buttons) set(e.clientX); });
  });

  /* [21st.dev] redaction flashlight — hover reveals near cursor; tap toggles all (iPad) */
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

  /* cinematic film hero (index only) — poster overlay → play with sound; native controls after */
  var film = document.getElementById("film");
  if (film) {
    var vid = document.getElementById("herovid");
    var cue = document.getElementById("filmplay");
    cue.addEventListener("click", function () { vid.play().catch(function () {}); });
    vid.addEventListener("play", function () { cue.classList.add("hidden"); });
    vid.addEventListener("ended", function () { cue.classList.remove("hidden"); try { vid.currentTime = 0; } catch (e) {} });
  }
})();
