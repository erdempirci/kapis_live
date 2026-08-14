import React from 'react';
import {ImageResponse} from 'next/og';
export const runtime='edge';
export async function GET(){const inner=React.createElement('div',{style:{width:400,height:400,borderRadius:96,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',background:'linear-gradient(135deg,#1687FF 0 49%,#FF6B18 51% 100%)',fontSize:245}},'K',React.createElement('div',{style:{position:'absolute',right:22,bottom:22,background:'#fff',color:'#071426',borderRadius:26,padding:'13px 18px',fontSize:44}},'VS'));const root=React.createElement('div',{style:{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#071426',fontFamily:'Arial',fontWeight:900,color:'#fff'}},inner);return new ImageResponse(root,{width:512,height:512})}
