-- AlterTable
ALTER TABLE "RepairJob" ADD COLUMN "deliveredAt" DATETIME;

-- Backfill delivery timestamps for jobs that are already delivered
UPDATE "RepairJob" SET "deliveredAt" = "updatedAt" WHERE "status" = 'delivered';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "refundedAt" DATETIME;

-- Backfill refund timestamps for sales that were already refunded
UPDATE "Sale" SET "refundedAt" = "createdAt" WHERE "status" = 'refunded';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchaseId" INTEGER NOT NULL,
    "productId" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "total" REAL NOT NULL,
    CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseItem" ("description", "id", "purchaseId", "quantity", "total", "unitPrice") SELECT "description", "id", "purchaseId", "quantity", "total", "unitPrice" FROM "PurchaseItem";
DROP TABLE "PurchaseItem";
ALTER TABLE "new_PurchaseItem" RENAME TO "PurchaseItem";
CREATE TABLE "new_UdharRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "saleId" INTEGER,
    "totalAmount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "remainingAmount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UdharRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UdharRecord_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UdharRecord" ("createdAt", "customerId", "description", "dueDate", "id", "paidAmount", "remainingAmount", "status", "totalAmount", "updatedAt") SELECT "createdAt", "customerId", "description", "dueDate", "id", "paidAmount", "remainingAmount", "status", "totalAmount", "updatedAt" FROM "UdharRecord";
DROP TABLE "UdharRecord";
ALTER TABLE "new_UdharRecord" RENAME TO "UdharRecord";
CREATE UNIQUE INDEX "UdharRecord_saleId_key" ON "UdharRecord"("saleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
