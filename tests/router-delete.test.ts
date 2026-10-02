import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deleteOwnedRouter,
  readDeleteApiResult,
  routerDeleteConfirm,
} from "../lib/routers/delete.ts";

describe("router delete", () => {
  it("hides a missing or foreign router as not found", async () => {
    let unlinked = false;
    const result = await deleteOwnedRouter(
      {
        find: async () => undefined,
        unlinkPayments: async () => {
          unlinked = true;
        },
        unlinkVoucherSubscribers: async () => {
          unlinked = true;
        },
        deleteRouter: async () => {
          unlinked = true;
        },
      },
      { id: "r1", operatorId: "op1" },
    );

    assert.equal(unlinked, false);
    assert.deepEqual(result, {
      ok: false,
      status: 404,
      error: "Router not found",
    });
  });

  it("unlinks billing rows then deletes the router", async () => {
    const order: string[] = [];
    const result = await deleteOwnedRouter(
      {
        find: async (id, operatorId) => {
          assert.equal(id, "r1");
          assert.equal(operatorId, "op1");
          return { id };
        },
        unlinkPayments: async (id) => {
          assert.equal(id, "r1");
          order.push("payments");
        },
        unlinkVoucherSubscribers: async (id) => {
          assert.equal(id, "r1");
          order.push("vouchers");
        },
        deleteRouter: async (id, operatorId) => {
          assert.equal(id, "r1");
          assert.equal(operatorId, "op1");
          order.push("router");
        },
      },
      { id: "r1", operatorId: "op1" },
    );

    assert.deepEqual(order, ["payments", "vouchers", "router"]);
    assert.deepEqual(result, { ok: true });
  });

  it("names the router in confirm copy and keeps payment history", () => {
    assert.match(routerDeleteConfirm("manyatta"), /manyatta/);
    assert.match(routerDeleteConfirm("manyatta"), /Payment records stay/i);
  });

  it("reads delete API JSON the same way as other console actions", () => {
    assert.deepEqual(
      readDeleteApiResult(200, JSON.stringify({ success: true, data: { deleted: true }, error: null })),
      { ok: true },
    );
    assert.deepEqual(
      readDeleteApiResult(404, JSON.stringify({ success: false, data: null, error: "Router not found" })),
      { ok: false, message: "Router not found" },
    );
    assert.deepEqual(readDeleteApiResult(500, ""), {
      ok: false,
      message: "Could not delete router (HTTP 500)",
    });
  });
});
