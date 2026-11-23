import sys
import threading
import webbrowser
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# Чтобы импорты services / repositories / models работали при любом способе запуска
APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from database.database import get_connection  # noqa: E402
from repositories import employee_repository, position_repository, user_repository  # noqa: E402
from services import (  # noqa: E402
    employee_service,
    export_service,
    position_service,
    salary_service,
    user_service,
)

app = FastAPI(title="SalaryAccounting API")


def ensure_approval_column():
    with get_connection() as conn:
        cols = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "is_approved" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN is_approved INTEGER NOT NULL DEFAULT 1")
            conn.commit()


def is_user_approved(user_id: int) -> bool:
    ensure_approval_column()
    with get_connection() as conn:
        row = conn.execute("SELECT is_approved FROM users WHERE user_id = ?", (user_id,)).fetchone()
        return bool(row[0]) if row else False


def set_user_approved(user_id: int, approved: int):
    ensure_approval_column()
    with get_connection() as conn:
        conn.execute("UPDATE users SET is_approved = ? WHERE user_id = ?", (approved, user_id))
        conn.commit()


def sync_role_by_position(user_id: int, position_id: int):
    pos = position_repository.get_by_id(position_id)
    if not pos:
        return
    role_id = (
        user_service.ACCOUNTANT_ROLE_ID
        if pos.name.strip().lower() == "бухгалтер"
        else user_service.EMPLOYEE_ROLE_ID
    )
    with get_connection() as conn:
        conn.execute("UPDATE users SET role_id = ? WHERE user_id = ?", (role_id, user_id))
        conn.commit()


ensure_approval_column()


# ===== Pydantic-схемы =====

class LoginRequest(BaseModel):
    login: str
    password: str


class RegisterRequest(BaseModel):
    login: str
    password: str
    full_name: str
    position_id: int


class ChangePasswordRequest(BaseModel):
    user_id: int
    old_password: str
    new_password: str


class CreatePositionRequest(BaseModel):
    name: str
    base_salary: float


class UpdatePositionSalaryRequest(BaseModel):
    base_salary: float


class ChangeEmployeePositionRequest(BaseModel):
    position_id: int


class ApproveEmployeeRequest(BaseModel):
    position_id: int | None = None


class AccrueSalaryRequest(BaseModel):
    employee_id: int
    month: str
    amount: float


class AccrueAllRequest(BaseModel):
    month: str


# ===== Авторизация =====

