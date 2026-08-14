import React from 'react';
import {ImageResponse} from 'next/og';
export const runtime='edge';
export async function GET(){const inner=React.createElement('div',{style:{width:150,height:150,borderRadius:38,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',background:'linear-gradient(135deg,#1687FF 0 49%,#FF6B18 51% 100%)',fontSize:92}},'K',React.createElement('div',{style:{position:'absolute',right:8,bottom:8,background:'#fff',color:'#071426',borderRadius:10,padding:'5px 7px',fontSize:16}},'VS'));const root=React.createElement('div',{style:{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#071426',fontFamily:'Arial',fontWeight:900,color:'#fff'}},inner);return new ImageResponse(root,{width:192,height:192})}
