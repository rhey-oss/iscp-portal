import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getBranding } from "@/lib/branding";
import { SCHOOL_NAME, SCHOOL_SHORT_NAME } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding().catch(() => null);
  const name = branding?.schoolName ?? SCHOOL_NAME;
  const shortName = branding?.shortName ?? SCHOOL_SHORT_NAME;

  return {
    title: {
      default: `${name} · Portal`,
      template: `%s · ${shortName}`,
    },
    description: branding?.tagline
      ? branding.tagline
      : "QR and PIN attendance, grades, tasks, announcements, and parent alerts for students, instructors, and guardians.",
    applicationName: name,
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const branding = await getBranding().catch(() => null);

  const version = branding?.version ?? "0";
  const style = {
    "--login-bg": branding?.loginBackgroundMediaId
      ? `url(/api/branding/loginBackground?v=${version})`
      : "none",
    "--app-bg": branding?.appBackgroundMediaId
      ? `url(/api/branding/appBackground?v=${version})`
      : "none",
  } as CSSProperties;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={branding?.theme ?? "ocean"}
      style={style}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('college-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.add('light')}}catch(e){}})();`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}