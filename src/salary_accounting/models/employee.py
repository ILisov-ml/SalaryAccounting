from dataclasses import dataclass


@dataclass
class Employee:
    employee_id: int
    full_name: str
    position_id: int
    user_id: int
    position_name: str | None = None
