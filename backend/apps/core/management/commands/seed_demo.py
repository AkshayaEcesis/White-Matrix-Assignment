"""
Seed FICTIONAL demonstration data: departments, demo accounts and grievances in every workflow state.

Grievances are driven through the real workflow service, so their history, assignments,
reports and notifications are genuine records - not hand-written rows.

Usage:  python manage.py seed_demo [--password <pw>]
"""

import os
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.core.choices import CATEGORY_DEPARTMENT_CODE, Category, District
from apps.departments.models import Department
from apps.grievances.models import Grievance, GrievanceHistory
from apps.grievances.services import workflow

DEPARTMENTS = [
    ("WRD", "Water Resources Department", "droplets", "Drinking water supply, pipelines, irrigation canals and water quality."),
    ("PWD", "Public Works Department", "construction", "Construction and maintenance of roads, bridges and public buildings."),
    ("HFW", "Health & Family Welfare Department", "heart-pulse", "Government hospitals, primary health centres, medicines and public health."),
    ("GED", "General Education Department", "graduation-cap", "Government and aided schools, teachers, scholarships and school infrastructure."),
    ("PWR", "Power Department", "zap", "Electricity supply, transformers, street lights and power outages."),
    ("LSG", "Local Self Government Department", "recycle", "Panchayat and municipal services, sanitation and waste management."),
    ("TRN", "Transport Department", "bus", "Public bus services, routes, permits and road transport."),
    ("REV", "Revenue Department", "landmark", "Land records, certificates, village offices and revenue matters."),
    ("HOME", "Home Department (Police)", "shield", "Law and order, public safety and police services."),
    ("SJD", "Social Justice Department", "hand-heart", "Welfare pensions, disability support and social security schemes."),
    ("AGR", "Agriculture Development Department", "sprout", "Farmer support, crop insurance, fertilisers and agricultural extension."),
    ("FCS", "Food & Civil Supplies Department", "wheat", "Ration cards, public distribution system and consumer protection."),
]

# (citizen_key, district, category, subject, description, priority, final_state, days_ago)
GRIEVANCES = [
    ("arun", District.THIRUVANANTHAPURAM, Category.WATER_SUPPLY, "No drinking water supply for 5 days in Ward 12",
     "Our area in Ward 12 has not received piped drinking water for the past five days. Around 60 families including elderly people and small children are affected and are buying water from private tankers.", "HIGH", "RESOLVED", 40),
    ("fathima", District.ERNAKULAM, Category.ROADS_INFRASTRUCTURE, "Large potholes on the main road near the bus stand",
     "The main road from the bus stand to the junction has several large potholes. Two-wheeler riders have fallen during the rains and traffic is badly affected every evening.", "MEDIUM", "IN_PROGRESS", 18),
    ("arun", District.KOZHIKODE, Category.HEALTHCARE, "Shortage of essential medicines at the primary health centre",
     "The primary health centre in our panchayat has not had diabetes and blood pressure medicines for three weeks. Patients are being asked to buy them from private pharmacies.", "HIGH", "PENDING_REPORT", 12),
    ("fathima", District.THRISSUR, Category.ELECTRICITY, "Street lights not working on the temple road",
     "About 15 street lights along the temple road have not been working for a month. The road is very dark at night and residents, especially women, feel unsafe.", "MEDIUM", "UNDER_REVIEW", 6),
    ("arun", District.KOLLAM, Category.SANITATION_WASTE, "Garbage not collected for two weeks near the market",
     "Waste near the fish market has not been collected for two weeks. The smell is unbearable and there is a risk of disease spreading as mosquitoes and stray dogs gather.", "HIGH", "ESCALATED", 25),
    ("fathima", District.PALAKKAD, Category.SOCIAL_WELFARE, "Old age pension not received for three months",
     "My mother has not received her welfare pension for the last three months even though all documents were submitted at the village office.", "MEDIUM", "REOPENED", 35),
    ("arun", District.ALAPPUZHA, Category.PUBLIC_TRANSPORT, "Bus service to the village discontinued",
     "The only public bus to our village was stopped two months ago. Students and daily workers now have to walk four kilometres to reach the main road.", "MEDIUM", "SUBMITTED", 2),
    ("fathima", District.KANNUR, Category.EDUCATION, "School building roof leaking during rain",
     "The roof of the government lower primary school is leaking in three classrooms. Children are moved to the verandah whenever it rains.", "HIGH", "SUBMITTED", 1),
    ("arun", District.MALAPPURAM, Category.CIVIL_SUPPLIES, "Ration card correction pending for six months",
     "I applied for correction of my family members' names on the ration card six months ago and the status still shows pending.", "LOW", "RESOLVED", 60),
    ("fathima", District.WAYANAD, Category.AGRICULTURE, "Crop insurance claim not settled after flood",
     "My paddy crop was destroyed in the floods and the insurance claim submitted four months ago has not been settled.", "MEDIUM", "IN_PROGRESS", 28),
    ("arun", District.IDUKKI, Category.LAND_REVENUE, "Delay in issuing possession certificate",
     "I applied for a possession certificate at the village office over two months ago, required for a housing loan, and have not received it.", "LOW", "UNDER_REVIEW", 9),
    ("fathima", District.KOTTAYAM, Category.WATER_SUPPLY, "Pipeline leakage wasting water on the main road",
     "A major water pipeline is leaking near the junction for over a week. Thousands of litres of water are wasted and the road is getting damaged.", "MEDIUM", "RESOLVED", 50),
]


