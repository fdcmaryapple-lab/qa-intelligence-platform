import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" strokeWidth={2.5} />
          <span className="font-display text-base font-semibold tracking-tight">
            QA Intelligence
          </span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {children}
            <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
