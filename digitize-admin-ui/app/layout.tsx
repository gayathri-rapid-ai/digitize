import './globals.css';
import './editor.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Digitize Admin', description: 'Business and store administration' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
