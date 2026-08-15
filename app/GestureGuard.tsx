'use client';

import {useEffect} from 'react';

export default function GestureGuard(){
  useEffect(()=>{
    let startX=0,startY=0,tracking=false,vertical=false;

    const isSwipeCard=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('.swipeCardActive');

    const onDown=(e:PointerEvent)=>{
      if(!isSwipeCard(e.target))return;
      tracking=true;vertical=false;startX=e.clientX;startY=e.clientY;
    };

    const onMove=(e:PointerEvent)=>{
      if(!tracking)return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      if(!vertical&&Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)+6)vertical=true;
      if(vertical){
        // Keep normal iPhone page scrolling alive and prevent SwipeEnhancer
        // from interpreting a vertical scroll as the “skip” gesture.
        e.stopPropagation();
      }
    };

    const onUp=(e:PointerEvent)=>{
      if(!tracking)return;
      if(vertical)e.stopPropagation();
      tracking=false;vertical=false;
    };

    document.addEventListener('pointerdown',onDown,true);
    document.addEventListener('pointermove',onMove,true);
    document.addEventListener('pointerup',onUp,true);
    document.addEventListener('pointercancel',onUp,true);
    return()=>{
      document.removeEventListener('pointerdown',onDown,true);
      document.removeEventListener('pointermove',onMove,true);
      document.removeEventListener('pointerup',onUp,true);
      document.removeEventListener('pointercancel',onUp,true);
    };
  },[]);
  return null;
}
