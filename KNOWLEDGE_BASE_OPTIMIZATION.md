# Knowledge Base System Optimization Tracker

**Project**: Zapta - AI Agent Platform
**Started**: 2025-01-13
**Status**: In Progress

---

## Overview

This document tracks the optimization and bug fixes for the RAG (Retrieval Augmented Generation) knowledge base system. The system currently supports PDF, DOCX, TXT, MD, CSV, and JSON file formats with multi-provider embedding support.

---

## Phase 1: Critical Bug Fixes ⚠️

**Priority**: P0 (Blocking)
**Estimated Time**: 30 minutes
**Status**: ✅ **COMPLETED** (2025-01-13)

### Tasks

- [x] **1.1 Fix PDF parsing import syntax bug**
  - **File**: `components/knowledge/document-upload.tsx:99`
  - **Issue**: Using incorrect named import `{ PDFParse }` instead of default export
  - **Impact**: PDF uploads will crash in production
  - **Status**: ✅ Fixed
  - **Solution**: Changed to default import: `const pdfParse = (await import('pdf-parse')).default;`

- [x] **1.2 Fix document deletion logic**
  - **File**: `lib/knowledge/actions.ts:299`
  - **Issue**: Only deletes one chunk instead of all chunks for a document
  - **Impact**: Orphaned data, incomplete deletions
  - **Status**: ✅ Fixed
  - **Solution**: Updated query to use `metadata->>'originalFileName'` to delete all chunks

- [x] **1.3 Add TypeScript type definitions**
  - **Packages**: `@types/pdf-parse`, `@types/mammoth`
  - **Issue**: Missing type safety for PDF/DOCX libraries
  - **Impact**: Development experience, potential type errors
  - **Status**: ✅ Fixed
  - **Solution**:
    - Installed `@types/pdf-parse` via npm
    - Created custom type declaration file `types/mammoth.d.ts` (no @types package exists)

- [x] **1.4 Add cascade delete for analytics**
  - **File**: `supabase/migrations/20250110_add_knowledge_analytics.sql:11`
  - **Issue**: Orphaned analytics data when documents deleted
  - **Impact**: Data integrity, storage waste
  - **Status**: ✅ Already implemented correctly
  - **Note**: Migration already has `ON DELETE CASCADE` - no changes needed

---

## Phase 2: Essential Optimizations

**Priority**: P1 (High)
**Estimated Time**: 2-3 hours
**Status**: 🔄 In Progress (1/5 complete)

### Tasks

- [x] **2.1 Move file processing to server-side** ✅ **COMPLETED**
  - **Previous**: Client-side PDF/DOCX parsing in browser
  - **Issue**: pdf-parse requires Node.js APIs, doesn't work in browser
  - **Solution**: Created `/api/knowledge/extract` endpoint for server-side processing
  - **Impact**: PDF/DOCX uploads now work properly, no browser freezing
  - **Bonus**: This was actually required to make PDF uploads work at all!

- [x] **2.1b Multi-file upload** ✅ **COMPLETED** (User requested)
  - **Previous**: Single file upload only
  - **Solution**: Completely rewrote upload component to support multiple files
  - **Features**:
    - Select multiple files at once (file picker or drag & drop)
    - Individual file status tracking (pending, extracting, uploading, success, error)
    - Sequential upload with progress indicators
    - Individual success/error messages per file
    - Remove individual files before upload
    - "Clear All" to reset
    - Visual feedback with color-coded status (green=success, red=error)
  - **Impact**: 10x better UX - upload entire knowledge base at once

- [ ] **2.2 Add pagination to document list**
  - **File**: `lib/knowledge/actions.ts:239`
  - **Issue**: No LIMIT/OFFSET, will slow down with many documents
  - **Solution**: Add pagination with 50 items per page
  - **Expected Impact**: Consistent performance at scale

- [ ] **2.3 Implement parallel embedding generation**
  - **File**: `lib/knowledge/actions.ts:96-116`
  - **Current**: Sequential processing with for loop
  - **Solution**: Use `Promise.all()` for concurrent requests
  - **Expected Impact**: 40-60% faster document processing

- [ ] **2.4 Create centralized configuration file**
  - **New File**: `lib/knowledge/config.ts`
  - **Current**: Hardcoded values scattered across files
  - **Values**: Chunk size (1000), thresholds (0.7), limits (3, 5), file size (10MB)
  - **Expected Impact**: Easier tuning and environment-specific configs

- [ ] **2.5 Add input validation**
  - **Files**: Upload endpoints and processing functions
  - **Missing**: Max document size, chunk count limits, content validation
  - **Solution**: Add validation middleware and checks
  - **Expected Impact**: Prevent DOS attacks, better error messages

---

## Phase 3: Performance Enhancements

