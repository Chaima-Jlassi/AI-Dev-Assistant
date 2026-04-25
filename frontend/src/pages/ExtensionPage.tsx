import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Monitor,
  LayoutDashboard,
  Boxes,
  FileText,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import screenshotUml from "@/assets/screenshot-uml.jpg";
import screenshotArch from "@/assets/screenshot-architecture.jpg";
import screenshotReadme from "@/assets/screenshot-readme.jpg";

const requirements = [
  "VS Code 1.80+",
  "Node.js 18+ (for local analysis)",
  "Internet connection (for AI features)",
];

const screenshots = [
  {
    src: screenshotUml,
    title: "UML Diagram Generation",
    description:
      "Automatically generate class, sequence, and component diagrams from your codebase with a single command.",
  },
  {
    src: screenshotArch,
    title: "Architecture Recommendations",
    description:
      "Get tailored architecture suggestions — MVC, Clean Architecture, Microservices — based on your project context.",
  },
  {
    src: screenshotReadme,
    title: "README & Documentation",
    description:
      "Generate professional README files and inline code documentation instantly from your source code.",
  },
];

const steps = [
  {
    num: "1",
    title: "Install the Extension",
    desc: 'Search for "DevAssist" in the extension marketplace or download from the links above.',
  },
  {
    num: "2",
    title: "Open Your Project",
    desc: "Open your project. DevAssist will automatically detect the language and framework.",
  },
  {
    num: "3",
    title: "Run a Command",
    desc: 'Open the command palette (Ctrl+Shift+P) and type "DevAssist" to see all available actions.',
  },
  {
    num: "4",
    title: "Get Results",
    desc: "Diagrams, architecture docs, and README files are generated and inserted directly into your project.",
  },
];

const ideOptions = [
  { value: "vscode", label: "Visual Studio Code", url: "https://code.visualstudio.com/download" },
  { value: "cursor", label: "Cursor", url: "https://cursor.com/downloads" },
  { value: "jetbrains", label: "JetBrains Toolbox", url: "https://www.jetbrains.com/toolbox-app/" },
];

const ExtensionPage = () => {
  const [selectedIde, setSelectedIde] = useState(ideOptions[0].value);
  const selectedIdeOption = useMemo(
    () => ideOptions.find((option) => option.value === selectedIde) ?? ideOptions[0],
    [selectedIde],
  );

  const handleDownload = async () => {
    try {
      const response = await fetch("/ai-dev-assistant-0.0.1.vsix", {
        headers: {
          Accept: "application/octet-stream",
        },
      });

      if (!response.ok) throw new Error("Download failed");

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ai-dev-assistant-0.0.1.vsix";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            <Monitor className="h-3 w-3 mr-1" /> DevAssist Extension
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight max-w-3xl mx-auto">
            DevAssist for Developers
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Bring architecture design, UML generation, and documentation
            directly into your workflow — no context switching needed.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <select
              value={selectedIde}
              onChange={(e) => setSelectedIde(e.target.value)}
              className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              aria-label="Select IDE"
            >
              {ideOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button size="lg" onClick={handleDownload} className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download for {selectedIdeOption.label}
            </Button>
            {/* Direct .vsix download */}
            <Button size="lg" variant="outline" onClick={handleDownload} className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Télécharger l'extension VS Code
            </Button>
          </div>
        </div>
      </section>

      {/* Features summary */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">
            What the Extension Does
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Boxes,
                title: "UML Diagrams",
                desc: "Class, sequence, activity, use-case & component diagrams generated from your code.",
              },
              {
                icon: LayoutDashboard,
                title: "Architecture Design",
                desc: "Optimal architecture patterns recommended based on project analysis.",
              },
              {
                icon: FileText,
                title: "Docs & README",
                desc: "Auto-generated README, code descriptions, and inline documentation.",
              },
            ].map((f) => (
              <Card key={f.title} className="text-center bg-card border-border">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            See It in Action
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Real screenshots of DevAssist running inside the IDE.
          </p>
          <div className="space-y-16 max-w-5xl mx-auto">
            {screenshots.map((s, i) => (
              <div
                key={s.title}
                className={`flex flex-col ${
                  i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                } gap-8 items-center`}
              >
                <div className="md:w-3/5">
                  <img
                    src={s.src}
                    alt={s.title}
                    className="rounded-lg border border-border shadow-lg w-full"
                    loading="lazy"
                  />
                </div>
                <div className="md:w-2/5 space-y-3">
                  <h3 className="text-2xl font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="text-muted-foreground">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to install */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Getting Started
          </h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold mb-3">
                  {s.num}
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            System Requirements
          </h2>
          <Card className="bg-card border-border">
            <CardContent className="pt-6 space-y-3">
              {requirements.map((r) => (
                <div key={r} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{r}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Ready to code Smarter?
          </h2>
          <p className="text-muted-foreground mb-6">
            Install the extension and start Coding and Architecting with AI assistance Now!
          </p>
          <Button size="lg" onClick={handleDownload} className="flex items-center gap-2">
            Download Now <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DevAssist. Built for developers, by
          developers.
        </div>
      </footer>
    </div>
  );
};

export default ExtensionPage;