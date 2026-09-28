'use client';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [email,setEmail]=useState('admin@nfl.local');
  const [password,setPassword]=useState('ChangeMe123!');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res=await fetch(`/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const data=await res.json(); if(!res.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('nfl_access_token',data.accessToken); localStorage.setItem('nfl_refresh_token',data.refreshToken); localStorage.setItem('nfl_user',JSON.stringify(data.user)); location.href='/';
    } catch(err:any){ setError(err.message); } finally { setLoading(false); }
  }
  return <div className="login-wrap"><form className="login-card" onSubmit={submit}><img className="login-company-logo" src="/branding/northern-fashions-logo.jpg" alt="Northern Fashions Limited"/><div className="label">Garment ERP</div><h1>Northern Fashions Limited</h1><p className="muted">NFL Pulse ERP v0.4.35</p><div className="field" style={{marginTop:20}}><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} /></div><div className="field" style={{marginTop:12}}><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>{error&&<div className="notice">{error}</div>}<button className="btn btn-primary" style={{width:'100%',marginTop:18}} disabled={loading}>{loading?'Signing in...':'Sign in'}</button></form></div>;
}
