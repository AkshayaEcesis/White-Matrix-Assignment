"""Upload validation: extension allow-list, size limit and file-signature (magic byte) check."""

import os
import uuid

from django.conf import settings
from django.utils import timezone
from PIL import Image
from rest_framework.exceptions import ValidationError

Image.MAX_IMAGE_PIXELS = 40_000_000  # guard against decompression-bomb images

ALLOWED_TYPES = {
    "jpg": ("image/jpeg", (b"\xff\xd8\xff",)),
    "jpeg": ("image/jpeg", (b"\xff\xd8\xff",)),
    "png": ("image/png", (b"\x89PNG\r\n\x1a\n",)),
    "pdf": ("application/pdf", (b"%PDF-",)),
}
MAX_FILES_PER_UPLOAD = 3


def validate_upload(uploaded_file):
    """Validate one uploaded file and return its trusted content type."""
    name = uploaded_file.name or ""
    ext = os.path.splitext(name)[1].lower().lstrip(".")
    if ext not in ALLOWED_TYPES:
        raise ValidationError(f"'{name}': only JPG, PNG and PDF files are allowed.")

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if uploaded_file.size == 0:
        raise ValidationError(f"'{name}' is empty.")
    if uploaded_file.size > max_bytes:
        raise ValidationError(f"'{name}' exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB size limit.")

    content_type, signatures = ALLOWED_TYPES[ext]
    head = uploaded_file.read(8)
    uploaded_file.seek(0)
    if not any(head.startswith(sig) for sig in signatures):
        raise ValidationError(f"'{name}': file content does not match its extension.")

    if content_type.startswith("image/"):
        try:
            with Image.open(uploaded_file) as img:
                img.verify()
        except Exception as exc:
            raise ValidationError(f"'{name}' is not a valid image.") from exc
        finally:
            uploaded_file.seek(0)
    return content_type


def validate_upload_list(files):
    if len(files) > MAX_FILES_PER_UPLOAD:
        raise ValidationError(f"You can upload at most {MAX_FILES_PER_UPLOAD} files.")
    return [(f, validate_upload(f)) for f in files]


def attachment_upload_path(instance, filename):
    """Store files under a random name so user-supplied names never reach the filesystem."""
    ext = os.path.splitext(filename)[1].lower()
    return f"attachments/{timezone.now():%Y/%m}/{uuid.uuid4().hex}{ext}"
