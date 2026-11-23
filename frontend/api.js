/**
 * API-адаптер для SalaryAccounting.
 *
 * По умолчанию USE_MOCK = true — работает автономно на тестовых данных из schema.sql
 * с сохранением в localStorage.
 * Чтобы подключить Python-бэкенд (FastAPI / Flask), поставьте USE_MOCK = false
 * и укажите BASE_URL (например, "/api" или "http://127.0.0.1:8000/api").
 */
const API_CONFIG = {
  USE_MOCK: false,
  BASE_URL: "/api",
  TAX_RATE: 0.13,
  STORAGE_KEY: "salary_accounting_mock_v1"
};

const SEED_DATA = {
  roles: [
    { role_id: 1, name: "Бухгалтер" },
    { role_id: 2, name: "Сотрудник" }
  ],
  positions: [
    { position_id: 1, name: "Бухгалтер", base_salary: 70000 },
    { position_id: 2, name: "Программист", base_salary: 120000 },
    { position_id: 3, name: "Менеджер", base_salary: 55000 }
  ],
  users: [
    { user_id: 1, login: "ivanova", password: "buh123", role_id: 1 },
    { user_id: 2, login: "petrov", password: "pass123", role_id: 2 },
    { user_id: 3, login: "sidorova", password: "qwerty1", role_id: 2 },
    { user_id: 4, login: "kuznetsov", password: "oleg2026", role_id: 2 }
  ],
  employees: [
    { employee_id: 1, full_name: "Иванова Анна Сергеевна", position_id: 1, user_id: 1 },
    { employee_id: 2, full_name: "Петров Игорь Николаевич", position_id: 2, user_id: 2 },
    { employee_id: 3, full_name: "Сидорова Мария Павловна", position_id: 3, user_id: 3 },
    { employee_id: 4, full_name: "Кузнецов Олег Дмитриевич", position_id: 2, user_id: 4 }
  ],
  salaries: [
    { salary_id: 1, employee_id: 1, month: "2026-09", amount: 70000, tax: 9100, payout: 60900, is_paid: 1 },
    { salary_id: 2, employee_id: 2, month: "2026-09", amount: 120000, tax: 15600, payout: 104400, is_paid: 1 },
    { salary_id: 3, employee_id: 3, month: "2026-09", amount: 55000, tax: 7150, payout: 47850, is_paid: 1 },
    { salary_id: 4, employee_id: 4, month: "2026-09", amount: 120000, tax: 15600, payout: 104400, is_paid: 1 },
    { salary_id: 5, employee_id: 1, month: "2026-10", amount: 70000, tax: 9100, payout: 60900, is_paid: 0 },
    { salary_id: 6, employee_id: 2, month: "2026-10", amount: 120000, tax: 15600, payout: 104400, is_paid: 0 },
    { salary_id: 7, employee_id: 3, month: "2026-10", amount: 55000, tax: 7150, payout: 47850, is_paid: 0 },
    { salary_id: 8, employee_id: 4, month: "2026-10", amount: 130000, tax: 16900, payout: 113100, is_paid: 0 }
  ]
};

function loadDb() {
  try {
    const raw = localStorage.getItem(API_CONFIG.STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore storage errors
  }
  const clone = structuredClone(SEED_DATA);
  saveDb(clone);
  return clone;
}

function saveDb(db) {
  try {
    localStorage.setItem(API_CONFIG.STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore storage errors
  }
}

function nextId(list, key) {
  return list.length ? Math.max(...list.map((item) => item[key])) + 1 : 1;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function checkMonth(month) {
  const m = String(month || "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) {
    throw new Error("Месяц нужно ввести в формате ГГГГ-ММ, например 2026-11");
  }
  return m;
}

async function http(method, path, body) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.error || `Ошибка сервера (${res.status})`);
  }
  return data;
}

