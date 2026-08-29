import './globals.css';

export const metadata = {
  title: 'LAQTA Admin',
  description: 'Admin dashboard for the LAQTA spare-parts marketplace',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
