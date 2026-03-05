from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import Evaluacion

# 1. Este print confirma que Django cargó el archivo al iniciar
print("--- SISTEMA DE SIGNALS (NOTIFICACIONES) CARGADO ---")

@receiver(post_save, sender=Evaluacion)
def notificar_nueva_evaluacion(sender, instance, created, **kwargs):
    """
    Se ejecuta automáticamente cada vez que se guarda una Evaluación.
    """
    # 2. Solo actuamos si es una creación nueva. 
    # Si se edita la fecha después, no queremos spamear a todos otra vez.
    if not created:
        return

    print(f"--- PROCESANDO NOTIFICACIÓN: {instance.nombre} ---")

    try:
        # Construimos el mensaje
        tipo = "Entrega de Trabajo" if instance.es_entrega else "Examen Presencial"
        subject = f"Nuevo Evento: {instance.nombre}"
        mensaje = (
            f"Hola,\n\n"
            f"Se ha programado un nuevo evento en la materia: {instance.comision.curso.nombre}.\n"
            f"Evento: {instance.nombre} ({tipo})\n"
            f"Fecha: {instance.fecha.strftime('%d/%m/%Y a las %H:%M hs')}\n"
            f"Temas: {instance.temas or 'A confirmar'}\n\n"
            f"Saludos,\nCampus Piccadilly"
        )

        destinatarios = []

        if instance.es_selectivo:
            # Nota: Las relaciones ManyToMany se guardan DESPUÉS del save().
            # Para evaluaciones selectivas, esto debería manejarse con m2m_changed.
            print("--- EVALUACIÓN SELECTIVA: (Email se enviará vía m2m_changed) ---")
            return 
        else:
            # Buscamos los alumnos inscriptos en la comisión
            inscripciones = instance.comision.alumnos.all()
            destinatarios = [insc.alumno.email for insc in inscripciones if insc.alumno.email]

        if destinatarios:
            print(f"--- INTENTANDO ENVIAR A {len(destinatarios)} DESTINATARIOS ---")
            
            # 🚨 EL CAMBIO CLAVE: fail_silently=True y manejo de errores total
            # En un futuro, aquí deberías usar Celery para que sea asíncrono.
            send_mail(
                subject,
                mensaje,
                settings.DEFAULT_FROM_EMAIL,
                destinatarios,
                fail_silently=True, # Si falla el mail, que NO se caiga el sistema
            )
            print("--- ✅ PROCESO DE EMAIL FINALIZADO ---")
        else:
            print("--- ⚠️ SIN DESTINATARIOS VÁLIDOS ---")

    except Exception as e:
        # Capturamos cualquier error (de base de datos, de formato, etc) 
        # para que nunca interrumpa el flujo principal.
        print(f"--- ❌ ERROR CRÍTICO EN SIGNAL: {e} ---")