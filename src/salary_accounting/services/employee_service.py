from models.employee import Employee
from repositories import employee_repository, position_repository, salary_repository, user_repository


def get_all() -> list[Employee]:
    return employee_repository.get_all()


# Сотрудник, который вошёл в систему
def get_by_user_id(user_id: int) -> Employee | None:
    return employee_repository.get_by_user_id(user_id)


# Перевод сотрудника на другую должность
def change_position(employee_id: int, position_id: int):
    employee = employee_repository.get_by_id(employee_id)
    if not employee:
        raise Exception("Сотрудник не найден")
    if not position_repository.get_by_id(position_id):
        raise Exception("Должность не найдена")
    if employee.position_id == position_id:
        raise Exception("Сотрудник уже работает на этой должности")

    employee_repository.update_position(employee_id, position_id)


# Удаление сотрудника вместе с его логином
def delete_employee(employee_id: int):
    employee = employee_repository.get_by_id(employee_id)
    if not employee:
        raise Exception("Сотрудник не найден")
    # историю начислений терять нельзя
    if salary_repository.get_by_employee(employee_id):
        raise Exception("У сотрудника есть начисления, удалить нельзя")

    employee_repository.delete(employee_id)
    user_repository.delete(employee.user_id)
