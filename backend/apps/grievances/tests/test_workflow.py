import re
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile

from apps.ai_assistant.services.gemini import AIServiceError
from apps.core.tests.base import FALLBACK_RESULT_PATCH, APIBase, png_file
from apps.grievances.models import ActionTakenReport, Grievance, GrievanceHistory

NO_AI = patch(FALLBACK_RESULT_PATCH, side_effect=AIServiceError("not_configured", "AI not configured."))


@NO_AI
class GrievanceCreationTests(APIBase):
    def submit(self, user=None, **overrides):
        self.as_user(user or self.citizen)
        return self.client.post("/api/v1/grievances/", self.grievance_payload(**overrides), format="multipart")

    def test_citizen_submits_grievance_with_reference_and_history(self, _):
        res = self.submit(attachments=[png_file()])
        self.assertEqual(res.status_code, 201, res.data)
        self.assertRegex(res.data["reference_number"], r"^CMK-\d{4}-\d{5}$")
        self.assertEqual(res.data["status"], "SUBMITTED")
        self.assertEqual(len(res.data["attachments"]), 1)
        g = Grievance.objects.get(reference_number=res.data["reference_number"])
        h = g.history.get()
        self.assertEqual((h.event_type, h.to_status, h.changed_by), ("CREATED", "SUBMITTED", self.citizen))
        # AI unavailable -> labelled fallback stored, never presented as AI
        self.assertEqual(g.ai_analysis["source"], "FALLBACK")
        self.assertFalse(g.ai_analysis["ai_available"])

    def test_reference_numbers_are_unique_and_sequential(self, _):
        refs = [self.submit().data["reference_number"] for _ in range(3)]
        numbers = [int(re.search(r"(\d+)$", r).group(1)) for r in refs]
        self.assertEqual(len(set(refs)), 3)
        self.assertEqual(numbers, [numbers[0], numbers[0] + 1, numbers[0] + 2])

    def test_validation_errors(self, _):
        res = self.submit(subject="", description="too short", district="NOWHERE")
        self.assertEqual(res.status_code, 400)
        for field in ("subject", "description", "district"):
            self.assertIn(field, res.data)

    def test_rejects_disallowed_file_type(self, _):
        exe = SimpleUploadedFile("virus.exe", b"MZ\x90\x00", content_type="application/octet-stream")
        res = self.submit(attachments=[exe])
        self.assertEqual(res.status_code, 400)

    def test_rejects_spoofed_extension(self, _):
        fake_pdf = SimpleUploadedFile("report.pdf", b"<html>not a pdf</html>", content_type="application/pdf")
        res = self.submit(attachments=[fake_pdf])
        self.assertEqual(res.status_code, 400)

    def test_staff_cannot_use_citizen_endpoint(self, _):
        self.assertEqual(self.submit(user=self.cmo).status_code, 403)

    def test_unauthenticated_cannot_submit(self, _):
        res = self.client.post("/api/v1/grievances/", self.grievance_payload(), format="multipart")
        self.assertEqual(res.status_code, 401)

    def test_citizen_cannot_see_other_citizens_grievance(self, _):
        ref = self.submit().data["reference_number"]
        self.as_user(self.other_citizen)
        self.assertEqual(self.client.get(f"/api/v1/grievances/{ref}/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/grievances/").data["count"], 0)

    def test_public_tracking_exposes_no_personal_data(self, _):
        ref = self.submit().data["reference_number"]
        self.logout_client()
        res = self.client.get(f"/api/v1/grievances/track/{ref}/")
        self.assertEqual(res.status_code, 200)
        body = str(res.data)
        for secret in ("citizen@test.local", "Test Citizen", "piped drinking water", "9876543210"):
            self.assertNotIn(secret, body)
        self.assertEqual(self.client.get("/api/v1/grievances/track/CMK-2000-99999/").status_code, 404)


