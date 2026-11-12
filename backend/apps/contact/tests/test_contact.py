from apps.contact.models import ContactEnquiry
from apps.core.tests.base import APIBase

PAYLOAD = {"name": "Visitor", "email": "visitor@test.local", "subject": "Question", "message": "How do I track my grievance?"}


class ContactTests(APIBase):
    def test_public_can_submit_enquiry(self):
        res = self.client.post("/api/v1/contact/", PAYLOAD, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(ContactEnquiry.objects.count(), 1)

    def test_validation(self):
        res = self.client.post("/api/v1/contact/", {**PAYLOAD, "email": "bad", "message": "hi"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.data)
        self.assertIn("message", res.data)

    def test_only_cmo_can_list(self):
        self.client.post("/api/v1/contact/", PAYLOAD, format="json")
        self.assertEqual(self.client.get("/api/v1/contact/").status_code, 401)
        self.as_user(self.citizen)
        self.assertEqual(self.client.get("/api/v1/contact/").status_code, 403)
        self.as_user(self.cmo)
        self.assertEqual(self.client.get("/api/v1/contact/").data["count"], 1)

    def test_public_endpoints(self):
        self.assertEqual(self.client.get("/api/v1/departments/").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/meta/choices/").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/public/stats/").status_code, 200)
