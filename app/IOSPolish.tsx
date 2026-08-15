'use client';

import {useEffect} from 'react';

const icons=[
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5z"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m14.7 9.3-2 5.4-5.4 2 2-5.4z"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3a4 4 0 0 1-8 0zM9.5 15h5M12 11v4M8 20h8"/><path d="M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21v4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
];

function cleanHeading(el:Element){
  const txt=el.textContent||'';
  const cleaned=txt.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u,'').trim();
  if(cleaned&&cleaned!==txt.trim())el.textContent=cleaned;
}

export default function IOSPolish(){
 useEffect(()=>{
  const apply=()=>{
   const nav=document.querySelector('.fiveNav');
   if(nav){
    [...nav.querySelectorAll<HTMLButtonElement>('button')].forEach((btn,i)=>{
      if(btn.querySelector('.iosNavIcon'))return;
      [...btn.childNodes].forEach(n=>{if(n.nodeType===Node.TEXT_NODE)n.textContent=''});
      const wrap=document.createElement('span');
      wrap.className='iosNavIcon';
      wrap.innerHTML=icons[i]||icons[0];
      btn.insertBefore(wrap,btn.firstChild);
    });
   }
   document.querySelectorAll('section>h2').forEach(cleanHeading);
  };
  const mo=new MutationObserver(apply);mo.observe(document.body,{subtree:true,childList:true});apply();
  return()=>mo.disconnect();
 },[]);
 return null;
}
