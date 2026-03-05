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
    # 2. Este print confirma que la señal detectó el guardado
    print(f"--- SEÑAL RECIBIDA PARA: {instance.nombre} (Created={created}) ---")

    if created:
        subject = f"Nuevo Evento: {instance.nombre}"
        
        # Construimos el mensaje
        tipo = "Entrega de Trabajo" if instance.es_entrega else "Examen Presencial"
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
            print("--- ES SELECTIVO: (Lógica pendiente de m2m_changed) ---")
            # Nota: Las relaciones ManyToMany se guardan DESPUÉS del save() del modelo.
            # Para el MVP nos enfocamos en el envío general.
            pass 
        else:
            # Buscamos los alumnos inscriptos en la comisión
            inscripciones = instance.comision.alumnos.all()
            print(f"--- INSCRIPCIONES ENCONTRADAS: {inscripciones.count()} ---")
            
            # Extraemos los emails válidos
            destinatarios = [insc.alumno.email for insc in inscripciones if insc.alumno.email]
            print(f"--- EMAILS DESTINATARIOS: {destinatarios} ---")

        if destinatarios:
            print("--- INTENTANDO ENVIAR EMAIL... ---")
            try:
                send_mail(
                    subject,
                    mensaje,
                    settings.DEFAULT_FROM_EMAIL,
                    destinatarios,
                    fail_silently=False,
                )
                print("--- ✅ EMAIL ENVIADO EXITOSAMENTE (Consola) ---")
            except Exception as e:
                print(f"--- ❌ ERROR AL ENVIAR EMAIL: {e} ---")
        else:
            print("--- ⚠️ NO SE ENVIÓ EMAIL: Lista de destinatarios vacía ---")