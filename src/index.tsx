import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type CatalogItem = {
  id: string;
  name: string;
  title?: string;
  subtitle?: string;
  price: number;
  unit: string;
  in_stock?: boolean;
  image?: string;
  category?: string;
  prepared_item_id?: string;
  prepared_wait_time?: string;
  prepared_min_order?: string;
  prepared_price_text?: string;
  prepared_note?: string;
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
  work_start_hour?: number;
  work_end_hour?: number;
  free_delivery_from?: number;
  phone?: string;
  order_confirmation_text?: string;
  categories: Category[];
};
type CartEntry = { item: CatalogItem; qty: number };
type WhereToBuyPoint = { city: string; name: string; address: string; schedule?: string; note?: string };
type WhereToBuyContent = { title: string; description: string; points: WhereToBuyPoint[] };
type PreparedOnRequestItem = { id: string; name: string; note?: string };
type PreparedOnRequestContent = {
  visible: boolean;
  title: string;
  subtitle: string;
  items: PreparedOnRequestItem[];
  disclaimer: string;
  cta_text: string;
  cta_secondary_text: string;
  cta_secondary_mode: string;
  cta_secondary_value: string;
};


function tgVar(name: string, fallback: string): string {
  return `var(--tg-theme-${name}, ${fallback})`;
}

