'use client';

import {useEffect,useState} from 'react';
import {createClient} from '@supabase/supabase-js';

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

export default function ChallengePage({params}:{params:Promise<{token:string}>}){
 const [msg,setMsg]=useState('Meydan okuma açılıyor…');
 useEffect(()=>{void (async()=>{const {token}=await params;const {data,error}=await supabase.rpc('kapis_resolve_challenge',{p_token:token});const row=data?.[0];if(error||!row){setMsg('Bu meydan okuma artık aktif değil.');return}localStorage.setItem('kapis_challenge_token',token);location.replace(`/?matchup=${row.matchup_id}&challenge=${encodeURIComponent(token)}`)})()},[params]);
 return <main className="center"><div className="kapisLogo"><span className="logoMark"><i>K</i><b>VS</b></span><strong>KAPIŞ</strong></div><h1>⚔️ Meydan Okuma</h1><p className="muted">{msg}</p></main>
}
