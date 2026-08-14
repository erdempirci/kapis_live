import React from 'react';
import {ImageResponse} from 'next/og';
export const runtime='edge';
export async function GET(){const inner=React.createElement('div',{style:{width:144,height:144,borderRadius:34,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',background:'linear-gradient(135deg,#1687FF 0 49%,#FF6B18 51% 100%)',fontSize:88}},'K',React.createElement('div',{style:{position:'absolute',right:7,bottom:7,background:'#fff',color:'#071426',borderRadius:9,padding:'4px 6px',fontSize:15}},'VS'));const root=React.createElement('div',{style:{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#071426',fontFamily:'Arial',fontWeight:900,color:'#fff'}},inner);return new ImageResponse(root,{width:180,height:180})}
