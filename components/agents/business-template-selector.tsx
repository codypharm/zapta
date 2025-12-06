/**
 * Business Assistant Template Selector
 * Shows 8 specialized templates with recommended integrations
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { BUSINESS_TEMPLATES, type BusinessTemplate } from "@/lib/agents/business-assistant-templates";

const INTEGRATION_ICONS: Record<string, string> = {
  stripe: '💳',
  email: '📧',
  'google-calendar': '📅',
  hubspot: '🎯',
  'google-drive': '📁',
  notion: '📝',
  slack: '💬',
};

interface BusinessTemplateSelectorProps {
  value: string | null;
  onChange: (templateId: string, template: BusinessTemplate) => void;
}

export function BusinessTemplateSelector({ value, onChange }: BusinessTemplateSelectorProps) {
  // Sort templates: General first, then alphabetically by name
  const templates = Object.entries(BUSINESS_TEMPLATES).sort(([aKey, a], [bKey, b]) => {
    if (aKey === 'general') return -1;
    if (bKey === 'general') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose a Template</h2>
        <p className="text-muted-foreground">
          Select a specialized assistant template tailored to your role
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(([id, template]) => (
          <Card
            key={id}
            className={`
              group cursor-pointer transition-all hover:shadow-lg relative
              ${value === id ? 'border-primary border-2 shadow-md' : 'border-2 border-transparent hover:border-gray-300'}
            `}
            onClick={() => onChange(id, template)}
          >
            {/* Selection indicator */}
            {value === id && (
              <div className="absolute top-3 right-3 bg-primary text-white rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{template.icon}</span>
                <CardTitle className="text-lg">{template.name}</CardTitle>
              </div>
              <CardDescription className="text-sm line-clamp-2">
                {template.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Recommended Integrations */}
              {template.recommendedIntegrations.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                    Recommended:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.recommendedIntegrations.slice(0, 3).map((integration) => (
                      <Badge key={integration} variant="secondary" className="text-xs">
                        {INTEGRATION_ICONS[integration] || '🔌'} {integration}
                      </Badge>
                    ))}
                    {template.recommendedIntegrations.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.recommendedIntegrations.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Example Queries */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                  Example queries:
                </div>
                <ul className="space-y-1">
                  {template.exampleQueries.slice(0, 2).map((query, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5 flex-shrink-0">→</span>
                      <span className="line-clamp-1">"{query}"</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help text */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Can't decide?</strong> Choose <strong>General</strong> for a flexible assistant, or pick the template matching your primary role.
        </p>
      </div>
    </div>
  );
}
