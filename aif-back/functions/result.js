export function ok(data, status = 200) {
  return { ok: true, status, data };
}

export function fail(message, status) {
  return { ok: false, status, message };
}

export async function denied(auth) {
  if (!auth.response) return null;
  const body = await auth.response.json();
  return fail(body.message || "Request denied.", auth.response.status);
}
