import React, { useEffect, useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type CatalogItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  in_stock?: boolean;
  category?: string;
};
type Category = {
  id: string;
  name: string;
  emoji: string;
  items: CatalogItem[];
};
type Catalog = {
  shop_name: string;
  currency: string;
  categories: Category[];
};
type CartEntry = { item: CatalogItem; qty: number };

const WORK_START_HOUR = 10;
const WORK_END_HOUR = 22;

function tgVar(name: string, fallback: string): string {
  return `var(--tg-theme-${name}, ${fallback})`;
}

const S = {
  app: {
    fontFamily: `-apple-system, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    minHeight: "100vh",
    background: tgVar("bg-color", "#ffffff"),
    color: tgVar("text-color", "#1a1a1a"),
    paddingBottom: 100,
  } as React.CSSProperties,
  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: tgVar("bg-color", "#ffffff"),
    borderBottom: `1px solid ${tgVar("secondary-bg-color", "#f0f0f0")}`,
    padding: "14px 16px 0",
  } as React.CSSProperties,
  shopName: {
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 12px",
    letterSpacing: "-0.3px",
  } as React.CSSProperties,
  tabs: {
    display: "flex",
    gap: 6,
    overflowX: "auto" as const,
    paddingBottom: 12,
    scrollbarWidth: "none" as const,
    msOverflowStyle: "none" as const,
  } as React.CSSProperties,
  tab: (active: boolean) =>
    ({
      padding: "7px 14px",
      borderRadius: 20,
      border: "none",
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      cursor: "pointer",
      whiteSpace: "nowrap" as const,
      transition: "all .2s",
      background: active
        ? tgVar("button-color", "#3390ec")
        : tgVar("secondary-bg-color", "#f0f0f0"),
      color: active
        ? tgVar("button-text-color", "#ffffff")
        : tgVar("text-color", "#1a1a1a"),
    }) as React.CSSProperties,
  section: { padding: "12px 16px" } as React.CSSProperties,
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: "8px 0 10px",
    opacity: 0.55,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  } as React.CSSProperties,
  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    marginBottom: 8,
    borderRadius: 14,
    background: tgVar("secondary-bg-color", "#f7f7f8"),
    transition: "transform .15s",
  } as React.CSSProperties,
  cardLeft: { flex: 1 } as React.CSSProperties,
  cardName: { fontSize: 16, fontWeight: 500, marginBottom: 3 } as React.CSSProperties,
  cardPrice: { fontSize: 14, opacity: 0.6 } as React.CSSProperties,
  qtyControls: { display: "flex", alignItems: "center", gap: 0 } as React.CSSProperties,
  qtyBtn: {
    width: 34, height: 34, borderRadius: "50%", border: "none", fontSize: 20, fontWeight: 600,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    background: tgVar("button-color", "#3390ec"),
    color: tgVar("button-text-color", "#ffffff"),
    transition: "opacity .15s",
  } as React.CSSProperties,
  qtyText: { width: 40, textAlign: "center" as const, fontSize: 17, fontWeight: 600 } as React.CSSProperties,
  addBtn: {
    padding: "8px 18px", borderRadius: 20, border: "none", fontSize: 14, fontWeight: 600,
    cursor: "pointer", background: tgVar("button-color", "#3390ec"),
    color: tgVar("button-text-color", "#ffffff"), transition: "opacity .15s",
  } as React.CSSProperties,
  bottomBar: {
    position: "fixed" as const, bottom: 0, left: 0, right: 0, zIndex: 200, padding: "12px 16px",
    paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
    background: tgVar("bg-color", "#ffffff"),
    borderTop: `1px solid ${tgVar("secondary-bg-color", "#e8e8e8")}`, display: "flex", gap: 10,
  } as React.CSSProperties,
  mainButton: (disabled: boolean) =>
    ({
      flex: 1, padding: "14px 0", borderRadius: 12, border: "none", fontSize: 16, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer", background: tgVar("button-color", "#3390ec"),
      color: tgVar("button-text-color", "#ffffff"), opacity: disabled ? 0.5 : 1, transition: "opacity .2s",
    }) as React.CSSProperties,
  cartButton: {
    width: 52, height: 52, borderRadius: 12, border: "none", fontSize: 22, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", position: "relative" as const,
    background: tgVar("secondary-bg-color", "#f0f0f0"), color: tgVar("text-color", "#1a1a1a"),
  } as React.CSSProperties,
  badge: {
    position: "absolute" as const, top: -4, right: -4, width: 20, height: 20, borderRadius: "50%",
    fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
    background: "#ff3b30", color: "#fff",
  } as React.CSSProperties,
  overlay: {
    position: "fixed" as const, inset: 0, zIndex: 300, background: tgVar("bg-color", "#ffffff"),
    overflowY: "auto" as const, padding: "0 16px 120px",
  } as React.CSSProperties,
  overlayHeader: {
    position: "sticky" as const, top: 0, background: tgVar("bg-color", "#ffffff"), padding: "16px 0 10px",
    display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10,
  } as React.CSSProperties,
  overlayTitle: { fontSize: 20, fontWeight: 700 } as React.CSSProperties,
  closeBtn: {
    fontSize: 28, background: "none", border: "none", cursor: "pointer",
    color: tgVar("text-color", "#1a1a1a"), padding: "4px 8px", lineHeight: 1,
  } as React.CSSProperties,
  input: {
    width: "100%", padding: "13px 14px", borderRadius: 12,
    border: `1.5px solid ${tgVar("secondary-bg-color", "#e0e0e0")}`, fontSize: 16,
    background: tgVar("secondary-bg-color", "#f7f7f8"), color: tgVar("text-color", "#1a1a1a"),
    outline: "none", boxSizing: "border-box" as const, marginBottom: 10,
  } as React.CSSProperties,
  label: {
    fontSize: 13, fontWeight: 600, opacity: 0.55, marginBottom: 5, display: "block",
    textTransform: "uppercase" as const, letterSpacing: "0.3px",
  } as React.CSSProperties,
  emptyCart: { textAlign: "center" as const, padding: "60px 20px", opacity: 0.5, fontSize: 16 } as React.CSSProperties,
  resultBox: (ok: boolean) =>
    ({
      padding: 16, borderRadius: 14, background: ok ? "#e8f5e9" : "#fbe9e7",
      textAlign: "center" as const, margin: "20px 0", fontSize: 16, fontWeight: 500,
    }) as React.CSSProperties,
  totalLine: {
    display: "flex", justifyContent: "space-between", padding: "14px 0", fontSize: 18, fontWeight: 700,
    borderTop: `1px solid ${tgVar("secondary-bg-color", "#e8e8e8")}`, marginTop: 8,
  } as React.CSSProperties,
};

function isWorkingHoursNow(date = new Date()): boolean {
  const h = date.getHours();
  return h >= WORK_START_HOUR && h < WORK_END_HOUR;
}

function isValidDeliveryTime(value: string): boolean {
  if (!value) return false;

  const [hh, mm] = value.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;

  const minutes = hh * 60 + mm;
  const start = WORK_START_HOUR * 60;
  const end = WORK_END_HOUR * 60;

  return minutes >= start && minutes < end;
}

function App() {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "";
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [showCart, setShowCart] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"ASAP" | "SCHEDULED">("ASAP");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [orderSent, setOrderSent] = useState<string | null>(null);
const [orderStatus, setOrderStatus] = useState<"NEW" | "PENDING_CONFIRMATION" | null>(null);
  const isWorkingHours = isWorkingHoursNow();
const isScheduledTimeValid =
  deliveryMode !== "SCHEDULED" || isValidDeliveryTime(deliveryTime);

  useEffect(() => {
    if (!isWorkingHours && deliveryMode === "ASAP") setDeliveryMode("SCHEDULED");
  }, [isWorkingHours, deliveryMode]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      fetch(`${API_BASE}/api/track/menu_open?tg_user_id=${tgUser?.id || 0}`, { method: "POST" }).catch(() => {});
      try { tg.expand(); } catch {}
    }
    fetch(`${API_BASE}/api/catalog`)
      .then((r) => r.json())
      .then((data: Catalog) => { setCatalog(data); setLoading(false); })
      .catch((e) => { setError(`Не удалось загрузить каталог: ${e.message}`); setLoading(false); });
  }, [API_BASE]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE}/api/catalog`).then((r) => r.json()).then((data: Catalog) => setCatalog(data)).catch(() => {});
    }, 300000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  useEffect(() => {
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) return;
    fetch(`${API_BASE}/api/clients/${tgUser.id}/last`)
      .then((r) => r.json())
      .then((data) => {
        if (!prefilled && data.address) {
          setAddress(data.address);
          setPhone(data.phone);
          setPrefilled(true);
        }
      }).catch(() => {});
  }, [API_BASE, prefilled]);

  const addToCart = useCallback((item: CatalogItem) => {
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    fetch(`${API_BASE}/api/track/cart_add?tg_user_id=${tgUser?.id || 0}`, { method: "POST" }).catch(() => {});
    setCart((prev) => {
      const existing = prev[item.id];
      return { ...prev, [item.id]: { item, qty: existing ? existing.qty + 1 : 1 } };
    });
  }, [API_BASE]);

  const changeQty = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const entry = prev[id];
      if (!entry) return prev;
      const newQty = entry.qty + delta;
      if (newQty <= 0) { const copy = { ...prev }; delete copy[id]; return copy; }
      return { ...prev, [id]: { ...entry, qty: newQty } };
    });
  }, []);

  const cartEntries = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(() => cartEntries.reduce((s, e) => s + e.qty, 0), [cartEntries]);
  const cartTotal = useMemo(() => cartEntries.reduce((s, e) => s + e.item.price * e.qty, 0), [cartEntries]);
  const visibleCategories = useMemo(() => {
    if (!catalog) return [];
    if (activeTab === "all") return catalog.categories;
    return catalog.categories.filter((c) => c.id === activeTab);
  }, [catalog, activeTab]);

  async function submitOrder() {
    if (cartEntries.length === 0 || !address.trim()) return;
    setSending(true);
    setResult(null);

    const normalizedPhone = phone.trim().replace(/^8(\d{10})$/, "+7$1").replace(/^9(\d{9})$/, "+79$1");
    const payload = {
      address: address.trim(),
      phone: normalizedPhone,
      comment: comment.trim() || undefined,
      total_rub: cartTotal,
      delivery_mode: deliveryMode,
      scheduled_for: deliveryMode === "SCHEDULED" && deliveryTime ? deliveryTime : null,
      items: cartEntries.map((e) => ({
        name: e.item.category ? `${e.item.category}: ${e.item.name}` : e.item.name,
        qty: e.qty,
        price_rub: e.item.price,
        unit: e.item.unit,
      })),
    };

    try {
      let clientTgUserId: number | null = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;
      if (!clientTgUserId) {
        try {
          const tg = (window as any)?.Telegram?.WebApp;
          if (tg?.initData) {
            const params = new URLSearchParams(tg.initData);
            const userRaw = params.get("user");
            if (userRaw) {
              const user = JSON.parse(userRaw);
              const parsedId = Number(user?.id);
              clientTgUserId = Number.isFinite(parsedId) ? parsedId : null;
            }
          }
        } catch {
          clientTgUserId = null;
        }
      }

      const resp = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, client_tg_user_id: clientTgUserId }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setResult({ ok: false, text: data?.detail || `Ошибка: ${JSON.stringify(data)}` });
      } else {
        const oid = data.order_id ?? "—";
const status = (data.status ?? "NEW") as "NEW" | "PENDING_CONFIRMATION";
setOrderSent(oid);
setOrderStatus(status);
        setCart({});
        setShowCart(false);
        setAddress("");
        setPhone("");
        setComment("");
        setDeliveryMode(isWorkingHours ? "ASAP" : "SCHEDULED");
        setDeliveryTime("");
      }
    } catch (e: any) {
      setResult({ ok: false, text: `Ошибка сети: ${e.message}` });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}><div style={{ fontSize: 18, opacity: 0.5 }}>Загрузка меню...</div></div>;
  }
  if (error || !catalog) {
    return <div style={{ ...S.app, padding: 20 }}><div style={S.resultBox(false)}>{error || "Каталог не найден"}</div></div>;
  }
  if (orderSent) {
  const isNightRequest = orderStatus === "PENDING_CONFIRMATION";

  return (
    <div
      style={{
        ...S.app,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>
        {isNightRequest ? "🌙" : "✅"}
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        {isNightRequest ? "Заявка принята." : "Заказ отправлен!"}
      </div>

      <div style={{ fontSize: 16, opacity: 0.6, marginBottom: 4 }}>
        Номер заказа: #{orderSent}
      </div>

      <div
        style={{
          fontSize: 15,
          opacity: 0.5,
          marginBottom: 24,
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        {isNightRequest
          ? "Утром мы проверим наличие и свяжемся с вами для подтверждения."
          : "Мы получили ваш заказ и скоро перезвоним для подтверждения."}
      </div>

      <button
        style={{ ...S.mainButton(false), padding: "14px 32px", flex: "none" as any }}
        onClick={() => {
          setOrderSent(null);
          setOrderStatus(null);
        }}
      >
        Вернуться в меню
      </button>
    </div>
  );
}

  return (
    <div style={S.app}>
      <div style={S.header}>
        <h1 style={S.shopName}>{catalog.shop_name}</h1>
        <div style={S.tabs}>
          <button style={S.tab(activeTab === "all")} onClick={() => setActiveTab("all")}>Всё меню</button>
          {catalog.categories.map((cat) => (
            <button key={cat.id} style={S.tab(activeTab === cat.id)} onClick={() => setActiveTab(cat.id)}>{cat.emoji} {cat.name}</button>
          ))}
        </div>
      </div>

      {visibleCategories.map((cat) => (
        <div key={cat.id} style={S.section}>
          <div style={S.sectionTitle}>{cat.emoji} {cat.name}</div>
          {cat.items.map((item) => {
            const inCart = cart[item.id];
            return (
              <div key={item.id} style={S.card}>
                <div style={S.cardLeft}>
                  <div style={S.cardName}>{item.name}</div>
                  <div style={S.cardPrice}>{item.price}₽ / {item.unit}</div>
                </div>
                {inCart ? (
                  <div style={S.qtyControls}>
                    <button style={S.qtyBtn} onClick={() => changeQty(item.id, -1)}>−</button>
                    <span style={S.qtyText}>{inCart.qty}</span>
                    <button style={S.qtyBtn} onClick={() => changeQty(item.id, 1)}>+</button>
                  </div>
                ) : item.in_stock === false ? (
                  <div style={{ color: "#999", fontSize: "0.85em", padding: "4px 8px" }}>Нет в наличии</div>
                ) : (
                  <button style={S.addBtn} onClick={() => addToCart({ ...item, category: cat.name })}>+ Добавить</button>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {cartCount > 0 && !showCart && (
        <div style={S.bottomBar}>
          <button style={S.mainButton(false)} onClick={() => {
            const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
            fetch(`${API_BASE}/api/track/cart_open?tg_user_id=${tgUser?.id || 0}`, { method: "POST" }).catch(() => {});
            setShowCart(true);
          }}>Оформить — {cartTotal}₽</button>
          <button style={S.cartButton} onClick={() => setShowCart(true)}>🛒<span style={S.badge}>{cartCount}</span></button>
        </div>
      )}

      {showCart && (
        <div style={S.overlay}>
          <div style={S.overlayHeader}>
            <span style={S.overlayTitle}>Ваш заказ</span>
            <button style={S.closeBtn} onClick={() => setShowCart(false)}>×</button>
          </div>

          {cartEntries.length === 0 ? (
            <div style={S.emptyCart}>Корзина пуста</div>
          ) : (
            <>
              {cartEntries.map((entry) => (
                <div key={entry.item.id} style={S.card}>
                  <div style={S.cardLeft}>
                    <div style={S.cardName}>{entry.item.name}</div>
                    <div style={S.cardPrice}>{entry.item.price}₽ × {entry.qty} = {entry.item.price * entry.qty}₽</div>
                  </div>
                  <div style={S.qtyControls}>
                    <button style={S.qtyBtn} onClick={() => changeQty(entry.item.id, -1)}>−</button>
                    <span style={S.qtyText}>{entry.qty}</span>
                    <button style={S.qtyBtn} onClick={() => changeQty(entry.item.id, 1)}>+</button>
                  </div>
                </div>
              ))}

              <div style={S.totalLine}><span>Итого</span><span>{cartTotal}₽</span></div>

              <div style={{ marginTop: 20 }}>
                <label style={S.label}>Телефон для связи</label>
                <input style={S.input} placeholder="+7 900 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />

                <label style={S.label}>Адрес доставки</label>
                <input style={S.input} placeholder="ул. Ленина, д. 10, кв. 5" value={address} onChange={(e) => setAddress(e.target.value)} />

                <label style={S.label}>Комментарий</label>
                <input style={S.input} placeholder="Домофон не работает, позвоните" value={comment} onChange={(e) => setComment(e.target.value)} />

                <label style={S.label}>Когда доставить</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <button type="button" onClick={() => { if (isWorkingHours) setDeliveryMode("ASAP"); }} style={{
                    ...S.addBtn, flex: 1,
                    background: deliveryMode === "ASAP" ? "var(--tg-theme-button-color, #3390ec)" : "var(--tg-theme-secondary-bg-color, #f0f0f0)",
                    color: deliveryMode === "ASAP" ? "var(--tg-theme-button-text-color, #ffffff)" : "var(--tg-theme-text-color, #1a1a1a)",
                    opacity: isWorkingHours ? 1 : 0.45,
                    cursor: isWorkingHours ? "pointer" : "not-allowed",
                  }}>Как можно скорее</button>

                  <button type="button" onClick={() => setDeliveryMode("SCHEDULED")} style={{
                    ...S.addBtn, flex: 1,
                    background: deliveryMode === "SCHEDULED" ? "var(--tg-theme-button-color, #3390ec)" : "var(--tg-theme-secondary-bg-color, #f0f0f0)",
                    color: deliveryMode === "SCHEDULED" ? "var(--tg-theme-button-text-color, #ffffff)" : "var(--tg-theme-text-color, #1a1a1a)",
                  }}>Ко времени</button>
                </div>

                {!isWorkingHours && (
                  <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12, lineHeight: 1.45 }}>
                    Заказы на сейчас принимаем с {String(WORK_START_HOUR).padStart(2, "0")}:00. Выберите время доставки.
                  </div>
                )}

                {deliveryMode === "SCHEDULED" && (
  <>
    <input
  style={S.input}
  type="time"
  value={deliveryTime}
  min={`${String(WORK_START_HOUR).padStart(2, "0")}:00`}
  max={`${String(WORK_END_HOUR - 1).padStart(2, "0")}:59`}
  onChange={(e) => setDeliveryTime(e.target.value)}
/>
{deliveryTime && !isValidDeliveryTime(deliveryTime) && (
  <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12, lineHeight: 1.45 }}>
    Выберите время доставки с {String(WORK_START_HOUR).padStart(2, "0")}:00 до {String(WORK_END_HOUR).padStart(2, "0")}:00.
  </div>
)}
    {!isWorkingHours && (
      <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12, lineHeight: 1.45 }}>
        Ночью заказ оформляется как заявка. Утром мы проверим наличие и свяжемся с вами для подтверждения.
      </div>
    )}
  </>
)}
              </div>

              {result && <div style={S.resultBox(result.ok)}>{result.text}</div>}

              <div style={{ ...S.bottomBar, position: "fixed" as const }}>
                <button
                  style={S.mainButton(
                    sending ||
                    address.trim().length < 4 ||
                    phone.trim().replace(/\D/g, "").length < 10 ||
                    cartEntries.length === 0 ||
                    (!isWorkingHours && deliveryMode === "ASAP") ||
                    (deliveryMode === "SCHEDULED" && !isScheduledTimeValid)
                  )}
                  disabled={
                    sending ||
                    address.trim().length < 4 ||
                    phone.trim().replace(/\D/g, "").length < 10 ||
                    cartEntries.length === 0 ||
                    (!isWorkingHours && deliveryMode === "ASAP") ||
                    (deliveryMode === "SCHEDULED" && !isScheduledTimeValid)
                  }
                  onClick={submitOrder}
                >
                  {sending ? "Отправляю..." : `Заказать — ${cartTotal}₽`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
