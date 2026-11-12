from rest_framework.routers import DefaultRouter

from .views import ContactEnquiryViewSet

router = DefaultRouter()
router.register("", ContactEnquiryViewSet, basename="contact")

urlpatterns = router.urls
