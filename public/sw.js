const CACHE='kapis-shell-v3';
const SHELL=['/','/offline','/manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const req=event.request;const url=new URL(req.url);
 if(req.method!=='GET')return;
 if(url.hostname.includes('supabase.co'))return;
 if(url.pathname.startsWith('/rest/')||url.pathname.startsWith('/auth/'))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res}).catch(()=>caches.match(req).then(r=>r||caches.match('/offline'))));return;
 }
 if(url.origin===self.location.origin){
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok&&(url.pathname.startsWith('/_next/static/')||url.pathname.match(/\.(?:css|js|png|svg|ico|webp)$/))){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res})));}
});
