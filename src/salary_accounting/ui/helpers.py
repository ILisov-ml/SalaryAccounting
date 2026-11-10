# Вспомогательные функции для ввода и вывода


def input_int(text: str) -> int:
    # повторяем пока нету целого числа
    while True:
        value = input(text).strip()
        try:
            return int(value)
        except ValueError:
            print("Нужно ввести целое число")


def input_float(text: str) -> float:
    # повторяем пока пользователь не введёт число
    while True:
        value = input(text).replace(" ", "").replace(",", ".")
        try:
            return float(value)
        except ValueError:
            print("Нужно ввести число")


def money(value: float) -> str:
    # 120000.0 в 120 000.00
    return f"{value:,.2f}".replace(",", " ")


def print_positions(positions):
    print(f"\n{'№':<4}{'Должность':<20}{'Оклад':>14}")
    print("-" * 38)
    for p in positions:
        print(f"{p.position_id:<4}{p.name:<20}{money(p.base_salary):>14}")


def print_employees(employees):
    print(f"\n{'№':<4}{'ФИО':<30}{'Должность':<15}")
    print("-" * 49)
    for e in employees:
        print(f"{e.employee_id:<4}{e.full_name:<30}{e.position_name:<15}")


def print_salaries(salaries):
    print(f"\n{'№':<4}{'Сотрудник':<28}{'Месяц':<9}{'Зарплата':>12}"
          f"{'Налог':>11}{'К выплате':>12}  Выплачено")
    print("-" * 87)
    for s in salaries:
        paid = "да" if s.is_paid else "нет"
        print(f"{s.salary_id:<4}{s.full_name:<28}{s.month:<9}{money(s.amount):>12}"
              f"{money(s.tax):>11}{money(s.payout):>12}  {paid}")
