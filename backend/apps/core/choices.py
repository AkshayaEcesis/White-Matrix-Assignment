"""Shared choice lists (single source of truth; exposed to the frontend via /api/v1/meta/choices/)."""

from django.db import models


class District(models.TextChoices):
    THIRUVANANTHAPURAM = "THIRUVANANTHAPURAM", "Thiruvananthapuram"
    KOLLAM = "KOLLAM", "Kollam"
    PATHANAMTHITTA = "PATHANAMTHITTA", "Pathanamthitta"
    ALAPPUZHA = "ALAPPUZHA", "Alappuzha"
    KOTTAYAM = "KOTTAYAM", "Kottayam"
    IDUKKI = "IDUKKI", "Idukki"
    ERNAKULAM = "ERNAKULAM", "Ernakulam"
    THRISSUR = "THRISSUR", "Thrissur"
    PALAKKAD = "PALAKKAD", "Palakkad"
    MALAPPURAM = "MALAPPURAM", "Malappuram"
    KOZHIKODE = "KOZHIKODE", "Kozhikode"
    WAYANAD = "WAYANAD", "Wayanad"
    KANNUR = "KANNUR", "Kannur"
    KASARAGOD = "KASARAGOD", "Kasaragod"


class Category(models.TextChoices):
    WATER_SUPPLY = "WATER_SUPPLY", "Water Supply"
    ROADS_INFRASTRUCTURE = "ROADS_INFRASTRUCTURE", "Roads & Infrastructure"
    HEALTHCARE = "HEALTHCARE", "Healthcare"
    EDUCATION = "EDUCATION", "Education"
    ELECTRICITY = "ELECTRICITY", "Electricity"
    SANITATION_WASTE = "SANITATION_WASTE", "Sanitation & Waste Management"
    PUBLIC_TRANSPORT = "PUBLIC_TRANSPORT", "Public Transport"
    LAND_REVENUE = "LAND_REVENUE", "Land & Revenue"
    LAW_ORDER = "LAW_ORDER", "Law & Order"
    SOCIAL_WELFARE = "SOCIAL_WELFARE", "Social Welfare & Pensions"
    AGRICULTURE = "AGRICULTURE", "Agriculture"
    CIVIL_SUPPLIES = "CIVIL_SUPPLIES", "Ration & Civil Supplies"
    OTHER = "OTHER", "Other"


# Department (by Department.code) normally responsible for a category.
# Used by the labelled rule-based fallback and by the demo seed data.
CATEGORY_DEPARTMENT_CODE = {
    Category.WATER_SUPPLY: "WRD",
    Category.ROADS_INFRASTRUCTURE: "PWD",
    Category.HEALTHCARE: "HFW",
    Category.EDUCATION: "GED",
    Category.ELECTRICITY: "PWR",
    Category.SANITATION_WASTE: "LSG",
    Category.PUBLIC_TRANSPORT: "TRN",
    Category.LAND_REVENUE: "REV",
    Category.LAW_ORDER: "HOME",
    Category.SOCIAL_WELFARE: "SJD",
    Category.AGRICULTURE: "AGR",
    Category.CIVIL_SUPPLIES: "FCS",
}


def choices_payload(choices_cls):
    return [{"value": value, "label": label} for value, label in choices_cls.choices]
