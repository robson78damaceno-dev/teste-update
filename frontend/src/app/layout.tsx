import React from "react";
import type { Metadata, Viewport } from "next";
import { AppMetaTags } from "../components/layout/AppMetaTags";
import "./globals.css";

export const metadata: Metadata = {
  title: "MJC Player",
  description: "MJC Player – controlador de música em estilo glass",
  icons: { icon: "/botao-play.ico" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout(props: { children: React.ReactNode }): React.ReactElement {
  const { children } = props;

  return (
    <html lang="pt" className="app-html" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/RecordTypeX/RecordTypeXVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Inline style ensures opacity:0 is applied before any external CSS arrives */}
        <style dangerouslySetInnerHTML={{ __html: ".fonts-loading .app-body{opacity:0}" }} />
        {/* Block paint until fonts are ready — eliminates FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('fonts-loading');" +
              "document.fonts.ready.then(function(){" +
              "document.documentElement.classList.remove('fonts-loading');" +
              "document.documentElement.classList.add('fonts-ready');" +
              "});",
          }}
        />
      </head>
      <body className="app-body">
        <svg className="futuristic-texture-filter" aria-hidden>
          <filter id="advanced-texture">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.7"
              numOctaves="3"
              result="noise"
            />
            <feSpecularLighting
              in="noise"
              surfaceScale="5"
              specularConstant="2.5"
              specularExponent="28"
              lightingColor="#fff"
              result="specular"
            >
              <fePointLight x="50" y="50" z="100" />
            </feSpecularLighting>
            <feComposite
              in="specular"
              in2="SourceGraphic"
              operator="in"
              result="litNoise"
            />
            <feBlend in="SourceGraphic" in2="litNoise" mode="overlay" />
          </filter>
        </svg>
        <AppMetaTags />
        <div className="app-shell">
          <main className="app-main">
            <div className="futuristic-pattern" aria-hidden>
              <span className="ripple-overlay" />
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
