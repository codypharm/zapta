/**
 * Multiple Embedding Providers
 * Supports OpenAI, Cohere, Hugging Face, and local models
 */

import OpenAI from "openai";

export interface EmbeddingProvider {
  name: string;
  generateEmbeddings(text: string): Promise<number[]>;
  dimensions: number;
  costPer1kTokens: number;
}

// OpenAI Provider
class OpenAIProvider implements EmbeddingProvider {
  name = "OpenAI";
  dimensions = 1536;
  costPer1kTokens = 0.00002;
  
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }
}

// Cohere Provider (Free tier available)
class CohereProvider implements EmbeddingProvider {
  name = "Cohere";
  dimensions = 1024;
  costPer1kTokens = 0.0001; // Very affordable
  
  async generateEmbeddings(text: string): Promise<number[]> {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [text],
        model: 'embed-english-light-v3.0', // Free tier
        input_type: 'search_document',
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embeddings[0];
  }
}

// Hugging Face Provider (Free with rate limits)
class HuggingFaceProvider implements EmbeddingProvider {
  name = "HuggingFace";
  dimensions = 384; // sentence-transformers/all-MiniLM-L6-v2
  costPer1kTokens = 0; // Free!
  
  async generateEmbeddings(text: string): Promise<number[]> {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }
}

// Voyage AI Provider (Competitive pricing)
class VoyageProvider implements EmbeddingProvider {
  name = "Voyage";
  dimensions = 1024;
  costPer1kTokens = 0.00013;
  
  async generateEmbeddings(text: string): Promise<number[]> {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [text],
        model: 'voyage-lite-02-instruct',
      }),
    });

    if (!response.ok) {
      throw new Error(`Voyage API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}

// Simple hash-based embeddings (fallback when all else fails)
class HashProvider implements EmbeddingProvider {
  name = "Hash";
  dimensions = 256;
  costPer1kTokens = 0; // Free!
  
  async generateEmbeddings(text: string): Promise<number[]> {
    // Simple hash-based embedding (not semantic, but better than nothing)
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(this.dimensions).fill(0);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = this.simpleHash(word);
      const index = Math.abs(hash) % this.dimensions;
      embedding[index] += 1 / Math.sqrt(words.length);
    }
    
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => norm > 0 ? val / norm : 0);
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

// Provider factory and failover system
export class EmbeddingService {
  private providers: EmbeddingProvider[] = [];
  
  constructor() {
    // Add providers in order of preference
    if (process.env.OPENAI_API_KEY) {
      this.providers.push(new OpenAIProvider());
    }
    if (process.env.COHERE_API_KEY) {
      this.providers.push(new CohereProvider());
    }
    if (process.env.HUGGINGFACE_API_KEY) {
      this.providers.push(new HuggingFaceProvider());
    }
    if (process.env.VOYAGE_API_KEY) {
      this.providers.push(new VoyageProvider());
    }
    
    // Always add hash provider as final fallback
    this.providers.push(new HashProvider());
  }
  
  async generateEmbeddings(text: string): Promise<{ embedding: number[]; provider: string; dimensions: number }> {
    const errors: string[] = [];
    
    for (const provider of this.providers) {
      try {
        console.log(`Trying ${provider.name} provider...`);
        const embedding = await provider.generateEmbeddings(text);
        
        console.log(`✅ ${provider.name} succeeded (${provider.dimensions}D, $${provider.costPer1kTokens}/1k tokens)`);
        return {
          embedding,
          provider: provider.name,
          dimensions: provider.dimensions,
        };
      } catch (error) {
        const errorMsg = `${provider.name}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.warn(`❌ ${provider.name} failed: ${errorMsg}`);
        continue;
      }
    }
    
    throw new Error(`All embedding providers failed:\n${errors.join('\n')}`);
  }
  
  getAvailableProviders(): string[] {
    return this.providers.map(p => `${p.name} (${p.dimensions}D, $${p.costPer1kTokens}/1k)`);
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();