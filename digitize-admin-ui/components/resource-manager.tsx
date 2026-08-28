'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Item = Record<string, unknown> & { id: string };
type Field = { key: string; label: string; type?: 'text' | 'number' | 'textarea' | 'select' | 'checkbox'; options?: string[] };
type Resource = 'products' | 'collections' | 'inventory' | 'orders' | 'customers' | 'discounts';

const definitions: Record<Resource, { title: string; description: string; fields: Field[] }> = {
  products: { title: 'Products', description: 'Create products and manage their variants, options, and gallery.', fields: [
    { key: 'name', label: 'Product name' }, { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'ACTIVE', 'ARCHIVED'] }, { key: 'price', label: 'Base price', type: 'number' }, { key: 'sku', label: 'SKU' },
  ] },
  collections: { title: 'Collections', description: 'Group products into browsable collections.', fields: [
    { key: 'title', label: 'Title' }, { key: 'handle', label: 'Handle' }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'active', label: 'Active', type: 'checkbox' },
  ] },
  inventory: { title: 'Inventory', description: 'Track stock records for your store.', fields: [
    { key: 'sku', label: 'SKU' }, { key: 'productName', label: 'Product name' }, { key: 'quantity', label: 'Quantity', type: 'number' }, { key: 'location', label: 'Location' },
  ] },
  orders: { title: 'Orders', description: 'Create orders and update their fulfillment status.', fields: [
    { key: 'orderNumber', label: 'Order number' }, { key: 'customerName', label: 'Customer' }, { key: 'status', label: 'Status', type: 'select', options: ['PENDING', 'PAID', 'FULFILLED', 'CANCELLED'] }, { key: 'total', label: 'Total', type: 'number' }, { key: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  customers: { title: 'Customers', description: 'Maintain your customer directory.', fields: [
    { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  discounts: { title: 'Discounts', description: 'Create codes and automatic promotions.', fields: [
    { key: 'code', label: 'Discount code' }, { key: 'type', label: 'Type', type: 'select', options: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'] }, { key: 'value', label: 'Value', type: 'number' }, { key: 'active', label: 'Active', type: 'checkbox' },
  ] },
};

function initialValues(fields: Field[], item?: Item): Record<string, string | boolean> {
  return Object.fromEntries(fields.map((field) => [field.key, field.type === 'checkbox' ? Boolean(item?.[field.key]) : String(item?.[field.key] ?? (field.type === 'select' ? field.options?.[0] ?? '' : ''))]));
}

function payload(fields: Field[], values: Record<string, string | boolean>) {
  return Object.fromEntries(fields.map((field) => [field.key, field.type === 'number' ? Number(values[field.key] || 0) : values[field.key]]));
}

function FieldInput({ field, values, setValues }: { field: Field; values: Record<string, string | boolean>; setValues: (next: Record<string, string | boolean>) => void }) {
  const value = values[field.key];
  if (field.type === 'checkbox') return <label className="check"><input type="checkbox" checked={Boolean(value)} onChange={(event) => setValues({ ...values, [field.key]: event.target.checked })} /> {field.label}</label>;
  return <label>{field.label}{field.type === 'textarea' ? <textarea value={String(value)} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} /> : field.type === 'select' ? <select value={String(value)} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}>{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : <input type={field.type ?? 'text'} value={String(value)} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} />}</label>;
}

export function ResourceManager({ bid, storeId, resource }: { bid: string; storeId: string; resource: Resource }) {
  const definition = definitions[resource];
  const endpoint = `/admin/business/${bid}/stores/${storeId}/${resource}`;
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => initialValues(definition.fields));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const token = typeof window === 'undefined' ? null : localStorage.getItem('digitize_token');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try { setItems(await api<Item[]>(endpoint, token)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load records'); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [endpoint]);

  const edit = (item: Item) => { setEditing(item); setValues(initialValues(definition.fields, item)); setMessage(''); };
  const reset = () => { setEditing(null); setValues(initialValues(definition.fields)); setMessage(''); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    try {
      const result = await api<Item>(editing ? `${endpoint}/${editing.id}` : endpoint, token, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload(definition.fields, values)) });
      setItems((current) => editing ? current.map((item) => item.id === result.id ? result : item) : [result, ...current]);
      reset(); setMessage(editing ? 'Changes saved.' : 'Created successfully.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save record'); }
  };
  const remove = async (item: Item) => {
    if (!token || !window.confirm(`Delete ${String(item.name ?? item.title ?? item.code ?? item.id)}?`)) return;
    try { await api(`${endpoint}/${item.id}`, token, { method: 'DELETE' }); setItems((current) => current.filter((entry) => entry.id !== item.id)); if (editing?.id === item.id) reset(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete record'); }
  };

  return <>
    <div className="page-head"><div><h1>{definition.title}</h1><p className="muted">{definition.description}</p></div><button onClick={reset}>New {definition.title.slice(0, -1)}</button></div>
    {message && <p className="notice">{message}</p>}
    <div className="manager-grid"><section className="panel"><h2>{editing ? `Edit ${definition.title.slice(0, -1)}` : `New ${definition.title.slice(0, -1)}`}</h2><form className="form-grid" onSubmit={save}>{definition.fields.map((field) => <FieldInput key={field.key} field={field} values={values} setValues={setValues} />)}<div className="actions"><button type="submit">{editing ? 'Save changes' : 'Create'}</button>{editing && <button type="button" className="secondary" onClick={reset}>Cancel</button>}</div></form></section>
      <section className="panel"><h2>Records</h2>{loading ? <p className="muted">Loading…</p> : items.length === 0 ? <p className="muted">No records yet.</p> : <div className="record-list">{items.map((item) => <article className="record" key={item.id}><div><strong>{String(item.name ?? item.title ?? item.orderNumber ?? item.code ?? item.sku ?? 'Untitled')}</strong><p className="muted">{definition.fields.slice(1, 3).map((field) => `${field.label}: ${String(item[field.key] ?? '—')}`).join(' · ')}</p></div><div className="row-actions"><button className="secondary" onClick={() => edit(item)}>Edit</button>{resource === 'products' && <button className="secondary" onClick={() => edit(item)}>Catalog</button>}<button className="danger" onClick={() => void remove(item)}>Delete</button></div></article>)}</div>}</section></div>
    {resource === 'products' && editing && token && <ProductCatalog bid={bid} storeId={storeId} product={editing} token={token} />}
  </>;
}

type Option = { id: string; name: string; values: { id: string; value: string }[] };
type Variant = { id: string; sku?: string; price: string | number; inventory_quantity?: number };
type Image = { id: string; url: string; storage_key: string; alt_text?: string };

function ProductCatalog({ bid, storeId, product, token }: { bid: string; storeId: string; product: Item; token: string }) {
  const base = `/admin/business/${bid}/stores/${storeId}/products/${product.id}`;
  const [options, setOptions] = useState<Option[]>([]); const [variants, setVariants] = useState<Variant[]>([]); const [images, setImages] = useState<Image[]>([]); const [notice, setNotice] = useState('');
  const [optionName, setOptionName] = useState(''); const [optionValues, setOptionValues] = useState('');
  const [sku, setSku] = useState(''); const [price, setPrice] = useState(''); const [stock, setStock] = useState('0'); const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState(''); const [storageKey, setStorageKey] = useState(''); const [altText, setAltText] = useState('');
  const load = async () => { try { const [nextOptions, nextVariants, nextImages] = await Promise.all([api<Option[]>(`${base}/options`, token), api<Variant[]>(`${base}/variants`, token), api<Image[]>(`${base}/images`, token)]); setOptions(nextOptions); setVariants(nextVariants); setImages(nextImages); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load catalog'); } };
  useEffect(() => { void load(); }, [base]);
  const valueChoices = useMemo(() => options.flatMap((option) => option.values.map((value) => ({ ...value, option: option.name }))), [options]);
  const addOption = async (event: FormEvent) => { event.preventDefault(); try { await api(`${base}/options`, token, { method: 'POST', body: JSON.stringify({ name: optionName, values: optionValues.split(',').map((value) => value.trim()).filter(Boolean) }) }); setOptionName(''); setOptionValues(''); await load(); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to add option'); } };
  const addVariant = async (event: FormEvent) => { event.preventDefault(); try { const result = await api<Variant>(`${base}/variants`, token, { method: 'POST', body: JSON.stringify({ sku, price: Number(price), inventoryQuantity: Number(stock), optionValueIds: selectedValues }) }); setVariants((current) => [...current, result]); setSku(''); setPrice(''); setStock('0'); setSelectedValues([]); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to add variant'); } };
  const addImage = async (event: FormEvent) => { event.preventDefault(); try { const result = await api<Image>(`${base}/images`, token, { method: 'POST', body: JSON.stringify({ url: imageUrl, storageKey, altText }) }); setImages((current) => [...current, result]); setImageUrl(''); setStorageKey(''); setAltText(''); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to add image'); } };
  return <section className="panel catalog"><h2>Catalog for {String(product.name)}</h2><p className="muted">Options, variants, and image records are stored with this product.</p>{notice && <p className="notice">{notice}</p>}<div className="catalog-grid"><form className="form-grid" onSubmit={addOption}><h3>Add option</h3><label>Name<input required value={optionName} onChange={(event) => setOptionName(event.target.value)} placeholder="Size" /></label><label>Values (comma-separated)<input required value={optionValues} onChange={(event) => setOptionValues(event.target.value)} placeholder="Small, Medium, Large" /></label><button>Add option</button><ul className="compact-list">{options.map((option) => <li key={option.id}><strong>{option.name}</strong>: {option.values.map((value) => value.value).join(', ')}</li>)}</ul></form>
    <form className="form-grid" onSubmit={addVariant}><h3>Add variant</h3><label>SKU<input value={sku} onChange={(event) => setSku(event.target.value)} /></label><label>Price<input required type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Stock<input type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} /></label><fieldset><legend>Option values</legend>{valueChoices.map((value) => <label className="check" key={value.id}><input type="checkbox" checked={selectedValues.includes(value.id)} onChange={() => setSelectedValues((current) => current.includes(value.id) ? current.filter((id) => id !== value.id) : [...current, value.id])} /> {value.option}: {value.value}</label>)}</fieldset><button>Add variant</button><ul className="compact-list">{variants.map((variant) => <li key={variant.id}>{variant.sku || 'No SKU'} · {variant.price} · stock {variant.inventory_quantity ?? 0}</li>)}</ul></form>
    <form className="form-grid" onSubmit={addImage}><h3>Add image record</h3><label>Image URL<input required type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></label><label>Storage key<input required value={storageKey} onChange={(event) => setStorageKey(event.target.value)} /></label><label>Alt text<input value={altText} onChange={(event) => setAltText(event.target.value)} /></label><button>Add image</button><div className="image-grid">{images.map((image) => <img key={image.id} src={image.url} alt={image.alt_text ?? ''} />)}</div></form></div></section>;
}
