import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level store so `beforeinstallprompt` is captured immediately on app load
// and never missed by lazily opened modals.
let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let sharedIsInstalled = false;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((cb) => cb());
}

if (typeof window !== 'undefined') {
  sharedIsInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    sharedDeferredPrompt = e as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener('appinstalled', () => {
    sharedIsInstalled = true;
    sharedDeferredPrompt = null;
    notifySubscribers();
  });
}

export function usePWAInstall() {
  const [, setTick] = useState(0);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const update = () => setTick((t) => t + 1);
    subscribers.add(update);
    return () => {
      subscribers.delete(update);
    };
  }, []);

  const install = async () => {
    if (!sharedDeferredPrompt) return false;
    const promptEvent = sharedDeferredPrompt;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      sharedIsInstalled = true;
      sharedDeferredPrompt = null;
      notifySubscribers();
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!sharedDeferredPrompt,
    isInstalled: sharedIsInstalled,
    isIOS,
    install,
  };
}
