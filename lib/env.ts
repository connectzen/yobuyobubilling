function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function getAppUrl(): string {
  const configured = (process.env.APP_URL ?? "").trim().replace(/\/$/, "");
  const onVercel = Boolean(process.env.VERCEL);
  if (configured && !(onVercel && /localhost|127\.0\.0\.1/i.test(configured))) {
    return configured;
  }
  const vercelHost = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    ""
  )
    .trim()
    .replace(/^https?:\/\//, "");
  if (vercelHost) {
    return `https://${vercelHost}`;
  }
  return configured || "http://localhost:3000";
}

export function getDatabaseUrl(): string {
  return required("DATABASE_URL");
}

export function getSessionSecret(): string {
  return required("SESSION_SECRET");
}

export function getPaystackSecret(): string {
  return required("PAYSTACK_SECRET_KEY");
}

export function getPaystackPublic(): string {
  return process.env.PAYSTACK_PUBLIC_KEY ?? "";
}
