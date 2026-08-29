import { resolvedThemeStyle, type ThemeName, type ResolvedTheme } from './themes';

export type StoreProduct = { id: string; title: string; description?: string; price?: string | number; imageUrl?: string };

type Props = {
  storeName: string;
  logoUrl?: string | null;
  products: StoreProduct[];
  theme: ThemeName | ResolvedTheme;
  cartCount?: number;
  headerAction?: any;
  navigation?: any;
  onAdd?: (product: StoreProduct) => void;
  section?: 'home' | 'products';
};

export function StorefrontView({ storeName, logoUrl, products, theme, cartCount = 0, headerAction, navigation, onAdd, section = 'home' }: Props) {
  const visibleLogo = logoUrl ?? (typeof document === 'undefined' ? null : document.documentElement.dataset.storeLogo ?? null);
  const colors = resolvedThemeStyle(theme);
  const shell = { ...colors, minHeight: '100vh', background: 'var(--store-bg)', color: 'var(--store-ink)', fontFamily: 'ui-sans-serif, system-ui, sans-serif' } as any;
  const button = { border: 0, borderRadius: 3, padding: '10px 14px', background: 'var(--store-ink)', color: 'var(--store-bg)', cursor: 'pointer', font: 'inherit' } as any;
  return <div style={shell}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: '18px 5vw', borderBottom: '1px solid var(--store-line)' }}>
      <strong style={{ fontSize: 24, display:'flex', alignItems:'center', gap:10 }}>{visibleLogo ? <img src={visibleLogo} alt="" style={{width:72,height:52,objectFit:'contain'}} /> : storeName}</strong>
      {navigation && <nav style={{ display:'flex', gap:18, overflowX:'auto', maxWidth:'100%' }}>{navigation}</nav>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span>{cartCount} item{cartCount === 1 ? '' : 's'}</span>{headerAction}</div>
    </header>
    <section style={{ display: 'grid', gridTemplateColumns: `repeat(var(--${section}-columns, 3), minmax(0, 1fr))`, gap: 28, padding: '46px 5vw 130px' }}>
      {products.map(product => <article key={product.id} style={{ minWidth: 0, border:'var(--card-border, 1px) solid var(--store-line)', borderRadius:'var(--card-radius, 8px)', padding:12 }}>
        {product.imageUrl ? <img src={product.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', background: 'var(--store-line)' }} /> : <div style={{ width: '100%', aspectRatio: '1', background: 'var(--store-line)' }} />}
        <h2 style={{ margin: '14px 0 5px', fontSize: 20 }}>{product.title}</h2><p style={{ minHeight: 24, margin: '0 0 12px', color: 'var(--store-muted)' }}>{product.description || ''}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><strong>{product.price === undefined ? 'Contact for price' : `$${product.price}`}</strong>{onAdd && <button style={button} onClick={() => onAdd(product)}>Add to cart</button>}</div>
      </article>)}
    </section>
  </div>;
}