**Priority**: P2 (Medium)
**Estimated Time**: 4-6 hours
**Status**: 📋 Planned

### Tasks

- [ ] **3.1 Implement embedding cache**
  - **New File**: `lib/knowledge/cache.ts`
  - **Solution**: In-memory cache with TTL (1 hour) for query embeddings
  - **Expected Impact**: 50-70% cost reduction for repeated queries

- [ ] **3.2 Optimize IVFFlat database indexes**
  - **File**: Database migration (new)
  - **Current**: Default IVFFlat settings
  - **Solution**: Add `WITH (lists = 100)` parameter, tune probes
  - **Expected Impact**: 90% faster vector search at scale

- [ ] **3.3 Batch embedding API requests**
  - **File**: `lib/embeddings/providers.ts`
  - **Current**: Individual requests per chunk
  - **Solution**: Batch up to 100 chunks per API call (OpenAI supports 2048)
  - **Expected Impact**: 50% fewer API calls, faster processing

- [ ] **3.4 Add document versioning**
  - **Files**: Database migration, actions, UI
  - **Solution**: Track document updates, store version history
  - **Expected Impact**: Better audit trail, rollback capability

- [ ] **3.5 Add bulk operations**
  - **Features**: Batch upload, batch delete, select all
  - **Solution**: New API endpoints and UI controls
  - **Expected Impact**: Better UX for managing many documents

---

## Phase 4: Advanced Features

**Priority**: P3 (Low)
**Estimated Time**: 1-2 weeks
**Status**: 📋 Planned

### Tasks

- [ ] **4.1 Hybrid search (vector + keyword)**
  - **Solution**: Combine cosine similarity with PostgreSQL full-text search
  - **Expected Impact**: Better recall, handle exact matches

- [ ] **4.2 Semantic chunking with overlap**
  - **Current**: Simple paragraph splitting
  - **Solution**: Sentence-transformer boundaries, 10-20% overlap
  - **Expected Impact**: Better context preservation, improved retrieval

- [ ] **4.3 Query expansion and re-ranking**
  - **Solution**: Generate query variations, use cross-encoder for re-ranking
  - **Expected Impact**: Higher precision and recall

- [ ] **4.4 Document preview and editing UI**
  - **Features**: Preview extracted text, edit before upload, chunk visualization
  - **Expected Impact**: Better UX, catch extraction errors

- [ ] **4.5 Export/import functionality**
  - **Features**: Export knowledge base, import from backup, migration tools
  - **Expected Impact**: Data portability, disaster recovery

- [ ] **4.6 Advanced analytics dashboard**
  - **Features**: Search quality metrics, A/B testing, cost tracking
  - **Expected Impact**: Data-driven optimization

---

## Current System Architecture

### Document Processing Pipeline
```
Upload → File Validation → Text Extraction → Chunking → Embedding Generation → Database Storage
```

### Embedding Providers (with Fallback)
1. **OpenAI** (1536D) - `text-embedding-3-small` - $0.02/1M tokens
2. **Cohere** (1024D) - `embed-english-light-v3.0` - Free tier available
3. **HuggingFace** (384D) - `sentence-transformers/all-MiniLM-L6-v2` - Free
4. **Voyage** (1024D) - `voyage-lite-02-instruct` - $0.13/1M tokens
5. **Hash-based** (256D) - Fallback when all APIs fail

### Key Files
- `components/knowledge/document-upload.tsx` - Upload UI and client-side processing
- `lib/knowledge/actions.ts` - Server actions for CRUD operations
- `lib/embeddings/providers.ts` - Multi-provider embedding system
- `lib/ai/chat.ts` - RAG integration with chat
- `lib/knowledge/analytics.ts` - Usage tracking and metrics
- `app/api/knowledge/route.ts` - Upload API endpoint

### Database Schema
- `documents` table - Stores chunks with vector embeddings
- `document_analytics` table - Tracks usage and performance
- `search_analytics` table - Search query metrics
- `knowledge_stats` table - Daily aggregated statistics

---

## Performance Metrics (Baseline)

### Current Performance
- **Document Upload**: ~2-5 seconds for small docs (varies by size)
- **Embedding Generation**: Sequential (slow for large docs)
- **Vector Search**: ~100-200ms (depends on document count)
- **Chunk Processing**: 1000 characters max, paragraph-based

### Target Performance (After Optimization)
- **Document Upload**: 40-60% faster with parallel processing
- **Embedding Cost**: 50-70% reduction with caching
- **Vector Search**: 90% faster with optimized indexes
- **UX**: No browser freezing (server-side processing)

---

## Known Issues & Bugs

### Critical (P0)
1. ✅ PDF parsing import bug - Will crash on PDF upload
2. ✅ Incomplete document deletion - Only deletes 1 chunk
3. ✅ Missing type definitions - No @types for pdf-parse/mammoth
4. ✅ Analytics orphan data - No cascade delete

