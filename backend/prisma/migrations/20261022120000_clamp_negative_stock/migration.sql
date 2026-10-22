-- Legacy sales could drive stock below zero before stock validation existed.
-- Clamp those rows to zero. Product create/update and sales now reject
-- negative stock, so new data cannot fall below zero again.
UPDATE "Product" SET "stockQty" = 0 WHERE "stockQty" < 0;
