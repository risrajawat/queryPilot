export const seedData = {
  categories: [
    { id: 1, name: 'Electronics', slug: 'electronics' },
    { id: 2, name: 'Home & Kitchen', slug: 'home-kitchen' },
    { id: 3, name: 'Outdoor', slug: 'outdoor' },
  ],
  customers: [
    { id: 1, email: 'maya.chen@example.com', first_name: 'Maya', last_name: 'Chen', phone: '415-555-0101', city: 'San Francisco' },
    { id: 2, email: 'jordan.rivera@example.com', first_name: 'Jordan', last_name: 'Rivera', phone: '512-555-0102', city: 'Austin' },
    { id: 3, email: 'sam.taylor@example.com', first_name: 'Sam', last_name: 'Taylor', phone: '312-555-0103', city: 'Chicago' },
    { id: 4, email: 'olivia.wilson@example.com', first_name: 'Olivia', last_name: 'Wilson', phone: '206-555-0104', city: 'Seattle' },
  ],
  products: [
    { id: 1, category_id: 1, sku: 'AUDIO-100', name: 'Wireless Headphones', description: 'Noise-cancelling over-ear headphones', price_cents: 12999, stock_quantity: 42 },
    { id: 2, category_id: 1, sku: 'TECH-210', name: 'USB-C Hub', description: 'Seven-port aluminum USB-C hub', price_cents: 4999, stock_quantity: 85 },
    { id: 3, category_id: 2, sku: 'HOME-310', name: 'Ceramic Pour-Over Set', description: 'Dripper, carafe, and two cups', price_cents: 3899, stock_quantity: 27 },
    { id: 4, category_id: 2, sku: 'HOME-410', name: 'Linen Throw Blanket', description: 'Lightweight 100% linen blanket', price_cents: 7999, stock_quantity: 18 },
    { id: 5, category_id: 3, sku: 'CAMP-510', name: 'Insulated Daypack', description: 'Twenty-liter water-resistant daypack', price_cents: 8999, stock_quantity: 31 },
    { id: 6, category_id: 3, sku: 'CAMP-610', name: 'Compact Camping Lantern', description: 'Rechargeable LED lantern', price_cents: 3299, stock_quantity: 64 },
  ],
  orders: [
    { id: 1001, customer_id: 1, status: 'delivered', subtotal_cents: 17998, tax_cents: 1620, shipping_cents: 0, total_cents: 19618, ordered_at: '2025-01-08T14:22:00Z', shipped_at: '2025-01-10T09:00:00Z' },
    { id: 1002, customer_id: 2, status: 'shipped', subtotal_cents: 12898, tax_cents: 1032, shipping_cents: 599, total_cents: 14529, ordered_at: '2025-01-16T18:05:00Z', shipped_at: '2025-01-18T11:30:00Z' },
    { id: 1003, customer_id: 3, status: 'paid', subtotal_cents: 7999, tax_cents: 800, shipping_cents: 0, total_cents: 8799, ordered_at: '2025-01-21T10:10:00Z', shipped_at: null },
    { id: 1004, customer_id: 1, status: 'cancelled', subtotal_cents: 3299, tax_cents: 297, shipping_cents: 599, total_cents: 4195, ordered_at: '2025-01-24T16:40:00Z', shipped_at: null },
    { id: 1005, customer_id: 4, status: 'processing', subtotal_cents: 17998, tax_cents: 1620, shipping_cents: 0, total_cents: 19618, ordered_at: '2025-01-27T08:15:00Z', shipped_at: null },
  ],
  order_items: [
    { id: 1, order_id: 1001, product_id: 1, quantity: 1, unit_price_cents: 12999 },
    { id: 2, order_id: 1001, product_id: 2, quantity: 1, unit_price_cents: 4999 },
    { id: 3, order_id: 1002, product_id: 3, quantity: 1, unit_price_cents: 3899 },
    { id: 4, order_id: 1002, product_id: 5, quantity: 1, unit_price_cents: 8999 },
    { id: 5, order_id: 1003, product_id: 4, quantity: 1, unit_price_cents: 7999 },
    { id: 6, order_id: 1004, product_id: 6, quantity: 1, unit_price_cents: 3299 },
    { id: 7, order_id: 1005, product_id: 5, quantity: 2, unit_price_cents: 8999 },
  ],
  payments: [
    { id: 1, order_id: 1001, provider: 'stripe', provider_reference: 'pi_demo_1001', amount_cents: 19617, status: 'captured', paid_at: '2025-01-08T14:23:00Z' },
    { id: 2, order_id: 1002, provider: 'stripe', provider_reference: 'pi_demo_1002', amount_cents: 14529, status: 'captured', paid_at: '2025-01-16T18:06:00Z' },
    { id: 3, order_id: 1003, provider: 'stripe', provider_reference: 'pi_demo_1003', amount_cents: 8799, status: 'captured', paid_at: '2025-01-21T10:11:00Z' },
    { id: 4, order_id: 1004, provider: 'stripe', provider_reference: 'pi_demo_1004', amount_cents: 4195, status: 'refunded', paid_at: '2025-01-24T16:41:00Z' },
    { id: 5, order_id: 1005, provider: 'stripe', provider_reference: 'pi_demo_1005', amount_cents: 19618, status: 'authorized', paid_at: null },
  ],
};
