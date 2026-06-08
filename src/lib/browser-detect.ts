// 内蔵ブラウザ検知。LINE/Facebook/Instagram の WebView は
// Stripe Checkout の 3DS が高確率で失敗するため、外部ブラウザで開くよう案内する。

const IN_APP_PATTERNS = [
  /Line\//i, // LINE
  /FBAN|FBAV/i, // Facebook Messenger
  /Instagram/i,
  /MicroMessenger/i, // WeChat
  /KAKAOTALK/i, // KakaoTalk
] as const;

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return IN_APP_PATTERNS.some((re) => re.test(ua));
}

export function detectedInAppName(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/Line\//i.test(ua)) return "LINE";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/MicroMessenger/i.test(ua)) return "WeChat";
  if (/KAKAOTALK/i.test(ua)) return "KakaoTalk";
  return null;
}
