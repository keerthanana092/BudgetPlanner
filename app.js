class Balances {
  constructor() {
    this.budgetAmount = document.getElementById("budget-amount");
    this.expenses = document.getElementById("expenses-amount");
    this.balance = document.getElementById("balance-amount");
  }

  updateBudgetAmount(budget, expense = 0) {
    this.budgetAmount.textContent = budget;
    this.expenses.textContent = expense;
    this.balance.textContent = budget - expense;
  }

  updateExpenseBalance(expense) {
    this.expenses.textContent = expense;
    const budget = +this.budgetAmount.textContent;
    this.balance.textContent = budget - expense;
  }

  deleteExpense(amountToRemove) {
    const newExpenseTotal = +this.expenses.textContent - +amountToRemove;
    this.updateExpenseBalance(newExpenseTotal);
  }
}

class ExpenseItem {
  constructor(expenses) {
    this.expenseList = expenses;
    this.updateBalances();
    this.renderExpenses();
  }

  updateBalances() {
    const total = this.expenseList.reduce((sum, item) => sum + +item.amount, 0);
    new Balances().updateExpenseBalance(total);
  }

  deleteExpenseItem(id) {
    const index = this.expenseList.findIndex(item => item.id === id);
    if (index > -1) {
      new Balances().deleteExpense(this.expenseList[index].amount);
      this.expenseList.splice(index, 1);
      this.renderExpenses();
    }
  }

  editExpenseItem(id) {
    const item = this.expenseList.find(exp => exp.id === id);
    if (item) {
      document.getElementById("expense-title").value = item.title;
      document.getElementById("expense-amount").value = item.amount;
      document.getElementById("expense-date").value = item.date;
      document.getElementById("expense-category").value = item.category;
      this.deleteExpenseItem(id);
    }
  }

  renderExpenses() {
    const tableBody = document.getElementById("expense-list");
    const currency = document.getElementById("currency").value;
    const filter = document.getElementById("search-expense").value.toLowerCase();

    tableBody.innerHTML = "";

    this.expenseList
      .filter(exp => exp.title.toLowerCase().includes(filter))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(item => {
        const row = document.createElement("tr");

        const categoryClass = {
          Food: "category-food",
          Travel: "category-travel",
          Shopping: "category-shopping",
          Bills: "category-bills",
          General: "category-general"
        }[item.category] || "category-general";

        row.innerHTML = `
          <td>${item.title}</td>
          <td>${currency} ${item.amount}</td>
          <td>${item.date}</td>
          <td><span class="category-badge ${categoryClass}">${item.category}</span></td>
          <td><button class="edit-btn">✏️</button></td>
          <td><button class="del-btn">🗑️</button></td>
        `;

        row.querySelector(".del-btn").addEventListener("click", () => this.deleteExpenseItem(item.id));
        row.querySelector(".edit-btn").addEventListener("click", () => this.editExpenseItem(item.id));

        tableBody.appendChild(row);
      });
  }
}

class App {
  static expenseList = [];

  static init() {
    this.setupListeners();
    document.getElementById("reset-app-btn").addEventListener("click", () => location.reload());
  }

  static setupListeners() {
    document.getElementById("add-budget-btn").addEventListener("click", this.setBudget.bind(this));
    document.getElementById("add-expense-btn").addEventListener("click", this.addExpense.bind(this));
    document.getElementById("currency").addEventListener("change", () => {
      document.querySelectorAll("#currency-symbol").forEach(el => {
        el.textContent = document.getElementById("currency").value;
      });
    });
    document.getElementById("search-expense").addEventListener("input", () => {
      new ExpenseItem(this.expenseList);
    });
    document.getElementById("export-csv-btn").addEventListener("click", this.exportToCSV.bind(this));

    const themeSelector = document.getElementById("theme");
    if (themeSelector) {
      themeSelector.addEventListener("change", () => {
        applyTheme(themeSelector.value);
      });
    }

    window.addEventListener("DOMContentLoaded", () => {
      const savedTheme = localStorage.getItem('selectedTheme') || 'light';
      if (themeSelector) themeSelector.value = savedTheme;
      applyTheme(savedTheme);
    });
  }

  static setBudget() {
    const budgetInput = document.getElementById("budget");
    const currency = document.getElementById("currency").value;

    if (!budgetInput.value || +budgetInput.value <= 0 || currency === "") {
      alert("Please enter a valid budget and select currency.");
      return;
    }

    new Balances().updateBudgetAmount(+budgetInput.value, 0);
    document.querySelector(".add-expense-box").classList.add("visible");
    document.querySelectorAll("#currency-symbol").forEach(el => {
      el.textContent = currency;
    });

    budgetInput.disabled = true;
    document.getElementById("add-budget-btn").disabled = true;
  }

  static addExpense() {
    const title = document.getElementById("expense-title").value.trim();
    const amount = +document.getElementById("expense-amount").value;
    const date = document.getElementById("expense-date").value;
    const category = document.getElementById("expense-category").value;
    const balance = +document.getElementById("balance-amount").textContent;

    if (!title || isNaN(amount) || amount <= 0 || !date || !category) {
      alert("Please fill out all expense fields correctly.");
      return;
    }

    if (amount > balance) {
      alert("Insufficient balance for this expense.");
      return;
    }

    App.expenseList.push({
      id: Date.now().toString(),
      title,
      amount,
      date,
      category
    });

    document.getElementById("expense-title").value = "";
    document.getElementById("expense-amount").value = "";
    document.getElementById("expense-date").value = "";

    new ExpenseItem(App.expenseList);
  }

  static exportToCSV() {
    if (App.expenseList.length === 0) return alert("No expenses to export!");

    const csvRows = [
      ["Title", "Amount", "Date", "Category"]
    ];

    App.expenseList.forEach(item => {
      csvRows.push([item.title, item.amount, item.date, item.category]);
    });

    const blob = new Blob([csvRows.map(row => row.join(",")).join("\n")], {
      type: "text/csv"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
}

// theme logic
const applyTheme = (theme) => {
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem('selectedTheme', theme);
};

App.init();
