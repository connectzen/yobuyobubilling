import { getOperator } from "@/lib/auth";
import { sql, type Router } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { deleteOwnedRouter } from "@/lib/routers/delete";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const operator = await getOperator();
  if (!operator) {
    return fail("Unauthorized", 401);
  }

  const db = sql();
  const result = await deleteOwnedRouter(
    {
      find: async (id, operatorId) => {
        const rows = await db<Pick<Router, "id">[]>`
          select id from routers
          where id = ${id} and operator_id = ${operatorId}
          limit 1
        `;
        return rows[0];
      },
      unlinkPayments: async (id) => {
        await db`
          update payments
          set router_id = null,
              subscriber_id = null
          where router_id = ${id}
             or subscriber_id in (select id from subscribers where router_id = ${id})
        `;
      },
      unlinkVoucherSubscribers: async (id) => {
        await db`
          update vouchers
          set subscriber_id = null
          where router_id = ${id}
        `;
      },
      deleteRouter: async (id, operatorId) => {
        await db`
          delete from routers
          where id = ${id} and operator_id = ${operatorId}
        `;
      },
    },
    { id: params.id, operatorId: operator.id },
  );

  if (!result.ok) {
    return fail(result.error, result.status);
  }
  return ok({ deleted: true });
}
