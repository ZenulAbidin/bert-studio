import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class CustomTask:
    id: Optional[int]
    name: str
    description: str
    model_id: str
    tokenizer_code: str
    model_code: str
    function_code: str
    created_at: str
    updated_at: str
    tags: Optional[str] = None

class DatabaseManager:
    def __init__(self, db_path: str = "custom_tasks.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with the custom_tasks table."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS custom_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                model_id TEXT NOT NULL,
                tokenizer_code TEXT NOT NULL,
                model_code TEXT NOT NULL,
                function_code TEXT NOT NULL,
                tags TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_task(self, task: CustomTask) -> int:
        """Create a new custom task and return its ID."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO custom_tasks 
            (name, description, model_id, tokenizer_code, model_code, function_code, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            task.name,
            task.description,
            task.model_id,
            task.tokenizer_code,
            task.model_code,
            task.function_code,
            task.tags,
            task.created_at,
            task.updated_at
        ))
        
        task_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        if task_id is None:
            raise RuntimeError("Failed to create task - no ID returned")
        
        return task_id
    
    def get_all_tasks(self) -> List[CustomTask]:
        """Get all custom tasks."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM custom_tasks ORDER BY updated_at DESC')
        rows = cursor.fetchall()
        
        tasks = []
        for row in rows:
            task = CustomTask(
                id=row[0],
                name=row[1],
                description=row[2],
                model_id=row[3],
                tokenizer_code=row[4],
                model_code=row[5],
                function_code=row[6],
                tags=row[7],
                created_at=row[8],
                updated_at=row[9]
            )
            tasks.append(task)
        
        conn.close()
        return tasks
    
    def get_task_by_id(self, task_id: int) -> Optional[CustomTask]:
        """Get a custom task by ID."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM custom_tasks WHERE id = ?', (task_id,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return CustomTask(
                id=row[0],
                name=row[1],
                description=row[2],
                model_id=row[3],
                tokenizer_code=row[4],
                model_code=row[5],
                function_code=row[6],
                tags=row[7],
                created_at=row[8],
                updated_at=row[9]
            )
        return None
    
    def update_task(self, task_id: int, task: CustomTask) -> bool:
        """Update an existing custom task."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE custom_tasks 
            SET name = ?, description = ?, model_id = ?, tokenizer_code = ?, 
                model_code = ?, function_code = ?, tags = ?, updated_at = ?
            WHERE id = ?
        ''', (
            task.name,
            task.description,
            task.model_id,
            task.tokenizer_code,
            task.model_code,
            task.function_code,
            task.tags,
            task.updated_at,
            task_id
        ))
        
        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        return rows_affected > 0
    
    def delete_task(self, task_id: int) -> bool:
        """Delete a custom task."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM custom_tasks WHERE id = ?', (task_id,))
        rows_affected = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        return rows_affected > 0
    
    def search_tasks(self, query: str) -> List[CustomTask]:
        """Search custom tasks by name, description, or tags."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        search_term = f'%{query}%'
        cursor.execute('''
            SELECT * FROM custom_tasks 
            WHERE name LIKE ? OR description LIKE ? OR tags LIKE ?
            ORDER BY updated_at DESC
        ''', (search_term, search_term, search_term))
        
        rows = cursor.fetchall()
        
        tasks = []
        for row in rows:
            task = CustomTask(
                id=row[0],
                name=row[1],
                description=row[2],
                model_id=row[3],
                tokenizer_code=row[4],
                model_code=row[5],
                function_code=row[6],
                tags=row[7],
                created_at=row[8],
                updated_at=row[9]
            )
            tasks.append(task)
        
        conn.close()
        return tasks
    
    def get_tasks_by_model(self, model_id: str) -> List[CustomTask]:
        """Get all custom tasks for a specific model."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM custom_tasks WHERE model_id = ? ORDER BY updated_at DESC', (model_id,))
        rows = cursor.fetchall()
        
        tasks = []
        for row in rows:
            task = CustomTask(
                id=row[0],
                name=row[1],
                description=row[2],
                model_id=row[3],
                tokenizer_code=row[4],
                model_code=row[5],
                function_code=row[6],
                tags=row[7],
                created_at=row[8],
                updated_at=row[9]
            )
            tasks.append(task)
        
        conn.close()
        return tasks
    
    def export_tasks(self) -> List[Dict[str, Any]]:
        """Export all tasks as JSON-serializable dictionaries."""
        tasks = self.get_all_tasks()
        return [
            {
                "id": task.id,
                "name": task.name,
                "description": task.description,
                "model_id": task.model_id,
                "tokenizer_code": task.tokenizer_code,
                "model_code": task.model_code,
                "function_code": task.function_code,
                "tags": task.tags,
                "created_at": task.created_at,
                "updated_at": task.updated_at
            }
            for task in tasks
        ]
    
    def import_tasks(self, tasks_data: List[Dict[str, Any]]) -> List[int]:
        """Import tasks from JSON data and return the IDs of created tasks."""
        created_ids = []
        
        for task_data in tasks_data:
            # Remove ID if present (will be auto-generated)
            task_data.pop('id', None)
            
            task = CustomTask(
                id=None,
                name=task_data['name'],
                description=task_data.get('description', ''),
                model_id=task_data['model_id'],
                tokenizer_code=task_data['tokenizer_code'],
                model_code=task_data['model_code'],
                function_code=task_data['function_code'],
                tags=task_data.get('tags'),
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )
            
            task_id = self.create_task(task)
            created_ids.append(task_id)
        
        return created_ids

# Global database manager instance
db_manager = DatabaseManager() 