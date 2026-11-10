from dataclasses import dataclass


@dataclass
class User:
    user_id: int
    login: str
    password: str
    role_id: int
    role_name: str | None = None
