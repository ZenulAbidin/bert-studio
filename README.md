# BERT Studio - Model Playground

A comprehensive playground for experimenting with BERT models and other transformer-based models from HuggingFace.

![user interface](https://i.imgur.com/SJZIUq7.png)


## Features

- **Model Management**: Browse, download, and load models from HuggingFace Hub
- **Embedding Generation**: Create embeddings from text using various models
- **Classification**: Perform text classification tasks
- **Question Answering**: Extract answers from context
- **Named Entity Recognition**: Identify entities in text
- **Fill Mask**: Complete masked text
- **Summarization**: Generate text summaries
- **Feature Extraction**: Extract features from text
- **Custom Tasks**: Execute custom code with security restrictions

## Custom Tasks Feature

The Custom Tasks playground allows you to run custom code with the following security restrictions:

- Only `transformers` and `torch` imports are allowed
- Code must be wrapped in functions
- Input text is provided separately
- Tokenizer and model loading code must be in separate text boxes
- Function must be named `custom_function` and accept a text parameter

### MongoDB Integration

BERT Studio uses MongoDB for storing custom tasks with enterprise-grade features:

- **Persistent Storage**: Tasks are saved to MongoDB database
- **Advanced Search**: Full-text search across task names, descriptions, and tags
- **Tag-based Filtering**: Organize tasks with custom tags
- **Export/Import**: Share tasks between installations
- **Statistics**: Track usage and popular tags
- **Backup/Restore**: Full database backup and restore capabilities

### MongoDB Setup

1. **Install MongoDB** (if not already installed):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb
   
   # macOS
   brew install mongodb-community
   
   # Windows
   # Download from https://www.mongodb.com/try/download/community
   ```

2. **Install Python Dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configure Connection** (optional):
   ```bash
   # Set environment variables for custom MongoDB connection
   export MONGODB_CONNECTION_STRING="mongodb://your-mongodb-server:27017"
   export MONGODB_DATABASE_NAME="bert_studio"
   ```

### Example Usage

```python
# Tokenizer Code
tokenizer = AutoTokenizer.from_pretrained("model-name")

# Model Code  
model = AutoModelForSequenceClassification.from_pretrained("model-name")

# Function Code
def custom_function(text):
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model(**inputs)
    probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
    return {"probability": probabilities[0][1].item()}
```

### Task Management Features

- **Save Tasks**: Save your custom code with name, description, and tags
- **Load Tasks**: Quickly load previously saved tasks
- **Search**: Find tasks by name, description, or tags
- **Export/Import**: Share tasks between different installations
- **Statistics**: View usage statistics and popular tags
- **Model Filtering**: Filter tasks by the model they were created for

## Project info

**URL**: https://lovable.dev/projects/348d89d3-6440-4fc1-8cf7-0fbc9b6a0ff8

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/348d89d3-6440-4fc1-8cf7-0fbc9b6a0ff8) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/348d89d3-6440-4fc1-8cf7-0fbc9b6a0ff8) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
