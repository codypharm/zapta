/**
 * Knowledge Base Analytics
 * Track document usage, search effectiveness, and RAG performance
 */

import { createServerClient } from "@/lib/supabase/server";

export interface DocumentUsage {
  document_id: string;
  document_name: string;
  usage_count: number;
  avg_similarity: number;
  last_used: string;
}

export interface SearchEffectiveness {
  total_searches: number;
  successful_searches: number;
  success_rate: number;
  avg_results_count: number;
  avg_similarity_score: number;
  avg_execution_time: number;
}

export interface KnowledgeStats {
  total_documents: number;
  total_searches: number;
  successful_searches: number;
  documents_used: number;
  avg_similarity_score: number;
  date: string;
}

/**
 * Track document search hit
 */
export async function trackSearchHit(
  tenantId: string,
  agentId: string | null,
  documentId: string,
  query: string,
  similarityScore: number,
  userSession?: string
) {
  const supabase = await createServerClient();
  
  try {
    await supabase.from('document_analytics').insert({
      tenant_id: tenantId,
      agent_id: agentId,
      document_id: documentId,
      event_type: 'search_hit',
      query,
      similarity_score: similarityScore,
      user_session: userSession || null,
    });
  } catch (error) {
    console.error('Failed to track search hit:', error);
  }
}

/**
 * Track document being used in context
 */
export async function trackContextUsage(
  tenantId: string,
  agentId: string | null,
  documentId: string,
  query: string,
  similarityScore: number,
  userSession?: string
) {
  const supabase = await createServerClient();
  
  try {
    await supabase.from('document_analytics').insert({
      tenant_id: tenantId,
      agent_id: agentId,
      document_id: documentId,
      event_type: 'context_used',
      query,
      similarity_score: similarityScore,
      user_session: userSession || null,
    });
  } catch (error) {
    console.error('Failed to track context usage:', error);
  }
}

/**
 * Track search query execution
 */
export async function trackSearchQuery(
  tenantId: string,
  agentId: string | null,
  query: string,
  resultsCount: number,
  topSimilarityScore: number | null,
  executionTimeMs: number,
  userSession?: string
) {
  const supabase = await createServerClient();
  
  try {
    await supabase.from('search_analytics').insert({
      tenant_id: tenantId,
      agent_id: agentId,
      query,
      results_count: resultsCount,
      top_similarity_score: topSimilarityScore,
      execution_time_ms: executionTimeMs,
      user_session: userSession || null,
    });

    // Also update usage metrics for the day
    const today = new Date().toISOString().split('T')[0];
    
    // Track total searches
    await supabase.rpc('increment_usage_metric', {
      p_tenant_id: tenantId,
      p_metric_type: 'knowledge_searches',
      p_date: today,
    });

    // Track successful searches
    if (resultsCount > 0) {
      await supabase.rpc('increment_usage_metric', {
        p_tenant_id: tenantId,
        p_metric_type: 'knowledge_hits',
        p_date: today,
      });
    }
  } catch (error) {
    console.error('Failed to track search query:', error);
  }
}

/**
 * Get most used documents
 */
export async function getMostUsedDocuments(
  tenantId: string,
  agentId?: string,
  daysBack: number = 30,
  limit: number = 10
): Promise<DocumentUsage[]> {
  const supabase = await createServerClient();
  
  try {
    const { data, error } = await supabase.rpc('get_most_used_documents', {
      filter_tenant_id: tenantId,
      filter_agent_id: agentId || null,
      days_back: daysBack,
      limit_count: limit,
    });

    if (error) {
      console.error('Failed to get most used documents:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting most used documents:', error);
    return [];
  }
}

/**
 * Get search effectiveness metrics
 */
export async function getSearchEffectiveness(
  tenantId: string,
  agentId?: string,
  daysBack: number = 30
): Promise<SearchEffectiveness | null> {
  const supabase = await createServerClient();
  
  try {
    const { data, error } = await supabase.rpc('get_search_effectiveness', {
      filter_tenant_id: tenantId,
      filter_agent_id: agentId || null,
      days_back: daysBack,
    });

    if (error) {
      console.error('Failed to get search effectiveness:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting search effectiveness:', error);
    return null;
  }
}

/**
 * Get knowledge base stats for a date range
 */
export async function getKnowledgeStats(
  tenantId: string,
  agentId?: string,
  daysBack: number = 30
): Promise<KnowledgeStats[]> {
  const supabase = await createServerClient();
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    let query = supabase
      .from('knowledge_stats')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get knowledge stats:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting knowledge stats:', error);
    return [];
  }
}

/**
 * Get top search queries
 */
export async function getTopSearchQueries(
  tenantId: string,
  agentId?: string,
  daysBack: number = 30,
  limit: number = 10
) {
  const supabase = await createServerClient();

  try {
    const { data, error } = await supabase.rpc('get_top_search_queries', {
      filter_tenant_id: tenantId,
      filter_agent_id: agentId || null,
      days_back: daysBack,
      limit_count: limit,
    });

    if (error) {
      console.error('Failed to get top search queries:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting top search queries:', error);
    return [];
  }
}

/**
 * Get analytics dashboard data
 */
export async function getAnalyticsDashboard(
  tenantId: string,
  agentId?: string,
  daysBack: number = 30
) {
  const [
    mostUsedDocs,
    searchEffectiveness,
    knowledgeStats,
    topQueries
  ] = await Promise.all([
    getMostUsedDocuments(tenantId, agentId, daysBack, 5),
    getSearchEffectiveness(tenantId, agentId, daysBack),
    getKnowledgeStats(tenantId, agentId, daysBack),
    getTopSearchQueries(tenantId, agentId, daysBack, 5),
  ]);

  return {
    mostUsedDocuments: mostUsedDocs,
    searchEffectiveness,
    dailyStats: knowledgeStats,
    topSearchQueries: topQueries,
  };
}