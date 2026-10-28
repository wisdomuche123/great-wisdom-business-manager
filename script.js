// Great Wisdom Business Manager
// Initial interactive customer module.

const customers = [];

function addCustomer(name, email) {
  const customer = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim(),
    createdAt: new Date().toISOString()
  };

  if (!customer.name || !customer.email) {
    return {
      success: false,
      message: "Please enter the customer's name and email."
    };
  }

  customers.push(customer);

  return {
    success: true,
    message: "Customer added successfully!",
    customer
  };
}

function getCustomerCount() {
  return customers.length;
}

function getAllCustomers() {
  return [...customers];
}

console.log("Great Wisdom Business Manager loaded.");
console.log("Customer module initialized.");

const customers = [];

const customerForm = document.getElementById("customerForm");
const customerName = document.getElementById("customerName");
const customerEmail = document.getElementById("customerEmail");
const customerList = document.getElementById("customerList");
const customerMessage = document.getElementById("customerMessage");

customerForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = customerName.value.trim();
  const email = customerEmail.value.trim();

  if (!name || !email) {
    customerMessage.textContent = "Please complete all fields.";
    return;
  }

  const customer = {
    id: Date.now(),
    name: name,
    email: email
  };

  customers.push(customer);

  const item = document.createElement("li");
  item.textContent = `${customer.name} — ${customer.email}`;
  customerList.appendChild(item);

  customerMessage.textContent = "Customer added successfully!";

  document.querySelector(".stats .card:nth-child(2) h2").textContent =
    customers.length;

  customerForm.reset();
});

console.log("Great Wisdom Business Manager is ready.");
