from django.core.management.base import BaseCommand
from oauth2_provider.models import Application

class Command(BaseCommand):
    help = 'List all OAuth2 clients with their client_id and client_secret'

    def handle(self, *args, **options):
        apps = Application.objects.all()
        if not apps:
            self.stdout.write("No OAuth2 clients found.")
            return
        for app in apps:
            self.stdout.write(f"Name: {app.name}")
            self.stdout.write(f"Client ID: {app.client_id}")
            self.stdout.write(f"Client Secret: {app.client_secret}")
            self.stdout.write(f"Client Type: {app.client_type}")
            self.stdout.write(f"Authorization Grant Type: {app.authorization_grant_type}")
            self.stdout.write("-" * 40)
