'use client';

import {useEffect,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
type Point={x:number;y:number};
type GameState={matchupId:string;title:string;choice:'left'|'right';choiceLabel:string;otherLabel:string;leftVotes:number;rightVotes:number;totalVotes:number;difference:number;lastHourVotes:number;myInvites:number;mySameSide:number}|null;

export default function SwipeEnhancer(){
 const [undoVisible,setUndoVisible]=useState(false);
 const [game,setGame]=useState<GameState>(null);
 const active=useRef<HTMLElement|null>(null);
 const start=useRef<Point|null>(null);
 const thresholdBuzzed=useRef(false);
 const cleanupCard=useRef<(()=>void)|null>(null);
 const interactionLocked=useRef(false);
 const suppressClickUntil=useRef(0);
 const programmaticVote=useRef(false);

 useEffect(()=>{
  const style=document.createElement('style');
  style.textContent=`.gameOverlay{position:fixed;z-index:80;inset:0;background:#071426eF;display:flex;align-items:flex-end;justify-content:center;padding:16px;padding-bottom:calc(18px + env(safe-area-inset-bottom))}.gameSheet{width:min(430px,100%);background:linear-gradient(180deg,#10213a,#091625);border:1px solid #294763;border-radius:24px;padding:20px;box-shadow:0 24px 80px #000b}.gameEyebrow{font-size:11px;font-weight:900;letter-spacing:.12em;color:#8dbfff}.gameSheet h2{font-size:24px;line-height:1.15;margin:8px 0}.gameSheet p{color:#c3d0df;line-height:1.45}.gameScore{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;background:#07111d;border-radius:18px;padding:14px;margin:14px 0}.gameScore div{min-width:0}.gameScore div:last-child{text-align:right}.gameScore b{display:block;font-size:18px;overflow-wrap:anywhere}.gameScore span{font-size:12px;color:#93a6bc}.gamePulse{background:#0b1b2e;border-radius:14px;padding:12px;margin:12px 0;color:#d9e7f7;font-weight:750}.gameStats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.gameStats div{background:#081422;border-radius:12px;padding:10px;text-align:center}.gameStats b{display:block;font-size:16px}.gameStats span{display:block;font-size:9px;color:#8395aa;margin-top:3px}.challengeBtn{width:100%;border:0;border-radius:14px;background:linear-gradient(90deg,#1687FF,#FF6B18);color:#fff;padding:14px;font-size:16px;font-weight:900;min-height:50px}.nextBtn{width:100%;margin-top:8px;border:1px solid #2c4560;background:#0b1828;color:#c4d3e6;border-radius:14px;padding:12px;font-weight:800;min-height:46px}.gameHint{font-size:10px!important;color:#7f91a6!important;text-align:center;margin:10px 0 0!important}@media(prefers-reduced-motion:reduce){.gameOverlay,.gameSheet{animation:none!important;transition:none!important}}`;
  document.head.appendChild(style);
  const observer=new MutationObserver(()=>{bindTopCard();patchFeedbackCopy()});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  bindTopCard();patchFeedbackCopy();captureChallengeToken();
  return()=>{style.remove();observer.disconnect();cleanupCard.current?.()};
 },[]);

 function captureChallengeToken(){const p=new URLSearchParams(location.search);const token=p.get('challenge');if(token)localStorage.setItem('kapis_challenge_token',token)}
 function track(event:string,context:Record<string,unknown>={}){void supabase.rpc('kapis_track_event',{p_event:event,p_context:context})}

 function patchFeedbackCopy(){
  document.querySelectorAll<HTMLElement>('.feedbackSheet').forEach(sheet=>{
   const h2=sheet.querySelector('h2'),p=sheet.querySelector('p'),label=sheet.querySelector('label');if(!h2)return;
   const text=h2.textContent||'';
   if(text.includes('İlk 5 Kapışını')){h2.textContent='İlk 10 oyunu tamamladın 🎉';if(p)p.textContent='Kapış’ı biraz kullandın. İlk izlenimini yalnızca bir kez soruyoruz.';if(label)label.textContent='Şu an ilk değiştirmemizi istediğin şey ne?'}
   else if(text.includes('50 Kapış yaptın')){h2.textContent='Kapış’ta 10. kullanım günün 🔥';if(p)p.textContent='İlk görüşüne hâlâ katılıyor musun? Bu, sana soracağımız ikinci ve son genel ürün geri bildirimi.';if(label)label.textContent='10 gün sonra neyi değiştirmemizi istersin?'}
  });
 }

 function bindTopCard(){
  const home=document.querySelector('main .hero');if(!home)return;
  const cards=[...document.querySelectorAll<HTMLElement>('main .cards article')].filter(el=>getComputedStyle(el).display!=='none'&&el.style.opacity!=='0');
  const card=cards[0];if(!card||card===active.current)return;
  cleanupCard.current?.();active.current=card;interactionLocked.current=false;prepareStableOrder(card);track('card_shown');card.classList.add('swipeCardActive');

  const onDown=(e:PointerEvent)=>{if(interactionLocked.current)return;const target=e.target as HTMLElement;if(target.closest('input,textarea,a,.shareMini'))return;start.current={x:e.clientX,y:e.clientY};thresholdBuzzed.current=false;card.setPointerCapture?.(e.pointerId)};
  const onMove=(e:PointerEvent)=>{if(!start.current||interactionLocked.current)return;const dx=e.clientX-start.current.x,dy=e.clientY-start.current.y,w=Math.max(card.clientWidth,280),horizontal=Math.abs(dx)>=Math.abs(dy);if(Math.abs(dx)>7||Math.abs(dy)>7)e.preventDefault();card.style.transform=`translate3d(${dx}px,${Math.min(dy,70)}px,0) rotate(${dx/28}deg)`;const ratio=Math.abs(dx)/w;card.classList.toggle('dragLeft',horizontal&&dx<0);card.classList.toggle('dragRight',horizontal&&dx>0);card.classList.toggle('dragUp',!horizontal&&dy<-45);if((ratio>.32||dy<-95)&&!thresholdBuzzed.current){thresholdBuzzed.current=true;if('vibrate'in navigator)navigator.vibrate?.(20)}};
  const onUp=(e:PointerEvent)=>{if(!start.current||interactionLocked.current)return;const dx=e.clientX-start.current.x,dy=e.clientY-start.current.y;start.current=null;const w=Math.max(card.clientWidth,280),horizontal=Math.abs(dx)>=Math.abs(dy),moved=Math.hypot(dx,dy)>10;
    if(!horizontal&&dy<-95){interactionLocked.current=true;suppressClickUntil.current=Date.now()+700;track('swipe_up');animateOut(card,0,-window.innerHeight*.45);setTimeout(()=>{card.remove();interactionLocked.current=false},220);return resetClasses(card)}
    if(horizontal&&Math.abs(dx)/w>=.32){interactionLocked.current=true;suppressClickUntil.current=Date.now()+800;const buttons=[...card.querySelectorAll<HTMLButtonElement>('.duel button')].sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);const chosen=dx<0?buttons[0]:buttons[buttons.length-1];track(dx<0?'swipe_left':'swipe_right');animateOut(card,dx<0?-window.innerWidth*1.2:window.innerWidth*1.2,dy);setTimeout(()=>{if(chosen&&!chosen.disabled){programmaticVote.current=true;chosen.click();programmaticVote.current=false;showUndo();void openGame(card,chosen)}},100);return}
    if(moved)suppressClickUntil.current=Date.now()+350;card.style.transform='';resetClasses(card)};
  const onClick=(e:MouseEvent)=>{const btn=(e.target as HTMLElement).closest<HTMLButtonElement>('.duel button');if(!btn)return;if(programmaticVote.current)return;if(Date.now()<suppressClickUntil.current||interactionLocked.current){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return}track('tap_vote');showUndo();void openGame(card,btn);interactionLocked.current=true;setTimeout(()=>{interactionLocked.current=false},350)};

  card.addEventListener('pointerdown',onDown);card.addEventListener('pointermove',onMove,{passive:false});card.addEventListener('pointerup',onUp);card.addEventListener('pointercancel',onUp);card.addEventListener('click',onClick,true);
  cleanupCard.current=()=>{card.removeEventListener('pointerdown',onDown);card.removeEventListener('pointermove',onMove);card.removeEventListener('pointerup',onUp);card.removeEventListener('pointercancel',onUp);card.removeEventListener('click',onClick,true)};
 }

 async function openGame(card:HTMLElement,btn:HTMLButtonElement){
  await new Promise(r=>setTimeout(r,260));
  const title=card.querySelector('.question')?.textContent?.trim()||'';
  const labels=[...card.querySelectorAll<HTMLButtonElement>('.duel button')].map(b=>b.querySelector('strong')?.textContent?.trim()||'');
  const choiceLabel=btn.querySelector('strong')?.textContent?.trim()||'';
  const side=(choiceLabel===labels[0]?'left':'right') as 'left'|'right';
  const {data:m}=await supabase.from('kapis_matchups').select('id,left_label,right_label').eq('title',title).limit(1).maybeSingle();if(!m)return;
  const actualSide=(choiceLabel===m.left_label?'left':'right') as 'left'|'right';
  const token=localStorage.getItem('kapis_challenge_token');if(token){await supabase.rpc('kapis_record_challenge_join',{p_token:token,p_choice:actualSide});localStorage.removeItem('kapis_challenge_token')}
  const {data:s}=await supabase.rpc('kapis_competition_snapshot',{p_matchup_id:m.id});const x=s?.[0];if(!x)return;
  setGame({matchupId:m.id,title,choice:actualSide,choiceLabel,otherLabel:actualSide==='left'?m.right_label:m.left_label,leftVotes:Number(x.left_votes),rightVotes:Number(x.right_votes),totalVotes:Number(x.total_votes),difference:Number(x.difference),lastHourVotes:Number(x.last_hour_votes),myInvites:Number(x.my_invites),mySameSide:Number(x.my_same_side)});track('results_viewed',{mode:'competition'});
 }

 function competitiveMessage(g:NonNullable<GameState>){const mine=g.choice==='left'?g.leftVotes:g.rightVotes,other=g.choice==='left'?g.rightVotes:g.leftVotes,d=Math.abs(mine-other);if(mine>other){if(d<=10)return '😱 Başa baş gidiyor. Farkı açmak için tarafını çağır!';return `👑 Tarafın lider! Fark ${d} oy. Önde kalmak için arkadaşlarını çağır.`}if(mine<other){if(d<=10)return `⚔️ Rakip sadece ${d} oy önde. Birkaç arkadaş sonucu değiştirebilir!`;return `🚨 Rakip ${d} oy önde. Tarafına destek lazım.`}return '🔥 Tam başa baş! Şimdi getireceğin tek oy bile liderliği değiştirebilir.'}

 async function challenge(){if(!game)return;const {data,error}=await supabase.rpc('kapis_create_challenge',{p_matchup_id:game.matchupId,p_choice:game.choice});if(error)return;const token=data?.[0]?.token;if(!token)return;const url=`${location.origin}/c/${token}`;const mine=game.choice==='left'?game.leftVotes:game.rightVotes,other=game.choice==='left'?game.rightVotes:game.leftVotes;const scoreLine=mine===other?'Skor tam başa baş 😱':mine<other?`${game.otherLabel} sadece ${other-mine} oy önde 😱`:`${game.choiceLabel} ${mine-other} oy önde 🔥`;const text=`Ben ${game.choiceLabel} tarafındayım 🔥\n${scoreLine}\nSen hangi taraftasın? Gel kapışalım ⚔️`;
  try{if(navigator.share)await navigator.share({title:'KAPIŞ — Meydan Okuma',text,url});else await navigator.clipboard.writeText(`${text}\n${url}`);track('shared',{kind:'challenge'});}catch(e:any){if(e?.name!=='AbortError')return}
 }

 function prepareStableOrder(card:HTMLElement){const q=card.querySelector('.question')?.textContent||card.textContent||'',key='kapis_side_'+simpleHash(q);let swap=localStorage.getItem(key);if(swap===null){swap=Math.random()<.5?'1':'0';localStorage.setItem(key,swap)}const duel=card.querySelector<HTMLElement>('.duel');if(!duel)return;const children=[...duel.children] as HTMLElement[];if(children.length<3)return;children[0].style.order=swap==='1'?'3':'1';children[1].style.order='2';children[2].style.order=swap==='1'?'1':'3'}
 function simpleHash(s:string){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h).toString(36)}
 function resetClasses(card:HTMLElement){card.classList.remove('dragLeft','dragRight','dragUp');card.style.transform=''}
 function animateOut(card:HTMLElement,x:number,y:number){card.style.transition='transform .22s ease,opacity .22s ease';card.style.transform=`translate3d(${x}px,${y}px,0) rotate(${x/28}deg)`;card.style.opacity='0'}
 function showUndo(){setUndoVisible(true);setTimeout(()=>setUndoVisible(false),3000)}
 async function undo(){const {data,error}=await supabase.rpc('kapis_undo_last_vote');if(error){setUndoVisible(false);return}if(data?.[0]?.undone){track('vote_undo');setUndoVisible(false);setGame(null);location.reload()}}

 return <>
  {game&&<div className="gameOverlay"><div className="gameSheet"><div className="gameEyebrow">⚔️ KAPIŞ BAŞLADI</div><h2>🔥 {game.choiceLabel} tarafına katıldın!</h2><div className="gameScore"><div><b>{game.choiceLabel}</b><span>{game.choice==='left'?game.leftVotes:game.rightVotes} oy</span></div><strong>VS</strong><div><b>{game.otherLabel}</b><span>{game.choice==='left'?game.rightVotes:game.leftVotes} oy</span></div></div><div className="gamePulse">{competitiveMessage(game)}</div><div className="gameStats"><div><b>{game.totalVotes}</b><span>kişi kapışıyor</span></div><div><b>{game.difference}</b><span>oy fark</span></div><div><b>{game.lastHourVotes}</b><span>son 1 saat</span></div></div>{game.myInvites>0&&<p>🔥 Bu kapışmaya {game.myInvites} kişi getirdin. ⚔️ {game.mySameSide} arkadaşın senin tarafına katıldı.</p>}<button className="challengeBtn" onClick={challenge}>⚔️ MEYDAN OKU / TARAFINA ÇAĞIR</button><button className="nextBtn" onClick={()=>setGame(null)}>Sıradaki Kapış →</button><p className="gameHint">Fikrini söyleme; tarafını seç.</p></div></div>}
  {undoVisible&&!game&&<div className="undoBar"><span>Oyun kaydedildi</span><button onClick={undo}>Geri Al</button></div>}
 </>;
}
