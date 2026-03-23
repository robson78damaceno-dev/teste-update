"use client";

import React, { useEffect } from "react";

const META_TAGS: { name: string; content: string }[] = [
  { name: "apple-mobile-web-app-capable", content: "yes" },
  { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
  { name: "format-detection", content: "telephone=no" },
];

/**
 * Injeta meta tags padrão para identificação e comportamento em iOS/PWA.
 * Garante viewport e metas consistentes sem depender de media queries para o layout base.
 */
export function AppMetaTags(): React.ReactElement {
  useEffect(() => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta != null) {
      viewportMeta.setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
      );
      viewportMeta.id = "viewport-meta";
    }

    const head = document.head;
    for (const { name, content } of META_TAGS) {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (el == null) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        head.appendChild(el);
      }
      el.setAttribute("content", content);
    }
  }, []);

  return <></>;
}
