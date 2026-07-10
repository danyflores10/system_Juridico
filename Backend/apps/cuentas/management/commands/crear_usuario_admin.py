from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.cuentas.models import PerfilUsuario

User = get_user_model()


class Command(BaseCommand):
    help = 'Crea (o actualiza) un usuario administrador de la aplicación.'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True)
        parser.add_argument('--password', required=True)
        parser.add_argument('--nombre', default='')
        parser.add_argument('--apellido', default='')

    @transaction.atomic
    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        password = options['password']
        if not email or '@' not in email:
            raise CommandError('Debes indicar un correo electrónico válido.')
        if len(password) < 8:
            raise CommandError('La contraseña debe tener al menos 8 caracteres.')

        usuario = User.objects.filter(email__iexact=email).first()
        creado = usuario is None
        if creado:
            usuario = User(username=email, email=email)
        usuario.first_name = options['nombre'] or usuario.first_name
        usuario.last_name = options['apellido'] or usuario.last_name
        usuario.is_active = True
        usuario.is_staff = True
        usuario.set_password(password)
        usuario.save()
        PerfilUsuario.objects.update_or_create(
            usuario=usuario, defaults={'rol': PerfilUsuario.Rol.ADMIN}
        )
        accion = 'creado' if creado else 'actualizado'
        self.stdout.write(
            self.style.SUCCESS(f'Usuario administrador {accion}: {email}')
        )
