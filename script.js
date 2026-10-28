"use strict";

const KEYS = {
  customers: "gw_customers_v2",
  products: "gw_products_v2",
  sales: "gw_sales_v2"
};

const $ = id => document.getElementById(id);

function loadData(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Storage read failed:", error);
    return [];
  }
}

let customers = loadData(KEYS.customers);
let products = loadData(KEYS.products);
let sales = loadData(KEYS.sales);

function saveData() {
  try {
    localStorage.setItem(KEYS.customers, JSON.stringify(customers));
    localStorage.setItem(KEYS.products, JSON.stringify(products));
    localStorage.setItem(KEYS.sales, JSON.stringify(sales));
    return true;
  } catch (error) {
    alert("Could not save data. Check available browser storage.");
    console.error(error);
    return false;
  }
}

function money(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN"
  }).format(value);
}

function makeCell(value) {
  const td = document.createElement("td");
  td.textContent = String(value);
  return td;
}

function makeButton(label, className, callback) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", callback);
  return button;
}

function showMessage(id, message, success = true) {
  const element = $(id);
  element.textContent = message;
  element.className = "message " + (success ? "success" : "error");
}

function makeEmptyRow(tbody, message, columns) {
  const row = document.createElement("tr");
  const cell = makeCell(message);
  cell.colSpan = columns;
  cell.className = "empty";
  row.appendChild(cell);
  tbody.appendChild(row);
}

function renderCustomers() {
  const list = $("customerList");
  list.replaceChildren();

  if (!customers.length) {
    makeEmptyRow(list, "No customers recorded yet.", 3);
  }

  customers.forEach(customer => {
    const row = document.createElement("tr");
    row.append(makeCell(customer.name), makeCell(customer.email));

    const action = document.createElement("td");

    action.appendChild(makeButton("Delete", "danger", () => {
      if (!confirm("Delete this customer?")) return;

      const old = customers;
      customers = customers.filter(c => c.id !== customer.id);

      if (!saveData()) {
        customers = old;
        return;
      }

      renderAll();
      showMessage("customerMessage", "Customer deleted.");
    }));

    row.appendChild(action);
    list.appendChild(row);
  });
}

$("customerForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("customerName").value.trim();
  const email = $("customerEmail").value.trim();

  if (!name || !email) {
    showMessage("customerMessage", "Enter the name and email.", false);
    return;
  }

  const customer = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random(),
    name,
    email,
    createdAt: new Date().toISOString()
  };

  customers.push(customer);

  if (!saveData()) {
    customers.pop();
    return;
  }

  $("customerForm").reset();
  renderAll();
  showMessage("customerMessage", "Customer saved successfully.");
});

function renderProducts() {
  const list = $("productList");
  list.replaceChildren();

  if (!products.length) {
    makeEmptyRow(list, "No products added yet.", 4);
  }

  products.forEach(product => {
    const row = document.createElement("tr");

    row.append(
      makeCell(product.name),
      makeCell(money(product.price)),
      makeCell(product.quantity)
    );

    const action = document.createElement("td");

    action.appendChild(makeButton("Delete", "danger", () => {
      if (sales.some(sale => sale.productId === product.id)) {
        alert("This product has sales records. Keep it to preserve your sales history.");
        return;
      }

      if (!confirm("Delete this product?")) return;

      const old = products;
      products = products.filter(p => p.id !== product.id);

      if (!saveData()) {
        products = old;
        return;
      }

      renderAll();
      showMessage("productMessage", "Product deleted.");
    }));

    row.appendChild(action);
    list.appendChild(row);
  });
}

$("productForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("productName").value.trim();
  const price = Number($("productPrice").value);
  const quantity = Number($("productQuantity").value);

  if (
    !name ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {
    showMessage("productMessage", "Enter valid product details.", false);
    return;
  }

  const product = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random(),
    name,
    price,
    quantity,
    createdAt: new Date().toISOString()
  };

  products.push(product);

  if (!saveData()) {
    products.pop();
    return;
  }

  $("productForm").reset();
  renderAll();
  showMessage("productMessage", "Product saved successfully.");
});

