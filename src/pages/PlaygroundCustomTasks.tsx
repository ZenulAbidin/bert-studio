import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { CustomTasksPlayground } from '../components/CustomTasksPlayground';
import apiClient from '@/lib/api';

const PlaygroundCustomTasks = () => {
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
      <CustomTasksPlayground loadedModels={loadedModels} />
    </Layout>
  );
};

export default PlaygroundCustomTasks; 