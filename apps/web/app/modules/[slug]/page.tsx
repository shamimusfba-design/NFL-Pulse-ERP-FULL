import Link from 'next/link';
import Shell from '../../../components/Shell';
import { getModule, getSectionOverview } from '../../../lib/modules';
import DemoModulePreview from '../../../components/DemoModulePreview';
import RunningDataPreview from '../../../components/RunningDataPreview';
import SectionOverviewDashboard from '../../../components/SectionOverviewDashboard';

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const overview=getSectionOverview(slug);
  if(overview){
    return <Shell title={`${overview.label} Overview`} eyebrow="Section dashboard · relevant KPI, chart, risk and work areas">
      <section className="module-hero section-main-hero"><div><span className="status-pill">Section Overview</span><h2>{overview.label}</h2><p>{overview.description}</p></div><div className="module-actions"><Link href="/tasks" className="btn btn-secondary">My Pending Tasks</Link></div></section>
      <SectionOverviewDashboard overview={overview}/>
    </Shell>;
  }
  const mod = getModule(slug);
  const name = mod?.name || 'Module';
  return <Shell title={name} eyebrow="Operational workspace">
    <section className="module-hero">
      <div><span className="status-pill">{mod?.status || 'Planned'}</span><h2>{name}</h2><p>{mod?.description || 'Module workspace.'}</p></div>
      <div className="module-actions"><Link href="/tasks" className="btn btn-secondary">My Pending Tasks</Link><button className="btn btn-primary">+ New / Update</button></div>
    </section>
    <div className="workspace-tabs"><button className="active">Overview</button><button>My Pending Tasks</button><button>Entry / Follow-up</button><button>Reports</button></div>
    <section className="module-grid"><div className="panel span-2"><div className="panel-head"><div><div className="panel-title">Working overview</div><div className="panel-sub">Only this section's actual fields, filters and source reports belong here.</div></div></div><div className="workspace-empty"><div className="workspace-symbol">{mod?.short || 'ER'}</div><div><strong>{name} workspace</strong><span>Section-specific entry, follow-up and reports use the common ERP shell without duplicating data.</span></div></div></div><div className="panel"><div className="panel-title">Section design rule</div><div className="rule-list"><div><i className="ok">✓</i><span>Relevant filters only</span></div><div><i className="ok">✓</i><span>Compact job tables</span></div><div><i className="ok">✓</i><span>Auto downstream flow</span></div><div><i className="ok">✓</i><span>Exception-based tasks</span></div><div><i className="ok">✓</i><span>Relevant charts / reports only</span></div></div></div></section>
    <RunningDataPreview slug={slug} />
    <DemoModulePreview slug={slug} />
  </Shell>;
}
