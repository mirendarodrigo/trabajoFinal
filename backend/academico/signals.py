import threading
import urllib.request
import json
import os
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

print("--- SEÑALES DE USUARIOS (USERS) CARGADAS ---")

def enviar_correo_asincrono(user_id, email, subject, text_content, html_content):
    from users.models import CustomUser 
    import traceback
    
    try:
        print(f"--- 📡 ENVIANDO CORREO VÍA API WEB A {email} ---")
        
        # Leemos la clave de Brevo desde las variables de entorno
        api_key = os.environ.get('BREVO_API_KEY', '')
        
        if not api_key:
            print("--- ⚠️ ADVERTENCIA: No se encontró BREVO_API_KEY en el entorno ---")
            return

        url = "https://api.brevo.com/v3/smtp/email"
        
        # Armamos el paquete de datos tal como lo pide Brevo
        data = {
            "sender": {"email": "mirendarodrigo@gmail.com", "name": "Campus Piccadilly"},
            "to": [{"email": email}],
            "subject": subject,
            "htmlContent": html_content,
            "textContent": text_content
        }
        
        payload = json.dumps(data).encode('utf-8')
        
        headers = {
            'accept': 'application/json',
            'api-key': api_key,
            'content-type': 'application/json'
        }
        
        # Disparamos la petición HTTP (Render NUNCA bloquea esto)
        req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status in [200, 201, 202]:
                CustomUser.objects.filter(id=user_id).update(welcome_email_sent=True)
                print(f"--- ✅ CORREO ENTREGADO A BREVO API PARA {email} ---")
            else:
                print(f"--- ⚠️ BREVO RESPONDIÓ CON ESTADO: {response.status} ---")
                
    except Exception as e:
        print(f"--- ❌ FALLO EL ENVÍO POR API: {str(e)} ---")
        print(traceback.format_exc())

# === TU SIGNAL PRINCIPAL QUEDA EXACTAMENTE IGUAL ===
@receiver(post_save, sender='users.CustomUser') 
def enviar_mail_bienvenida(sender, instance, created, **kwargs):
    if instance.email and instance.rol and not instance.welcome_email_sent:
        print(f"--- PREPARANDO MAIL DE BIENVENIDA PARA: {instance.username} ---")
        
        subject = "¡Bienvenido al Campus Virtual Piccadilly!"
        color_principal = "#0b2265"
        color_secundario = "#dc3545"
        
        if instance.rol == 'ALUMNO':
            saludo = f"Hola {instance.first_name},"
            mensaje_html = f"""
                <p>Te damos la bienvenida al <strong>Instituto Piccadilly</strong>.</p>
                <p>Tu cuenta de alumno ha sido creada exitosamente:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid {color_secundario}; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Usuario:</strong> {instance.dni}</p>
                    <p style="margin: 0;"><strong>Contraseña Inicial:</strong> {instance.dni}</p>
                </div>
            """
            text_content = f"Hola {instance.first_name}, bienvenido. Usuario: {instance.dni}"
            
        elif instance.rol == 'DOCENTE':
            saludo = f"Hola Prof. {instance.last_name},"
            mensaje_html = f"""
                <p>Su cuenta docente en <strong>Piccadilly</strong> ha sido habilitada.</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid {color_secundario}; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Usuario:</strong> {instance.dni}</p>
                    <p style="margin: 0;"><strong>Contraseña:</strong> {instance.dni}</p>
                </div>
            """
            text_content = f"Hola Prof. {instance.last_name}, cuenta activa. Usuario: {instance.dni}"
            
        else:
            saludo = f"Hola {instance.username},"
            mensaje_html = "<p>Tu cuenta administrativa ha sido configurada.</p>"
            text_content = f"Hola {instance.username}, cuenta creada."

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background-color: {color_principal}; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">CAMPUS PICCADILLY</h2>
                </div>
                <div style="padding: 30px;">
                    <h3>{saludo}</h3>
                    {mensaje_html}
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="https://trabajo-final-98x2.vercel.app/" style="background-color: {color_secundario}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ingresar al Campus</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        hilo = threading.Thread(
            target=enviar_correo_asincrono,
            args=(instance.id, instance.email, subject, text_content, html_content)
        )
        hilo.start()