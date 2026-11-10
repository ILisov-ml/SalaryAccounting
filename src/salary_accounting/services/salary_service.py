from datetime import datetime

from models.salary import Salary
from repositories import salary_repository, employee_repository, position_repository

# ставка налога 13 процентов
TAX_RATE = 0.13


def calculate_tax(amount: float) -> float:
    return round(amount * TAX_RATE, 2)


def calculate_payout(amount: float) -> float:
    return round(amount - calculate_tax(amount), 2)


# Проверка формата месяца
def check_month(month: str) -> str:
    month = month.strip()
    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        raise Exception("Месяц нужно ввести в формате ГГГГ-ММ, например 2026-11")
    return month


# Начисление зарплаты сотруднику за месяц
def accrue_salary(employee_id: int, month: str, amount: float):
    if not employee_repository.get_by_id(employee_id):
        raise Exception("Сотрудник не найден")

    month = check_month(month)

    if amount <= 0:
        raise Exception("Зарплата должна быть больше 0")
    # за один месяц сотруднику начисляют только один раз
    if salary_repository.get_by_employee_and_month(employee_id, month):
        raise Exception("За этот месяц сотруднику уже начислено")

    tax = calculate_tax(amount)
    payout = calculate_payout(amount)
    salary_repository.create(employee_id, month, amount, tax, payout)


# Начисление всем сотрудникам по окладу их должности
def accrue_for_all(month: str) -> int:
    month = check_month(month)
    count = 0

    for e in employee_repository.get_all():
        # кому уже начислено за этот месяц — пропускаем
        if salary_repository.get_by_employee_and_month(e.employee_id, month):
            continue
        amount = position_repository.get_by_id(e.position_id).base_salary
        salary_repository.create(
            e.employee_id, month, amount,
            calculate_tax(amount), calculate_payout(amount)
        )
        count += 1

    return count


# Отметка о выплате
def mark_paid(salary_id: int):
    salary = salary_repository.get_by_id(salary_id)
    if not salary:
        raise Exception("Начисление не найдено")
    if salary.is_paid:
        raise Exception("Это начисление уже выплачено")

    salary_repository.mark_paid(salary_id)


# Удаление ошибочного начисления (только невыплаченного)
def delete_salary(salary_id: int):
    salary = salary_repository.get_by_id(salary_id)
    if not salary:
        raise Exception("Начисление не найдено")
    if salary.is_paid:
        raise Exception("Выплаченное начисление удалить нельзя")

    salary_repository.delete(salary_id)


# Отчёт за месяц
def get_month_report(month: str) -> list[Salary]:
    month = check_month(month)
    return salary_repository.get_by_month(month)


# История начислений одного сотрудника
def get_employee_history(employee_id: int) -> list[Salary]:
    return salary_repository.get_by_employee(employee_id)
