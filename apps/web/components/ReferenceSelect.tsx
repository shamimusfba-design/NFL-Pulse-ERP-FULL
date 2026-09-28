'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
export default function ReferenceSelect({category,value,onChange,className='form-control',placeholder='Select…'}:{category:string;value?:string;onChange:(v:string)=>void;className?:string;placeholder?:string}){
  const [rows,setRows]=useState<any[]>([]);
  useEffect(()=>{api(`/masters/references/${encodeURIComponent(category)}`).then(setRows).catch(()=>setRows([]))},[category]);
  const values=rows.map(r=>String(r.value)); const current=String(value||'');
  return <select className={className} value={current} onChange={e=>onChange(e.target.value)}><option value="">{placeholder}</option>{current&&!values.includes(current)&&<option value={current}>{current}</option>}{values.map(v=><option key={v} value={v}>{v}</option>)}</select>;
}
