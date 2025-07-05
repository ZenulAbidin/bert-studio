import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { NERPlayground } from '../components/NERPlayground';
import apiClient from '@/lib/api';

const PlaygroundNER = () => {
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
      <NERPlayground loadedModels={loadedModels} />
    </Layout>
  );
};

export default PlaygroundNER; 