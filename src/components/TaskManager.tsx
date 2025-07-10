import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Search, Save, FolderOpen, Download, Upload, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface TaskInfo {
  id: number;
  name: string;
  description: string;
  model_id: string;
  tokenizer_code: string;
  model_code: string;
  function_code: string;
  tags?: string;
  created_at: string;
  updated_at: string;
  batch_mode?: boolean;
}

interface TaskManagerProps {
  selectedModel: string;
  tokenizerCode: string;
  modelCode: string;
  functionCode: string;
  batchMode: boolean;
  onLoadTask: (task: TaskInfo) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  selectedModel,
  tokenizerCode,
  modelCode,
  functionCode,
  batchMode,
  onLoadTask,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskTags, setTaskTags] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/custom-tasks');
      setTasks(response.data.tasks || []);
    } catch (error: any) {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (!taskName.trim()) {
      toast.error('Please enter a task name');
      return;
    }

    try {
      await apiClient.post('/custom-tasks', {
        name: taskName,
        description: taskDescription,
        model_id: selectedModel,
        tokenizer_code: tokenizerCode,
        model_code: modelCode,
        function_code: functionCode,
        tags: taskTags,
        batch_mode: batchMode,
      });

      toast.success('Task saved successfully!');
      setSaveDialogOpen(false);
      setTaskName('');
      setTaskDescription('');
      setTaskTags('');
      loadTasks();
    } catch (error: any) {
      toast.error('Failed to save task');
    }
  };

  const handleLoadTask = (task: TaskInfo) => {
    onLoadTask(task);
    setIsOpen(false);
    toast.success(`Loaded task: ${task.name}`);
  };

  const handleDeleteTask = async (taskId: number, taskName: string) => {
    if (!confirm(`Are you sure you want to delete "${taskName}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/custom-tasks/${taskId}`);
      toast.success('Task deleted successfully');
      loadTasks();
    } catch (error: any) {
      toast.error('Failed to delete task');
    }
  };

  const handleExportTasks = async () => {
    try {
      const response = await apiClient.get('/custom-tasks/export');
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `custom-tasks-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      toast.success('Tasks exported successfully!');
    } catch (error: any) {
      toast.error('Failed to export tasks');
    }
  };

  const handleImportTasks = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const tasksData = JSON.parse(text);
      
      await apiClient.post('/custom-tasks/import', { tasks: tasksData });
      toast.success('Tasks imported successfully!');
      loadTasks();
    } catch (error: any) {
      toast.error('Failed to import tasks');
    }

    event.target.value = '';
  };

  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.tags && task.tags.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Manage Tasks
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Custom Tasks Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setSaveDialogOpen(true)} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Current
              </Button>
              <Button variant="outline" onClick={handleExportTasks} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTasks}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8">Loading tasks...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No tasks found matching your search.' : 'No saved tasks yet.'}
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{task.name}</h3>
                          <Badge variant="secondary">{task.model_id}</Badge>
                          {task.batch_mode && (
                            <Badge className="bg-blue-100 text-blue-700">Batch</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        {task.tags && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.tags.split(',').map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          Updated: {new Date(task.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleLoadTask(task)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTask(task.id, task.name)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Custom Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-name">Task Name *</Label>
              <Input
                id="task-name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter task name"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Describe what this task does..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="task-tags">Tags (comma-separated)</Label>
              <Input
                id="task-tags"
                value={taskTags}
                onChange={(e) => setTaskTags(e.target.value)}
                placeholder="e.g., classification, sentiment, ai-detection"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTask}>
                Save Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 