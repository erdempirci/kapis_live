import './globals.css';
import './kapis-v2.css';
import type {Metadata,Viewport} from 'next';

export const metadata:Metadata={
 title:'KAPIŞ — Tarafını seç.',
 description:'Tarafını seç. Gündemi belirle.',
 manifest:'/manifest.webmanifest',
 applicationName:'KAPIŞ',
 appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'KAPIŞ'},
 formatDetection:{telephone:false},
 icons:{icon:[{url:'/icon-192.png',sizes:'192x192',type:'image/png'}],apple:[{url:'/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]}
};
export const viewport:Viewport={width:'device-width',initialScale:1,maximumScale:1,viewportFit:'cover',themeColor:'#071426',colorScheme:'dark'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}
