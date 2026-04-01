import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, FileText, MessageSquare, ArrowRight, Boxes, GitBranch, BookOpen } from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Architecture Design",
    description: "Get optimal architecture recommendations — MVC, Microservices, Clean Architecture — tailored to your project's needs.",
  },
  {
    icon: Boxes,
    title: "UML Diagrams",
    description: "Auto-generate class, sequence, use-case, activity, and component diagrams.",
  },
  {
    icon: FileText,
    title: "README & Docs",
    description: "Generate professional README files, code descriptions, and inline documentation in seconds.",
  },
  {
    icon: GitBranch,
    title: "Project Structure",
    description: "Receive directory layout suggestions, module organisation, and dependency-management best practices.",
  },
];

const steps = [
  { num: "01", title: "Describe Your Project", desc: "Provide a detailed description of what you're building." },
  { num: "02", title: "AI Analyzes", desc: "Our AI processes your requirements and generates architecture plans." },
  { num: "03", title: "Get Artifacts", desc: "Receive UML diagrams, architecture docs, and README files instantly." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight max-w-3xl mx-auto">
            Structure Your Code
            <br />
            <span className="text-primary">Before You Write It</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            DevAssist generates optimal architecture, UML diagrams, and documentation — so you can focus on building, not planning.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/agent" className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Try the AI Agent
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features" className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Learn More
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            Everything You Need to Architect Better Software
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            From high-level design to documentation, DevAssist covers the full software planning lifecycle.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="bg-card border-border hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-2">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="text-5xl font-bold text-primary/20 mb-2">{s.num}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Button size="lg" asChild>
              <Link to="/agent" className="flex items-center gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DevAssist. Built for developers, by developers.
        </div>
      </footer>
    </div>
  );
};

export default Index;