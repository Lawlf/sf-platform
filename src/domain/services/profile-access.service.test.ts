import { describe, expect, it } from "vitest";

import {
  hasLockedProfiles,
  isInGrace,
  isProfileAccessible,
  keptProfileId,
  type ProfileLike,
} from "./profile-access.service";

const NOW = new Date("2026-06-28T00:00:00Z");
const pf: ProfileLike = { id: "pf", isPrimary: true, type: "PF" };
const pj: ProfileLike = { id: "pj", isPrimary: false, type: "PJ_MEI" };
const list = [pf, pj];

const base = { proGraceUntil: null, freeKeptProfileId: null, now: NOW };

describe("profile-access", () => {
  it("Pro: tudo acessível", () => {
    const s = { ...base, isPro: true };
    expect(isProfileAccessible("pj", list, s)).toBe(true);
    expect(hasLockedProfiles(list, s)).toBe(false);
  });

  it("Free fora da graça: só o primary é acessível", () => {
    const s = { ...base, isPro: false };
    expect(isProfileAccessible("pf", list, s)).toBe(true);
    expect(isProfileAccessible("pj", list, s)).toBe(false);
    expect(hasLockedProfiles(list, s)).toBe(true);
  });

  it("Free na graça: tudo acessível, sem trancado", () => {
    const grace = new Date(NOW.getTime() + 1000);
    const s = { ...base, isPro: false, proGraceUntil: grace };
    expect(isInGrace(s)).toBe(true);
    expect(isProfileAccessible("pj", list, s)).toBe(true);
    expect(hasLockedProfiles(list, s)).toBe(false);
  });

  it("Free com escolha: o escolhido é o acessível, não o primary", () => {
    const s = { ...base, isPro: false, freeKeptProfileId: "pj" };
    expect(keptProfileId(list, "pj")).toBe("pj");
    expect(isProfileAccessible("pj", list, s)).toBe(true);
    expect(isProfileAccessible("pf", list, s)).toBe(false);
  });

  it("escolha inválida cai no primary", () => {
    expect(keptProfileId(list, "sumiu")).toBe("pf");
  });

  it("perfil único nunca tranca", () => {
    const s = { ...base, isPro: false };
    expect(hasLockedProfiles([pf], s)).toBe(false);
    expect(isProfileAccessible("pf", [pf], s)).toBe(true);
  });
});
