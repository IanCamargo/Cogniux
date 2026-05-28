import { describe, expect, it } from "vitest";
import { getFirestoreErrorMessage, stripUndefined } from "@/lib/firestorePayload";

describe("stripUndefined", () => {
  it("removes undefined top-level and nested fields", () => {
    expect(
      stripUndefined({
        a: 1,
        b: undefined,
        nested: { c: "x", d: undefined },
        list: [{ e: 1, f: undefined }],
      })
    ).toEqual({
      a: 1,
      nested: { c: "x" },
      list: [{ e: 1 }],
    });
  });
});

describe("getFirestoreErrorMessage", () => {
  it("includes firebase code when present", () => {
    const err = new Error("permission denied") as Error & { code: string };
    err.code = "permission-denied";
    expect(getFirestoreErrorMessage(err)).toBe("permission-denied: permission denied");
    expect(getFirestoreErrorMessage(err, "projeto-c1883")).toContain("deploy:firestore-rules");
  });
});
