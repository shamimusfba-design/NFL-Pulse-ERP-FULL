'use client';
import { useEffect, useState } from 'react';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';

export default function TasksPage(){
  const [tasks,setTasks]=useState<any[]>([]); const [error,setError]=useState('');
  useEffect(()=>{api('/tasks/my').then(setTasks).catch(e=>setError(e.message));},[]);
  return <Shell title="My Pending Tasks"><div className="card">{error&&<div className="notice">{error}</div>}<table className="table"><thead><tr><th>Task</th><th>Module</th><th>Job</th><th>Buyer</th><th>Priority</th><th>Status</th></tr></thead><tbody>{tasks.map(t=><tr key={t.id}><td>{t.title}</td><td>{t.module}</td><td>{t.order?.jobNo||'-'}</td><td>{t.order?.buyer?.name||'-'}</td><td><span className="badge">{t.priority}</span></td><td>{t.status}</td></tr>)}</tbody></table>{!tasks.length&&!error&&<p className="muted">No pending tasks for this user/role.</p>}</div></Shell>;
}
