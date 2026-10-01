import './globals.css';
export const metadata = {
  title: 'NFL Pulse ERP · Northern Fashions Limited',
  description: 'Enterprise Resource Planning system for Northern Fashions Limited (NFL / NCL) garment manufacturing',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
