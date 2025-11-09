"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Copy, Check, ExternalLink, Code2 } from "lucide-react";
import Link from "next/link";

interface WidgetSettingsProps {
  agent: {
    id: string;
    name: string;
  };
}

export function WidgetSettings({ agent }: WidgetSettingsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#FF7A59");
  const [position, setPosition] = useState("bottom-right");

  // Get the API URL based on environment
  const apiUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NODE_ENV === "production"
    ? "https://zapta-nu.vercel.app"
    : "http://localhost:3000";

  // Generate embed code
  const embedCode = `<!-- Zapta Chat Widget -->
<script>
  window.ZAPTA_AGENT_ID = '${agent.id}';
  window.ZAPTA_API_URL = '${apiUrl}';
  window.ZAPTA_PRIMARY_COLOR = '${primaryColor}';
  window.ZAPTA_POSITION = '${position}';
</script>
<script src="${apiUrl}/zapta-widget.js"></script>`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="mb-4"
          >
            <Link href={`/agents/${agent.id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agent
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Widget Settings</h1>
          <p className="text-muted-foreground mt-2">
            Embed {agent.name} on your website
          </p>
        </div>

        {/* Widget Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Customization</CardTitle>
            <CardDescription>
              Customize the appearance of your chat widget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Agent ID (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="agent-id">Agent ID</Label>
              <Input
                id="agent-id"
                value={agent.id}
                readOnly
                className="bg-muted font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This ID uniquely identifies your agent
              </p>
            </div>

            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 font-mono"
                  placeholder="#FF7A59"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Choose the main color for the chat widget
              </p>
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position">Widget Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Where the chat bubble appears on the page
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Embed Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Embed Code
            </CardTitle>
            <CardDescription>
              Copy and paste this code before the closing &lt;/body&gt; tag on your website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{embedCode}</code>
              </pre>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCopyCode}
                className="absolute top-2 right-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertDescription>
                <strong>Installation:</strong> Add the embed code to your website's HTML,
                just before the closing <code>&lt;/body&gt;</code> tag. The chat widget
                will automatically appear on your site.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Preview & Test */}
        <Card>
          <CardHeader>
            <CardTitle>Test Your Widget</CardTitle>
            <CardDescription>
              See how the widget looks before embedding it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link
                href={`/widget-demo.html?agentId=${agent.id}&color=${encodeURIComponent(primaryColor)}&position=${position}`}
                target="_blank"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Demo Page
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              The demo page will open in a new tab with your agent's configuration.
              Try chatting to see how visitors will experience your agent.
            </p>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Automatic conversation history saved in browser</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Mobile-responsive design</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Customizable colors and position</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Typing indicators for better UX</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Lightweight and fast loading</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
