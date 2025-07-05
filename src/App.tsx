import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import Downloads from "./pages/Downloads";
import Playground from "./pages/Playground";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PlaygroundEmbedding from './pages/PlaygroundEmbedding';
import PlaygroundClassification from './pages/PlaygroundClassification';
import PlaygroundQA from './pages/PlaygroundQA';
import PlaygroundNER from './pages/PlaygroundNER';
import PlaygroundFillMask from './pages/PlaygroundFillMask';
import PlaygroundSummarization from './pages/PlaygroundSummarization';
import PlaygroundFeatures from './pages/PlaygroundFeatures';
import PlaygroundCustomTasks from './pages/PlaygroundCustomTasks';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/playground/embedding" element={<PlaygroundEmbedding />} />
          <Route path="/playground/classification" element={<PlaygroundClassification />} />
          <Route path="/playground/qa" element={<PlaygroundQA />} />
          <Route path="/playground/ner" element={<PlaygroundNER />} />
          <Route path="/playground/fill-mask" element={<PlaygroundFillMask />} />
          <Route path="/playground/summarization" element={<PlaygroundSummarization />} />
          <Route path="/playground/features" element={<PlaygroundFeatures />} />
          <Route path="/playground/custom-tasks" element={<PlaygroundCustomTasks />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
