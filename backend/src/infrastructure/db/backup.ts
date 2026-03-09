import { execFile } from "child_process";

export function backupDatabase(
  dbName: string,
  dbUser: string,
  filePath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ["-U", dbUser, dbName];
    execFile("pg_dump", args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const fs = require("fs");
      fs.writeFileSync(filePath, stdout);
      resolve();
    });
  });
}

export function restoreDatabase(
  dbName: string,
  dbUser: string,
  filePath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fs = require("fs");
    const data: string = fs.readFileSync(filePath, "utf8");
    const child = execFile(
      "psql",
      ["-U", dbUser, dbName],
      { maxBuffer: 10 * 1024 * 1024 },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      },
    );
    if (child.stdin) {
      child.stdin.write(data);
      child.stdin.end();
    }
  });
}

