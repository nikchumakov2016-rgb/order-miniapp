import './index.css';
import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { createPortal } from "react-dom";

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
  wait_time?: string;
  portion_note?: string;
  old_price?: number | null;
  promo_enabled?: boolean;
  promo_label?: string;
  _orderMode?: "frozen" | "hot";
};
type ManualPromotion = {
  id: string;
  title: string;
  description?: string;
  note?: string;
  active: boolean;
};
type Category = {
  id: string;
  name: string;
  emoji: string;
  items: CatalogItem[];
};
type CatalogBanner = {
  enabled?: boolean;
  icon?: string;
  badge?: string;
  title?: string;
  button_text?: string;
  button_target?: string;
};
type CatalogTheme = {
  primary?: string;
  cta?: string;
  bg_page?: string;
  bg_surface?: string;
  bg_chip?: string;
  text_primary?: string;
  text_secondary?: string;
  border?: string;
  accent_announcement?: string;
};
type Catalog = {
  shop_name: string;
  shop_subtitle?: string;
  currency: string;
  work_start_hour?: number;
  work_end_hour?: number;
  free_delivery_from?: number;
  pickup_address?: string;
  pickup_enabled?: boolean;
  phone?: string;
  order_confirmation_text?: string;
  banner?: CatalogBanner;
  theme?: CatalogTheme;
  categories: Category[];
  hot_categories?: Category[];
};
type CartEntry = { item: CatalogItem; qty: number };
type DisplayItem = CatalogItem & { _srcCatId: string };
type WhereToBuyPoint = { city: string; name: string; address: string; schedule?: string; note?: string };
type WhereToBuyContent = { title: string; description: string; points: WhereToBuyPoint[] };

function tgVar(name: string, fallback: string): string {
  return `var(--tg-theme-${name}, ${fallback})`;
}

const DEFAULT_THEME = {
  primary:              "#8B2A1F",
  cta:                  "#3390ec",
  bg_page:              "#f5f0eb",
  bg_surface:           "#ffffff",
  bg_chip:              "#ede8e0",
  text_primary:         "#3a2e28",
  text_secondary:       "#8a7a6f",
  border:               "#e2ddd6",
  accent_announcement:  "#4a2f26",
} as const;

type ThemeKey = keyof typeof DEFAULT_THEME;
function themeVar(key: ThemeKey): string {
  return `var(--theme-${key.replace(/_/g, '-')}, ${DEFAULT_THEME[key]})`;
}

