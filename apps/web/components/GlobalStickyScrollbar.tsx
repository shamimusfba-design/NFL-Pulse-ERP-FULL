'use client';

import { useEffect, useRef, useState } from 'react';

type BarState = { left:number; width:number; scrollWidth:number; visible:boolean };

export default function GlobalStickyScrollbar(){
  const barRef=useRef<HTMLDivElement|null>(null);
  const targetRef=useRef<HTMLElement|null>(null);
  const syncing=useRef(false);
  const [state,setState]=useState<BarState>({left:0,width:0,scrollWidth:0,visible:false});

  useEffect(()=>{
    const selector='.gantt-shell,.wide-table-wrap,.table-scroll,[data-sticky-horizontal-scroll]';
    const pick=()=>{
      const candidates=Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(el=>el.scrollWidth>el.clientWidth+8 && getComputedStyle(el).display!=='none');
      let best:HTMLElement|null=null; let bestScore=-Infinity;
      for(const el of candidates){
        const r=el.getBoundingClientRect();
        const visible=Math.max(0,Math.min(r.bottom,window.innerHeight)-Math.max(r.top,0));
        const near=visible>0?visible*1000:-(Math.min(Math.abs(r.top-window.innerHeight),Math.abs(r.bottom)));
        if(near>bestScore){bestScore=near;best=el;}
      }
      if(targetRef.current!==best){
        if(targetRef.current)targetRef.current.removeEventListener('scroll',syncFromTarget);
        targetRef.current=best;
        if(best)best.addEventListener('scroll',syncFromTarget,{passive:true});
      }
      if(!best){setState(s=>s.visible?{...s,visible:false}:s);return;}
      const r=best.getBoundingClientRect();
      setState({left:Math.max(0,r.left),width:Math.min(window.innerWidth-Math.max(0,r.left),r.width),scrollWidth:best.scrollWidth,visible:true});
      requestAnimationFrame(syncFromTarget);
    };
    const syncFromTarget=()=>{
      if(syncing.current)return;
      const target=targetRef.current,bar=barRef.current;if(!target||!bar)return;
      syncing.current=true;bar.scrollLeft=target.scrollLeft;requestAnimationFrame(()=>{syncing.current=false});
    };
    const onScroll=()=>pick();
    const mo=new MutationObserver(()=>requestAnimationFrame(pick));
    mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
    window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',pick,{passive:true});
    pick();
    return()=>{window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',pick);mo.disconnect();targetRef.current?.removeEventListener('scroll',syncFromTarget);};
  },[]);

  function onBarScroll(){
    if(syncing.current)return;
    const target=targetRef.current,bar=barRef.current;if(!target||!bar)return;
    syncing.current=true;target.scrollLeft=bar.scrollLeft;requestAnimationFrame(()=>{syncing.current=false});
  }
  if(!state.visible)return null;
  return <div ref={barRef} className="global-sticky-hscroll" onScroll={onBarScroll} style={{left:state.left,width:state.width}} aria-label="Horizontal table scroll"><div style={{width:state.scrollWidth,height:1}}/></div>;
}
