'use client';
import { useEffect, useState } from 'react';
import { StorefrontView, type StoreProduct } from '../../digitize-design-system/storefront';
import { themes, type ResolvedTheme } from '../../digitize-design-system/themes';

type Product={id:string;name?:string;title?:string;description?:string;price?:string|number};
type Page = 'home' | 'collections' | 'products' | 'orders';
const fallback:ResolvedTheme={name:'simple-light',version:1,configuration:themes[0].tokens};
const pages:Array<{key:Page;label:string}>=[{key:'home',label:'Home'},{key:'collections',label:'Collections'},{key:'products',label:'Products'},{key:'orders',label:'Orders'}];
const controls:Array<{key:string;label:string;page?:Page;placeholder:string}>=[
 {key:'--home-columns',label:'Home columns',page:'home',placeholder:'3'},
 {key:'--collections-columns',label:'Collection columns',page:'collections',placeholder:'3'},
 {key:'--products-columns',label:'Product columns',page:'products',placeholder:'3'},
 {key:'--orders-columns',label:'Order columns',page:'orders',placeholder:'1'},
 {key:'--card-border',label:'Border width',placeholder:'1px'},
 {key:'--card-radius',label:'Corner roundness',placeholder:'8px'},
];

export default function Preview(){
 const [theme,setTheme]=useState<ResolvedTheme>(fallback),[available,setAvailable]=useState<ResolvedTheme[]>([]),[products,setProducts]=useState<StoreProduct[]>([]),[page,setPage]=useState<Page>('home'),[message,setMessage]=useState('');
 const scope=()=>{const p=new URLSearchParams(location.search);return{bid:p.get('bid'),storeId:p.get('storeId'),token:localStorage.getItem('digitize_token')}};
 const save=async(next:ResolvedTheme)=>{const {bid,storeId,token}=scope();if(!bid||!storeId||!token)return;const r=await fetch(`/api/business/${bid}/stores/${storeId}/themes/current`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(next)});setMessage(r.ok?'Changes saved.':'Unable to save changes.');};
 useEffect(()=>{const {bid,storeId,token}=scope();if(!bid||!storeId||!token){setMessage('Open this preview from the business admin.');return;}const h={Authorization:`Bearer ${token}`},base=`/api/business/${bid}/stores/${storeId}`;Promise.all([fetch(`${base}/themes`,{headers:h}),fetch(`${base}/themes/current`,{headers:h}),fetch(`${base}/products`,{headers:h})]).then(async([a,b,c])=>{const choices=await a.json() as ResolvedTheme[];setAvailable(choices);setTheme(await b.json());const list=await c.json() as Product[];const cards=await Promise.all(list.map(async p=>{const images=await fetch(`${base}/products/${p.id}/images`,{headers:h});const gallery=images.ok?await images.json():[];return{id:p.id,title:p.name??p.title??'Untitled product',description:p.description,price:p.price,imageUrl:gallery[0]?.url} as StoreProduct;}));setProducts(cards);}).catch(()=>setMessage('Unable to load preview.'));},[]);
 const choose=(value:string)=>{const next=available.find(item=>item.name===value);if(next){setTheme(next);void save(next);}};
 const change=(key:string,value:string)=>setTheme(current=>({...current,configuration:{...current.configuration,[key]:value}}));
 const visible=page==='home'?products.slice(0,3):page==='products'?products:products.slice(0,Math.max(1,Math.min(products.length,3)));
 const nav=<>{pages.map(item=><a key={item.key} className="nav-link" href={`#${item.key}`} onClick={event=>{event.preventDefault();setPage(item.key);}}>{item.label}</a>)}</>;
 return <main className="editor-shell">
  <aside className="editor-sidebar">
   <div className="editor-brand"><span className="brand-mark">D</span><div><strong>Store editor</strong><small>Live preview</small></div></div>
   <section className="editor-section"><h2>Pages</h2><nav className="page-list">{pages.map(item=><button className={page===item.key?'active':''} key={item.key} onClick={()=>setPage(item.key)}><span>{item.label}</span><span>›</span></button>)}</nav></section>
   <section className="editor-section"><h2>Theme</h2><label className="field">Style<select value={theme.name} onChange={event=>choose(event.target.value)}>{available.map(item=><option key={item.name} value={item.name}>{item.name==='simple-dark'?'Simple dark':'Simple light'}</option>)}</select></label></section>
   <section className="editor-section"><h2>Layout</h2><div className="theme-controls">{controls.filter(control=>!control.page||control.page===page).map(control=><label className="field" key={control.key}>{control.label}<input placeholder={control.placeholder} value={theme.configuration[control.key]??''} onChange={event=>change(control.key,event.target.value)}/></label>)}</div></section>
   <div className="editor-actions"><button className="save-button" onClick={()=>void save(theme)}>Save changes</button>{message&&<p role="status">{message}</p>}</div>
  </aside>
  <section className="preview-canvas"><div className="preview-toolbar"><span>{pages.find(item=>item.key===page)?.label}</span><span>Desktop preview</span></div><div className="store-frame"><StorefrontView storeName="Store preview" theme={theme} section={page} products={visible} navigation={nav}/></div></section>
 </main>;
}
