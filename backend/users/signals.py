import threading
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from models import CustomUser

print("--- SEÑALES DE USUARIOS (USERS) CARGADAS ---")

# 1. FUNCIÓN QUE TRABAJA EN SEGUNDO PLANO
def enviar_correo_asincrono(user_id, email, subject, text_content, html_content):
    try:
        # Enviamos el correo (ahora incluye la versión HTML)
        send_mail(
            subject,
            text_content, # Versión texto plano (para clientes de correo antiguos)
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=True, # Vital para que no rompa el server si Brevo falla
            html_message=html_content # La magia visual 🚀
        )
        
        # IMPORTANTE: Usamos .update() en lugar de .save() 
        # Esto modifica la base de datos directo SIN volver a disparar el post_save
        CustomUser.objects.filter(id=user_id).update(welcome_email_sent=True)
        print(f"--- ✅ EMAIL BIENVENIDA ENVIADO Y MARCADO PARA {email} ---")
        
    except Exception as e:
        print(f"--- ❌ ERROR ENVIANDO BIENVENIDA A {email}: {e} ---")


# 2. EL SIGNAL PRINCIPAL
@receiver(post_save, sender=CustomUser)
def enviar_mail_bienvenida(sender, instance, created, **kwargs):
    """
    Se dispara al crear o modificar un usuario. 
    Lanza un hilo para enviar el correo sin congelar la respuesta del servidor.
    """
    if instance.email and instance.rol and not instance.welcome_email_sent:
        print(f"--- PREPARANDO MAIL DE BIENVENIDA PARA: {instance.username} ---")
        
        subject = "¡Bienvenido al Campus Virtual Piccadilly!"
        color_principal = "#0b2265" # Azul Piccadilly
        color_secundario = "#dc3545" # Rojo Piccadilly (Botones/Detalles)
        
        # 3. PERSONALIZACIÓN SEGÚN ROL
        if instance.rol == 'ALUMNO':
            saludo = f"Hola {instance.first_name},"
            mensaje_html = f"""
                <p>Te damos la bienvenida al <strong>Instituto Piccadilly</strong>.</p>
                <p>Tu cuenta de alumno ha sido creada exitosamente. A continuación, tus credenciales de acceso:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid {color_secundario}; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Usuario:</strong> {instance.dni}</p>
                    <p style="margin: 0;"><strong>Contraseña Inicial:</strong> {instance.dni}</p>
                </div>
                <p><em>Por favor, ingresa al campus y cambia tu contraseña lo antes posible por seguridad.</em></p>
            """
            text_content = f"Hola {instance.first_name},\nBienvenido al Instituto. Usuario: {instance.dni} | Clave: {instance.dni}."
            
        elif instance.rol == 'DOCENTE':
            saludo = f"Hola Prof. {instance.last_name},"
            mensaje_html = f"""
                <p>Su cuenta docente en el <strong>Instituto Piccadilly</strong> ha sido habilitada.</p>
                <p>Ya puede ingresar al sistema para gestionar sus cursos con los siguientes datos:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid {color_secundario}; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Usuario:</strong> {instance.dni}</p>
                    <p style="margin: 0;"><strong>Contraseña:</strong> {instance.dni}</p>
                </div>
            """
            text_content = f"Hola Prof. {instance.last_name},\nSu cuenta está activa. Usuario: {instance.dni} | Clave: {instance.dni}."
            
        else:
            saludo = f"Hola {instance.username},"
            mensaje_html = "<p>Tu cuenta administrativa ha sido creada y configurada correctamente en el sistema.</p>"
            text_content = f"Hola {instance.username}, tu cuenta ha sido creada."

        # 4. PLANTILLA HTML PROFESIONAL
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                
                <div style="background-color: {color_principal}; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0; letter-spacing: 1px;">CAMPUS PICCADILLY</h2>
                </div>

                <div style="padding: 30px; background-color: #ffffff;">
                    <h3 style="color: {color_principal};">{saludo}</h3>
                    {mensaje_html}
                    <br>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="https://trabajo-final-98x2.vercel.app/" style="display: inline-block; background-color: {color_secundario}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ingresar al Campus</a>
                    </div>
                </div>

                <div style="background-color: #f1f1f1; color: #777; padding: 15px; text-align: center; font-size: 12px;">
                    <p style="margin: 0;">&copy; 2026 Instituto Piccadilly. Todos los derechos reservados.</p>
                    <p style="margin: 5px 0 0 0;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # 5. LANZAR EL HILO ASÍNCRONO
        hilo = threading.Thread(
            target=enviar_correo_asincrono,
            args=(instance.id, instance.email, subject, text_content, html_content)
        )
        hilo.start()