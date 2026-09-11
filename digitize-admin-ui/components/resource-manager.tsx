'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../lib/api';

type Item = Record<string, unknown> & { id: string };
type Field = { key: string; label: string; type?: 'text' | 'number' | 'textarea' | 'select' | 'checkbox'; options?: string[]; required?: boolean };
type Resource = 'products' | 'collections' | 'orders' | 'customers' | 'discounts';

const definitions: Record<Resource, { title: string; description: string; fields: Field[] }> = {
  products: { title: 'Products', description: 'Create products and manage their variants, options, and gallery.', fields: [
    { key: 'name', label: 'Product name', required: true }, { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'ACTIVE', 'ARCHIVED'], required: true }, { key: 'price', label: 'Base price', type: 'number', required: true }, { key: 'sku', label: 'SKU' },
  ] },
  collections: { title: 'Collections', description: 'Group products into browsable collections.', fields: [
    { key: 'title', label: 'Title', required: true }, { key: 'handle', label: 'Handle', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'active', label: 'Active', type: 'checkbox' },
  ] },
  orders: { title: 'Orders', description: 'Review orders placed through your store.', fields: [
    { key: 'orderNumber', label: 'Order number' }, { key: 'customerName', label: 'Customer' }, { key: 'status', label: 'Status', type: 'select', options: ['PENDING', 'PAID', 'FULFILLED', 'CANCELLED'] }, { key: 'total', label: 'Total', type: 'number' }, { key: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  customers: { title: 'Customers', description: 'Review your customer directory.', fields: [
    { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  discounts: { title: 'Discounts', description: 'Create codes and automatic promotions.', fields: [
    { key: 'code', label: 'Discount code', required: true }, { key: 'type', label: 'Type', type: 'select', options: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'], required: true }, { key: 'value', label: 'Value', type: 'number', required: true }, { key: 'active', label: 'Active', type: 'checkbox' },
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
  const caption = <span>{field.label}{field.required && <span aria-label="required" style={{ color: 'var(--danger)', fontWeight: 800 }}> *</span>}</span>;
  if (field.type === 'textarea') return <label>{caption}<textarea required={field.required} value={String(value)} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} /></label>;
  if (field.type === 'select') return <label>{caption}<select required={field.required} value={String(value)} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}>{field.options?.map((option) => <option key={option}>{option}</option>)}</select></label>;
  return <label>{caption}<input required={field.required} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? '0.01' : undefined} type={field.type ?? 'text'} value={String(value)} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} /></label>;
}

export function ResourceManager({ bid, storeId, resource, itemId }: { bid: string; storeId: string; resource: Resource; itemId?: string }) {
  const definition = definitions[resource];
  const endpoint = `/api/business/${bid}/stores/${storeId}/${resource}`;
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => initialValues(definition.fields));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [existingProductImage, setExistingProductImage] = useState('');
  const [page, setPage] = useState<'list' | 'form'>(itemId ? 'form' : 'list');
  const readOnly = resource === 'orders' || resource === 'customers';
  const routedEditor = resource === 'products' || resource === 'collections';
  const router = useRouter(), pathname = usePathname();
  const listPath = `/business/${bid}/store/${storeId}/${resource}`;
  const token = typeof window === 'undefined' ? null : localStorage.getItem('digitize_token');
  const productImagePreview = useMemo(() => productImage ? URL.createObjectURL(productImage) : existingProductImage, [productImage, existingProductImage]);
  useEffect(() => () => { if (productImagePreview.startsWith('blob:')) URL.revokeObjectURL(productImagePreview); }, [productImagePreview]);
  useEffect(() => { setProductImage(null); if (itemId === 'new') setExistingProductImage(''); }, [itemId]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try { const records=await api<Item[]>(endpoint, token);setItems(records);if(itemId&&itemId!=='new'){const selected=records.find(item=>item.id===itemId);if(selected){setEditing(selected);setValues(initialValues(definition.fields,selected));if(resource==='products'){const images=await api<Array<{url:string}>>(`${endpoint}/${selected.id}/images`,token);setExistingProductImage(images[0]?.url??'');}}else setMessage(`${definition.title.slice(0,-1)} was not found.`);} } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load records'); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [endpoint,itemId]);

  const edit = (item: Item) => { if(routedEditor){router.push(`${listPath}/${item.id}`);return;}setEditing(item);setValues(initialValues(definition.fields,item));setMessage('');setPage('form'); };
  const reset = () => { if(routedEditor&&itemId){router.push(listPath);return;}setEditing(null);setValues(initialValues(definition.fields));setProductImage(null);setMessage('');setPage('list'); };
  const create = () => { if(routedEditor){router.push(`${pathname}/new`);return;}setEditing(null);setValues(initialValues(definition.fields));setProductImage(null);setMessage('');setPage('form'); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const missing = definition.fields.find((field) => field.required && String(values[field.key] ?? '').trim() === '');
    if (missing) { setMessage(`${missing.label} is required.`); return; }
    try {
      const result = await api<Item>(editing ? `${endpoint}/${editing.id}` : endpoint, token, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload(definition.fields, values)) });
      if (resource === 'products' && productImage) {
        const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(productImage); });
        const media = await api<{ url:string; storageKey:string }>(`/api/business/${bid}/stores/${storeId}/media`, token, { method:'POST', body:JSON.stringify({ filename:productImage.name, mimeType:productImage.type, base64 }) });
        await api(`/api/business/${bid}/stores/${storeId}/products/${result.id}/images`, token, { method:'POST', body:JSON.stringify({ url:media.url, storageKey:media.storageKey }) });
      }
      setItems((current) => editing ? current.map((item) => item.id === result.id ? result : item) : [result, ...current]);
      setProductImage(null); if(routedEditor)router.push(listPath);else reset(); setMessage(editing ? 'Changes saved.' : 'Created successfully.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save record'); }
  };
  const remove = async (item: Item) => {
    if (!token || !window.confirm(`Delete ${String(item.name ?? item.title ?? item.code ?? item.id)}?`)) return;
    try { await api(`${endpoint}/${item.id}`, token, { method: 'DELETE' }); setItems((current) => current.filter((entry) => entry.id !== item.id)); if (editing?.id === item.id) reset(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete record'); }
  };

  return <>
    <div className="page-head"><div><h1>{page === 'form' ? `${editing ? 'Edit' : 'Add'} ${definition.title.slice(0, -1)}` : definition.title}</h1><p className="muted">{definition.description}</p></div>{!readOnly && (page === 'list' ? <button onClick={create}>Add {definition.title.slice(0, -1)}</button> : <button className="secondary" onClick={reset}>Back to {definition.title}</button>)}</div>
    {message && <p className="notice">{message}</p>}
    {page === 'list' && <section className="panel"><h2>{definition.title}</h2>{loading ? <p className="muted">Loading…</p> : items.length === 0 ? <p className="muted">No records yet.</p> : <div className="record-list">{items.map((item) => <article className="record" key={item.id}><div><strong>{String(item.name ?? item.title ?? item.orderNumber ?? item.customerName ?? item.email ?? item.code ?? 'Untitled')}</strong><p className="muted">{definition.fields.slice(1, 4).map((field) => `${field.label}: ${String(item[field.key] ?? '—')}`).join(' · ')}</p></div>{!readOnly&&<div className="row-actions"><button className="secondary" onClick={() => edit(item)}>Edit</button><button className="danger" onClick={() => void remove(item)}>Delete</button></div>}</article>)}</div>}</section>}
    {page === 'form' && !readOnly && <div className={resource==='products'?'product-editor-layout':''}><section className="panel narrow editor-form"><form className="form-grid" onSubmit={save}>{definition.fields.map((field) => <FieldInput key={field.key} field={field} values={values} setValues={setValues} />)}<div className="actions"><button type="submit">{editing ? 'Save changes' : 'Create'}</button><button type="button" className="secondary" onClick={reset}>Cancel</button></div></form></section>{resource==='products'&&<aside className="panel product-image-panel"><h2>Product image</h2><div className="product-image-preview">{productImagePreview?<img src={productImagePreview} alt="Product preview"/>:<span>No product image selected</span>}</div><label>Choose image<input type="file" accept="image/*" onChange={event=>setProductImage(event.target.files?.[0]??null)}/></label><p className="muted">Use a square image for the best storefront result.</p></aside>}</div>}
    {page === 'form' && resource === 'products' && editing && token && <ProductCatalog bid={bid} storeId={storeId} product={editing} token={token} />}
    {page === 'form' && resource === 'collections' && editing && token && <CollectionImages bid={bid} storeId={storeId} collection={editing} token={token} />}
  </>;
}

type CollectionImage = { id: string; url: string; storage_key: string; alt_text?: string };
function CollectionImages({ bid, storeId, collection, token }: { bid:string; storeId:string; collection:Item; token:string }) {
  const endpoint = `/api/business/${bid}/stores/${storeId}/collections/${collection.id}/images`;
  const [images,setImages] = useState<CollectionImage[]>([]); const [url,setUrl] = useState(''); const [storageKey,setStorageKey] = useState(''); const [altText,setAltText] = useState(''); const [notice,setNotice] = useState('');
  const chooseImage = async (file:File) => { const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);});const uploaded=await api<{url:string;storageKey:string}>(`/api/business/${bid}/stores/${storeId}/media`,token,{method:'POST',body:JSON.stringify({filename:file.name,mimeType:file.type,base64})});setUrl(uploaded.url);setStorageKey(uploaded.storageKey); };
  const load = async () => { try { setImages(await api<CollectionImage[]>(endpoint,token)); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load collection images'); } };
  useEffect(() => { void load(); }, [endpoint]);
  const add = async (event:FormEvent) => { event.preventDefault(); try { const image=await api<CollectionImage>(endpoint,token,{method:'POST',body:JSON.stringify({url,storageKey,altText})});setImages(current=>[...current,image]);setUrl('');setStorageKey('');setAltText(''); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to add collection image'); } };
  return <section className="panel catalog"><h2>Images for {String(collection.title)}</h2>{notice&&<p className="notice">{notice}</p>}<form className="form-grid narrow" onSubmit={add}><label>Choose image<input required type="file" accept="image/*" onChange={event=>{const file=event.target.files?.[0];if(file)void chooseImage(file).catch(error=>setNotice(error instanceof Error?error.message:'Unable to upload image'));}}/></label><button disabled={!url || !storageKey}>Add image</button></form><div className="image-grid">{images.map(image=><img key={image.id} src={image.url} alt=""/>)}</div></section>;
}

type Option = { id: string; name: string; values: { id: string; value: string }[] };
type Variant = { id: string; sku?: string; price: string | number; inventory_quantity?: number };
type Image = { id: string; url: string; storage_key: string; alt_text?: string };

function ProductCatalog({ bid, storeId, product, token }: { bid: string; storeId: string; product: Item; token: string }) {
  const base = `/api/business/${bid}/stores/${storeId}/products/${product.id}`;
  const [options, setOptions] = useState<Option[]>([]); const [variants, setVariants] = useState<Variant[]>([]); const [images, setImages] = useState<Image[]>([]); const [notice, setNotice] = useState('');
  const [optionName, setOptionName] = useState(''); const [optionValues, setOptionValues] = useState('');
  const [sku, setSku] = useState(''); const [price, setPrice] = useState(''); const [stock, setStock] = useState('0'); const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState(''); const [storageKey, setStorageKey] = useState(''); const [altText, setAltText] = useState('');
  const chooseImage = async (file: File) => { const base64 = await new Promise<string>((resolve,reject) => { const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result)); reader.onerror=reject; reader.readAsDataURL(file); }); const uploaded=await api<{url:string;storageKey:string}>(`/api/business/${bid}/stores/${storeId}/media`,token,{method:'POST',body:JSON.stringify({filename:file.name,mimeType:file.type,base64})}); setImageUrl(uploaded.url); setStorageKey(uploaded.storageKey); };
  const load = async () => { try { const [nextOptions, nextVariants, nextImages] = await Promise.all([api<Option[]>(`${base}/options`, token), api<Variant[]>(`${base}/variants`, token), api<Image[]>(`${base}/images`, token)]); setOptions(nextOptions); setVariants(nextVariants); setImages(nextImages); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to load catalog'); } };
  useEffect(() => { void load(); }, [base]);
  const valueChoices = useMemo(() => options.flatMap((option) => option.values.map((value) => ({ ...value, option: option.name }))), [options]);
  const addOption = async (event: FormEvent) => { event.preventDefault(); try { await api(`${base}/options`, token, { method: 'POST', body: JSON.stringify({ name: optionName, values: optionValues.split(',').map((value) => value.trim()).filter(Boolean) }) }); setOptionName(''); setOptionValues(''); await load(); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to add option'); } };
  const addVariant = async (event: FormEvent) => { event.preventDefault(); try { const result = await api<Variant>(`${base}/variants`, token, { method: 'POST', body: JSON.stringify({ sku, price: Number(price), inventoryQuantity: Number(stock), optionValueIds: selectedValues }) }); setVariants((current) => [...current, result]); setSku(''); setPrice(''); setStock('0'); setSelectedValues([]); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to add variant'); } };
  const addImage = async (event: FormEvent) => { event.preventDefault(); try { const result = await api<Image>(`${base}/images`, token, { method: 'POST', body: JSON.stringify({ url: imageUrl, storageKey, altText }) }); setImages((current) => [...current, result]); setImageUrl(''); setStorageKey(''); setAltText(''); } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to add image'); } };
  return <section className="panel catalog"><h2>Catalog for {String(product.name)}</h2><p className="muted">Options, variants, and image records are stored with this product.</p>{notice && <p className="notice">{notice}</p>}<div className="catalog-grid"><form className="form-grid" onSubmit={addOption}><h3>Add option</h3><label>Name<input required value={optionName} onChange={(event) => setOptionName(event.target.value)} placeholder="Size" /></label><label>Values (comma-separated)<input required value={optionValues} onChange={(event) => setOptionValues(event.target.value)} placeholder="Small, Medium, Large" /></label><button>Add option</button><ul className="compact-list">{options.map((option) => <li key={option.id}><strong>{option.name}</strong>: {option.values.map((value) => value.value).join(', ')}</li>)}</ul></form>
    <form className="form-grid" onSubmit={addVariant}><h3>Add variant</h3><label>SKU<input value={sku} onChange={(event) => setSku(event.target.value)} /></label><label>Price<input required type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Stock<input type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} /></label><fieldset><legend>Option values</legend>{valueChoices.map((value) => <label className="check" key={value.id}><input type="checkbox" checked={selectedValues.includes(value.id)} onChange={() => setSelectedValues((current) => current.includes(value.id) ? current.filter((id) => id !== value.id) : [...current, value.id])} /> {value.option}: {value.value}</label>)}</fieldset><button>Add variant</button><ul className="compact-list">{variants.map((variant) => <li key={variant.id}>{variant.sku || 'No SKU'} · {variant.price} · stock {variant.inventory_quantity ?? 0}</li>)}</ul></form>
    <form className="form-grid" onSubmit={addImage}><h3>Add image</h3><label>Choose image<input required type="file" accept="image/*" onChange={event=>{const file=event.target.files?.[0];if(file)void chooseImage(file).catch(error=>setNotice(error instanceof Error?error.message:'Unable to upload image'));}} /></label><button disabled={!imageUrl || !storageKey}>Add image</button><div className="image-grid">{images.map((image) => <img key={image.id} src={image.url} alt="" />)}</div></form></div></section>;
}
