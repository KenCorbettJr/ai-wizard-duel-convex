/* AI Wizard Duel service worker: shows push notifications and opens them. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "AI Wizard Duel", body: event.data && event.data.text() };
  }

  const title = data.title || "AI Wizard Duel";
  const options = {
    body: data.body || "",
    icon: "/web-app-manifest-192x192.png",
    badge: "/favicon-96x96.png",
    tag: data.tag,
    renotify: !!data.tag,
    data: { url: data.url || "/", notificationId: data.notificationId },
  };

  const tasks = [self.registration.showNotification(title, options)];
  if (typeof data.badgeCount === "number" && self.navigator.setAppBadge) {
    tasks.push(self.navigator.setAppBadge(data.badgeCount).catch(() => {}));
  }
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Reuse an open tab: one already on this page, else any of ours.
      const exact = windows.find((w) => w.url === url);
      if (exact) return exact.focus();
      const any = windows.find((w) => w.url.startsWith(self.location.origin));
      if (any) {
        await any.focus();
        return any.navigate(url).catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    })(),
  );
});
