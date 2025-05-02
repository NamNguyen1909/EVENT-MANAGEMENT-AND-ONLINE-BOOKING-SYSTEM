from django.apps import AppConfig

class BemConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'bem'

    def ready(self):
        import bem.signals
