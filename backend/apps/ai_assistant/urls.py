from django.urls import path

from .views import AnalyseGrievanceView

urlpatterns = [
    path("analyse/", AnalyseGrievanceView.as_view(), name="ai-analyse"),
]
