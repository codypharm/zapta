/**
 * Flexible Embeddings Migration
 * Updates the documents table to handle different embedding dimensions
 */

-- Drop the existing documents table and recreate with flexible dimensions
DROP TABLE IF EXISTS public.documents CASCADE;

-- Recreate documents table with flexible embedding storage
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector, -- No fixed dimension constraint
  embedding_model TEXT DEFAULT 'openai', -- Track which model was used
  embedding_dimensions INTEGER DEFAULT 1536, -- Track actual dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX documents_tenant_id_idx ON public.documents(tenant_id);
CREATE INDEX documents_agent_id_idx ON public.documents(agent_id);
CREATE INDEX documents_created_at_idx ON public.documents(created_at DESC);
CREATE INDEX documents_embedding_model_idx ON public.documents(embedding_model);

-- Drop existing match_documents function variants
DROP FUNCTION IF EXISTS match_documents CASCADE;

-- Create embedding search function that handles different dimensions
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector,
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 5,
  filter_tenant_id uuid DEFAULT NULL,
  filter_agent_id uuid DEFAULT NULL,
  filter_embedding_model text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  embedding_model text,
  embedding_dimensions integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    documents.embedding_model,
    documents.embedding_dimensions,
    (documents.embedding <=> query_embedding) * -1 + 1 AS similarity
  FROM documents
  WHERE 
    (filter_tenant_id IS NULL OR documents.tenant_id = filter_tenant_id) AND
    (filter_agent_id IS NULL OR documents.agent_id = filter_agent_id) AND
    (filter_embedding_model IS NULL OR documents.embedding_model = filter_embedding_model) AND
    (documents.embedding <=> query_embedding) * -1 + 1 > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view documents in their tenant"
  ON public.documents
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents in their tenant"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their tenant"
  ON public.documents
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their tenant"
  ON public.documents
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.documents IS 'Documents with flexible embeddings from multiple providers';
COMMENT ON COLUMN public.documents.embedding IS 'Vector embedding (dimension-flexible)';
COMMENT ON COLUMN public.documents.embedding_model IS 'Provider used: openai, cohere, huggingface, etc';
COMMENT ON COLUMN public.documents.embedding_dimensions IS 'Actual dimensions of the embedding vector';
COMMENT ON FUNCTION match_documents IS 'Search documents with flexible embedding dimensions';