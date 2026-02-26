import { z } from 'zod';

export interface ParsedEmail {
  from: string;
  to: string;
  subject: string;
  textBody?: string;
  htmlBody?: string;
  attachmentsMetadata?: Array<{
    filename?: string;
    mimetype?: string;
    size: number;
  }>;
  headers?: Record<string, any>;
}

export const createEmailSchema = z.object({
  ttl: z.coerce.number().int().positive().optional(),
});

export type CreateEmailRequest = z.infer<typeof createEmailSchema>;
