import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const BUILD_HASH_STORAGE_KEY = 'trigo_stop_build_hash';
const REFS_MTIME_STORAGE_KEY = 'trigo_stop_refs_mtime';

interface VersionResponse {
  version: string;
  buildHash: string;
  refsMtime: number;
  checkedAt: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  reason: 'sw' | 'server' | 'refs' | 'none' | 'offline';
  version?: string;
}

export function useAppUpdate(onRefsUpdated?: () => Promise<void>) {
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [serverUpdateReady, setServerUpdateReady] = useState(false);
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('4.2.0');
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const latestServerHashRef = useRef<string | null>(null);
  const latestRefsMtimeRef = useRef<number | null>(null);

  const {
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        registrationRef.current = registration;
        // Verify on startup whether a newer Service Worker bundle is available
        registration.update().catch(() => {});
      }
    },
    onRegisterError() {
      // Service worker registration may be restricted in sandboxed frames
    },
  });

  const checkForUpdates = useCallback(
    async (isStartup = false): Promise<UpdateCheckResult> => {
      setChecking(true);
      try {
        // 1. Trigger Service Worker update check if registered
        if (registrationRef.current) {
          await registrationRef.current.update().catch(() => {});
        }

        // 2. Check server version fingerprint, falling back to static /version.json on Vercel
        let info: VersionResponse | null = null;
        try {
          const apiRes = await fetch('/api/version', { cache: 'no-store' });
          const contentType = apiRes.headers.get('content-type') || '';
          if (apiRes.ok && contentType.includes('application/json')) {
            info = (await apiRes.json()) as VersionResponse;
          }
        } catch {
          info = null;
        }

        if (!info) {
          const staticRes = await fetch(`/version.json?t=${Date.now()}`, {
            cache: 'no-store',
          });
          const staticType = staticRes.headers.get('content-type') || '';
          if (staticRes.ok && staticType.includes('application/json')) {
            info = (await staticRes.json()) as VersionResponse;
          }
        }

        if (!info) {
          return {
            hasUpdate: swNeedRefresh,
            reason: swNeedRefresh ? 'sw' : 'none',
          };
        }
        setCurrentVersion(info.version);
        setLastCheckedAt(new Date());
        latestServerHashRef.current = info.buildHash;
        latestRefsMtimeRef.current = info.refsMtime;

        const storedHash = localStorage.getItem(BUILD_HASH_STORAGE_KEY);
        const storedMtimeRaw = localStorage.getItem(REFS_MTIME_STORAGE_KEY);
        const storedMtime = storedMtimeRaw ? Number(storedMtimeRaw) : null;

        if (!storedHash) {
          // First initialization: record baseline hash
          localStorage.setItem(BUILD_HASH_STORAGE_KEY, info.buildHash);
          if (info.refsMtime) {
            localStorage.setItem(REFS_MTIME_STORAGE_KEY, String(info.refsMtime));
          }
          if (swNeedRefresh) {
            setPendingVersion(info.version);
            return { hasUpdate: true, reason: 'sw', version: info.version };
          }
          return { hasUpdate: false, reason: 'none', version: info.version };
        }

        const buildChanged = storedHash !== info.buildHash;
        const refsChanged =
          storedMtime !== null &&
          info.refsMtime > 0 &&
          info.refsMtime !== storedMtime;

        if (swNeedRefresh) {
          setPendingVersion(info.version);
          return { hasUpdate: true, reason: 'sw', version: info.version };
        }

        if (buildChanged) {
          setServerUpdateReady(true);
          setPendingVersion(info.version);
          return { hasUpdate: true, reason: 'server', version: info.version };
        }

        if (refsChanged) {
          setServerUpdateReady(true);
          setPendingVersion(info.version);
          return { hasUpdate: true, reason: 'refs', version: info.version };
        }

        if (!isStartup && onRefsUpdated) {
          await onRefsUpdated();
        }

        return { hasUpdate: false, reason: 'none', version: info.version };
      } catch {
        return {
          hasUpdate: swNeedRefresh,
          reason: swNeedRefresh ? 'sw' : 'offline',
        };
      } finally {
        setChecking(false);
      }
    },
    [swNeedRefresh, onRefsUpdated]
  );

  // Automatic update check on app startup
  useEffect(() => {
    void checkForUpdates(true);
    // Run once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const installUpdate = useCallback(async () => {
    setInstalling(true);
    try {
      if (latestServerHashRef.current) {
        localStorage.setItem(
          BUILD_HASH_STORAGE_KEY,
          latestServerHashRef.current
        );
      }
      if (latestRefsMtimeRef.current) {
        localStorage.setItem(
          REFS_MTIME_STORAGE_KEY,
          String(latestRefsMtimeRef.current)
        );
      }

      if (onRefsUpdated) {
        await onRefsUpdated().catch(() => {});
      }

      setServerUpdateReady(false);

      if (swNeedRefresh) {
        await updateServiceWorker(true);
        setSwNeedRefresh(false);
      } else {
        window.location.reload();
      }
    } finally {
      setInstalling(false);
    }
  }, [
    swNeedRefresh,
    updateServiceWorker,
    setSwNeedRefresh,
    onRefsUpdated,
  ]);

  const dismissUpdate = useCallback(() => {
    setServerUpdateReady(false);
    setSwNeedRefresh(false);
  }, [setSwNeedRefresh]);

  const updateAvailable = swNeedRefresh || serverUpdateReady;

  return {
    checking,
    installing,
    updateAvailable,
    currentVersion,
    pendingVersion,
    lastCheckedAt,
    checkForUpdates,
    installUpdate,
    dismissUpdate,
  };
}
