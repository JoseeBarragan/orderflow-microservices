-- CreateIndex
CREATE UNIQUE INDEX "stock_reservations_order_id_product_id_key" ON "stock_reservations"("order_id", "product_id");

