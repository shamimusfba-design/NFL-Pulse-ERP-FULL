'use client';
import Shell from '../../components/Shell';

const widgets=['Hourly Production vs Target','Production Achievement %','Line Efficiency','Line-wise DHU','Top Defects','Defect Pareto','OQL Indicator','Critical Line Alert'];
export default function FloorDisplay(){
  return <Shell title="Floor / TV Display Builder">
    <div className="card"><h3>Selectable live widgets</h3><p className="muted">Display-only. Authorized users will select widgets, save a layout and assign it to a floor/TV.</p><div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))'}}>{widgets.map(w=><label className="card" key={w} style={{padding:12}}><input type="checkbox" defaultChecked={['Hourly Production vs Target','Line Efficiency','Line-wise DHU','Top Defects','Critical Line Alert'].includes(w)} /> {w}</label>)}</div></div>
  </Shell>;
}