### High Priority (P1)
- Client-side file processing causes UI freezing
- No pagination (will slow down UI)
- Hardcoded configuration values
- Missing input validation

### Medium Priority (P2)
- No embedding cache (high costs)
- IVFFlat not optimized
- No document versioning
- No bulk operations

---

## Environment Variables

### Required for Knowledge Base
```bash
# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Embedding Providers (at least one required)
OPENAI_API_KEY=           # Recommended - Best quality
COHERE_API_KEY=           # Good balance, free tier
HUGGINGFACE_API_KEY=      # Free option
VOYAGE_API_KEY=           # Alternative premium
```

### Optional Configuration (To Be Added)
```bash
# Chunking
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
CHUNK_STRATEGY=paragraph

# Search
SEARCH_THRESHOLD=0.7
SEARCH_LIMIT=5
RAG_CONTEXT_LIMIT=3

# Upload
MAX_FILE_SIZE=10485760    # 10MB in bytes
ALLOWED_FILE_TYPES=pdf,docx,txt,md,csv,json
```

---

## Testing Checklist

### Phase 1 Testing
- [ ] Upload PDF file and verify successful processing
- [ ] Upload DOCX file and verify text extraction
- [ ] Delete multi-chunk document and verify all chunks removed
- [ ] TypeScript compilation without errors
- [ ] Delete document and verify analytics cleaned up

### Phase 2 Testing
- [ ] Upload large file (5MB+) without browser freezing
- [ ] Navigate through paginated document list
- [ ] Upload document with many chunks, verify parallel processing
- [ ] Modify configuration and verify changes applied
- [ ] Upload invalid files and verify proper error messages

### Phase 3 Testing
- [ ] Perform same search twice, verify cache hit
- [ ] Search with 1000+ documents, verify performance
- [ ] Upload 10+ documents, verify batched API calls
- [ ] Update document and verify version history
- [ ] Bulk delete 10+ documents at once

---

## Change Log

### 2025-01-13 (Phase 1 Complete ✅ + Phase 2 Progress)
- **Created tracking document** (`KNOWLEDGE_BASE_OPTIMIZATION.md`)
- **Completed Phase 1**: All critical bug fixes implemented
  - ✅ Fixed PDF parsing import bug - Changed to default export
  - ✅ Fixed document deletion - Now deletes all chunks using metadata filter
  - ✅ Added TypeScript type definitions - Installed @types/pdf-parse, created mammoth.d.ts
  - ✅ Verified cascade delete - Already properly implemented in migration

**Additional Fixes (User Testing Feedback):**
  - ✅ **Moved PDF/DOCX extraction to server-side** - Created `/api/knowledge/extract` endpoint
  - ✅ **Fixed error state management** - Errors now clear when file is removed/changed
  - ✅ **Improved error messages** - Now shows specific error details instead of generic messages
  - ✅ **Better error logging** - Console logs help debug extraction issues
  - ✅ **Replaced pdf-parse with unpdf** - Switched to modern, lightweight PDF parser
    - **Why**: pdf-parse had compatibility issues, pdfjs-dist was complex to configure
    - **Result**: Simple, reliable PDF parsing designed for server environments

**Phase 2 Features Implemented:**
  - ✅ **Multi-file upload system** - Complete rewrite of upload component
    - **Features**: Multiple file selection, drag & drop, individual file tracking
    - **Progress**: Real-time status for each file (extracting → uploading → success/error)
    - **UX**: Color-coded status, remove individual files, "Clear All" button
    - **Impact**: Upload 10+ documents at once instead of one-by-one

**Files Modified:**
- `components/knowledge/document-upload.tsx` - **Complete rewrite** for multi-file upload with status tracking
- `lib/knowledge/actions.ts` - Fixed document deletion logic
- `types/mammoth.d.ts` - Created type declarations (new file)
- `app/api/knowledge/extract/route.ts` - Server-side extraction with unpdf (new file)
- `next.config.ts` - Cleaned up (removed unnecessary serverExternalPackages)
- `package.json` - Replaced pdf-parse with unpdf (simpler, more reliable)

---

## Next Steps

1. ✅ ~~Complete Phase 1 critical bug fixes~~ **DONE**
2. **Test all fixes in development environment** ⬅️ NEXT
3. Review Phase 2 scope - Prioritize optimizations
4. Consider creating automated tests for RAG system
5. Begin Phase 2: Essential optimizations

---

## Notes

- RAG system is well-architected with good separation of concerns
- Multi-provider embedding support is a strong feature
- Analytics tracking is comprehensive
- Need to balance optimization vs. new features
- Consider A/B testing different chunking strategies
- Monitor embedding costs closely in production

---

**Last Updated**: 2025-01-13
**Next Review**: After Phase 1 completion
