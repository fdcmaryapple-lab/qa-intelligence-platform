import { Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ApiRequestCard, type ApiRequestCardItem } from "@/features/api-testing/components/api-request-card";

export function ApiRequestList({ apiRequests }: { apiRequests: ApiRequestCardItem[] }) {
  if (apiRequests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Globe className="h-8 w-8 text-muted-foreground" />
          <p className="font-display text-base font-semibold">No API requests yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Save a request to start testing an API endpoint.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {apiRequests.map((apiRequest) => (
        <ApiRequestCard key={apiRequest.id} apiRequest={apiRequest} />
      ))}
    </div>
  );
}
