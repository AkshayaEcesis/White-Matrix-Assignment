from django.conf import settings

from apps.accounts.models import User
from apps.core.tests.base import PASSWORD, APIBase

AJAX = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}
COOKIE = settings.JWT_REFRESH_COOKIE_NAME


class RegistrationTests(APIBase):
    url = "/api/v1/auth/register/"

    def payload(self, **kw):
        data = {
            "full_name": "New Citizen",
            "email": "New.Citizen@Test.local",
            "mobile": "9123456789",
            "password": PASSWORD,
            "confirm_password": PASSWORD,
        }
        data.update(kw)
        return data

    def test_register_creates_citizen_with_hashed_password_and_logs_in(self):
        res = self.client.post(self.url, self.payload(), format="json")
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email="new.citizen@test.local")
        self.assertEqual(user.role, User.Role.CITIZEN)
        self.assertNotEqual(user.password, PASSWORD)
        self.assertTrue(user.check_password(PASSWORD))
        self.assertIn("access", res.data)
        self.assertNotIn("refresh", res.data)  # refresh token is never exposed to JS
        self.assertTrue(res.cookies[COOKIE]["httponly"])

    def test_cannot_self_register_as_admin(self):
        res = self.client.post(self.url, self.payload(role="CMO_ADMIN"), format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(User.objects.get(email="new.citizen@test.local").role, User.Role.CITIZEN)

    def test_password_mismatch_rejected(self):
        res = self.client.post(self.url, self.payload(confirm_password="Different!123"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("confirm_password", res.data)

    def test_weak_password_rejected(self):
        res = self.client.post(self.url, self.payload(password="12345678", confirm_password="12345678"), format="json")
        self.assertEqual(res.status_code, 400)

    def test_duplicate_email_rejected(self):
        res = self.client.post(self.url, self.payload(email="CITIZEN@test.local"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.data)

    def test_invalid_mobile_rejected(self):
        res = self.client.post(self.url, self.payload(mobile="12345"), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("mobile", res.data)


class LoginRefreshLogoutTests(APIBase):
    def login(self, email="citizen@test.local", password=PASSWORD):
        return self.client.post("/api/v1/auth/login/", {"email": email, "password": password}, format="json")

    def test_login_success_sets_httponly_cookie(self):
        res = self.login()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user"]["role"], "CITIZEN")
        cookie = res.cookies[COOKIE]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], settings.JWT_COOKIE_SAMESITE)
        self.assertEqual(cookie["path"], settings.JWT_COOKIE_PATH)

    def test_login_wrong_password(self):
        res = self.login(password="wrong-password")
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.data["detail"], "Invalid email or password.")

    def test_login_unknown_user_same_message(self):
        res = self.login(email="nobody@test.local")
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.data["detail"], "Invalid email or password.")

    def test_inactive_user_cannot_login(self):
        self.citizen.is_active = False
        self.citizen.save()
        self.assertEqual(self.login().status_code, 401)

    def test_me_requires_authentication(self):
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)
        access = self.login().data["access"]
        res = self.client.get("/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["email"], "citizen@test.local")

    def test_refresh_requires_ajax_header(self):
        self.login()
        self.assertEqual(self.client.post("/api/v1/auth/refresh/").status_code, 403)

    def test_refresh_rotates_and_blacklists_old_token(self):
        self.login()
        old = self.client.cookies[COOKIE].value
        res = self.client.post("/api/v1/auth/refresh/", **AJAX)
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        new = res.cookies[COOKIE].value
        self.assertNotEqual(old, new)
        # Replaying the old refresh token must fail (rotation + blacklist).
        self.client.cookies[COOKIE] = old
        self.assertEqual(self.client.post("/api/v1/auth/refresh/", **AJAX).status_code, 401)

    def test_refresh_without_cookie_means_no_session(self):
        res = self.client.post("/api/v1/auth/refresh/", **AJAX)
        self.assertEqual(res.status_code, 204)
        self.assertNotIn("access", res.data or {})

    def test_logout_blacklists_refresh_and_clears_cookie(self):
        self.login()
        token = self.client.cookies[COOKIE].value
        res = self.client.post("/api/v1/auth/logout/", **AJAX)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.cookies[COOKIE].value, "")
        self.client.cookies[COOKIE] = token
        self.assertEqual(self.client.post("/api/v1/auth/refresh/", **AJAX).status_code, 401)
