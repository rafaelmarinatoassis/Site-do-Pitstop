(function () {
  async function loadProductsFromJson() {
    if (window.VaptProducts && Array.isArray(window.VaptProducts.list)) {
      return;
    }

    const response = await fetch("assets/data/produtos.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Falha ao carregar assets/data/produtos.json");
    }

    const data = await response.json();
    const source = Array.isArray(data.produtos) ? data.produtos : [];

    const list = source.map((item) => ({
      id: item.id,
      category: item.categoria,
      name: item.nome,
      volume: item.volume,
      price: Number(item.preco || 0),
      photo: item.foto || "",
      promo: Boolean(item.promocao)
    }));

    const categories = ["Todos"].concat(Array.from(new Set(list.map((item) => item.category))));

    window.VaptProducts = {
      list,
      categories,
      findById(id) {
        return list.find((item) => item.id === id) || null;
      }
    };
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    return {
      search: params.get("busca") || "",
      category: params.get("categoria") || "Todos",
      sort: params.get("ordem") || "relevancia"
    };
  }

  function setupHeader() {
    const menuBtn = qs("[data-menu-toggle]");
    const nav = qs("[data-nav]");

    if (menuBtn && nav) {
      menuBtn.addEventListener("click", () => {
        nav.classList.toggle("open");
      });

      nav.addEventListener("click", (event) => {
        if (event.target.tagName === "A") {
          nav.classList.remove("open");
        }
      });
    }

    window.VaptCart.updateCartBadges();
    window.VaptCart.onCartChange(() => window.VaptCart.updateCartBadges());
  }

  function getProductBadges(item) {
    const badges = [];
    if (item.promo) {
      badges.push({ label: "Promocao", className: "promo", icon: "PROMO" });
    }
    if (item.id === "473-corona" || item.id === "long-neck-corona" || item.id === "473-stella") {
      badges.push({ label: "Mais vendido", className: "hot", icon: "HOT" });
    }
    return badges;
  }

  function showToast(message) {
    const toast = qs("#uiToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
  }

  function pulseCartPill() {
    qsa(".cart-pill").forEach((el) => {
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    });
  }

  function productCard(item, qty) {
    const badges = getProductBadges(item);
    const badgeHtml = badges.length
      ? `<div class="product-badges">${badges
          .map((b) => `<span class="pill-badge ${b.className}">${b.icon} ${b.label}</span>`)
          .join("")}</div>`
      : "";
    const mediaHtml = item.photo
      ? `
        <div class="product-media">
          <img
            class="product-photo"
            src="${item.photo}"
            alt="${item.name}"
            loading="lazy"
            referrerpolicy="no-referrer"
            onerror="this.style.display='none'; this.parentElement.classList.add('no-photo');"
          />
        </div>
      `
      : `<div class="product-media no-photo"></div>`;

    const controls = qty > 0
      ? `
        <div class="qty" data-id="${item.id}">
          <button type="button" data-action="minus" aria-label="Diminuir ${item.name}">-</button>
          <span>${qty}</span>
          <button type="button" data-action="plus" aria-label="Aumentar ${item.name}">+</button>
        </div>
      `
      : `<button class="add-btn" type="button" data-action="add" data-id="${item.id}">Adicionar</button>`;

    return `
      <article class="product-card">
        ${badgeHtml}
        ${mediaHtml}
        <div class="product-top">
          <div class="product-meta">
            <h3>${item.name}</h3>
            <p>${item.category} • ${item.volume}</p>
          </div>
          <div class="price">${window.VaptCart.formatMoney(item.price)}</div>
        </div>
        <div class="product-actions">
          <a class="btn btn-light" href="checkout.html">Finalizar</a>
          ${controls}
        </div>
      </article>
    `;
  }

  function bindProductActions(container) {
    container.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id || btn.closest(".qty")?.dataset.id;
      if (!id) return;

      const cartMap = window.VaptCart.getCart();
      const current = Number(cartMap[id] || 0);

      if (action === "add" || action === "plus") {
        window.VaptCart.setItemQty(id, current + 1);
        showToast(`${window.VaptProducts.findById(id)?.name || "Item"} adicionado`);
        pulseCartPill();
      }

      if (action === "minus") {
        window.VaptCart.setItemQty(id, current - 1);
      }

      const card = btn.closest(".product-card");
      if (card) {
        card.classList.remove("bump");
        void card.offsetWidth;
        card.classList.add("bump");
      }
    });
  }

  function initStickyCartCta(options) {
    const bar = qs(options.barSelector);
    if (!bar) return;
    const countEl = qs(options.countSelector);
    const totalEl = qs(options.totalSelector);

    function render() {
      const count = window.VaptCart.getCartCount();
      const total = window.VaptCart.getCartTotal();
      if (countEl) {
        countEl.textContent = `${count} ${count === 1 ? "item" : "itens"}`;
      }
      if (totalEl) {
        totalEl.textContent = window.VaptCart.formatMoney(total);
      }
      bar.classList.toggle("show", count > 0);
    }

    window.VaptCart.onCartChange(render);
    render();
  }

  function sortProducts(list, mode) {
    const cloned = list.slice();
    if (mode === "preco-asc") return cloned.sort((a, b) => a.price - b.price);
    if (mode === "preco-desc") return cloned.sort((a, b) => b.price - a.price);
    if (mode === "nome-asc") return cloned.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return cloned;
  }

  function renderCategoryButtons(root, activeCategory) {
    const cats = window.VaptProducts.categories;
    root.innerHTML = cats
      .map((cat) => `<button type="button" class="filter-btn ${cat === activeCategory ? "active" : ""}" data-category="${cat}">${cat}</button>`)
      .join("");
  }

  function initHomePage() {
    const container = qs("#homeFeaturedProducts");
    if (!container) return;

    const featured = window.VaptProducts.list.slice(0, 6);

    const map = window.VaptCart.getCart();
    container.innerHTML = featured.map((item) => productCard(item, Number(map[item.id] || 0))).join("");

    bindProductActions(container);
    initStickyCartCta({
      barSelector: "#stickyHomeCart",
      countSelector: "#stickyHomeCount",
      totalSelector: "#stickyHomeTotal"
    });
    window.VaptCart.onCartChange(() => {
      const currentMap = window.VaptCart.getCart();
      container.innerHTML = featured.map((item) => productCard(item, Number(currentMap[item.id] || 0))).join("");
    });
  }

  function initCatalogPage() {
    const productsRoot = qs("#catalogProducts");
    const filtersRoot = qs("#catalogFilters");
    const searchInput = qs("#catalogSearch");
    const sortSelect = qs("#catalogSort");
    const emptyState = qs("#catalogEmpty");
    if (!productsRoot || !filtersRoot || !searchInput || !sortSelect || !emptyState) return;

    const query = parseQuery();
    let activeCategory = window.VaptProducts.categories.includes(query.category) ? query.category : "Todos";
    let search = query.search;
    let sort = query.sort;

    searchInput.value = search;
    if (qsa("option", sortSelect).some((opt) => opt.value === sort)) {
      sortSelect.value = sort;
    }

    function render() {
      renderCategoryButtons(filtersRoot, activeCategory);

      const cartMap = window.VaptCart.getCart();
      const normalized = normalize(search);

      let filtered = window.VaptProducts.list.filter((item) => {
        const byCategory = activeCategory === "Todos" || item.category === activeCategory;
        const bySearch = !normalized || normalize(`${item.name} ${item.category} ${item.volume}`).includes(normalized);
        return byCategory && bySearch;
      });

      filtered = sortProducts(filtered, sort);
      emptyState.style.display = filtered.length ? "none" : "block";

      productsRoot.innerHTML = filtered
        .map((item) => productCard(item, Number(cartMap[item.id] || 0)))
        .join("");
    }

    filtersRoot.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-category]");
      if (!btn) return;
      activeCategory = btn.dataset.category;
      render();
    });

    searchInput.addEventListener("input", () => {
      search = searchInput.value.trim();
      render();
    });

    sortSelect.addEventListener("change", () => {
      sort = sortSelect.value;
      render();
    });

    bindProductActions(productsRoot);
    window.VaptCart.onCartChange(render);
    initStickyCartCta({
      barSelector: "#stickyCatalogCart",
      countSelector: "#stickyCatalogCount",
      totalSelector: "#stickyCatalogTotal"
    });
    render();
  }

  function renderCartRows(items) {
    return items
      .map((item) => `
        <article class="cart-item">
          <div class="cart-item-head">
            <div>
              <h3>${item.name}</h3>
              <small>${item.category} • ${item.volume}</small>
            </div>
            <strong class="item-line-total">${window.VaptCart.formatMoney(item.subtotal)}</strong>
          </div>
          <div class="item-actions">
            <div class="qty" data-id="${item.id}">
              <button type="button" data-action="minus" aria-label="Diminuir ${item.name}">-</button>
              <span>${item.qty}</span>
              <button type="button" data-action="plus" aria-label="Aumentar ${item.name}">+</button>
            </div>
            <button class="remove-btn" type="button" data-action="remove" data-id="${item.id}">Remover</button>
          </div>
        </article>
      `)
      .join("");
  }

  function initCartPage() {
    const listRoot = qs("#cartItems");
    const empty = qs("#cartEmpty");
    const totalEl = qs("#cartTotal");
    const clearBtn = qs("#clearCartBtn");
    const floating = qs("#floatingCheckout");
    const floatingCount = qs("#floatingCount");
    const floatingTotal = qs("#floatingTotal");
    if (!listRoot || !empty || !totalEl || !clearBtn || !floating || !floatingCount || !floatingTotal) return;

    function render() {
      const items = window.VaptCart.getDetailedCart();
      const total = window.VaptCart.getCartTotal();
      const count = window.VaptCart.getCartCount();

      totalEl.textContent = window.VaptCart.formatMoney(total);
      floatingCount.textContent = `${count} ${count === 1 ? "item" : "itens"}`;
      floatingTotal.textContent = window.VaptCart.formatMoney(total);

      if (!items.length) {
        listRoot.innerHTML = "";
        empty.style.display = "block";
        floating.classList.remove("show");
      } else {
        empty.style.display = "none";
        listRoot.innerHTML = renderCartRows(items);
        floating.classList.add("show");
      }
    }

    listRoot.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id || btn.closest(".qty")?.dataset.id;
      if (!id) return;

      const current = Number(window.VaptCart.getCart()[id] || 0);
      if (action === "plus") window.VaptCart.setItemQty(id, current + 1);
      if (action === "minus") window.VaptCart.setItemQty(id, current - 1);
      if (action === "remove") window.VaptCart.removeItem(id);
    });

    clearBtn.addEventListener("click", () => {
      window.VaptCart.clearCart();
    });

    window.VaptCart.onCartChange(render);
    render();
  }

  function renderCheckoutSummary(target) {
    const items = window.VaptCart.getDetailedCart();
    if (!target) return;

    if (!items.length) {
      target.innerHTML = '<p class="empty-state">Seu carrinho esta vazio. Adicione itens no catalogo antes de finalizar.</p>';
      return;
    }

    target.innerHTML = items
      .map((item) => `<div class="summary-row"><span>${item.qty}x ${item.name}</span><span>${window.VaptCart.formatMoney(item.subtotal)}</span></div>`)
      .join("");
  }

  function initCheckoutPage() {
    const form = qs("#checkoutForm");
    const summary = qs("#checkoutItems");
    const total = qs("#checkoutTotal");
    const notice = qs("#checkoutNotice");
    if (!form || !summary || !total || !notice) return;

    function render() {
      const items = window.VaptCart.getDetailedCart();
      const cartTotal = window.VaptCart.getCartTotal();
      renderCheckoutSummary(summary);
      total.textContent = window.VaptCart.formatMoney(cartTotal);
      if (!items.length) {
        notice.textContent = "Seu carrinho esta vazio. Adicione itens antes de finalizar no WhatsApp.";
      } else {
        notice.textContent = "Confira seus dados e toque em Finalizar no WhatsApp.";
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const items = window.VaptCart.getDetailedCart();
      if (!items.length) {
        alert("Seu carrinho esta vazio.");
        return;
      }

      const data = {
        name: qs("#name").value.trim(),
        notes: qs("#notes").value.trim()
      };

      if (!data.name) {
        alert("Preencha seu nome para continuar.");
        return;
      }

      const opened = window.VaptCart.openWhatsAppWithCheckout(data);
      if (opened) {
        window.VaptCart.clearCart();
      }
    });

    window.VaptCart.onCartChange(render);
    render();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await loadProductsFromJson();
      setupHeader();

      const page = document.body.dataset.page;

      if (page === "home") initHomePage();
      if (page === "catalogo") initCatalogPage();
      if (page === "carrinho") initCartPage();
      if (page === "checkout") initCheckoutPage();
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel carregar o catalogo (produtos.json).");
    }
  });
})();
