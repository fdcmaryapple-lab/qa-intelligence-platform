"use server";

import { revalidatePath } from "next/cache";
import { parseOrThrow } from "@/lib/validation";
import { withActionErrorHandling } from "@/lib/action-response";
import { getCurrentUserId } from "@/server/auth/current-user";
import * as aiAssistantService from "@/server/services/ai-assistant-service";
import { sendChatMessageSchema } from "@/features/ai-assistant/schemas/ai-assistant-schemas";

export async function sendChatMessageAction(input: unknown) {
  return withActionErrorHandling(async () => {
    const parsed = parseOrThrow(sendChatMessageSchema, input);
    const userId = await getCurrentUserId();
    const reply = await aiAssistantService.sendMessage(userId, parsed.projectId, parsed.message);
    revalidatePath(`/dashboard/projects/${parsed.projectId}/ai-assistant`);
    return { reply };
  });
}
