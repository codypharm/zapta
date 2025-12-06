/**
 * Agent Class Selector
 * Allows users to choose between Customer Assistant (widget) or Business Assistant (internal)
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface AgentClassOption {
  id: 'customer_assistant' | 'business_assistant';
  name: string;
  icon: string;
  description: string;
  useCases: string[];
  features: {
    label: string;
    available: boolean;
  }[];
}

const AGENT_CLASSES: AgentClassOption[] = [
  {
    id: 'customer_assistant',
    name: 'Customer Assistant',
    icon: '💬',
    description: 'Customer-facing chatbot that embeds on your website',
    useCases: [
      'Answer customer questions 24/7',
      'Provide product information',
      'Collect leads and contact info',
      'Escalate to human support',
    ],
    features: [
      { label: 'Widget embed', available: true },
      { label: 'Knowledge base', available: true },
      { label: 'Lead collection', available: true },
      { label: 'Business integrations', available: false },
      { label: 'Tool calling', available: false },
    ],
  },
  {
    id: 'business_assistant',
    name: 'Business Assistant',
    icon: '💼',
    description: 'Internal assistant with access to your business data and tools',
    useCases: [
      'Query revenue and metrics',
      'Check calendar and schedule',
      'Search emails and documents',
      'Execute actions (send emails, create events)',
    ],
    features: [
      { label: 'Widget embed', available: false },
      { label: 'Knowledge base', available: true },
      { label: 'Business integrations', available: true },
      { label: 'Tool calling (27 tools)', available: true },
      { label: '8 specialized templates', available: true },
    ],
  },
];

interface AgentClassSelectorProps {
  value: 'customer_assistant' | 'business_assistant' | null;
  onChange: (value: 'customer_assistant' | 'business_assistant') => void;
}

export function AgentClassSelector({ value, onChange }: AgentClassSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Agent Type</h2>
        <p className="text-muted-foreground">
          Select whether this agent will assist customers or your internal team
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {AGENT_CLASSES.map((agentClass) => (
          <Card
            key={agentClass.id}
            className={`
              group cursor-pointer transition-all hover:shadow-lg relative overflow-hidden
              ${value === agentClass.id ? 'border-primary border-2 shadow-md' : 'border-2 border-transparent hover:border-gray-300'}
            `}
            onClick={() => onChange(agentClass.id)}
          >
            {/* Selection indicator */}
            {value === agentClass.id && (
              <div className="absolute top-4 right-4 bg-primary text-white rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            )}

            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-4xl">{agentClass.icon}</div>
                <div className="flex-1">
                  <CardTitle className="text-xl">{agentClass.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {agentClass.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Use Cases */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Perfect for:</h4>
                <ul className="space-y-1">
                  {agentClass.useCases.map((useCase, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Features:</h4>
                <div className="flex flex-wrap gap-2">
                  {agentClass.features.map((feature, idx) => (
                    <Badge
                      key={idx}
                      variant={feature.available ? "default" : "secondary"}
                      className={`text-xs ${!feature.available ? 'opacity-50' : ''}`}
                    >
                      {feature.available ? '✓' : '×'} {feature.label}
                    </Badge>
                  ))}
                </div>
              </div

>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help text */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Not sure?</strong> Start with Customer Assistant for website support, or Business Assistant for internal productivity.
        </p>
      </div>
    </div>
  );
}
