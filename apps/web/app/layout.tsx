import './globals.css';
import TableExportEnhancer from '../components/TableExportEnhancer';

export const metadata = {
  title: 'NOS · Northern Operating System — Merchandising Command Center',
  description: 'NOS – Northern Operating System: Merchandising Control Tower & Operations Management for Northern Fashions Limited (NFL / NCL)',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><TableExportEnhancer />{children}</body></html>;
}
