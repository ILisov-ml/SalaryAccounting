import csv
import json
import xml.etree.ElementTree as ET
from pathlib import Path

import yaml

from database.database import get_connection

OUT_DIR = Path(__file__).resolve().parents[2] / "out"   #создаем папку  аут поднимаясь вверх
OUT_DIR.mkdir(parents=True, exist_ok=True)  #проверка есть или нет создаем папку


def fetch_employees() -> list[dict]:
    query = """
        SELECT e.employee_id, e.full_name,
               p.position_id, p.name, p.base_salary,
               u.user_id, u.login, r.name
        FROM employees e
        JOIN positions p ON e.position_id = p.position_id
        JOIN users u ON e.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        ORDER BY e.employee_id
    """
    with get_connection() as conn:
        rows = conn.execute(query).fetchall()
    result = []
    for row in rows:
        result.append({
            "employee_id": row[0],
            "full_name": row[1],
            "position": {
                "position_id": row[2],
                "name": row[3],
                "base_salary": row[4],
            },
            "user": {
                "user_id": row[5],
                "login": row[6],
                "role": row[7],
            },
        })
    return result


def save_json(data: list[dict], path: Path):
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)    #так dump - в json, ensu/// - чтобы каша из р. букв не получилась(перекодировкой) indent отступ


def save_yaml(data: list[dict], path: Path, root_key: str = "employees"):       #рут - список в ключ чтобы выглядело акуратно
    with path.open("w", encoding="utf-8") as f:
        yaml.safe_dump({root_key: data}, f, allow_unicode=True, sort_keys=False)    # ало... - опять запрет кодировки сорткей чтобы кл добавлялись по тому как добавили


def flatten_dict(item: dict, prefix: str = "") -> dict:         #функция чтобы в квс переводилось 1 иф словарь да/нет и повторяет себя 2й  если значение то вывод через ; элсе оставим как есть
    flat = {}
    for key, value in item.items():
        full_key = f"{prefix}{key}"
        if isinstance(value, dict):
            flat.update(flatten_dict(value, f"{full_key}."))
        elif isinstance(value, list):
            flat[full_key] = "; ".join(str(v) for v in value)
        else:
            flat[full_key] = value
    return flat


def save_csv(data: list[dict], path: Path):
    rows = [flatten_dict(item) for item in data]
    fieldnames = list(rows[0].keys()) if rows else []

    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_xml(parent: ET.Element, value, item_tag: str = "item"):
    if isinstance(value, dict):
        for key, val in value.items():
            child = ET.SubElement(parent, str(key))
            build_xml(child, val, item_tag)
    elif isinstance(value, list):
        for elem in value:
            child = ET.SubElement(parent, item_tag)
            build_xml(child, elem, item_tag)
    else:
        parent.text = "" if value is None else str(value)


def save_xml(data: list[dict], path: Path, root_tag: str = "employees", item_tag: str = "employee"):
    root = ET.Element(root_tag)
    build_xml(root, data, item_tag=item_tag)
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(path, encoding="utf-8", xml_declaration=True)


def main():
    employees = fetch_employees()
    save_json(employees, OUT_DIR / "data.json")
    save_csv(employees, OUT_DIR / "data.csv")
    save_xml(employees, OUT_DIR / "data.xml")
    save_yaml(employees, OUT_DIR / "data.yaml")
    print(f"Готово! Выгружено записей: {len(employees)} в {OUT_DIR}")


if __name__ == "__main__":
    main()