from django.db import IntegrityError, transaction
from django.utils import timezone

from ..models import ReferenceSequence


def generate_reference_number():
    """
    Return the next reference number, e.g. CMK-2026-00001.

    The per-year counter row is locked with SELECT ... FOR UPDATE inside a transaction,
    so concurrent submissions can never receive the same number.
    """
    year = timezone.localdate().year
    with transaction.atomic():
        try:
            seq, _ = ReferenceSequence.objects.select_for_update().get_or_create(year=year)
        except IntegrityError:  # two requests created the first row of a new year simultaneously
            seq = ReferenceSequence.objects.select_for_update().get(year=year)
        seq.last_number += 1
        seq.save(update_fields=["last_number"])
    return f"CMK-{year}-{seq.last_number:05d}"
