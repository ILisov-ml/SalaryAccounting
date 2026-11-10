from models.user import User
from services import user_service, position_service
from ui.helpers import input_int, print_positions


def login_ui() -> User | None:
    print("\n===== Вход в систему =====")
    login = input("Логин: ")
    password = input("Пароль: ")

    user = user_service.authenticate(login, password)
    if not user:
        print("Неверный логин или пароль")
        return None

    print(f"Добро пожаловать, {user.login} ({user.role_name})")
    return user


def register_ui():
    print("\n===== Регистрация сотрудника =====")
    try:
        full_name = input("ФИО: ")
        login = input("Придумайте логин: ")
        password = input("Придумайте пароль: ")

        print_positions(position_service.get_all())
        position_id = input_int("Номер вашей должности: ")

        user_service.register_employee(login, password, full_name, position_id)
        print("Регистрация прошла успешно, теперь можно войти")
    except Exception as e:
        print(f"Ошибка: {e}")
