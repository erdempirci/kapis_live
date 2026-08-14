import './globals.css';
import './kapis-v2.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'KAPIŞ — Tarafını seç.',description:'Gündemdeki spor, dizi, müzik, teknoloji, ekonomi, şehir, yaşam ve viral internet konularını oylamaya dönüştüren sosyal görüş ve tahmin platformu.',icons:{icon:'/icon.svg',apple:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}
