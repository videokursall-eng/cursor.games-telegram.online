import { backupDatabase, restoreDatabase } from "../src/infrastructure/db/backup";
import { execFile } from "child_process";

jest.mock("child_process", () => {
  const original = jest.requireActual("child_process");
  return {
    ...original,
    execFile: jest.fn(),
  };
});

describe("backup/restore helpers", () => {
  const execMock = execFile as unknown as jest.Mock;

  beforeEach(() => {
    execMock.mockReset();
  });

  it("calls pg_dump with correct args", async () => {
    execMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(null, "-- SQL DUMP --");
      return {} as any;
    });

    const fs = require("fs");
    const path = "./dump.sql";
    fs.writeFileSync(path, "", "utf8");

    await backupDatabase("durak", "durak", path);

    expect(execMock).toHaveBeenCalledWith(
      "pg_dump",
      ["-U", "durak", "durak"],
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("calls psql with correct args on restore", async () => {
    execMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb(null);
      return { stdin: { write: () => {}, end: () => {} } } as any;
    });

    const fs = require("fs");
    const path = "./dump_restore.sql";
    fs.writeFileSync(path, "-- SQL DUMP --", "utf8");

    await restoreDatabase("durak", "durak", path);

    expect(execMock).toHaveBeenCalledWith(
      "psql",
      ["-U", "durak", "durak"],
      expect.any(Object),
      expect.any(Function),
    );
  });
});

