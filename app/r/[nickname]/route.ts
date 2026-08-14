import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export async function GET(request:Request,{params}:{params:Promise<{nickname:string}>}){
 const {nickname}=await params;
 const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
 const {data}=await supabase.rpc('kapis_resolve_referrer',{p_ref:decodeURIComponent(nickname)});
 const target=new URL('/',request.url);
 if(data)target.searchParams.set('ref',String(data));
 return NextResponse.redirect(target,302);
}
