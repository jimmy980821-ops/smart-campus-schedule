/* global firebase */

const CACHE_NAME = "campus-flow-v8";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./site.webmanifest",
  "./app-icon.png"
];

// 必須先註冊點擊事件，避免 Firebase 的預設處理覆蓋自訂導向。
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "./", self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.startsWith(self.registration.scope)) {
          if ("navigate" in client) await client.navigate(destination);
          return client.focus();
        }
      }
      return self.clients.openWindow(destination);
    })
  );
});

// Service Worker 中使用 compat 版本，不需要額外的打包工具。
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBU4gvnt7fVHwkRbqbJ-hBBlmZrP0MgKY4",
  authDomain: "campus-flow-9965c.firebaseapp.com",
  projectId: "campus-flow-9965c",
  storageBucket: "campus-flow-9965c.firebasestorage.app",
  messagingSenderId: "706339405367",
  appId: "1:706339405367:web:6368418b712f0c613109b2"
});

const messaging = firebase.messaging();

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  return self.registration.showNotification(data.title || "校園日程提醒", {
    body: data.body || "有新的校園日程提醒。",
    icon: data.icon || "./app-icon.png",
    badge: "./app-icon.png",
    tag: data.tag || "campus-flow-reminder",
    data: { url: data.url || "./" }
  });
});
