const $ = id => document.getElementById(id);

function loadData(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
        return [];
    }
}

let products = loadData("electronicProducts");
let sales = loadData("electronicSales");

let nextProductId = products.reduce(
    (max, p) => Math.max(max, p.id), 0
) + 1;

let nextSaleId = sales.reduce(
    (max, s) => Math.max(max, s.id), 0
) + 1;

function money(value) {
    return "₹" + Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function saveData() {
    localStorage.setItem("electronicProducts", JSON.stringify(products));
    localStorage.setItem("electronicSales", JSON.stringify(sales));
}

function notify(text) {
    $("message").textContent = text;
}

function getProduct(id) {
    return products.find(p => p.id === Number(id));
}

// Add a product
$("productForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("productName").value.trim();
    const category = $("category").value;
    const price = Number($("price").value);
    const stock = Number($("stock").value);

    if (
        !name ||
        !Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(stock) || stock < 0
    ) {
        notify("Enter a valid product name, price and stock.");
        return;
    }

    products.push({
        id: nextProductId++,
        name,
        category,
        price,
        stock
    });

    saveData();
    renderAll();
    event.target.reset();

    notify("Product added successfully.");
});

// Display products
function renderProducts() {
    const table = $("productTable");
    table.replaceChildren();

    const query = $("searchInput").value.trim().toLowerCase();
    const category = $("filterCategory").value;

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query) &&
        (category === "All" || p.category === category)
    );

    filtered.forEach(product => {
        const row = document.createElement("tr");

        const values = [
            product.id,
            product.name,
            product.category,
            money(product.price),
            product.stock
        ];

        values.forEach((value, index) => {
            const cell = document.createElement("td");
            cell.textContent = value;

            if (index === 4 && product.stock <= 3) {
                cell.className = "low-stock";
            }

            row.appendChild(cell);
        });

        const actions = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "action-btn edit-btn";
        editButton.addEventListener("click", () => editProduct(product.id));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "action-btn delete-btn";
        deleteButton.addEventListener("click", () => deleteProduct(product.id));

        actions.append(editButton, deleteButton);
        row.appendChild(actions);
        table.appendChild(row);
    });

    $("emptyProducts").hidden = filtered.length > 0;
}

// Edit product details
function editProduct(id) {
    const product = getProduct(id);
    if (!product) return;

    const name = prompt("Product name:", product.name);
    if (name === null) return;

    const priceInput = prompt("Unit price (₹):", product.price);
    if (priceInput === null) return;

    const stockInput = prompt("Stock quantity:", product.stock);
    if (stockInput === null) return;

    const newName = name.trim();
    const newPrice = Number(priceInput);
    const newStock = Number(stockInput);

    if (
        !newName ||
        priceInput.trim() === "" ||
        !Number.isFinite(newPrice) || newPrice <= 0 ||
        stockInput.trim() === "" ||
        !Number.isInteger(newStock) || newStock < 0
    ) {
        notify("Invalid product details. No changes saved.");
        return;
    }

    product.name = newName;
    product.price = newPrice;
    product.stock = newStock;

    saveData();
    renderAll();
    notify("Product updated successfully.");
}

// Delete product
function deleteProduct(id) {
    const product = getProduct(id);
    if (!product) return;

    const confirmed = confirm(
        "Delete " + product.name + "? Its existing sales records will remain."
    );

    if (!confirmed) return;

    products = products.filter(p => p.id !== Number(id));

    saveData();
    renderAll();
    notify("Product deleted.");
}

// Populate sale product selection
function renderSaleOptions() {
    const select = $("saleProduct");
    const previousValue = select.value;

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = products.length
        ? "Select a product"
        : "Add products first";

    select.appendChild(placeholder);

    products.forEach(product => {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent =
            `${product.name} — ${money(product.price)} (Stock: ${product.stock})`;

        option.disabled = product.stock === 0;
        select.appendChild(option);
    });

    if (products.some(p =>
        String(p.id) === previousValue && p.stock > 0
    )) {
        select.value = previousValue;
    }

    updateSalePreview();
}

