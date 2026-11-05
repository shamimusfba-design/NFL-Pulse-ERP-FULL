import './globals.css';
import TableExportEnhancer from '../components/TableExportEnhancer';
import FxEnhancer from '../components/fx/FxEnhancer';

export const metadata = {
  title: 'NFL PULSE ERP · Northern Fashions Limited & Northern Clothing Ltd.',
  description: 'NFL PULSE ERP – Integrated Garment & Textile Manufacturing Operations Control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nos-theme')||'light';document.documentElement.dataset.theme=t;}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <TableExportEnhancer />
        <FxEnhancer />
        {children}
      </body>
    </html>
  );
}
