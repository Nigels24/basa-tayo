/** Who is logged in, plus the cached content and the offline queue count. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, Pupil } from './api';
import { Bundle, cache, outbox } from './db';

interface SessionValue {
  pupil: Pupil | null;
  bundle: Bundle | null;
  progress: { scores: any[]; badges: any[] };
  pending: number;
  ready: boolean;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  sync: () => Promise<number>;
  lastResult: any;
  setLastResult: (r: any) => void;
}

const Ctx = createContext<SessionValue>(null as any);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [progress, setProgress] = useState({ scores: [], badges: [] });
  const [pending, setPending] = useState(0);
  const [ready, setReady] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const refresh = useCallback(async () => {
    const [b, p, n] = await Promise.all([cache.refresh(), cache.progress(), outbox.count()]);
    setBundle(b);
    setProgress(p);
    setPending(n);
  }, []);

  useEffect(() => {
    (async () => {
      const restored = await api.restore();
      if (restored.pupil) {
        setPupil(restored.pupil);
        await refresh();
        sync().catch(() => {}); // try to send anything left from last time
      }
      setReady(true);
    })();
  }, []);

  const login = async (code: string) => {
    const p = await api.loginPupil(code);
    setPupil(p);
    await refresh();
  };

  const logout = async () => {
    await api.logout();
    setPupil(null);
  };

  /** Sends queued rounds. Returns how many went through; 0 means still offline. */
  const sync = async () => {
    try {
      const res = await outbox.flush();
      setPending(await outbox.count());
      setProgress(await cache.progress());
      return res.sent;
    } catch {
      setPending(await outbox.count());
      return 0;
    }
  };

  const value = useMemo(
    () => ({ pupil, bundle, progress, pending, ready, login, logout, refresh, sync, lastResult, setLastResult }),
    [pupil, bundle, progress, pending, ready, lastResult],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
