import { themeStyle, type ThemeName } from './themes';

export type StoreProduct = { id: string; title: string; description?: string; price?: string | number; imageUrl?: string };

type Props = {
  storeName: string;
  products: StoreProduct[];
  theme: ThemeName;
  cartCount?: number;
  headerAction?: any;
  navigation?: any;
  onAdd?: (product: StoreProduct) => void;
};

export function StorefrontView({ storeName, products, theme, cartCount = 0, headerAction, navigation, onAdd }: Props) {
  const colors = themeStyle(theme);
  const shell = { ...colors, minHeight: '100vh', background: 'var(--store-bg)', color: 'var(--store-ink)', fontFamily: 'ui-sans-serif, system-ui, sans-serif' } as any;
  const button = { border: 0, borderRadius: 3, padding: '10px 14px', background: 'var(--store-ink)', color: 'var(--store-bg)', cursor: 'pointer', font: 'inherit' } as any;
  return <div style={shell}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', padding: '18px 5vw', borderBottom: '1px solid var(--store-line)' }}>
      <strong style={{ fontSize: 24 }}>{storeName}</strong>
      {navigation && <nav style={{ display:'flex', gap:18, overflowX:'auto', maxWidth:'100%' }}>{navigation}</nav>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span>{cartCount} item{cartCount === 1 ? '' : 's'}</span>{headerAction}</div>
    </header>
    <section style={{ padding: '68px 5vw 44px', background: 'var(--store-accent)' }}><p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '.12em' }}>SHOP ONLINE</p><h1 style={{ maxWidth: 900, margin: '12px 0 0', fontSize: 'clamp(38px, 7vw, 88px)', lineHeight: '.94', letterSpacing: '-.06em' }}>Find something worth bringing home.</h1></section>
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 28, padding: '46px 5vw 130px' }}>
      {products.map(product => <article key={product.id} style={{ minWidth: 0 }}>
        {product.imageUrl ? <img src={product.imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', background: 'var(--store-line)' }} /> : <div style={{ width: '100%', aspectRatio: '1', background: 'var(--store-line)' }} />}
        <h2 style={{ margin: '14px 0 5px', fontSize: 20 }}>{product.title}</h2><p style={{ minHeight: 24, margin: '0 0 12px', color: 'var(--store-muted)' }}>{product.description || ''}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><strong>{product.price === undefined ? 'Contact for price' : `$${product.price}`}</strong>{onAdd && <button style={button} onClick={() => onAdd(product)}>Add to cart</button>}</div>
      </article>)}
    </section>
  </div>;
}
