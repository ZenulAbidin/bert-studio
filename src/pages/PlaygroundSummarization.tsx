import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { SummarizationPlayground } from '../components/SummarizationPlayground';
import apiClient from '@/lib/api';

const PlaygroundSummarization = () => {
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
      <SummarizationPlayground loadedModels={loadedModels} />
    </Layout>
  );
};

export default PlaygroundSummarization; 