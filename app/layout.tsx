import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Kapış', description: 'Tarafını seç. Sonucu tahmin et. Sıralamada yüksel.' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}
