"use client";

type TelegramThemeParams = Record<string, string | undefined>;

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: { id?: number; username?: string; first_name?: string } };
  themeParams?: TelegramThemeParams;
  colorScheme?: string;
  ready: () => void;
  expand: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function getNativeWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function isTelegramAvailable() {
  try {
    const wa = getNativeWebApp();
    return Boolean(wa?.initData);
  } catch {
    return false;
  }
}

export function initTelegramWebApp() {
  const WebApp = getNativeWebApp();
  if (!WebApp) return null;
  try {
    WebApp.ready();
    WebApp.expand();
    applyTelegramTheme();
    return WebApp;
  } catch {
    return null;
  }
}

export function applyTelegramTheme() {
  const WebApp = getNativeWebApp();
  if (!WebApp?.themeParams) return;
  const tp = WebApp.themeParams;
  const root = document.documentElement;
  if (tp.bg_color) root.style.setProperty("--tg-bg", tp.bg_color);
  if (tp.text_color) root.style.setProperty("--tg-text", tp.text_color);
  if (tp.hint_color) root.style.setProperty("--tg-hint", tp.hint_color);
  if (tp.button_color) root.style.setProperty("--tg-button", tp.button_color);
  if (tp.button_text_color)
    root.style.setProperty("--tg-button-text", tp.button_text_color);
  if (tp.secondary_bg_color)
    root.style.setProperty("--tg-secondary-bg", tp.secondary_bg_color);
  if (WebApp.colorScheme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function getTelegramInitData(): string | null {
  try {
    const fromNative = getNativeWebApp()?.initData;
    if (fromNative) return fromNative;
  } catch {
    /* ignore */
  }
  return null;
}

/** Wait until Telegram injects initData (script may load slightly after React mount). */
export async function waitForTelegramInitData(
  timeoutMs = 4000,
): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    initTelegramWebApp();
    const data = getTelegramInitData();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 100));
  }
  return getTelegramInitData();
}

export function buildBypassInitData() {
  const user = {
    id: 100001,
    username: "demo_student",
    first_name: "Demo",
    last_name: "Student",
  };
  const params = new URLSearchParams({
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
    hash: "bypass",
  });
  return params.toString();
}

export function telegramBypassEnabled() {
  return process.env.NEXT_PUBLIC_TELEGRAM_BYPASS === "true";
}

export function isInsideTelegramShell() {
  if (typeof window === "undefined") return false;
  return Boolean(window.Telegram?.WebApp);
}
