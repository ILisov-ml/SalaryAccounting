from dataclasses import dataclass


@dataclass
class Salary:
    salary_id: int
    employee_id: int
    month: str
    amount: float
    tax: float
    payout: float
    is_paid: int
    full_name: str | None = None
