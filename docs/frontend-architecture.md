# Frontend Architecture

## Overview

BERT Studio's frontend is built with modern React technologies, providing a responsive and intuitive user interface for ML model experimentation.

## Technology Stack

- **React 18**: Core framework with concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **shadcn/ui**: High-quality UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **TanStack Query**: Server state management
- **React Hook Form**: Form handling with validation
- **Axios**: HTTP client for API communication

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── Layout.tsx      # Main layout wrapper
│   ├── Navbar.tsx      # Navigation bar
│   ├── Sidebar.tsx     # Sidebar navigation
│   └── *Playground.tsx # Task-specific components
├── pages/              # Route components
│   ├── Index.tsx       # Dashboard/home page
│   ├── Login.tsx       # Authentication
│   ├── Browse.tsx      # Model browser
│   ├── Playground*.tsx # Task playgrounds
│   └── Settings.tsx    # User settings
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configs
│   ├── api.ts          # API client configuration
│   └── utils.ts        # Common utilities
└── main.tsx            # Application entry point
```

## Key Components

### Layout System

**Layout.tsx**: Main application wrapper providing:
- Navigation structure
- Authentication state management
- Theme provider integration
- Global error boundaries

**Navbar.tsx**: Top navigation with:
- Logo and branding
- User authentication status
- Quick access to key features
- Theme toggle

**Sidebar.tsx**: Side navigation featuring:
- Task category navigation
- Model management shortcuts
- User profile access
- Collapsible design for mobile

### Playground Components

Each ML task has a dedicated playground component:

- **ClassificationPlayground.tsx**: Text classification interface
- **QAPlayground.tsx**: Question answering interface
- **NERPlayground.tsx**: Named entity recognition
- **EmbeddingPlayground.tsx**: Text embedding generation
- **CustomTasksPlayground.tsx**: Custom code execution
- **SummarizationPlayground.tsx**: Text summarization

### Common Patterns

All playground components follow consistent patterns:
1. Model selection dropdown
2. Input text area
3. Configuration options
4. Execute button
5. Results display
6. Export/save functionality

## State Management

### Server State (TanStack Query)

Used for managing server-side data with automatic:
- Caching and background updates
- Error handling and retry logic
- Loading states
- Optimistic updates

```typescript
// Example: Custom tasks query
const { data: tasks, isLoading, error } = useQuery({
  queryKey: ['custom-tasks', { search, tags }],
  queryFn: () => api.getCustomTasks({ search, tags }),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Client State (React Hooks)

Local component state managed with:
- `useState` for simple state
- `useReducer` for complex state logic
- Custom hooks for reusable stateful logic

### Authentication State

Managed through:
- Session-based authentication
- Protected route components
- Auth context provider

## Routing

React Router v6 configuration with:
- Nested routes for organized structure
- Protected routes requiring authentication
- Error boundaries for route-level error handling
- Lazy loading for code splitting

```typescript
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Index /> },
      { path: "login", element: <Login /> },
      {
        path: "playground",
        element: <ProtectedRoute />,
        children: [
          { path: "classification", element: <PlaygroundClassification /> },
          { path: "qa", element: <PlaygroundQA /> },
          // ... other playground routes
        ],
      },
    ],
  },
]);
```

## API Integration

### API Client (lib/api.ts)

Centralized API client with:
- Axios configuration
- Request/response interceptors
- Error handling
- Type-safe method definitions

```typescript
class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  async classifyText(data: ClassificationRequest): Promise<ClassificationResponse> {
    const response = await this.client.post('/tasks/classification', data);
    return response.data;
  }
}
```

### Error Handling

Multi-layer error handling:
1. **API Level**: Axios interceptors catch network errors
2. **Query Level**: TanStack Query handles query-specific errors
3. **Component Level**: Error boundaries catch rendering errors
4. **Global Level**: Toast notifications for user feedback

## Form Management

React Hook Form integration with:
- Zod schema validation
- Type-safe form definitions
- Automatic error handling
- Optimized re-renders

```typescript
const schema = z.object({
  text: z.string().min(1, "Text is required"),
  model: z.string().min(1, "Model selection is required"),
});

type FormData = z.infer<typeof schema>;

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { text: "", model: "" },
});
```

## UI Components

### shadcn/ui Integration

Pre-built, customizable components:
- Consistent design system
- Accessible by default
- Themeable with CSS variables
- TypeScript support

### Custom Components

Task-specific components extending shadcn/ui:
- ModelSelector: Dropdown with search and filtering
- CodeEditor: Monaco editor integration
- ResultsDisplay: Formatted output with export options
- TaskCard: Reusable task information display

## Styling

### Tailwind CSS

Utility-first approach with:
- Responsive design utilities
- Dark/light theme support
- Custom design tokens
- Component-scoped styles

### Theme System

CSS variables for consistent theming:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}

[data-theme="dark"] {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

## Performance Optimizations

### Code Splitting

- Route-based splitting with React.lazy()
- Component-level splitting for large features
- Dynamic imports for optional dependencies

### Bundle Optimization

- Tree shaking for unused code elimination
- Asset optimization with Vite
- Chunking strategy for optimal caching

### Runtime Performance

- React.memo() for expensive components
- useMemo() and useCallback() for expensive computations
- Virtual scrolling for large lists

## Development Workflow

### Development Server

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint checking
```

### Type Checking

- Continuous type checking in development
- Pre-commit hooks for type validation
- Build-time type checking

### Testing Strategy

- Unit tests with Jest and React Testing Library
- Integration tests for component interactions
- E2E tests with Playwright (planned)

## Mobile Responsiveness

- Mobile-first design approach
- Touch-friendly interface elements
- Collapsible navigation for small screens
- Responsive typography and spacing

## Security Considerations

- XSS prevention through React's built-in escaping
- CSP headers for additional security
- Secure API communication with HTTPS
- Input validation at multiple layers