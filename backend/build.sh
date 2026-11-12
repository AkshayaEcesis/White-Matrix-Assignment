#!/usr/bin/env bash
# Render build command: ./build.sh
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input
# Idempotent: creates fictional demo departments/accounts/grievances only if missing.
python manage.py seed_demo
