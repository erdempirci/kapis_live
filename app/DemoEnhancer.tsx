'use client';

import {useEffect} from 'react';
import {createClient} from '@supabase/supabase-js';

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h>>>0)}
function compact(n:number){return `${(n/1000).toFixed(1)}K`}

export default function DemoEnhancer(){
 useEffect(()=>{
  let stopped=false;

  function decorateDemoVotes(){
   document.querySelectorAll('article').forEach(article=>{
    const title=article.querySelector('.question')?.textContent?.trim()||'';
    const buttons=article.querySelectorAll<HTMLButtonElement>('.duel > button');
    if(!title||buttons.length<2)return;
    const leftPct=Number((buttons[0].querySelector('em')?.textContent||'50').replace(/\D/g,''))||50;
    const total=155000+(hash(title)%42000);
    const left=Math.round(total*leftPct/100),right=total-left;
    const leftSmall=buttons[0].querySelector('small'),rightSmall=buttons[1].querySelector('small');
    if(leftSmall)leftSmall.textContent=`${compact(left)} oy`;
    if(rightSmall)rightSmall.textContent=`${compact(right)} oy`;
   });
   const live=document.querySelector('.live');
   if(live&&live.textContent?.includes('CANLI'))live.innerHTML='<i></i> CANLI • 2.4M oy';
  }

  async function openSharedMatchup(){
   const id=new URLSearchParams(location.search).get('matchup');
   if(!id)return;
   const {data}=await supabase.from('kapis_matchups').select('title').eq('id',id).maybeSingle();
   if(!data?.title||stopped)return;
   let tries=0;
   const focus=()=>{
    tries++;
    const card=[...document.querySelectorAll('article')].find(a=>a.querySelector('.question')?.textContent?.trim()===data.title);
    if(card){card.classList.add('sharedMatchupFocus');card.scrollIntoView({behavior:'smooth',block:'center'});return}
    if(tries<20)setTimeout(focus,250);
   };
   focus();
  }

  async function announceNewMatchups(){
   const {data}=await supabase.from('kapis_matchups').select('published_at').eq('status','active').order('published_at',{ascending:false}).limit(1).maybeSingle();
   const latest=data?.published_at;
   if(!latest)return;
   const seen=localStorage.getItem('kapis_latest_seen');
   localStorage.setItem('kapis_latest_seen',latest);
   if(!seen){
    setTimeout(()=>window.dispatchEvent(new CustomEvent('kapis-demo-toast',{detail:'🔥 Yeni Kapışmalar geldi! Tarafını seç.'})),900);
    if('Notification'in window&&Notification.permission==='granted')new Notification('KAPIŞ 🔥',{body:'Yeni Kapışmalar geldi. Tarafını seç!'});
   }else if(latest>seen){
    window.dispatchEvent(new CustomEvent('kapis-demo-toast',{detail:'🔥 Yeni Kapışmalar geldi! Tarafını seç.'}));
    if('Notification'in window&&Notification.permission==='granted')new Notification('KAPIŞ 🔥',{body:'Yeni Kapışmalar geldi. Tarafını seç!'});
   }
  }

  const observer=new MutationObserver(decorateDemoVotes);
  observer.observe(document.body,{childList:true,subtree:true});
  decorateDemoVotes();
  void openSharedMatchup();
  void announceNewMatchups();

  const toastHandler=(e:Event)=>{
   const detail=(e as CustomEvent<string>).detail;
   let el=document.getElementById('kapis-demo-toast');
   if(!el){el=document.createElement('div');el.id='kapis-demo-toast';document.body.appendChild(el)}
   el.textContent=detail;el.className='kapisDemoToast show';
   setTimeout(()=>el?.classList.remove('show'),4200);
  };
  window.addEventListener('kapis-demo-toast',toastHandler);
  return()=>{stopped=true;observer.disconnect();window.removeEventListener('kapis-demo-toast',toastHandler)};
 },[]);
 return <style>{`.sharedMatchupFocus{outline:2px solid #ffb020;box-shadow:0 0 0 6px rgba(255,176,32,.13),0 20px 60px rgba(0,0,0,.35);animation:kapisFocus 1.1s ease 2}.kapisDemoToast{position:fixed;z-index:99999;left:16px;right:16px;top:max(18px,env(safe-area-inset-top));margin:auto;max-width:520px;padding:14px 16px;border-radius:16px;background:#10233d;color:white;font-weight:800;box-shadow:0 14px 45px rgba(0,0,0,.35);transform:translateY(-140%);opacity:0;transition:.3s}.kapisDemoToast.show{transform:translateY(0);opacity:1}@keyframes kapisFocus{50%{transform:scale(1.015)}}`}</style>
}
