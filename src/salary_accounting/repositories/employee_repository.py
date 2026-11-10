from database.database import get_connection
from models.employee import Employee


def _map(row) -> Employee:
    return Employee(*row)


#  все сотрудники c их должностью
def get_all() -> list[Employee]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT e.employee_id, e.full_name, e.position_id, e.user_id, p.name
        FROM employees e
        JOIN positions p ON e.position_id = p.position_id
        ORDER BY e.full_name
    """)
    rows = cur.fetchall()
    conn.close()
    return [_map(r) for r in rows]


#  один сотрудник по id
def get_by_id(employee_id: int) -> Employee | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT e.employee_id, e.full_name, e.position_id, e.user_id, p.name
        FROM employees e
        JOIN positions p ON e.position_id = p.position_id
        WHERE e.employee_id = ?
    """, (employee_id,))
    row = cur.fetchone()
    conn.close()
    return _map(row) if row else None


#  сотрудник по id пользователя
def get_by_user_id(user_id: int) -> Employee | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT e.employee_id, e.full_name, e.position_id, e.user_id, p.name
        FROM employees e
        JOIN positions p ON e.position_id = p.position_id
        WHERE e.user_id = ?
    """, (user_id,))
    row = cur.fetchone()
    conn.close()
    return _map(row) if row else None


# сотрудники на определённой должности
def get_by_position(position_id: int) -> list[Employee]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT e.employee_id, e.full_name, e.position_id, e.user_id, p.name
        FROM employees e
        JOIN positions p ON e.position_id = p.position_id
        WHERE e.position_id = ?
    """, (position_id,))
    rows = cur.fetchall()
    conn.close()
    return [_map(r) for r in rows]


# Create
def create(full_name: str, position_id: int, user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO employees (full_name, position_id, user_id)
        VALUES (?, ?, ?)
    """, (full_name, position_id, user_id))
    conn.commit()
    conn.close()


# сменить должность
def update_position(employee_id: int, position_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE employees
        SET position_id = ?
        WHERE employee_id = ?
    """, (position_id, employee_id))
    conn.commit()
    conn.close()


# Delete
def delete(employee_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM employees
        WHERE employee_id = ?
    """, (employee_id,))
    conn.commit()
    conn.close()
