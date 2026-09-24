import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Newsreader, Oswald, Outfit } from "next/font/google";
import "./globals.css";

const display = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Rally — Household huddle for wildfire",
  description:
    "Don't wait for each other. Rally draws a live evacuation play: one rally lot, pickup chains, a go-window against the wind, and a neighbor mesh for whoever no car can reach.",
  applicationName: "Rally",
  keywords: ["wildfire", "evacuation", "household", "reunion", "emergency", "Young Coders Sphere"],
  openGraph: {
    title: "Rally — Don't wait for each other.",
    description:
      "A huddle engine for wildfire: NASA hotspots, live wind, real roads, and a solver that picks the one lot where the whole household can meet.",
    type: "website",
  },
  appleWebApp: { capable: true, title: "Rally", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#161310",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
