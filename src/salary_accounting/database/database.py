import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "salary.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    # проверка ключей внешних
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn
