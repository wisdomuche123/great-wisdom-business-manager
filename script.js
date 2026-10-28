// Great Wisdom Business Manager
// Customer management with browser persistence.

const STORAGE_KEY = "gwBusinessCustomers";

const customerForm = document.getElementById("customerForm");
const customerName = document.getElementById("customerName");
const customerEmail = document.getElementById("customerEmail");
const customerList = document.getElementById("customerList");
const customerMessage = document.getElementById("customerMessage");

const customerCount = document.querySelector(
  ".stats .card:nth-child(2) h2"
);

let customers = loadCustomers();

function loadCustomers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load customer records:", error);
    return [];
  }
}

function saveCustomers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    return true;
  } catch (error) {
    console.error("Could not save customer records:", error);
    customerMessage.textContent =
      "Could not save records in this browser.";
    return false;
  }
}

function renderCustomers() {
  customerList.replaceChildren();

  customers.forEach((customer) => {
    const item = document.createElement("li");
    item.style.marginBottom = "12px";

    const details = document.createElement("span");
    details.textContent = `${customer.name} — ${customer.email} `;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.style.marginLeft = "8px";
    deleteButton.style.padding = "6px 10px";
    deleteButton.style.cursor = "pointer";

    deleteButton.addEventListener("click", () => {
      const previousCustomers = customers;
      customers = customers.filter(
        (entry) => entry.id !== customer.id
      );

      if (saveCustomers()) {
        renderCustomers();
        customerMessage.textContent = "Customer deleted successfully.";
      } else {
        customers = previousCustomers;
      }
    });

    item.append(details, deleteButton);
    customerList.appendChild(item);
  });

  customerCount.textContent = customers.length;
}

customerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = customerName.value.trim();
  const email = customerEmail.value.trim();

  if (!name || !email) {
    customerMessage.textContent =
      "Please enter the customer's name and email.";
    return;
  }

  const customer = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    name,
    email,
    createdAt: new Date().toISOString()
  };

  customers.push(customer);

  if (!saveCustomers()) {
    customers.pop();
    return;
  }

  renderCustomers();
  customerForm.reset();
  customerMessage.textContent = "Customer saved successfully!";
});

renderCustomers();

console.log("Great Wisdom Business Manager is ready.");
