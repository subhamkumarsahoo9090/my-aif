export function canonicalIdentifier(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    const email = trimmed.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return { kind: "email" as const, value: email };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return { kind: "mobile" as const, value: digits.slice(-10) };
}

export function identifierMatches(
  profile: { email: string; mobile: string },
  input: string,
) {
  const canonical = canonicalIdentifier(input);
  if (!canonical) return false;
  if (canonical.kind === "email") {
    return canonical.value === profile.email.toLowerCase();
  }
  return canonical.value === profile.mobile;
}
