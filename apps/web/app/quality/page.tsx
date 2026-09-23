'use client';
import Shell from '../../components/Shell';

const kpis = [
  ['Overall DHU','7.6'],
  ['OQL %','—'],
  ['Internal Final Pass Rate','—'],
  ['Buyer Final Pass Rate','—'],
  ['Checked Qty','—'],
  ['Total Defects','—'],
  ['Defective Pieces','—'],
  ['Highest DHU Line','—'],
];

export default function QualityDashboard(){
  return <Shell title="Quality — One Page Dashboard">
    <div className="card" style={{marginBottom:12}}><b>Filters:</b> Factory · Floor · Line · Date · Shift</div>
    <div className="grid kpis">{kpis.map(([k,v])=><div className="card" key={k}><div className="label">{k}</div><div className="value">{v}</div></div>)}</div>
    <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',marginTop:16}}>
      {['Line-wise DHU','Hourly DHU Trend','OQL Trend','Floor-wise DHU','Defect Pareto','Defect Mix'].map(x=><div className="card" key={x} style={{minHeight:170}}><h3>{x}</h3><p className="muted">Live chart placeholder — bind to quality source tables during Quality implementation.</p></div>)}
    </div>
    <div className="card" style={{marginTop:16}}><h3>Live Line Quality Table</h3><p className="muted">Floor · Line · Checked · Defects · Defective Pieces · DHU · Top Defect · 1st Hour DHU · Last Hour DHU · Trend · Status</p></div>
  </Shell>;
}
