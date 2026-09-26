/** Who is logged in, plus the cached content and the offline queue count. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, Pupil } from './api';
import { Bundle, EarnedBadge, SyncResult, cache, outbox } from './db';
import { GameType, Level } from './game-config';

/** What the results screen shows: the device's estimate, plus the server's scoring once synced. */
export interface LastResult {
  clientId: string;
  gameType: GameType;
  level: Level;
  correct: number;
  items: number;
  accuracy: number;
  stars: number;
  score: number;
  newBadges: EarnedBadge[];
  /** Present once the round reached the server. */
  server?: SyncResult;
}

interface SessionValue {
  pupil: Pupil | null;
  bundle: Bundle | null;
  progress: { scores: any[]; badges: any[] };
  pending: number;
  ready: boolean;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  sync: (clientId?: string) => Promise<SyncResult | undefined>;
  lastResult: LastResult | null;
  setLastResult: React.Dispatch<React.SetStateAction<LastResult | null>>;
}

const Ctx = createContext<SessionValue>(null as any);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [progress, setProgress] = useState({ scores: [], badges: [] });
  const [pending, setPending] = useState(0);
  const [ready, setReady] = useState(false);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);

  // Sync attempts run one after another so the same round is never posted twice at once.
  const syncChain = useRef<Promise<unknown>>(Promise.resolve());
  // Server results seen this session, so a caller can find its round even if another attempt sent it.
  const serverResults = useRef<Record<string, SyncResult>>({});

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
        sync(); // try to send anything left from last time
      }
      setReady(true);
    })();
  }, []);

  // Retry whenever the app comes back to the foreground.
  useEffect(() => {
    if (!pupil) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, [pupil]);

  const login = async (code: string) => {
    const p = await api.loginPupil(code);
    setPupil(p);
    await refresh();
    sync(); // send this pupil's rounds queued from an earlier offline login
  };

  /** This pupil's queued rounds stay on the device until they log in again. */
  const logout = async () => {
    await api.logout();
    setPupil(null);
    setPending(0);
    setLastResult(null);
  };

  /**
   * Sends queued rounds. Resolves with the server's result for `clientId` when
   * that round has synced, undefined when it is still waiting. Never rejects.
   */
  const sync = (clientId?: string): Promise<SyncResult | undefined> => {
    const run = async () => {
      const res = await outbox.flush();
      Object.assign(serverResults.current, res.results);
      setPending(await outbox.count());

      if (res.sent > 0) {
        // Show the server's scoring on the results screen if that round just went through.
        setLastResult((prev) => (prev && res.results[prev.clientId] ? { ...prev, server: res.results[prev.clientId] } : prev));
        setProgress(await cache.progress());
      }
      return clientId ? serverResults.current[clientId] : undefined;
    };
    const next = syncChain.current.then(run).catch(() => (clientId ? serverResults.current[clientId] : undefined));
    syncChain.current = next;
    return next;
  };

  const value = useMemo(
    () => ({ pupil, bundle, progress, pending, ready, login, logout, refresh, sync, lastResult, setLastResult }),
    [pupil, bundle, progress, pending, ready, lastResult],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
