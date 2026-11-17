import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import { Shell } from '@/components/shell/Shell';
import './globals.css';

const figtree = Figtree({ variable: '--font-figtree', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Arzuman Brothers, call center demo v1',
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📞</text></svg>" },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

/* Applies the stored theme before the first paint (abc-demo-theme, as in the artifact's BOOT). */
const themeScript = `try{var t=JSON.parse(localStorage.getItem('abc-demo-theme'));if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