function renderSaleOptions() {
  const productSelect = $("saleProduct");
  const customerSelect = $("saleCustomer");

  productSelect.replaceChildren();
  customerSelect.replaceChildren();

  const productPlaceholder = document.createElement("option");
  productPlaceholder.value = "";
  productPlaceholder.textContent = "Choose a product";
  productSelect.appendChild(productPlaceholder);

  products.forEach(product => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent =
      `${product.name} — ${money(product.price)} — Stock: ${product.quantity}`;
    productSelect.appendChild(option);
  });

  const walkIn = document.createElement("option");
  walkIn.value = "";
  walkIn.textContent = "Walk-in customer";
  customerSelect.appendChild(walkIn);

  customers.forEach(customer => {
    const option = document.createElement("option");
    option.value = customer.id;
    option.textContent = customer.name;
    customerSelect.appendChild(option);
  });
}

function renderSales() {
  const list = $("salesList");
  const recent = $("recentSales");

  list.replaceChildren();
  recent.replaceChildren();

  const ordered = [...sales].reverse();

  if (!ordered.length) {
    makeEmptyRow(list, "No sales recorded yet.", 5);
    makeEmptyRow(recent, "No sales recorded yet.", 4);
  }

  ordered.forEach(sale => {
    const date = new Date(sale.createdAt).toLocaleDateString();

    const row = document.createElement("tr");
    row.append(
      makeCell(date),
      makeCell(sale.productName),
      makeCell(sale.quantity),
      makeCell(money(sale.unitPrice)),
      makeCell(money(sale.total))
    );
    list.appendChild(row);

    const recentRow = document.createElement("tr");
    recentRow.append(
      makeCell(date),
      makeCell(sale.productName),
      makeCell(sale.quantity),
      makeCell(money(sale.total))
    );
    recent.appendChild(recentRow);
  });
}

$("saleForm").addEventListener("submit", event => {
  event.preventDefault();

  const productId = $("saleProduct").value;
  const quantity = Number($("saleQuantity").value);
  const customerId = $("saleCustomer").value;

  const product = products.find(p => p.id === productId);

  if (!product) {
    showMessage("saleMessage", "Choose a product first.", false);
    return;
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    showMessage("saleMessage", "Enter a valid quantity.", false);
    return;
  }

  if (quantity > product.quantity) {
    showMessage("saleMessage", "Not enough stock available.", false);
    return;
  }

  const oldQuantity = product.quantity;
  const sale = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random(),
    productId: product.id,
    productName: product.name,
    quantity,
    unitPrice: product.price,
    total: Number((product.price * quantity).toFixed(2)),
    customerId: customerId || null,
    createdAt: new Date().toISOString()
  };

  product.quantity -= quantity;
  sales.push(sale);

  if (!saveData()) {
    product.quantity = oldQuantity;
    sales.pop();
    return;
  }

  $("saleForm").reset();
  renderAll();
  showMessage("saleMessage", "Sale recorded and stock updated.");
});

function renderReports() {
  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const units = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const low = products.filter(p => p.quantity <= 5);

  $("totalRevenue").textContent = money(revenue);
  $("totalCustomers").textContent = customers.length;
  $("totalProducts").textContent = products.length;

  $("totalStock").textContent = products.reduce(
    (sum, product) => sum + product.quantity, 0
  );

  $("reportSales").textContent = sales.length;
  $("reportUnits").textContent = units;
  $("reportRevenue").textContent = money(revenue);
  $("lowStock").textContent = low.length;

  $("stockWarning").textContent = products.length === 0
    ? "Add products to start monitoring stock."
    : low.length === 0
      ? "No products have five or fewer units remaining."
      : low.map(p => `${p.name}: ${p.quantity} remaining`).join(" | ");
}

function renderAll() {
  renderCustomers();
  renderProducts();
  renderSaleOptions();
  renderSales();
  renderReports();
}

document.querySelectorAll("nav button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    document.querySelectorAll(".page").forEach(page => {
      page.classList.toggle("active", page.id === button.dataset.page);
    });
  });
});

$("exportButton").addEventListener("click", () => {
  const backup = {
    exportedAt: new Date().toISOString(),
    customers,
    products,
    sales
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "great-wisdom-business-backup.json";
  link.click();

  URL.revokeObjectURL(url);

  showMessage("exportMessage", "Backup download requested.");
});

renderAll();