// Calculate the bill preview
function updateSalePreview() {
    const product = getProduct($("saleProduct").value);
    const quantity = Number($("saleQuantity").value);

    if (!product) {
        $("salePreview").textContent = "Select a product to view the bill.";
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        $("salePreview").textContent = "Enter a valid quantity.";
        return;
    }

    $("salePreview").textContent =
        `Unit Price: ${money(product.price)} | ` +
        `Quantity: ${quantity} | ` +
        `Total: ${money(product.price * quantity)} | ` +
        `Available Stock: ${product.stock}`;
}

$("saleProduct").addEventListener("change", updateSalePreview);
$("saleQuantity").addEventListener("input", updateSalePreview);

// Record a sale and update stock
$("saleForm").addEventListener("submit", event => {
    event.preventDefault();

    const product = getProduct($("saleProduct").value);
    const quantity = Number($("saleQuantity").value);

    if (!product) {
        notify("Please select a product.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        notify("Enter a valid whole-number quantity.");
        return;
    }

    if (quantity > product.stock) {
        notify("Insufficient stock. Available quantity: " + product.stock);
        return;
    }

    const unitPrice = product.price;
    const total = Math.round(unitPrice * quantity * 100) / 100;

    const sale = {
        id: nextSaleId++,
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        total,
        date: new Date().toLocaleString("en-IN")
    };

    product.stock -= quantity;
    sales.push(sale);

    saveData();
    renderAll();

    $("saleForm").reset();
    $("saleQuantity").value = 1;
    updateSalePreview();

    notify("Sale completed! Bill total: " + money(total));
});

// Show sales history
function renderSales() {
    const table = $("salesTable");
    table.replaceChildren();

    sales.forEach(sale => {
        const row = document.createElement("tr");

        const values = [
            sale.id,
            sale.productName,
            sale.quantity,
            money(sale.unitPrice),
            money(sale.total),
            sale.date
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const billCell = document.createElement("td");
        const billButton = document.createElement("button");

        billButton.textContent = "View Bill";
        billButton.className = "action-btn bill-btn";
        billButton.addEventListener("click", () => showBill(sale.id));

        billCell.appendChild(billButton);
        row.appendChild(billCell);
        table.appendChild(row);
    });

    $("emptySales").hidden = sales.length > 0;
}

// View a bill
function showBill(id) {
    const sale = sales.find(s => s.id === Number(id));
    if (!sale) return;

    alert(
        "ELECTRONIC STORE - SALES BILL\n\n" +
        "Bill Number: " + sale.id + "\n" +
        "Date: " + sale.date + "\n" +
        "Product: " + sale.productName + "\n" +
        "Quantity: " + sale.quantity + "\n" +
        "Unit Price: " + money(sale.unitPrice) + "\n" +
        "------------------------------\n" +
        "TOTAL: " + money(sale.total) + "\n\n" +
        "Thank you for shopping!"
    );
}

// Update dashboard
function renderDashboard() {
    $("totalProducts").textContent = products.length;

    $("totalStock").textContent = products.reduce(
        (sum, p) => sum + p.stock, 0
    );

    const inventoryValue = products.reduce(
        (sum, p) => sum + p.price * p.stock, 0
    );

    $("inventoryValue").textContent = money(inventoryValue);

    const totalSales = sales.reduce(
        (sum, s) => sum + s.total, 0
    );

    $("totalSales").textContent = money(totalSales);
}

// Search and category filter
$("searchInput").addEventListener("input", renderProducts);
$("filterCategory").addEventListener("change", renderProducts);

function renderAll() {
    renderDashboard();
    renderProducts();
    renderSaleOptions();
    renderSales();
}

// Initial page load
renderAll();