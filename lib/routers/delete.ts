export type RouterDeleteDb = {
  find: (id: string, operatorId: string) => Promise<{ id: string } | undefined>;
  unlinkPayments: (id: string) => Promise<void>;
  unlinkVoucherSubscribers: (id: string) => Promise<void>;
  deleteRouter: (id: string, operatorId: string) => Promise<void>;
};

export type RouterDeleteResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function routerDeleteConfirm(name: string): string {
  return `Delete ${name}? This removes the provision token, queued commands, and customers on this box. Payment records stay. The MikroTik itself is not factory-reset.`;
}

export async function deleteOwnedRouter(
  db: RouterDeleteDb,
  input: { id: string; operatorId: string },
): Promise<RouterDeleteResult> {
  const router = await db.find(input.id, input.operatorId);
  if (!router) {
    return { ok: false, status: 404, error: "Router not found" };
  }
  await db.unlinkPayments(router.id);
  await db.unlinkVoucherSubscribers(router.id);
  await db.deleteRouter(router.id, input.operatorId);
  return { ok: true };
}

export type DeleteApiResult = { ok: true } | { ok: false; message: string };

export function readDeleteApiResult(status: number, bodyText: string): DeleteApiResult {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return { ok: false, message: `Could not delete router (HTTP ${status})` };
  }
  try {
    const payload = JSON.parse(trimmed) as { success?: boolean; error?: string | null };
    if (payload.success) {
      return { ok: true };
    }
    return { ok: false, message: payload.error || "Could not delete router" };
  } catch {
    return { ok: false, message: `Could not delete router (HTTP ${status})` };
  }
}
