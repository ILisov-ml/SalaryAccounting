from database.database import get_connection
from models.user import User


def _map(row) -> User:
    # кортеж из базы -> объект User
    return User(*row)


# все пользователи вместе с ролью
def get_all() -> list[User]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT u.user_id, u.login, u.password, u.role_id, r.name
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        ORDER BY u.user_id
    """)
    rows = cur.fetchall()
    conn.close()
    return [_map(r) for r in rows]


#  один пользователь по id
def get_by_id(user_id: int) -> User | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT u.user_id, u.login, u.password, u.role_id, r.name
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = ?
    """, (user_id,))
    row = cur.fetchone()
    conn.close()
    return _map(row) if row else None


#  пользователь по логину
def get_by_login(login: str) -> User | None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT u.user_id, u.login, u.password, u.role_id, r.name
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.login = ?
    """, (login,))
    row = cur.fetchone()
    conn.close()
    return _map(row) if row else None


#  возвращает id нового пользователя
def create(login: str, password: str, role_id: int) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO users (login, password, role_id)
        VALUES (?, ?, ?)
    """, (login, password, role_id))
    conn.commit()
    # id, который база только что выдала новой строке
    new_id = cur.lastrowid
    conn.close()
    return new_id


#  сменить пароль
def update_password(user_id: int, password: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE users
        SET password = ?
        WHERE user_id = ?
    """, (password, user_id))
    conn.commit()
    conn.close()


# Delete
def delete(user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM users
        WHERE user_id = ?
    """, (user_id,))
    conn.commit()
    conn.close()
