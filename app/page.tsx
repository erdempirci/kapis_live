'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, User } from '@supabase/supabase-js';

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);

type Matchup={id:string;title:string;category:string;left_label:string;right_label:string;ends_at:string;matchup_type:'tercih'|'gorus'|'tahmin';pos?:number;status?:string;resolved_at?:string|null;winning_choice?:string|null;prediction_result_at?:string|null;published_at?:string};
type Counts=Record<string,{left_votes:number;right_votes:number}>;
type ChoiceMap=Record<string,'left'|'right'>;
type Profile={user_id:string;nickname:string;display_name?:string|null;handle_code?:number|null;credits:number;xp?:number;points:number;current_streak:number;best_streak:number;total_votes?:number;total_predictions:number;correct_predictions:number;notifications_enabled?:boolean;new_topic_alerts?:boolean;result_alerts?:boolean;package_alerts?:boolean;streak_alerts?:boolean;referral_alerts?:boolean;comment_reply_alerts?:boolean;vibration_enabled?:boolean;sound_enabled?:boolean;quiet_hours_start?:string;quiet_hours_end?:string};
type Leader={nickname:string;points:number;total_predictions:number;correct_predictions:number};
type Stats={total_votes:number;total_predictions:number;correct_predictions:number;accuracy:number;best_streak:number;credits:number;general_rank:number};
type Expertise={category:string;total_predictions:number;correct_predictions:number;accuracy:number};
type Task={task_id:string;code:string;title:string;target:number;progress:number;reward_credits:number;completed:boolean;reward_claimed:boolean};
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};

const interests=['Futbol','Spor','Dizi & Film','Müzik','Teknoloji','Ekonomi','Oyun','Otomobil','Yemek','Seyahat','Moda & Güzellik','Şehir & Yaşam','Dünya Gündemi','Viral & Eğlence'];
const emoji:Record<string,string>={Futbol:'⚽',Spor:'🏀','Dizi & Film':'🎬',Müzik:'🎵',Teknoloji:'📱',Ekonomi:'📈',Oyun:'🎮',Otomobil:'🚗',Yemek:'🍔',Seyahat:'✈️','Moda & Güzellik':'✨','Şehir & Yaşam':'🏙️','Dünya Gündemi':'🌍','Viral & Eğlence':'🔥'};
const typeMeta={tercih:{label:'Tercih',icon:'⚖️'},gorus:{label:'Görüş',icon:'💬'},tahmin:{label:'Tahmin',icon:'🎯'}} as const;
function norm(c:string){if(c==='Film'||c==='Film/Dizi')return 'Dizi & Film';if(c==='Şehir'||c==='Şehir/Yaşam')return 'Şehir & Yaşam';if(c==='Moda/Güzellik')return 'Moda & Güzellik';if(c==='Viral/Eğlence')return 'Viral & Eğlence';return c;}
function deviceKey(){let k=localStorage.getItem('kapis_device_key');if(!k){k=crypto.randomUUID();localStorage.setItem('kapis_device_key',k);}return k;}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator&{standalone?:boolean}).standalone===true}

