-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "bpm" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "coverImagePath" TEXT,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Track" ("album", "artist", "bpm", "coverImagePath", "createdAt", "durationMs", "fileName", "filePath", "id", "title", "updatedAt") SELECT "album", "artist", "bpm", "coverImagePath", "createdAt", "durationMs", "fileName", "filePath", "id", "title", "updatedAt" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE INDEX "Track_title_idx" ON "Track"("title");
CREATE INDEX "Track_artist_idx" ON "Track"("artist");
CREATE UNIQUE INDEX "Track_filePath_key" ON "Track"("filePath");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
