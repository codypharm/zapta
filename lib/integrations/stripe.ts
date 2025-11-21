/**
 * Stripe Integration
 * Handles payment processing and subscription management
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";

interface StripeCredentials {
  secret_key: string;
  publishable_key: string;
  webhook_secret?: string;
}

interface StripePayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, any>;
  created: string;
}

export class StripeIntegration extends BaseIntegration {
  provider = "stripe";
  type = "payment" as const;

  private getAuthHeaders(): Record<string, string> {
    const credentials = this.getCredentials();

    if (!credentials.secret_key) {
      throw new Error("Stripe integration not authenticated");
    }

    return {
      Authorization: `Bearer ${credentials.secret_key}`,
      "Content-Type": "application/json",
    };
  }

  private getCredentials(): StripeCredentials {
    // In a real implementation, this would fetch from secure storage
    return {} as StripeCredentials;
  }

  /**
   * Authenticate with Stripe API keys
   */
  async authenticate(credentials: StripeCredentials): Promise<void> {
    // Store credentials securely
    console.log("Stripe authentication initiated");

    // Validate credentials format
    if (!credentials.secret_key || !credentials.publishable_key) {
      throw new Error("Secret key and publishable key are required");
    }

    // Test API access
    try {
      const response = await fetch("https://api.stripe.com/v1/account", {
        headers: {
          Authorization: `Bearer ${credentials.secret_key}`,
        },
      });

      if (!response.ok) {
        throw new Error("Invalid Stripe credentials");
      }
    } catch (error) {
      throw new Error(`Stripe authentication failed: ${error}`);
    }
  }

  /**
   * Test Stripe connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const credentials = this.getCredentials();

      if (!credentials.secret_key) {
        console.log("No secret key available for testing");
        return false;
      }

      // Test API access by fetching account info
      const response = await fetch("https://api.stripe.com/v1/account", {
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Stripe connection test successful");
        return true;
      } else {
        console.error("Stripe connection test failed");
        return false;
      }
    } catch (error) {
      console.error("Stripe connection test error:", error);
      return false;
    }
  }

  /**
   * Execute Stripe actions
   */
  async executeAction(action: string, params: any): Promise<any> {
    const credentials = this.getCredentials();

    switch (action) {
      case "create_payment":
        return this.createPaymentIntent(params);

      case "create_customer":
        return this.createCustomer(params);

      case "create_subscription":
        return this.createSubscription(params);

      case "get_payment":
        return this.getPayment(params.payment_id);

      case "refund_payment":
        return this.refundPayment(params.payment_id, params.amount);

      default:
        throw new Error(`Unknown Stripe action: ${action}`);
    }
  }

  /**
   * Create a payment intent
   */
  private async createPaymentIntent(paymentData: {
    amount: number;
    currency?: string;
    customer_id?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency || "usd",
        customer: paymentData.customer_id,
        metadata: paymentData.metadata || {},
        automatic_payment_methods: {
          enabled: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create payment intent: ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Create a customer
   */
  private async createCustomer(customerData: {
    email: string;
    name?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const response = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        email: customerData.email,
        name: customerData.name,
        metadata: customerData.metadata || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create customer: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create a subscription
   */
  private async createSubscription(subscriptionData: {
    customer_id: string;
    price_id: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const response = await fetch("https://api.stripe.com/v1/subscriptions", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        customer: subscriptionData.customer_id,
        items: [{ price: subscriptionData.price_id }],
        metadata: subscriptionData.metadata || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create subscription: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get payment details
   */
  private async getPayment(paymentId: string): Promise<StripePayment> {
    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents/${paymentId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch payment: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Refund a payment
   */
  private async refundPayment(
    paymentId: string,
    amount?: number
  ): Promise<any> {
    const refundData: any = {
      payment_intent: paymentId,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Convert to cents
    }

    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(refundData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create refund: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get Stripe integration config schema
   */
  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: "api_key" as const,
      fields: [
        {
          key: "secret_key",
          label: "Secret Key",
          type: "password" as const,
          required: true,
          description: "Your Stripe secret key (sk_test_... or sk_live_...)",
          placeholder: "sk_test_...",
        },
        {
          key: "publishable_key",
          label: "Publishable Key",
          type: "password" as const,
          required: true,
          description:
            "Your Stripe publishable key (pk_test_... or pk_live_...)",
          placeholder: "pk_test_...",
        },
        {
          key: "webhook_secret",
          label: "Webhook Secret (Optional)",
          type: "password" as const,
          required: false,
          description: "Webhook signing secret for secure event processing",
        },
      ],
    };
  }

  /**
   * Get Stripe integration capabilities
   */
  getCapabilities(): string[] {
    return [
      "create_payment",
      "create_customer",
      "create_subscription",
      "get_payment",
      "refund_payment",
      "handle_webhooks",
      "manage_subscriptions",
    ];
  }
}

export default StripeIntegration;