const S = {
  app: {
    fontFamily: `-apple-system, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    minHeight: "100vh",
    background: tgVar("bg-color", "#f7f5f2"),
    color: tgVar("text-color", "#1a1a1a"),
    paddingBottom: 100,
    marginTop: 0,
    paddingTop: 0,
  } as React.CSSProperties,
  header: {
    padding: "14px 16px 8px",
  } as React.CSSProperties,
  shopName: {
    fontFamily: `"Cormorant Garamond", Georgia, serif`,
    fontSize: 30,
    fontWeight: 700,
    color: themeVar("text_primary"),
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
    background: themeVar("cta"),
    color: "#ffffff",
    transition: "opacity .15s",
  } as React.CSSProperties,
  qtyText: { width: 40, textAlign: "center" as const, fontSize: 17, fontWeight: 600 } as React.CSSProperties,
  addBtn: {
    padding: "8px 18px", borderRadius: 20, border: "none", fontSize: 14, fontWeight: 600,
    cursor: "pointer", background: themeVar("cta"),
    color: "#ffffff", transition: "opacity .15s",
  } as React.CSSProperties,
  bottomBar: {
    position: "fixed" as const, bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
    left: 12, right: 12, zIndex: 200, padding: "12px 16px",
    background: tgVar("bg-color", "#ffffff"),
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    display: "flex", gap: 10,
  } as React.CSSProperties,
  mainButton: (disabled: boolean) =>
    ({
      flex: 1, padding: "14px 0", borderRadius: 12, border: "none", fontSize: 16, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer", background: themeVar("cta"),
      color: "#ffffff", opacity: disabled ? 0.5 : 1, transition: "opacity .2s",
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
  NEW:                  "Ожидает подтверждения",
  PENDING_CONFIRMATION: "Ожидает подтверждения",
  ACCEPTED:             "Принят",
  COOKING:              "Готовится",
  ONWAY:                "Выехал курьер",
  DONE:                 "Доставлен",
  REJECTED:             "Отклонён",
  NOT_FOUND:            "Заказ не найден",
};

// Самовывоз меняет формулировки финальных статусов: ONWAY → «Готов к выдаче», DONE → «Выдан».
function statusLabelFor(status: string, receiptMode: "DELIVERY" | "PICKUP"): string {
  if (receiptMode === "PICKUP") {
    if (status === "ONWAY") return "Готов к выдаче";
    if (status === "DONE") return "Выдан";
  }
  return STATUS_LABELS[status] ?? status;
}

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
  description: "Продукцию «Римских пельменей» можно найти в магазинах Саракташа, Саракташского района и в торговых точках Оренбурга. Ниже указаны точки в Оренбурге — наличие и ассортимент лучше уточнять заранее.",
  points: [
    { city: "Оренбург",      name: "Гармония",                  address: "ДНТ Лидиния, ул. Плодовая, 39" },
    { city: "Оренбург",      name: "Домашкино",                 address: "ул. Мясокомбинат, д. 1" },
    { city: "Оренбург",      name: "Фрэш Маркет",               address: "Северный проезд, 18/1" },
    { city: "Оренбург",      name: "Продуктовый отдел",         address: "ул. Орлова, д. 5" },
    { city: "Оренбург",      name: "Продукты 24",               address: "ул. Постникова, д. 20" },
    { city: "пос. Аэропорт", name: "Магазин у Дома",            address: "ул. Центральная, д. 4" },
    { city: "Оренбург",      name: "ТЦ «Мелодия», отдел Мясо", address: "ул. Туркестанская, 45" },
  ],
};

function bonusRubWord(n: number): string {
  const abs = Math.abs(n) % 100;
  const m = abs % 10;
  if (abs >= 11 && abs <= 19) return "бонусных рублей";
  if (m === 1) return "бонусный рубль";
  if (m >= 2 && m <= 4) return "бонусных рубля";
  return "бонусных рублей";
}

function normalizeCheckoutPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) {
    digits = `7${digits}`;
  } else if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8") && digits[1] === "9") {
    digits = `7${digits.slice(1)}`;
  }
  return digits.length === 11 && digits.startsWith("79") ? `+${digits}` : null;
}

const BONUS_LOOKUP_ERROR = "Не удалось подтвердить бонусы. Проверьте телефон и PIN или оформите заказ без бонусов.";

function App() {
  const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "";
  const BONUS_MIN_ORDER_TOTAL = 1500;
  const BONUS_EARN_PERCENT = 5;
  const BONUS_MAX_REDEEM_PERCENT = 50;
  const BONUS_PIN_LENGTH = 5;
  const [isTest, setIsTest] = useState(() => {
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
  const [showPromos, setShowPromos] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [whereToBuy, setWhereToBuy] = useState<WhereToBuyContent>(DEFAULT_WHERE_TO_BUY);
  const [promotions, setPromotions] = useState<ManualPromotion[]>([]);
  const loadPromotions = useCallback(() => {
    fetch(`${API_BASE}/api/content/promotions`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { items?: ManualPromotion[] } | null) => {
        if (data?.items) setPromotions(data.items.filter((p) => p.active));
      })
      .catch(() => {});
  }, [API_BASE]);
  const [forBusinessEnabled, setForBusinessEnabled] = useState<boolean | null>(null);
  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 128;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [showCart, setShowCart] = useState(false);
  const pendingRepeatRef = useRef(false);
  const [repeatNotice, setRepeatNotice] = useState<{ skipped: boolean; mixed: boolean } | null>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [receiptMode, setReceiptMode] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"ASAP" | "SCHEDULED">("ASAP");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [bonusCard, setBonusCard] = useState<{ available_balance: number } | null>(null);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [useBonusChecked, setUseBonusChecked] = useState(false);
  const [bonusPin, setBonusPin] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [verifiedBonusPhone, setVerifiedBonusPhone] = useState<string | null>(null);
  const bonusVerifyAbortRef = useRef<AbortController | null>(null);
  const bonusVerifySeqRef = useRef(0);
  const normalizedBonusPhone = useMemo(() => normalizeCheckoutPhone(phone), [phone]);
  const normalizedBonusPhoneRef = useRef<string | null>(normalizedBonusPhone);
  normalizedBonusPhoneRef.current = normalizedBonusPhone;
  const resultRef = useRef<HTMLDivElement>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem('banner_hot_dismissed') === '1'; } catch { return false; }
  });
  const [showSectionsMenu, setShowSectionsMenu] = useState(false);
  const [orderSent, setOrderSent] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('order')
  );
const [orderStatus, setOrderStatus] = useState<"NEW" | "PENDING_CONFIRMATION" | null>(null);
const [liveStatus, setLiveStatus] = useState<string | null>(null);
const [copied, setCopied] = useState<string | null>(null);
const [pinState, setPinState] = useState<"idle" | "loading" | "shown" | "already_set" | "unavailable">("idle");
const [pinValue, setPinValue] = useState<string | null>(null);
const [orderToken, setOrderToken] = useState<string | null>(
  () => new URLSearchParams(window.location.search).get('token')
);
const [orderBonusUsed, setOrderBonusUsed] = useState<boolean>(false);
const [orderBonusEarned, setOrderBonusEarned] = useState<number>(0);
const [orderTotalRub, setOrderTotalRub] = useState<number | null>(null);
const [orderBonusPinCanBeIssued, setOrderBonusPinCanBeIssued] = useState<boolean>(false);
const [orderBonusCustomerHasCard, setOrderBonusCustomerHasCard] = useState<boolean>(false);
const [orderBonusCardCreated, setOrderBonusCardCreated] = useState<boolean>(false);
const [orderBonusEarnReversedAt, setOrderBonusEarnReversedAt] = useState<string | null>(null);
// Способ получения и адрес пункта для статус-страницы (приходят из публичного status-ответа,
// чтобы прямой /order-status/{token} был самодостаточным без загрузки каталога).
const [orderReceiptMode, setOrderReceiptMode] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
const [orderPickupAddress, setOrderPickupAddress] = useState<string>("");
const [mode, setMode] = useState<"frozen" | "hot">("frozen");
const workStart = catalog?.work_start_hour ?? 10;
const workEnd = catalog?.work_end_hour ?? 22;
function switchMode(m: "frozen" | "hot") { setMode(m); setActiveCatId(null); window.scrollTo({ top: 0 }); }
const theme = { ...DEFAULT_THEME, ...catalog?.theme };
const currency = catalog?.currency ?? "₽";
const freeFrom = catalog?.free_delivery_from ?? 0;
const bizPhone = catalog?.phone ?? "";
const pickupEnabled = Boolean(catalog?.pickup_enabled && catalog?.pickup_address);
const pickupAddress = catalog?.pickup_address ?? "";
const isPickup = receiptMode === "PICKUP";

// Fallback как в Box: если самовывоз недоступен (выключен/нет адреса), не оставляем
// скрыто выбранный недоступный режим — принудительно возвращаем DELIVERY.
useEffect(() => {
  if (!pickupEnabled && receiptMode === "PICKUP") setReceiptMode("DELIVERY");
}, [pickupEnabled, receiptMode]);

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
    const _p = new URLSearchParams(window.location.search);
    if (_p.get('repeat_order') === '1') {
      pendingRepeatRef.current = true;
      _p.delete('repeat_order');
      const _qs = _p.toString();
      window.history.replaceState(null, '', window.location.pathname + (_qs ? '?' + _qs : ''));
    }
    if (new URLSearchParams(window.location.search).get('cart') === 'open') {
      setShowCart(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (new URLSearchParams(window.location.search).get('discounts') === '1') {
      scrollToDiscountsRef.current = true;
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (new URLSearchParams(window.location.search).get('where') === 'buy') {
      setShowWhereToBuy(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

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
      .then((data: Catalog) => { setCatalog(data); setLoading(false); })
      .catch((e) => { setError(`Не удалось загрузить каталог: ${e.message}`); setLoading(false); });
    fetch(`${API_BASE}/api/content/where-to-buy`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: WhereToBuyContent | null) => { if (data) setWhereToBuy(data); })
      .catch(() => {});
    fetch(`${API_BASE}/api/content/for-business`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { enabled?: boolean } | null) => { setForBusinessEnabled(data?.enabled ?? false); })
      .catch(() => { setForBusinessEnabled(false); });
    loadPromotions();
  }, [API_BASE, loadPromotions]);

  useEffect(() => {
    if (showPromos) loadPromotions();
  }, [showPromos, loadPromotions]);

  // repeat-order: restore cart from sessionStorage after catalog loads
  useEffect(() => {
    if (!catalog || !pendingRepeatRef.current) return;
    pendingRepeatRef.current = false;

    const raw = sessionStorage.getItem('repeat_order_items');
    sessionStorage.removeItem('repeat_order_items');
    if (!raw) return;

    let payload: { id: string; qty: number; item_order_mode?: string }[];
    try { payload = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(payload) || !payload.length) return;

    // flat index of all catalog items
    const itemMap = new Map<string, CatalogItem>();
    for (const cat of [...(catalog.categories ?? []), ...(catalog.hot_categories ?? [])]) {
      for (const item of cat.items) itemMap.set(item.id, { ...item, category: cat.name });
    }

    let skipped = 0;
    const patch: Record<string, CartEntry> = {};
    for (const entry of payload) {
      if (!entry.id || typeof entry.id !== 'string') { skipped++; continue; }
      const qty = Math.floor(Number(entry.qty));
      if (!qty || qty <= 0 || qty > 99) { skipped++; continue; }
      const catalogItem = itemMap.get(entry.id);
      if (!catalogItem || catalogItem.in_stock === false) { skipped++; continue; }
      const orderMode = (entry.item_order_mode === 'hot' || entry.item_order_mode === 'frozen')
        ? entry.item_order_mode : 'frozen';
      patch[entry.id] = { item: { ...catalogItem, _orderMode: orderMode }, qty };
    }

    if (!Object.keys(patch).length) {
      setRepeatNotice({ skipped: true, mixed: false });
      setShowCart(true);
      return;
    }

    // detect mode from added items
    const addedModes = new Set(Object.values(patch).map(e => e.item._orderMode ?? 'frozen'));
    const isMixed = addedModes.size > 1;
    if (!isMixed) {
      const detectedMode = [...addedModes][0] as 'frozen' | 'hot';
      setMode(detectedMode);
      setActiveCatId(null);
    }

    setCart(prev => ({ ...prev, ...patch }));
    setRepeatNotice({ skipped: skipped > 0, mixed: isMixed });
    setShowCart(true);
  }, [catalog]);

  useEffect(() => {
    if (!repeatNotice) return;
    const t = setTimeout(() => setRepeatNotice(null), 7000);
    return () => clearTimeout(t);
  }, [repeatNotice]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      fetch(`${API_BASE}/api/catalog`, { cache: 'no-store' }).then(r => r.json()).then((data: Catalog) => setCatalog(data)).catch(() => {});
      loadPromotions();
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
  }, [API_BASE, loadPromotions]);

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
    applyLocalContact();
  }, []);


  useEffect(() => {
    if (!orderSent && !orderToken) return;
    let intervalId: ReturnType<typeof setInterval>;
    const poll = () => {
      const url = orderToken
        ? `${API_BASE}/api/order-status/${orderToken}`
        : `${API_BASE}/api/orders/${orderSent}`;
      fetch(url)
        .then(r => { if (!r.ok) throw r.status; return r.json(); })
        .then(data => {
          if (!data?.status) return;
          setLiveStatus(data.status);
          // Прямая token-ссылка в новой вкладке: статус-экран рендерится по orderSent.
          // Публичный ответ содержит id — выставляем orderSent, если он ещё пуст,
          // чтобы сохранённая ?token-ссылка открывала статус (а не меню).
          if (data.id) setOrderSent(prev => prev || data.id);
          // legacy endpoint returns public_status_token — upgrade URL to ?token
          if (data.public_status_token && !orderToken) {
            setOrderToken(data.public_status_token);
            const _u = new URL(window.location.href);
            _u.searchParams.delete('order');
            _u.searchParams.set('token', data.public_status_token);
            window.history.replaceState(null, '', _u.toString());
          }
          setOrderBonusUsed(Boolean(data.bonus_used));
          setOrderBonusEarned(data.bonus_earned ?? 0);
          setOrderTotalRub(data.total_rub ?? null);
          setOrderBonusPinCanBeIssued(Boolean(data.bonus_pin_can_be_issued));
          setOrderBonusCustomerHasCard(Boolean(data.bonus_customer_has_card));
          setOrderBonusCardCreated(Boolean(data.bonus_card_created));
          setOrderBonusEarnReversedAt(data.bonus_earn_reversed_at ?? null);
          setOrderReceiptMode(data.receipt_mode === "PICKUP" ? "PICKUP" : "DELIVERY");
          setOrderPickupAddress(data.pickup_address ?? "");
        })
        .catch(err => {
          if (err === 404) { setLiveStatus('NOT_FOUND'); clearInterval(intervalId); }
        });
    };
    poll();
    intervalId = setInterval(poll, 12000);
    return () => clearInterval(intervalId);
  }, [orderSent, orderToken, API_BASE]);

  useEffect(() => {
    if (result && !result.ok) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result]);

  useEffect(() => {
    setResult(prev => (prev && !prev.ok ? null : prev));
  }, [cart]);


  useEffect(() => {
    if (!showAllCategories) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowAllCategories(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showAllCategories]);

  const addToCart = useCallback((item: CatalogItem) => {
    fetch(`${API_BASE}/api/track/cart_add?tg_user_id=${tgUserId || 0}${testQ}&channel=${channel}&user_key=${encodeURIComponent(userKey)}`, { method: "POST" }).catch(() => {});
    setCart((prev) => {
      const existing = prev[item.id];
      return { ...prev, [item.id]: { item, qty: existing ? existing.qty + 1 : 1 } };
    });
  }, [API_BASE]);

  const addHotToCart = (item: CatalogItem) => {
    fetch(`${API_BASE}/api/track/cart_add?tg_user_id=${tgUserId || 0}${testQ}&channel=${channel}&user_key=${encodeURIComponent(userKey)}`, { method: "POST" }).catch(() => {});
    setCart((prev) => {
      const existing = prev[item.id];
      return { ...prev, [item.id]: { item, qty: existing ? Math.max(existing.qty, 3) : 3 } };
    });
  };

  const changeQty = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const entry = prev[id];
      if (!entry) return prev;
      if (entry.item._orderMode === "hot") {
        if (delta > 0) {
          const newQty = Math.max(entry.qty, 3) + delta;
          return { ...prev, [id]: { ...entry, qty: newQty } };
        } else {
          if (entry.qty <= 3) { const copy = { ...prev }; delete copy[id]; return copy; }
          return { ...prev, [id]: { ...entry, qty: entry.qty - 1 } };
        }
      }
      const newQty = entry.qty + delta;
      if (newQty <= 0) { const copy = { ...prev }; delete copy[id]; return copy; }
      return { ...prev, [id]: { ...entry, qty: newQty } };
    });
  }, []);

  const cartEntries = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(() => cartEntries.reduce((s, e) => s + e.qty, 0), [cartEntries]);
  const cartTotal = useMemo(() => cartEntries.reduce((s, e) => s + e.item.price * e.qty, 0), [cartEntries]);
  const bonusVerified = Boolean(bonusCard && verifiedBonusPhone && verifiedBonusPhone === normalizedBonusPhone);
  const maxBonus = (bonusVerified && bonusCard && bonusCard.available_balance > 0)
    ? Math.min(bonusCard.available_balance, Math.floor(cartTotal * BONUS_MAX_REDEEM_PERCENT / 100))
    : 0;
  const pinReady = bonusPin.length === BONUS_PIN_LENGTH;
  const requestedBonusAmount = Math.max(0, Math.floor(Number(bonusAmount) || 0));
  const bonusUse = (useBonusChecked && bonusVerified && pinReady && maxBonus > 0)
    ? Math.min(requestedBonusAmount, maxBonus)
    : 0;
  const totalAfterBonus = cartTotal - bonusUse;
  const itemsWord = (n: number) => n % 10 === 1 && n % 100 !== 11 ? "товар" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "товара" : "товаров";
  const freeProgress = freeFrom > 0 ? Math.min(cartTotal / freeFrom, 1) : 0;
  const scrollToDiscountsRef = useRef(false);
  const discountItems = useMemo(() => {
    if (!catalog) return [];
    const src = mode === "hot" ? (catalog.hot_categories ?? []) : (catalog.categories ?? []);
    return src.flatMap(c => c.items.filter(item => {
      const p = Number(item.price), op = Number(item.old_price);
      return item.promo_enabled === true ||
        (item.old_price != null && Number.isFinite(op) && Number.isFinite(p) && op > p);
    }).map(item => ({ ...item, catName: c.name, catId: c.id })));
  }, [catalog, mode]);
  useEffect(() => {
    if (scrollToDiscountsRef.current && discountItems.length > 0) {
      scrollToDiscountsRef.current = false;
      setTimeout(() => scrollToSection(`section-${mode}-discounts`), 150);
    }
  }, [discountItems]);
  const isCompactCart = typeof window !== "undefined" && window.innerWidth <= 480;
  const hotMinNotMet = cartEntries.some(e => e.item._orderMode === "hot" && e.qty < 3);
  const hasHotCategories = (catalog?.hot_categories?.length ?? 0) > 0;

  const visibleDisplayCategories = useMemo(() => {
    if (!catalog) return [];
    const src = mode === "hot" ? (catalog.hot_categories ?? []) : (catalog.categories ?? []);
    return src.flatMap(cat => {
      const items: DisplayItem[] = cat.items.map(it => ({ ...it, _srcCatId: cat.id }));
      if (items.length === 0) return [];
      return [{ key: cat.id, label: cat.name, emoji: cat.emoji, items }];
    });
  }, [catalog, mode]);

  // Санитайзер активной категории: если выбранная категория исчезла из текущего
  // режима (смена frozen/hot, удаление или reorder в админке) — сбрасываем подсветку,
  // чтобы scroll-spy и чипы не ссылались на несуществующий якорь.
  useEffect(() => {
    if (activeCatId && activeCatId !== "discounts" &&
        !visibleDisplayCategories.some(dc => dc.key === activeCatId)) {
      setActiveCatId(null);
    }
  }, [visibleDisplayCategories, activeCatId]);

  const scrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollingRef.current) return;
      const anchorY = window.scrollY + 140;
      let activeKey: string | null = null;
      for (const dc of visibleDisplayCategories) {
        const el = document.getElementById(`section-${mode}-${dc.key}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        const bottom = top + el.offsetHeight;
        if (top <= anchorY && bottom > anchorY) { activeKey = dc.key; break; }
      }
      setActiveCatId(activeKey);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mode, visibleDisplayCategories]);

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

  const clearBonusAuthorization = useCallback((disableOptIn = true) => {
    bonusVerifySeqRef.current += 1;
    bonusVerifyAbortRef.current?.abort();
    bonusVerifyAbortRef.current = null;
    setBonusLoading(false);
    setBonusCard(null);
    setVerifiedBonusPhone(null);
    setBonusPin("");
    setBonusAmount("");
    if (disableOptIn) setUseBonusChecked(false);
  }, []);

  useLayoutEffect(() => {
    clearBonusAuthorization(true);
    setBonusError(null);
    setResult(prev => (prev && !prev.ok ? null : prev));
  }, [normalizedBonusPhone, clearBonusAuthorization]);

  useEffect(() => () => {
    bonusVerifySeqRef.current += 1;
    bonusVerifyAbortRef.current?.abort();
    bonusVerifyAbortRef.current = null;
  }, []);

  useEffect(() => {
    if (!bonusCard) return;
    setBonusAmount(prev => String(Math.min(Math.max(0, Math.floor(Number(prev) || 0)), maxBonus)));
  }, [maxBonus, bonusCard]);

  async function verifyBonusCard() {
    if (!normalizedBonusPhone || !pinReady || bonusLoading || bonusVerifyAbortRef.current) return;

    const requestPhone = normalizedBonusPhone;
    const requestId = bonusVerifySeqRef.current + 1;
    bonusVerifySeqRef.current = requestId;
    const controller = new AbortController();
    bonusVerifyAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    setBonusLoading(true);
    setBonusError(null);
    setBonusCard(null);
    setVerifiedBonusPhone(null);
    setBonusAmount("");

    try {
      const response = await fetch(`${API_BASE}/api/bonus-card/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: requestPhone, pin: bonusPin }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      const availableBalance = Number(data?.card?.available_balance);
      if (!response.ok || data?.ok !== true || !Number.isFinite(availableBalance) || availableBalance < 0) {
        throw new Error("invalid bonus response");
      }
      if (bonusVerifySeqRef.current !== requestId || normalizedBonusPhoneRef.current !== requestPhone) return;

      const safeBalance = Math.floor(availableBalance);
      const initialAmount = Math.min(safeBalance, Math.floor(cartTotal * BONUS_MAX_REDEEM_PERCENT / 100));
      setBonusCard({ available_balance: safeBalance });
      setVerifiedBonusPhone(requestPhone);
      setBonusAmount(String(initialAmount));
    } catch {
      if (bonusVerifySeqRef.current !== requestId || normalizedBonusPhoneRef.current !== requestPhone) return;
      clearBonusAuthorization(true);
      setBonusError(BONUS_LOOKUP_ERROR);
    } finally {
      window.clearTimeout(timeoutId);
      if (bonusVerifySeqRef.current === requestId) {
        bonusVerifyAbortRef.current = null;
        setBonusLoading(false);
      }
    }
  }

  async function fetchPin() {
    if (!orderToken) return;
    setPinState("loading");
    try {
      const r = await fetch(
        `${API_BASE}/api/bonus-card/pin/issue?public_status_token=${encodeURIComponent(orderToken)}`,
        { method: "POST" }
      );
      if (r.status === 404) { setPinState("unavailable"); return; }
      const data = await r.json().catch(() => null);
      if (!r.ok || !data) { setPinState("unavailable"); return; }
      if (data.pin_issued && data.pin) {
        setPinValue(data.pin);
        setPinState("shown");
      } else if (!data.pin_issued && data.already_set) {
        setPinState("already_set");
      } else {
        setPinState("unavailable");
      }
    } catch {
      setPinState("unavailable");
    }
  }

  async function submitOrder() {
    // Имя обязательно всегда; адрес обязателен только для доставки.
    if (cartEntries.length === 0) return;
    if (!customerName.trim()) return;
    // Скрыто выбранный недоступный самовывоз отправить нельзя (защита независимо от fallback-эффекта).
    if (isPickup && !pickupEnabled) return;
    if (!isPickup && !address.trim()) return;
    // Согласие на обработку ПД обязательно (паритет с backend-guard).
    if (!privacyConsent) return;
    setSending(true);
    setResult(null);

    const normalizedPhone = phone.trim().replace(/^8(\d{10})$/, "+7$1").replace(/^9(\d{9})$/, "+79$1");
    const attemptedBonusUse = bonusUse;
    const payload = {
      customer_name: customerName.trim(),
      receipt_mode: receiptMode,
      // PICKUP: адрес доставки не отправляем (backend всё равно обнулит).
      address: isPickup ? "" : address.trim(),
      phone: normalizedPhone,
      comment: comment.trim() || undefined,
      total_rub: cartTotal,
      delivery_mode: deliveryMode,
      scheduled_for: deliveryMode === "SCHEDULED" && deliveryTime ? deliveryTime : null,
      privacy_consent: privacyConsent,
      order_mode: (() => { const h = cartEntries.some(e => e.item._orderMode === "hot"); const f = cartEntries.some(e => e.item._orderMode !== "hot"); return h && f ? "mixed" : h ? "hot" : "frozen"; })(),
      items: cartEntries.map((e) => ({
        id: e.item.id,
        name: e.item.category ? `${e.item.category}: ${e.item.name}` : e.item.name,
        qty: e.qty,
        price_rub: e.item.price,
        unit: e.item.unit,
        item_order_mode: e.item._orderMode ?? "frozen",
      })),
      bonus_use: bonusUse,
      bonus_pin: bonusUse > 0 ? bonusPin : undefined,
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
        const detail = data?.detail || `Ошибка: ${JSON.stringify(data)}`;
        if (attemptedBonusUse > 0) {
          clearBonusAuthorization(true);
          setBonusError(null);
          setResult({
            ok: false,
            text: `${detail}. Бонусы отключены; проверьте итог без списания и повторите заказ.`,
          });
        } else {
          setResult({ ok: false, text: detail });
        }
      } else {
        const oid = data.order_id ?? "—";
const status = (data.status ?? "NEW") as "NEW" | "PENDING_CONFIRMATION";
const tok = data.public_status_token ?? null;
setOrderSent(oid);
setOrderStatus(status);
setLiveStatus(status);
setOrderToken(tok);
const _u = new URL(window.location.href);
if (tok) {
  _u.searchParams.delete('order');
  _u.searchParams.set('token', tok);
} else {
  _u.searchParams.set('order', oid);
}
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
        clearBonusAuthorization(true);
        setBonusError(null);
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
        paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
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
          Статус: {statusLabelFor(liveStatus, orderReceiptMode)}
        </div>
      )}
      {orderReceiptMode === "PICKUP" && orderPickupAddress && liveStatus !== "NOT_FOUND" && (
        <div style={{ fontSize: 14, marginBottom: 8 }}>
          🏠 Самовывоз: <strong>{orderPickupAddress}</strong>
        </div>
      )}
      {(() => {
        if (!liveStatus) return null;
        if (liveStatus === "REJECTED") {
          if (!orderBonusEarnReversedAt) return null;
          const msg = orderBonusCardCreated
            ? "Заказ отменён. Начисленные бонусные рубли отменены, бонусная карта, созданная по этому заказу, аннулирована."
            : "Заказ отменён. Начисленные бонусные рубли за этот заказ отменены.";
          return <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>{msg}</div>;
        }
        // A: bonus was used (redemption)
        if (orderBonusUsed) {
          const msg = liveStatus === "DONE"
            ? "Бонусные рубли списаны. Новые бонусные рубли за этот заказ не начисляются."
            : "Бонусные рубли зарезервированы. Новые бонусные рубли за этот заказ не начисляются.";
          return (
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 12 }}>{msg}</div>
          );
        }
        // B: before DONE — accrual forecast
        if (liveStatus !== "DONE") {
          const base = orderTotalRub ?? 0;
          if (base < BONUS_MIN_ORDER_TOTAL && !orderBonusCustomerHasCard) return null;
          const willEarn = Math.floor(base * BONUS_EARN_PERCENT / 100);
          return (
            <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>
              🎁 {orderBonusCustomerHasCard
                ? <>После доставки будет начислено: <strong>{willEarn}</strong> {bonusRubWord(willEarn)}.</>
                : <>После доставки будет создана бонусная карта и начислено: <strong>{willEarn}</strong> {bonusRubWord(willEarn)}.</>
              }
            </div>
          );
        }
        // C: DONE, no redemption
        const earnedMsg = orderBonusEarned > 0 ? (
          <div style={{ textAlign: "center", width: "100%", lineHeight: 1.4 }}>
            🎁 За этот заказ начислено:{" "}
            <strong>{orderBonusEarned}</strong>{" "}
            {bonusRubWord(orderBonusEarned)}.
          </div>
        ) : null;
        const pinBlock = (orderBonusPinCanBeIssued || pinState === "shown") ? (
          <>
            {pinState === "idle" && (
              <button style={{ ...S.mainButton(false), fontSize: 13, padding: "8px 18px", flex: "none" as any }} onClick={fetchPin}>
                Получить код карты
              </button>
            )}
            {pinState === "loading" && (
              <div style={{ opacity: 0.5 }}>Запрашиваем...</div>
            )}
            {pinState === "shown" && pinValue && (
              <div>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Ваш PIN-код (сохраните):</div>
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  width: "fit-content",
                  maxWidth: "100%",
                  margin: "0 auto",
                  background: "#fdf6ec",
                  border: "1px solid #ecd9b8",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: 6,
                  fontVariantNumeric: "tabular-nums",
                  color: "#3a2e28",
                }}>{pinValue}</div>
                <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.45, maxWidth: 280, margin: "8px auto 0" }}>ⓘ Для раздела «Мои бонусы» и списания бонусных рублей.</div>
              </div>
            )}
            {pinState === "already_set" && (
              <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
                PIN-код уже был выдан ранее. Если потеряли — обратитесь к оператору.
              </div>
            )}
            {pinState === "unavailable" && (
              <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.5 }}>
                Не удалось получить код карты. Попробуйте позже или обратитесь к оператору.
              </div>
            )}
          </>
        ) : (orderBonusCardCreated && orderBonusEarned > 0) ? (
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            Код бонусной карты уже выдан. Его можно уточнить у продавца.
          </div>
        ) : null;
        if (!earnedMsg && !pinBlock) return null;
        return (
          <div style={{
            padding: "18px 20px",
            background: "#fff",
            borderRadius: 14,
            fontSize: 14,
            boxSizing: "border-box",
            width: "min(100%, 400px)",
            maxWidth: "calc(100vw - 32px)",
            margin: "0 auto 16px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}>
            {earnedMsg}
            {earnedMsg && pinBlock && (
              <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "12px 0" }} />
            )}
            {pinBlock}
          </div>
        );
      })()}
      {bizPhone && (
        <div style={{ fontSize: 14, opacity: 0.5, marginBottom: 24 }}>
          Вопросы по заказу: {bizPhone}
        </div>
      )}

      {(isNightRequest || liveStatus === "NEW") && (
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
            : "Заказ отправлен. Мы скоро перезвоним, чтобы уточнить детали."}
        </div>
      )}

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
          setPinState("idle");
          setPinValue(null);
          setOrderToken(null);
          setOrderBonusUsed(false);
          setOrderBonusEarned(0);
          setOrderTotalRub(null);
          setOrderBonusPinCanBeIssued(false);
          setOrderBonusCardCreated(false);
          setOrderBonusEarnReversedAt(null);
          applyLocalContact();
          const _u = new URL(window.location.href);
          _u.searchParams.delete('order');
          _u.searchParams.delete('token');
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
        :root {
          --theme-primary: ${theme.primary};
          --theme-cta: ${theme.cta};
          --theme-bg-page: ${theme.bg_page};
          --theme-bg-surface: ${theme.bg_surface};
          --theme-bg-chip: ${theme.bg_chip};
          --theme-text-primary: ${theme.text_primary};
          --theme-text-secondary: ${theme.text_secondary};
          --theme-border: ${theme.border};
          --theme-accent-announcement: ${theme.accent_announcement};
        }
        .rp-app { max-width: 100%; }
        @media (min-width: 640px)  { .rp-app { max-width: 760px;  margin: 0 auto; } }
        @media (min-width: 900px)  { .rp-app { max-width: 980px;  } }
        @media (min-width: 1280px) { .rp-app { max-width: 1100px; } }
        .rp-hdr-wrap { position: sticky; top: 0; z-index: 100; background: var(--tg-theme-bg-color, #f7f5f2); border-bottom: 1px solid var(--theme-border, #e2ddd6); }
        @media (max-width: 899px) { .rp-hdr-wrap { position: static; display: contents; border-bottom: none; } }
        .rp-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .rp-hdr-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        @media (max-width: 899px) { .rp-hdr { flex-direction: column; gap: 10px; align-items: center; } }
        @media (max-width: 899px) { .rp-hdr-right { width: 100%; align-items: flex-start; } }
        @media (max-width: 899px) { .rp-subtitle { margin-top: 2px; line-height: 1.15; } }
        .rp-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 16px 10px; }
        @media (max-width: 767px) { .rp-chips { flex-wrap: nowrap; } }
        .rp-chip { display: inline-flex; align-items: center; height: 42px; padding: 0 12px; border-radius: 12px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; white-space: nowrap; flex-shrink: 0; transition: background .15s, color .15s; }
        @media (max-width: 767px) { .rp-chip { height: 40px; padding: 0 10px; font-size: 13px; } }
        @media (max-width: 767px) { .rp-chip-hidden-mobile { display: none !important; } }
        .rp-chip-all { display: none !important; }
        @media (max-width: 767px) { .rp-chip-all { display: inline-flex !important; } }
        .rp-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        @media (min-width: 480px)  { .rp-grid { gap: 12px; } }
        @media (min-width: 768px)  { .rp-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; } }
        @media (min-width: 1024px) { .rp-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        .rp-logo { width: 44px; height: 44px; }
        @media (min-width: 768px) { .rp-logo { width: 80px; height: 80px; } }
        .rp-subtitle { font-size: 12px; color: var(--theme-text-primary, #3a2e28); opacity: 0.6; margin-top: 4px; line-height: 1.3; }
        @media (min-width: 768px) { .rp-subtitle { font-size: 14px; } }
        .rp-shopname { font-size: 23px; }
        @media (min-width: 768px) { .rp-shopname { font-size: 30px; } }
        .rp-hdr-btns { width: 100%; display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .rp-hdr-btn { display: flex; align-items: center; justify-content: center; height: 42px; padding: 0 12px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; white-space: nowrap; text-decoration: none; }
        @media (min-width: 900px) { .rp-hdr-btn { height: 36px; font-size: 13px; padding: 0 14px; border-radius: 20px; border: 1px solid var(--theme-border, #e2ddd6); background: var(--tg-theme-bg-color, #fff); color: var(--theme-text-primary, #3a2e28); } }
        @media (min-width: 900px) { .rp-hdr-right { flex-direction: row; align-items: center; gap: 28px; } }
        @media (min-width: 900px) { .rp-secondary-nav { padding-top: 0; flex-wrap: nowrap; } }
        @media (min-width: 900px) { .rp-hdr-btns { flex-wrap: nowrap; width: auto; } }
        @media (min-width: 900px) { .rp-desktop-only { display: inline-block !important; } }
        .rp-secondary-nav { display: flex; gap: 14px; flex-wrap: wrap; justify-content: flex-end; padding-top: 4px; }
        .rp-secondary-nav button, .rp-secondary-nav a { background: none; border: none; border-bottom: 1.5px solid transparent; cursor: pointer; font-size: 14px; font-weight: 600; font-family: inherit; padding: 0 0 2px; color: var(--theme-text-primary, #3a2e28); text-decoration: none; transition: border-color .15s; white-space: nowrap; }
        .rp-secondary-nav button:hover, .rp-secondary-nav a:hover { border-bottom-color: var(--theme-primary, #8B2A1F); }
        .rp-desktop-only { display: none !important; }
        @media (min-width: 768px) { .rp-desktop-only { display: inline !important; } }
        .rp-mode-switch { display: flex; padding: 8px 16px 2px; }
        .rp-mode-btn { padding: 7px 18px; border: 1px solid var(--theme-border, #e2ddd6); background: none; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--theme-text-secondary, #8a7a6f); transition: background .15s, color .15s; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
        .rp-mode-btn:first-child { border-radius: 8px 0 0 8px; }
        .rp-mode-btn:last-child { border-radius: 0 8px 8px 0; margin-left: -1px; }
        .rp-mode-btn.rp-mode-active { background: var(--theme-primary, #8B2A1F); color: #fff; border-color: var(--theme-primary, #8B2A1F); z-index: 1; position: relative; }
        /* ── desktop: header row alignment ── */
        @media (min-width: 900px) { .rp-hdr { align-items: center; } }
        @media (min-width: 900px) { .rp-shopname { white-space: nowrap; } .rp-subtitle { white-space: nowrap; } }
        @media (min-width: 900px) { .rp-hdr { gap: 8px; } .rp-secondary-nav { gap: 12px; } .rp-hdr-right { gap: 14px; } .rp-hdr-btn { padding: 0 9px; } }
        .rp-nav-new { position: relative; padding-right: 0; }
        .rp-nav-new::after { content: 'новое'; position: absolute; right: 0; top: -13px; background: #FF3B30; color: #fff; font-size: 8px; font-weight: 800; border-radius: 999px; padding: 1px 5px; line-height: 1.35; pointer-events: none; white-space: nowrap; }
        @media (max-width: 899px) { .rp-nav-new::after { display: none; } }
        /* ── mode-switch + chips в одну строку на desktop ── */
        .rp-mode-cats { display: flex; flex-direction: column; }
        @media (max-width: 899px) { .rp-mode-cats { position: sticky; top: 0; z-index: 100; background: var(--tg-theme-bg-color, #f7f5f2); border-bottom: 1px solid var(--theme-border, #e2ddd6); margin-top: -6px; padding-top: 6px; box-sizing: border-box; } }
        @media (min-width: 900px) {
          .rp-mode-cats { flex-direction: row; align-items: center; padding: 6px 16px; gap: 8px; border-top: 1px solid var(--theme-border,#e2ddd6); margin-top: 2px; }
          .rp-mode-cats .rp-mode-switch { padding: 0; flex-shrink: 0; padding-right: 14px; border-right: 1px solid var(--theme-border,#e2ddd6); margin-right: 4px; }
          .rp-mode-cats .rp-mode-btn { padding: 12px 24px; font-size: 15px; }
          .rp-mode-cats .rp-chips { padding: 0; flex: 1; min-width: 0; }
          .rp-mode-cats .rp-chip { height: 34px; font-size: 13px; }
        }
        /* ── advantages strip — только desktop ── */
        @media (max-width: 767px) { .rp-adv-strip { display: none; } }
        .rp-adv-strip { display: flex; flex-wrap: wrap; gap: 4px 18px; padding: 6px 16px 10px; }
        .rp-adv-item { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: var(--theme-text-secondary,#8a7a6f); white-space: nowrap; }
        /* ── popular section title ── */
        .rp-pop-title { font-size: 17px; font-weight: 700; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px solid var(--theme-border,#e2ddd6); letter-spacing: 0; }
        @media (min-width: 768px) { .rp-pop-title { font-size: 20px; } }
        /* ── add button: blue fill на desktop ── */
        @media (min-width: 900px) { .rp-add-btn { background: #3390ec !important; color: #fff !important; border: none !important; } }
        /* ── promo discount section ── */
        .rp-promo-section-title { font-size: 20px; font-weight: 700; color: var(--theme-text-primary,#3a2e28); margin-top: 22px; margin-bottom: 14px; }
        .rp-promo-mode-header { margin-bottom: 10px; }
        .rp-promo-mode-title { font-size: 16px; font-weight: 700; color: var(--theme-text-primary,#3a2e28); }
        .rp-promo-item-card { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,.55); border: 1px solid rgba(139,42,31,.11); border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; }
        /* ── promo banner ── */
        .rp-promo-banner { margin: 0 -16px 18px; width: calc(100% + 32px); }
        .rp-promo-banner img { display: block; width: 100%; height: auto; border-radius: 0; }
        /* ── B2B block — mobile only ── */
        .rp-b2b-wrap { display: none; }
        @media (max-width: 899px) {
          .rp-b2b-wrap { display: block; margin: 12px 16px 8px; }
          .rp-b2b-inner { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 14px; border-radius: 18px; background: linear-gradient(135deg,#fdf6ef 0%,#f5ede2 100%); border: 1px solid rgba(139,42,31,.15); text-decoration: none; color: inherit; }
          .rp-b2b-body { flex: 1; min-width: 0; }
          .rp-b2b-title { font-size: 16px; font-weight: 700; line-height: 1.2; margin-bottom: 6px; color: var(--theme-text-primary,#3a2e28); }
          .rp-b2b-sub { font-size: 13px; opacity: .7; line-height: 1.4; margin-bottom: 0; }
          .rp-b2b-cta { align-self: flex-start; padding: 10px 16px; border-radius: 999px; background: rgba(139,42,31,.08); color: var(--theme-primary,#8B2A1F); border: 1px solid rgba(139,42,31,.2); font-size: 14px; font-weight: 700; white-space: nowrap; }
          /* ── trust reviews block ── */
          .rp-trust-inner { display: flex; flex-direction: column; gap: 7px; padding: 12px 14px; border-radius: 16px; background: linear-gradient(135deg,#fdf6ef 0%,#f5ede2 100%); border: 1px solid rgba(139,42,31,.15); }
          .rp-trust-title { font-size: 15px; font-weight: 700; color: var(--theme-text-primary,#3a2e28); }
          .rp-trust-quote { font-size: 13px; line-height: 1.4; color: var(--theme-text-primary,#3a2e28); }
          .rp-trust-stars { color: #FFB800; }
          .rp-trust-author { font-style: italic; opacity: .6; margin-left: 4px; }
          .rp-trust-link { align-self: flex-start; font-size: 13px; font-weight: 700; color: var(--theme-primary,#8B2A1F); text-decoration: none; margin-top: 2px; }
        }
        /* ── mobile header layout ── */
        @media (max-width: 899px) { .rp-secondary-nav { display: none; } }
        .rp-sections-trigger { display: none !important; }
        @media (max-width: 899px) { .rp-sections-trigger { display: flex !important; } }
        @media (max-width: 899px) { .rp-hdr-btn-wheretobuy { display: none !important; } }
        @media (max-width: 899px) { .rp-hdr-btns { flex-wrap: nowrap; width: 100%; gap: 8px; } .rp-hdr-btns .rp-hdr-btn { flex: 1; display: flex; align-items: center; justify-content: center; height: 42px; min-width: 0; padding: 0 6px; border-radius: 8px; font-size: 12px; font-weight: 500; font-family: inherit; line-height: 1; white-space: nowrap; box-sizing: border-box; -webkit-appearance: none; appearance: none; text-decoration: none; background: var(--theme-bg-chip, #ede8e0) !important; color: var(--theme-text-primary, #3a2e28) !important; border: 1px solid var(--theme-border, #e2ddd6) !important; } }
        .rp-hdr-right { position: relative; }
        .rp-sections-menu { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--tg-theme-bg-color, #fff); border: 1px solid var(--theme-border,#e2ddd6); border-radius: 12px; z-index: 200; box-shadow: 0 4px 20px rgba(0,0,0,.12); overflow: hidden; }
        .rp-sections-menu button, .rp-sections-menu a { display: flex; align-items: center; width: 100%; padding: 13px 16px; background: none; border: none; border-bottom: 1px solid var(--theme-border,#e2ddd6); cursor: pointer; font-size: 15px; font-weight: 500; color: var(--theme-text-primary,#3a2e28); font-family: inherit; text-decoration: none; gap: 10px; box-sizing: border-box; }
        .rp-sections-menu button:last-child, .rp-sections-menu a:last-child { border-bottom: none; }
        @media (max-width: 899px) { .rp-mode-switch { width: 100%; box-sizing: border-box; overflow: hidden; padding-top: 2px; } .rp-mode-btn { flex: 1; min-width: 0; justify-content: center; padding: 8px 4px; line-height: 1; } }
        .rp-mode-btn-frozen.rp-mode-active { background: #607b9b; border-color: #607b9b; color: #fff; }
        @media (max-width: 899px) { .rp-mode-cats .rp-chips { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 4px 16px 10px; margin-top: 4px; } }
        @media (max-width: 899px) { .rp-mode-cats .rp-chips .rp-chip { width: 100%; min-width: 0; justify-content: center; padding: 0 8px; box-sizing: border-box; height: 40px; flex-shrink: unset; overflow: hidden; } }
        @media (max-width: 899px) { .rp-mode-cats .rp-chips .rp-chip-all { display: flex !important; } }
        @media (max-width: 899px) { #section-popular { padding-top: 10px !important; } }
        @media (max-width: 899px) { #section-popular .rp-pop-title { border-bottom: none; padding-bottom: 0; margin-bottom: 10px; } }
      `}</style>
      {isTest && <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#ff3b30',color:'#fff',fontSize:11,fontWeight:700,textAlign:'center' as const,padding:'3px 0',letterSpacing:'1px',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        ТЕСТОВЫЙ РЕЖИМ
        <button onClick={() => { sessionStorage.removeItem('is_test'); setIsTest(false); }} style={{background:'none',border:'1px solid rgba(255,255,255,0.5)',color:'#fff',borderRadius:4,padding:'1px 7px',cursor:'pointer',fontSize:10,fontWeight:400,letterSpacing:0}}>Выйти</button>
      </div>}
      {repeatNotice && (
        <div style={{position:'fixed',top:isTest?28:0,left:0,right:0,zIndex:9998,background:'#1a6e30',color:'#fff',fontSize:12,fontWeight:600,padding:'6px 16px',display:'flex',alignItems:'center',gap:8}}>
          <span style={{flex:1}}>
            {'Товары из прошлого заказа добавлены в корзину. Проверьте состав перед оформлением.'}
            {repeatNotice.skipped && ' Часть товаров сейчас недоступна и не была добавлена.'}
            {repeatNotice.mixed && ' В корзине — товары из разных режимов меню. Внимательно проверьте состав.'}
          </span>
          <button onClick={() => setRepeatNotice(null)} style={{background:'none',border:'1px solid rgba(255,255,255,.5)',color:'#fff',borderRadius:4,padding:'1px 7px',cursor:'pointer',fontSize:11,flexShrink:0}}>×</button>
        </div>
      )}
      {freeFrom > 0 && (
        <div style={{
          background: theme.accent_announcement, color: "#f5e9d6",
          fontSize: 12, fontWeight: 500, textAlign: "center" as const,
          padding: "7px 16px", letterSpacing: "0.2px", lineHeight: 1.4,
        }}>
          По Саракташу — бесплатно от {freeFrom}₽ · принимаем заказы {workStart}:00–{workEnd}:00
        </div>
      )}
      {showSectionsMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowSectionsMenu(false)} />}
      <div className="rp-hdr-wrap">
      <div style={S.header}>
        <div className="rp-hdr">
          {/* БРЕНД */}
          <div className="rp-brand" style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <img src="/images/logo-512.png" alt="" className="rp-logo" style={{ flexShrink: 0, objectFit: "cover" }} />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ ...S.shopName, margin: 0 }} className="rp-shopname">{catalog.shop_name}</h1>
              {catalog.shop_subtitle && <div className="rp-subtitle">{catalog.shop_subtitle}</div>}
            </div>
          </div>

          {/* ДЕЙСТВИЯ */}
          <div className="rp-hdr-right">
            {/* Вторичная навигация (desktop) */}
            <div className="rp-secondary-nav">
              <a href="about.html">О нас</a>
              <a href="reviews.html">Отзывы</a>
              {forBusinessEnabled && <a href="business.html" className="rp-desktop-only">Для бизнеса</a>}
              <a href="promo.html">Акции</a>
              <a href="bonus.html" className="rp-nav-new">Мои бонусы</a>
            </div>
            {/* Утилитарные действия */}
            <div className="rp-hdr-btns">
              <button className="rp-hdr-btn rp-sections-trigger" style={{ background: tgVar("secondary-bg-color", theme.bg_chip), color: tgVar("text-color", theme.text_primary) }} onClick={() => setShowSectionsMenu(v => !v)}>☰ Разделы</button>
              <a href="where.html" className="rp-hdr-btn rp-hdr-btn-wheretobuy" style={{ background: tgVar("secondary-bg-color", theme.bg_chip), color: tgVar("text-color", theme.text_primary) }}>Где купить</a>
              {bizPhone && <a href={`tel:${bizPhone}`} className="rp-hdr-btn" style={{ background: tgVar("secondary-bg-color", theme.bg_chip), color: tgVar("text-color", theme.text_primary) }}>📞 Позвонить</a>}
              {bizPhone && <a href="https://max.ru/join/FZnl85uOe410NmUxA0dDMyFYf90-aJkBOweY_tPkUr4" target="_blank" rel="noreferrer" className="rp-hdr-btn" style={{ background: tgVar("secondary-bg-color", theme.bg_chip), color: tgVar("text-color", theme.text_primary) }}>💬 Чат MAX</a>}
            </div>
            {showSectionsMenu && (
              <div className="rp-sections-menu">
                <a href="where.html" onClick={() => setShowSectionsMenu(false)}>📍 Где купить</a>
                <a href="promo.html" onClick={() => setShowSectionsMenu(false)}>🏷️ Акции</a>
                <a href="about.html" onClick={() => setShowSectionsMenu(false)}>ℹ️ О нас</a>
                <a href="reviews.html" onClick={() => setShowSectionsMenu(false)}>⭐ Отзывы</a>
                {forBusinessEnabled && <a href="business.html" onClick={() => setShowSectionsMenu(false)}>🏪 Для магазинов</a>}
                <a href="bonus.html" onClick={() => setShowSectionsMenu(false)}>🎁 Мои бонусы</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {catalog.banner?.enabled && !bannerDismissed && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", margin: "0 0 0 0",
          background: "#fdf3f2", borderBottom: "1px solid #f5c6c2",
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{catalog.banner.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {catalog.banner.badge && (
              <span style={{ fontSize: 10, fontWeight: 700, background: theme.primary, color: "#fff", padding: "2px 6px", borderRadius: 999, marginRight: 6, verticalAlign: "middle" }}>
                {catalog.banner.badge}
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{catalog.banner.title}</span>
          </div>
          {catalog.banner.button_text && (
            <button
              onClick={() => {
                if (catalog.banner?.button_target === 'prepared-form' || catalog.banner?.button_target === 'hot-menu') {
                  switchMode("hot");
                } else if (catalog.banner?.button_target) {
                  scrollToSection(catalog.banner.button_target);
                }
              }}
              style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: theme.cta, color: "#fff" }}
            >{catalog.banner.button_text}</button>
          )}
          <button
            onClick={() => { try { localStorage.setItem('banner_hot_dismissed', '1'); } catch {} setBannerDismissed(true); }}
            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "#999", padding: "4px" }}
            aria-label="Закрыть"
          >×</button>
        </div>
      )}


      <div className="rp-mode-cats">
      {hasHotCategories && (
        <div className="rp-mode-switch">
          <button className={`rp-mode-btn rp-mode-btn-frozen${mode === "frozen" ? " rp-mode-active" : ""}`} onClick={() => switchMode("frozen")}><svg width="19" height="19" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{flexShrink:0}}><line x1="8" y1="2.5" x2="8" y2="13.5"/><line x1="12.8" y1="5.3" x2="3.2" y2="10.7"/><line x1="12.8" y1="10.7" x2="3.2" y2="5.3"/><line x1="8" y1="4.3" x2="9.3" y2="3.5"/><line x1="8" y1="4.3" x2="6.7" y2="3.5"/><line x1="8" y1="11.7" x2="9.3" y2="12.5"/><line x1="8" y1="11.7" x2="6.7" y2="12.5"/><line x1="11.2" y1="6.2" x2="12.5" y2="7.0"/><line x1="11.2" y1="6.2" x2="11.2" y2="4.7"/><line x1="4.8" y1="6.2" x2="4.8" y2="4.7"/><line x1="4.8" y1="6.2" x2="3.5" y2="7.0"/><line x1="11.2" y1="9.8" x2="11.2" y2="11.3"/><line x1="11.2" y1="9.8" x2="12.5" y2="9.1"/><line x1="4.8" y1="9.8" x2="3.5" y2="9.1"/><line x1="4.8" y1="9.8" x2="4.8" y2="11.3"/></svg>Заморозка</button>
          <button className={`rp-mode-btn${mode === "hot" ? " rp-mode-active" : ""}`} onClick={() => switchMode("hot")}>🔥 Горячее</button>
        </div>
      )}
      <div className="rp-chips">
        {discountItems.length > 0 && (
          <button
            className="rp-chip"
            onClick={() => {
              scrollingRef.current = true;
              if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
              scrollTimeoutRef.current = setTimeout(() => { scrollingRef.current = false; }, 700);
              setActiveCatId("discounts");
              scrollToSection(`section-${mode}-discounts`);
            }}
            style={{
              background: activeCatId === "discounts" ? theme.cta : tgVar("secondary-bg-color", theme.bg_chip),
              color: activeCatId === "discounts" ? tgVar("button-text-color", "#ffffff") : tgVar("text-color", "#1a1a1a"),
            }}
          >Со скидкой</button>
        )}
        {visibleDisplayCategories.map((dc, i) => (
          <button
            key={dc.key}
            className={`rp-chip${i >= (discountItems.length > 0 ? 2 : 3) ? ' rp-chip-hidden-mobile' : ''}`}
            onClick={() => { scrollingRef.current = true; if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current); scrollTimeoutRef.current = setTimeout(() => { scrollingRef.current = false; }, 700); setActiveCatId(dc.key); scrollToSection(`section-${mode}-${dc.key}`); }}
            style={{
              background: activeCatId === dc.key ? theme.cta : tgVar("secondary-bg-color", theme.bg_chip),
              color: activeCatId === dc.key ? tgVar("button-text-color", "#ffffff") : tgVar("text-color", "#1a1a1a"),
            }}
          >{dc.label}</button>
        ))}
        <button
          className="rp-chip rp-chip-all"
          onClick={() => setShowAllCategories(true)}
          style={{ background: tgVar("secondary-bg-color", theme.bg_chip), color: tgVar("text-color", theme.text_primary) }}
        >Ещё</button>
      </div>
      </div>{/* /rp-mode-cats */}

      </div>{/* /rp-hdr-wrap */}

      {popularItems.length > 0 && mode === "frozen" && (
        <div id="section-popular" style={S.section}>
          <div className="rp-pop-title">⭐ Популярное</div>
          <div className="rp-grid">
            {popularItems.map((item) => {
              const inCart = cart[item.id];
              const hasPromo = Boolean(item.promo_enabled);
              const promoLabel = item.promo_label?.trim() || "Акция";
              const oldPriceNum = Number(item.old_price);
              const priceNum = Number(item.price);
              const hasOldPrice = Number.isFinite(oldPriceNum) && Number.isFinite(priceNum) && oldPriceNum > priceNum;
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
                      }}>Фото скоро появится</div>
                    )}
                  </div>
                  <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column" as const, flex: 1 }}>
                    <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 2, textTransform: "uppercase" as const, letterSpacing: "0.3px" }}>{item.catName}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: item.subtitle ? 2 : 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{item.title ?? item.name}</div>
                    {item.subtitle && <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>{item.subtitle}</div>}
                    {(hasPromo || hasOldPrice) ? (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 2 }}>
                          {hasPromo && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#c0392b", borderRadius: 4, padding: "1px 5px" }}>{promoLabel}</span>}
                          {hasOldPrice && <span style={{ fontSize: 12, opacity: 0.45, textDecoration: "line-through" }}>{item.old_price}{currency}</span>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.75, whiteSpace: "nowrap" }}>{item.price}{currency} / {item.unit}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.75, marginBottom: 8, whiteSpace: "nowrap" }}>{item.price}{currency} / {item.unit}</div>
                    )}
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
                        <button className="rp-add-btn" style={{ ...S.addBtn, width: "100%", padding: "7px 0", fontSize: 13 }} onClick={() => addToCart({ ...item, category: item.catName, _orderMode: "frozen" })}>+ Добавить</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "frozen" && popularItems.length > 0 && (
        <div className="rp-b2b-wrap">
          <div className="rp-trust-inner">
            <div className="rp-trust-title">Что говорят о нас</div>
            <div className="rp-trust-quote"><span className="rp-trust-stars">★★★★★</span> «Хорошее качество, очень вкусные, тесто не разваривается. Очень довольны.»<span className="rp-trust-author">— Сергей</span></div>
            <div className="rp-trust-quote"><span className="rp-trust-stars">★★★★★</span> «Вчера заказали пельмени, вареники и котлеты. Я просто в восторге!»<span className="rp-trust-author">— Арсений</span></div>
            <a href="/reviews.html" className="rp-trust-link">Все отзывы →</a>
          </div>
        </div>
      )}

      {visibleDisplayCategories.map((dc) => (
        <div key={dc.key} id={`section-${mode}-${dc.key}`} style={S.section}>
          <div style={{ ...S.sectionTitle, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <span>{dc.emoji} {dc.label}</span>
          </div>
          <div className="rp-grid">
            {dc.items.map((item) => {
              const inCart = cart[item.id];
              const hasPromo = Boolean(item.promo_enabled);
              const promoLabel = item.promo_label?.trim() || "Акция";
              const oldPriceNum = Number(item.old_price);
              const priceNum = Number(item.price);
              const hasOldPrice = Number.isFinite(oldPriceNum) && Number.isFinite(priceNum) && oldPriceNum > priceNum;
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
                  </div>
                  <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column" as const, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: item.subtitle ? 2 : 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{item.title ?? item.name}</div>
                    {item.subtitle && <div style={{ fontSize: 12, opacity: 0.5, marginBottom: mode === "hot" && (item.wait_time || item.portion_note) ? 2 : 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>{item.subtitle}</div>}
                    {mode === "hot" && (item.wait_time || item.portion_note) && (
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginBottom: 6 }}>
                        {item.portion_note && <span style={{ fontSize: 11, lineHeight: 1.2, padding: "3px 6px", borderRadius: 999, background: "#f4f0ea", color: "#6b5e4e" }}>{item.portion_note.replace(/^порция\s*/i, "")}</span>}
                        {item.wait_time && <span style={{ fontSize: 11, lineHeight: 1.2, padding: "3px 6px", borderRadius: 999, background: "#f4f0ea", color: "#6b5e4e" }}>{item.wait_time.replace(/\s*минут$/i, " мин")}</span>}
                      </div>
                    )}
                    {(hasPromo || hasOldPrice) ? (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 2 }}>
                          {hasPromo && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#c0392b", borderRadius: 4, padding: "1px 5px" }}>{promoLabel}</span>}
                          {hasOldPrice && <span style={{ fontSize: 12, opacity: 0.45, textDecoration: "line-through" }}>{item.old_price}{currency}</span>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: mode === "hot" ? 700 : 600, opacity: mode === "hot" ? 0.7 : 0.55, whiteSpace: "nowrap" }}>{item.price}{currency} / {item.unit}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: mode === "hot" ? 700 : 600, opacity: mode === "hot" ? 0.7 : 0.55, marginBottom: 8, whiteSpace: "nowrap" }}>{item.price}{currency} / {item.unit}</div>
                    )}
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
                        mode === "hot"
                          ? <button className="rp-add-btn" style={{ ...S.addBtn, width: "100%", padding: "7px 0", fontSize: 13 }} onClick={() => addHotToCart({ ...item, category: dc.label, _orderMode: "hot" })}>+ 3 порции</button>
                          : <button className="rp-add-btn" style={{ ...S.addBtn, width: "100%", padding: "7px 0", fontSize: 13 }} onClick={() => addToCart({ ...item, category: dc.label, _orderMode: mode })}>+ Добавить</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {discountItems.length > 0 && (
        <div id={`section-${mode}-discounts`} style={S.section}>
          <div style={{ ...S.sectionTitle, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <span>🏷️ Со скидкой</span>
          </div>
          <div className="rp-grid">
            {discountItems.map((item) => {
              const inCart = cart[item.id];
              const hasPromo = Boolean(item.promo_enabled);
              const promoLabel = item.promo_label?.trim() || "Акция";
              const oldPriceNum = Number(item.old_price);
              const priceNum = Number(item.price);
              const hasOldPrice = Number.isFinite(oldPriceNum) && Number.isFinite(priceNum) && oldPriceNum > priceNum;
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
                      }}>Фото скоро появится</div>
                    )}
                  </div>
                  <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column" as const, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: item.subtitle ? 2 : 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{item.title ?? item.name}</div>
                    {item.subtitle && <div style={{ fontSize: 12, opacity: 0.5, marginBottom: mode === "hot" && (item.wait_time || item.portion_note) ? 2 : 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>{item.subtitle}</div>}
                    {mode === "hot" && (item.wait_time || item.portion_note) && (
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginBottom: 6 }}>
                        {item.portion_note && <span style={{ fontSize: 11, lineHeight: 1.2, padding: "3px 6px", borderRadius: 999, background: "#f4f0ea", color: "#6b5e4e" }}>{item.portion_note.replace(/^порция\s*/i, "")}</span>}
                        {item.wait_time && <span style={{ fontSize: 11, lineHeight: 1.2, padding: "3px 6px", borderRadius: 999, background: "#f4f0ea", color: "#6b5e4e" }}>{item.wait_time.replace(/\s*минут$/i, " мин")}</span>}
                      </div>
                    )}
                    {(hasPromo || hasOldPrice) ? (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 2 }}>
                          {hasPromo && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#c0392b", borderRadius: 4, padding: "1px 5px" }}>{promoLabel}</span>}
                          {hasOldPrice && <span style={{ fontSize: 12, opacity: 0.45, textDecoration: "line-through" }}>{item.old_price}{currency}</span>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: mode === "hot" ? 700 : 600, opacity: mode === "hot" ? 0.7 : 0.55, whiteSpace: "nowrap" }}>{item.price}{currency} / {item.unit}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: mode === "hot" ? 700 : 600, opacity: mode === "hot" ? 0.7 : 0.55, marginBottom: 8, whiteSpace: "nowrap" }}>{item.price}{currency} / {item.unit}</div>
                    )}
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
                        mode === "hot"
                          ? <button className="rp-add-btn" style={{ ...S.addBtn, width: "100%", padding: "7px 0", fontSize: 13 }} onClick={() => addHotToCart({ ...item, category: item.catName, _orderMode: "hot" })}>+ 3 порции</button>
                          : <button className="rp-add-btn" style={{ ...S.addBtn, width: "100%", padding: "7px 0", fontSize: 13 }} onClick={() => addToCart({ ...item, category: item.catName, _orderMode: mode })}>+ Добавить</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!forBusinessEnabled && (
        <div style={{ padding: "16px 16px 24px", textAlign: "center" as const }}>
          <a href="business.html" style={{
            fontSize: 12, opacity: 0.35,
            color: tgVar("text-color", "#1a1a1a"),
            textDecoration: "none",
          }}>Для магазинов и партнёров →</a>
        </div>
      )}

      {cartTotal > 0 && !showCart && <div style={{ height: 80 }} />}

      {cartTotal > 0 && !showCart && createPortal(
        <div style={{
          position: "fixed" as const,
          left: "50%",
          bottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
          transform: "translateX(-50%)",
          width: isCompactCart ? "calc(100% - 16px)" : "min(calc(100% - 24px), 640px)",
          zIndex: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isCompactCart ? 10 : 14,
          padding: isCompactCart ? "12px 14px" : "14px 16px",
          borderRadius: 20,
          background: "rgba(255,255,255,0.98)",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 5, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: isCompactCart ? 16 : 18, fontWeight: 800, color: tgVar("text-color", "#2e221d"), whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
              {isCompactCart
                ? `${cartCount} ${itemsWord(cartCount)} · ${cartTotal}${currency}`
                : `В корзине: ${cartCount} ${itemsWord(cartCount)} · ${cartTotal}${currency}`}
            </span>
            {freeFrom > 0 && (() => {
              const freeLeft = Math.max(0, freeFrom - cartTotal);
              return (
                <>
                  <span style={{ fontSize: isCompactCart ? 13 : 14, fontWeight: cartTotal >= freeFrom ? 700 : 500, color: cartTotal >= freeFrom ? themeVar("cta") : tgVar("text-color", "#2e221d"), whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cartTotal >= freeFrom
                      ? "Бесплатная доставка ✓"
                      : isCompactCart
                        ? `До бесплатной доставки: ${freeLeft}${currency}`
                        : `До бесплатной доставки осталось ${freeLeft}${currency}`}
                  </span>
                  <div style={{ height: 5, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden", marginTop: 3 }}>
                    <div style={{ height: "100%", width: `${freeProgress * 100}%`, background: "linear-gradient(90deg, #60b8ff 0%, #2176d2 100%)", borderRadius: 999 }} />
                  </div>
                </>
              );
            })()}
          </div>
          <button style={{ flexShrink: 0, padding: isCompactCart ? "11px 18px" : "12px 22px", borderRadius: 15, border: "none", cursor: "pointer", fontSize: isCompactCart ? 15 : 16, fontWeight: 800, background: themeVar("cta"), color: "#fff", whiteSpace: "nowrap" as const, boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.12)" }} onClick={() => {
            fetch(`${API_BASE}/api/track/cart_open?tg_user_id=${tgUserId || 0}${testQ}&channel=${channel}&user_key=${encodeURIComponent(userKey)}`, { method: "POST" }).catch(() => {});
            window.scrollTo({ top: 0 });
            setShowCart(true);
            setTimeout(() => { cartRef.current?.scrollTo({ top: 0 }); }, 0);
          }}>Корзина</button>
        </div>,
        document.body
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
              background: theme.cta, color: "#ffffff",
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

      {showPromos && catalog && (
        <>
        <div style={S.overlay}>
          <div style={S.overlayHeader}>
            <span style={S.overlayTitle}>🎁 Специальные предложения</span>
            <button style={S.closeBtn} onClick={() => setShowPromos(false)}>×</button>
          </div>
          {(() => {
            const isPromoItem = (item: CatalogItem) => {
              const p = Number(item.price), op = Number(item.old_price);
              return item.promo_enabled === true ||
                (item.old_price != null && Number.isFinite(op) && Number.isFinite(p) && op > p);
            };
            const frozenPromos = (catalog.categories ?? []).flatMap(cat =>
              (cat.items ?? []).filter(isPromoItem).map(item => ({ ...item, _catRef: cat.name }))
            );
            const hotPromos = (catalog.hot_categories ?? []).flatMap(cat =>
              (cat.items ?? []).filter(isPromoItem).map(item => ({ ...item, _catRef: cat.name }))
            );
            const manualPromos = promotions;
            const renderCard = (item: CatalogItem & { _catRef: string }, orderMode: "frozen" | "hot") => {
              const inCart = cart[item.id];
              const p = Number(item.price), op = Number(item.old_price);
              const hasOldPrice = item.old_price != null && Number.isFinite(op) && Number.isFinite(p) && op > p;
              const hasPromo = Boolean(item.promo_enabled);
              const promoLabel = item.promo_label?.trim() || "Акция";
              return (
                <div key={`${orderMode}-${item.id}`} className="rp-promo-item-card">
                  {item.image && <img src={item.image} alt="" style={{ width: 74, height: 74, borderRadius: 12, objectFit: "cover" as const, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{item.title ?? item.name}</div>
                    {item.subtitle && <div style={{ fontSize: 13, opacity: 0.55, marginTop: 2 }}>{item.subtitle}</div>}
                    <div style={{ marginTop: 4 }}>
                      {(hasPromo || hasOldPrice) ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const, marginBottom: 1 }}>
                            {hasPromo && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "#c0392b", borderRadius: 4, padding: "1px 5px" }}>{promoLabel}</span>}
                            {hasOldPrice && <span style={{ fontSize: 12, opacity: 0.45, textDecoration: "line-through" }}>{item.old_price}{currency}</span>}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.75, whiteSpace: "nowrap" as const }}>{item.price}{currency} / {item.unit}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.75, whiteSpace: "nowrap" as const }}>{item.price}{currency} / {item.unit}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {inCart ? (
                      <div style={{ ...S.qtyControls }}>
                        <button style={{ ...S.qtyBtn, width: 30, height: 30, fontSize: 18 }} onClick={() => changeQty(item.id, -1)}>−</button>
                        <span style={{ ...S.qtyText, width: 28, fontSize: 14 }}>{inCart.qty}</span>
                        <button style={{ ...S.qtyBtn, width: 30, height: 30, fontSize: 18 }} onClick={() => changeQty(item.id, 1)}>+</button>
                      </div>
                    ) : item.in_stock === false ? (
                      <div style={{ fontSize: 12, color: "#999" }}>Нет в наличии</div>
                    ) : (
                      <button className="rp-add-btn" style={{ ...S.addBtn, padding: "6px 12px", fontSize: 13 }} onClick={() => orderMode === "hot" ? addHotToCart({ ...item, category: item._catRef, _orderMode: orderMode }) : addToCart({ ...item, category: item._catRef, _orderMode: orderMode })}>{orderMode === "hot" ? "+ 3 порции" : "+ В корзину"}</button>
                    )}
                  </div>
                </div>
              );
            };
            if (!frozenPromos.length && !hotPromos.length && !manualPromos.length) {
              return <div style={{ fontSize: 14, opacity: 0.5, padding: "20px 0", textAlign: "center" as const }}>Сейчас нет товаров со скидкой</div>;
            }
            const hasAutoPromos = frozenPromos.length > 0 || hotPromos.length > 0;
            return (
              <>
                {manualPromos.length > 0 && (
                  <div style={{ marginBottom: hasAutoPromos ? 20 : 0 }}>
                    {manualPromos.map(p => (
                      <div key={p.id} className="rp-promo-banner">
                        <img src="/promo-labels-banner.png" alt={p.title} />
                      </div>
                    ))}
                  </div>
                )}
                {hasAutoPromos && (
                  <>
                    <div className="rp-promo-section-title">Товары со скидкой</div>
                    {frozenPromos.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div className="rp-promo-mode-header">
                          <div className="rp-promo-mode-title">❄️ Заморозка</div>
                        </div>
                        {frozenPromos.map(item => renderCard(item, "frozen"))}
                      </div>
                    )}
                    {hotPromos.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div className="rp-promo-mode-header">
                          <div className="rp-promo-mode-title">🔥 Горячее</div>
                        </div>
                        {hotPromos.map(item => renderCard(item, "hot"))}
                      </div>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </div>
        {cartCount > 0 && window.innerWidth < 900 && createPortal(
          <div style={{
            position: "fixed" as const,
            left: "50%",
            bottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
            transform: "translateX(-50%)",
            width: isCompactCart ? "calc(100% - 16px)" : "min(calc(100% - 24px), 640px)",
            zIndex: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isCompactCart ? 10 : 14,
            padding: isCompactCart ? "12px 14px" : "14px 16px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.98)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 5, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: isCompactCart ? 16 : 18, fontWeight: 800, color: tgVar("text-color", "#2e221d"), whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                {isCompactCart
                  ? `${cartCount} ${itemsWord(cartCount)} · ${cartTotal}${currency}`
                  : `В корзине: ${cartCount} ${itemsWord(cartCount)} · ${cartTotal}${currency}`}
              </span>
              {freeFrom > 0 && (() => {
                const freeLeft = Math.max(0, freeFrom - cartTotal);
                return (
                  <>
                    <span style={{ fontSize: isCompactCart ? 13 : 14, fontWeight: cartTotal >= freeFrom ? 700 : 500, color: cartTotal >= freeFrom ? themeVar("cta") : tgVar("text-color", "#2e221d"), whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cartTotal >= freeFrom
                        ? "Бесплатная доставка ✓"
                        : isCompactCart
                          ? `До бесплатной доставки: ${freeLeft}${currency}`
                          : `До бесплатной доставки осталось ${freeLeft}${currency}`}
                    </span>
                    <div style={{ height: 5, borderRadius: 999, background: "rgba(0,0,0,0.08)", overflow: "hidden", marginTop: 3 }}>
                      <div style={{ height: "100%", width: `${freeProgress * 100}%`, background: "linear-gradient(90deg, #60b8ff 0%, #2176d2 100%)", borderRadius: 999 }} />
                    </div>
                  </>
                );
              })()}
            </div>
            <button style={{ flexShrink: 0, padding: isCompactCart ? "11px 18px" : "12px 22px", borderRadius: 15, border: "none", cursor: "pointer", fontSize: isCompactCart ? 15 : 16, fontWeight: 800, background: themeVar("cta"), color: "#fff", whiteSpace: "nowrap" as const, boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.12)" }} onClick={() => {
              setShowPromos(false);
              fetch(`${API_BASE}/api/track/cart_open?tg_user_id=${tgUserId || 0}${testQ}&channel=${channel}&user_key=${encodeURIComponent(userKey)}`, { method: "POST" }).catch(() => {});
              window.scrollTo({ top: 0 });
              setShowCart(true);
              setTimeout(() => { cartRef.current?.scrollTo({ top: 0 }); }, 0);
            }}>Корзина</button>
          </div>,
          document.body
        )}
        </>
      )}

      {showAllCategories && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAllCategories(false); }}
        >
          <div style={{ background: tgVar("bg-color", "#ffffff"), borderRadius: 16, width: "calc(100% - 32px)", maxWidth: 400, maxHeight: "85vh", overflowY: "auto", padding: "0 16px 24px" }}>
            <div style={S.overlayHeader}>
              <span style={S.overlayTitle}>Категории</span>
              <button style={S.closeBtn} onClick={() => setShowAllCategories(false)}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {visibleDisplayCategories.map(dc => (
                <button
                  key={dc.key}
                  onClick={() => { scrollingRef.current = true; if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current); scrollTimeoutRef.current = setTimeout(() => { scrollingRef.current = false; }, 700); setActiveCatId(dc.key); scrollToSection(`section-${mode}-${dc.key}`); setShowAllCategories(false); }}
                  style={{
                    display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
                    minHeight: 56, padding: "10px 8px", borderRadius: 12, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500, textAlign: "center" as const, lineHeight: 1.3,
                    wordBreak: "break-word" as const,
                    background: tgVar("secondary-bg-color", "#f0ebe3"), color: tgVar("text-color", "#1a1a1a"),
                  }}
                >
                  <span style={{ fontSize: 20, marginBottom: 4 }}>{dc.emoji}</span>
                  {dc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}


      {showCart && (
        <div ref={cartRef} style={{ ...S.overlay, paddingBottom: 32 }}>
          <div style={S.overlayHeader}>
            <span style={S.overlayTitle}>Ваш заказ</span>
            <button style={S.closeBtn} onClick={() => setShowCart(false)}>×</button>
          </div>

          {cartEntries.length === 0 ? (
            <div style={S.emptyCart}>Корзина пуста</div>
          ) : (
            <>
              {(() => {
                const frozenEntries = cartEntries.filter(e => e.item._orderMode !== "hot");
                const hotEntries = cartEntries.filter(e => e.item._orderMode === "hot");

                const renderCartEntry = (entry: CartEntry) => {
                  const isHot = entry.item._orderMode === "hot";
                  const categoryLabel = entry.item.category || "";
                  return (
                    <div key={entry.item.id} style={{ ...S.card, alignItems: "flex-start" }}>
                      <div style={{ ...S.cardLeft, minWidth: 0 }}>
                        {categoryLabel && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#9a9090", textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 2 }}>{categoryLabel}</div>
                        )}
                        <div style={S.cardName}>{entry.item.title ?? entry.item.name}</div>
                        <div style={S.cardPrice}>
                          {entry.item.price}{currency} × {entry.qty}{isHot ? " порции" : ""} = {entry.item.price * entry.qty}{currency}
                        </div>
                        {isHot && entry.qty < 3 && (
                          <div style={{ fontSize: 11, color: "#8a7060", marginTop: 3 }}>Минимум 3 порции — добавьте ещё {3 - entry.qty}</div>
                        )}
                      </div>
                      <div style={{ ...S.qtyControls, flexShrink: 0 }}>
                        <button style={S.qtyBtn} onClick={() => changeQty(entry.item.id, -1)}>−</button>
                        <span style={S.qtyText}>{entry.qty}</span>
                        <button style={S.qtyBtn} onClick={() => changeQty(entry.item.id, 1)}>+</button>
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {frozenEntries.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#2d5fa8", marginBottom: 6 }}>❄️ Заморозка</div>
                        {frozenEntries.map(renderCartEntry)}
                      </>
                    )}
                    {hotEntries.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#b94a00", marginBottom: 6, marginTop: frozenEntries.length > 0 ? 10 : 0 }}>🔥 Горячее</div>
                        {hotEntries.map(renderCartEntry)}
                      </>
                    )}
                  </>
                );
              })()}

              {!isPickup && freeFrom > 0 && (
                <div style={{ marginBottom: 10, fontSize: 13, color: "#5a5550", lineHeight: 1.5 }}>
                  {cartTotal >= freeFrom
                    ? <span style={{ fontWeight: 600 }}>🚚 Бесплатная доставка по Саракташу ✓</span>
                    : <span>🚚 До бесплатной доставки по Саракташу осталось <strong>{Math.max(freeFrom - cartTotal, 0)}{currency}</strong></span>
                  }
                  {cartTotal >= freeFrom && !isCompactCart && (
                    <div style={{ fontSize: 11, color: "#9a8a80", marginTop: 2 }}>Для других населённых пунктов стоимость уточним при подтверждении.</div>
                  )}
                </div>
              )}
              <div style={S.totalLine}>
                <span>Итого</span>
                <span>
                  {bonusUse > 0
                    ? <>{totalAfterBonus}{currency} <span style={{ fontSize: 12, opacity: 0.6 }}>({cartTotal} − {bonusUse} {bonusRubWord(bonusUse)})</span></>
                    : <>{cartTotal}{currency}</>
                  }
                </span>
              </div>

              <div style={{ marginTop: 20 }}>
                <label style={S.label}>Имя</label>
                <input style={S.input} placeholder="Как к вам обращаться" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />

                {pickupEnabled && (
                  <>
                    <label style={S.label}>Способ получения</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <button type="button" onClick={() => setReceiptMode("DELIVERY")} style={{
                        ...S.addBtn, flex: 1,
                        background: receiptMode === "DELIVERY" ? theme.cta : tgVar("secondary-bg-color", theme.bg_chip),
                        color: receiptMode === "DELIVERY" ? "#ffffff" : tgVar("text-color", theme.text_primary),
                      }}>Доставка</button>
                      <button type="button" onClick={() => setReceiptMode("PICKUP")} style={{
                        ...S.addBtn, flex: 1,
                        background: receiptMode === "PICKUP" ? theme.cta : tgVar("secondary-bg-color", theme.bg_chip),
                        color: receiptMode === "PICKUP" ? "#ffffff" : tgVar("text-color", theme.text_primary),
                      }}>Самовывоз</button>
                    </div>
                  </>
                )}

                <label style={S.label}>Телефон для связи</label>
                <input style={S.input} placeholder="Впишите сюда номер телефона" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />

                {(() => {
                  const digits = phone.replace(/\D/g, "");
                  if (digits.length < 10) return null;
                  return (
                    <div style={{ margin: "6px 0 10px", padding: "10px 12px", background: tgVar("secondary-bg-color", "#f5f0eb"), borderRadius: 10, fontSize: 13 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: useBonusChecked || bonusError ? 8 : 0 }}>
                        <input
                          type="checkbox"
                          checked={useBonusChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setUseBonusChecked(true);
                              setBonusError(null);
                            } else {
                              clearBonusAuthorization(true);
                              setBonusError(null);
                            }
                          }}
                        />
                        Использовать бонусные рубли
                      </label>

                      {useBonusChecked && !bonusVerified && (
                        <div>
                          <input
                            style={{ ...S.input, marginTop: 2 }}
                            type="password"
                            inputMode="numeric"
                            placeholder={`Введите PIN (${BONUS_PIN_LENGTH} цифр)`}
                            value={bonusPin}
                            onChange={e => setBonusPin(e.target.value.replace(/\D/g, "").slice(0, BONUS_PIN_LENGTH))}
                            maxLength={BONUS_PIN_LENGTH}
                          />
                          <button
                            type="button"
                            onClick={verifyBonusCard}
                            disabled={!normalizedBonusPhone || !pinReady || bonusLoading}
                            style={{ ...S.addBtn, width: "100%", marginTop: 6, opacity: (!normalizedBonusPhone || !pinReady || bonusLoading) ? 0.55 : 1 }}
                          >
                            {bonusLoading ? "Проверяем..." : "Проверить бонусы"}
                          </button>
                        </div>
                      )}

                      {useBonusChecked && bonusVerified && bonusCard && (
                        <div>
                          <div style={{ marginBottom: 6 }}>
                            💳 Доступно: <strong>{bonusCard.available_balance}</strong> {bonusRubWord(bonusCard.available_balance)}
                          </div>
                          {maxBonus > 0 ? (
                            <>
                              <label style={{ display: "block", marginBottom: 4 }}>
                                Списать бонусных рублей (до {maxBonus})
                              </label>
                              <input
                                style={S.input}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={maxBonus}
                                value={bonusAmount}
                                onChange={e => setBonusAmount(e.target.value.replace(/\D/g, ""))}
                              />
                            </>
                          ) : bonusCard.available_balance <= 0 ? (
                            <div style={{ opacity: 0.6 }}>На карте пока нет бонусных рублей для списания.</div>
                          ) : (
                            <div style={{ opacity: 0.6 }}>Списание недоступно для этой суммы заказа.</div>
                          )}
                          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                            При списании бонусных рублей новых начислений за этот заказ не будет.
                          </div>
                        </div>
                      )}

                      {bonusError && (
                        <div style={{ fontSize: 12, color: "#9b2c2c", lineHeight: 1.4 }}>
                          {bonusError}
                        </div>
                      )}

                      {!useBonusChecked && !bonusError && (
                        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                          Бонусы необязательны — заказ можно оформить без списания.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isPickup ? (
                  <div style={{ margin: "6px 0 10px", padding: "10px 12px", background: tgVar("secondary-bg-color", "#f5f0eb"), borderRadius: 10, fontSize: 14, lineHeight: 1.45 }}>
                    🏠 Самовывоз: <strong>{pickupAddress}</strong>
                  </div>
                ) : (
                  <>
                    <label style={S.label}>Адрес доставки</label>
                    <input style={S.input} placeholder="Впишите сюда адрес доставки" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </>
                )}

                <label style={S.label}>Комментарий</label>
                <input style={S.input} placeholder="Если есть, впишите комментарий к заказу" value={comment} onChange={(e) => setComment(e.target.value)} />

                <label style={S.label}>{isPickup ? "Когда забрать" : "Когда доставить"}</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <button type="button" onClick={() => { if (isWorkingHours) setDeliveryMode("ASAP"); }} style={{
                    ...S.addBtn, flex: 1,
                    background: deliveryMode === "ASAP" ? theme.cta : tgVar("secondary-bg-color", theme.bg_chip),
                    color: deliveryMode === "ASAP" ? "#ffffff" : tgVar("text-color", theme.text_primary),
                    opacity: isWorkingHours ? 1 : 0.45,
                    cursor: isWorkingHours ? "pointer" : "not-allowed",
                  }}>Как можно скорее</button>

                  <button type="button" onClick={() => setDeliveryMode("SCHEDULED")} style={{
                    ...S.addBtn, flex: 1,
                    background: deliveryMode === "SCHEDULED" ? theme.cta : tgVar("secondary-bg-color", theme.bg_chip),
                    color: deliveryMode === "SCHEDULED" ? "#ffffff" : tgVar("text-color", theme.text_primary),
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

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16, fontSize: 13, lineHeight: 1.45, cursor: "pointer", color: tgVar("text-color", theme.text_primary) }}>
                <input
                  type="checkbox"
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  style={{ width: "auto", marginTop: 2, flexShrink: 0, accentColor: theme.cta }}
                />
                <span>
                  Соглашаюсь на обработку персональных данных для оформления и выполнения заказа.{" "}
                  <a href="/privacy.html" target="_blank" rel="noopener" style={{ color: theme.cta }}>
                    Подробнее
                  </a>{" "}
                  (откроется в новой вкладке)
                </span>
              </label>
              {!privacyConsent && (
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, lineHeight: 1.4 }}>
                  Подтвердите согласие на обработку персональных данных
                </div>
              )}

              <button
                style={{ ...S.mainButton(
                    sending ||
                    customerName.trim().length === 0 ||
                    (isPickup && !pickupEnabled) ||
                    (!isPickup && address.trim().length < 4) ||
                    phone.trim().replace(/\D/g, "").length < 10 ||
                    cartEntries.length === 0 ||
                    (!isWorkingHours && deliveryMode === "ASAP") ||
                    (deliveryMode === "SCHEDULED" && !isScheduledTimeValid) ||
(isWorkingHours && deliveryMode === "SCHEDULED" && deliveryTime && !isScheduledTimeInFuture) ||
                    (useBonusChecked && (!bonusVerified || bonusLoading || bonusUse <= 0)) ||
                    !privacyConsent ||
                    hotMinNotMet
                  ), width: "100%", marginTop: 20, minHeight: 58, whiteSpace: "nowrap" as const, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" as const }}
                disabled={
                    sending ||
                    customerName.trim().length === 0 ||
                    (isPickup && !pickupEnabled) ||
                    (!isPickup && address.trim().length < 4) ||
                    phone.trim().replace(/\D/g, "").length < 10 ||
                    cartEntries.length === 0 ||
                    (!isWorkingHours && deliveryMode === "ASAP") ||
                    (deliveryMode === "SCHEDULED" && !isScheduledTimeValid) ||
(isWorkingHours && deliveryMode === "SCHEDULED" && deliveryTime && !isScheduledTimeInFuture) ||
                    (useBonusChecked && (!bonusVerified || bonusLoading || bonusUse <= 0)) ||
                    !privacyConsent ||
                    hotMinNotMet
                  }
                onClick={submitOrder}
              >
                {sending ? "Проверяем..." : `Заказать — ${totalAfterBonus}${currency}`}
              </button>
              {result && <div ref={resultRef} style={S.resultBox(result.ok)}>{result.text}</div>}
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
