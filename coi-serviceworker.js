/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
if (typeof window === "undefined") {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (ev.data && ev.data.type === "deregister") {
            self.registration
                .unregister()
                .then(() => {
                    return self.clients.matchAll();
                })
                .then(clients => {
                    clients.forEach((client) => client.navigate(client.url));
                });
        }
    });

    self.addEventListener("fetch", function (event) {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });
} else {
    (() => {
        const rel = "modulepreload";
        const seen = {};
        const base = "/";
        const match = (s) => s.startsWith(base);
        const an = (e) => {
            if (e.tagName === "LINK" && e.rel === rel && match(e.href)) return e.href;
        };
        const to = (s) => new URL(s, location).href;
        const add = (s) => {
            if (seen[s]) return;
            seen[s] = true;
            const link = document.createElement("link");
            link.rel = rel;
            link.href = s;
            document.head.appendChild(link);
        };
        document.querySelectorAll("link").forEach((e) => an(e) && add(an(e)));
        new MutationObserver((ms) =>
            ms.forEach((m) =>
                Array.from(m.addedNodes).forEach(
                    (e) => an(e) && add(an(e))
                )
            )
        ).observe(document.head, { childList: true });
    });
}