const S = {
  app: {
    fontFamily: `-apple-system, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    minHeight: "100vh",
    background: tgVar("bg-color", "#f7f5f2"),
    color: tgVar("text-color", "#1a1a1a"),
    paddingBottom: 100,
  } as React.CSSProperties,
  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: tgVar("bg-color", "#f7f5f2"),
    borderBottom: `1px solid ${tgVar("secondary-bg-color", "#e8e3dc")}`,
    padding: "14px 16px 12px",
  } as React.CSSProperties,
  shopName: {
    fontFamily: `"Cormorant Garamond", Georgia, serif`,
    fontSize: 30,
    fontWeight: 700,
    color: "#1c110a",
    margin: "0 0 8px",
    letterSpacing: "0.3px",
    lineHeight: 1.15,
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
    gap: 10,
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
    outline: "none", boxSizing: "border-box" as const, marginBottom: 10, fontFamily: "inherit",
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

function isWorkingHoursNow(date = new Date(), startHour = 10, endHour = 22): boolean {
  const h = date.getHours();
  return h >= startHour && h < endHour;
}

function isValidDeliveryTime(value: string, startHour = 10, endHour = 22): boolean {
  if (!value) return false;

  const [hh, mm] = value.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;

  const minutes = hh * 60 + mm;
  const start = startHour * 60;
  const end = endHour * 60;

  return minutes >= start && minutes < end;
}

function isFutureDeliveryTimeToday(value: string, date = new Date()): boolean {
  if (!value) return false;

  const [hh, mm] = value.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;

  const selectedMinutes = hh * 60 + mm;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();

  return selectedMinutes > nowMinutes;
}

const STATUS_LABELS: Record<string, string> = {
  NEW:                  "Получен",
  PENDING_CONFIRMATION: "Ожидает подтверждения",
  ACCEPTED:             "Принят",
  COOKING:              "Готовится",
  ONWAY:                "Выехал курьер",
  DONE:                 "Доставлен",
  REJECTED:             "Отклонён",
  NOT_FOUND:            "Заказ не найден",
};

let _fallbackClientId: string | null = null;

function getClientId(): string {
  try {
    const KEY = 'analytics_client_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    if (!_fallbackClientId) {
      _fallbackClientId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    return _fallbackClientId;
  }
}

const DEFAULT_WHERE_TO_BUY: WhereToBuyContent = {
  title: "Где купить",
  description: "Продукцию «Римских пельменей» можно найти в нескольких торговых точках Оренбурга. Наличие и ассортимент лучше уточнять заранее.",
  points: [
    { city: "Оренбург", name: "Гармония",          address: "ДНТ Лидиния, ул. Плодовая, 39" },
    { city: "Оренбург", name: "Домашкино",         address: "ул. Мясокомбинат, д. 1" },
    { city: "Оренбург", name: "Фрэш Маркет",       address: "Северный проезд, 18/1" },
    { city: "Оренбург", name: "Продуктовый отдел", address: "ул. Орлова, д. 5" },
    { city: "Оренбург", name: "Продукты 24",       address: "ул. Постникова, д. 20" },
    { city: "Оренбург", name: "Магазин у Дома",    address: "пос. Аэропорт, ул. Центральная, д. 4" },
  ],
};

function App() {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "";
  const [isTest] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('test') === '1') {
      sessionStorage.setItem('is_test', '1');
      p.delete('test');
      const qs = p.toString();
      const clean = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
      window.history.replaceState(null, '', clean);
    }
    return sessionStorage.getItem('is_test') === '1';
  });
  const testQ = isTest ? '&is_test=true' : '';
  const tgUserId = ((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id as number | undefined) || null;
  const channel = tgUserId ? 'telegram' : 'web';
  const userKey = tgUserId ? `tg:${tgUserId}` : `web:${getClientId()}`;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWhereToBuy, setShowWhereToBuy] = useState(false);
  const [whereToBuy, setWhereToBuy] = useState<WhereToBuyContent>(DEFAULT_WHERE_TO_BUY);
  const [preparedOnRequest, setPreparedOnRequest] = useState<PreparedOnRequestContent | null>(null);
  const [forBusinessEnabled, setForBusinessEnabled] = useState<boolean | null>(null);
  const [showPreparedForm, setShowPreparedForm] = useState(false);
  const [porName, setPorName] = useState("");
  const [porPhone, setPorPhone] = useState("");
  const [porComment, setPorComment] = useState("");
  const [porDesiredTime, setPorDesiredTime] = useState("");
  const [porQtys, setPorQtys] = useState<Record<string, number>>({});
  const [porSending, setPorSending] = useState(false);
  const [porResult, setPorResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [showSections, setShowSections] = useState(false);
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSections) return;
    const handler = (e: MouseEvent) => {
      if (sectionsRef.current && !sectionsRef.current.contains(e.target as Node))
        setShowSections(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSections]);

  function scrollToSection(id: string) {
    setShowSections(false);
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 128;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

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
  const resultRef = useRef<HTMLDivElement>(null);
  const [orderSent, setOrderSent] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('order')
  );
const [orderStatus, setOrderStatus] = useState<"NEW" | "PENDING_CONFIRMATION" | null>(null);
const [liveStatus, setLiveStatus] = useState<string | null>(null);
const [copied, setCopied] = useState<string | null>(null);
const workStart = catalog?.work_start_hour ?? 10;
const workEnd = catalog?.work_end_hour ?? 22;
const currency = catalog?.currency ?? "₽";
const freeFrom = catalog?.free_delivery_from ?? 0;
const bizPhone = catalog?.phone ?? "";
const confirmText = catalog?.order_confirmation_text
  ?? "Мы получили ваш заказ и скоро перезвоним для подтверждения.";

const isWorkingHours = isWorkingHoursNow(undefined, workStart, workEnd);

const isScheduledTimeValid =
  deliveryMode !== "SCHEDULED" || isValidDeliveryTime(deliveryTime, workStart, workEnd);

const isScheduledTimeInFuture =
  !isWorkingHours ||
  deliveryMode !== "SCHEDULED" ||
  !deliveryTime ||
  isFutureDeliveryTimeToday(deliveryTime);

  useEffect(() => {
    if (!isWorkingHours && deliveryMode === "ASAP") setDeliveryMode("SCHEDULED");
  }, [isWorkingHours, deliveryMode]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      try { tg.expand(); } catch {}
    }
    if (!sessionStorage.getItem('analytics_menu_open_sent')) {
      sessionStorage.setItem('analytics_menu_open_sent', '1');
      fetch(`${API_BASE}/api/track/menu_open?tg_user_id=${tgUserId || 0}${testQ}&channel=${channel}&user_key=${encodeURIComponent(userKey)}`, { method: "POST" }).catch(() => {});
    }
    fetch(`${API_BASE}/api/catalog`)
      .then((r) => r.json())
      .then((data: Catalog) => { setCatalog(data); document.title = data.shop_name; setLoading(false); })
      .catch((e) => { setError(`Не удалось загрузить каталог: ${e.message}`); setLoading(false); });
    fetch(`${API_BASE}/api/content/where-to-buy`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: WhereToBuyContent | null) => { if (data) setWhereToBuy(data); })
      .catch(() => {});
    fetch(`${API_BASE}/api/content/prepared-on-request`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: PreparedOnRequestContent | null) => { setPreparedOnRequest(data?.visible ? data : null); })
      .catch(() => { setPreparedOnRequest(null); });
    fetch(`${API_BASE}/api/content/for-business`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { enabled?: boolean } | null) => { setForBusinessEnabled(data?.enabled ?? false); })
      .catch(() => { setForBusinessEnabled(false); });
  }, [API_BASE]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      fetch(`${API_BASE}/api/catalog`, { cache: 'no-store' }).then(r => r.json()).then((data: Catalog) => setCatalog(data)).catch(() => {});
    };
    refresh();
    const interval = setInterval(refresh, 12000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
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

  function applyLocalContact() {
    try {
      const saved = localStorage.getItem('order_contact');
      if (!saved) return;
      const { phone: p, address: a } = JSON.parse(saved);
      if (a) setAddress(a);
      if (p) setPhone(p);
    } catch {}
  }

  useEffect(() => {
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) applyLocalContact();
  }, []);

  useEffect(() => {
    if (!orderSent) return;
    const TERMINAL = new Set(["DONE", "REJECTED"]);
    let intervalId: ReturnType<typeof setInterval>;
    const poll = () => {
      fetch(`${API_BASE}/api/orders/${orderSent}`)
        .then(r => { if (!r.ok) throw r.status; return r.json(); })
        .then(data => {
          if (!data?.status) return;
          setLiveStatus(data.status);
          if (TERMINAL.has(data.status)) clearInterval(intervalId);
        })
        .catch(err => {
          if (err === 404) { setLiveStatus('NOT_FOUND'); clearInterval(intervalId); }
        });
    };
    poll();
    intervalId = setInterval(poll, 12000);
    return () => clearInterval(intervalId);
  }, [orderSent, API_BASE]);

  useEffect(() => {
    if (result && !result.ok) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result]);

  useEffect(() => {
    setResult(prev => (prev && !prev.ok ? null : prev));
  }, [cart]);

  const addToCart = useCallback((item: CatalogItem) => {
    fetch(`${API_BASE}/api/track/cart_add?tg_user_id=${tgUserId || 0}${testQ}&channel=${channel}&user_key=${encodeURIComponent(userKey)}`, { method: "POST" }).catch(() => {});
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
  const allCategories = catalog?.categories ?? [];

  const PREPARED_CAT_IDS = ["pelmeni", "manty", "farsh", "shashlik"];
  const preparedCtaCats = allCategories.filter(cat => PREPARED_CAT_IDS.includes(cat.id));
  const itemsForCat = (cat: Category) =>
    PREPARED_CAT_IDS.includes(cat.id)
      ? cat.items
      : cat.items.filter(it => !!it.prepared_item_id);

  const [, setPorCategoryId] = useState<string | null>(null);
  const [porExpandedCats, setPorExpandedCats] = useState<Set<string>>(new Set());

  const POPULAR_IDS = ["h1", "p1", "s1", "o2"];
  const popularItems = useMemo(() => {
    if (!catalog) return [];
    const itemMap = new Map<string, CatalogItem & { catName: string; catId: string }>();
    for (const cat of catalog.categories) {
      for (const item of cat.items) {
        itemMap.set(item.id, { ...item, category: cat.name, catName: cat.name, catId: cat.id });
      }
    }
    return POPULAR_IDS.map(id => itemMap.get(id)).filter(Boolean) as (CatalogItem & { catName: string; catId: string })[];
  }, [catalog]);

  const IMAGE_POS: Record<string, string> = { o1: "center 70%", k3: "center 35%", p1: "center 30%" };

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
        id: e.item.id,
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
        body: JSON.stringify({ ...payload, client_tg_user_id: clientTgUserId, is_test: isTest, channel, user_key: userKey }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setResult({ ok: false, text: data?.detail || `Ошибка: ${JSON.stringify(data)}` });
      } else {
        const oid = data.order_id ?? "—";
const status = (data.status ?? "NEW") as "NEW" | "PENDING_CONFIRMATION";
setOrderSent(oid);
setOrderStatus(status);
setLiveStatus(status);
const _u = new URL(window.location.href);
_u.searchParams.set('order', oid);
window.history.replaceState(null, '', _u.toString());
        try {
          localStorage.setItem('order_contact', JSON.stringify({ phone: normalizedPhone, address: address.trim() }));
        } catch {}
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
      {liveStatus && (
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
          Статус: {STATUS_LABELS[liveStatus] ?? liveStatus}
        </div>
      )}
      {bizPhone && (
        <div style={{ fontSize: 14, opacity: 0.5, marginBottom: 24 }}>
          Вопросы по заказу: {bizPhone}
        </div>
      )}

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
          : confirmText}
      </div>

      <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 10 }}>
        Сохраните ссылку, чтобы открыть статус заказа позже
      </div>
      <button
        style={{ ...S.mainButton(false), padding: "10px 24px", flex: "none" as any, marginBottom: 16, fontSize: 14 }}
        onClick={() => {
          navigator.clipboard.writeText(window.location.href)
            .then(() => { setCopied('ok'); setTimeout(() => setCopied(null), 2500); })
            .catch(() => { setCopied('fail'); setTimeout(() => setCopied(null), 2500); });
        }}
      >
        {copied === 'ok' ? "Ссылка скопирована ✓" : copied === 'fail' ? "Не удалось скопировать" : "Скопировать ссылку"}
      </button>

      <button
        style={{ ...S.mainButton(false), padding: "14px 32px", flex: "none" as any }}
        onClick={() => {
          setOrderSent(null);
          setOrderStatus(null);
          setLiveStatus(null);
          setCopied(null);
          if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) setPrefilled(false);
          else applyLocalContact();
          const _u = new URL(window.location.href);
          _u.searchParams.delete('order');
          window.history.replaceState(null, '', _u.toString());
        }}
      >
        Вернуться в меню
      </button>
    </div>
  );
}

  return (
    <div style={S.app} className="rp-app">
      <style>{`
        .rp-app { max-width: 100%; }
        @media (min-width: 640px)  { .rp-app { max-width: 760px;  margin: 0 auto; } }
        @media (min-width: 900px)  { .rp-app { max-width: 980px;  } }
        @media (min-width: 1280px) { .rp-app { max-width: 1100px; } }
        .rp-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; margin: 0 auto; }
        @media (min-width: 900px)  { .rp-nav { grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 580px; } }
        @media (min-width: 900px)  { .rp-sections-btn { display: none; } }
        .rp-chips { display: none; }
        @media (min-width: 900px)  { .rp-chips { display: flex; } }
        .rp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (min-width: 640px)  { .rp-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (min-width: 900px)  { .rp-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (min-width: 640px)  { .rp-bottom { left: 50%; transform: translateX(-50%); width: 760px;  right: auto; } }
        @media (min-width: 900px)  { .rp-bottom { width: 980px;  } }
        @media (min-width: 1280px) { .rp-bottom { width: 1100px; } }
      `}</style>
      {isTest && <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#ff3b30',color:'#fff',fontSize:11,fontWeight:700,textAlign:'center' as const,padding:'3px 0',letterSpacing:'1px'}}>ТЕСТОВЫЙ РЕЖИМ</div>}
      {freeFrom > 0 && (
        <div style={{
          background: "#2d1f0e", color: "#f5e9d6",
          fontSize: 12, fontWeight: 500, textAlign: "center" as const,
          padding: "7px 16px", letterSpacing: "0.2px", lineHeight: 1.4,
        }}>
          По Саракташу — бесплатно от {freeFrom}₽ · принимаем заказы {workStart}:00–{workEnd}:00
        </div>
      )}
      <div style={S.header}>
        <h1 style={S.shopName}>{catalog.shop_name}</h1>
        <p style={{ margin: "0 0 10px", fontSize: 13, opacity: 0.55, lineHeight: 1.4 }}>
          Домашние полуфабрикаты ручной лепки
        </p>
        {(() => {
          const btnInner: React.CSSProperties = {
            display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8,
            width: "100%", boxSizing: "border-box", minWidth: 0, overflow: "hidden",
            padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            minHeight: 44, textDecoration: "none",
            background: tgVar("secondary-bg-color", "#e2ddd6"),
            color: tgVar("text-color", "#1a1a1a"),
            fontSize: 13, fontWeight: 600,
          };
          const txt = (s: string) => (
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s}</span>
          );
          const ico = (s: string) => (
            <span style={{ width: 20, textAlign: "center" as const, flexShrink: 0 }}>{s}</span>
          );
          return (
            <div style={{ display: "grid", gap: 8, marginBottom: 10 }} className="rp-nav">

              <div style={{ minWidth: 0, position: "relative" }} ref={sectionsRef} className="rp-sections-btn">
                <button onClick={() => setShowSections(v => !v)} style={btnInner}>{ico("☰")}{txt("Разделы")}</button>
                {showSections && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                    background: tgVar("bg-color", "#ffffff"), borderRadius: 12,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)", padding: "6px 0",
                    zIndex: 100, maxWidth: 260,
                  }}>
                    <button
                      onClick={() => scrollToSection("section-popular")}
                      style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: "none", textAlign: "left" as const, fontSize: 14, cursor: "pointer", color: tgVar("text-color", "#1a1a1a") }}
                    >⭐ Популярное</button>
                    {allCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => scrollToSection(`section-${cat.id}`)}
                        style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: "none", textAlign: "left" as const, fontSize: 14, cursor: "pointer", color: tgVar("text-color", "#1a1a1a") }}
                      >
                        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                          <span>{cat.emoji} {cat.name}</span>
                          {PREPARED_CAT_IDS.includes(cat.id) && preparedOnRequest && (
                            <span style={{ fontSize: 11, color: "#9a7a5a", lineHeight: 1.3 }}>можно в готовом виде</span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <button onClick={() => setShowWhereToBuy(true)} style={btnInner}>{ico("📍")}{txt("Где купить")}</button>
              </div>

              {bizPhone && (
                <div style={{ minWidth: 0 }}>
                  <a href={`tel:${bizPhone}`} style={btnInner}>{ico("📞")}{txt("Позвонить")}</a>
                </div>
              )}

              {bizPhone && (
                <div style={{ minWidth: 0 }}>
                  <a href="https://max.ru/join/FZnl85uOe410NmUxA0dDMyFYf90-aJkBOweY_tPkUr4" target="_blank" rel="noreferrer" style={btnInner}>{ico("💬")}{txt("Чат MAX")}</a>
                </div>
              )}

            </div>
          );
        })()}
      </div>

      <div style={{ gap: 8, overflowX: "auto", padding: "6px 16px 6px", scrollbarWidth: "none" as const }} className="rp-chips">
        {popularItems.length > 0 && (
          <button
            onClick={() => scrollToSection("section-popular")}
            style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap" as const, fontSize: 12, fontWeight: 400, flexShrink: 0, background: tgVar("secondary-bg-color", "#e2ddd6"), color: tgVar("text-color", "#1a1a1a") }}
          >⭐ Популярное</button>
        )}
        {allCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => scrollToSection(`section-${cat.id}`)}
            style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", whiteSpace: "nowrap" as const, fontSize: 12, fontWeight: 400, flexShrink: 0, background: tgVar("secondary-bg-color", "#e2ddd6"), color: tgVar("text-color", "#1a1a1a") }}
          >{cat.emoji} {cat.name}</button>
        ))}
      </div>

      {popularItems.length > 0 && (
        <div id="section-popular" style={S.section}>
          <div style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 14px", letterSpacing: 0 }}>⭐ Популярное</div>
          <div style={{ display: "grid", gap: 8 }} className="rp-grid">
            {popularItems.map((item) => {
              const inCart = cart[item.id];
              return (
                <div key={item.id} style={{
                  display: "flex", flexDirection: "column" as const,
                  borderRadius: 14, background: tgVar("secondary-bg-color", "#f7f7f8"),
                  overflow: "hidden",
                }}>
                  <div style={{ position: "relative" }}>
                    {item.image && (
                      <img src={item.image} alt={item.name} style={{
                        width: "100%", aspectRatio: "3/2", objectFit: "cover", display: "block",
                        ...(IMAGE_POS[item.id] && { objectPosition: IMAGE_POS[item.id] }),
                      }} />
                    )}
                    {item.prepared_item_id && !PREPARED_CAT_IDS.includes(item.catId) && preparedOnRequest && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPorCategoryId(item.catId); setPorExpandedCats(new Set([item.catId])); setPorQtys({ [item.id]: 1 }); setPorPhone(phone); setPorResult(null); setShowPreparedForm(true); }}
                        style={{ position: "absolute", top: 8, left: 8, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(90,57,35,0.10)", cursor: "pointer", background: "rgba(248,241,232,0.96)", color: "#5a3923", fontSize: 12, fontWeight: 700, lineHeight: 1, boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
                      >Можно готовым</button>
                    )}
                  </div>
                  <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column" as const, flex: 1 }}>
                    <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>{item.catName}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: item.subtitle ? 2 : 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{item.title ?? item.name}</div>
                    {item.subtitle && <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>{item.subtitle}</div>}
                    <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.75, marginBottom: 8 }}>{item.price}{currency} / {item.unit}</div>
                    <div style={{ marginTop: "auto" }}>
                      {inCart ? (
                        <div style={{ ...S.qtyControls, justifyContent: "center" }}>
                          <button style={{ ...S.qtyBtn, width: 30, height: 30, fontSize: 18 }} onClick={() => changeQty(item.id, -1)}>−</button>
                          <span style={{ ...S.qtyText, width: 32, fontSize: 15 }}>{inCart.qty}</span>
                          <button style={{ ...S.qtyBtn, width: 30, height: 30, fontSize: 18 }} onClick={() => changeQty(item.id, 1)}>+</button>
                        </div>
                      ) : item.in_stock === false ? (
                        <div style={{ color: "#999", fontSize: 13, textAlign: "center" as const }}>Нет в наличии</div>
                      ) : (
                        <button style={{ ...S.addBtn, width: "100%", padding: "7px 0", fontSize: 13 }} onClick={() => addToCart({ ...item, category: item.catName })}>+ Добавить</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: "4px 16px 10px" }}>
        <a
          href="https://yandex.com/profile/90471460683?lang=ru&no-distribution=1&view-state=mini&source=wizbiz_new_map_single"
          target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, textDecoration: "none" }}
        >
          <span style={{ color: "#f5a623", fontSize: 15, lineHeight: 1 }}>★</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: tgVar("text-color", "#1a1a1a") }}>4,5</span>
          <span style={{ fontSize: 13, opacity: 0.5, color: tgVar("text-color", "#1a1a1a") }}>· 10 отзывов на Яндекс Картах</span>
          <span style={{ fontSize: 13, opacity: 0.4, color: tgVar("text-color", "#1a1a1a") }}>→</span>
        </a>
        {([
          { text: "Римские пельмени, манты — просто класс, по-домашнему. Всегда свежие, всем советую. Бесплатная доставка — большой плюс!", name: "Светлана Г." },
          { text: "Хорошее качество, очень вкусные, тесто не разваривается. Были очень довольны, рекомендую, пельмени супер.", name: "Сергей К." },
          { text: "Заказали пельмени, вареники и котлеты. Я просто в восторге! Держите марку также хорошо.", name: "Арсений К." },
        ] as const).map(({ text, name }) => (
          <div key={name} style={{
            background: tgVar("secondary-bg-color", "#f7f5f2"),
            borderRadius: 12, padding: "10px 12px", marginBottom: 8,
          }}>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>«{text}»</div>
            <div style={{ fontSize: 12, opacity: 0.45 }}>— {name}</div>
          </div>
        ))}
      </div>

      {forBusinessEnabled && <div style={{ padding: "12px 16px 8px" }}>
        <a href="business.html" style={{
          display: "block", padding: "14px", borderRadius: 16,
          background: "#faf7f0", border: "1px solid rgba(0,0,0,.12)",
          textDecoration: "none", color: "#1a1a1a",
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>
            У вас магазин или точка?
          </div>
          <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.35, marginBottom: 10 }}>
            Поставляем пельмени ручной лепки и другие позиции.{" "}
            Подскажем, с чего проще начать.
          </div>
          <div style={{
            display: "inline-block", fontSize: 13, fontWeight: 600,
            padding: "8px 14px", borderRadius: 20, background: "rgba(0,0,0,.08)",
          }}>
            Подробнее →
          </div>
        </a>
      </div>}

      {allCategories.map((cat) => (
        <div key={cat.id} id={`section-${cat.id}`} style={S.section}>
          <div style={{ ...S.sectionTitle, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <span>{cat.emoji} {cat.name}</span>
            {preparedCtaCats.some(pc => pc.id === cat.id) && preparedOnRequest && (
              <button
                onClick={() => { setPorCategoryId(cat.id); setPorExpandedCats(new Set([cat.id])); setPorQtys({}); setPorPhone(phone); setPorResult(null); setShowPreparedForm(true); }}
                style={{ fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 20, border: "none", cursor: "pointer", background: tgVar("secondary-bg-color", "#ede8e0"), color: tgVar("text-color", "#1a1a1a"), whiteSpace: "nowrap" as const }}
              >Заказать готовым</button>
            )}
          </div>
          <div style={{ display: "grid", gap: 8 }} className="rp-grid">
            {cat.items.map((item) => {
              const inCart = cart[item.id];
              return (
                <div key={item.id} style={{
                  display: "flex", flexDirection: "column" as const,
                  borderRadius: 14, background: tgVar("secondary-bg-color", "#f7f7f8"),
                  overflow: "hidden",
                }}>
                  <div style={{ position: "relative" }}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{
                        width: "100%", aspectRatio: "3/2", objectFit: "cover", display: "block",
                        ...(IMAGE_POS[item.id] && { objectPosition: IMAGE_POS[item.id] }),
                      }} />
                    ) : (
                      <div style={{
                        width: "100%", aspectRatio: "3/2", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        background: "#f0ebe3", color: "#b0a898", fontSize: 11,
                      }}>
                        Фото скоро появится
                      </div>
                    )}
                    {item.prepared_item_id && !PREPARED_CAT_IDS.includes(cat.id) && preparedOnRequest && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPorCategoryId(cat.id); setPorExpandedCats(new Set([cat.id])); setPorQtys({ [item.id]: 1 }); setPorPhone(phone); setPorResult(null); setShowPreparedForm(true); }}
                        style={{ position: "absolute", top: 8, left: 8, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(90,57,35,0.10)", cursor: "pointer", background: "rgba(248,241,232,0.96)", color: "#5a3923", fontSize: 12, fontWeight: 700, lineHeight: 1, boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
                      >Можно готовым</button>
                    )}
                  </div>
                  <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column" as const, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: item.subtitle ? 2 : 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{item.title ?? item.name}</div>
                    {item.subtitle && <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>{item.subtitle}</div>}
                    <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.55, marginBottom: 8 }}>{item.price}{currency} / {item.unit}</div>
                    <div style={{ marginTop: "auto" }}>
                      {inCart ? (
                        <div style={{ ...S.qtyControls, justifyContent: "center" }}>
                          <button style={{ ...S.qtyBtn, width: 30, height: 30, fontSize: 18 }} onClick={() => changeQty(item.id, -1)}>−</button>
                          <span style={{ ...S.qtyText, width: 32, fontSize: 15 }}>{inCart.qty}</span>
                          <button style={{ ...S.qtyBtn, width: 30, height: 30, fontSize: 18 }} onClick={() => changeQty(item.id, 1)}>+</button>
                        </div>
                      ) : item.in_stock === false ? (
                        <div style={{ color: "#999", fontSize: 13, textAlign: "center" as const }}>Нет в наличии</div>
                      ) : (
                        <button style={{ ...S.addBtn, width: "100%", padding: "7px 0", fontSize: 13 }} onClick={() => addToCart({ ...item, category: cat.name })}>+ Добавить</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {preparedOnRequest && (
        <div style={{ padding: "8px 16px 12px" }}>
          <div style={{
            borderRadius: 16, background: "#faf7f0", border: "1px solid rgba(0,0,0,.08)",
            padding: "16px",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>
              {preparedOnRequest.title}
            </div>
            <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.45, marginBottom: 14 }}>
              {preparedOnRequest.subtitle}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setPorCategoryId(null); setPorExpandedCats(new Set(preparedCtaCats.map(c => c.id))); setPorQtys({}); setPorPhone(phone); setPorResult(null); setShowPreparedForm(true); }} style={{
                flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                background: tgVar("button-color", "#3390ec"), color: tgVar("button-text-color", "#fff"),
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
                {preparedOnRequest.cta_text || "Оставить заявку"}
              </button>
              {preparedOnRequest.cta_secondary_text && preparedOnRequest.cta_secondary_value && (
                <a
                  href={preparedOnRequest.cta_secondary_mode === "phone" ? `tel:${preparedOnRequest.cta_secondary_value}` : preparedOnRequest.cta_secondary_value}
                  {...(preparedOnRequest.cta_secondary_mode === "link" ? { target: "_blank", rel: "noreferrer" } : {})}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "11px 0", borderRadius: 12,
                    background: tgVar("secondary-bg-color", "#ede8e0"), color: tgVar("text-color", "#1a1a1a"),
                    fontSize: 14, fontWeight: 600, textDecoration: "none",
                  }}
                >
                  {preparedOnRequest.cta_secondary_text}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 16px 24px", textAlign: "center" as const }}>
        <a href="business.html" style={{
          fontSize: 12, opacity: 0.35,
          color: tgVar("text-color", "#1a1a1a"),
          textDecoration: "none",
        }}>Для магазинов и партнёров →</a>
      </div>

      {cartCount > 0 && !showCart && (
        <div style={S.bottomBar} className="rp-bottom">
          <button style={S.mainButton(false)} onClick={() => {
            fetch(`${API_BASE}/api/track/cart_open?tg_user_id=${tgUserId || 0}${testQ}&channel=${channel}&user_key=${encodeURIComponent(userKey)}`, { method: "POST" }).catch(() => {});
            setShowCart(true);
          }}>Оформить — {cartTotal}{currency}</button>
          <button style={S.cartButton} onClick={() => setShowCart(true)}>🛒<span style={S.badge}>{cartCount}</span></button>
        </div>
      )}

      {showWhereToBuy && (
        <div style={S.overlay}>
          <div style={S.overlayHeader}>
            <span style={S.overlayTitle}>{whereToBuy.title}</span>
            <button style={S.closeBtn} onClick={() => setShowWhereToBuy(false)}>×</button>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: tgVar("text-color", "#1a1a1a"), opacity: 0.8, margin: "0 0 20px" }}>
            {whereToBuy.description}
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 20 }}>
            {(() => {
              const cities = [...new Set(whereToBuy.points.map(p => p.city))];
              return cities.map(city => (
                <div key={city}>
                  <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.45, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 6 }}>{city}</div>
                  {whereToBuy.points.filter(p => p.city === city).map((point, i) => (
                    <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: tgVar("secondary-bg-color", "#f0ebe3"), marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{point.name}</div>
                      <div style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>{point.address}</div>
                      {point.schedule ? <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>{point.schedule}</div> : null}
                      {point.note ? <div style={{ fontSize: 12, opacity: 0.5, marginTop: 1 }}>{point.note}</div> : null}
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={`tel:${bizPhone}`} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "12px 0", borderRadius: 12,
              background: tgVar("button-color", "#3390ec"), color: tgVar("button-text-color", "#ffffff"),
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>📞 Позвонить Риму</a>
            <a href="https://max.ru/join/FZnl85uOe410NmUxA0dDMyFYf90-aJkBOweY_tPkUr4" target="_blank" rel="noreferrer" style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "12px 0", borderRadius: 12,
              background: tgVar("secondary-bg-color", "#ede8e0"), color: tgVar("text-color", "#1a1a1a"),
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}>💬 Написать в MAX</a>
          </div>
        </div>
      )}

      {showPreparedForm && preparedOnRequest && (
        <div style={S.overlay}>
          <div style={S.overlayHeader}>
            <span style={S.overlayTitle}>Можно заказать в готовом виде</span>
            <button style={S.closeBtn} onClick={() => { setShowPreparedForm(false); setPorResult(null); setPorCategoryId(null); }}>×</button>
          </div>
          <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 16, marginTop: -4 }}>Выберите, что приготовить</div>
          {porResult ? (
            <div style={{ padding: "20px 0", textAlign: "center" as const }}>
              <div style={{ fontSize: 22, marginBottom: 12 }}>{porResult.ok ? "✓" : "✗"}</div>
              <div style={{ fontSize: 15, lineHeight: 1.5, color: porResult.ok ? "#1a6e2e" : "#c0392b" }}>
                {porResult.text}
              </div>
              {porResult.ok && (
                <button
                  onClick={() => { setShowPreparedForm(false); setPorResult(null); setPorCategoryId(null); }}
                  style={{
                    marginTop: 20, padding: "11px 28px", borderRadius: 12, border: "none",
                    background: tgVar("secondary-bg-color", "#ede8e0"), color: tgVar("text-color", "#1a1a1a"),
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}
                >Закрыть</button>
              )}
            </div>
          ) : (
            <>
              {(() => {
                const overlayCats = allCategories.filter(cat => itemsForCat(cat).length > 0);
                if (overlayCats.length === 0) return null;
                return (
                  <div style={{ marginBottom: 16 }}>
                    {overlayCats.map(cat => {
                      const catItems = itemsForCat(cat);
                      const isExpanded = porExpandedCats.has(cat.id);
                      const showToggle = overlayCats.length > 1;
                      return (
                        <div key={cat.id} style={{ marginBottom: showToggle ? 6 : 0 }}>
                          {showToggle && (
                            <button
                              onClick={() => setPorExpandedCats(s => { const n = new Set(s); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n; })}
                              style={{ width: "100%", textAlign: "left" as const, padding: "8px 12px", marginBottom: 4, border: "none", cursor: "pointer", background: tgVar("secondary-bg-color", "#e8e2d9"), borderRadius: 10, fontSize: 14, fontWeight: 700, color: tgVar("text-color", "#1a1a1a"), display: "flex", justifyContent: "space-between" as const, alignItems: "center" }}
                            >
                              <span>{cat.emoji} {cat.name}</span>
                              <span style={{ fontSize: 11 }}>{isExpanded ? "▾" : "▸"}</span>
                            </button>
                          )}
                          {(isExpanded || !showToggle) && (() => {
                            const mostCommon = (vals: (string | undefined)[]) => { const freq: Record<string, number> = {}; for (const v of vals) if (v) freq[v] = (freq[v] ?? 0) + 1; return Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0] ?? null; };
                            const sharedWaitTime = mostCommon(catItems.map(it => it.prepared_wait_time));
                            const sharedMinOrder = mostCommon(catItems.map(it => it.prepared_min_order));
                            const sharedPriceText = mostCommon(catItems.map(it => it.prepared_price_text));
                            const priceLabel = (v: string) => v === "уточняется при подтверждении" ? "Цену уточним при подтверждении" : `Цена: ${v}`;
                            return (
                              <>
                                {cat.id === "shashlik" && (
                                  <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, lineHeight: 1.4, paddingLeft: 2 }}>
                                    Готовим жареный шашлык — не маринованный.
                                  </div>
                                )}
                                {(sharedWaitTime || sharedMinOrder || sharedPriceText) && (
                                  <div style={{ fontSize: 12, opacity: 0.68, lineHeight: 1.45, marginBottom: 6, paddingLeft: 2 }}>
                                    {sharedWaitTime && <div>Время приготовления: {sharedWaitTime}</div>}
                                    {sharedMinOrder && <div>Минимальный заказ: {sharedMinOrder}</div>}
                                    {sharedPriceText && <div>{priceLabel(sharedPriceText)}</div>}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          {(isExpanded || !showToggle) && catItems.map(item => {
                            const mostCommon = (vals: (string | undefined)[]) => { const freq: Record<string, number> = {}; for (const v of vals) if (v) freq[v] = (freq[v] ?? 0) + 1; return Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0] ?? null; };
                            const sharedWaitTime = mostCommon(catItems.map(it => it.prepared_wait_time));
                            const sharedMinOrder = mostCommon(catItems.map(it => it.prepared_min_order));
                            const sharedPriceText = mostCommon(catItems.map(it => it.prepared_price_text));
                            const priceLabel = (v: string) => v === "уточняется при подтверждении" ? "Цену уточним при подтверждении" : `Цена: ${v}`;
                            const qty = porQtys[item.id] ?? 0;
                            return (
                              <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 10, background: tgVar("secondary-bg-color", "#f0ebe3"), marginBottom: 6 }}>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title ?? item.name}</div>
                                  {item.subtitle && <div style={{ fontSize: 12, opacity: 0.60, marginTop: 1 }}>{item.subtitle}</div>}
                                  {item.prepared_wait_time && item.prepared_wait_time !== sharedWaitTime && <div style={{ fontSize: 11, opacity: 0.56, lineHeight: 1.35, marginTop: 2 }}>Время: {item.prepared_wait_time}</div>}
                                  {item.prepared_min_order && item.prepared_min_order !== sharedMinOrder && <div style={{ fontSize: 11, opacity: 0.56, lineHeight: 1.35, marginTop: 1 }}>Минимум: {item.prepared_min_order}</div>}
                                  {item.prepared_price_text && item.prepared_price_text !== sharedPriceText && <div style={{ fontSize: 11, opacity: 0.56, lineHeight: 1.35, marginTop: 1 }}>{priceLabel(item.prepared_price_text)}</div>}
                                  {item.prepared_note && <div style={{ fontSize: 11, opacity: 0.56, lineHeight: 1.35, marginTop: 1 }}>{item.prepared_note}</div>}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <button onClick={() => setPorQtys(q => ({ ...q, [item.id]: Math.max(0, (q[item.id] ?? 0) - 1) }))} style={{ ...S.qtyBtn, width: 28, height: 28, fontSize: 16 }}>−</button>
                                  <span style={{ ...S.qtyText, width: 28, fontSize: 14, textAlign: "center" as const }}>{qty}</span>
                                  <button onClick={() => setPorQtys(q => ({ ...q, [item.id]: (q[item.id] ?? 0) + 1 }))} style={{ ...S.qtyBtn, width: 28, height: 28, fontSize: 16 }}>+</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.45, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 6 }}>Контакт</div>
                <input
                  type="text"
                  placeholder="Имя"
                  value={porName}
                  onChange={(e) => setPorName(e.target.value)}
                  style={{ ...S.input, marginBottom: 8 }}
                />
                <input
                  type="tel"
                  placeholder="Телефон"
                  value={porPhone}
                  onChange={(e) => setPorPhone(e.target.value)}
                  style={S.input}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.45, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 6 }}>Когда нужно</div>
                <input
                  type="text"
                  placeholder="Например: 20 мая, к 18:00"
                  value={porDesiredTime}
                  onChange={(e) => setPorDesiredTime(e.target.value)}
                  style={S.input}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.45, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 6 }}>Комментарий</div>
                <textarea
                  placeholder="Дополнительные пожелания"
                  value={porComment}
                  onChange={(e) => setPorComment(e.target.value)}
                  rows={3}
                  style={{ ...S.input, resize: "none" as const, height: "auto" }}
                />
              </div>
              {preparedOnRequest.disclaimer && (
                <div style={{ fontSize: 12, opacity: 0.5, lineHeight: 1.5, marginBottom: 16, whiteSpace: "pre-line" as const }}>
                  {preparedOnRequest.disclaimer}
                </div>
              )}
              {(() => {
                const overlayCats2 = allCategories.filter(cat => itemsForCat(cat).length > 0);
                const porCanSubmit = !!porName.trim() && !!porPhone.trim() &&
                  (overlayCats2.length === 0 || overlayCats2.some(cat => itemsForCat(cat).some(it => (porQtys[it.id] ?? 0) > 0)));
                return (
              <button
                disabled={!porCanSubmit || porSending}
                onClick={async () => {
                  setPorSending(true);
                  try {
                    const overlayCats3 = allCategories.filter(cat => itemsForCat(cat).length > 0);
                    const selectedItems = overlayCats3.flatMap(cat =>
                      itemsForCat(cat)
                        .filter(it => (porQtys[it.id] ?? 0) > 0)
                        .map(it => ({ id: it.id, name: it.title ?? it.name, qty: porQtys[it.id] }))
                    );
                    const resp = await fetch(`${API_BASE}/api/prepared-requests`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: porName.trim(),
                        phone: porPhone.trim(),
                        comment: porComment.trim(),
                        desired_time: porDesiredTime.trim(),
                        items: selectedItems,
                        channel,
                        user_key: userKey,
                      }),
                    });
                    if (resp.ok) {
                      setPorResult({ ok: true, text: "Заявка отправлена. Мы свяжемся с вами в ближайшее время." });
                      setPorName(""); setPorPhone(""); setPorComment(""); setPorDesiredTime(""); setPorQtys({});
                    } else {
                      const err = await resp.json().catch(() => ({}));
                      setPorResult({ ok: false, text: err.detail || "Не удалось отправить заявку. Попробуйте ещё раз." });
                    }
                  } catch {
                    setPorResult({ ok: false, text: "Ошибка соединения. Проверьте интернет и попробуйте снова." });
                  } finally {
                    setPorSending(false);
                  }
                }}
                style={S.mainButton(!porCanSubmit || porSending)}
              >
                {porSending ? "Отправка..." : (preparedOnRequest.cta_text || "Отправить заявку")}
              </button>
                );
              })()}
            </>
          )}
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
                    <div style={S.cardPrice}>{entry.item.price}{currency} × {entry.qty} = {entry.item.price * entry.qty}{currency}</div>
                  </div>
                  <div style={S.qtyControls}>
                    <button style={S.qtyBtn} onClick={() => changeQty(entry.item.id, -1)}>−</button>
                    <span style={S.qtyText}>{entry.qty}</span>
                    <button style={S.qtyBtn} onClick={() => changeQty(entry.item.id, 1)}>+</button>
                  </div>
                </div>
              ))}

              {freeFrom > 0 && cartTotal < freeFrom && (
                <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 8 }}>
                  Бесплатная доставка от {freeFrom}{currency}
                </div>
              )}
              <div style={S.totalLine}><span>Итого</span><span>{cartTotal}{currency}</span></div>

              <div style={{ marginTop: 20 }}>
                <label style={S.label}>Телефон для связи</label>
                <input style={S.input} placeholder="Впишите сюда номер телефона" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />

                <label style={S.label}>Адрес доставки</label>
                <input style={S.input} placeholder="Впишите сюда адрес доставки" value={address} onChange={(e) => setAddress(e.target.value)} />

                <label style={S.label}>Комментарий</label>
                <input style={S.input} placeholder="Если есть, впишите комментарий к заказу" value={comment} onChange={(e) => setComment(e.target.value)} />

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
                    Заказы на сейчас принимаем с {String(workStart).padStart(2, "0")}:00. Выберите время доставки.
                  </div>
                )}

                {deliveryMode === "SCHEDULED" && (
  <>
  <input
    style={{
      ...S.input,
      background: "var(--tg-theme-bg-color, #ffffff)",
      border: "1.5px solid var(--tg-theme-secondary-bg-color, #dcdcdc)",
      minHeight: 56,
    }}
    type="time"
    value={deliveryTime}
    min={`${String(workStart).padStart(2, "0")}:00`}
    max={`${String(workEnd - 1).padStart(2, "0")}:59`}
    onChange={(e) => setDeliveryTime(e.target.value)}
  />

  {!deliveryTime && (
    <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12, lineHeight: 1.45 }}>
      Нажмите на поле, чтобы выбрать время
    </div>
  )}

  {deliveryTime && !isValidDeliveryTime(deliveryTime) && (
    <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12, lineHeight: 1.45 }}>
      Выберите время доставки с {String(workStart).padStart(2, "0")}:00 до {String(workEnd).padStart(2, "0")}:00.
    </div>
  )}

  {isWorkingHours &&
    deliveryTime &&
    isValidDeliveryTime(deliveryTime) &&
    !isFutureDeliveryTimeToday(deliveryTime) && (
      <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12, lineHeight: 1.45 }}>
        Это время уже прошло сегодня. Выберите более позднее время.
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

              {result && <div ref={resultRef} style={S.resultBox(result.ok)}>{result.text}</div>}

              <div style={{ ...S.bottomBar, position: "fixed" as const }} className="rp-bottom">
                <button
                  style={S.mainButton(
                    sending ||
                    address.trim().length < 4 ||
                    phone.trim().replace(/\D/g, "").length < 10 ||
                    cartEntries.length === 0 ||
                    (!isWorkingHours && deliveryMode === "ASAP") ||
                    (deliveryMode === "SCHEDULED" && !isScheduledTimeValid) ||
(isWorkingHours && deliveryMode === "SCHEDULED" && deliveryTime && !isScheduledTimeInFuture)
                  )}
                  disabled={
                    sending ||
                    address.trim().length < 4 ||
                    phone.trim().replace(/\D/g, "").length < 10 ||
                    cartEntries.length === 0 ||
                    (!isWorkingHours && deliveryMode === "ASAP") ||
                    (deliveryMode === "SCHEDULED" && !isScheduledTimeValid) ||
(isWorkingHours && deliveryMode === "SCHEDULED" && deliveryTime && !isScheduledTimeInFuture)
                  }
                  onClick={submitOrder}
                >
                  {sending ? "Проверяем..." : `Заказать — ${cartTotal}${currency}`}
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
