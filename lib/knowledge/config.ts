/**
 * Knowledge Base Configuration
 * Centralized configuration for RAG system with environment variable support
 */

export const knowledgeConfig = {
  /**
   * Document Chunking Configuration
   */
  chunking: {
    /** Maximum characters per chunk */
    maxChunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),

    /** Overlap between chunks (characters) - helps preserve context */
    overlapSize: parseInt(process.env.CHUNK_OVERLAP || '0'),

    /** Chunking strategy: 'paragraph' | 'sentence' | 'fixed' */
    strategy: (process.env.CHUNK_STRATEGY || 'paragraph') as 'paragraph' | 'sentence' | 'fixed',
  },

  /**
   * Vector Search Configuration
   */
  search: {
    /** Minimum similarity threshold (0-1) for document matching */
    defaultThreshold: parseFloat(process.env.SEARCH_THRESHOLD || '0.7'),

    /** Default number of documents to return per search */
    defaultLimit: parseInt(process.env.SEARCH_LIMIT || '5'),

    /** Maximum number of documents that can be requested */
    maxLimit: parseInt(process.env.SEARCH_MAX_LIMIT || '50'),
  },

  /**
   * RAG (Retrieval Augmented Generation) Configuration
   */
  rag: {
    /** Number of documents to include in chat context */
    contextLimit: parseInt(process.env.RAG_CONTEXT_LIMIT || '3'),

    /** Similarity threshold for RAG context inclusion */
    contextThreshold: parseFloat(process.env.RAG_CONTEXT_THRESHOLD || '0.7'),
  },

  /**
   * File Upload Configuration
   */
  upload: {
    /** Maximum file size in bytes (default: 10MB) */
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),

    /** Allowed file extensions */
    allowedExtensions: (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,doc,txt,md,csv,json')
      .split(',')
      .map(ext => ext.trim()),

    /** Allowed MIME types */
    allowedMimeTypes: [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
  },

  /**
   * Pagination Configuration
   */
  pagination: {
    /** Default page size for document lists */
    defaultPageSize: parseInt(process.env.DOCS_PAGE_SIZE || '50'),

    /** Maximum page size allowed */
    maxPageSize: parseInt(process.env.DOCS_MAX_PAGE_SIZE || '100'),
  },

  /**
   * Performance Configuration
   */
  performance: {
    /** Enable parallel embedding generation for faster uploads */
    parallelEmbeddings: process.env.PARALLEL_EMBEDDINGS !== 'false',

    /** Maximum concurrent embedding requests */
    maxConcurrentEmbeddings: parseInt(process.env.MAX_CONCURRENT_EMBEDDINGS || '5'),

    /** Enable embedding cache (for future implementation) */
    enableEmbeddingCache: process.env.ENABLE_EMBEDDING_CACHE === 'true',

    /** Cache TTL in seconds */
    cacheTTL: parseInt(process.env.EMBEDDING_CACHE_TTL || '3600'),
  },

  /**
   * Analytics Configuration
   */
  analytics: {
    /** Track search queries */
    trackSearches: process.env.TRACK_SEARCHES !== 'false',

    /** Track document usage */
    trackDocumentUsage: process.env.TRACK_DOCUMENT_USAGE !== 'false',
  },
} as const;

/**
 * Helper function to validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate chunking
  if (knowledgeConfig.chunking.maxChunkSize < 100) {
    errors.push('CHUNK_SIZE must be at least 100');
  }
  if (knowledgeConfig.chunking.maxChunkSize > 10000) {
    errors.push('CHUNK_SIZE must be at most 10000');
  }

  // Validate search thresholds
  if (knowledgeConfig.search.defaultThreshold < 0 || knowledgeConfig.search.defaultThreshold > 1) {
    errors.push('SEARCH_THRESHOLD must be between 0 and 1');
  }
  if (knowledgeConfig.rag.contextThreshold < 0 || knowledgeConfig.rag.contextThreshold > 1) {
    errors.push('RAG_CONTEXT_THRESHOLD must be between 0 and 1');
  }

  // Validate limits
  if (knowledgeConfig.search.defaultLimit < 1) {
    errors.push('SEARCH_LIMIT must be at least 1');
  }
  if (knowledgeConfig.rag.contextLimit < 1) {
    errors.push('RAG_CONTEXT_LIMIT must be at least 1');
  }

  // Validate file size
  if (knowledgeConfig.upload.maxFileSize < 1024) {
    errors.push('MAX_FILE_SIZE must be at least 1024 bytes (1KB)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log configuration on startup (useful for debugging)
 */
export function logConfig() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Knowledge Base Configuration:', {
      chunking: knowledgeConfig.chunking,
      search: knowledgeConfig.search,
      rag: knowledgeConfig.rag,
      upload: {
        ...knowledgeConfig.upload,
        maxFileSizeMB: (knowledgeConfig.upload.maxFileSize / 1024 / 1024).toFixed(2),
      },
      performance: knowledgeConfig.performance,
    });
  }
}
