import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as projectService from "@/server/services/project-service";
import * as aiAssistantService from "@/server/services/ai-assistant-service";
import { ChatPanel } from "@/features/ai-assistant/components/chat-panel";
import { NotFoundError } from "@/lib/errors";

export const metadata: Metadata = { title: "AI Assistant — QA Intelligence Platform" };

export default async function AiAssistantPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const userId = await getCurrentUserId();

  let project;
  try {
    project = await projectService.getProject(userId, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  if (!project) {
    notFound();
  }

  const messages = await aiAssistantService.listMessages(userId, projectId);

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {project.name}
      </Link>

      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">AI Assistant</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Grounded in this project&apos;s real data — bug counts, test coverage, and risk scores.
        </p>
      </div>

      <ChatPanel
        projectId={projectId}
        initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
      />
    </div>
  );
}
