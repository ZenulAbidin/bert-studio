import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { FeaturesPlayground } from '../components/FeaturesPlayground';
import apiClient from '@/lib/api';

const PlaygroundFeatures = () => {
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
      <FeaturesPlayground loadedModels={loadedModels} />
    </Layout>
  );
};

export default PlaygroundFeatures; 