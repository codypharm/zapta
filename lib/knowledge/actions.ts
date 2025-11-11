/**
 * Knowledge Base Actions
 * Handles document upload, processing, and RAG operations
 */

import { createServerClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";
import { trackSearchQuery, trackSearchHit, trackContextUsage } from "@/lib/knowledge/analytics";
import { embeddingService } from "@/lib/embeddings/providers";

type Document = Database['public']['Tables']['documents']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];

/**
 * Generate embeddings for text content using multiple providers with fallback
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const result = await embeddingService.generateEmbeddings(text);
    console.log(`Generated embeddings using ${result.provider} (${result.dimensions}D)`);
    return result.embedding;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process and chunk document content
 */
export function chunkDocument(content: string, maxChunkSize: number = 1000): string[] {
  // Split by paragraphs first
  const paragraphs = content.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If any chunks are still too large, split them by sentences
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChunkSize) {
      finalChunks.push(chunk);
    } else {
      const sentences = chunk.split(/[.!?]+/);
      let currentSentenceChunk = "";
      
      for (const sentence of sentences) {
        if (currentSentenceChunk.length + sentence.length > maxChunkSize && currentSentenceChunk.length > 0) {
          finalChunks.push(currentSentenceChunk.trim());
          currentSentenceChunk = sentence;
        } else {
          currentSentenceChunk += (currentSentenceChunk ? ". " : "") + sentence;
        }
      }
      
      if (currentSentenceChunk.trim()) {
        finalChunks.push(currentSentenceChunk.trim());
      }
    }
  }

  return finalChunks.filter(chunk => chunk.length > 0);
}

/**
 * Upload and process a document
 */
export async function uploadDocument(
  tenantId: string,
  agentId: string | null,
  name: string,
  content: string,
  metadata: Record<string, any> = {}
) {
  const supabase = await createServerClient();

  try {
    // Chunk the document
    const chunks = chunkDocument(content);
    
    // Process each chunk
    const documents: DocumentInsert[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingResult = await embeddingService.generateEmbeddings(chunk);
      
      documents.push({
        tenant_id: tenantId,
        agent_id: agentId,
        name: chunks.length > 1 ? `${name} (Part ${i + 1})` : name,
        content: chunk,
        embedding: embeddingResult.embedding,
        embedding_model: embeddingResult.provider.toLowerCase(),
        embedding_dimensions: embeddingResult.dimensions,
        metadata: {
          ...metadata,
          chunkIndex: i,
          totalChunks: chunks.length,
          originalFileName: name,
          embeddingProvider: embeddingResult.provider,
        },
      });
    }

    // Insert all chunks
    const { data, error } = await supabase
      .from("documents")
      .insert(documents)
      .select();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      success: true,
      documents: data,
      chunksCreated: chunks.length,
    };
  } catch (error) {
    console.error("Error uploading document:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload document",
    };
  }
}

/**
 * Search documents using vector similarity
 */
export async function searchDocuments(
  tenantId: string,
  query: string,
  agentId?: string,
  limit: number = 5,
  threshold: number = 0.7,
  userSession?: string
) {
  const supabase = await createServerClient();
  const startTime = Date.now();

  try {
    // Generate embedding for the query
    const queryEmbeddingResult = await embeddingService.generateEmbeddings(query);

    // Use the match_documents function
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbeddingResult.embedding,
      match_threshold: threshold,
      match_count: limit,
      filter_tenant_id: tenantId,
      filter_agent_id: agentId || null,
      filter_embedding_model: queryEmbeddingResult.provider.toLowerCase(),
    });

    if (error) {
      throw new Error(`Search error: ${error.message}`);
    }

    const executionTime = Date.now() - startTime;
    const results = data || [];
    
    // Track analytics
    try {
      // Track the search query
      await trackSearchQuery(
        tenantId,
        agentId || null,
        query,
        results.length,
        results[0]?.similarity || null,
        executionTime,
        userSession
      );

      // Track individual document hits
      for (const doc of results) {
        await trackSearchHit(
          tenantId,
          agentId || null,
          doc.id,
          query,
          doc.similarity || 0,
          userSession
        );
      }
    } catch (analyticsError) {
      console.error("Analytics tracking failed:", analyticsError);
      // Don't fail the search if analytics fails
    }

    return {
      success: true,
      documents: results,
    };
  } catch (error) {
    console.error("Error searching documents:", error);
    
    // Track failed search
    try {
      await trackSearchQuery(
        tenantId,
        agentId || null,
        query,
        0,
        null,
        Date.now() - startTime,
        userSession
      );
    } catch (analyticsError) {
      console.error("Analytics tracking failed:", analyticsError);
    }
    
    return {
      success: false,
      documents: [],
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

/**
 * Get all documents for a tenant/agent
 */
export async function getDocuments(tenantId: string, agentId?: string) {
  const supabase = await createServerClient();

  try {
    let query = supabase
      .from("documents")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (agentId) {
      query = query.eq("agent_id", agentId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Group chunks by original document
    const groupedDocs = new Map();
    
    for (const doc of data || []) {
      const originalName = doc.metadata?.originalFileName || doc.name;
      if (!groupedDocs.has(originalName)) {
        groupedDocs.set(originalName, {
          id: doc.id,
          name: originalName,
          totalChunks: doc.metadata?.totalChunks || 1,
          chunks: [],
          created_at: doc.created_at,
          agent_id: doc.agent_id,
        });
      }
      groupedDocs.get(originalName).chunks.push(doc);
    }

    return {
      success: true,
      documents: Array.from(groupedDocs.values()),
    };
  } catch (error) {
    console.error("Error getting documents:", error);
    return {
      success: false,
      documents: [],
      error: error instanceof Error ? error.message : "Failed to get documents",
    };
  }
}

/**
 * Delete a document (all chunks)
 */
export async function deleteDocument(tenantId: string, documentName: string) {
  const supabase = await createServerClient();

  try {
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("name", documentName);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete document",
    };
  }
}