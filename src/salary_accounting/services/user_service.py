from models.user import User
from repositories import user_repository, employee_repository, position_repository

# номера ролей из таблицы roles
ACCOUNTANT_ROLE_ID = 1
EMPLOYEE_ROLE_ID = 2


# Вход
def authenticate(login: str, password: str) -> User | None:
    login = login.strip()
    password = password.strip()

    if not login or not password:
        return None

    user = user_repository.get_by_login(login)

    # пользователь не найден или пароль не совпадает
    if not user or user.password != password:
        return None

    return user


# Регистрация сотрудника
def register_employee(login: str, password: str, full_name: str, position_id: int):
    login = login.strip()
    password = password.strip()
    full_name = full_name.strip()

    if not login:
        raise Exception("Логин не может быть пустым")
    if " " in login:
        raise Exception("Логин не должен содержать пробелов")
    if len(password) < 4:
        raise Exception("Пароль должен быть не короче 4 символов")
    if not full_name:
        raise Exception("ФИО не может быть пустым")
    if user_repository.get_by_login(login):
        raise Exception(f"Логин '{login}' уже занят")
    if not position_repository.get_by_id(position_id):
        raise Exception("Должность не найдена")

    user_id = user_repository.create(login, password, EMPLOYEE_ROLE_ID)
    employee_repository.create(full_name, position_id, user_id)


# Смена пароля
def change_password(user_id: int, old_password: str, new_password: str):
    user = user_repository.get_by_id(user_id)
    if not user:
        raise Exception("Пользователь не найден")
    if user.password != old_password:
        raise Exception("Старый пароль введён неверно")

    new_password = new_password.strip()
    if len(new_password) < 4:
        raise Exception("Пароль должен быть не короче 4 символов")

    user_repository.update_password(user_id, new_password)
