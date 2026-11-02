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
  title: '3D Virtual Cinema - Rạp Chiếu Phim Ảo Đa Người Dùng',
  description:
    'Rạp chiếu phim ảo 3D thời gian thực với màn chiếu YouTube 3D tương tác, Three.js, React Three Fiber và Next.js.',
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
      <body className="h-full w-full overflow-hidden bg-[#07090e] text-white">
        {children}
      </body>
    </html>
  );
}
