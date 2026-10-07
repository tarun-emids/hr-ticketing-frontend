from types import SimpleNamespace
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


EMPLOYEE_ID = "a8e27362-9ea7-41be-b6ba-bd63ef5fa17c"


class FakeQuery:
    def __init__(self):
        self.inserted = None

    def insert(self, values):
        self.inserted = values
        return self

    def select(self, *_args, **_kwargs):
        return self

    def execute(self):
        return SimpleNamespace(data=[{
            "id": "draft-123",
            "employee_id": self.inserted["employee_id"],
            "category": self.inserted["category"],
            "subject": self.inserted["subject"],
            "description": self.inserted["description"],
            "priority": self.inserted["priority"],
            "created_at": "2026-10-07T10:00:00Z",
            "updated_at": "2026-10-07T10:00:00Z",
            "attachment_path": None,
        }])


class FakeClient:
    def __init__(self):
        self.query = FakeQuery()

    def table(self, name):
        if name != "ticket_drafts":
            raise AssertionError(f"Unexpected table: {name}")
        return self.query


class CreateDraftTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.fake_client = FakeClient()

    def test_create_draft_saves_trimmed_content_and_returns_draft(self):
        with (
            patch("app.routers.drafts.get_user", return_value={"role": "employee"}),
            patch("app.routers.drafts.get_client", return_value=self.fake_client),
        ):
            response = self.client.post(
                "/api/drafts",
                json={
                    "employeeId": EMPLOYEE_ID,
                    "category": "Payroll",
                    "subject": "  Missing payslip  ",
                    "description": "  My latest payslip is not available.  ",
                    "priority": "High",
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            self.fake_client.query.inserted,
            {
                "employee_id": EMPLOYEE_ID,
                "category": "Payroll",
                "subject": "Missing payslip",
                "description": "My latest payslip is not available.",
                "priority": "High",
            },
        )
        self.assertEqual(
            response.json(),
            {
                "id": "draft-123",
                "employeeId": EMPLOYEE_ID,
                "category": "Payroll",
                "subject": "Missing payslip",
                "description": "My latest payslip is not available.",
                "priority": "High",
                "createdAt": "2026-10-07T10:00:00Z",
                "updatedAt": "2026-10-07T10:00:00Z",
                "attachment": None,
            },
        )

    def test_create_draft_uses_model_defaults(self):
        with (
            patch("app.routers.drafts.get_user", return_value={"role": "employee"}),
            patch("app.routers.drafts.get_client", return_value=self.fake_client),
        ):
            response = self.client.post(
                "/api/drafts",
                json={"employeeId": EMPLOYEE_ID},
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            self.fake_client.query.inserted,
            {
                "employee_id": EMPLOYEE_ID,
                "category": "Other",
                "subject": "",
                "description": "",
                "priority": "Medium",
            },
        )

    def test_create_draft_rejects_unknown_or_non_employee_users(self):
        for user in (None, {"role": "agent"}):
            with self.subTest(user=user), patch(
                "app.routers.drafts.get_user", return_value=user
            ):
                response = self.client.post(
                    "/api/drafts",
                    json={"employeeId": EMPLOYEE_ID},
                )

            self.assertEqual(response.status_code, 422)
            self.assertEqual(
                response.json()["detail"],
                "employeeId must belong to a known employee",
            )

    def test_create_draft_rejects_invalid_fields(self):
        invalid_payloads = (
            {"employeeId": EMPLOYEE_ID, "category": "Invalid"},
            {"employeeId": EMPLOYEE_ID, "priority": "Critical"},
            {"employeeId": EMPLOYEE_ID, "subject": "x" * 201},
        )
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                response = self.client.post("/api/drafts", json=payload)
                self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
