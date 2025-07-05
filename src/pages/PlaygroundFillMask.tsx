import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { FillMaskPlayground } from '../components/FillMaskPlayground';
import apiClient from '@/lib/api';

const PlaygroundFillMask = () => {
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  useEffect(() => {
    const fetchLoadedModels = async () => {
      try {
        const response = await apiClient.get<string[]>('/models/loaded');
        setLoadedModels(response.data);
      } catch (error) {
        setLoadedModels([]);
      }
    };
    fetchLoadedModels();
  }, []);
  return (
    <Layout>
      <FillMaskPlayground loadedModels={loadedModels} />
    </Layout>
  );
};

export default PlaygroundFillMask; 