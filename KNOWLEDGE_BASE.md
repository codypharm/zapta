# Knowledge Base with RAG

## Overview

The Zapta platform now includes a powerful knowledge base system with Retrieval Augmented Generation (RAG). This allows agents to answer questions based on uploaded documents and custom knowledge, making them more accurate and context-aware.

## Features

### ✅ Implemented
- **Document Upload**: Support for text files (.txt, .md, .csv, .json)
- **Automatic Chunking**: Documents are intelligently split into optimal chunks
- **Vector Embeddings**: Using OpenAI's `text-embedding-3-small` model
- **Semantic Search**: Find relevant content using vector similarity
- **Multi-tenant Support**: Documents are isolated per organization
- **Agent-specific Knowledge**: Documents can be linked to specific agents
- **Real-time Chat Integration**: RAG automatically enhances chat responses
- **Source Attribution**: Chat responses show which documents were used

### 🔧 Technical Implementation

#### Database Schema
- **pgvector Extension**: Enables vector storage and similarity search
- **Documents Table**: Stores content, embeddings, and metadata
- **Optimized Indexes**: Fast retrieval with IVFFlat indexing
- **RLS Policies**: Row-level security for multi-tenancy

#### AI Integration
- **Embedding Generation**: Automatic vectorization of content
- **Context Injection**: Relevant docs are injected into AI prompts
- **Threshold Filtering**: Only high-similarity content is used (0.7+ by default)
- **Source Tracking**: Users see which documents informed the response

## Usage

### 1. Access Knowledge Base
Navigate to any agent and click the "Knowledge" button to access the knowledge base management interface.

### 2. Upload Documents
- Click "Upload Document" 
- Either paste content directly or upload a supported file
- Documents are automatically chunked and indexed
- Each chunk is embedded using OpenAI's embedding model

### 3. Test RAG in Chat
- Go to the agent's chat interface
- Ask questions related to your uploaded documents
- Responses will automatically include relevant context
- Source documents are displayed below AI responses

### 4. Manage Documents
- View all uploaded documents
- See chunk information
- Delete documents when no longer needed
- Search through your knowledge base

## API Endpoints

### Document Management
```typescript
// Upload document
POST /api/knowledge
{
  "name": "Document Name",
  "content": "Document content...",
  "agentId": "optional-agent-id",
  "metadata": { "optional": "metadata" }
}

// Get documents
GET /api/knowledge?agentId=optional

// Delete document
DELETE /api/knowledge?name=DocumentName
```

### Chat with RAG
```typescript
// Chat messages automatically include RAG
POST /api/chat/[agentId]
// Response includes sources when RAG is used
{
  "message": "AI response with context",
  "sources": ["Document1.txt", "FAQ.md"]
}
```

## Configuration

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_key  # Required for embeddings
```

### Embedding Model
Currently using `text-embedding-3-small` (1536 dimensions):
- Cost-effective
- Good performance
- Fast processing

### Search Parameters
- **Default similarity threshold**: 0.7
- **Default results per query**: 3
- **Max chunk size**: 1000 characters

## File Support

### Supported Formats
- **.txt**: Plain text files
- **.md**: Markdown documents  
- **.csv**: Comma-separated values
- **.json**: JSON documents

### Content Processing
- Automatic paragraph-based chunking
- Sentence-level fallback for large paragraphs
- Metadata preservation
- Duplicate content handling

## Performance

### Chunking Strategy
1. Split by paragraphs (double newlines)
2. Respect 1000 character limit per chunk
3. Fall back to sentence splitting for large content
4. Preserve context and readability

### Search Optimization
- Vector similarity using cosine distance
- IVFFlat indexing for fast retrieval
- Configurable similarity thresholds
- Efficient multi-tenant filtering

### Scalability
- Supports thousands of documents per tenant
- Efficient storage with pgvector
- Optimized queries with proper indexing
- Automatic cleanup and maintenance

## Best Practices

### Document Organization
- Use descriptive names for documents
- Include relevant metadata
- Keep content focused and well-structured
- Regular cleanup of outdated documents

### Content Quality
- Write clear, concise content
- Use consistent terminology
- Structure information hierarchically
- Include context and examples

### Agent Configuration
- Link documents to specific agents when appropriate
- Use global documents for company-wide knowledge
- Test responses after adding new documents
- Monitor source attribution in responses

## Future Enhancements

### Planned Features
- **Additional File Formats**: PDF, DOCX, HTML support
- **Advanced Chunking**: Semantic chunking with AI
- **Document Versioning**: Track changes and updates
- **Batch Upload**: Multiple file processing
- **Analytics**: Document usage and effectiveness metrics
- **Fine-tuning**: Custom embedding models

### Integration Opportunities
- **CRM Integration**: Sync knowledge with customer data
- **Slack/Teams**: Upload documents from chat platforms
- **Google Drive**: Direct integration with cloud storage
- **API Webhooks**: Real-time document synchronization

## Troubleshooting

### Common Issues
1. **Embeddings failing**: Check OpenAI API key and credits
2. **Search not working**: Verify pgvector extension is enabled
3. **No results found**: Lower similarity threshold or check content
4. **Upload errors**: Verify file format and size limits

### Debug Tools
- Test script available at `tmp_rovodev_test_rag.ts`
- Database queries to check document storage
- Embedding similarity testing
- Search result debugging

## Component Architecture

### Frontend Components
- `DocumentUpload`: File upload and content input
- `DocumentsList`: Manage and view documents  
- `AgentChat`: Enhanced with source display

### Backend Services
- `lib/knowledge/actions.ts`: Core knowledge base logic
- `app/api/knowledge/route.ts`: REST API endpoints
- `lib/ai/chat.ts`: RAG-enhanced chat processing

### Database Layer
- Vector storage with pgvector
- Multi-tenant document isolation
- Optimized similarity search functions
- Comprehensive indexing strategy