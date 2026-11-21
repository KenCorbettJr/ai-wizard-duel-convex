"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Push notification state for this browser:
 * - loading: still checking
 * - unsupported: the browser can't do Web Push
 * - needs-install: iPhone/iPad Safari; push only works once added to the Home Screen
 * - denied: the player blocked notifications in browser settings
 * - off: supported, not turned on for this account in this browser
 * - on: subscribed and registered to the signed-in account
 */
export type PushState =
  "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SW_PATH = "/sw.js";

const noopSubscribe = () => () => {};

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// What the browser allows, before looking at subscriptions. null means push
// is available and permission hasn't been refused.
function baseSupport(): PushState | null {
  if (isIOS() && !isStandalone()) return "needs-install";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window) ||
    !VAPID_PUBLIC_KEY
  ) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return null;
}

export function usePushNotifications() {
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const browserSupport = useSyncExternalStore(
    noopSubscribe,
    baseSupport,
    () => "loading" as const,
  );
  // Set when the player refuses permission during this visit.
  const [refused, setRefused] = useState(false);
  const support: PushState | null = refused ? "denied" : browserSupport;
  const [busy, setBusy] = useState(false);

  const save = useMutation(api.notifications.savePushSubscription);
  const remove = useMutation(api.notifications.removePushSubscription);
  const registered = useQuery(
    api.notifications.isPushSubscriptionActive,
    endpoint ? { endpoint } : "skip",
  );

  // Find any existing subscription for this browser.
  useEffect(() => {
    if (baseSupport()) return;
    navigator.serviceWorker
      .getRegistration(SW_PATH)
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => setEndpoint(null));
  }, []);

  const state: PushState =
    support ??
    (endpoint && registered === undefined
      ? "loading"
      : endpoint && registered
        ? "on"
        : "off");

  const enable = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") setRefused(true);
        return false;
      }
      const reg = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      const json = sub.toJSON();
      await save({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent.slice(0, 300),
      });
      setEndpoint(sub.endpoint);
      return true;
    } finally {
      setBusy(false);
    }
  }, [save]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await remove({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setEndpoint(null);
    } finally {
      setBusy(false);
    }
  }, [remove]);

  return { state, busy, enable, disable };
}
