/* ============================================================
   Gerald Munetsi — Portfolio interactions
   Vanilla JS, no dependencies (GitHub Pages friendly)
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky nav state + scroll progress ---------- */
  var nav = document.getElementById("nav");
  var progress = document.getElementById("scrollProgress");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("is-scrolled", y > 20);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Typewriter role rotation ---------- */
  var tw = document.getElementById("typewriter");
  if (tw) {
    var roles = ["Deep Learning Researcher", "Infectious Disease Modeler", "Social Entrepreneur"];
    if (reduceMotion) {
      // Static, cycle every few seconds without the character animation
      var ri = 0;
      tw.textContent = roles[0];
      tw.style.borderRight = "0";
      setInterval(function () { ri = (ri + 1) % roles.length; tw.textContent = roles[ri]; }, 2600);
    } else {
      var rIndex = 0, cIndex = 0, deleting = false;
      var TYPE = 70, ERASE = 38, HOLD = 1500, GAP = 350;
      (function tick() {
        var word = roles[rIndex];
        if (!deleting) {
          tw.textContent = word.slice(0, ++cIndex);
          if (cIndex === word.length) { deleting = true; return setTimeout(tick, HOLD); }
          return setTimeout(tick, TYPE);
        } else {
          tw.textContent = word.slice(0, --cIndex);
          if (cIndex === 0) { deleting = false; rIndex = (rIndex + 1) % roles.length; return setTimeout(tick, GAP); }
          return setTimeout(tick, ERASE);
        }
      })();
    }
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          // small stagger for siblings
          var delay = parseInt(e.target.getAttribute("data-delay") || "0", 10);
          setTimeout(function () { e.target.classList.add("is-in"); }, delay);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealEls.forEach(function (el, i) {
      // gentle stagger within a viewport
      el.setAttribute("data-delay", String((i % 6) * 60));
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Count-up stats ---------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll(".stat__num"));
  function runCounter(el) {
    var target = parseInt(el.getAttribute("data-count") || "0", 10);
    if (reduceMotion) { el.textContent = String(target); return; }
    var start = null, dur = 1100;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Lightbox for gallery ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lightboxImg");
  var lbCap = document.getElementById("lightboxCap");
  var lbClose = document.getElementById("lightboxClose");

  function openLightbox(src, cap) {
    if (!lb) return;
    lbImg.setAttribute("src", src);
    lbImg.setAttribute("alt", cap || "");
    lbCap.textContent = cap || "";
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".gal").forEach(function (fig) {
    fig.addEventListener("click", function () {
      var img = fig.querySelector("img");
      // Don't open the lightbox for a missing/broken photo
      if (!img || fig.classList.contains("img-fallback") || !img.naturalWidth) return;
      var cap = fig.querySelector("figcaption");
      openLightbox(img.getAttribute("src"), cap ? cap.textContent : "");
    });
  });
  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lb) lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });

  /* ---------- Active nav link on scroll ---------- */
  var sections = ["about", "work", "research", "gallery", "contact"].map(function (id) {
    return document.getElementById(id);
  }).filter(Boolean);
  var navMap = {};
  document.querySelectorAll('.nav__links a[href^="#"]').forEach(function (a) {
    navMap[a.getAttribute("href").slice(1)] = a;
  });
  if ("IntersectionObserver" in window && sections.length) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = navMap[e.target.id];
        if (link && e.isIntersecting) {
          Object.keys(navMap).forEach(function (k) { navMap[k].classList.remove("is-active"); });
          link.classList.add("is-active");
        }
      });
    }, { threshold: 0.5 });
    sections.forEach(function (s) { so.observe(s); });
  }
})();
