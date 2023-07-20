-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "name" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("name")
);
