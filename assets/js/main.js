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

  /* ---------------- Smooth scroll (wheel inertia) ----------------
     lerp = how much of the remaining distance is covered each frame:
     higher follows the hand more closely, lower glides longer.
     Touch screens keep their own native momentum (syncTouch off). */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    const loop = t => { lenis.raf(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  function scrollToTarget(el) {
    if (lenis) lenis.scrollTo(el, { duration: 1.2 });
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
  // The dot sits exactly under the pointer (no easing), so it never lags.
  let cursor = null;
  if (finePointer) {
    cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<div class="cursor-ball"><span class="cursor-label"></span></div>';
    document.body.appendChild(cursor);
    const label = cursor.querySelector('.cursor-label');

    let cx = 0, cy = 0, queued = false;
    const place = () => {
      queued = false;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    };
    addEventListener('pointermove', e => {
      cx = e.clientX;
      cy = e.clientY;
      if (!queued) { queued = true; requestAnimationFrame(place); }
      if (!root.classList.contains('has-cursor')) root.classList.add('has-cursor');
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
  const progress = document.querySelector('[data-progress]');
  let vh = innerHeight;

  function updateScroll() {
    scrollQueued = false;
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

    if (progress) {
      const max = document.documentElement.scrollHeight - vh;
      progress.style.setProperty('--progress', max > 0 ? clamp(scrollY / max, 0, 1).toFixed(4) : 0);
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

  // Work only when the page actually scrolls — no loop running while idle.
  let scrollQueued = false;
  const queueScroll = () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } };
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', () => { vh = innerHeight; queueScroll(); }, { passive: true });
  queueScroll();

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

  /* ---------------- Lightbox: enlarge project pages ---------------- */
  const zoomables = $$('[data-zoom]');
  if (zoomables.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Page viewer');
    lb.innerHTML = `
      <div class="lb-scroll" data-lenis-prevent><img alt="" data-cursor="Zoom"></div>
      <button class="lb-close mono" type="button">Close ✕</button>
      <div class="lb-bar mono">
        <span class="lb-count"></span>
        <span class="lb-title"></span>
        <button type="button" data-lb="zoom">Zoom +</button>
        <button type="button" data-lb="prev" aria-label="Previous page">←</button>
        <button type="button" data-lb="next" aria-label="Next page">→</button>
      </div>`;
    document.body.appendChild(lb);

    const scroller = lb.querySelector('.lb-scroll');
    const img = scroller.querySelector('img');
    const count = lb.querySelector('.lb-count');
    const title = lb.querySelector('.lb-title');
    const zoomBtn = lb.querySelector('[data-lb="zoom"]');
    const cursorLabel = document.querySelector('.cursor-label');
    let index = -1;
    let opener = null;

    const setZoom = (on, px, py) => {
      // keep the point that was clicked under the pointer
      const r = img.getBoundingClientRect();
      const fx = px == null ? 0.5 : clamp((px - r.left) / r.width, 0, 1);
      const fy = py == null ? 0.5 : clamp((py - r.top) / r.height, 0, 1);
      lb.classList.toggle('is-zoomed', on);
      zoomBtn.textContent = on ? 'Fit −' : 'Zoom +';
      img.dataset.cursor = on ? 'Fit' : 'Zoom';
      if (cursorLabel && cursor && cursor.classList.contains('is-view')) cursorLabel.textContent = img.dataset.cursor;
      if (on) {
        const nr = img.getBoundingClientRect();
        scroller.scrollLeft = fx * nr.width - (px ?? innerWidth / 2);
        scroller.scrollTop = fy * nr.height - (py ?? innerHeight / 2);
      } else {
        scroller.scrollTop = 0;
        scroller.scrollLeft = 0;
      }
    };

    const show = i => {
      index = (i + zoomables.length) % zoomables.length;
      const el = zoomables[index];
      img.src = el.dataset.zoom;
      img.alt = el.querySelector('img')?.alt || '';
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(zoomables.length).padStart(2, '0')}`;
      title.textContent = el.dataset.zoomTitle || '';
      setZoom(false);
    };

    const open = i => {
      opener = document.activeElement;
      show(i);
      lb.classList.add('is-open');
      if (lenis) lenis.stop();
      document.documentElement.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus({ preventScroll: true });
    };

    const close = () => {
      lb.classList.remove('is-open', 'is-zoomed');
      document.documentElement.style.overflow = '';
      if (lenis) lenis.start();
      // land on the page that was last viewed
      const el = zoomables[index];
      if (el && el !== opener) {
        const off = -Math.max(0, (innerHeight - el.offsetHeight) / 2);
        if (lenis) lenis.scrollTo(el, { immediate: true, offset: off });
        else el.scrollIntoView({ block: 'center' });
      }
      if (el) el.focus({ preventScroll: true });
    };

    zoomables.forEach((el, i) => el.addEventListener('click', () => open(i)));

    img.addEventListener('click', e => setZoom(!lb.classList.contains('is-zoomed'), e.clientX, e.clientY));
    scroller.addEventListener('click', e => { if (e.target === scroller && !lb.classList.contains('is-zoomed')) close(); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    zoomBtn.addEventListener('click', () => setZoom(!lb.classList.contains('is-zoomed')));
    lb.querySelector('[data-lb="prev"]').addEventListener('click', () => show(index - 1));
    lb.querySelector('[data-lb="next"]').addEventListener('click', () => show(index + 1));

    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' && !lb.classList.contains('is-zoomed')) show(index + 1);
      else if (e.key === 'ArrowLeft' && !lb.classList.contains('is-zoomed')) show(index - 1);
      else if (e.key === 'z' || e.key === '+' || e.key === '=') setZoom(true);
      else if (e.key === '-') setZoom(false);
      else if (e.key === 'Tab') {
        // keep focus inside the viewer
        const f = $$('button', lb);
        const at = f.indexOf(document.activeElement);
        if (e.shiftKey && at <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && at === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ---------------- Small things ---------------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
