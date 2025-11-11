/**
 * Knowledge Base Client Actions
 * Client-side functions that call API routes for document management
 */

export interface Document {
  id: string;
  name: string;
  totalChunks: number;
  chunks: any[];
  created_at: string;
  agent_id: string | null;
}

export interface UploadResult {
  success: boolean;
  documents?: any[];
  chunksCreated?: number;
  error?: string;
}

export interface SearchResult {
  success: boolean;
  documents: any[];
  error?: string;
}

export interface ListResult {
  success: boolean;
  documents: Document[];
  error?: string;
}

/**
 * Upload a document to the knowledge base
 */
export async function uploadDocument(
  name: string,
  content: string,
  agentId?: string,
  metadata: Record<string, any> = {}
): Promise<UploadResult> {
  try {
    const response = await fetch('/api/knowledge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        content,
        agentId: agentId || null,
        metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to upload document',
      };
    }

    return data;
  } catch (error) {
    console.error('Error uploading document:', error);
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
}

/**
 * Get all documents for the current user/agent
 */
export async function getDocuments(agentId?: string): Promise<ListResult> {
  try {
    const url = new URL('/api/knowledge', window.location.origin);
    if (agentId) {
      url.searchParams.set('agentId', agentId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        documents: [],
        error: data.error || 'Failed to fetch documents',
      };
    }

    return {
      success: true,
      documents: data.documents || [],
    };
  } catch (error) {
    console.error('Error fetching documents:', error);
    return {
      success: false,
      documents: [],
      error: 'Network error occurred',
    };
  }
}

/**
 * Delete a document from the knowledge base
 */
export async function deleteDocument(documentName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL('/api/knowledge', window.location.origin);
    url.searchParams.set('name', documentName);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to delete document',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
}