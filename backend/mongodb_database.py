import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from pymongo import MongoClient  # type: ignore
from pymongo.collection import Collection  # type: ignore
from pymongo.database import Database  # type: ignore
from bson import ObjectId  # type: ignore
import json

@dataclass
class CustomTask:
    id: Optional[str]
    name: str
    description: str
    model_id: str
    tokenizer_code: str
    model_code: str
    function_code: str
    created_at: str
    updated_at: str
    tags: Optional[str] = None
    batch_mode: Optional[bool] = None

@dataclass
class APIKey:
    id: Optional[str]
    key: str
    created_at: str
    last_used_at: Optional[str] = None
    revoked: bool = False

class MongoDBManager:
    def __init__(self, connection_string: str = "mongodb://localhost:27017", database_name: str = "bert_studio"):
        self.client = MongoClient(connection_string)
        
        # If database_name is provided separately, use it
        # Otherwise, it should be in the connection string
        if database_name and database_name not in connection_string:
            database = self.client[database_name]
        else:
            # Extract database name from connection string if present
            # For Firestore/Atlas, the database is usually in the connection string
            database = self.client.get_database()
        
        self.db: Database = database
        
        self.tasks_collection: Collection = self.db.custom_tasks
        self.api_keys_collection: Collection = self.db.api_keys
        
        # Create indexes for better performance
        self._create_indexes()
    
    def _create_indexes(self):
        """Create indexes for better query performance."""
        try:
            # Index on name for fast searches
            self.tasks_collection.create_index("name")
            
            # Index on model_id for filtering by model
            self.tasks_collection.create_index("model_id")
            
            # Index on tags for tag-based searches
            self.tasks_collection.create_index("tags")
            
            # Index on updated_at for sorting
            self.tasks_collection.create_index("updated_at")
            
            # Text index for full-text search
            self.tasks_collection.create_index([
                ("name", "text"),
                ("description", "text"),
                ("tags", "text")
            ])
            self.api_keys_collection.create_index("key", unique=True)
        except Exception as e:
            # Firestore doesn't support creating indexes through MongoDB API
            # Indexes need to be created through Google Cloud Console
            print(f"Warning: Could not create indexes (this is normal for Firestore): {e}")
            print("For Firestore, create indexes through Google Cloud Console if needed.")
    
    def _task_to_dict(self, task: CustomTask) -> Dict[str, Any]:
        """Convert CustomTask to dictionary for MongoDB storage."""
        task_dict = asdict(task)
        if task.id:
            task_dict['_id'] = ObjectId(task.id)
            del task_dict['id']
        return task_dict
    
    def _dict_to_task(self, task_dict: Dict[str, Any]) -> CustomTask:
        """Convert MongoDB document to CustomTask."""
        task_dict['id'] = str(task_dict['_id'])
        del task_dict['_id']
        return CustomTask(**task_dict)
    
    def create_task(self, task: CustomTask) -> str:
        """Create a new custom task and return its ID."""
        task_dict = self._task_to_dict(task)
        task_dict.pop('_id', None)  # Let MongoDB generate the ID if present
        
        result = self.tasks_collection.insert_one(task_dict)
        return str(result.inserted_id)
    
    def get_all_tasks(self) -> List[CustomTask]:
        """Get all custom tasks, ordered by updated_at descending."""
        cursor = self.tasks_collection.find().sort("updated_at", -1)
        tasks = []
        for doc in cursor:
            tasks.append(self._dict_to_task(doc))
        return tasks
    
    def get_task_by_id(self, task_id: str) -> Optional[CustomTask]:
        """Get a custom task by ID."""
        try:
            doc = self.tasks_collection.find_one({"_id": ObjectId(task_id)})
            if doc:
                return self._dict_to_task(doc)
        except Exception:
            pass
        return None
    
    def update_task(self, task_id: str, task: CustomTask) -> bool:
        """Update an existing custom task."""
        try:
            task_dict = self._task_to_dict(task)
            del task_dict['_id']  # Don't update the ID
            
            result = self.tasks_collection.update_one(
                {"_id": ObjectId(task_id)},
                {"$set": task_dict}
            )
            return result.modified_count > 0
        except Exception:
            return False
    
    def delete_task(self, task_id: str) -> bool:
        """Delete a custom task."""
        try:
            result = self.tasks_collection.delete_one({"_id": ObjectId(task_id)})
            return result.deleted_count > 0
        except Exception:
            return False
    
    def search_tasks(self, query: str) -> List[CustomTask]:
        """Search custom tasks using MongoDB text search."""
        try:
            # Use MongoDB text search
            cursor = self.tasks_collection.find(
                {"$text": {"$search": query}},
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})])
            
            tasks = []
            for doc in cursor:
                tasks.append(self._dict_to_task(doc))
            return tasks
        except Exception:
            # Fallback to regex search if text search fails
            regex_query = {"$regex": query, "$options": "i"}
            cursor = self.tasks_collection.find({
                "$or": [
                    {"name": regex_query},
                    {"description": regex_query},
                    {"tags": regex_query}
                ]
            }).sort("updated_at", -1)
            
            tasks = []
            for doc in cursor:
                tasks.append(self._dict_to_task(doc))
            return tasks
    
    def get_tasks_by_model(self, model_id: str) -> List[CustomTask]:
        """Get all custom tasks for a specific model."""
        cursor = self.tasks_collection.find({"model_id": model_id}).sort("updated_at", -1)
        tasks = []
        for doc in cursor:
            tasks.append(self._dict_to_task(doc))
        return tasks
    
    def get_tasks_by_tags(self, tags: List[str]) -> List[CustomTask]:
        """Get tasks that have any of the specified tags."""
        tag_regex = "|".join(tags)
        cursor = self.tasks_collection.find({
            "tags": {"$regex": tag_regex, "$options": "i"}
        }).sort("updated_at", -1)
        
        tasks = []
        for doc in cursor:
            tasks.append(self._dict_to_task(doc))
        return tasks
    
    def get_task_stats(self) -> Dict[str, Any]:
        """Get statistics about stored tasks."""
        total_tasks = self.tasks_collection.count_documents({})
        
        # Get unique models
        models = self.tasks_collection.distinct("model_id")
        
        # Get most used tags
        pipeline = [
            {"$match": {"tags": {"$exists": True, "$ne": ""}}},
            {"$project": {"tags": {"$split": ["$tags", ","]}}},
            {"$unwind": "$tags"},
            {"$group": {"_id": {"$trim": {"input": "$tags"}}, "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        top_tags = list(self.tasks_collection.aggregate(pipeline))
        
        return {
            "total_tasks": total_tasks,
            "unique_models": len(models),
            "models": models,
            "top_tags": top_tags
        }
    
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
    
    def import_tasks(self, tasks_data: List[Dict[str, Any]]) -> List[str]:
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
    
    def create_api_key(self, key: str) -> str:
        now = datetime.now().isoformat()
        doc = {"key": key, "created_at": now, "revoked": False, "last_used_at": None}
        result = self.api_keys_collection.insert_one(doc)
        return str(result.inserted_id)

    def list_api_keys(self) -> list:
        keys = []
        for doc in self.api_keys_collection.find():
            doc['id'] = str(doc['_id'])
            del doc['_id']
            keys.append(doc)
        return keys

    def revoke_api_key(self, key_id: str) -> bool:
        result = self.api_keys_collection.update_one({"_id": ObjectId(key_id)}, {"$set": {"revoked": True}})
        return result.modified_count > 0

    def delete_api_key(self, key_id: str) -> bool:
        result = self.api_keys_collection.delete_one({"_id": ObjectId(key_id)})
        return result.deleted_count > 0

    def validate_api_key(self, key: str) -> bool:
        doc = self.api_keys_collection.find_one({"key": key, "revoked": False})
        if doc:
            self.api_keys_collection.update_one({"_id": doc["_id"]}, {"$set": {"last_used_at": datetime.now().isoformat()}})
            return True
        return False
    
    def backup_database(self, backup_path: str):
        """Create a backup of the database."""
        try:
            # Export all data
            data = {
                "tasks": self.export_tasks(),
                "stats": self.get_task_stats(),
                "backup_date": datetime.now().isoformat()
            }
            
            with open(backup_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            return True
        except Exception:
            return False
    
    def restore_database(self, backup_path: str) -> bool:
        """Restore database from backup."""
        try:
            with open(backup_path, 'r') as f:
                data = json.load(f)
            
            # Clear existing data
            self.tasks_collection.delete_many({})
            
            # Import tasks
            if 'tasks' in data:
                self.import_tasks(data['tasks'])
            
            return True
        except Exception:
            return False
    
    def close(self):
        """Close the MongoDB connection."""
        self.client.close()

from config import config

# Global MongoDB manager instance
mongodb_manager = MongoDBManager(
    connection_string=config.MONGODB_CONNECTION_STRING,
    database_name=config.MONGODB_DATABASE_NAME
) 