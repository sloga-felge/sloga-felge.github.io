/* SERVIS FELGI SLOGA — Interaktion.
   Alles hier ist Verbesserung, nichts ist Voraussetzung: ohne JavaScript bleiben
   Inhalte, Links, WhatsApp-Button und Vorher/Nachher-Bilder vollständig nutzbar. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Auto-Hide-Header ------------------------------------------ */
  function header() {
    var el = document.querySelector('.hdr');
    if (!el) return;
    var last = window.scrollY, h = el.offsetHeight, ticking = false;
    function upd() {
      var y = window.scrollY;
      if (y > h + 40 && y > last + 4) el.style.transform = 'translateY(-101%)';
      else if (y < last - 4 || y <= h) el.style.transform = '';
      last = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(upd); }
    }, { passive: true });
  }

  /* ---------- Mobilmenü -------------------------------------------------- */
  function burger() {
    var btn = document.querySelector('[data-burger]');
    var menu = document.getElementById('mnav');
    if (!btn || !menu) return;
    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      menu.setAttribute('data-open', open ? '1' : '0');
      document.body.classList.toggle('locked', open);
    }
    btn.addEventListener('click', function () {
      set(btn.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) set(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
  }

  /* ---------- Scroll-Reveal --------------------------------------------- */
  function reveal() {
    var els = document.querySelectorAll('.rv');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add('on');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });

    // Sicherheitsnetz: was beim Laden schon im Sichtfeld liegt, wird auf jeden
    // Fall eingeblendet — Inhalt darf nie an einem Observer hängen bleiben.
    window.addEventListener('load', function () {
      els.forEach(function (el) {
        if (!el.classList.contains('on') && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('on');
        }
      });
    });
  }

  /* ---------- SIGNATURE: Rundlauf-Dial ----------------------------------- */
  function dials() {
    document.querySelectorAll('[data-dial]').forEach(function (dial) {
      var plate = dial.querySelector('.dial__plate');
      var handle = dial.querySelector('.dial__handle');
      if (!plate || !handle) return;

      var ang = parseFloat(dial.dataset.start || '208');
      var dragging = false;

      function apply(a, touched) {
        ang = Math.max(0, Math.min(360, a));
        dial.style.setProperty('--ang', ang.toFixed(1) + 'deg');
        var pct = Math.round(ang / 3.6);
        handle.setAttribute('aria-valuenow', String(pct));
        handle.setAttribute('aria-valuetext', pct + '% ' + (handle.dataset.after || ''));
        dial.dataset.side = pct > 50 ? 'after' : 'before';
        if (touched) dial.dataset.touched = '1';
      }

      function fromEvent(e) {
        var r = plate.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var a = Math.atan2(dx, -dy) * 180 / Math.PI;   // 0° = 12 Uhr, im Uhrzeigersinn
        if (a < 0) a += 360;
        apply(a, true);
      }

      plate.addEventListener('pointerdown', function (e) {
        dragging = true;
        plate.setPointerCapture && plate.setPointerCapture(e.pointerId);
        fromEvent(e);
        e.preventDefault();
      });
      plate.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
        plate.addEventListener(t, function () { dragging = false; });
      });

      handle.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 30 : 9;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { apply(ang + step, true); e.preventDefault(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { apply(ang - step, true); e.preventDefault(); }
        else if (e.key === 'Home') { apply(0, true); e.preventDefault(); }
        else if (e.key === 'End') { apply(360, true); e.preventDefault(); }
      });

      apply(ang, false);
    });
  }

  /* ---------- WhatsApp-Kostenvoranschlag --------------------------------- */
  function estimator() {
    document.querySelectorAll('[data-est]').forEach(function (form) {
      var out = form.querySelector('[data-est-out]');
      var link = form.querySelector('[data-est-link]');
      if (!link) return;
      var base = link.dataset.base || '';

      function label(name) {
        var el = form.querySelector('input[name="' + name + '"]:checked');
        return el ? el.dataset.label || el.value : '';
      }
      function build() {
        var lines = [form.dataset.msgIntro];
        var d = label('damage'), c = label('count'), s = label('size');
        if (d) lines.push(form.dataset.msgDamage + ' ' + d);
        if (c) lines.push(form.dataset.msgCount + ' ' + c);
        if (s) lines.push(form.dataset.msgSize + ' ' + s);
        lines.push(form.dataset.msgOutro);
        var txt = lines.filter(Boolean).join('\n');
        if (out) out.textContent = txt;
        link.href = base + '?text=' + encodeURIComponent(txt);
      }
      form.addEventListener('change', build);
      form.addEventListener('submit', function (e) { e.preventDefault(); link.click(); });
      build();
    });
  }

  /* ---------- Werkstatt-Clips: erst laden, wenn sichtbar ----------------- */
  function clips() {
    var vids = document.querySelectorAll('video[data-clip]');
    if (!vids.length) return;
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          if (!v.dataset.ready) {
            v.dataset.ready = '1';
            v.querySelectorAll('source[data-src]').forEach(function (s) {
              s.src = s.dataset.src;
            });
            v.load();
          }
          if (!reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.35 });
    vids.forEach(function (v) { io.observe(v); });
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    header(); burger(); reveal(); dials(); estimator(); clips();
  });
})();
