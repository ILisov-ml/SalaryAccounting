from database.database import get_connection
from models.role import Role


def _map(row) -> Role:
    return Role(*row)


# Read: все роли
def get_all() -> list[Role]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT role_id, name
        FROM roles
        ORDER BY role_id
    """)
    rows = cur.fetchall()
    conn.close()
    return [_map(r) for r in rows]


#  одна роль по id
def get_by_id(role_id: int) -> Role | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT role_id, name
        FROM roles
        WHERE role_id = ?
    """, (role_id,))
    row = cur.fetchone()
    conn.close()
    return _map(row) if row else None
