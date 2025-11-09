/**
 * Database Types
 * TypeScript types for database tables and relationships
 * These will be automatically generated from Supabase once schema is created
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: 'free' | 'pro' | 'business';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          full_name: string | null;
          role: 'owner' | 'admin' | 'member';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      agents: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          type: 'support' | 'sales' | 'automation' | 'analytics';
          config: Json;
          status: 'active' | 'inactive' | 'error';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };
      integrations: {
        Row: {
          id: string;
          tenant_id: string;
          provider: string;
          credentials: Json;
          config: Json | null;
          status: 'connected' | 'disconnected' | 'error';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['integrations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          tenant_id: string;
          agent_id: string;
          messages: Json;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      agent_executions: {
        Row: {
          id: string;
          tenant_id: string;
          agent_id: string;
          status: 'success' | 'error' | 'timeout';
          duration_ms: number | null;
          input: Json | null;
          output: Json | null;
          error: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_executions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['agent_executions']['Insert']>;
      };
      usage_metrics: {
        Row: {
          id: string;
          tenant_id: string;
          metric_type: 'conversations' | 'api_calls' | 'messages';
          count: number;
          date: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['usage_metrics']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['usage_metrics']['Insert']>;
      };
    };
  };
}
