import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { ModelManager } from '../components/ModelManager';

const DownloadsPage: React.FC = () => {
  // The ModelManager component requires these props, so we provide them here.
  const [loadedModels, setLoadedModels] = useState<string[]>([]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* The ModelManager component contains all the UI and logic for this page */}
        <ModelManager loadedModels={loadedModels} setLoadedModels={setLoadedModels} />
      </div>
    </Layout>
  );
};

export default DownloadsPage;
