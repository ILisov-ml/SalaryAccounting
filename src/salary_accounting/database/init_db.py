import sqlite3
from pathlib import Path

# Пути считаем от папки, где лежит этот файл
BASE_DIR = Path(__file__).parent
SCHEMA_PATH = BASE_DIR / "schema.sql"
DB_PATH = BASE_DIR / "salary.db"


def init_db():
    """Создаёт базу данных salary.db по скрипту schema.sql."""
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        script = f.read()

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.executescript(script)
        conn.commit()
    finally:
        conn.close()

    print(f"База данных создана: {DB_PATH}")


if __name__ == "__main__":
    init_db()