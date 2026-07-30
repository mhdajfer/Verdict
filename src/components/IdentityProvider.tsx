"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface IdentityCtx {
  meId: string | null;
  ready: boolean;
  setMe: (id: string | null) => void;
}

const Ctx = createContext<IdentityCtx>({ meId: null, ready: false, setMe: () => {} });

const KEY = "verdict:me";

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [meId, setMeId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setMeId(localStorage.getItem(KEY));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setMe = useCallback((id: string | null) => {
    setMeId(id);
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={{ meId, ready, setMe }}>{children}</Ctx.Provider>;
}

export const useIdentity = () => useContext(Ctx);
