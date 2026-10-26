-- =========================================
-- База данных «Учёт доходов и зарплат»
-- =========================================

-- 1. Удаление старых таблиц
--    (сначала зависимые — с внешними ключами, потом справочники)
DROP TABLE IF EXISTS salaries;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS roles;

-- 2. Создание таблиц
--    (наоборот: сначала справочники, потом таблицы с внешними ключами)

-- Роли пользователей (справочник)
CREATE TABLE roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Должности и их оклады (справочник)
CREATE TABLE positions (
    position_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    base_salary REAL NOT NULL
);

-- Пользователи системы (логины для входа)
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles (role_id)
);

-- Сотрудники
CREATE TABLE employees (
    employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    position_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL UNIQUE,
    FOREIGN KEY (position_id) REFERENCES positions (position_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- Начисления зарплаты по месяцам
CREATE TABLE salaries (
    salary_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    amount REAL NOT NULL,
    tax REAL NOT NULL,
    payout REAL NOT NULL,
    is_paid INTEGER NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees (employee_id)
);

-- 3. Тестовые данные

-- Роли
INSERT INTO roles (name) VALUES
    ('Бухгалтер'),
    ('Сотрудник');

-- Должности
INSERT INTO positions (name, base_salary) VALUES
    ('Бухгалтер', 70000),
    ('Программист', 120000),
    ('Менеджер', 55000);

-- Пользователи (role_id: 1 = Бухгалтер, 2 = Сотрудник)
INSERT INTO users (login, password, role_id) VALUES
    ('ivanova', 'buh123', 1),
    ('petrov', 'pass123', 2),
    ('sidorova', 'qwerty1', 2),
    ('kuznetsov', 'oleg2026', 2);

-- Сотрудники (position_id и user_id — номера из таблиц выше)
INSERT INTO employees (full_name, position_id, user_id) VALUES
    ('Иванова Анна Сергеевна', 1, 1),
    ('Петров Игорь Николаевич', 2, 2),
    ('Сидорова Мария Павловна', 3, 3),
    ('Кузнецов Олег Дмитриевич', 2, 4);

-- Зарплаты 
-- Сентябрь — выплачено (is_paid = 1)
INSERT INTO salaries (employee_id, month, amount, tax, payout, is_paid) VALUES
    (1, '2026-09', 70000, 9100, 60900, 1),
    (2, '2026-09', 120000, 15600, 104400, 1),
    (3, '2026-09', 55000, 7150, 47850, 1),
    (4, '2026-09', 120000, 15600, 104400, 1);

-- Октябрь — ещё не выплачено (is_paid = 0)
INSERT INTO salaries (employee_id, month, amount, tax, payout, is_paid) VALUES
    (1, '2026-10', 70000, 9100, 60900, 0),
    (2, '2026-10', 120000, 15600, 104400, 0),
    (3, '2026-10', 55000, 7150, 47850, 0),
    (4, '2026-10', 130000, 16900, 113100, 0);
