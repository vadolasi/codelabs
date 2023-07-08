/*
  Warnings:

  - Added the required column `owner` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner" TEXT NOT NULL
);
INSERT INTO "new_Room" ("id") SELECT "id" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
