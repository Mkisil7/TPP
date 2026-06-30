import {
  emptyAssessment,
  emptyFollowUp,
  emptyProperty,
  type Assessment,
  type FollowUp,
  type JobData,
  type JobRecord,
  type PropertySnapshot,
} from "./types";

// jsonb columns can hold partial/legacy data — deep-merge into full shapes so
// the forms never crash on a missing nested field.

export function normalizeAssessment(a?: Partial<Assessment> | null): Assessment {
  const base = emptyAssessment();
  if (!a) return base;
  return {
    ...base,
    ...a,
    security: {
      ...base.security,
      ...(a.security ?? {}),
      vuln: { ...base.security.vuln, ...(a.security?.vuln ?? {}) },
    },
    lifeSafety: {
      ...base.lifeSafety,
      ...(a.lifeSafety ?? {}),
      vuln: { ...base.lifeSafety.vuln, ...(a.lifeSafety?.vuln ?? {}) },
    },
    exterior: { ...base.exterior, ...(a.exterior ?? {}) },
    rooms: Array.isArray(a.rooms) ? a.rooms : base.rooms,
  };
}

export function normalizeProperty(p?: Partial<PropertySnapshot> | null): PropertySnapshot {
  return { ...emptyProperty(), ...(p ?? {}) };
}

export function normalizeFollowUp(f?: Partial<FollowUp> | null): FollowUp {
  return { ...emptyFollowUp(), ...(f ?? {}) };
}

export function normalizeJob(job: JobRecord): JobData {
  return {
    assessment: normalizeAssessment(job.assessment),
    property: normalizeProperty(job.property),
    followup: normalizeFollowUp(job.followup),
  };
}
