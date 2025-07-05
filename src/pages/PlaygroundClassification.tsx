import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { ClassificationPlayground } from '../components/ClassificationPlayground';
import apiClient from '@/lib/api';

const PlaygroundClassification = () => {
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
      <ClassificationPlayground loadedModels={loadedModels} />
    </Layout>
  );
};

export default PlaygroundClassification; 