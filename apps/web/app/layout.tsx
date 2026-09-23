import './globals.css';
export const metadata = { title: 'NFL Pulse ERP', description: 'Garment ERP for NFL / NCL' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
