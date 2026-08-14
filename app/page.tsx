'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Matchup = {
  id: string;
  title: string;
  category: string;
  left_label: string;
  right_label: string;
  ends_at: string;
};

type Counts = Record<string, { left_votes: number; right_votes: number }>;
type ChoiceMap = Record<string, 'left' | 'right'>;
type Profile = {
  user_id: string;
  nickname: string;
  credits: number;
  points: number;
  current_streak: number;
  best_streak: number;
  total_predictions: number;
  correct_predictions: number;
};

type Leader = { nickname: string; points: number; total_predictions: number; correct_predictions: number };

const emoji: Record<string, string> = {
  Futbol: '⚽', Şehir: '🏙️', Teknoloji: '📱', Üniversite: '🎓', Yemek: '🍔', Müzik: '🎵', Film: '🎬', Oyun: '🎮'
};

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [choices, setChoices] = useState<ChoiceMap>({});
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [tab, setTab] = useState<'home'|'rank'|'profile'>('home');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => { void boot(); }, []);

  async function boot() {
    try {
      let { data: sessionData } = await supabase.auth.getSession();
      let currentUser = sessionData.session?.user ?? null;
      if (!currentUser) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        currentUser = data.user;
      }
      if (!currentUser) throw new Error('Anonim kullanıcı oluşturulamadı.');
      setUser(currentUser);

      await supabase.from('kapis_profiles').upsert({
        user_id: currentUser.id,
        nickname: `Kapışçı #${currentUser.id.replaceAll('-', '').slice(-5)}`
      }, { onConflict: 'user_id', ignoreDuplicates: true });

      await Promise.all([
        loadProfile(currentUser.id),
        loadMatchups(currentUser.id),
        loadLeaderboard()
      ]);
    } catch (e: any) {
      setAuthError(e?.message || 'Bağlantı kurulamadı.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile(uid: string) {
    const { data, error } = await supabase.from('kapis_profiles').select('*').eq('user_id', uid).single();
    if (error) throw error;
    setProfile(data);
    const { data: fb } = await supabase.from('kapis_feedback').select('id').eq('user_id', uid).maybeSingle();
    setFeedbackDone(!!fb);
    if ((data?.total_predictions ?? 0) >= 5 && !fb) setFeedbackOpen(true);
  }

  async function loadMatchups(uid: string) {
    const [{ data: ms, error: me }, { data: cs, error: ce }, { data: vs, error: ve }] = await Promise.all([
      supabase.from('kapis_matchups').select('id,title,category,left_label,right_label,ends_at').eq('status','active').gt('ends_at', new Date().toISOString()).order('ends_at'),
      supabase.rpc('kapis_matchup_counts'),
      supabase.from('kapis_votes').select('matchup_id,choice').eq('user_id', uid)
    ]);
    if (me) throw me; if (ce) throw ce; if (ve) throw ve;
    setMatchups(ms ?? []);
    const nextCounts: Counts = {};
    for (const c of cs ?? []) nextCounts[c.matchup_id] = { left_votes: Number(c.left_votes), right_votes: Number(c.right_votes) };
    setCounts(nextCounts);
    const nextChoices: ChoiceMap = {};
    for (const v of vs ?? []) nextChoices[v.matchup_id] = v.choice;
    setChoices(nextChoices);
  }

  async function loadLeaderboard() {
    const { data } = await supabase.rpc('kapis_leaderboard', { p_limit: 20 });
    setLeaders(data ?? []);
  }

  async function vote(m: Matchup, side: 'left'|'right') {
    if (!user || !profile) return;
    if (choices[m.id]) { flash('Bu Kapış için zaten tahmin yaptın.'); return; }
    if (profile.credits <= 0) { flash('Kredin bitti.'); return; }

    const { data, error } = await supabase.rpc('kapis_cast_vote', { p_matchup_id: m.id, p_choice: side });
    if (error) { flash(error.message.includes('duplicate') ? 'Bu Kapış için zaten oy kullandın.' : 'Oy kaydedilemedi.'); return; }

    const row = data?.[0];
    setChoices(v => ({ ...v, [m.id]: side }));
    setCounts(v => ({ ...v, [m.id]: { left_votes: Number(row?.left_votes ?? 0), right_votes: Number(row?.right_votes ?? 0) } }));
    const nextTotal = profile.total_predictions + 1;
    setProfile(p => p ? { ...p, credits: Number(row?.credits ?? p.credits - 1), total_predictions: nextTotal } : p);
    if (nextTotal >= 5 && !feedbackDone) setTimeout(() => setFeedbackOpen(true), 500);
    void loadLeaderboard();
    flash('Tahminin canlı sisteme kaydedildi ✅');
  }

  async function submitFeedback() {
    if (!user || !feedback.trim()) return;
    const { error } = await supabase.from('kapis_feedback').insert({ user_id: user.id, rating, comment: feedback.trim() });
    if (error) { flash('Yorum kaydedilemedi.'); return; }
    setFeedbackDone(true); setFeedbackOpen(false); flash('Teşekkürler! Görüşün canlı olarak kaydedildi.');
  }

  function flash(t: string) { setToast(t); setTimeout(() => setToast(''), 2200); }
  const accuracy = profile?.total_predictions ? Math.round((profile.correct_predictions / profile.total_predictions) * 100) : 0;
  const totalVotes = useMemo(() => Object.values(counts).reduce((a,b) => a+b.left_votes+b.right_votes,0), [counts]);

  if (loading) return <main className="center"><div className="brand">KAPIŞ</div><p>Canlı sisteme bağlanıyor…</p></main>;
  if (authError) return <main className="center"><div className="brand">KAPIŞ</div><h2>Bağlantı ayarı gerekiyor</h2><p className="muted">{authError}</p><p className="muted">Supabase → Authentication → Sign In / Providers bölümünde Anonymous Sign-ins açık olmalı.</p></main>;

  return <main>
    <header>
      <div><div className="brand">KAPIŞ</div><div className="tag">Tarafını seç • sonucu tahmin et</div></div>
      <div className="credit">🎁 {profile?.credits ?? 100} kredi</div>
    </header>

    <section className="stats">
      <div>🔥 <b>{profile?.current_streak ?? 0}</b><span>seri</span></div>
      <div>🏆 <b>{profile?.points ?? 0}</b><span>puan</span></div>
      <div>🎯 <b>%{accuracy}</b><span>isabet</span></div>
    </section>

    {tab === 'home' && <>
      <div className="hero"><span>İLK KULLANICI HEDİYESİ</span><h1>100 kredi hesabında 🎉</h1><p>İlk 5 Kapışını yap. Sonra senden 20 saniyelik görüş isteyeceğiz.</p></div>
      <div className="live"><i/> CANLI BETA • {totalVotes.toLocaleString('tr-TR')} oy toplandı</div>
      <h2>🔥 Şu an Kapışanlar</h2>
      <div className="cards">{matchups.map(m => {
        const c = counts[m.id] ?? {left_votes:0,right_votes:0}; const total = c.left_votes + c.right_votes;
        const lp = total ? Math.round(c.left_votes / total * 100) : 50; const choice = choices[m.id];
        const end = new Date(m.ends_at); const hours = Math.max(0, Math.ceil((end.getTime()-Date.now())/3600000));
        return <article key={m.id}>
          <div className="meta"><span>{emoji[m.category] ?? '🔥'} {m.category}</span><small>⏱ {hours} saat</small></div>
          <div className="duel">
            <button className={choice==='left'?'picked':''} onClick={() => vote(m,'left')}><strong>{m.left_label}</strong><em>%{lp}</em><small>{c.left_votes.toLocaleString('tr-TR')} güç</small></button>
            <b>VS</b>
            <button className={choice==='right'?'picked':''} onClick={() => vote(m,'right')}><strong>{m.right_label}</strong><em>%{100-lp}</em><small>{c.right_votes.toLocaleString('tr-TR')} güç</small></button>
          </div>
          <div className="bar"><i style={{width:`${lp}%`}}/></div>
          <div className="status">{choice ? `Tahminin: ${choice==='left'?m.left_label:m.right_label}` : 'Tarafını seç ve sonucu tahmin et'}</div>
        </article>
      })}</div>
    </>}

    {tab === 'rank' && <section><h2>🏆 Canlı Sıralama</h2><div className="panel">{leaders.length ? leaders.map((x,i) => <div className={x.nickname===profile?.nickname?'row me':'row'} key={`${x.nickname}-${i}`}><span>#{i+1} {x.nickname}</span><b>{x.total_predictions} Kapış</b></div>) : <p className="muted">İlk sıralamayı sen başlat.</p>}</div></section>}

    {tab === 'profile' && <section><h2>👤 Profil</h2><div className="panel profile"><div className="avatar">K</div><h3>{profile?.nickname}</h3><p>İlk kullanıcı • 100 kredi kampanyası</p><div className="grid"><div><b>{profile?.total_predictions ?? 0}</b><span>Tahmin</span></div><div><b>{profile?.correct_predictions ?? 0}</b><span>Doğru</span></div><div><b>%{accuracy}</b><span>Başarı</span></div><div><b>{profile?.current_streak ?? 0}</b><span>Seri</span></div></div>{feedbackDone && <div className="thanks">✅ İlk kullanıcı geri bildirimi tamamlandı.</div>}</div></section>}

    <nav><button className={tab==='home'?'on':''} onClick={()=>setTab('home')}>⚡<span>Ana Sayfa</span></button><button className={tab==='rank'?'on':''} onClick={()=>setTab('rank')}>🏆<span>Sıralama</span></button><button className={tab==='profile'?'on':''} onClick={()=>setTab('profile')}>👤<span>Profil</span></button></nav>
    {toast && <div className="toast">{toast}</div>}
    {feedbackOpen && <div className="modal"><div className="sheet"><div className="pill"/><h2>5 Kapış yaptın! 👏</h2><p>İlk kullanıcılarımızdan birisin. 20 saniyelik görüşün bizim için çok değerli.</p><div className="stars">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} className={rating>=n?'active':''}>★</button>)}</div><textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="En çok neyi sevdin / neyi değiştirelim?"/><button className="primary" onClick={submitFeedback}>Yorumu gönder</button><button className="ghost" onClick={()=>setFeedbackOpen(false)}>Sonra</button></div></div>}
  </main>;
}