@NO_AI
class FullWorkflowTests(APIBase):
    def setUp(self):
        super().setUp()
        with NO_AI:
            self.as_user(self.citizen)
            self.ref = self.client.post("/api/v1/grievances/", self.grievance_payload(), format="multipart").data["reference_number"]

    def cmo_post(self, action, data=None):
        self.as_user(self.cmo)
        return self.client.post(f"/api/v1/cmo/grievances/{self.ref}/{action}/", data or {}, format="json")

    def officer_post(self, action, data=None, user=None, fmt="json"):
        self.as_user(user or self.officer)
        return self.client.post(f"/api/v1/officer/grievances/{self.ref}/{action}/", data or {}, format=fmt)

    def assign(self):
        return self.cmo_post("assign", {"department": self.water.id, "officer": self.officer.id, "instructions": "Inspect"})

    def submit_report(self):
        return self.officer_post(
            "reports",
            {"action_taken": "Replaced the damaged pipeline section.", "resolution_details": "Water supply restored to all houses."},
            fmt="multipart",
        )

    def report_id(self):
        return ActionTakenReport.objects.get(grievance__reference_number=self.ref, review_status="PENDING").id

    def test_end_to_end_resolution_flow(self, _):
        res = self.assign()
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "UNDER_REVIEW")
        self.assertEqual(res.data["department"]["id"], self.water.id)

        res = self.officer_post("start-investigation", {"remarks": "Inspection scheduled"})
        self.assertEqual(res.data["status"], "IN_PROGRESS")
        self.assertEqual(self.officer_post("progress", {"remarks": "Damaged pipe located near junction."}).status_code, 200)
        self.assertEqual(self.submit_report().status_code, 201)

        self.as_user(self.cmo)
        res = self.client.post(f"/api/v1/cmo/reports/{self.report_id()}/review/", {"decision": "APPROVE", "remarks": "Verified"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)

        g = Grievance.objects.get(reference_number=self.ref)
        self.assertEqual(g.status, "RESOLVED")
        self.assertIsNotNone(g.resolved_at)
        transitions = list(g.history.exclude(to_status="").values_list("from_status", "to_status"))
        self.assertEqual(
            transitions,
            [("", "SUBMITTED"), ("SUBMITTED", "UNDER_REVIEW"), ("UNDER_REVIEW", "IN_PROGRESS"), ("IN_PROGRESS", "RESOLVED")],
        )
        self.assertTrue(all(h.changed_by_id for h in g.history.all()))

        # citizen sees the resolution, gives feedback once, then reopens
        self.as_user(self.citizen)
        detail = self.client.get(f"/api/v1/grievances/{self.ref}/").data
        self.assertTrue(detail["can_give_feedback"])
        self.assertIsNotNone(detail["resolution"])
        fb = {"rating": 2, "is_satisfied": False, "comments": "Supply is irregular"}
        self.assertEqual(self.client.post(f"/api/v1/grievances/{self.ref}/feedback/", fb, format="json").status_code, 201)
        self.assertEqual(self.client.post(f"/api/v1/grievances/{self.ref}/feedback/", fb, format="json").status_code, 409)
        res = self.client.post(f"/api/v1/grievances/{self.ref}/reopen/", {"reason": "Water supply stopped again."}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "REOPENED")

    def test_cmo_can_reject_report_requesting_additional_action(self, _):
        self.assign()
        self.officer_post("start-investigation")
        self.submit_report()
        self.as_user(self.cmo)
        url = f"/api/v1/cmo/reports/{self.report_id()}/review/"
        self.assertEqual(self.client.post(url, {"decision": "REJECT", "remarks": "short"}, format="json").status_code, 400)
        res = self.client.post(url, {"decision": "REJECT", "remarks": "Please attach photos of the completed work."}, format="json")
        self.assertEqual(res.status_code, 200)
        g = Grievance.objects.get(reference_number=self.ref)
        self.assertEqual(g.status, "IN_PROGRESS")
        self.assertTrue(g.history.filter(event_type=GrievanceHistory.EventType.REPORT_REJECTED).exists())
        # officer can now submit a new report
        self.assertEqual(self.submit_report().status_code, 201)

    def test_invalid_transitions_are_rejected(self, _):
        # officer cannot act before assignment (not visible -> 404)
        self.assertEqual(self.officer_post("start-investigation").status_code, 404)
        self.assign()
        # report before investigation starts -> 409
        self.assertEqual(self.submit_report().status_code, 409)
        # progress before investigation -> 409
        self.assertEqual(self.officer_post("progress", {"remarks": "Some update here"}).status_code, 409)
        # citizen cannot reopen an unresolved grievance
        self.as_user(self.citizen)
        res = self.client.post(f"/api/v1/grievances/{self.ref}/reopen/", {"reason": "I want to reopen this."}, format="json")
        self.assertEqual(res.status_code, 409)

    def test_officer_of_other_department_cannot_access(self, _):
        self.assign()
        self.as_user(self.other_officer)
        self.assertEqual(self.client.get(f"/api/v1/officer/grievances/{self.ref}/").status_code, 404)
        self.assertEqual(self.client.get("/api/v1/officer/grievances/").data["count"], 0)
        self.assertEqual(self.officer_post("start-investigation", user=self.other_officer).status_code, 404)

    def test_officer_cannot_approve_reports_or_use_cmo_endpoints(self, _):
        self.assign()
        self.officer_post("start-investigation")
        self.submit_report()
        self.as_user(self.officer)
        res = self.client.post(f"/api/v1/cmo/reports/{self.report_id()}/review/", {"decision": "APPROVE"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(self.client.get("/api/v1/cmo/dashboard/").status_code, 403)
        self.assertEqual(Grievance.objects.get(reference_number=self.ref).status, "IN_PROGRESS")

    def test_citizen_cannot_access_admin_endpoints(self, _):
        self.as_user(self.citizen)
        for url in ("/api/v1/cmo/grievances/", "/api/v1/cmo/dashboard/", "/api/v1/officer/grievances/", "/api/v1/contact/"):
            self.assertEqual(self.client.get(url).status_code, 403, url)
        res = self.client.post(f"/api/v1/cmo/grievances/{self.ref}/assign/", {"department": self.water.id}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_assign_rejects_officer_from_other_department(self, _):
        res = self.cmo_post("assign", {"department": self.water.id, "officer": self.other_officer.id})
        self.assertEqual(res.status_code, 400)

    def test_escalate_and_triage_override(self, _):
        res = self.cmo_post("escalate", {"reason": "Pending beyond the SLA period."})
        self.assertTrue(res.data["is_escalated"])
        self.assertEqual(res.data["priority"], "HIGH")
        res = self.cmo_post("triage", {"priority": "LOW"})
        self.assertEqual(res.data["priority"], "LOW")
        self.assertEqual(res.data["priority_source"], "CMO_CONFIRMED")

    def test_internal_remarks_hidden_from_citizen(self, _):
        self.cmo_post("remarks", {"text": "Internal note: check earlier complaints.", "visibility": "INTERNAL"})
        self.cmo_post("remarks", {"text": "Your grievance is being examined.", "visibility": "PUBLIC"})
        self.as_user(self.citizen)
        remarks = self.client.get(f"/api/v1/grievances/{self.ref}/").data["remarks"]
        self.assertEqual([r["text"] for r in remarks], ["Your grievance is being examined."])

    def test_attachment_download_is_authorised(self, _):
        with NO_AI:
            self.as_user(self.citizen)
            ref = self.client.post(
                "/api/v1/grievances/", self.grievance_payload(attachments=[png_file()]), format="multipart"
            ).data["reference_number"]
        att_id = Grievance.objects.get(reference_number=ref).attachments.get().id
        url = f"/api/v1/attachments/{att_id}/download/"
        self.assertEqual(self.client.get(url).status_code, 200)
        self.as_user(self.other_citizen)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.as_user(self.officer)  # not assigned yet
        self.assertEqual(self.client.get(url).status_code, 404)
        self.as_user(self.cmo)
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_history_records_are_immutable(self, _):
        h = GrievanceHistory.objects.filter(grievance__reference_number=self.ref).first()
        h.remarks = "tampered"
        with self.assertRaises(ValueError):
            h.save()
        with self.assertRaises(ValueError):
            h.delete()

    def test_cmo_dashboard_stats(self, _):
        self.as_user(self.cmo)
        res = self.client.get("/api/v1/cmo/dashboard/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["totals"]["total"], 1)
        self.assertEqual(len(res.data["by_district"]), 14)
