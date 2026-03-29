(function () {
  const CART_KEY = "vaptvupt_cart_v1";
  const WHATSAPP_NUMBER = "5527981662777";
  const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  function readRawCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeRawCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("vapt:cart-updated"));
  }

  function sanitizeQty(qty) {
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  }

  function getCart() {
    return readRawCart();
  }

  function getDetailedCart() {
    const cart = readRawCart();
    const details = [];

    Object.keys(cart).forEach((id) => {
      const qty = sanitizeQty(cart[id]);
      if (!qty) return;
      const product = window.VaptProducts.findById(id);
      if (!product) return;
      details.push({
        ...product,
        qty,
        subtotal: qty * product.price
      });
    });

    return details;
  }

  function getCartCount() {
    return getDetailedCart().reduce((sum, item) => sum + item.qty, 0);
  }

  function getCartTotal() {
    return getDetailedCart().reduce((sum, item) => sum + item.subtotal, 0);
  }

  function addItem(id, amount) {
    const inc = sanitizeQty(amount == null ? 1 : amount);
    if (!inc) return;

    const product = window.VaptProducts.findById(id);
    if (!product) return;

    const cart = readRawCart();
    const current = sanitizeQty(cart[id]);
    cart[id] = current + inc;
    writeRawCart(cart);
  }

  function setItemQty(id, qty) {
    const product = window.VaptProducts.findById(id);
    if (!product) return;

    const cart = readRawCart();
    const normalized = sanitizeQty(qty);

    if (!normalized) {
      delete cart[id];
    } else {
      cart[id] = normalized;
    }

    writeRawCart(cart);
  }

  function removeItem(id) {
    const cart = readRawCart();
    if (Object.prototype.hasOwnProperty.call(cart, id)) {
      delete cart[id];
      writeRawCart(cart);
    }
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new CustomEvent("vapt:cart-updated"));
  }

  function formatMoney(value) {
    return formatter.format(value || 0);
  }

  function updateCartBadges() {
    const count = getCartCount();
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = String(count);
    });
  }

  function onCartChange(callback) {
    const handler = () => callback(getDetailedCart());
    window.addEventListener("vapt:cart-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("vapt:cart-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }

  function buildCheckoutMessage(data) {
    const items = getDetailedCart();
    if (!items.length) return null;

    const total = getCartTotal();
    const lines = [];

    lines.push("Ola, VaptVupt Pitstop.");
    lines.push("Quero fechar este pedido:");
    lines.push("");
    lines.push(`Cliente: ${data.name || "Nao informado"}`);
    lines.push("");
    lines.push("Itens do pedido:");

    items.forEach((item) => {
      lines.push(`- ${item.qty}x ${item.name} (${item.category} / ${item.volume}) - ${formatMoney(item.subtotal)}`);
    });

    lines.push("");
    lines.push(`Total estimado: ${formatMoney(total)}`);

    if (data.notes) {
      lines.push("");
      lines.push(`Observacoes: ${data.notes}`);
    }

    lines.push("");
    lines.push("Pode confirmar meu pedido, por favor? Obrigado.");

    return lines.join("\n");
  }

  function openWhatsAppWithCheckout(data) {
    const message = buildCheckoutMessage(data);
    if (!message) return false;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  window.VaptCart = {
    CART_KEY,
    getCart,
    getDetailedCart,
    getCartCount,
    getCartTotal,
    addItem,
    setItemQty,
    removeItem,
    clearCart,
    formatMoney,
    updateCartBadges,
    onCartChange,
    buildCheckoutMessage,
    openWhatsAppWithCheckout
  };
})();
