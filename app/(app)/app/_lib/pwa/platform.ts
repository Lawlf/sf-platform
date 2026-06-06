export type PwaOs = "ios" | "android" | "other";
export type PwaBrowser = "safari" | "chrome" | "other";

export interface PwaEnv {
  os: PwaOs;
  browser: PwaBrowser;
  inAppBrowser: boolean;
  standalone: boolean;
  canInstallIos: boolean;
}

const IN_APP_MARKERS = [
  "FBAN",
  "FBAV",
  "Instagram",
  "Line/",
  "Twitter",
  "TikTok",
  "GSA/",
  "; wv)",
];

export function detectPwaEnv(input: { userAgent: string; standalone: boolean }): PwaEnv {
  const ua = input.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const os: PwaOs = isIos ? "ios" : isAndroid ? "android" : "other";

  const inAppBrowser = IN_APP_MARKERS.some((m) => ua.includes(m));

  const isIosOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const isIosSafari = isIos && !isIosOtherBrowser && !inAppBrowser && /Safari/.test(ua);

  let browser: PwaBrowser = "other";
  if (isIosSafari) browser = "safari";
  else if (isAndroid && /Chrome/.test(ua) && !inAppBrowser) browser = "chrome";

  const canInstallIos = isIosSafari && !input.standalone;

  return { os, browser, inAppBrowser, standalone: input.standalone, canInstallIos };
}
