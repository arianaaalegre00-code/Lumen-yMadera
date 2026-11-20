/* ============================================================================
   LUMEN & MADERA · script.js
   ----------------------------------------------------------------------------
   01. Utilidades y formato        07. Filtros de colección
   02. Registro de productos       08. Custom Studio (plano + estimado)
   03. Carrito (estado + render)   09. Carrusel de reseñas
   04. Drawer lateral              10. Formulario de contacto
   05. Notificaciones (toasts)     11. Newsletter
   06. Navegación y header         12. Reveal, magnéticos, imágenes, varios
   ============================================================================ */

(function () {
  'use strict';

  /* ==================================================== 01. UTILIDADES */
  const $  = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const escapeHTML = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const money = (() => {
    try {
      const formatter = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
      });
      return (value) => formatter.format(Number(value) || 0);
    } catch (error) {
      return (value) => '$ ' + (Number(value) || 0).toLocaleString('es-AR');
    }
  })();

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /* ============================================ 02. REGISTRO DE PRODUCTOS */
  const productRegistry = new Map();

  $$('.piece').forEach((piece) => {
    const image = $('img', piece);
    const id = piece.dataset.id;
    if (!id) return;

    productRegistry.set(id, {
      id,
      name: piece.dataset.name || 'Pieza',
      category: piece.dataset.categoryLabel || '',
      price: Number(piece.dataset.price) || 0,
      image: image ? image.getAttribute('src') : ''
    });
  });

  /* ================================================ 03. CARRITO (ESTADO) */
  const STORAGE_KEY = 'lumen-madera-cart-v1';
  const FREE_SHIPPING = 1000000;
  const SHIPPING_COST = 45000;

  const cart = new Map();

  const cartCountEl    = $('#cartCount');
  const cartCountLabel = $('#cartCountLabel');
  const cartListEl     = $('#cartList');
  const cartEmptyEl    = $('#cartEmpty');
  const drawerCountEl  = $('#drawerCount');
  const drawerFootEl   = $('#drawerFoot');
  const sumSubtotalEl  = $('#sumSubtotal');
  const sumShippingEl  = $('#sumShipping');
  const sumTotalEl     = $('#sumTotal');
  const shippingNoteEl = $('#shippingNote');

  const cartTotals = () => {
    let subtotal = 0;
    let units = 0;

    cart.forEach((item) => {
      subtotal += item.price * item.qty;
      units += item.qty;
    });

    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_COST;

    return { subtotal, shipping, total: subtotal + shipping, units };
  };

  const persistCart = () => {
    try {
      const payload = Array.from(cart.values()).map((item) => ({
        id: item.id,
        qty: item.qty
      }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      /* Almacenamiento no disponible: el carrito sigue funcionando en memoria */
    }
  };

  const restoreCart = () => {
    let stored = null;
    try {
      stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
      stored = null;
    }
    if (!Array.isArray(stored)) return;

    stored.forEach((entry) => {
      const product = productRegistry.get(entry && entry.id);
      if (!product) return;
      const qty = clamp(parseInt(entry.qty, 10) || 1, 1, 99);
      cart.set(product.id, Object.assign({}, product, { qty }));
    });
  };

  /* ---------------------------------------------- Render del carrito */
  const cartItemMarkup = (item) => {
    const safeImage = escapeHTML(item.image);

    return `
      <li class="cart-item" data-id="${escapeHTML(item.id)}">
        <div class="cart-item__thumb">
          <img src="${safeImage}" alt="${escapeHTML(item.name)}" loading="lazy" decoding="async" />
        </div>
        <div class="cart-item__info">
          <p class="cart-item__cat">${escapeHTML(item.category)}</p>
          <h3 class="cart-item__name">${escapeHTML(item.name)}</h3>
          <p class="cart-item__unit">${money(item.price)} c/u</p>
          <div class="cart-item__row">
            <div class="qty" role="group" aria-label="Cantidad de ${escapeHTML(item.name)}">
              <button class="qty__btn" type="button" data-act="dec"
                      aria-label="Quitar una unidad de ${escapeHTML(item.name)}">&minus;</button>
              <span class="qty__value" data-qty>${item.qty}</span>
              <button class="qty__btn" type="button" data-act="inc"
                      aria-label="Sumar una unidad de ${escapeHTML(item.name)}">+</button>
            </div>
            <p class="cart-item__price">${money(item.price * item.qty)}</p>
          </div>
        </div>
        <button class="cart-item__remove" type="button" data-act="remove"
                aria-label="Eliminar ${escapeHTML(item.name)} del carrito">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
               stroke-linecap="round" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </li>`;
  };

  const renderCart = () => {
    const { subtotal, shipping, total, units } = cartTotals();

    /* Contador del header */
    if (cartCountEl) {
      cartCountEl.textContent = String(units);
      cartCountEl.dataset.empty = units === 0 ? 'true' : 'false';
    }
    if (cartCountLabel) {
      cartCountLabel.textContent = `${units} ${units === 1 ? 'producto' : 'productos'} en el carrito`;
    }
    if (drawerCountEl) drawerCountEl.textContent = String(units);

    /* Lista */
    if (cartListEl) {
      if (cart.size === 0) {
        cartListEl.innerHTML = '';
      } else {
        cartListEl.innerHTML = Array.from(cart.values()).map(cartItemMarkup).join('');
        $$('.cart-item__thumb img', cartListEl).forEach((img) => {
          if (img.complete && img.naturalWidth === 0) img.classList.add('is-missing');
          img.addEventListener('error', () => img.classList.add('is-missing'));
        });
      }
    }

    const isEmpty = cart.size === 0;
    if (cartEmptyEl) cartEmptyEl.hidden = !isEmpty;
    if (drawerFootEl) drawerFootEl.hidden = isEmpty;
    if (cartListEl) cartListEl.hidden = isEmpty;

    /* Totales */
    if (sumSubtotalEl) sumSubtotalEl.textContent = money(subtotal);
    if (sumShippingEl) {
      sumShippingEl.textContent = isEmpty
        ? '—'
        : (shipping === 0 ? 'Sin cargo' : money(shipping));
    }
    if (sumTotalEl) sumTotalEl.textContent = money(total);

    if (shippingNoteEl) {
      if (isEmpty) {
        shippingNoteEl.textContent = `Envío sin cargo en pedidos superiores a ${money(FREE_SHIPPING)}.`;
      } else if (shipping > 0) {
        shippingNoteEl.textContent =
          `Te faltan ${money(FREE_SHIPPING - subtotal)} para obtener el envío sin cargo.`;
      } else {
        shippingNoteEl.textContent = '¡Tenés envío y montaje sin cargo en este pedido!';
      }
    }
  };

  const bumpCartButton = () => {
    const button = $('#cartBtn');
    if (!button) return;
    button.classList.remove('is-bump');
    /* Fuerza el reinicio de la animación */
    void button.offsetWidth;
    button.classList.add('is-bump');
  };

  const addToCart = (id, quantity) => {
    const product = productRegistry.get(id);
    if (!product) return;

    const amount = clamp(parseInt(quantity, 10) || 1, 1, 99);
    const current = cart.get(id);

    if (current) {
      current.qty = clamp(current.qty + amount, 1, 99);
    } else {
      cart.set(id, Object.assign({}, product, { qty: amount }));
    }

    persistCart();
    renderCart();
    bumpCartButton();

    notify({
      title: 'Añadido a tu selección',
      text: `${product.name} · ${money(product.price)}`,
      action: { label: 'Ver carrito', onClick: openDrawer }
    });
  };

  const updateQuantity = (id, delta) => {
    const item = cart.get(id);
    if (!item) return;

    const next = clamp(item.qty + delta, 0, 99);
    if (next === 0) {
      removeFromCart(id);
      return;
    }
    item.qty = next;
    persistCart();
    renderCart();
  };

  const removeFromCart = (id) => {
    const item = cart.get(id);
    if (!item) return;

    const row = cartListEl ? cartListEl.querySelector(`.cart-item[data-id="${id}"]`) : null;

    const finish = () => {
      cart.delete(id);
      persistCart();
      renderCart();
      notify({ title: 'Pieza eliminada', text: `${item.name} salió de tu selección` });
    };

    if (row && !reduceMotion) {
      row.classList.add('is-leaving');
      window.setTimeout(finish, 300);
    } else {
      finish();
    }
  };

  /* Delegación de eventos dentro de la lista del carrito */
  if (cartListEl) {
    cartListEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-act]');
      if (!button) return;

      const row = button.closest('.cart-item');
      if (!row) return;

      const id = row.dataset.id;
      const action = button.dataset.act;

      if (action === 'inc') updateQuantity(id, 1);
      if (action === 'dec') updateQuantity(id, -1);
      if (action === 'remove') removeFromCart(id);
    });
  }

  /* Botones "Añadir" y "Añadir al carrito" de cada pieza */
  $$('.piece').forEach((piece) => {
    const id = piece.dataset.id;

    const handleAdd = (button) => {
      addToCart(id, 1);
      if (!button) return;
      button.classList.add('is-added');
      window.setTimeout(() => button.classList.remove('is-added'), 900);
    };

    const addButton = $('[data-add]', piece);
    const quickButton = $('[data-quick]', piece);

    if (addButton) addButton.addEventListener('click', () => handleAdd(addButton));
    if (quickButton) quickButton.addEventListener('click', () => handleAdd(quickButton));
  });

  /* ==================================================== 04. DRAWER LATERAL */
  const drawer = $('#cartDrawer');
  const overlay = $('#overlay');
  const cartButton = $('#cartBtn');
  const drawerCloseBtn = $('#drawerClose');
  const drawerSuccess = $('#drawerSuccess');
  const orderCodeEl = $('#orderCode');
  const checkoutBtn = $('#checkoutBtn');
  const continueBtn = $('#continueBtn');
  const emptyCta = $('#emptyCta');
  const successClose = $('#successClose');

  let lastFocused = null;
  let overlayTimer = null;
  let inertTimer = null;

  if (drawer) {
    try { drawer.inert = true; } catch (error) { /* navegadores sin soporte */ }
  }

  function openDrawer() {
    if (!drawer) return;

    lastFocused = document.activeElement;
    clearTimeout(overlayTimer);
    clearTimeout(inertTimer);

    try { drawer.inert = false; } catch (error) { /* sin soporte */ }
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');

    if (overlay) {
      overlay.hidden = false;
      /* Fuerza el reflow para que la transición de opacidad se reproduzca */
      void overlay.offsetWidth;
      overlay.classList.add('is-visible');
    }

    document.body.classList.add('is-locked');
    if (cartButton) cartButton.setAttribute('aria-expanded', 'true');

    window.setTimeout(() => {
      const target = drawerCloseBtn || drawer;
      if (target && typeof target.focus === 'function') target.focus();
    }, 320);
  }

  function closeDrawer() {
    if (!drawer) return;

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (cartButton) cartButton.setAttribute('aria-expanded', 'false');

    if (overlay) {
      overlay.classList.remove('is-visible');
      clearTimeout(overlayTimer);
      overlayTimer = window.setTimeout(() => { overlay.hidden = true; }, 420);
    }

    inertTimer = window.setTimeout(() => {
      try { drawer.inert = true; } catch (error) { /* sin soporte */ }
    }, 560);

    if (drawerSuccess) drawerSuccess.hidden = true;

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  if (cartButton) cartButton.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
  if (continueBtn) continueBtn.addEventListener('click', closeDrawer);
  if (successClose) successClose.addEventListener('click', closeDrawer);

  if (emptyCta) {
    emptyCta.addEventListener('click', () => {
      closeDrawer();
      const target = $('#coleccion');
      if (target) {
        const offset = ($('#header') ? $('#header').offsetHeight : 0) + 18;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - offset,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (!drawer || !drawer.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      closeDrawer();
      return;
    }

    /* Foco contenido dentro del drawer */
    if (event.key === 'Tab') {
      const focusables = $$(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        drawer
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* Finalizar compra (simulación) */
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.size === 0) {
        notify({ type: 'error', title: 'Tu carrito está vacío', text: 'Sumá alguna pieza para continuar.' });
        return;
      }

      checkoutBtn.classList.add('is-loading');

      window.setTimeout(() => {
        checkoutBtn.classList.remove('is-loading');

        const code = 'LM-' + String(Date.now()).slice(-6);
        if (orderCodeEl) orderCodeEl.textContent = code;
        if (drawerSuccess) drawerSuccess.hidden = false;

        cart.clear();
        persistCart();
        renderCart();

        notify({
          title: '¡Compra confirmada!',
          text: `Pedido ${code} · te contactamos en 24 h`
        });
      }, 1400);
    });
  }

  /* ================================================ 05. NOTIFICACIONES */
  const toastStack = $('#toasts');

  const ICONS = {
    success: '<path d="m5 13 4.5 4.5L19 7" />',
    error: '<path d="M12 8v5M12 16.5v.01" /><circle cx="12" cy="12" r="9" />',
    info: '<path d="M12 11v6M12 7.5v.01" /><circle cx="12" cy="12" r="9" />'
  };

  function notify(options) {
    if (!toastStack) return;

    const settings = Object.assign({ type: 'success', title: '', text: '', action: null }, options);
    const type = ICONS[settings.type] ? settings.type : 'success';

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');

    toast.innerHTML = `
      <span class="toast__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">${ICONS[type]}</svg>
      </span>
      <div class="toast__body">
        <p class="toast__title">${escapeHTML(settings.title)}</p>
        ${settings.text ? `<p class="toast__text">${escapeHTML(settings.text)}</p>` : ''}
      </div>
      ${settings.action ? `<button class="toast__action" type="button">${escapeHTML(settings.action.label)}</button>` : ''}
    `;

    if (settings.action) {
      const actionButton = $('.toast__action', toast);
      if (actionButton) {
        actionButton.addEventListener('click', () => {
          settings.action.onClick();
          dismissToast(toast);
        });
      }
    }

    toastStack.appendChild(toast);

    const lifetime = window.setTimeout(() => dismissToast(toast), 4200);
    toast.addEventListener('mouseenter', () => window.clearTimeout(lifetime));
  }

  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 300);
  }

  /* ============================================ 06. NAVEGACIÓN Y HEADER */
  const header = $('#header');
  const navMenu = $('#nav');
  const burger = $('#burger');
  const navLinks = $$('.nav__link');
  const toTopBtn = $('#toTop');

  const updateHeaderState = () => {
    const scrolled = window.scrollY > 14;
    if (header) header.classList.toggle('is-scrolled', scrolled);
    if (toTopBtn) toTopBtn.classList.toggle('is-visible', window.scrollY > 760);
  };

  window.addEventListener('scroll', updateHeaderState, { passive: true });
  updateHeaderState();

  const isNavOpen = () => !!navMenu && navMenu.classList.contains('is-open');

  const openNav = () => {
    if (!navMenu || !burger) return;
    navMenu.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú de navegación');
  };

  const closeNav = () => {
    if (!navMenu || !burger) return;
    navMenu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú de navegación');
  };

  if (burger && navMenu) {
    burger.addEventListener('click', (event) => {
      event.stopPropagation();
      isNavOpen() ? closeNav() : openNav();
    });

    navLinks.forEach((link) => link.addEventListener('click', closeNav));

    document.addEventListener('click', (event) => {
      if (!isNavOpen()) return;
      if (navMenu.contains(event.target) || burger.contains(event.target)) return;
      closeNav();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isNavOpen()) {
        closeNav();
        burger.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1023 && isNavOpen()) closeNav();
    });
  }

  /* Scroll suave con compensación del header */
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();

      const offset = (header ? header.offsetHeight : 0) + 18;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', hash);
    });
  });

  /* Enlace activo según sección visible */
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const activeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach((section) => activeObserver.observe(section));
  }

  if (toTopBtn) {
    toTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ============================================== 07. FILTROS COLECCIÓN */
  const filterButtons = $$('.filter');
  const pieceElements = $$('.piece');
  const piecesCountEl = $('#piecesCount');
  const piecesEmptyEl = $('#piecesEmpty');

  const applyFilter = (filter) => {
    let visible = 0;

    pieceElements.forEach((piece, index) => {
      const matches = filter === 'all' || piece.dataset.category === filter;

      if (matches) {
        piece.hidden = false;
        piece.classList.remove('is-in');
        void piece.offsetWidth;
        piece.style.animationDelay = `${Math.min(index, 8) * 45}ms`;
        piece.classList.add('is-in');
        visible += 1;
      } else {
        piece.hidden = true;
        piece.classList.remove('is-in');
      }
    });

    if (piecesCountEl) piecesCountEl.textContent = String(visible);
    if (piecesEmptyEl) piecesEmptyEl.hidden = visible !== 0;
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach((other) => {
        const active = other === button;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyFilter(button.dataset.filter || 'all');
    });
  });

  filterButtons.forEach((button) => {
    button.setAttribute('aria-pressed', button.classList.contains('is-active') ? 'true' : 'false');
  });

  /* ================================================= 08. CUSTOM STUDIO */
  const blueprint = $('#blueprint');
  const blueprintPiece = $('#blueprintPiece');
  const measureW = $('#blueprintW');
  const measureH = $('#blueprintH');
  const measureD = $('#blueprintD');
  const studioConfigEl = $('#studioConfig');
  const studioPriceEl = $('#studioPrice');
  const studioSendBtn = $('#studioSend');
  const studioHint = $('#studioHint');

  const sliders = {
    ancho: $('#dimAncho'),
    alto: $('#dimAlto'),
    prof: $('#dimProf')
  };

  const studio = {
    tipo: 'mesa',
    tipoLabel: 'Mesa de comedor',
    base: 380000,
    material: 'roble',
    materialLabel: 'Roble macizo',
    factor: 1,
    ancho: 180,
    alto: 75,
    prof: 45
  };

  const renderBlueprint = () => {
    if (!blueprint || !blueprintPiece) return;

    const rect = blueprint.getBoundingClientRect();
    const availableWidth = rect.width * 0.82;
    const availableHeight = rect.height * 0.74;

    /* Escala fija tomada de la pieza máxima (400 x 260 cm): así el rectángulo
       siempre responde a los tres controles, en cualquier tamaño de pantalla */
    const MAX_WIDTH = 400;
    const MAX_HEIGHT = 260;

    if (availableWidth > 40 && availableHeight > 40) {
      const scale = Math.min(availableWidth / MAX_WIDTH, availableHeight / MAX_HEIGHT);
      blueprintPiece.style.width = `${Math.max(studio.ancho * scale, 24)}px`;
      blueprintPiece.style.height = `${Math.max(studio.alto * scale, 12)}px`;
    } else {
      /* Respaldo porcentual si el panel todavía no tiene medidas */
      blueprintPiece.style.width = `${12 + ((studio.ancho - 60) / 340) * 76}%`;
      blueprintPiece.style.height = `${12 + ((studio.alto - 40) / 220) * 76}%`;
    }

    if (measureW) measureW.textContent = `${studio.ancho} cm`;
    if (measureH) measureH.textContent = `${studio.alto} cm`;
    if (measureD) measureD.textContent = `${studio.prof} cm`;
  };

  const renderEstimate = () => {
    const multiplier = Math.max(
      1 + (studio.ancho - 120) / 500 + (studio.alto - 75) / 400 + (studio.prof - 45) / 400,
      0.6
    );
    const raw = studio.base * studio.factor * multiplier;
    const estimate = Math.round(raw / 1000) * 1000;

    if (studioConfigEl) {
      studioConfigEl.textContent = `${studio.tipoLabel} en ${studio.materialLabel}`;
    }
    if (studioPriceEl) studioPriceEl.textContent = money(estimate);

    return estimate;
  };

  const updateSliderFill = (input) => {
    if (!input) return;
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const value = Number(input.value) || 0;
    const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--fill', `${percent}%`);
  };

  const syncStudio = () => {
    renderBlueprint();
    renderEstimate();
  };

  $$('.chips [data-value]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const group = chip.closest('[data-group]');
      if (!group) return;

      const groupName = group.dataset.group;
      $$('[data-value]', group).forEach((other) => other.classList.toggle('is-active', other === chip));

      if (groupName === 'tipo') {
        studio.tipo = chip.dataset.value;
        studio.tipoLabel = chip.dataset.label || chip.textContent.trim();
        studio.base = Number(chip.dataset.base) || studio.base;
      } else if (groupName === 'material') {
        studio.material = chip.dataset.value;
        studio.materialLabel = chip.dataset.label || chip.textContent.trim();
        studio.factor = Number(chip.dataset.factor) || 1;
      }

      syncStudio();
    });
  });

  Object.keys(sliders).forEach((key) => {
    const input = sliders[key];
    if (!input) return;

    updateSliderFill(input);

    input.addEventListener('input', () => {
      studio[key] = Number(input.value);
      updateSliderFill(input);

      const output = $(`#${input.id}Out`);
      if (output) output.textContent = `${input.value} cm`;

      syncStudio();
    });
  });

  if (studioSendBtn) {
    studioSendBtn.addEventListener('click', () => {
      const messageField = $('#cMessage');
      const summary =
        `Hola, quiero cotizar un/a ${studio.tipoLabel.toLowerCase()} en ${studio.materialLabel} ` +
        `de ${studio.ancho} x ${studio.alto} x ${studio.prof} cm (ancho x alto x profundidad). ` +
        `Medida estimada: ${studioPriceEl ? studioPriceEl.textContent : ''}. ` +
        `¿Podrían asesorarme sobre terminaciones y plazos de entrega?`;

      if (messageField) {
        messageField.value = summary;
        messageField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (studioHint) studioHint.hidden = false;

      const contactSection = $('#contacto');
      if (contactSection) {
        const offset = (header ? header.offsetHeight : 0) + 18;
        window.scrollTo({
          top: contactSection.getBoundingClientRect().top + window.scrollY - offset,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      }

      window.setTimeout(() => {
        if (messageField) messageField.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 700);

      notify({
        type: 'info',
        title: 'Configuración enviada al formulario',
        text: 'Revisá el mensaje y completá tus datos para enviarlo.'
      });
    });
  }

  window.addEventListener('resize', () => {
    if (blueprint) renderBlueprint();
  });

  syncStudio();

  /* =========================================== 09. CARRUSEL DE RESEÑAS */
  const carousel = $('#reviewsCarousel');
  const track = $('#carouselTrack');
  const dotsContainer = $('#carouselDots');
  const prevBtn = $('#prevReview');
  const nextBtn = $('#nextReview');

  const slides = track ? $$('.review', track) : [];
  let slideIndex = 0;
  let autoplayId = null;

  const buildDots = () => {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';

    slides.forEach((slide, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot' + (index === 0 ? ' is-active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Ver reseña ${index + 1} de ${slides.length}`);
      dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      dot.addEventListener('click', () => {
        goToSlide(index);
        restartAutoplay();
      });
      dotsContainer.appendChild(dot);
    });
  };

  const goToSlide = (index) => {
    if (!track || slides.length === 0) return;

    slideIndex = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${slideIndex * 100}%)`;

    if (dotsContainer) {
      $$('.carousel__dot', dotsContainer).forEach((dot, dotIndex) => {
        const active = dotIndex === slideIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    slides.forEach((slide, slideNumber) => {
      slide.setAttribute('aria-hidden', slideNumber === slideIndex ? 'false' : 'true');
    });
  };

  const startAutoplay = () => {
    if (reduceMotion || slides.length < 2) return;
    stopAutoplay();
    autoplayId = window.setInterval(() => goToSlide(slideIndex + 1), 7000);
  };

  const stopAutoplay = () => {
    if (autoplayId) {
      window.clearInterval(autoplayId);
      autoplayId = null;
    }
  };

  const restartAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  if (track && slides.length) {
    buildDots();
    goToSlide(0);
    startAutoplay();

    if (prevBtn) prevBtn.addEventListener('click', () => { goToSlide(slideIndex - 1); restartAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goToSlide(slideIndex + 1); restartAutoplay(); });

    if (carousel) {
      carousel.addEventListener('mouseenter', stopAutoplay);
      carousel.addEventListener('mouseleave', startAutoplay);
      carousel.addEventListener('focusin', stopAutoplay);
      carousel.addEventListener('focusout', startAutoplay);

      carousel.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') { goToSlide(slideIndex - 1); restartAutoplay(); }
        if (event.key === 'ArrowRight') { goToSlide(slideIndex + 1); restartAutoplay(); }
      });

      /* Deslizamiento táctil */
      let startX = 0;
      let startY = 0;
      let tracking = false;

      carousel.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse') return;
        startX = event.clientX;
        startY = event.clientY;
        tracking = true;
      });

      carousel.addEventListener('pointerup', (event) => {
        if (!tracking) return;
        tracking = false;

        const deltaX = event.clientX - startX;
        const deltaY = event.clientY - startY;

        if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
          goToSlide(deltaX < 0 ? slideIndex + 1 : slideIndex - 1);
          restartAutoplay();
        }
      });

      carousel.addEventListener('pointercancel', () => { tracking = false; });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoplay();
        else startAutoplay();
      });
    }
  }

  /* ======================================= 10. FORMULARIO DE CONTACTO */
  const contactForm = $('#contactForm');
  const formSuccess = $('#formSuccess');
  const formReset = $('#formReset');
  const contactSubmit = $('#contactSubmit');
  const successName = $('#successName');
  const successEmail = $('#successEmail');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  const NAME_RE  = /^[a-zA-ZÀ-ÿ\u00f1\u00d1'´`.\-\s]{2,60}$/;

  const fields = {
    name: {
      input: $('#cName'),
      error: $('#cNameError'),
      validate: (value) => {
        if (!value) return 'Ingresá tu nombre y apellido.';
        if (value.length < 2) return 'El nombre es demasiado corto.';
        if (!NAME_RE.test(value)) return 'Usá sólo letras, espacios y guiones.';
        return '';
      }
    },
    email: {
      input: $('#cEmail'),
      error: $('#cEmailError'),
      validate: (value) => {
        if (!value) return 'Ingresá tu correo electrónico.';
        if (!EMAIL_RE.test(value)) return 'Revisá el formato del correo (ej: nombre@dominio.com).';
        return '';
      }
    },
    phone: {
      input: $('#cPhone'),
      error: $('#cPhoneError'),
      validate: (value) => {
        if (!value) return 'Ingresá un teléfono de contacto.';
        const digits = value.replace(/[^\d]/g, '');
        if (digits.length < 8) return 'El teléfono debe tener al menos 8 dígitos.';
        if (digits.length > 15) return 'El teléfono no puede superar los 15 dígitos.';
        return '';
      }
    },
    message: {
      input: $('#cMessage'),
      error: $('#cMessageError'),
      validate: (value) => {
        if (!value) return 'Contanos qué necesitás.';
        if (value.length < 10) return 'Escribí al menos 10 caracteres para que podamos ayudarte.';
        return '';
      }
    }
  };

  const setFieldError = (field, message) => {
    if (!field || !field.input) return;
    const wrapper = field.input.closest('.field');

    if (message) {
      if (wrapper) wrapper.classList.add('has-error');
      field.input.setAttribute('aria-invalid', 'true');
      if (field.error) {
        field.error.textContent = message;
        field.error.hidden = false;
      }
    } else {
      if (wrapper) wrapper.classList.remove('has-error');
      field.input.removeAttribute('aria-invalid');
      if (field.error) {
        field.error.textContent = '';
        field.error.hidden = true;
      }
    }
  };

  const validateField = (field) => {
    const value = field.input ? field.input.value.trim() : '';
    const message = field.validate(value);
    setFieldError(field, message);
    return message === '';
  };

  Object.keys(fields).forEach((key) => {
    const field = fields[key];
    if (!field.input) return;

    field.input.addEventListener('input', () => {
      const wrapper = field.input.closest('.field');
      if (wrapper && wrapper.classList.contains('has-error')) validateField(field);
    });

    field.input.addEventListener('blur', () => {
      if (field.input.value.trim() !== '') validateField(field);
    });
  });

  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const order = ['name', 'email', 'phone', 'message'];
      const invalid = order.filter((key) => !validateField(fields[key]));

      if (invalid.length > 0) {
        const firstInvalid = fields[invalid[0]].input;
        if (firstInvalid) firstInvalid.focus();

        notify({
          type: 'error',
          title: 'Revisá el formulario',
          text: `Hay ${invalid.length} ${invalid.length === 1 ? 'campo' : 'campos'} por corregir.`
        });
        return;
      }

      if (contactSubmit) contactSubmit.classList.add('is-loading');

      window.setTimeout(() => {
        if (contactSubmit) contactSubmit.classList.remove('is-loading');

        if (successName) successName.textContent = fields.name.input.value.trim();
        if (successEmail) successEmail.textContent = fields.email.input.value.trim();

        contactForm.hidden = true;
        if (formSuccess) {
          formSuccess.hidden = false;
          formSuccess.focus({ preventScroll: true });
        }
        if (studioHint) studioHint.hidden = true;

        notify({
          title: '¡Mensaje enviado con éxito!',
          text: 'Te respondemos dentro de las próximas 24 h hábiles.'
        });

        contactForm.reset();
        Object.keys(fields).forEach((key) => setFieldError(fields[key], ''));
      }, 1300);
    });
  }

  if (formReset && contactForm && formSuccess) {
    formReset.addEventListener('click', () => {
      formSuccess.hidden = true;
      contactForm.hidden = false;
      const firstInput = fields.name.input;
      if (firstInput) firstInput.focus();
    });
  }

  /* ==================================================== 11. NEWSLETTER */
  const newsForm = $('#newsForm');
  const newsEmail = $('#newsEmail');
  const newsMsg = $('#newsMsg');

  if (newsForm && newsEmail) {
    newsForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const value = newsEmail.value.trim();

      if (!EMAIL_RE.test(value)) {
        newsForm.classList.add('has-error');
        if (newsMsg) {
          newsMsg.textContent = 'Ingresá un correo electrónico válido para suscribirte.';
          newsMsg.className = 'news__msg is-error';
        }
        newsEmail.focus();
        return;
      }

      newsForm.classList.remove('has-error');
      if (newsMsg) {
        newsMsg.textContent = '¡Listo! Te suscribiste con éxito al newsletter del taller.';
        newsMsg.className = 'news__msg is-ok';
      }

      notify({
        title: 'Suscripción confirmada',
        text: `Te escribiremos a ${value}`
      });

      newsForm.reset();
    });

    newsEmail.addEventListener('input', () => {
      if (newsForm.classList.contains('has-error') && EMAIL_RE.test(newsEmail.value.trim())) {
        newsForm.classList.remove('has-error');
        if (newsMsg) {
          newsMsg.textContent = '';
          newsMsg.className = 'news__msg';
        }
      }
    });
  }

  /* =========================== 12. REVEAL, MAGNÉTICOS, IMÁGENES Y VARIOS */
  const revealItems = $$('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -70px 0px' });

    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 8, 7) * 60}ms`;
      revealObserver.observe(item);
    });
  }

  /* Botones magnéticos */
  if (finePointer && !reduceMotion) {
    $$('.magnetic').forEach((element) => {
      const strength = 7;

      element.addEventListener('mousemove', (event) => {
        const rect = element.getBoundingClientRect();
        const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * strength * 2;
        const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * strength;
        element.style.setProperty('--mx', `${offsetX.toFixed(2)}px`);
        element.style.setProperty('--my', `${offsetY.toFixed(2)}px`);
      });

      element.addEventListener('mouseleave', () => {
        element.style.setProperty('--mx', '0px');
        element.style.setProperty('--my', '0px');
      });
    });
  }

  /* Imágenes faltantes: se oculta la imagen y queda el degradado de fondo */
  $$('.piece__media img').forEach((img) => {
    const hide = () => img.classList.add('is-missing');
    if (img.complete && img.naturalWidth === 0) hide();
    img.addEventListener('error', hide);
    img.addEventListener('load', () => img.classList.remove('is-missing'));
  });

  /* Año dinámico */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Estado inicial del carrito */
  restoreCart();
  renderCart();

})();
