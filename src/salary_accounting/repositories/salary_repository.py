from database.database import get_connection
from models.salary import Salary


def _map(row) -> Salary:
    # кортеж из базы -> объект Salary
    return Salary(*row)


# общая часть всех SELECT: начисление + ФИО сотрудника
SELECT_SALARY = """
    SELECT s.salary_id, s.employee_id, s.month, s.amount,
           s.tax, s.payout, s.is_paid, e.full_name
    FROM salaries s
    JOIN employees e ON s.employee_id = e.employee_id
"""


# Read: все начисления
def get_all() -> list[Salary]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SELECT_SALARY + " ORDER BY s.month DESC, e.full_name")
    rows = cur.fetchall()
    conn.close()
    return [_map(r) for r in rows]


#  одно начисление по id
def get_by_id(salary_id: int) -> Salary | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SELECT_SALARY + " WHERE s.salary_id = ?", (salary_id,))
    row = cur.fetchone()
    conn.close()
    return _map(row) if row else None


# все начисления за месяц
def get_by_month(month: str) -> list[Salary]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SELECT_SALARY + " WHERE s.month = ? ORDER BY e.full_name", (month,))
    rows = cur.fetchall()
    conn.close()
    return [_map(r) for r in rows]


# история начислений одного сотрудника
def get_by_employee(employee_id: int) -> list[Salary]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SELECT_SALARY + " WHERE s.employee_id = ? ORDER BY s.month DESC", (employee_id,))
    rows = cur.fetchall()
    conn.close()
    return [_map(r) for r in rows]


#  начисление сотрудника за конкретный месяц
def get_by_employee_and_month(employee_id: int, month: str) -> Salary | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(SELECT_SALARY + " WHERE s.employee_id = ? AND s.month = ?", (employee_id, month))
    row = cur.fetchone()
    conn.close()
    return _map(row) if row else None


# Create
def create(employee_id: int, month: str, amount: float, tax: float, payout: float):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO salaries (employee_id, month, amount, tax, payout, is_paid)
        VALUES (?, ?, ?, ?, ?, 0)
    """, (employee_id, month, amount, tax, payout))
    conn.commit()
    conn.close()


#  отметить как выплаченное
def mark_paid(salary_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE salaries
        SET is_paid = 1
        WHERE salary_id = ?
    """, (salary_id,))
    conn.commit()
    conn.close()


# Delete
def delete(salary_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM salaries
        WHERE salary_id = ?
    """, (salary_id,))
    conn.commit()
    conn.close()
