'use client';
import { useEffect, useMemo, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { buyerShortCode, displayJobNo } from '../../lib/display';

export default function TasksPage(){
  const [tasks,setTasks]=useState<any[]>([]),[error,setError]=useState(''),[query,setQuery]=useState(''),[moduleFilter,setModuleFilter]=useState('ALL'),[priorityFilter,setPriorityFilter]=useState('ALL');
  useEffect(()=>{api('/tasks/my').then(setTasks).catch(e=>setError(e.message))},[]);
  const modules=useMemo(()=>Array.from(new Set(tasks.map(t=>String(t.module||'')).filter(Boolean))).sort(),[tasks]);
  const priorities=useMemo(()=>Array.from(new Set(tasks.map(t=>String(t.priority||'')).filter(Boolean))).sort(),[tasks]);
  const rows=useMemo(()=>tasks.filter(t=>{if(moduleFilter!=='ALL'&&String(t.module)!==moduleFilter)return false;if(priorityFilter!=='ALL'&&String(t.priority)!==priorityFilter)return false;const q=query.trim().toLowerCase();return !q||`${t.title} ${t.module} ${displayJobNo(t.order?.jobNo,t.order?.buyer)} ${buyerShortCode(t.order?.buyer?.code||t.order?.buyer?.name)}`.toLowerCase().includes(q)}),[tasks,moduleFilter,priorityFilter,query]);
  return <Shell title="My Pending Tasks"><div className="card">{error&&<div className="notice">{error}</div>}<div className="section-filter-bar"><label className="filter-grow"><span>Task / Buyer Job No</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…"/></label><label><span>Module</span><select value={moduleFilter} onChange={e=>setModuleFilter(e.target.value)}><option value="ALL">All</option>{modules.map(x=><option key={x}>{x}</option>)}</select></label><label><span>Priority</span><select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option value="ALL">All</option>{priorities.map(x=><option key={x}>{x}</option>)}</select></label></div><div className="table-scroll"><table className="table compact-table"><thead><tr><th>Task</th><th>Module</th><th>Buyer Job No</th><th>Priority</th><th>Status</th></tr></thead><tbody>{rows.map(t=><tr key={t.id}><td>{t.title}</td><td>{t.module}</td><td><strong>{displayJobNo(t.order?.jobNo,t.order?.buyer)}</strong></td><td><span className="badge">{t.priority}</span></td><td>{t.status}</td></tr>)}</tbody></table></div>{!rows.length&&!error&&<p className="muted">No pending tasks in this filter.</p>}</div></Shell>;
}
