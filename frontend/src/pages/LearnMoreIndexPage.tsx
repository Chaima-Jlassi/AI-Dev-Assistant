import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";
import { learnMoreTopics } from "@/lib/learnMore";

const LearnMoreIndexPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Learn More
            </h1>
            <p className="mt-4 text-muted-foreground">
              Explore each DevAssist capability in detail and learn how to get
              the best output quality.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {learnMoreTopics.map((topic) => (
              <Card key={topic.slug} className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm font-medium">Guide</span>
                  </div>
                  <CardTitle>{topic.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {topic.summary}
                  </p>
                  <Button asChild variant="outline">
                    <Link
                      to={`/learn-more/${topic.slug}`}
                      className="flex items-center gap-2"
                    >
                      Open Guide <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearnMoreIndexPage;