export default function Page(){
 const [user,setUser]=useState<User|null>(null),[profile,setProfile]=useState<Profile|null>(null),[matchups,setMatchups]=useState<Matchup[]>([]),[allMatchups,setAllMatchups]=useState<Matchup[]>([]),[dailyPackage,setDailyPackage]=useState<Matchup[]>([]),[showPackage,setShowPackage]=useState(false),[counts,setCounts]=useState<Counts>({}),[choices,setChoices]=useState<ChoiceMap>({}),[leaders,setLeaders]=useState<Leader[]>([]);
 const [stats,setStats]=useState<Stats|null>(null),[expertise,setExpertise]=useState<Expertise[]>([]),[tasks,setTasks]=useState<Task[]>([]),[referrals,setReferrals]=useState(0),[tab,setTab]=useState<'home'|'discover'|'rank'|'profile'|'settings'>('home'),[feed,setFeed]=useState<'voted'|'mine'|'all'>('mine'),[discoverCategory,setDiscoverCategory]=useState('Tümü');
 const [loading,setLoading]=useState(true),[toast,setToast]=useState(''),[authError,setAuthError]=useState(''),[selected,setSelected]=useState<string[]>([]),[nameModal,setNameModal]=useState(false),[interestModal,setInterestModal]=useState(false),[nameInput,setNameInput]=useState('');
 const [feedbackStage,setFeedbackStage]=useState(0),[feedbackRating,setFeedbackRating]=useState(5),[feedbackText,setFeedbackText]=useState(''),[stillAgree,setStillAgree]=useState('');
 const [installPrompt,setInstallPrompt]=useState<InstallPrompt|null>(null),[showIOSInstall,setShowIOSInstall]=useState(false),[showInstallCard,setShowInstallCard]=useState(false),[updateReady,setUpdateReady]=useState(false);

 useEffect(()=>{void boot();setupPWA()},[]);

 function setupPWA(){
  if('serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js').then(reg=>{reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)setUpdateReady(true)})})}).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload())}
  const handler=(e:Event)=>{e.preventDefault();setInstallPrompt(e as InstallPrompt);if(!sessionStorage.getItem('kapis_install_dismissed')&&!isStandalone())setShowInstallCard(true)};
  window.addEventListener('beforeinstallprompt',handler);
  if(isIOS()&&!isStandalone()&&!localStorage.getItem('kapis_ios_install_hide'))setShowInstallCard(true);
  return()=>window.removeEventListener('beforeinstallprompt',handler);
 }

 async function boot(){try{
  let {data:s}=await supabase.auth.getSession();let u=s.session?.user??null;
  if(!u){const {data,error}=await supabase.auth.signInAnonymously();if(error)throw error;u=data.user;}
  if(!u)throw new Error('Anonim kullanıcı oluşturulamadı.');setUser(u);
  const ref=new URLSearchParams(location.search).get('ref');if(ref&&ref!==u.id)localStorage.setItem('kapis_referrer',ref);
  await supabase.from('kapis_profiles').upsert({user_id:u.id,nickname:`Kapışçı ${u.id.replaceAll('-','').slice(-5)}`},{onConflict:'user_id',ignoreDuplicates:true});
  const p=await loadProfile(u.id);
  await Promise.all([loadInterests(u.id),loadMatchups(u.id),loadDiscover(),loadLeaderboard(),loadReferralCount(u.id),loadStats(),loadExpertise(),loadPackage(),loadTasks(),checkFeedback()]);
  if(!p?.display_name)setNameModal(true);
 }catch(e:any){setAuthError(e?.message||'Bağlantı kurulamadı.')}finally{setLoading(false)}}

 async function loadProfile(uid:string){const {data,error}=await supabase.from('kapis_profiles').select('*').eq('user_id',uid).single();if(error)throw error;setProfile(data);return data as Profile;}
 async function loadInterests(uid:string){const {data}=await supabase.from('kapis_user_interests').select('interest').eq('user_id',uid);const vals=(data??[]).map(x=>norm(x.interest));setSelected(vals);if(vals.length<3)setInterestModal(true)}
 async function loadReferralCount(uid:string){const {count}=await supabase.from('kapis_referrals').select('id',{count:'exact',head:true}).eq('inviter_id',uid).eq('status','completed');setReferrals(count??0)}
 async function loadLeaderboard(){const {data}=await supabase.rpc('kapis_leaderboard',{p_limit:20});setLeaders(data??[])}
 async function loadStats(){const {data}=await supabase.rpc('kapis_profile_stats');setStats(data?.[0]??null)}
 async function loadExpertise(){const {data}=await supabase.rpc('kapis_category_expertise');setExpertise(data??[])}
 async function loadPackage(){const {data}=await supabase.rpc('kapis_get_daily_package',{p_slot:null});setDailyPackage((data??[]) as Matchup[])}
 async function loadTasks(){const {data}=await supabase.rpc('kapis_today_tasks');setTasks((data??[]) as Task[])}
 async function checkFeedback(){const {data}=await supabase.rpc('kapis_feedback_status');setFeedbackStage(Number(data?.[0]?.need_stage??0))}
 async function loadDiscover(){const {data}=await supabase.from('kapis_matchups').select('id,title,category,left_label,right_label,ends_at,matchup_type,status,resolved_at,winning_choice,prediction_result_at,published_at').order('published_at',{ascending:false}).limit(200);setAllMatchups((data??[]) as Matchup[])}
 async function loadMatchups(uid:string){const [{data:ms,error:me},{data:cs,error:ce},{data:vs,error:ve}]=await Promise.all([
  supabase.from('kapis_matchups').select('id,title,category,left_label,right_label,ends_at,matchup_type,status,resolved_at,winning_choice,prediction_result_at,published_at').eq('status','active').lte('starts_at',new Date().toISOString()).gt('ends_at',new Date().toISOString()),
  supabase.rpc('kapis_matchup_counts'),supabase.from('kapis_votes').select('matchup_id,choice').eq('user_id',uid)]);
  if(me)throw me;if(ce)throw ce;if(ve)throw ve;setMatchups((ms??[]) as Matchup[]);const nc:Counts={};for(const c of cs??[])nc[c.matchup_id]={left_votes:Number(c.left_votes),right_votes:Number(c.right_votes)};setCounts(nc);const ch:ChoiceMap={};for(const v of vs??[])ch[v.matchup_id]=v.choice;setChoices(ch)}

 async function saveName(){if(!user)return;const n=nameInput.trim();if(n.length<2)return flash('Rumuz en az 2 karakter olmalı.');const {data,error}=await supabase.rpc('kapis_set_display_name',{p_name:n});if(error)return flash('Rumuz kaydedilemedi.');const row=data?.[0];setProfile(p=>p?{...p,display_name:row.display_name,nickname:row.nickname,handle_code:row.handle_code}:p);setNameModal(false);await registerPendingReferral();if(selected.length<3)setInterestModal(true);flash(`Rumuzun ${row.nickname} olarak oluşturuldu ✅`)}
 async function registerPendingReferral(){const inviter=localStorage.getItem('kapis_referrer');if(!inviter||!user)return;await supabase.rpc('kapis_register_referral',{p_inviter_id:inviter,p_device_key:deviceKey()})}
 async function saveInterests(){if(!user)return;if(selected.length<3)return flash('En az 3 ilgi alanı seç.');await supabase.from('kapis_user_interests').delete().eq('user_id',user.id);const {error}=await supabase.from('kapis_user_interests').insert(selected.map(interest=>({user_id:user.id,interest})));if(error)return flash('İlgi alanları kaydedilemedi.');setInterestModal(false);setFeed('mine');await loadPackage();flash('İlgi alanların kaydedildi ✨')}

 async function vote(m:Matchup,side:'left'|'right'){
  if(!navigator.onLine)return flash('Bağlantı yok. Oy internet bağlantısı olmadan kaydedilmez.');
  if(!user||!profile)return;if(choices[m.id])return flash('Bu Kapış için zaten oy kullandın.');
  const {data,error}=await supabase.rpc('kapis_cast_vote',{p_matchup_id:m.id,p_choice:side});if(error)return flash(error.message.includes('already_voted')?'Bu Kapış için zaten oy kullandın.':'Oy kaydedilemedi.');
  const row=data?.[0];setChoices(v=>({...v,[m.id]:side}));setCounts(v=>({...v,[m.id]:{left_votes:Number(row?.left_votes??0),right_votes:Number(row?.right_votes??0)}}));
  if(profile.vibration_enabled&&'vibrate'in navigator)navigator.vibrate(30);
  const {data:ref}=await supabase.rpc('kapis_finalize_referral',{p_device_key:deviceKey()});
  const {data:pkg}=await supabase.rpc('kapis_mark_package_complete',{p_slot:null});
  await Promise.all([loadProfile(user.id),loadStats(),loadLeaderboard(),loadExpertise(),loadTasks(),checkFeedback(),loadPackage(),loadDiscover()]);
  if(pkg?.[0]?.completed&&Number(pkg[0].reward_credits)>0)flash(`Paket tamamlandı! +${pkg[0].reward_credits} kredi 🎁`)
  else if(ref?.[0]?.completed){localStorage.removeItem('kapis_referrer');flash('5 oyun tamamlandı! Davet bonusu +10 kredi 🎁')}
  else if(Number(row?.rewarded_votes_today)>=Number(row?.reward_limit))flash('Bugünkü ödüllü oylarını tamamladın. Oy vermeye devam edebilirsin.')
  else flash('Oyun kaydedildi ✅ +1 XP');
 }

 async function shareMatchup(m:Matchup){const url=`${location.origin}/?matchup=${m.id}`;const text=`KAPIŞ: ${m.title} — Sen hangi taraftasın?`;try{if(navigator.share)await navigator.share({title:'KAPIŞ',text,url});else await navigator.clipboard.writeText(url);if(navigator.onLine){await supabase.rpc('kapis_record_share',{p_matchup_id:m.id});void loadTasks()}flash('Kapış paylaşım bağlantısı hazır 🚀')}catch(e:any){if(e?.name!=='AbortError')flash('Paylaşım açılamadı.')}}
 async function shareInvite(){if(!user)return;const url=`${location.origin}/?ref=${user.id}`;const text='KAPIŞ’a gel. İlk 5 gerçek oyunu tamamla; sana +10, bana +25 kredi gelsin 🔥';try{if(navigator.share)await navigator.share({title:'KAPIŞ',text,url});else await navigator.clipboard.writeText(url);flash('Davet bağlantısı hazır 🚀')}catch(e:any){if(e?.name!=='AbortError')flash('Paylaşım açılamadı.')}}
 async function claimTask(t:Task){if(!user)return;const {data,error}=await supabase.rpc('kapis_claim_task_reward',{p_task_id:t.task_id});if(error)return flash('Görev ödülü alınamadı.');if(data?.[0]?.claimed){await Promise.all([loadProfile(user.id),loadTasks()]);flash(`Görev tamamlandı! +${data[0].reward} kredi 🎁`)}else flash('Görev henüz tamamlanmadı.')}
 async function setPredictionAlert(m:Matchup){if(!user)return;const {error}=await supabase.from('kapis_prediction_alerts').upsert({user_id:user.id,matchup_id:m.id,enabled:true});if(error)return flash('Hatırlatma kaydedilemedi.');flash('Sonuçlanınca haber verilecek 🔔')}

 async function submitFeedback(){if(!feedbackText.trim()&&feedbackStage===5)return flash('Kısacık da olsa fikrini yaz.');if(feedbackStage===50&&!stillAgree)return flash('İlk görüşünün değişip değişmediğini seç.');const {error}=await supabase.rpc('kapis_submit_product_feedback',{p_stage:feedbackStage,p_rating:feedbackRating,p_comment:feedbackStage===5?feedbackText.trim():'',p_still_agree:feedbackStage===50?stillAgree:null,p_updated_comment:feedbackStage===50?feedbackText.trim():null});if(error)return flash('Geri bildirim kaydedilemedi.');setFeedbackStage(0);setFeedbackText('');setStillAgree('');flash('Teşekkürler. Bu geri bildirim ürün kararlarında kullanılacak 🙌')}

 async function installApp(){if(isIOS()){setShowIOSInstall(true);setShowInstallCard(false);return}if(!installPrompt)return flash('Kurulum seçeneği tarayıcı tarafından henüz hazır değil.');await installPrompt.prompt();const r=await installPrompt.userChoice;setInstallPrompt(null);setShowInstallCard(false);if(r.outcome==='accepted')flash('KAPIŞ ana ekranına ekleniyor ✅');else sessionStorage.setItem('kapis_install_dismissed','1')}
 async function applyUpdate(){const reg=await navigator.serviceWorker.getRegistration();reg?.waiting?.postMessage({type:'SKIP_WAITING'})}
 async function changeSetting(key:keyof Profile,value:boolean){if(!profile)return;const next={[key]:value};if(key==='notifications_enabled'&&value&&'Notification'in window){const perm=await Notification.requestPermission();if(perm!=='granted'){flash('Bildirim izni verilmedi.');return}}const {error}=await supabase.from('kapis_profiles').update(next).eq('user_id',profile.user_id);if(error)return flash('Ayar kaydedilemedi.');setProfile(p=>p?{...p,...next}:p)}
 async function logout(){await supabase.auth.signOut();location.reload()}
 async function deleteAccount(){if(!confirm('Hesabın ve oyların silinsin mi? Bu işlem geri alınamaz.'))return;const {error}=await supabase.rpc('kapis_delete_my_account');if(error)return flash('Hesap silinemedi.');localStorage.clear();location.reload()}
 function flash(t:string){setToast(t);setTimeout(()=>setToast(''),3000)}

 const totalPublicVotes=useMemo(()=>Object.values(counts).reduce((a,b)=>a+b.left_votes+b.right_votes,0),[counts]);
 const visible=useMemo(()=>{let list:Matchup[];if(showPackage)list=dailyPackage;else if(feed==='voted')list=matchups.filter(m=>!!choices[m.id]);else if(feed==='mine')list=matchups.filter(m=>selected.includes(norm(m.category))&&!choices[m.id]).slice(0,9);else list=matchups.filter(m=>!choices[m.id]).sort((a,b)=>((counts[b.id]?.left_votes??0)+(counts[b.id]?.right_votes??0))-((counts[a.id]?.left_votes??0)+(counts[a.id]?.right_votes??0))).slice(0,10);return list},[showPackage,dailyPackage,feed,matchups,selected,choices,counts]);
 const discoverVisible=useMemo(()=>allMatchups.filter(m=>discoverCategory==='Tümü'||norm(m.category)===discoverCategory).slice(0,60),[allMatchups,discoverCategory]);
 const pendingPredictions=useMemo(()=>allMatchups.filter(m=>m.matchup_type==='tahmin'&&!!choices[m.id]&&!m.resolved_at),[allMatchups,choices]);
 const packageDone=dailyPackage.length>0&&dailyPackage.every(m=>!!choices[m.id]);
 if(loading)return <main className="center"><Logo/><p>Canlı sisteme bağlanıyor…</p></main>;
 if(authError)return <main className="center"><Logo/><h2>Bağlantı ayarı gerekiyor</h2><p className="muted">{authError}</p></main>;
 const accuracy=stats?.accuracy??0;

 return <main>
  <header><div className="brandWrap"><Logo/><div className="tag">Tarafını seç.</div></div><div className="credit">🎁 {profile?.credits??100} kredi</div></header>
  <section className="stats"><div>🔥 <b>{profile?.current_streak??0}</b><span>seri</span></div><div>⚡ <b>{profile?.xp??0}</b><span>XP</span></div><div>🎯 <b>%{accuracy}</b><span>isabet</span></div></section>

  {tab==='home'&&<>
   <div className="hero"><span>KAPIŞ</span><h1>Tarafını seç.</h1><p>Gündem, spor, eğlence ve teknoloji oylamaya dönüşüyor.</p></div>
   {showInstallCard&&<div className="installCard"><div><b>Kapış’ı uygulama gibi kullan</b><span>Ana ekranına ekle, tek dokunuşla aç.</span></div><button onClick={installApp}>Telefona Yükle</button><button className="installClose" onClick={()=>{setShowInstallCard(false);sessionStorage.setItem('kapis_install_dismissed','1')}}>×</button></div>}
   <div className="packageCard"><div><span>⚡ GÜNLÜK PAKET</span><b>{packageDone?'Bu tur tamamlandı':`${dailyPackage.filter(m=>!choices[m.id]).length} Kapış seni bekliyor`}</b><small>{packageDone?'Yeni tur bir sonraki içerik döneminde.':'Paketi bitir, kredi ödülünü al.'}</small></div><button onClick={()=>setShowPackage(v=>!v)}>{showPackage?'Akışa dön':'Paketi aç'}</button></div>
   {tasks.length>0&&<div className="tasksCard"><div className="tasksHead"><b>🎯 Günlük Görevler</b><span>En fazla 3 küçük görev</span></div>{tasks.map(t=><div className="taskRow" key={t.task_id}><div><b>{t.title}</b><span>{t.progress}/{t.target} • +{t.reward_credits} kredi</span></div>{t.reward_claimed?<em>✓ Alındı</em>:t.completed?<button onClick={()=>claimTask(t)}>Ödülü Al</button>:<em>Devam</em>}</div>)}</div>}
   <div className="live"><i/> CANLI • {totalPublicVotes.toLocaleString('tr-TR')} oy</div>
   {!showPackage&&<div className="feedTabs" style={{gridTemplateColumns:'1.2fr 1fr 1fr 44px'}}><button className={feed==='voted'?'active':''} onClick={()=>setFeed('voted')}>✅ Kapışmalarım</button><button className={feed==='mine'?'active':''} onClick={()=>setFeed('mine')}>✨ İlgim</button><button className={feed==='all'?'active':''} onClick={()=>setFeed('all')}>🇹🇷 Genel</button><button onClick={()=>setInterestModal(true)}>⚙️</button></div>}
   <h2>{showPackage?'⚡ Günlük Paket':feed==='voted'?'✅ Oy kullandıkların':feed==='mine'?'✨ Sana göre':'🔥 Genel gündem'}</h2>
   {visible.length===0&&<div className="panel empty"><b>{showPackage?'Paket şu an boş.':feed==='voted'?'Henüz Kapışın yok.':'Şimdilik yeni Kapış kalmadı.'}</b><p>{showPackage?'Keşfet ve Genel akıştan oy vermeye devam edebilirsin.':feed==='voted'?'Oy kullandığın Kapışlar burada birikecek.':'Yeni gündemler geldikçe burada görünecek.'}</p></div>}
   <div className="cards">{visible.map(m=><MatchupCard key={m.id} m={m} counts={counts} choice={choices[m.id]} onVote={vote} onShare={shareMatchup}/>)}</div>
   {showPackage&&packageDone&&<div className="packageDone"><b>Bu tur tamamlandı 🎉</b><p>Oy vermeye devam edebilirsin. Kredi yalnız kontrollü ödüllerden kazanılır.</p><div><button onClick={()=>{setShowPackage(false);setTab('discover')}}>Keşfet’e Git</button><button onClick={()=>{setShowPackage(false);setFeed('voted')}}>Öncekileri İncele</button><button onClick={shareInvite}>Arkadaşına Meydan Oku</button></div></div>}
  </>}

  {tab==='discover'&&<section><h2>🧭 Keşfet</h2><p className="sectionLead">Aktif ve geçmiş Kapışları kategori kategori incele.</p><div className="categoryRail"><button className={discoverCategory==='Tümü'?'on':''} onClick={()=>setDiscoverCategory('Tümü')}>Tümü</button>{interests.map(x=><button key={x} className={discoverCategory===x?'on':''} onClick={()=>setDiscoverCategory(x)}>{emoji[x]} {x}</button>)}</div><div className="cards">{discoverVisible.map(m=><MatchupCard key={m.id} m={m} counts={counts} choice={choices[m.id]} onVote={vote} onShare={shareMatchup}/>)}</div></section>}

  {tab==='rank'&&<section><h2>🏆 Canlı Sıralama</h2><div className="panel">{leaders.map((x,i)=><div className={x.nickname===profile?.nickname?'row me':'row'} key={`${x.nickname}-${i}`}><span>#{i+1} {x.nickname}</span><b>{x.total_predictions} tahmin</b></div>)}</div></section>}

  {tab==='profile'&&<section><h2>👤 Profil</h2><div className="panel profile"><div className="avatar">K</div><h3>{profile?.nickname}</h3><p>{selected.length} ilgi alanı</p><div className="profileStats"><div><b>{stats?.total_votes??0}</b><span>Toplam oy</span></div><div><b>{stats?.total_predictions??0}</b><span>Tahmin</span></div><div><b>{stats?.correct_predictions??0}</b><span>Doğru</span></div><div><b>%{stats?.accuracy??0}</b><span>Başarı</span></div><div><b>{stats?.best_streak??0}</b><span>En uzun seri</span></div><div><b>{stats?.credits??profile?.credits??0}</b><span>Kredi</span></div><div><b>{profile?.xp??0}</b><span>XP</span></div><div><b>#{stats?.general_rank??'-'}</b><span>Genel sıra</span></div></div><div className="expertise"><b>🏅 Kategori uzmanlıkları</b>{expertise.length?expertise.map(x=><span key={x.category}>{norm(x.category)} • {x.total_predictions} tahmin • %{x.accuracy}</span>):<span>Sonuçlanan tahminlerle oluşacak.</span>}</div><div className="pendingPredictions"><b>⏳ Bekleyen Tahminlerim</b>{pendingPredictions.length===0?<span>Bekleyen tahminin yok.</span>:pendingPredictions.slice(0,5).map(m=><div key={m.id}><span>{m.title}</span><button onClick={()=>setPredictionAlert(m)}>🔔 Sonuçlanınca haber ver</button></div>)}</div><div className="invite profileInvite"><b>Arkadaşını getir, kredi kazan</b><p>Arkadaşın rumuzunu oluşturup 5 gerçek oy kullandığında sana +25, ona +10 kredi.</p><button onClick={shareInvite}>📤 Davet bağlantımı paylaş</button><small>{referrals} başarılı davet</small></div></div></section>}

  {tab==='settings'&&<section><h2>⚙️ Ayarlar</h2><div className="panel settings"><Toggle label="Bildirimler" desc="Tüm bildirimlerin ana anahtarı" value={!!profile?.notifications_enabled} onChange={v=>changeSetting('notifications_enabled',v)}/><Toggle label="Yeni gündem kapışmaları" desc="İlgilerine uygun yeni gündemler" value={profile?.new_topic_alerts!==false} onChange={v=>changeSetting('new_topic_alerts',v)}/><Toggle label="Tahmin sonuçları" desc="Tahminin sonuçlandığında haber ver" value={profile?.result_alerts!==false} onChange={v=>changeSetting('result_alerts',v)}/><Toggle label="Günlük paket" desc="Yeni paket hazır olduğunda hatırlat" value={profile?.package_alerts!==false} onChange={v=>changeSetting('package_alerts',v)}/><Toggle label="Seri uyarısı" desc="Serin riskteyse bir kez hatırlat" value={profile?.streak_alerts!==false} onChange={v=>changeSetting('streak_alerts',v)}/><Toggle label="Davet ve kredi" desc="Ödül geldiğinde haber ver" value={profile?.referral_alerts!==false} onChange={v=>changeSetting('referral_alerts',v)}/><Toggle label="Yorum yanıtları" desc="Sosyal yanıt bildirimleri" value={profile?.comment_reply_alerts!==false} onChange={v=>changeSetting('comment_reply_alerts',v)}/><Toggle label="Ses" desc="Uygulama seslerini aç/kapat" value={profile?.sound_enabled!==false} onChange={v=>changeSetting('sound_enabled',v)}/><Toggle label="Titreşim" desc="Oy sonrası kısa titreşim" value={profile?.vibration_enabled!==false} onChange={v=>changeSetting('vibration_enabled',v)}/><div className="quietHours"><b>🌙 Sessiz saatler</b><span>Varsayılan 22.30–09.00. Arka plan bildirim sistemi bağlandığında bu aralık uygulanacak.</span></div><button className="settingsAction" onClick={installApp}>📲 Kapış’ı Telefona Yükle</button><button className="settingsAction" onClick={()=>setInterestModal(true)}>✨ İlgi alanlarını düzenle</button><button className="settingsAction" onClick={()=>{setNameInput(profile?.display_name||'');setNameModal(true)}}>✏️ Rumuzu düzenle</button><a className="settingsAction linkBtn" href="/privacy">🔒 Gizlilik politikası</a><button className="settingsAction" onClick={logout}>↪️ Çıkış yap</button><button className="settingsAction danger" onClick={deleteAccount}>🗑️ Hesabı sil</button></div></section>}

  <nav className="fiveNav"><button className={tab==='home'?'on':''} onClick={()=>setTab('home')}>⚡<span>Ana Sayfa</span></button><button className={tab==='discover'?'on':''} onClick={()=>setTab('discover')}>🧭<span>Keşfet</span></button><button className={tab==='rank'?'on':''} onClick={()=>setTab('rank')}>🏆<span>Sıralama</span></button><button className={tab==='profile'?'on':''} onClick={()=>setTab('profile')}>👤<span>Profil</span></button><button className={tab==='settings'?'on':''} onClick={()=>setTab('settings')}>⚙️<span>Ayarlar</span></button></nav>

  {nameModal&&<div className="modal"><div className="sheet"><Logo/><h2>Sana nasıl hitap edelim?</h2><p>Rumuz tekse aynen görünür. Aynı rumuzu kullanan ikinci kişi #1, sonraki #2 olarak ayrılır.</p><input className="nameInput" autoFocus maxLength={24} value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Örn. Erdem"/><button className="primary" onClick={saveName}>Devam et</button>{profile?.display_name&&<button className="ghost" onClick={()=>setNameModal(false)}>Vazgeç</button>}</div></div>}
  {interestModal&&!nameModal&&<div className="modal"><div className="sheet"><Logo/><h2>Neler ilgini çekiyor?</h2><p>En az 3 kategori seç. “İlgim” ve günlük paket buna göre hazırlanır.</p><div className="selectionCount">{selected.length}/3 minimum</div><div className="interestGrid">{interests.map(x=><button key={x} className={selected.includes(x)?'chosen':''} onClick={()=>setSelected(s=>s.includes(x)?s.filter(v=>v!==x):[...s,x])}>{emoji[x]} {x}</button>)}</div><button className="primary" onClick={saveInterests}>İlgimi oluştur</button>{selected.length>=3&&profile?.display_name&&<button className="ghost" onClick={()=>setInterestModal(false)}>Vazgeç</button>}</div></div>}

  {feedbackStage>0&&!nameModal&&!interestModal&&<div className="modal"><div className="sheet feedbackSheet"><Logo/>{feedbackStage===5?<><h2>İlk 5 Kapışını tamamladın 🎉</h2><p>Kapış hakkındaki ilk izlenimini bilmek istiyoruz.</p><div className="stars">{[1,2,3,4,5].map(n=><button key={n} className={feedbackRating>=n?'on':''} onClick={()=>setFeedbackRating(n)}>★</button>)}</div><label>İlk değiştirmemizi istediğin şey ne?</label><textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder="Kısaca yazabilirsin…"/></>:<><h2>50 Kapış yaptın 🔥</h2><p>İlk görüşüne hâlâ katılıyor musun?</p><div className="agreeChoices"><button className={stillAgree==='yes'?'on':''} onClick={()=>setStillAgree('yes')}>👍 Evet</button><button className={stillAgree==='partly'?'on':''} onClick={()=>setStillAgree('partly')}>🤔 Kısmen</button><button className={stillAgree==='no'?'on':''} onClick={()=>setStillAgree('no')}>👎 Hayır</button></div><label>Şimdi neyi değiştirmemizi istersin?</label><textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder="İstersen ekle…"/></>}<button className="primary" onClick={submitFeedback}>Gönder</button><button className="ghost" onClick={()=>setFeedbackStage(0)}>Şimdi değil</button></div></div>}

  {showIOSInstall&&<div className="modal"><div className="sheet"><Logo/><h2>Kapış’ı ana ekranına ekle</h2><p>Safari’de <b>Paylaş</b> simgesine dokun, ardından <b>Ana Ekrana Ekle</b> seçeneğini seç.</p><ol className="installSteps"><li>Safari Paylaş simgesine dokun.</li><li>Menüden “Ana Ekrana Ekle”yi seç.</li><li>Sağ üstten “Ekle”ye dokun.</li></ol><button className="primary" onClick={()=>setShowIOSInstall(false)}>Anladım</button><button className="ghost" onClick={()=>{localStorage.setItem('kapis_ios_install_hide','1');setShowIOSInstall(false)}}>Bir daha gösterme</button></div></div>}
  {updateReady&&<div className="updateBar"><span>Yeni sürüm hazır.</span><button onClick={applyUpdate}>Güncelle</button></div>}
  {toast&&<div className="toast">{toast}</div>}
 </main>
}

function MatchupCard({m,counts,choice,onVote,onShare}:{m:Matchup;counts:Counts;choice?:'left'|'right';onVote:(m:Matchup,s:'left'|'right')=>void;onShare:(m:Matchup)=>void}){const c=counts[m.id]??{left_votes:0,right_votes:0},t=c.left_votes+c.right_votes,lp=t?Math.round(c.left_votes/t*100):50,tm=typeMeta[m.matchup_type]??typeMeta.tercih,closed=m.status==='closed'||!!m.resolved_at;return <article><div className="meta"><span>{emoji[norm(m.category)]??'🔥'} {norm(m.category)}</span><button className="shareMini" onClick={()=>onShare(m)}>↗ Paylaş</button></div><div className={`typeBadge ${m.matchup_type}`}>{tm.icon} {tm.label}{closed?' • Sonuçlandı':''}</div><h3 className="question">{m.title}</h3><div className="duel"><button className={choice==='left'?'picked':''} disabled={!!choice||closed} onClick={()=>onVote(m,'left')}><strong>{m.left_label}</strong><em>%{lp}</em><small>{c.left_votes} oy</small></button><b>VS</b><button className={choice==='right'?'picked':''} disabled={!!choice||closed} onClick={()=>onVote(m,'right')}><strong>{m.right_label}</strong><em>%{100-lp}</em><small>{c.right_votes} oy</small></button></div><div className="bar"><i style={{width:`${lp}%`}}/></div><div className="status">{closed&&m.winning_choice?`Sonuç: ${m.winning_choice==='left'?m.left_label:m.right_label}`:choice?`Seçimin: ${choice==='left'?m.left_label:m.right_label}`:'Tarafını seç'}</div></article>}
function Toggle({label,desc,value,onChange}:{label:string;desc:string;value:boolean;onChange:(v:boolean)=>void}){return <div className="settingRow"><div><b>{label}</b><span>{desc}</span></div><button className={value?'switch on':'switch'} onClick={()=>onChange(!value)}><i/></button></div>}
function Logo(){return <div className="kapisLogo"><span className="logoMark"><i>K</i><b>VS</b></span><strong>KAPIŞ</strong></div>}
