import Shell from '../../../components/Shell';
import JobHistoryWorkspace from '../../../components/JobHistoryWorkspace';
export default function Page(){return <Shell title="Lead Time & Delivery History" eyebrow="Central Planning · planned vs actual timing"><JobHistoryWorkspace mode="leadtime" /></Shell>}