export const api = {
  calculateTax(amount) {
    return round2(Number(amount || 0) * API_CONFIG.TAX_RATE);
  },

  calculatePayout(amount) {
    const num = Number(amount || 0);
    return round2(num - this.calculateTax(num));
  },

  async login(login, password) {
    if (!API_CONFIG.USE_MOCK) return http("POST", "/auth/login", { login, password });
    const db = loadDb();
    const user = db.users.find((u) => u.login === login.trim() && u.password === password);
    if (!user) throw new Error("Неверный логин или пароль");
    const role = db.roles.find((r) => r.role_id === user.role_id);
    const emp = db.employees.find((e) => e.user_id === user.user_id) || null;
    const pos = emp ? db.positions.find((p) => p.position_id === emp.position_id) : null;
    return {
      user_id: user.user_id,
      login: user.login,
      role_id: user.role_id,
      role_name: role ? role.name : "Сотрудник",
      employee: emp ? { ...emp, position_name: pos?.name || "" } : null
    };
  },

  async registerEmployee({ login, password, full_name, position_id }) {
    if (!API_CONFIG.USE_MOCK) {
      return http("POST", "/auth/register", { login, password, full_name, position_id });
    }
    const db = loadDb();
    const cleanLogin = login.trim();
    const cleanName = full_name.trim();
    if (!cleanName || cleanName.length < 3) throw new Error("Укажите ФИО");
    if (!cleanLogin || cleanLogin.length < 3) throw new Error("Логин слишком короткий");
    if (!password || password.length < 4) throw new Error("Пароль должен быть не короче 4 символов");
    if (db.users.some((u) => u.login === cleanLogin)) throw new Error("Такой логин уже занят");
    if (!db.positions.some((p) => p.position_id === Number(position_id))) {
      throw new Error("Должность не найдена");
    }

    const user_id = nextId(db.users, "user_id");
    db.users.push({ user_id, login: cleanLogin, password, role_id: 2 });
    const employee_id = nextId(db.employees, "employee_id");
    db.employees.push({
      employee_id,
      full_name: cleanName,
      position_id: Number(position_id),
      user_id
    });
    saveDb(db);
    return { user_id, employee_id };
  },

  async changePassword(user_id, old_password, new_password) {
    if (!API_CONFIG.USE_MOCK) {
      return http("POST", "/auth/change-password", { user_id, old_password, new_password });
    }
    const db = loadDb();
    const user = db.users.find((u) => u.user_id === user_id);
    if (!user) throw new Error("Пользователь не найден");
    if (user.password !== old_password) throw new Error("Старый пароль введён неверно");
    if (!new_password || new_password.length < 4) throw new Error("Новый пароль слишком короткий");
    user.password = new_password;
    saveDb(db);
    return { ok: true };
  },

  async getPositions() {
    if (!API_CONFIG.USE_MOCK) return http("GET", "/positions");
    const db = loadDb();
    return [...db.positions].sort((a, b) => a.position_id - b.position_id);
  },

  async createPosition(name, base_salary) {
    if (!API_CONFIG.USE_MOCK) return http("POST", "/positions", { name, base_salary });
    const db = loadDb();
    const clean = name.trim();
    const salary = Number(base_salary);
    if (!clean) throw new Error("Введите название должности");
    if (!(salary > 0)) throw new Error("Оклад должен быть больше 0");
    if (db.positions.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      throw new Error("Такая должность уже существует");
    }
    const item = { position_id: nextId(db.positions, "position_id"), name: clean, base_salary: salary };
    db.positions.push(item);
    saveDb(db);
    return item;
  },

  async updatePositionSalary(position_id, base_salary) {
    if (!API_CONFIG.USE_MOCK) return http("PATCH", `/positions/${position_id}`, { base_salary });
    const db = loadDb();
    const pos = db.positions.find((p) => p.position_id === Number(position_id));
    if (!pos) throw new Error("Должность не найдена");
    const salary = Number(base_salary);
    if (!(salary > 0)) throw new Error("Оклад должен быть больше 0");
    pos.base_salary = salary;
    saveDb(db);
    return pos;
  },

  async deletePosition(position_id) {
    if (!API_CONFIG.USE_MOCK) return http("DELETE", `/positions/${position_id}`);
    const db = loadDb();
    const id = Number(position_id);
    if (db.employees.some((e) => e.position_id === id)) {
      throw new Error("На этой должности есть сотрудники, удалить нельзя");
    }
    db.positions = db.positions.filter((p) => p.position_id !== id);
    saveDb(db);
    return { ok: true };
  },

  async getEmployees() {
    if (!API_CONFIG.USE_MOCK) return http("GET", "/employees");
    const db = loadDb();
    return db.employees.map((e) => {
      const pos = db.positions.find((p) => p.position_id === e.position_id);
      const usr = db.users.find((u) => u.user_id === e.user_id);
      return {
        ...e,
        login: usr?.login || "",
        position_name: pos?.name || "—",
        base_salary: pos?.base_salary || 0
      };
    });
  },

  async changeEmployeePosition(employee_id, position_id) {
    if (!API_CONFIG.USE_MOCK) {
      return http("PATCH", `/employees/${employee_id}/position`, { position_id });
    }
    const db = loadDb();
    const emp = db.employees.find((e) => e.employee_id === Number(employee_id));
    if (!emp) throw new Error("Сотрудник не найден");
    if (!db.positions.some((p) => p.position_id === Number(position_id))) {
      throw new Error("Должность не найдена");
    }
    if (emp.position_id === Number(position_id)) {
      throw new Error("Сотрудник уже работает на этой должности");
    }
    emp.position_id = Number(position_id);
    saveDb(db);
    return emp;
  },

  async approveEmployee(employee_id, position_id = null) {
    if (!API_CONFIG.USE_MOCK) {
      return http("POST", `/employees/${employee_id}/approve`, { position_id });
    }
    return { ok: true };
  },

  async downloadExport(path, fallbackFilename) {
    let userId = "";
    try {
      const saved = JSON.parse(localStorage.getItem("sa_session") || "null");
      if (saved?.user_id) userId = String(saved.user_id);
    } catch {
      // ignore
    }
    const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
      headers: userId ? { "X-User-Id": userId } : {}
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Не удалось скачать файл");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fallbackFilename;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  },

  async exportEmployees(fmt = "json") {
    if (!API_CONFIG.USE_MOCK) {
      return this.downloadExport(`/export/employees?fmt=${encodeURIComponent(fmt)}`, `employees.${fmt}`);
    }
    return { ok: true };
  },

  async exportEmployeeTableStub(employee_id) {
    const history = await this.getEmployeeHistory(employee_id);
    const lines = ["Месяц;Начислено;Налог 13%;К выплате;Статус"];
    for (const s of history) {
      lines.push(`${s.month};${s.amount};${s.tax};${s.payout};${s.is_paid ? "Выплачено" : "Ожидает выплаты"}`);
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salaries_employee_${employee_id}_stub.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  },

  async deleteEmployee(employee_id) {
    if (!API_CONFIG.USE_MOCK) return http("DELETE", `/employees/${employee_id}`);
    const db = loadDb();
    const id = Number(employee_id);
    const emp = db.employees.find((e) => e.employee_id === id);
    if (!emp) throw new Error("Сотрудник не найден");
    db.salaries = db.salaries.filter((s) => s.employee_id !== id);
    db.employees = db.employees.filter((e) => e.employee_id !== id);
    db.users = db.users.filter((u) => u.user_id !== emp.user_id);
    saveDb(db);
    return { ok: true };
  },

  async getMonthReport(month) {
    if (!API_CONFIG.USE_MOCK) return http("GET", `/salaries?month=${encodeURIComponent(month)}`);
    const validMonth = checkMonth(month);
    const db = loadDb();
    return db.salaries
      .filter((s) => s.month === validMonth)
      .map((s) => {
        const emp = db.employees.find((e) => e.employee_id === s.employee_id);
        const pos = emp ? db.positions.find((p) => p.position_id === emp.position_id) : null;
        return {
          ...s,
          employee_name: emp?.full_name || "—",
          position_name: pos?.name || "—"
        };
      });
  },

  async getEmployeeHistory(employee_id) {
    if (!API_CONFIG.USE_MOCK) return http("GET", `/employees/${employee_id}/salaries`);
    const db = loadDb();
    return db.salaries
      .filter((s) => s.employee_id === Number(employee_id))
      .sort((a, b) => b.month.localeCompare(a.month));
  },

  async accrueSalary(employee_id, month, amount) {
    if (!API_CONFIG.USE_MOCK) {
      return http("POST", "/salaries", { employee_id, month, amount });
    }
    const db = loadDb();
    const empId = Number(employee_id);
    const validMonth = checkMonth(month);
    const sum = Number(amount);
    if (!db.employees.some((e) => e.employee_id === empId)) throw new Error("Сотрудник не найден");
    if (!(sum > 0)) throw new Error("Зарплата должна быть больше 0");
    if (db.salaries.some((s) => s.employee_id === empId && s.month === validMonth)) {
      throw new Error("За этот месяц сотруднику уже начислено");
    }
    const tax = this.calculateTax(sum);
    const payout = this.calculatePayout(sum);
    const row = {
      salary_id: nextId(db.salaries, "salary_id"),
      employee_id: empId,
      month: validMonth,
      amount: sum,
      tax,
      payout,
      is_paid: 0
    };
    db.salaries.push(row);
    saveDb(db);
    return row;
  },

  async accrueForAll(month) {
    if (!API_CONFIG.USE_MOCK) return http("POST", "/salaries/accrue-all", { month });
    const validMonth = checkMonth(month);
    const db = loadDb();
    let count = 0;
    for (const emp of db.employees) {
      if (db.salaries.some((s) => s.employee_id === emp.employee_id && s.month === validMonth)) {
        continue;
      }
      const pos = db.positions.find((p) => p.position_id === emp.position_id);
      const amount = pos ? pos.base_salary : 0;
      db.salaries.push({
        salary_id: nextId(db.salaries, "salary_id"),
        employee_id: emp.employee_id,
        month: validMonth,
        amount,
        tax: this.calculateTax(amount),
        payout: this.calculatePayout(amount),
        is_paid: 0
      });
      count += 1;
    }
    saveDb(db);
    return { count };
  },

  async markPaid(salary_id) {
    if (!API_CONFIG.USE_MOCK) return http("POST", `/salaries/${salary_id}/pay`);
    const db = loadDb();
    const row = db.salaries.find((s) => s.salary_id === Number(salary_id));
    if (!row) throw new Error("Начисление не найдено");
    if (row.is_paid) throw new Error("Это начисление уже выплачено");
    row.is_paid = 1;
    saveDb(db);
    return row;
  },

  async deleteSalary(salary_id) {
    if (!API_CONFIG.USE_MOCK) return http("DELETE", `/salaries/${salary_id}`);
    const db = loadDb();
    const row = db.salaries.find((s) => s.salary_id === Number(salary_id));
    if (!row) throw new Error("Начисление не найдено");
    if (row.is_paid) throw new Error("Выплаченное начисление удалить нельзя");
    db.salaries = db.salaries.filter((s) => s.salary_id !== row.salary_id);
    saveDb(db);
    return { ok: true };
  }
};

window.SalaryAPI = api;
