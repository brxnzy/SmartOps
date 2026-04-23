export function getRemaining(limit: number | null | undefined, current: number): number | null {
  if (limit === null || limit === undefined) return null;
  return Math.max(0, limit - Math.max(0, current));
}

export function formatRemaining(resourceLabel: string, remaining: number | null): string {
  if (remaining === null) {
    return `Tienes ${resourceLabel} ilimitados en tu plan.`;
  }

  if (remaining === 1) {
    return `Te queda 1 ${resourceLabel} por crear.`;
  }

  return `Te quedan ${remaining} ${resourceLabel} por crear.`;
}

