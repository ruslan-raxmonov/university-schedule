"use client";

type TelegramWebApp = {
  initData?: string;
  themeParams?: Record<string, string | undefined>;
  colorScheme?: string;
  ready: () => void;
  expand: () => void;
};

function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@twa-dev/sdk");
    return (mod.default || mod) as TelegramWebApp;
  } catch {
    return null;
  }
}

export function isTelegramAvailable() {
  const WebApp = getWebApp();
  try {
    return Boolean(WebApp?.initData);
  } catch {
    return false;
  }
}

export function initTelegramWebApp() {
  const WebApp = getWebApp();
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
  const WebApp = getWebApp();
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
  const WebApp = getWebApp();
  try {
    if (WebApp?.initData) return WebApp.initData;
  } catch {
    /* ignore */
  }
  return null;
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
