"""
Labelled rule-based fallback used ONLY when the Gemini API is unavailable.

This is NOT AI. Results are always returned with source="FALLBACK" and ai_available=false,
and the UI shows a visible warning so nobody mistakes them for AI output.
"""

import re

from apps.core.choices import Category

KEYWORDS = {
    Category.WATER_SUPPLY: ["water", "pipe", "drinking", "tap", "leak", "well", "supply"],
    Category.ROADS_INFRASTRUCTURE: ["road", "pothole", "bridge", "footpath", "street", "drain", "culvert"],
    Category.HEALTHCARE: ["hospital", "doctor", "medicine", "clinic", "health", "ambulance", "phc"],
    Category.EDUCATION: ["school", "teacher", "college", "student", "scholarship", "exam"],
    Category.ELECTRICITY: ["electricity", "power", "transformer", "voltage", "streetlight", "outage", "meter"],
    Category.SANITATION_WASTE: ["garbage", "waste", "sewage", "sanitation", "toilet", "dump", "mosquito"],
    Category.PUBLIC_TRANSPORT: ["bus", "transport", "ksrtc", "route", "auto", "railway"],
    Category.LAND_REVENUE: ["land", "survey", "revenue", "certificate", "tax", "encroachment", "village office"],
    Category.LAW_ORDER: ["police", "theft", "harassment", "violence", "crime", "safety"],
    Category.SOCIAL_WELFARE: ["pension", "welfare", "disability", "widow", "elderly", "allowance"],
    Category.AGRICULTURE: ["farm", "crop", "paddy", "fertilizer", "irrigation", "farmer"],
    Category.CIVIL_SUPPLIES: ["ration", "ration card", "civil supplies", "kerosene", "rice"],
}
URGENT_WORDS = ["urgent", "emergency", "danger", "death", "injury", "accident", "children", "no water", "flood", "fire", "collapse"]


def fallback_analysis(text):
    lowered = text.lower()
    scores = {cat: sum(1 for kw in kws if kw in lowered) for cat, kws in KEYWORDS.items()}
    best = max(scores, key=scores.get)
    category = best if scores[best] > 0 else Category.OTHER

    if any(word in lowered for word in URGENT_WORDS):
        priority = "HIGH"
    elif len(text) > 400:
        priority = "MEDIUM"
    else:
        priority = "LOW" if scores.get(category, 0) == 0 else "MEDIUM"

    first_sentence = re.split(r"(?<=[.!?])\s+", text.strip(), maxsplit=1)[0]
    summary = first_sentence[:240] + ("..." if len(first_sentence) > 240 else "")
    return {
        "suggested_category": str(category),
        "suggested_priority": priority,
        "summary": summary,
        "reasoning": "Rule-based keyword match (fallback - not AI). Please review manually.",
    }
