'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

type Candidate={id:string;source_name:string|null;source_url:string|null;raw_topic:string;proposed_question:string;proposed_type:'tercih'|'gorus'|'tahmin';category:string;left_label:string;right_label:string;status:string;created_at:string};
const empty={source_name:'TrendFlow',source_url:'',raw_topic:'',proposed_question:'',proposed_type:'tercih',category:'Viral/Eğlence',left_label:'Evet',right_label:'Hayır'};

export default function AdminPage(){
 const [loading,setLoading]=useState(true),[isAdmin,setIsAdmin]=useState(false),[canClaim,setCanClaim]=useState(false),[items,setItems]=useState<Candidate[]>([]),[msg,setMsg]=useState(''),[form,setForm]=useState<any>(empty);
 useEffect(()=>{void boot()},[]);
 async function boot(){
  let {data:s}=await supabase.auth.getSession();
  if(!s.session){const {data}=await supabase.auth.signInAnonymously();s={session:data.session}}
  const {data:ok}=await supabase.rpc('kapis_is_admin');
  setIsAdmin(!!ok);setCanClaim(!ok);if(ok)await load();setLoading(false);
 }
 async function claim(){const {data,error}=await supabase.rpc('kapis_claim_first_admin');if(error)return setMsg(error.message);if(data){setIsAdmin(true);setCanClaim(false);await load();setMsg('Yönetici hesabı etkinleştirildi ✅')}}
 async function load(){const {data,error}=await supabase.rpc('kapis_admin_candidates');if(error)return setMsg(error.message);setItems(data??[])}
 async function add(){if(!form.raw_topic||!form.proposed_question||!form.left_label||!form.right_label)return setMsg('Konu, soru ve iki taraf zorunlu.');const {error}=await supabase.rpc('kapis_admin_add_candidate',{p_source_name:form.source_name,p_source_url:form.source_url,p_raw_topic:form.raw_topic,p_question:form.proposed_question,p_type:form.proposed_type,p_category:form.category,p_left:form.left_label,p_right:form.right_label});if(error)return setMsg(error.message);setForm(empty);setMsg('Aday havuza eklendi ✅');await load()}
 async function action(c:Candidate,a:'save'|'approve'|'reject',hours=24){const {error}=await supabase.rpc('kapis_admin_candidate_action',{p_id:c.id,p_action:a,p_question:c.proposed_question,p_type:c.proposed_type,p_category:c.category,p_left:c.left_label,p_right:c.right_label,p_duration_hours:hours});if(error)return setMsg(error.message);setMsg(a==='approve'?'Kapış yayına alındı 🚀':a==='reject'?'Aday reddedildi.':'Değişiklikler kaydedildi.');await load()}
 function patch(id:string,key:keyof Candidate,value:string){setItems(v=>v.map(x=>x.id===id?{...x,[key]:value}:x))}
 if(loading)return <main className="adminPage"><h1>KAPIŞ Admin</h1><p>Yükleniyor…</p></main>;
 if(!isAdmin)return <main className="adminPage"><h1>KAPIŞ Admin</h1><div className="adminCard"><p>Bu ekran yalnızca yönetici hesabına açık.</p>{canClaim&&<button className="adminPrimary" onClick={claim}>Bu hesabı yönetici yap</button>}<p className="adminMsg">{msg}</p></div></main>;
 return <main className="adminPage"><div className="adminHead"><div><h1>KAPIŞ Admin</h1><p>TrendFlow → aday soru → onay → yayındaki Kapış</p></div><a href="/">← Uygulamaya dön</a></div>
  <section className="adminCard"><h2>+ Yeni aday</h2><div className="adminGrid"><input placeholder="Kaynak" value={form.source_name} onChange={e=>setForm({...form,source_name:e.target.value})}/><input placeholder="Kaynak URL" value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})}/><input className="span2" placeholder="Ham gündem / konu" value={form.raw_topic} onChange={e=>setForm({...form,raw_topic:e.target.value})}/><input className="span2" placeholder="AI'ın önerdiği tarafsız soru" value={form.proposed_question} onChange={e=>setForm({...form,proposed_question:e.target.value})}/><select value={form.proposed_type} onChange={e=>setForm({...form,proposed_type:e.target.value})}><option value="tercih">Tercih</option><option value="gorus">Görüş</option><option value="tahmin">Tahmin</option></select><input placeholder="Kategori" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/><input placeholder="Sol taraf" value={form.left_label} onChange={e=>setForm({...form,left_label:e.target.value})}/><input placeholder="Sağ taraf" value={form.right_label} onChange={e=>setForm({...form,right_label:e.target.value})}/></div><button className="adminPrimary" onClick={add}>Aday havuza ekle</button></section>
  <section><div className="adminTitle"><h2>Aday havuzu</h2><button onClick={load}>Yenile</button></div>{items.length===0&&<div className="adminCard">Henüz aday yok.</div>}{items.map(c=><article className={`adminCard candidate ${c.status}`} key={c.id}><div className="candidateTop"><span>{c.status.toUpperCase()}</span><small>{c.source_name||'Kaynak yok'} • {new Date(c.created_at).toLocaleString('tr-TR')}</small></div><input value={c.raw_topic} disabled/><textarea value={c.proposed_question} onChange={e=>patch(c.id,'proposed_question',e.target.value)}/><div className="adminGrid"><select value={c.proposed_type} onChange={e=>patch(c.id,'proposed_type',e.target.value)}><option value="tercih">Tercih</option><option value="gorus">Görüş</option><option value="tahmin">Tahmin</option></select><input value={c.category} onChange={e=>patch(c.id,'category',e.target.value)}/><input value={c.left_label} onChange={e=>patch(c.id,'left_label',e.target.value)}/><input value={c.right_label} onChange={e=>patch(c.id,'right_label',e.target.value)}/></div><div className="adminActions"><button onClick={()=>action(c,'save')}>Kaydet</button><button className="reject" onClick={()=>action(c,'reject')}>Reddet</button><button className="publish" onClick={()=>action(c,'approve',24)}>24 saat yayınla</button><button className="publish" onClick={()=>action(c,'approve',168)}>7 gün yayınla</button></div>{c.source_url&&<a className="sourceLink" href={c.source_url} target="_blank" rel="noreferrer">Kaynağı aç ↗</a>}</article>)}</section>
  {msg&&<div className="adminToast">{msg}</div>}
 </main>
}
