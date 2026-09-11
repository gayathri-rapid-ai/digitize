'use client';

import { use } from 'react';
import { Shell } from '../../../../../../components/shell';
import { ResourceManager } from '../../../../../../components/resource-manager';
import { SettingsPanel, TeamPanel } from '../../../../../../components/store-tools';
import { PreviewPanel } from '../../../../../../components/preview-panel';
import { BusinessBranding } from '../../../../../../components/business-branding';

const resources = new Set(['products', 'collections', 'orders', 'customers', 'discounts']);
export default function ResourcePage({ params }: { params: Promise<{ bid: string; storeId: string; section: string }> }) {
  const scope = use(params);
  let content: React.ReactNode = <p className="notice">Unknown section.</p>;
  if (resources.has(scope.section)) content = <ResourceManager {...scope} resource={scope.section as 'products' | 'collections' | 'orders' | 'customers' | 'discounts'} />;
  if (scope.section === 'settings') content = <><SettingsPanel {...scope} /><BusinessBranding {...scope} /></>;
  if (scope.section === 'team') content = <TeamPanel {...scope} />;
  if (scope.section === 'preview') content = <PreviewPanel {...scope} />;
  return <Shell {...scope}>{content}</Shell>;
}
