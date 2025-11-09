"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FieldConfig {
  enabled: boolean;
  required: boolean;
}

interface LeadCollectionConfig {
  enabled: boolean;
  fields: {
    name?: FieldConfig;
    email?: FieldConfig;
    phone?: FieldConfig;
    company?: FieldConfig;
  };
  welcomeMessage?: string;
  submitButtonText?: string;
}

interface LeadCollectionSettingsProps {
  config: LeadCollectionConfig;
  onChange: (config: LeadCollectionConfig) => void;
}

export function LeadCollectionSettings({ config, onChange }: LeadCollectionSettingsProps) {
  const updateField = (field: keyof LeadCollectionConfig['fields'], key: 'enabled' | 'required', value: boolean) => {
    onChange({
      ...config,
      fields: {
        ...config.fields,
        [field]: {
          ...(config.fields[field] || { enabled: false, required: false }),
          [key]: value,
        },
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Checkbox
            id="lead-collection-enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => onChange({ ...config, enabled: !!checked })}
          />
          <div className="flex-1">
            <CardTitle className="text-lg">Collect Visitor Information</CardTitle>
            <CardDescription>
              Capture contact details before visitors start chatting
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {config.enabled && (
        <CardContent className="space-y-6">
          {/* Field Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Fields to Collect</Label>

            {/* Name Field */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="field-name"
                  checked={config.fields.name?.enabled || false}
                  onCheckedChange={(checked) => updateField('name', 'enabled', !!checked)}
                />
                <div>
                  <Label htmlFor="field-name" className="font-medium cursor-pointer">
                    Name
                  </Label>
                  <p className="text-xs text-muted-foreground">Visitor's full name</p>
                </div>
              </div>
              {config.fields.name?.enabled && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="field-name-required"
                    checked={config.fields.name?.required || false}
                    onCheckedChange={(checked) => updateField('name', 'required', !!checked)}
                  />
                  <Label htmlFor="field-name-required" className="text-sm cursor-pointer">
                    Required
                  </Label>
                </div>
              )}
            </div>

            {/* Email Field */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="field-email"
                  checked={config.fields.email?.enabled || false}
                  onCheckedChange={(checked) => updateField('email', 'enabled', !!checked)}
                />
                <div>
                  <Label htmlFor="field-email" className="font-medium cursor-pointer">
                    Email
                  </Label>
                  <p className="text-xs text-muted-foreground">Visitor's email address</p>
                </div>
              </div>
              {config.fields.email?.enabled && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="field-email-required"
                    checked={config.fields.email?.required || false}
                    onCheckedChange={(checked) => updateField('email', 'required', !!checked)}
                  />
                  <Label htmlFor="field-email-required" className="text-sm cursor-pointer">
                    Required
                  </Label>
                </div>
              )}
            </div>

            {/* Phone Field */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="field-phone"
                  checked={config.fields.phone?.enabled || false}
                  onCheckedChange={(checked) => updateField('phone', 'enabled', !!checked)}
                />
                <div>
                  <Label htmlFor="field-phone" className="font-medium cursor-pointer">
                    Phone
                  </Label>
                  <p className="text-xs text-muted-foreground">Visitor's phone number</p>
                </div>
              </div>
              {config.fields.phone?.enabled && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="field-phone-required"
                    checked={config.fields.phone?.required || false}
                    onCheckedChange={(checked) => updateField('phone', 'required', !!checked)}
                  />
                  <Label htmlFor="field-phone-required" className="text-sm cursor-pointer">
                    Required
                  </Label>
                </div>
              )}
            </div>

            {/* Company Field */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="field-company"
                  checked={config.fields.company?.enabled || false}
                  onCheckedChange={(checked) => updateField('company', 'enabled', !!checked)}
                />
                <div>
                  <Label htmlFor="field-company" className="font-medium cursor-pointer">
                    Company
                  </Label>
                  <p className="text-xs text-muted-foreground">Visitor's company name</p>
                </div>
              </div>
              {config.fields.company?.enabled && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="field-company-required"
                    checked={config.fields.company?.required || false}
                    onCheckedChange={(checked) => updateField('company', 'required', !!checked)}
                  />
                  <Label htmlFor="field-company-required" className="text-sm cursor-pointer">
                    Required
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Customization */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Customization</Label>

            <div className="space-y-2">
              <Label htmlFor="welcome-message">Welcome Message</Label>
              <Textarea
                id="welcome-message"
                placeholder="Let us know how to reach you"
                rows={2}
                value={config.welcomeMessage || ""}
                onChange={(e) => onChange({ ...config, welcomeMessage: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Message shown above the form
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submit-button">Submit Button Text</Label>
              <Input
                id="submit-button"
                placeholder="Start Chat"
                value={config.submitButtonText || ""}
                onChange={(e) => onChange({ ...config, submitButtonText: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
