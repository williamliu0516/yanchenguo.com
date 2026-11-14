/*
 * Motion & interaction for yanchenguo.com
 * Everything here is progressive: the page reads fine without it.
 */
(() => {
  window.__ready = true;

  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------------- Smooth scroll ---------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
  }

  function scrollToTarget(el) {
    if (lenis) lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------------- Split text into characters ---------------- */
  function split(el) {
    let i = 0;
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            for (const ch of part) {
              const c = document.createElement('span');
              c.className = 'c';
              c.textContent = ch;
              c.style.setProperty('--i', i++);
              w.appendChild(c);
            }
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    };
    walk(el);
    el.setAttribute('aria-label', label);
    el.classList.add('split');
  }
  $$('[data-split]').forEach(split);

  /* ---------------- Statement: wrap words for scroll lighting ---------------- */
  const scrubs = $$('[data-scrub]').map(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const spans = words.map((word, i) => {
      const s = document.createElement('span');
      s.className = 'sw';
      s.textContent = word;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    return { el, spans, last: -1 };
  });

  /* ---------------- Reveal on enter ---------------- */
  // Clip-revealed elements start with zero visible area, which IntersectionObserver
  // treats as "not intersecting" — so watch their parent instead.
  const revealFor = new Map();
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      (revealFor.get(e.target) || []).forEach(el => el.classList.add('is-in'));
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
  $$('[data-reveal], [data-split]').forEach(el => {
    const watch = el.dataset.reveal === 'clip' ? el.parentElement : el;
    if (!revealFor.has(watch)) revealFor.set(watch, []);
    revealFor.get(watch).push(el);
    io.observe(watch);
  });

  /* ---------------- Cursor ---------------- */
  let cursor = null;
  const cur = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
  if (finePointer) {
    cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<div class="cursor-ball"><span class="cursor-label"></span></div>';
    document.body.appendChild(cursor);
    const label = cursor.querySelector('.cursor-label');

    addEventListener('pointermove', e => {
      cur.tx = e.clientX;
      cur.ty = e.clientY;
      if (!root.classList.contains('has-cursor')) {
        cur.x = cur.tx; cur.y = cur.ty;
        root.classList.add('has-cursor');
      }
    }, { passive: true });

    document.addEventListener('pointerout', e => { if (!e.relatedTarget) root.classList.remove('has-cursor'); });

    document.addEventListener('pointerover', e => {
      const view = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !view && !!link);
      if (view) label.textContent = view.dataset.cursor;
    });
  }

  /* ---------------- Tilt + light on covers ---------------- */
  if (finePointer && !reduce) {
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------------- Magnetic elements ---------------- */
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach(el => {
      const k = parseFloat(el.dataset.magnetic) || 0.3;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate3d(${(x * k).toFixed(1)}px, ${(y * k).toFixed(1)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------- Scroll-linked effects ---------------- */
  const parallax = $$('[data-parallax]').map(el => ({ el, k: parseFloat(el.dataset.parallax) || 0.1 }));
  const expanders = $$('[data-expand]');
  let vh = innerHeight;

  addEventListener('resize', () => { vh = innerHeight; }, { passive: true });

  function updateScroll() {
    if (!reduce) {
      for (const { el, k } of parallax) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const c = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(-c * k * r.height).toFixed(1)}px, 0)`;
      }

      for (const el of expanders) {
        const r = el.getBoundingClientRect();
        const p = clamp(1 - r.top / vh, 0, 1);
        el.style.setProperty('--p', p.toFixed(3));
      }
    }

    for (const s of scrubs) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const p = clamp((vh * 0.9 - r.top) / (r.height + vh * 0.6), 0, 1);
      const lit = p * (s.spans.length + 3);
      if (Math.abs(lit - s.last) < 0.01) continue;
      s.last = lit;
      s.spans.forEach((w, i) => {
        const a = clamp(lit - i, 0, 1);
        w.style.opacity = (0.14 + 0.86 * a).toFixed(3);
      });
    }
  }

  /* ---------------- Main loop ---------------- */
  function frame(now) {
    if (lenis) lenis.raf(now);
    updateScroll();

    if (cursor) {
      cur.x += (cur.tx - cur.x) * 0.22;
      cur.y += (cur.ty - cur.y) * 0.22;
      cursor.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------------- Links: in-page scroll & page transitions ---------------- */
  const samePage = url => url.origin === location.origin &&
    url.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '');

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;

    if (samePage(url)) {
      e.preventDefault();
      const target = url.hash ? document.querySelector(url.hash) : document.body;
      if (target) scrollToTarget(target);
      return;
    }

    if (reduce) return;
    e.preventDefault();
    root.classList.add('is-leaving');
    setTimeout(() => { location.href = url.href; }, 620);
  });

  addEventListener('pageshow', e => { if (e.persisted) root.classList.remove('is-leaving'); });

  // arriving at /#section from another page
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) setTimeout(() => scrollToTarget(target), 300);
  }

  /* ---------------- Small things ---------------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
