from services.user_s1ervice import ACCOUNTANT_ROLE_ID, EMPLOYEE_ROLE_ID
from ui import auth, menu


def main():
    while True:
        print("\n===== Учёт доходов и зарплат =====")
        print("1. Вход")
        print("2. Регистрация")
        print("0. Выход из программы")

        choice = input("Выберите действие: ")

        if choice == "1":
            user = auth.login_ui()
            # в зависимости от роли открываем нужное меню
            if user and user.role_id == ACCOUNTANT_ROLE_ID:
                menu.accountant_menu(user)
            elif user and user.role_id == EMPLOYEE_ROLE_ID:
                menu.employee_menu(user)
        elif choice == "2":
            auth.register_ui()
        elif choice == "0":
            print("До свидания!")
            break
        else:
            print("Нет такого пункта")


if __name__ == "__main__":
    main()
