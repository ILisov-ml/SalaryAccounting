from services import position_service, employee_service, salary_service, user_service
from ui.helpers import (input_int, input_float, money,
                        print_positions, print_employees, print_salaries)


#  Меню бухгалтера

def accountant_menu(user):
    while True:
        print(f"\n===== Бухгалтер ({user.login}) =====")
        print("1. Должности")
        print("2. Сотрудники")
        print("3. Зарплата")
        print("4. Сменить пароль")
        print("0. Выйти из аккаунта")

        choice = input("Выберите действие: ")

        if choice == "1":
            positions_menu()
        elif choice == "2":
            employees_menu()
        elif choice == "3":
            salaries_menu()
        elif choice == "4":
            change_password_ui(user)
        elif choice == "0":
            break
        else:
            print("Нет такого пункта")


def positions_menu():
    while True:
        print("\n----- Должности -----")
        print("1. Список должностей")
        print("2. Добавить должность")
        print("3. Изменить оклад")
        print("4. Удалить должность")
        print("0. Назад")

        choice = input("Выберите действие: ")

        try:
            if choice == "1":
                print_positions(position_service.get_all())
            elif choice == "2":
                name = input("Название: ")
                base_salary = input_float("Оклад: ")
                position_service.create_position(name, base_salary)
                print("Должность добавлена")
            elif choice == "3":
                print_positions(position_service.get_all())
                position_id = input_int("Номер должности: ")
                base_salary = input_float("Новый оклад: ")
                position_service.change_salary(position_id, base_salary)
                print("Оклад изменён")
            elif choice == "4":
                print_positions(position_service.get_all())
                position_id = input_int("Номер должности: ")
                position_service.delete_position(position_id)
                print("Должность удалена")
            elif choice == "0":
                break
            else:
                print("Нет такого пункта")
        except Exception as e:
            print(f"Ошибка: {e}")


def employees_menu():
    while True:
        print("\n----- Сотрудники -----")
        print("1. Список сотрудников")
        print("2. Добавить сотрудника")
        print("3. Перевести на другую должность")
        print("4. Удалить сотрудника")
        print("0. Назад")

        choice = input("Выберите действие: ")

        try:
            if choice == "1":
                print_employees(employee_service.get_all())
            elif choice == "2":
                full_name = input("ФИО: ")
                login = input("Логин для сотрудника: ")
                password = input("Пароль для сотрудника: ")
                print_positions(position_service.get_all())
                position_id = input_int("Номер должности: ")
                user_service.register_employee(login, password, full_name, position_id)
                print("Сотрудник добавлен")
            elif choice == "3":
                print_employees(employee_service.get_all())
                employee_id = input_int("Номер сотрудника: ")
                print_positions(position_service.get_all())
                position_id = input_int("Номер новой должности: ")
                employee_service.change_position(employee_id, position_id)
                print("Сотрудник переведён")
            elif choice == "4":
                print_employees(employee_service.get_all())
                employee_id = input_int("Номер сотрудника: ")
                employee_service.delete_employee(employee_id)
                print("Сотрудник удалён")
            elif choice == "0":
                break
            else:
                print("Нет такого пункта")
        except Exception as e:
            print(f"Ошибка: {e}")


def salaries_menu():
    while True:
        print("\n----- Зарплата -----")
        print("1. Начислить зарплату сотруднику")
        print("2. Начислить всем по окладу за месяц")
        print("3. Отметить выплату")
        print("4. Удалить ошибочное начисление")
        print("5. Отчёт за месяц")
        print("0. Назад")

        choice = input("Выберите действие: ")

        try:
            if choice == "1":
                print_employees(employee_service.get_all())
                employee_id = input_int("Номер сотрудника: ")
                month = input("Месяц (ГГГГ-ММ): ")
                amount = input_float("Сумма зарплаты: ")
                salary_service.accrue_salary(employee_id, month, amount)
                print(f"Начислено. Налог: {money(salary_service.calculate_tax(amount))}, "
                      f"к выплате: {money(salary_service.calculate_payout(amount))}")
            elif choice == "2":
                month = input("Месяц (ГГГГ-ММ): ")
                count = salary_service.accrue_for_all(month)
                print(f"Начислено сотрудникам: {count}")
            elif choice == "3":
                month = input("Месяц (ГГГГ-ММ): ")
                print_salaries(salary_service.get_month_report(month))
                salary_id = input_int("Номер начисления: ")
                salary_service.mark_paid(salary_id)
                print("Отмечено как выплаченное")
            elif choice == "4":
                month = input("Месяц (ГГГГ-ММ): ")
                print_salaries(salary_service.get_month_report(month))
                salary_id = input_int("Номер начисления: ")
                salary_service.delete_salary(salary_id)
                print("Начисление удалено")
            elif choice == "5":
                month_report_ui()
            elif choice == "0":
                break
            else:
                print("Нет такого пункта")
        except Exception as e:
            print(f"Ошибка: {e}")


def month_report_ui():
    month = input("Месяц (ГГГГ-ММ): ")
    salaries = salary_service.get_month_report(month)

    if not salaries:
        print("За этот месяц начислений нет")
        return

    print_salaries(salaries)
    # итоги по месяцу
    total_amount = sum(s.amount for s in salaries)
    total_tax = sum(s.tax for s in salaries)
    total_payout = sum(s.payout for s in salaries)
    print(f"\nИтого начислено: {money(total_amount)}")
    print(f"Итого налог:     {money(total_tax)}")
    print(f"Итого к выплате: {money(total_payout)}")


# Меню сотрудника

def employee_menu(user):
    employee = employee_service.get_by_user_id(user.user_id)
    if not employee:
        print("Для этого пользователя не найдена карточка сотрудника")
        return

    while True:
        print(f"\n===== Сотрудник: {employee.full_name} ({employee.position_name}) =====")
        print("1. История моих начислений")
        print("2. Сменить пароль")
        print("0. Выйти из аккаунта")

        choice = input("Выберите действие: ")

        if choice == "1":
            salaries = salary_service.get_employee_history(employee.employee_id)
            if salaries:
                print_salaries(salaries)
            else:
                print("Начислений пока нет")
        elif choice == "2":
            change_password_ui(user)
        elif choice == "0":
            break
        else:
            print("Нет такого пункта")


# Общее

def change_password_ui(user):
    try:
        old_password = input("Старый пароль: ")
        new_password = input("Новый пароль: ")
        user_service.change_password(user.user_id, old_password, new_password)
        print("Пароль изменён")
    except Exception as e:
        print(f"Ошибка: {e}")
