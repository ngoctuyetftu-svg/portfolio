/* Shared interactions: scroll progress, reveal on scroll, count-up numbers,
   case-study section chips, photo lightbox, homepage journey rail, next-project card. */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document.documentElement;
  doc.classList.add('js');

  /* 1. Scroll progress bar */
  const bar = document.createElement('div');
  bar.className = 'progress';
  document.body.prepend(bar);
  const onScroll = () => {
    const max = doc.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* 2. Reveal on scroll, with a small stagger inside grids */
  const groups = '.nums, .learn, .star, .gallery, .grid, .skills-grid, .mini, .pairs, .facts, .pics, .timeline';
  const singles = 'main > section, .cs-section > .prose, #about .about-copy, #about .polaroid, .section-title, .section-lead, .event > div:first-child, .wide-fig, .contact-grid > *';
  if (!reduce && 'IntersectionObserver' in window) {
    const els = new Set();
    document.querySelectorAll(singles).forEach(el => els.add(el));
    document.querySelectorAll(groups).forEach(g => {
      [...g.children].forEach((c, i) => { c.style.setProperty('--d', `${Math.min(i, 8) * 80}ms`); els.add(c); });
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.95) return; // already on screen: leave it visible
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* 3. Count-up numbers when they come into view */
  const fmt = (n, dec, comma) => {
    let s = n.toFixed(dec);
    if (comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return s;
  };
  const countEls = document.querySelectorAll('.num b, .event .big');
  if (!reduce && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target, original = el.innerHTML;
        if (el.dataset.nocount !== undefined || /20\d\d$/.test(el.textContent.trim())) return;
        const parts = original.split(/(\d[\d,]*\.?\d*)/);
        const nums = parts.map(p => /^\d/.test(p) ? { v: parseFloat(p.replace(/,/g, '')), dec: (p.split('.')[1] || '').length, comma: p.includes(',') } : null);
        const t0 = performance.now(), dur = 1100;
        const step = now => {
          const k = Math.min(1, (now - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
          el.innerHTML = parts.map((p, i) => nums[i] ? fmt(nums[i].v * ease, nums[i].dec, nums[i].comma) : p).join('');
          if (k < 1) requestAnimationFrame(step); else el.innerHTML = original;
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    countEls.forEach(el => cio.observe(el));
  }

  /* 4. Case-study chips: jump to each part, highlight the one in view */
  const main = document.querySelector('body.cs main');
  if (main) {
    const secs = [...main.querySelectorAll(':scope > section')];
    const chips = document.createElement('nav');
    chips.className = 'chips';
    chips.setAttribute('aria-label', 'On this page');
    const inner = document.createElement('div');
    inner.className = 'wrap';
    chips.append(inner);
    secs.forEach((s, i) => {
      const h = s.querySelector('h2, h3');
      if (!h) return;
      s.id = s.id || 'part-' + (i + 1);
      const a = document.createElement('a');
      a.href = '#' + s.id;
      a.textContent = h.textContent.replace(/^2026 · |^2025 · /, '');
      inner.append(a);
    });
    document.querySelector('.cs-hero').after(chips);
    const links = [...inner.querySelectorAll('a')];
    const sio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => l.classList.toggle('on', l.hash === '#' + e.target.id));
        const on = inner.querySelector('.on');
        if (on) inner.scrollTo({ left: on.offsetLeft - 40, behavior: reduce ? 'auto' : 'smooth' });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => sio.observe(s));
  }

  /* 5. Lightbox for project photos */
  const imgs = [...document.querySelectorAll('body.cs .gallery img, body.cs .pics img, body.cs .mini img, body.cs .wide-fig img, body.cs .cs-hero .ph img')];
  if (imgs.length) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML = '<button class="lb-close" aria-label="Close">×</button><button class="lb-prev" aria-label="Previous photo">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="lb-next" aria-label="Next photo">›</button>';
    document.body.append(box);
    const big = box.querySelector('img'), cap = box.querySelector('figcaption');
    let idx = 0;
    const show = i => {
      idx = (i + imgs.length) % imgs.length;
      const src = imgs[idx];
      big.src = src.currentSrc || src.src;
      big.alt = src.alt;
      const fc = src.closest('figure') && src.closest('figure').querySelector('figcaption');
      cap.textContent = fc ? fc.textContent : src.alt;
    };
    const open = i => { show(i); box.classList.add('open'); box.querySelector('.lb-close').focus(); };
    const close = () => box.classList.remove('open');
    imgs.forEach((im, i) => {
      im.style.cursor = 'zoom-in';
      im.tabIndex = 0;
      im.addEventListener('click', e => { e.preventDefault(); open(i); });
      im.addEventListener('keydown', e => { if (e.key === 'Enter') open(i); });
    });
    box.addEventListener('click', e => { if (e.target === box) close(); });
    box.querySelector('.lb-close').onclick = close;
    box.querySelector('.lb-prev').onclick = () => show(idx - 1);
    box.querySelector('.lb-next').onclick = () => show(idx + 1);
    addEventListener('keydown', e => {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* 6. Homepage journey rail: one dot per section, filled as you scroll */
  if (document.body.classList.contains('home')) {
    const ids = [['about', 'About'], ['skills', 'Skills'], ['projects', 'Projects'], ['journey', 'Experience'], ['testimonials', 'Testimonials'], ['facts', 'Beyond work'], ['contact', 'Contact']];
    const rail = document.createElement('nav');
    rail.className = 'rail';
    rail.setAttribute('aria-label', 'Sections');
    rail.innerHTML = '<span class="rail-fill"></span>' + ids.map(([id, label], i) => `<a href="#${id}" data-id="${id}"><i></i><span>${String(i + 1).padStart(2, '0')} ${label}</span></a>`).join('');
    document.body.append(rail);
    const fill = rail.querySelector('.rail-fill');
    const navLinks = [...document.querySelectorAll('.nav ul a')];
    const update = () => {
      const mid = scrollY + innerHeight * 0.4;
      let active = -1;
      ids.forEach(([id], i) => { const s = document.getElementById(id); if (s && s.offsetTop <= mid) active = i; });
      rail.querySelectorAll('a').forEach((a, i) => { a.classList.toggle('on', i === active); a.classList.toggle('done', i < active); });
      fill.style.transform = `scaleY(${active < 0 ? 0 : active / (ids.length - 1)})`;
      rail.classList.toggle('show', scrollY > innerHeight * 0.5);
      const cur = active >= 0 ? ids[active][0] : '';
      navLinks.forEach(a => a.classList.toggle('on', a.hash === '#' + cur));
    };
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();

    /* Clouds rise at different speeds as you scroll (parallax) */
    const back = document.querySelector('.bank-back'), front = document.querySelector('.bank-front');
    if (back && !reduce) {
      addEventListener('scroll', () => {
        const y = Math.min(scrollY, 900);
        back.style.transform = `translateY(${y * -0.08}px)`;
        front.style.transform = `translateY(${y * -0.18}px)`;
      }, { passive: true });
    }
    /* Hero stickers drift gently as you scroll away */
    const stickers = document.querySelector('.stickers');
    if (stickers && !reduce) {
      addEventListener('scroll', () => {
        const y = Math.min(scrollY, 600);
        stickers.style.transform = `translateY(${y * -0.12}px)`;
      }, { passive: true });
    }
  }

  /* 6b. Flip cards and focusable testimonials */
  document.querySelectorAll('.flip').forEach(li => {
    const btn = li.querySelector('.flip-inner');
    btn.addEventListener('click', () => {
      const open = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
  });
  document.querySelectorAll('.board .slot').forEach(s => s.tabIndex = 0);

  /* 7. Next-project card with the next project's thumbnail */
  const projects = {
    'uniweek.html': ['VNG University Week 2026', 'images/uniweek-thumb.jpg'],
    'uprace.html': ['Campus Running Ambassador', 'images/uprace-thumb.jpg'],
    'codetour.html': ['Code Tour 2025 & 2026', 'images/codetour-thumb.jpg'],
    'engagement.html': ['VNG Employee Engagement', 'images/engagement-thumb.jpg'],
    'intel-video.html': ['Intel Onboarding Video', 'images/intel-thumb.jpg'],
    'content.html': ['Content Creating', 'images/content-thumb.jpg'],
  };
  const nextBtn = document.querySelector('.next .btn');
  if (nextBtn) {
    const href = nextBtn.getAttribute('href');
    const p = projects[href];
    if (p) {
      const card = document.createElement('a');
      card.className = 'next-card';
      card.href = href;
      card.innerHTML = `<img src="${p[1]}" alt=""><span><small>Next project</small><b>${p[0]}</b></span><em aria-hidden="true">→</em>`;
      nextBtn.replaceWith(card);
    }
  }
})();
