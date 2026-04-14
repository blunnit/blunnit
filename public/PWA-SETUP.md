# BLUNNIT Mirror — PWA Setup Guide

## 1. Copy files into your project

Copy everything from this folder into your Next.js `public/` directory:

```
public/
├── favicon.ico
├── manifest.json
├── apple-touch-icon.png
└── icons/
    ├── icon-16x16.png
    ├── icon-32x32.png
    ├── icon-48x48.png
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

Move `apple-touch-icon.png` to `public/` root (iOS looks for it there).
Move `favicon.ico` to `public/` root.
Create `public/icons/` and put all the `icon-*.png` files in it.


## 2. Add meta tags to your layout

In `app/layout.tsx`, add these inside `<head>` (or use Next.js `metadata` export):

### Option A — Next.js Metadata API (recommended)

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "BLUNNIT Mirror",
  description: "Pierce The Illusion",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mirror",
  },
};
```

### Option B — Raw HTML (if you need manual control)

```html
<link rel="manifest" href="/manifest.json" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/icons/icon-32x32.png" type="image/png" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Mirror" />
<meta name="theme-color" content="#000000" />
```


## 3. Test on iPhone

1. Deploy to Vercel (push to GitHub)
2. Open `blunnit.vercel.app` in Safari on your iPhone
3. Tap Share → "Add to Home Screen"
4. The app should appear with your heart logo and open full-screen (no Safari UI)


## 4. Link Dashboard (5cott5tern)

Use `icon-512x512.png` as the thumbnail/icon for your BLUNNIT Mirror link.
Set the URL to `https://blunnit.vercel.app` (or `https://mirror.blunnit.com` once DNS resolves).


## Notes

- iOS requires Safari for "Add to Home Screen" — Chrome/Firefox won't work
- `black-translucent` status bar blends the notch area into your black background
- `userScalable: false` prevents accidental pinch-zoom in the app experience
- The `"purpose": "any"` on 192 and 512 icons covers standard + maskable contexts
