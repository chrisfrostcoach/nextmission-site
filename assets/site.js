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

  /* briefing player (index only) */
  var player = document.getElementById("player");
  if (player) {
    var DUR = 40;
    var scenes = Array.prototype.slice.call(player.querySelectorAll(".scene"));
    var poster = document.getElementById("poster");
    var bar = document.getElementById("bar");
    var fill = document.getElementById("fill");
    var track = document.getElementById("track");
    var tc = document.getElementById("tc");
    var pp = document.getElementById("pp");
    var muteBtn = document.getElementById("mute");
    var playBtn = document.getElementById("play");

    /* VO lazy-init on first play: no audio requests (or 404s) on page load */
    var muted = false, voAvailable = false, voInit = false, vo = [];
    function initVo() {
      if (voInit) return;
      voInit = true;
      fetch("assets/vo/scene-1.mp3", { method: "HEAD" }).then(function (r) {
        if (!r.ok) return;
        vo = scenes.map(function (_, i) {
          var a = new Audio("assets/vo/scene-" + (i + 1) + ".mp3");
          a.preload = "auto";
          return a;
        });
        voAvailable = true;
        muteBtn.hidden = false;
      }).catch(function () {});
    }
    function stopAllVo() { vo.forEach(function (a) { try { a.pause(); a.currentTime = 0; } catch (e) {} }); }

    scenes.forEach(function (s) {
      var t = +s.dataset.start;
      if (t === 0) return;
      var seg = document.createElement("div");
      seg.className = "seg";
      seg.style.left = (t / DUR * 100) + "%";
      track.querySelector(".rail").appendChild(seg);
    });

    var playing = false, elapsed = 0, lastTs = null, raf = null, current = -1;
    function fmt(t) { t = Math.floor(t); return Math.floor(t / 60) + ":" + ("0" + t % 60).slice(-2); }
    function showScene(i) {
      if (i === current) return;
      current = i;
      scenes.forEach(function (s, n) {
        if (n === i) { s.classList.remove("active"); void s.offsetWidth; s.classList.add("active"); }
        else s.classList.remove("active");
      });
      if (playing && voAvailable && !muted) {
        stopAllVo();
        var a = vo[i];
        if (a && a.readyState >= 2) { a.currentTime = 0; a.play().catch(function () {}); }
      }
    }
    function sceneAt(t) {
      for (var i = scenes.length - 1; i >= 0; i--) if (t >= +scenes[i].dataset.start) return i;
      return 0;
    }
    var jmark = document.getElementById("jmark");
    function render() {
      fill.style.width = (elapsed / DUR * 100) + "%";
      tc.textContent = fmt(elapsed) + " / " + fmt(DUR);
      track.setAttribute("aria-valuenow", Math.floor(elapsed));
      if (jmark) jmark.style.left = (4 + (elapsed / DUR) * 92) + "%";
      showScene(sceneAt(elapsed));
    }
    function tick(ts) {
      if (!playing) return;
      if (lastTs !== null) elapsed = Math.min(DUR, elapsed + (ts - lastTs) / 1000);
      lastTs = ts;
      render();
      if (elapsed >= DUR) {
        pause(); stopAllVo();
        poster.classList.remove("hidden");
        playBtn.lastChild.textContent = " Replay the briefing";
        elapsed = 0; current = -1;
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    function play() {
      initVo();
      poster.classList.add("hidden");
      player.classList.add("playing");
      bar.hidden = false;
      playing = true; lastTs = null;
      pp.textContent = "❚❚"; pp.setAttribute("aria-label", "Pause");
      current = -1; render();
      raf = requestAnimationFrame(tick);
    }
    function pause() {
      playing = false; lastTs = null;
      if (raf) cancelAnimationFrame(raf);
      stopAllVo();
      pp.textContent = "▶"; pp.setAttribute("aria-label", "Play");
    }
    playBtn.addEventListener("click", function () {
      if (reduced) { poster.classList.add("hidden"); bar.hidden = false; elapsed = 0; render(); return; }
      play();
    });
    pp.addEventListener("click", function () { playing ? pause() : play(); });
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      muteBtn.textContent = muted ? "🔇" : "🔊";
      muteBtn.setAttribute("aria-label", muted ? "Unmute voiceover" : "Mute voiceover");
      if (muted) stopAllVo();
    });
    function seekTo(x) {
      var r = track.getBoundingClientRect();
      elapsed = Math.max(0, Math.min(DUR, (x - r.left) / r.width * DUR));
      current = -1; render();
    }
    track.addEventListener("click", function (e) { seekTo(e.clientX); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { elapsed = Math.min(DUR, elapsed + 10); current = -1; render(); }
      if (e.key === "ArrowLeft") { elapsed = Math.max(0, elapsed - 10); current = -1; render(); }
    });
  }
})();
