const PAN_SOLICIT = "https://cms.ezwealth.in/api/kyc/pan-solicit";

export function kraDob(value: string) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (local) return value.trim();
  return "";
}

export function kraVerifiedFromPayload(data: unknown) {
  return complianceFromPayload(data)?.kra ?? null;
}

export function complianceFromPayload(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const body = data as { success?: unknown; kyc?: { APP_STATUS?: unknown; APP_FATCA_APPLICABLE_FLAG?: unknown } };
  if (body.success !== true || !body.kyc || typeof body.kyc !== "object") return null;
  const flag = body.kyc.APP_FATCA_APPLICABLE_FLAG;
  return {
    kra: String(body.kyc.APP_STATUS ?? "") === "07",
    fatca: flag != null && String(flag).trim() !== "",
  };
}

export async function kraStatus(pan: string, dob: string) {
  const cleanPan = pan.trim().toUpperCase();
  const cleanDob = kraDob(dob);
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanPan) || !cleanDob) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(PAN_SOLICIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pan: cleanPan, dob: cleanDob }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return complianceFromPayload(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
