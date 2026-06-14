import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "joballa Admin",
  description: "joballa internal admin operations panel",
  icons: {
    icon: "/brand/joballa-panel-mark.png",
    shortcut: "/brand/joballa-panel-mark.png",
    apple: "/brand/joballa-panel-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = window.localStorage.getItem('joballa-theme');
                if (theme === 'dark') {
                  document.documentElement.setAttribute('data-joballa-theme', 'dark');
                } else if (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.setAttribute('data-joballa-theme', 'dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
