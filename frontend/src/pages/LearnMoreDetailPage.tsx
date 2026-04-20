import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { learnMoreBySlug } from "@/lib/learnMore";

const LearnMoreDetailPage = () => {
  const { topic } = useParams<{ topic: string }>();
  const details = topic ? learnMoreBySlug[topic] : undefined;

  if (!details) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-lg border-border">
          <CardHeader>
            <CardTitle>Guide not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The requested Learn More section does not exist.
            </p>
            <Button asChild>
              <Link to="/learn-more">Back to Learn More</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/learn-more" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Learn More
            </Link>
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {details.title}
          </h1>
          <p className="text-muted-foreground mb-8">{details.summary}</p>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>How to Use It</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  {details.howToUse.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>How to Get Best Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  {details.bestResults.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearnMoreDetailPage;
