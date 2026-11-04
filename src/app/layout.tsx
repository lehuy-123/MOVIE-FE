import type { Metadata } from 'next';
import { Geist_Mono, Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CGV Cinema',
  description:
    'Rạp chiếu phim ảo 3D CGV Cinema thời gian thực với màn chiếu YouTube 3D tương tác.',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      translate="no"
      className={`${beVietnam.variable} ${geistMono.variable} h-full antialiased dark notranslate`}
    >
      <head>
        <link rel="icon" href="/icon.png?v=2" type="image/png" sizes="128x128" />
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="apple-touch-icon" href="/icon.png?v=2" />
      </head>
      <body className="h-full w-full overflow-hidden bg-[#07090e] text-white">
        {children}
      </body>
    </html>
  );
}
