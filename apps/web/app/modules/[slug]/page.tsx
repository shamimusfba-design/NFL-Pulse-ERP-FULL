import Link from 'next/link';
import Shell from '../../../components/Shell';
import { getModule } from '../../../lib/modules';
import DemoModulePreview from '../../../components/DemoModulePreview';

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mod = getModule(slug);
  const name = mod?.name || 'Module';
  return <Shell title={name} eyebrow="Operational workspace">
    <section className="module-hero">
      <div><span className="status-pill">{mod?.status || 'Planned'}</span><h2>{name}</h2><p>{mod?.description || 'Module workspace.'}</p></div>
      <div className="module-actions"><Link href="/tasks" className="btn btn-secondary">My Pending Tasks</Link><button className="btn btn-primary">+ New / Update</button></div>
    </section>

    <div className="workspace-tabs"><button className="active">Overview</button><button>My Pending Tasks</button><button>Entry / Follow-up</button><button>Reports</button></div>

    <section className="module-grid">
      <div className="panel span-2">
        <div className="panel-head"><div><div className="panel-title">Working overview</div><div className="panel-sub">This area will use only the section's actual fields and source reports.</div></div></div>
        <div className="workspace-empty">
          <div className="workspace-symbol">{mod?.short || 'ER'}</div>
          <div><strong>{name} workspace is reserved and connected to the common ERP shell.</strong><span>Next implementation will add the actual entry, follow-up, pending tasks, reports and calculations for this section without duplicating data.</span></div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-title">Common design rule</div>
        <div className="rule-list"><div><i className="ok">✓</i><span>Existing data first</span></div><div><i className="ok">✓</i><span>Dropdowns for repeat values</span></div><div><i className="ok">✓</i><span>Auto downstream flow</span></div><div><i className="ok">✓</i><span>Exception-based tasks</span></div><div><i className="ok">✓</i><span>Relevant reports only</span></div></div>
      </div>
    </section>
    <DemoModulePreview slug={slug} />
  </Shell>;
}
