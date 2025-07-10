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
import ApiKeysPage from './pages/ApiKeys';
import LoginPage from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/browse" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
          <Route path="/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
          <Route path="/playground/embedding" element={<ProtectedRoute><PlaygroundEmbedding /></ProtectedRoute>} />
          <Route path="/playground/classification" element={<ProtectedRoute><PlaygroundClassification /></ProtectedRoute>} />
          <Route path="/playground/qa" element={<ProtectedRoute><PlaygroundQA /></ProtectedRoute>} />
          <Route path="/playground/ner" element={<ProtectedRoute><PlaygroundNER /></ProtectedRoute>} />
          <Route path="/playground/fill-mask" element={<ProtectedRoute><PlaygroundFillMask /></ProtectedRoute>} />
          <Route path="/playground/summarization" element={<ProtectedRoute><PlaygroundSummarization /></ProtectedRoute>} />
          <Route path="/playground/features" element={<ProtectedRoute><PlaygroundFeatures /></ProtectedRoute>} />
          <Route path="/playground/custom-tasks" element={<ProtectedRoute><PlaygroundCustomTasks /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/api-keys" element={<ProtectedRoute><ApiKeysPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
