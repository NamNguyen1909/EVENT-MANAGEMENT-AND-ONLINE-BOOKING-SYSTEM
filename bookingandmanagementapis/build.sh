#!/usr/bin/env bash
set -o errexit

cd bookingandmanagementapis

pip install -r requirements.txt

python manage.py collectstatic --no-input

python manage.py migrate zero

python manage.py migrate