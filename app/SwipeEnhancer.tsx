'use client';

import {useEffect,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const PUBLIC_ORIGIN='https://kapis-live-schoolflow-ai.vercel.app';

type Point={x:number;y:number};

export default function SwipeEnhancer(){
 const [undoVisible,setUndoVisible]=useState(false);
 const [resultText,setResultText]=useState('');
 const active=useRef<HTMLElement|null>(null);
 const start=useRef<Point|null>(null);
 const thresholdBuzzed=useRef(false);
 const cleanupCard=useRef<(()=>void)|null>(null);
 const interactionLocked=useRef(false);
 const suppressClickUntil=useRef(0);
 const programmaticVote=useRef(false);

 useEffect(()=>{
  const observer=new MutationObserver(()=>{bindTopCard();patchFeedbackCopy()});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  bindTopCard();patchFeedbackCopy();
  const onGlobalClick=(e:MouseEvent)=>{
   const btn=(e.target as HTMLElement).closest<HTMLButtonElement>('button');
   if(!btn)return;
   const txt=(btn.textContent||'').trim();
   if(txt.includes('Davet bağlantımı paylaş')||txt.includes('Arkadaşına Meydan Oku')){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void shareCleanInvite();
   }
  };
  document.addEventListener('click',onGlobalClick,true);
  return()=>{observer.disconnect();cleanupCard.current?.();document.removeEventListener('click',onGlobalClick,true)};
 },[]);

 function track(event:string,context:Record<string,unknown>={}){void supabase.rpc('kapis_track_event',{p_event:event,p_context:context})}

 async function shareCleanInvite(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return;
  const {data}=await supabase.from('kapis_profiles').select('nickname').eq('user_id',user.id).single();
  const nickname=(data?.nickname||'').trim();
  if(!nickname)return;
  const url=`${PUBLIC_ORIGIN}/r/${encodeURIComponent(nickname)}`;
  const text='Kapış’a davetlisin 🔥 Tarafını seç.';
  try{
   if(navigator.share)await navigator.share({title:'KAPIŞ',text,url});
   else await navigator.clipboard.writeText(`${text} ${url}`);
   setResultText('Davet bağlantın hazır 🚀');setTimeout(()=>setResultText(''),1800);
  }catch(e:any){if(e?.name!=='AbortError'){setResultText('Paylaşım açılamadı.');setTimeout(()=>setResultText(''),1800)}}
 }

 function patchFeedbackCopy(){
  document.querySelectorAll<HTMLElement>('.feedbackSheet').forEach(sheet=>{
   const h2=sheet.querySelector('h2');
   const p=sheet.querySelector('p');
   const label=sheet.querySelector('label');
   if(!h2)return;
   const text=h2.textContent||'';
   if(text.includes('İlk 5 Kapışını')){
    h2.textContent='İlk 10 oyunu tamamladın 🎉';
    if(p)p.textContent='Kapış’ı biraz kullandın. İlk izlenimini yalnızca bir kez soruyoruz.';
    if(label)label.textContent='Şu an ilk değiştirmemizi istediğin şey ne?';
   }else if(text.includes('50 Kapış yaptın')){
    h2.textContent='Kapış’ta 10. kullanım günün 🔥';
    if(p)p.textContent='İlk görüşüne hâlâ katılıyor musun? Bu, sana soracağımız ikinci ve son genel ürün geri bildirimi.';
    if(label)label.textContent='10 gün sonra neyi değiştirmemizi istersin?';
   }
  });
 }

 function bindTopCard(){
  const home=document.querySelector('main .hero');
  if(!home)return;
  const cards=[...document.querySelectorAll<HTMLElement>('main .cards article')].filter(el=>getComputedStyle(el).display!=='none'&&el.style.opacity!=='0');
  const card=cards[0];
  if(!card||card===active.current)return;
  cleanupCard.current?.();active.current=card;interactionLocked.current=false;prepareStableOrder(card);track('card_shown');card.classList.add('swipeCardActive');

  const onDown=(e:PointerEvent)=>{if(interactionLocked.current)return;const target=e.target as HTMLElement;if(target.closest('input,textarea,a,.shareMini'))return;start.current={x:e.clientX,y:e.clientY};thresholdBuzzed.current=false;card.setPointerCapture?.(e.pointerId)};
  const onMove=(e:PointerEvent)=>{if(!start.current||interactionLocked.current)return;const dx=e.clientX-start.current.x,dy=e.clientY-start.current.y;const w=Math.max(card.clientWidth,280);const horizontal=Math.abs(dx)>=Math.abs(dy);if(Math.abs(dx)>7||Math.abs(dy)>7)e.preventDefault();card.style.transform=`translate3d(${dx}px,${Math.min(dy,70)}px,0) rotate(${dx/28}deg)`;const ratio=Math.abs(dx)/w;card.classList.toggle('dragLeft',horizontal&&dx<0);card.classList.toggle('dragRight',horizontal&&dx>0);card.classList.toggle('dragUp',!horizontal&&dy<-45);if((ratio>.32||dy<-95)&&!thresholdBuzzed.current){thresholdBuzzed.current=true;if('vibrate'in navigator)navigator.vibrate?.(20)}};
  const onUp=(e:PointerEvent)=>{if(!start.current||interactionLocked.current)return;const dx=e.clientX-start.current.x,dy=e.clientY-start.current.y;start.current=null;const w=Math.max(card.clientWidth,280);const horizontal=Math.abs(dx)>=Math.abs(dy);const moved=Math.hypot(dx,dy)>10;if(!horizontal&&dy<-95){interactionLocked.current=true;suppressClickUntil.current=Date.now()+700;track('swipe_up');animateOut(card,0,-window.innerHeight*.45);setTimeout(()=>{card.remove();interactionLocked.current=false},220);return resetClasses(card)}if(horizontal&&Math.abs(dx)/w>=.32){interactionLocked.current=true;suppressClickUntil.current=Date.now()+800;const buttons=[...card.querySelectorAll<HTMLButtonElement>('.duel button')];const visuallySorted=buttons.sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);const chosen=dx<0?visuallySorted[0]:visuallySorted[visuallySorted.length-1];track(dx<0?'swipe_left':'swipe_right');animateOut(card,dx<0?-window.innerWidth*1.2:window.innerWidth*1.2,dy);setTimeout(()=>{if(chosen&&!chosen.disabled){programmaticVote.current=true;chosen.click();programmaticVote.current=false;showUndo();showResult(card)}},100);return}if(moved)suppressClickUntil.current=Date.now()+350;card.style.transform='';resetClasses(card)};
  const onClick=(e:MouseEvent)=>{const btn=(e.target as HTMLElement).closest<HTMLButtonElement>('.duel button');if(!btn)return;if(programmaticVote.current)return;if(Date.now()<suppressClickUntil.current||interactionLocked.current){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return}track('tap_vote');showUndo();showResult(card);interactionLocked.current=true;setTimeout(()=>{interactionLocked.current=false},350)};

  card.addEventListener('pointerdown',onDown);card.addEventListener('pointermove',onMove,{passive:false});card.addEventListener('pointerup',onUp);card.addEventListener('pointercancel',onUp);card.addEventListener('click',onClick,true);
  cleanupCard.current=()=>{card.removeEventListener('pointerdown',onDown);card.removeEventListener('pointermove',onMove);card.removeEventListener('pointerup',onUp);card.removeEventListener('pointercancel',onUp);card.removeEventListener('click',onClick,true)};
 }

 function prepareStableOrder(card:HTMLElement){const q=card.querySelector('.question')?.textContent||card.textContent||'';const key='kapis_side_'+simpleHash(q);let swap=localStorage.getItem(key);if(swap===null){swap=Math.random()<.5?'1':'0';localStorage.setItem(key,swap)}const duel=card.querySelector<HTMLElement>('.duel');if(!duel)return;const children=[...duel.children] as HTMLElement[];if(children.length<3)return;children[0].style.order=swap==='1'?'3':'1';children[1].style.order='2';children[2].style.order=swap==='1'?'1':'3'}
 function simpleHash(s:string){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h).toString(36)}
 function resetClasses(card:HTMLElement){card.classList.remove('dragLeft','dragRight','dragUp');card.style.transform=''}
 function animateOut(card:HTMLElement,x:number,y:number){card.style.transition='transform .22s ease,opacity .22s ease';card.style.transform=`translate3d(${x}px,${y}px,0) rotate(${x/28}deg)`;card.style.opacity='0'}
 function showUndo(){setUndoVisible(true);setTimeout(()=>setUndoVisible(false),3000)}
 function showResult(card:HTMLElement){const votes=[...card.querySelectorAll<HTMLElement>('.duel small')].map(x=>parseInt(x.textContent||'0')||0);const total=votes.reduce((a,b)=>a+b,0)+1;setResultText(`Oyun kaydedildi • yaklaşık ${total} toplam oy`);track('results_viewed');setTimeout(()=>setResultText(''),1800)}
 async function undo(){const {data,error}=await supabase.rpc('kapis_undo_last_vote');if(error){setUndoVisible(false);return}if(data?.[0]?.undone){track('vote_undo');setUndoVisible(false);location.reload()}}

 return <>{resultText&&<div className="swipeResultToast" role="status">{resultText}</div>}{undoVisible&&<div className="undoBar"><span>Oyun kaydedildi</span><button onClick={undo}>Geri Al</button></div>}</>;
}
