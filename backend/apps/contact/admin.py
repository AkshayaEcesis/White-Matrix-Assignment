from django.contrib import admin

from .models import ContactEnquiry


@admin.register(ContactEnquiry)
class ContactEnquiryAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "subject", "is_reviewed", "created_at")
    list_filter = ("is_reviewed",)
    search_fields = ("name", "email", "subject")
