import { z } from "zod";
import { FindingSeveritySchema, FindingStatusSchema } from "./finding.js";

export const VerificationSchema = z.object({
  id: z.string().min(1),
  status: FindingStatusSchema,
  severity: FindingSeveritySchema,
  reasons: z.array(z.string().min(1)).optional(),
  evidence: z.array(z.string().min(1)).optional(),
  verifier: z.string().min(1).optional()
});

export type Verification = z.infer<typeof VerificationSchema>;

const STATUS_ALIASES: Record<string, Verification["status"]> = {
  confirmed: "CONFIRMED",
  rejected: "REJECTED_FALSE_POSITIVE",
  rejected_false_positive: "REJECTED_FALSE_POSITIVE",
  false_positive: "REJECTED_FALSE_POSITIVE",
  needs_human_review: "NEEDS_HUMAN_REVIEW",
  human_review: "NEEDS_HUMAN_REVIEW",
  insufficient_evidence: "INSUFFICIENT_EVIDENCE",
  duplicate: "DUPLICATE",
  out_of_scope: "OUT_OF_SCOPE"
};

function normalizeStatus(value: unknown): Verification["status"] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const direct = FindingStatusSchema.safeParse(value);
  if (direct.success) {
    return direct.data;
  }

  return STATUS_ALIASES[value.trim().toLowerCase()];
}

function normalizeSeverity(
  value: unknown,
  status: Verification["status"] | undefined
): Verification["severity"] | undefined {
  if (typeof value === "string") {
    const direct = FindingSeveritySchema.safeParse(value);
    if (direct.success) {
      return direct.data;
    }

    const lowered = value.trim().toLowerCase();
    const loweredSeverity = FindingSeveritySchema.safeParse(lowered);
    if (loweredSeverity.success) {
      return loweredSeverity.data;
    }

    if (lowered === "none" && status && status !== "CONFIRMED" && status !== "NEEDS_HUMAN_REVIEW") {
      return "low";
    }
  }

  if (status && status !== "CONFIRMED" && status !== "NEEDS_HUMAN_REVIEW") {
    return "low";
  }

  return undefined;
}

export function coerceVerification(value: unknown): Verification | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : undefined;
  const status = normalizeStatus(record.status);
  const severity = normalizeSeverity(record.severity, status);

  if (!id || !status || !severity) {
    return undefined;
  }

  const parsed = VerificationSchema.safeParse({
    ...record,
    id,
    status,
    severity
  });

  return parsed.success ? parsed.data : undefined;
}

export function coerceVerificationList(value: unknown): Verification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const verification = coerceVerification(entry);
    return verification ? [verification] : [];
  });
}
