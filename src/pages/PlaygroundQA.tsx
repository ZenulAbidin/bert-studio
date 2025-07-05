import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { QAPlayground } from '../components/QAPlayground';
import apiClient from '@/lib/api';

const PlaygroundQA = () => {
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
      <QAPlayground loadedModels={loadedModels} />
    </Layout>
  );
};

export default PlaygroundQA; 