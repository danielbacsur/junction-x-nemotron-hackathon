import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Lookout — Video agents that follow through',
  description:
    'Teach a camera a procedure. Observe, investigate, and verify with NVIDIA Nemotron.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
