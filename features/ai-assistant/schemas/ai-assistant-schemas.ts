import { z } from "zod";

export const sendChatMessageSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1, "Message is required").max(4000),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
