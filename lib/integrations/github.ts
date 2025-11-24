/**
 * GitHub Integration
 * Handles repository management and development workflows
 */

import { BaseIntegration, type IntegrationConfigSchema } from "./base";

interface GitHubCredentials {
  personal_access_token: string;
  webhook_secret?: string;
}

export class GitHubIntegration extends BaseIntegration {
  provider = "github";
  type = "development" as const;

  private getAuthHeaders(): Record<string, string> {
    const credentials = this.getCredentials();

    if (!credentials.personal_access_token) {
      throw new Error("GitHub integration not authenticated");
    }

    return {
      Authorization: `token ${credentials.personal_access_token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  protected getCredentials(): GitHubCredentials {
    // In a real implementation, this would fetch from secure storage
    return {} as GitHubCredentials;
  }

  /**
   * Authenticate with GitHub personal access token
   */
  async authenticate(credentials: GitHubCredentials): Promise<void> {
    // Store credentials securely
    console.log("GitHub authentication initiated");

    // Validate credentials format
    if (!credentials.personal_access_token) {
      throw new Error("Personal access token is required");
    }

    // Test API access
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${credentials.personal_access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Invalid GitHub credentials");
      }
    } catch (error) {
      throw new Error(`GitHub authentication failed: ${error}`);
    }
  }

  /**
   * Test GitHub connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const credentials = this.getCredentials();

      if (!credentials.personal_access_token) {
        console.log("No access token available for testing");
        return false;
      }

      // Test API access by fetching user info
      const response = await fetch("https://api.github.com/user", {
        headers: this.getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("GitHub connection test successful");
        return true;
      } else {
        console.error("GitHub connection test failed");
        return false;
      }
    } catch (error) {
      console.error("GitHub connection test error:", error);
      return false;
    }
  }

  /**
   * Execute GitHub actions
   */
  async executeAction(action: string, params: any): Promise<any> {
    const credentials = this.getCredentials();

    switch (action) {
      case "create_repository":
        return this.createRepository(params);

      case "update_repository":
        return this.updateRepository(params.repo, params.data);

      case "create_issue":
        return this.createIssue(params.repo, params.issue);

      case "update_issue":
        return this.updateIssue(params.repo, params.issue_number, params.data);

      case "create_pull_request":
        return this.createPullRequest(params);

      default:
        throw new Error(`Unknown GitHub action: ${action}`);
    }
  }

  /**
   * Create a new repository
   */
  private async createRepository(repoData: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
  }): Promise<any> {
    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        name: repoData.name,
        description: repoData.description || "",
        private: repoData.private || false,
        auto_init: repoData.auto_init || false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create repository: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update a repository
   */
  private async updateRepository(
    repo: string,
    updateData: Record<string, any>
  ): Promise<any> {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(repo)}`,
      {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update repository: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create an issue in a repository
   */
  private async createIssue(
    repo: string,
    issueData: {
      title: string;
      body?: string;
      labels?: string[];
    }
  ): Promise<any> {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(repo)}/issues`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          title: issueData.title,
          body: issueData.body || "",
          labels: issueData.labels || [],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create issue: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update an issue
   */
  private async updateIssue(
    repo: string,
    issueNumber: number,
    updateData: Record<string, any>
  ): Promise<any> {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(repo)}/issues/${issueNumber}`,
      {
        method: "PATCH",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update issue: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create a pull request
   */
  private async createPullRequest(prData: {
    head_repo: string;
    base_repo: string;
    head_branch: string;
    base_branch: string;
    title: string;
    body?: string;
  }): Promise<any> {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(prData.base_repo)}/pulls`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          head: `${prData.head_repo}:${prData.head_branch}`,
          base: `${prData.base_repo}:${prData.base_branch}`,
          title: prData.title,
          body: prData.body || "",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create pull request: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Handle GitHub webhook events
   */
  async handleWebhook(payload: any): Promise<void> {
    const event = payload;

    switch (payload.action) {
      case "opened":
        // Handle new issue or PR
        if (payload.pull_request) {
          console.log("Pull request opened:", payload.pull_request);
        } else if (payload.issue) {
          console.log("Issue opened:", payload.issue);
        }
        break;

      case "closed":
        // Handle closed issue or PR
        if (payload.pull_request) {
          console.log("Pull request closed:", payload.pull_request);
        } else if (payload.issue) {
          console.log("Issue closed:", payload.issue);
        }
        break;

      case "push":
        // Handle code push
        console.log("Code pushed to repository:", payload.repository);
        break;

      default:
        console.log("Unhandled GitHub event:", payload.action);
    }
  }

  /**
   * Get GitHub integration config schema
   */
  getConfigSchema(): IntegrationConfigSchema {
    return {
      type: "api_key" as const,
      fields: [
        {
          key: "personal_access_token",
          label: "Personal Access Token",
          type: "password" as const,
          required: true,
          description:
            "Your GitHub personal access token (classic or fine-grained)",
          placeholder: "ghp_...",
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
   * Get GitHub integration capabilities
   */
  getCapabilities(): string[] {
    return [
      "create_repository",
      "update_repository",
      "create_issue",
      "update_issue",
      "create_pull_request",
      "handle_webhooks",
      "manage_releases",
      "get_repository_data",
    ];
  }
}

export default GitHubIntegration;
