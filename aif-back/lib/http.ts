export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function asRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function jsonError(message: string, status: number) {
  return Response.json({ message }, { status });
}
