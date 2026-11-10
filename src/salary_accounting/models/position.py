from dataclasses import dataclass


@dataclass
class Position:
    position_id: int
    name: str
    base_salary: float