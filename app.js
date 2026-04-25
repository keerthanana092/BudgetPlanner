const showToast = (message, type = 'error') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
};

let expenseChart = null;
const updateChart = (expenses) => {
  const chartWrapper = document.getElementById('chart-wrapper');
  if (expenses.length === 0) {
    chartWrapper.style.display = 'none';
    return;
  }
  chartWrapper.style.display = 'block';

  const ctx = document.getElementById('expenseChart').getContext('2d');
  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  const data = {
    labels: Object.keys(categoryTotals),
    datasets: [{
      data: Object.values(categoryTotals),
      backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#2ecc71'],
      borderWidth: 0
    }]
  };

  const isDark = document.body.classList.contains('theme-dark');

  if (expenseChart) {
    expenseChart.data = data;
    expenseChart.options.plugins.legend.labels.color = isDark ? '#e8e8f2' : '#333';
    expenseChart.update();
  } else {
    expenseChart = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'right',
            labels: { color: isDark ? '#e8e8f2' : '#333' }
          }
        }
      }
    });
  }
};

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
      App.saveData();
      this.renderExpenses();
      showToast("Expense deleted successfully!", "success");
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
          <td data-label="Title">${item.title}</td>
          <td data-label="Amount">${currency} ${item.amount}</td>
          <td data-label="Date">${item.date}</td>
          <td data-label="Category"><span class="category-badge ${categoryClass}">${item.category}</span></td>
          <td data-label="Edit"><button class="edit-btn">✏️</button></td>
          <td data-label="Delete"><button class="del-btn">🗑️</button></td>
        `;

        row.querySelector(".del-btn").addEventListener("click", () => this.deleteExpenseItem(item.id));
        row.querySelector(".edit-btn").addEventListener("click", () => this.editExpenseItem(item.id));

        tableBody.appendChild(row);
      });
      
    updateChart(this.expenseList);
  }
}

class App {
  static expenseList = [];

  static init() {
    this.setupListeners();
    document.getElementById("reset-app-btn").addEventListener("click", () => {
      if(confirm("Are you sure you want to reset everything? This will delete all your data.")) {
        localStorage.removeItem('budgetData');
        localStorage.removeItem('expenseData');
        location.reload();
      }
    });

    this.loadData();
  }

  static loadData() {
    const savedBudget = JSON.parse(localStorage.getItem('budgetData'));
    const savedExpenses = JSON.parse(localStorage.getItem('expenseData'));

    if (savedBudget && savedBudget.amount > 0) {
      document.getElementById("budget").value = savedBudget.amount;
      document.getElementById("currency").value = savedBudget.currency;
      this.setBudget(true); 
    }

    if (savedExpenses) {
      this.expenseList = savedExpenses;
      new ExpenseItem(this.expenseList);
    }
  }

  static saveData() {
    localStorage.setItem('expenseData', JSON.stringify(this.expenseList));
  }

  static setupListeners() {
    document.getElementById("add-budget-btn").addEventListener("click", () => this.setBudget(false));
    
    document.getElementById("edit-budget-btn").addEventListener("click", () => {
      document.getElementById("budget").disabled = false;
      document.getElementById("currency").disabled = false;
      document.getElementById("add-budget-btn").disabled = false;
      document.getElementById("budget").focus();
    });

    document.getElementById("add-expense-btn").addEventListener("click", this.addExpense.bind(this));
    
    document.getElementById("currency").addEventListener("change", () => {
      const cur = document.getElementById("currency").value;
      document.querySelectorAll(".currency-symbol").forEach(el => el.textContent = cur);
      if (this.expenseList.length > 0) new ExpenseItem(this.expenseList);
    });

    document.getElementById("search-expense").addEventListener("input", () => {
      new ExpenseItem(this.expenseList);
    });
    document.getElementById("export-csv-btn").addEventListener("click", this.exportToCSV.bind(this));

    const themeSelector = document.getElementById("theme");
    if (themeSelector) {
      themeSelector.addEventListener("change", () => {
        applyTheme(themeSelector.value);
        if (this.expenseList.length > 0) updateChart(this.expenseList);
      });
    }

    window.addEventListener("DOMContentLoaded", () => {
      const savedTheme = localStorage.getItem('selectedTheme') || 'light';
      if (themeSelector) themeSelector.value = savedTheme;
      applyTheme(savedTheme);
    });
  }

  static setBudget(isLoading = false) {
    const budgetInput = document.getElementById("budget");
    const currency = document.getElementById("currency").value;

    if (!budgetInput.value || +budgetInput.value <= 0 || currency === "") {
      showToast("Please enter a valid budget and select currency.", "error");
      return;
    }

    if (!isLoading) {
      localStorage.setItem('budgetData', JSON.stringify({
        amount: +budgetInput.value,
        currency: currency
      }));
      showToast("Budget saved successfully!", "success");
    }

    new Balances().updateBudgetAmount(+budgetInput.value, 0);
    
    if (this.expenseList.length > 0) {
        new ExpenseItem(this.expenseList);
    }
    
    document.querySelectorAll(".currency-symbol").forEach(el => el.textContent = currency);

    budgetInput.disabled = true;
    document.getElementById("currency").disabled = true;
    document.getElementById("add-budget-btn").disabled = true;
    document.getElementById("edit-budget-btn").style.display = "inline-block";
  }

  static addExpense() {
    const title = document.getElementById("expense-title").value.trim();
    const amount = +document.getElementById("expense-amount").value;
    const date = document.getElementById("expense-date").value;
    const category = document.getElementById("expense-category").value;
    const balance = +document.getElementById("balance-amount").textContent;

    if (!title || isNaN(amount) || amount <= 0 || !date || !category) {
      showToast("Please fill out all expense fields correctly.", "error");
      return;
    }

    if (amount > balance) {
      showToast("Insufficient balance for this expense.", "error");
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
    this.saveData();
    showToast("Expense added successfully!", "success");
  }

  static exportToCSV() {
    if (App.expenseList.length === 0) {
      showToast("No expenses to export!", "error");
      return;
    }

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
    showToast("Exported to CSV successfully!", "success");
  }
}

// theme logic
const applyTheme = (theme) => {
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem('selectedTheme', theme);
};

App.init();
