import { describe, expect, it } from "vitest";

import { detectPwaEnv } from "./platform";

const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IOS_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1";
const IOS_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

describe("detectPwaEnv", () => {
  it("flags iOS Safari (not standalone) as installable", () => {
    const env = detectPwaEnv({ userAgent: IOS_SAFARI, standalone: false });
    expect(env.os).toBe("ios");
    expect(env.browser).toBe("safari");
    expect(env.canInstallIos).toBe(true);
  });

  it("does not flag iOS Safari already standalone", () => {
    const env = detectPwaEnv({ userAgent: IOS_SAFARI, standalone: true });
    expect(env.canInstallIos).toBe(false);
    expect(env.standalone).toBe(true);
  });

  it("does not flag iOS Chrome (CriOS) as installable", () => {
    const env = detectPwaEnv({ userAgent: IOS_CHROME, standalone: false });
    expect(env.os).toBe("ios");
    expect(env.browser).toBe("other");
    expect(env.canInstallIos).toBe(false);
  });

  it("does not flag iOS in-app browser as installable", () => {
    const env = detectPwaEnv({ userAgent: IOS_INSTAGRAM, standalone: false });
    expect(env.inAppBrowser).toBe(true);
    expect(env.canInstallIos).toBe(false);
  });

  it("detects Android", () => {
    const env = detectPwaEnv({ userAgent: ANDROID_CHROME, standalone: false });
    expect(env.os).toBe("android");
    expect(env.canInstallIos).toBe(false);
  });

  it("detects desktop as other", () => {
    const env = detectPwaEnv({ userAgent: DESKTOP_CHROME, standalone: false });
    expect(env.os).toBe("other");
  });
});
