import { CreateRoomRequest, AddBotsRequest } from "../src/modules/contracts/api.contracts";

describe("Room contracts", () => {
  it("CreateRoomRequest accepts botCount and maxPlayers 2..6", () => {
    const ok = CreateRoomRequest.safeParse({
      variant: "classic",
      maxPlayers: 6,
      isPrivate: true,
      botCount: 5,
    });
    expect(ok.success).toBe(true);
  });

  it("CreateRoomRequest rejects invalid botCount", () => {
    const bad = CreateRoomRequest.safeParse({
      variant: "classic",
      maxPlayers: 4,
      isPrivate: false,
      botCount: 6,
    });
    expect(bad.success).toBe(false);
  });

  it("AddBotsRequest only allows 1..3 bots at a time", () => {
    const ok = AddBotsRequest.safeParse({ roomId: "00000000-0000-0000-0000-000000000000", count: 3 });
    expect(ok.success).toBe(true);

    const bad = AddBotsRequest.safeParse({ roomId: "00000000-0000-0000-0000-000000000000", count: 4 });
    expect(bad.success).toBe(false);
  });
});

