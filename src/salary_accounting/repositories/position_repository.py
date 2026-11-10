from database.database import get_connection
from models.position import Position


def _map(row) -> Position:
    return Position(*row)


# все должности
def get_all() -> list[Position]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT position_id, name, base_salary
        FROM positions
        ORDER BY name
    """)
    rows = cur.fetchall()
    conn.close()
    return [_map(r) for r in rows]


#  одна должность по id
def get_by_id(position_id: int) -> Position | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT position_id, name, base_salary
        FROM positions
        WHERE position_id = ?
    """, (position_id,))
    row = cur.fetchone()
    conn.close()
    return _map(row) if row else None


# Create
def create(name: str, base_salary: float):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO positions (name, base_salary)
        VALUES (?, ?)
    """, (name, base_salary))
    conn.commit()
    conn.close()


# изменить оклад
def update_salary(position_id: int, base_salary: float):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE positions
        SET base_salary = ?
        WHERE position_id = ?
    """, (base_salary, position_id))
    conn.commit()
    conn.close()


# Delete
def delete(position_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM positions
        WHERE position_id = ?
    """, (position_id,))
    conn.commit()
    conn.close()