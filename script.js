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
