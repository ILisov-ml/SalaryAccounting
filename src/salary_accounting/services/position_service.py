from repositories import position_repository, employee_repository


def get_all():
    return position_repository.get_all()


def create_position(name: str, base_salary: float):
    name = name.strip()

    if not name:
        raise Exception("Название должности не может быть пустым")
    if base_salary <= 0:
        raise Exception("Оклад должен быть больше 0")

    # проверка должности нет
    for p in position_repository.get_all():
        if p.name.lower() == name.lower():
            raise Exception("Такая должность уже существует")

    position_repository.create(name, base_salary)


def change_salary(position_id: int, base_salary: float):
    if not position_repository.get_by_id(position_id):
        raise Exception("Должность не найдена")
    if base_salary <= 0:
        raise Exception("Оклад должен быть больше 0")

    position_repository.update_salary(position_id, base_salary)


def delete_position(position_id: int):
    if not position_repository.get_by_id(position_id):
        raise Exception("Должность не найдена")
    # нельзя удалить должность, на которой кто-то работает
    if employee_repository.get_by_position(position_id):
        raise Exception("На этой должности есть сотрудники, удалить нельзя")

    position_repository.delete(position_id)