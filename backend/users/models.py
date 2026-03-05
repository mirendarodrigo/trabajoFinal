from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    # Roles definidos como Tuplas (Valor BD, Label legible)
    ROLE_CHOICES = (
        ('ADMIN', 'Administrador'),
        ('DOCENTE', 'Docente'),
        ('ALUMNO', 'Alumno'),
    )

    rol = models.CharField(max_length=10, choices=ROLE_CHOICES, default='ALUMNO')
    dni = models.CharField(max_length=20, unique=True, null=True, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    welcome_email_sent = models.BooleanField(default=False)
    debe_cambiar_password = models.BooleanField(default=True)
    imagen_perfil = models.ImageField(upload_to='perfiles/', null=True, blank=True)

    # Campos obligatorios para AbstractUser si quisieras login con email en vez de username
    # Por ahora mantenemos username para simplificar el login de alumnos
    
    def __str__(self):
        return f"{self.username} ({self.get_rol_display()})"