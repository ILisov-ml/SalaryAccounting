import csv
import io
import json
import xml.etree.ElementTree as ET

import yaml

from database.database import get_connection


# ===== Универсальные сериализаторы (JSON, CSV, XML, YAML) =====

def flatten_dict(item: dict, prefix: str = "") -> dict:
    """Расплющивает вложенные словари и списки для табличного CSV."""
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


def build_xml(parent: ET.Element, value, item_tag: str = "item"):
    """Рекурсивно строит XML-дерево из произвольных словарей и списков."""
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


def to_json_bytes(records: list[dict]) -> bytes:
    return json.dumps(records, ensure_ascii=False, indent=2).encode("utf-8")


def to_csv_bytes(records: list[dict]) -> bytes:
    rows = [flatten_dict(item) for item in records]
    fieldnames = []
    for r in rows:
        for k in r.keys():
            if k not in fieldnames:
                fieldnames.append(k)

    buf = io.StringIO()
    if fieldnames:
        writer = csv.DictWriter(buf, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return buf.getvalue().encode("utf-8-sig")


def to_xml_bytes(records: list[dict], root_tag: str = "employees", item_tag: str = "employee") -> bytes:
    root = ET.Element(root_tag)
    build_xml(root, records, item_tag=item_tag)
    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    buf = io.BytesIO()
    tree.write(buf, encoding="utf-8", xml_declaration=True)
    return buf.getvalue()


def to_yaml_bytes(records: list[dict], root_key: str = "employees") -> bytes:
    text = yaml.safe_dump({root_key: records}, allow_unicode=True, sort_keys=False)
    return text.encode("utf-8")


FORMAT_MEDIA_TYPES = {
    "json": "application/json; charset=utf-8",
    "csv": "text/csv; charset=utf-8",
    "xml": "application/xml; charset=utf-8",
    "yaml": "application/x-yaml; charset=utf-8",
}


def serialize_records(
    records: list[dict],
    fmt: str,
    root_tag: str = "employees",
    item_tag: str = "employee",
) -> tuple[bytes, str]:
    fmt = fmt.lower().strip()
    if fmt not in FORMAT_MEDIA_TYPES:
        raise ValueError("Неподдерживаемый формат. Доступны: json, csv, xml, yaml")

    if fmt == "json":
        return to_json_bytes(records), FORMAT_MEDIA_TYPES["json"]
    if fmt == "csv":
        return to_csv_bytes(records), FORMAT_MEDIA_TYPES["csv"]
    if fmt == "xml":
        return to_xml_bytes(records, root_tag=root_tag, item_tag=item_tag), FORMAT_MEDIA_TYPES["xml"]
    return to_yaml_bytes(records, root_key=root_tag), FORMAT_MEDIA_TYPES["yaml"]


# ===== Выборка таблицы employees со связями из salary.db =====

def fetch_employees_nested() -> list[dict]:
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

    return [
        {
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
        }
        for row in rows
    ]
