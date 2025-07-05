import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { EmbeddingPlayground } from '../components/EmbeddingPlayground';
import { CustomTasksPlayground } from '../components/CustomTasksPlayground';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import apiClient from '@/lib/api';

const Playground = () => {
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
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Playground</h1>
        <Tabs defaultValue="embedding">
          <TabsList className="mb-4">
            <TabsTrigger value="embedding">Embedding</TabsTrigger>
            <TabsTrigger value="classification">Classification</TabsTrigger>
            <TabsTrigger value="qa">Question Answering</TabsTrigger>
            <TabsTrigger value="ner">NER</TabsTrigger>
            <TabsTrigger value="fill-mask">Fill Mask</TabsTrigger>
            <TabsTrigger value="summarization">Summarization</TabsTrigger>
            <TabsTrigger value="features">Feature Extraction</TabsTrigger>
            <TabsTrigger value="custom-tasks">Custom Tasks</TabsTrigger>
          </TabsList>
          <TabsContent value="embedding">
            <EmbeddingPlayground loadedModels={loadedModels} />
          </TabsContent>
          <TabsContent value="classification">
            <div>Classification Playground (Coming soon)</div>
          </TabsContent>
          <TabsContent value="qa">
            <div>Question Answering Playground (Coming soon)</div>
          </TabsContent>
          <TabsContent value="ner">
            <div>NER Playground (Coming soon)</div>
          </TabsContent>
          <TabsContent value="fill-mask">
            <div>Fill Mask Playground (Coming soon)</div>
          </TabsContent>
          <TabsContent value="summarization">
            <div>Summarization Playground (Coming soon)</div>
          </TabsContent>
          <TabsContent value="features">
            <div>Feature Extraction Playground (Coming soon)</div>
          </TabsContent>
          <TabsContent value="custom-tasks">
            <CustomTasksPlayground loadedModels={loadedModels} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Playground;
