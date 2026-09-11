'use client';

import { use } from 'react';
import { Shell } from '../../../../../../../components/shell';
import { ResourceManager } from '../../../../../../../components/resource-manager';

export default function ResourceEditorPage({params}:{params:Promise<{bid:string;storeId:string;section:string;itemId:string}>}) {
  const scope=use(params);
  if(scope.section!=='products'&&scope.section!=='collections') return <Shell {...scope}><p className="notice">This editor is not available.</p></Shell>;
  return <Shell {...scope}><ResourceManager bid={scope.bid} storeId={scope.storeId} resource={scope.section} itemId={scope.itemId}/></Shell>;
}