@app.post("/api/auth/login")
def login(payload: LoginRequest):
    user = user_service.authenticate(payload.login, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    if not is_user_approved(user.user_id):
        raise HTTPException(
            status_code=403,
            detail="Заявка на регистрацию ожидает утверждения должности бухгалтером",
        )

    emp = employee_service.get_by_user_id(user.user_id)
    emp_data = None
    if emp:
        emp_data = {
            "employee_id": emp.employee_id,
            "full_name": emp.full_name,
            "position_id": emp.position_id,
            "user_id": emp.user_id,
            "position_name": emp.position_name or "",
        }

    return {
        "user_id": user.user_id,
        "login": user.login,
        "role_id": user.role_id,
        "role_name": user.role_name or "Сотрудник",
        "employee": emp_data,
    }


@app.post("/api/auth/register")
def register(payload: RegisterRequest):
    try:
        user_service.register_employee(
            payload.login, payload.password, payload.full_name, payload.position_id
        )
        created = user_repository.get_by_login(payload.login.strip())
        if created:
            set_user_approved(created.user_id, 0)
        return {"ok": True, "pending_approval": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/auth/change-password")
def change_password(payload: ChangePasswordRequest):
    try:
        user_service.change_password(
            payload.user_id, payload.old_password, payload.new_password
        )
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ===== Должности =====

@app.get("/api/positions")
def get_positions():
    return [
        {
            "position_id": p.position_id,
            "name": p.name,
            "base_salary": p.base_salary,
        }
        for p in position_service.get_all()
    ]


@app.post("/api/positions")
def create_position(payload: CreatePositionRequest):
    try:
        position_service.create_position(payload.name, payload.base_salary)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.patch("/api/positions/{position_id}")
def update_position_salary(position_id: int, payload: UpdatePositionSalaryRequest):
    try:
        position_service.change_salary(position_id, payload.base_salary)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.delete("/api/positions/{position_id}")
def delete_position(position_id: int):
    try:
        position_service.delete_position(position_id)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ===== Сотрудники =====

@app.get("/api/employees")
def get_employees():
    ensure_approval_column()
    positions_map = {p.position_id: p for p in position_repository.get_all()}
    with get_connection() as conn:
        approved_map = {
            row[0]: bool(row[1])
            for row in conn.execute("SELECT user_id, is_approved FROM users").fetchall()
        }

    result = []
    for e in employee_service.get_all():
        user = user_repository.get_by_id(e.user_id)
        pos = positions_map.get(e.position_id)
        result.append(
            {
                "employee_id": e.employee_id,
                "full_name": e.full_name,
                "position_id": e.position_id,
                "user_id": e.user_id,
                "login": user.login if user else "",
                "position_name": e.position_name or (pos.name if pos else "—"),
                "base_salary": pos.base_salary if pos else 0,
                "is_approved": approved_map.get(e.user_id, True),
            }
        )
    return result


@app.post("/api/employees/{employee_id}/approve")
def approve_employee(employee_id: int, payload: ApproveEmployeeRequest):
    emp = employee_repository.get_by_id(employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")

    target_pos_id = payload.position_id if payload.position_id is not None else emp.position_id
    if target_pos_id != emp.position_id:
        try:
            employee_service.change_position(employee_id, target_pos_id)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    set_user_approved(emp.user_id, 1)
    sync_role_by_position(emp.user_id, target_pos_id)
    return {"ok": True}


@app.patch("/api/employees/{employee_id}/position")
def change_employee_position(employee_id: int, payload: ChangeEmployeePositionRequest):
    try:
        employee_service.change_position(employee_id, payload.position_id)
        emp = employee_repository.get_by_id(employee_id)
        if emp:
            sync_role_by_position(emp.user_id, payload.position_id)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/export/employees")
def export_employees(
    fmt: str = Query("json", pattern="^(json|csv|xml|yaml)$"),
    x_user_id: int | None = Header(default=None, alias="X-User-Id"),
):
    if x_user_id is None:
        raise HTTPException(status_code=403, detail="Экспорт доступен только бухгалтеру")
    user = user_repository.get_by_id(x_user_id)
    if not user or user.role_id != user_service.ACCOUNTANT_ROLE_ID:
        raise HTTPException(status_code=403, detail="Экспорт доступен только бухгалтеру")

    records = export_service.fetch_employees_nested()
    content, media_type = export_service.serialize_records(
        records, fmt, root_tag="employees", item_tag="employee"
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="employees.{fmt}"'},
    )


@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: int):
    emp = employee_repository.get_by_id(employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Сотрудник не найден")
    try:
        with get_connection() as conn:
            conn.execute("DELETE FROM salaries WHERE employee_id = ?", (employee_id,))
            conn.commit()
        employee_repository.delete(employee_id)
        user_repository.delete(emp.user_id)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ===== Зарплаты =====

@app.get("/api/salaries")
def get_month_report(month: str = Query(..., description="Месяц в формате ГГГГ-ММ")):
    try:
        salaries = salary_service.get_month_report(month)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    employees_map = {e.employee_id: e for e in employee_service.get_all()}
    return [
        {
            "salary_id": s.salary_id,
            "employee_id": s.employee_id,
            "month": s.month,
            "amount": s.amount,
            "tax": s.tax,
            "payout": s.payout,
            "is_paid": s.is_paid,
            "employee_name": s.full_name or (employees_map[s.employee_id].full_name if s.employee_id in employees_map else "—"),
            "position_name": employees_map[s.employee_id].position_name if s.employee_id in employees_map else "—",
        }
        for s in salaries
    ]


@app.get("/api/employees/{employee_id}/salaries")
def get_employee_history(employee_id: int):
    salaries = salary_service.get_employee_history(employee_id)
    return [
        {
            "salary_id": s.salary_id,
            "employee_id": s.employee_id,
            "month": s.month,
            "amount": s.amount,
            "tax": s.tax,
            "payout": s.payout,
            "is_paid": s.is_paid,
        }
        for s in salaries
    ]


@app.post("/api/salaries")
def accrue_salary(payload: AccrueSalaryRequest):
    try:
        salary_service.accrue_salary(payload.employee_id, payload.month, payload.amount)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/salaries/accrue-all")
def accrue_for_all(payload: AccrueAllRequest):
    try:
        count = salary_service.accrue_for_all(payload.month)
        return {"count": count}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/salaries/{salary_id}/pay")
def mark_paid(salary_id: int):
    try:
        salary_service.mark_paid(salary_id)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.delete("/api/salaries/{salary_id}")
def delete_salary(salary_id: int):
    try:
        salary_service.delete_salary(salary_id)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# Раздача фронтенда (после всех /api роутов)
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


def main():
    url = "http://127.0.0.1:8000"
    threading.Timer(0.9, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
