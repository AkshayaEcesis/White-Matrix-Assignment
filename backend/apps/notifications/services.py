from .models import Notification


def notify(users, title, message, grievance=None):
    """Create in-app notifications for one or more users (bulk insert)."""
    if users is None:
        return
    if not hasattr(users, "__iter__"):
        users = [users]
    Notification.objects.bulk_create(
        [Notification(user=u, title=title, message=message, grievance=grievance) for u in users if u]
    )
