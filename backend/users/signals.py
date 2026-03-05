from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import CustomUser

print("--- SEÑALES DE USUARIOS (USERS) CARGADAS ---")

@receiver(post_save, sender=CustomUser)
def enviar_mail_bienvenida(sender, instance, created, **kwargs):
    """
    Envía un email de bienvenida cuando un usuario tiene email y rol asignados,
    y aún no se le ha enviado el correo.
    """
    # NUEVA LÓGICA: Verificamos si tiene los datos necesarios Y si no se ha enviado el mail
    if instance.email and instance.rol and not instance.welcome_email_sent:
        print(f"--- PREPARANDO MAIL DE BIENVENIDA PARA: {instance.username} ---")
        
        subject = "¡Bienvenido al Campus Virtual Piccadilly!"
        
        # Mensaje personalizado según el rol
        if instance.rol == 'ALUMNO':
            cuerpo = (
                f"Hola {instance.first_name},\n\n"
                f"Te damos la bienvenida al Instituto Piccadilly.\n"
                f"Tu cuenta de alumno ha sido creada exitosamente.\n\n"
                f"--- TUS DATOS DE ACCESO ---\n"
                f"Usuario: {instance.dni}\n"
                f"Contraseña Inicial: {instance.dni}\n"
                f"---------------------------\n\n"
                f"Por favor, ingresa al campus y cambia tu contraseña lo antes posible.\n\n"
                f"Saludos,\nEl equipo de Piccadilly"
            )
        elif instance.rol == 'DOCENTE':
            cuerpo = (
                f"Hola Prof. {instance.last_name},\n\n"
                f"Su cuenta docente ha sido habilitada.\n"
                f"Ya puede ingresar al sistema para gestionar sus cursos.\n\n"
                f"Usuario: {instance.dni}\n"
                f"Contraseña: {instance.dni}\n\n"
                f"Atentamente,\nAdministración Piccadilly"
            )
        else:
            # Si es admin o staff
            cuerpo = f"Hola {instance.username}, tu cuenta administrativa ha sido creada y configurada."

        try:
            # Enviamos el mail
            send_mail(
                subject,
                cuerpo,
                settings.DEFAULT_FROM_EMAIL,
                [instance.email],
                fail_silently=False,
            )
            
            # IMPORTANTE: Marcamos que el mail ya fue enviado para no repetirlo
            # Usamos update_fields para evitar un bucle infinito de señales
            instance.welcome_email_sent = True
            instance.save(update_fields=['welcome_email_sent'])
            
            print(f"--- ✅ EMAIL BIENVENIDA ENVIADO Y MARCADO PARA {instance.email} ---")
        except Exception as e:
            print(f"--- ❌ ERROR ENVIANDO BIENVENIDA: {e} ---")