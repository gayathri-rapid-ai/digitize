'use client';
export function PreviewPanel({ bid, storeId }: { bid:string; storeId:string }) { return <section className="panel"><h1>Store preview</h1><p className="muted">Open the customer-view preview in a separate tab.</p><a href={`/preview?bid=${bid}&storeId=${storeId}`} target="_blank" rel="noreferrer"><button>Open preview</button></a></section>; }
