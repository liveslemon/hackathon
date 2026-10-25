import { Button, Typography, Container } from "@/components/ui";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-fg flex items-center justify-center p-6 text-center">
      <Container maxWidth="md">
        <div className="bg-surface rounded-3xl p-8 md:p-12 shadow-2xl border border-border">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-brand-subtle rounded-3xl flex items-center justify-center text-brand mx-auto mb-6 shadow-sm">
            <Compass className="w-10 h-10 md:w-12 md:h-12 animate-pulse" />
          </div>

          <Typography
            variant="h1"
            weight="extrabold"
            className="mb-2 tracking-tight text-brand"
          >
            404
          </Typography>

          <Typography variant="h3" weight="bold" className="mb-3">
            Page Not Found
          </Typography>

          <Typography
            variant="body1"
            color="muted"
            className="mb-8 max-w-md mx-auto leading-relaxed"
          >
            The link you clicked may be broken, or the page may have been removed or relocated.
          </Typography>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              href="/"
              variant="solid"
              colorType="primary"
              className="w-full sm:w-auto h-12 px-6 rounded-2xl"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Back to Home
            </Button>
            <Button
              href="/dashboard"
              variant="outline"
              className="w-full sm:w-auto h-12 px-6 rounded-2xl"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
