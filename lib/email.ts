const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeOperatorEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return null;
  }
  return email;
}
