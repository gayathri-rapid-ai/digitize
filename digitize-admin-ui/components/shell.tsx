'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const sections = ['dashboard','products','collections','orders','customers','discounts','team','settings','preview'];
export function Shell({bid,storeId,children}:{bid:string;storeId:string;children:React.ReactNode}) {
  const base=`/business/${bid}/store/${storeId}`, router=useRouter(), pathname=usePathname();
  return <div className="shell"><aside className="side"><div className="brand">digitize</div><nav className="nav">{sections.map(section=>{const href=`${base}/${section}`;return <Link key={section} href={href} className={pathname===href||pathname.startsWith(`${href}/`)?'active':''}>{section[0].toUpperCase()+section.slice(1)}</Link>;})}</nav></aside><main className="main"><div className="top"><span className="muted">Store workspace</span><button onClick={()=>{localStorage.removeItem('digitize_token');router.push('/business/login')}}>Sign out</button></div>{children}</main></div>;
}
