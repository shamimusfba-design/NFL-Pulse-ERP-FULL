import './globals.css';
import '../components/ui/tokens.css';
import TableExportEnhancer from '../components/TableExportEnhancer';
import FxEnhancer from '../components/fx/FxEnhancer';
import PwaRegister from '../components/PwaRegister';

export const metadata = {
  title: 'NFL PULSE ERP · Northern Fashions Limited & Northern Clothing Ltd.',
  description: 'NFL PULSE ERP – Integrated Garment & Textile Manufacturing Operations Control',
  manifest: '/manifest.webmanifest',
  applicationName: 'NFL ERP',
  appleWebApp: { capable: true, title: 'NFL ERP', statusBarStyle: 'default' as const },
  icons: {
    icon: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f274e',
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
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