class Command(BaseCommand):
    help = "Seed fictional demo data (departments, accounts, grievances). Safe to run more than once."

    def add_arguments(self, parser):
        parser.add_argument("--password", default=os.getenv("DEMO_PASSWORD", "Demo@2026"))

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]
        departments = {}
        for code, name, icon, description in DEPARTMENTS:
            dept, _ = Department.objects.update_or_create(
                code=code,
                defaults={"name": name, "icon": icon, "description": description, "contact_email": f"{code.lower()}@example.com"},
            )
            departments[code] = dept

        def user(email, full_name, role, **extra):
            u, created = User.objects.get_or_create(email=email, defaults={"full_name": full_name, "role": role, **extra})
            if created:
                u.set_password(password)
                u.save()
            return u

        cmo = user("cmo.admin@example.com", "Anjali Menon", User.Role.CMO_ADMIN, designation="Grievance Cell Officer, CMO", is_staff=True)
        officers = {
            code: user(f"officer.{code.lower()}@example.com", f"{dept.name.split(' ')[0]} Officer", User.Role.OFFICER,
                       department=dept, designation="Nodal Officer")
            for code, dept in departments.items()
        }
        # Friendlier names for the officers used in the demo walkthrough
        for code, name in (("WRD", "Rajesh Nair"), ("PWD", "Suresh Pillai"), ("HFW", "Dr. Meera Varma"), ("LSG", "Thomas Kurian")):
            User.objects.filter(pk=officers[code].pk).update(full_name=name)
            officers[code].full_name = name
        citizens = {
            "arun": user("citizen@example.com", "Arun Kumar", User.Role.CITIZEN, mobile="9876543210"),
            "fathima": user("citizen2@example.com", "Fathima Rasheed", User.Role.CITIZEN, mobile="9847012345"),
        }

        if Grievance.objects.exists():
            self.stdout.write(self.style.WARNING("Grievances already exist - skipped grievance seeding."))
        else:
            for spec in GRIEVANCES:
                self._create(spec, citizens, cmo, departments, officers)
            self.stdout.write(self.style.SUCCESS(f"Created {len(GRIEVANCES)} demo grievances."))

        self.stdout.write(self.style.SUCCESS("Demo data ready. All demo accounts use the configured demo password."))
        for email in ["cmo.admin@example.com", "officer.wrd@example.com", "officer.pwd@example.com", "officer.hfw@example.com", "citizen@example.com"]:
            self.stdout.write(f"  - {email}")

    def _create(self, spec, citizens, cmo, departments, officers):
        citizen_key, district, category, subject, description, priority, state, days_ago = spec
        citizen = citizens[citizen_key]
        ai = {
            "source": "SEED",
            "ai_available": False,
            "model": None,
            "suggested_category": str(category),
            "suggested_priority": priority,
            "summary": "Demo record created by the seed command (no AI call was made).",
            "notice": "Seeded demonstration data - not produced by AI.",
        }
        g = workflow.create_grievance(
            citizen=citizen,
            data={"district": district, "category": category, "subject": subject, "description": description},
            files=[],
            ai_result=ai,
        )
        code = CATEGORY_DEPARTMENT_CODE[category]
        dept, officer = departments[code], officers[code]

        if state != "SUBMITTED":
            workflow.assign(g, cmo, dept, officer, "Please verify on site and report the action taken within the SLA.")
        if state in ("IN_PROGRESS", "PENDING_REPORT", "RESOLVED", "REOPENED", "ESCALATED"):
            workflow.start_investigation(g, officer, "Site inspection scheduled.")
            workflow.add_progress_update(g, officer, "Field team inspected the location and identified the cause.")
        if state in ("PENDING_REPORT", "RESOLVED", "REOPENED"):
            workflow.submit_action_report(
                g, officer,
                "Field verification completed and the responsible section was directed to carry out the required work.",
                "The issue has been addressed and the service has been restored. Residents were informed.",
                [],
            )
        if state in ("RESOLVED", "REOPENED"):
            report = g.action_reports.get(review_status="PENDING")
            workflow.review_action_report(report, cmo, True, "Verified with the department. Approved.")
            g.refresh_from_db()
            if state == "RESOLVED" and days_ago > 45:
                workflow.submit_feedback(g, citizen, 5, "Issue resolved quickly. Thank you.", True)
        if state == "REOPENED":
            g.refresh_from_db()
            workflow.reopen(g, citizen, "The pension amount has still not been credited to the bank account.")
        if state == "ESCALATED":
            workflow.escalate(g, cmo, "Overdue and affecting public health. Immediate action required.")

        # Back-date the record so dashboards, trends and overdue counts look realistic.
        created = timezone.now() - timedelta(days=days_ago, hours=3)
        g.refresh_from_db()
        Grievance.objects.filter(pk=g.pk).update(
            created_at=created,
            due_at=created + timedelta(days=Grievance.SLA_DAYS[g.priority]),
            resolved_at=(created + timedelta(days=max(days_ago // 2, 1))) if g.status == Grievance.Status.RESOLVED else None,
        )
        history = list(g.history.order_by("id"))
        span = timedelta(days=days_ago) / max(len(history), 1)
        for i, h in enumerate(history):
            GrievanceHistory.objects.filter(pk=h.pk).update(created_at=created + span * i)
