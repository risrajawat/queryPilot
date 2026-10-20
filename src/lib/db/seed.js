// A small, dependency-free deterministic data generator. Keeping the generator
// pure makes the fixture useful both for the app and for repeatable tests.
function createPrng(seed = 0x7a17c0de) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const categoryNames = [
  ['Tech & Audio', 'tech-audio'], ['Home & Kitchen', 'home-kitchen'], ['Outdoor & Travel', 'outdoor-travel'],
  ['Apparel', 'apparel'], ['Beauty & Wellness', 'beauty-wellness'], ['Office', 'office'],
  ['Books & Media', 'books-media'], ['Kids & Family', 'kids-family'], ['Pet Supplies', 'pet-supplies'],
];
const firstNames = ['Avery', 'Blair', 'Cameron', 'Devon', 'Emery', 'Finley', 'Greer', 'Harper', 'Indigo', 'Jules', 'Kai', 'Lane', 'Morgan', 'Nico', 'Oakley', 'Parker', 'Quinn', 'Reese', 'Sage', 'Tatum'];
const lastNames = ['Alden', 'Bennett', 'Carter', 'Dawson', 'Ellis', 'Foster', 'Griffin', 'Hayes', 'Irwin', 'Jensen', 'Kim', 'Lennox', 'Monroe', 'Nolan', 'Ortega', 'Patel', 'Quincy', 'Rowan', 'Sawyer', 'Turner'];
const locations = [
  ['Portland', 'US'], ['Toronto', 'CA'], ['Dublin', 'IE'], ['Bristol', 'GB'], ['Bengaluru', 'IN'],
  ['Melbourne', 'AU'], ['Berlin', 'DE'], ['Osaka', 'JP'], ['Mexico City', 'MX'], ['Cape Town', 'ZA'],
];
const productAdjectives = ['Aurora', 'Cedar', 'Orbit', 'Lumen', 'Meadow', 'Nimbus', 'Quartz', 'Solstice', 'Willow', 'Cobalt', 'Mosaic', 'Ember'];
const productTypes = ['Desk Speaker', 'Travel Mug', 'Trail Pack', 'Everyday Hoodie', 'Daily Journal', 'Soft Throw', 'Field Lantern', 'Cloud Pillow', 'Studio Lamp'];
const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

function isoDate(orderNumber, random) {
  const day = 1 + Math.floor(random() * 26);
  const month = 1 + (orderNumber % 15); // Jan 2025 through Mar 2026
  const year = 2025 + Math.floor((month - 1) / 12);
  const monthInYear = ((month - 1) % 12) + 1;
  return `${year}-${String(monthInYear).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(8 + Math.floor(random() * 12)).padStart(2, '0')}:${String(Math.floor(random() * 60)).padStart(2, '0')}:00Z`;
}

export function createSeedData() {
  const random = createPrng();
  const categories = categoryNames.map(([name, slug], index) => ({ id: index + 1, name, slug }));
  const customers = Array.from({ length: 60 }, (_, index) => {
    const location = locations[index % locations.length];
    return {
      id: index + 1,
      email: `shopper${String(index + 1).padStart(2, '0')}@example.test`,
      first_name: firstNames[index % firstNames.length],
      last_name: lastNames[Math.floor(index / firstNames.length) % lastNames.length],
      phone: `+1-202-555-${String(1000 + index).slice(-4)}`,
      city: location[0], country: location[1],
    };
  });
  const products = Array.from({ length: 36 }, (_, index) => {
    const categoryId = (index % categories.length) + 1;
    const price = 1299 + ((index * 1873) % 18500);
    return {
      id: index + 1, category_id: categoryId, sku: `SYN-${String(index + 1).padStart(3, '0')}`,
      name: `${productAdjectives[index % productAdjectives.length]} ${productTypes[index % productTypes.length]}`,
      description: `Fictional ${productTypes[index % productTypes.length].toLowerCase()} for the sample catalog`,
      price_cents: price, stock_quantity: 20 + ((index * 29) % 180),
    };
  });

  const orders = [];
  const order_items = [];
  const payments = [];
  let itemId = 1;
  for (let offset = 0; offset < 300; offset += 1) {
    const orderId = 1001 + offset;
    // Deliberately shape the rankings: customer 1 has high-value purchases,
    // customer 2 has the most orders, and customer 3 bought most recently.
    const customerId = offset < 8 ? 1 : offset < 33 ? 2 : offset === 299 ? 3 : 4 + ((offset * 17) % 53);
    const orderedAt = offset === 299 ? '2026-03-28T18:20:00Z' : isoDate(offset, random);
    const status = offset === 299 || customerId === 1 || customerId === 2
      ? 'delivered'
      : statuses[offset % statuses.length];
    const itemCount = 2 + (offset % 3);
    const chosen = new Set();
    const items = [];
    while (items.length < itemCount) {
      const productId = customerId === 1 ? 28 + items.length : 1 + Math.floor(random() * products.length);
      if (chosen.has(productId)) continue;
      chosen.add(productId);
      const product = products[productId - 1];
      const quantity = customerId === 1 ? 18 + (offset % 4) : customerId === 2 ? 1 : 1 + Math.floor(random() * 2);
      items.push({ id: itemId++, order_id: orderId, product_id: productId, quantity, unit_price_cents: product.price_cents });
    }
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0);
    const tax = Math.floor(subtotal * ((offset % 4) + 5) / 100);
    const shipping = offset % 5 === 0 ? 0 : 599;
    const total = subtotal + tax + shipping;
    orders.push({ id: orderId, customer_id: customerId, status, subtotal_cents: subtotal, tax_cents: tax, shipping_cents: shipping, total_cents: total, ordered_at: orderedAt, shipped_at: ['shipped', 'delivered'].includes(status) ? orderedAt : null });
    order_items.push(...items);
    payments.push({ id: offset + 1, order_id: orderId, provider: offset % 3 === 0 ? 'stripe' : 'adyen', provider_reference: `pay_synthetic_${orderId}`, amount_cents: total, status: status === 'cancelled' ? 'refunded' : status === 'pending' ? 'pending' : status === 'paid' ? 'captured' : 'authorized', paid_at: status === 'pending' ? null : orderedAt });
  }
  return { categories, customers, products, orders, order_items, payments };
}

export const seedData = createSeedData();
