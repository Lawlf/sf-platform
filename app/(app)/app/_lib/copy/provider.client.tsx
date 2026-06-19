"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Ctx } from "./types";

const ProfileCtxContext = createContext<Ctx>("PF");

export function CopyProvider({ value, children }: { value: Ctx; children: ReactNode }) {
  return <ProfileCtxContext.Provider value={value}>{children}</ProfileCtxContext.Provider>;
}

export function useCtx(): Ctx {
  return useContext(ProfileCtxContext);
}
