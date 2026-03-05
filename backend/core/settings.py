from pathlib import Path
import os
import dj_database_url 
from dotenv import load_dotenv 
from datetime import timedelta

# Cargar variables de entorno (solo funciona en desarrollo local; en Render se configuran en el panel)
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ==============================================================================
# 🚀 CONFIGURACIONES DE SEGURIDAD Y DESPLIEGUE (PRODUCCIÓN)
# ==============================================================================

# Si no hay SECRET_KEY en el entorno, usa una por defecto (útil para local)
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-rya=t)viv$%9)8*3^tk#1#y%invtjh39j*)f_9o5a77q3ne3j!')

# 🚨 MUY IMPORTANTE: Se apaga el modo DEBUG si la variable RENDER está presente.
DEBUG = True

# Hosts permitidos: En local acepta todos ('*'). En Render, acepta la URL que Render asigne.
ALLOWED_HOSTS = []
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')

if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
    # 🚨 ESTA LÍNEA ES LA MAGIA PARA QUE FUNCIONE EL LOGIN EN PRODUCCIÓN:
    CSRF_TRUSTED_ORIGINS = [f'https://{RENDER_EXTERNAL_HOSTNAME}']
else:
    ALLOWED_HOSTS = ['*'] # Desarrollo local

# ==============================================================================
# 📦 APLICACIONES
# ==============================================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    
    # --- CLOUDINARY ---
    'cloudinary_storage',
    'cloudinary',

    # Local apps
    'users.apps.UsersConfig',
    'academico.apps.AcademicoConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # Whitenoise sirve los archivos estáticos de Django en producción
    'whitenoise.middleware.WhiteNoiseMiddleware', 
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ==============================================================================
# 🗄️ BASE DE DATOS (NEON POSTGRESQL / RENDER)
# ==============================================================================

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        ssl_require=True
    )
}

# ==============================================================================
# 🔒 VALIDACIÓN DE CONTRASEÑAS
# ==============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ==============================================================================
# 🌐 INTERNACIONALIZACIÓN
# ==============================================================================

LANGUAGE_CODE = 'es-ar' # 🚨 CAMBIADO: Español de Argentina
TIME_ZONE = 'America/Argentina/Buenos_Aires' # 🚨 CAMBIADO: Zona horaria correcta
USE_I18N = True
USE_TZ = True

# ==============================================================================
# 📂 ARCHIVOS ESTÁTICOS (WHITENOISE PARA RENDER)
# ==============================================================================

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# ==============================================================================
# 🛡️ CORS (COMUNICACIÓN CON REACT/VERCEL)
# ==============================================================================

# Si estamos en Render, limitamos quién puede conectarse. Si no, permitimos todo.
if 'RENDER' in os.environ:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [
        # Aquí pondremos la URL que Vercel te dé cuando subamos el frontend
        os.environ.get('FRONTEND_URL', 'http://localhost:5173'), 
    ]
else:
    CORS_ALLOW_ALL_ORIGINS = True

# ==============================================================================
# 👤 USUARIOS Y AUTENTICACIÓN (JWT)
# ==============================================================================

AUTH_USER_MODEL = 'users.CustomUser'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': 100,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15), # 🚨 Aumentado a 15 mins para producción
    'REFRESH_TOKEN_LIFETIME': timedelta(days=12),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# ==============================================================================
# 📧 CORREO ELECTRÓNICO (BREVO SMTP)
# ==============================================================================

# Si estamos en Render, usamos Brevo. Si estamos en local, imprime en consola.
if 'RENDER' in os.environ:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp-relay.brevo.com'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.environ.get('BREVO_SMTP_USER') # Tu correo de login de Brevo
    EMAIL_HOST_PASSWORD = os.environ.get('BREVO_SMTP_PASSWORD') # La clave maestra (Master password) que te da Brevo
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = 'mirendarodrigo@gmail.com>'

# ==============================================================================
# ☁️ ALMACENAMIENTO (CLOUDINARY)
# ==============================================================================

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.environ.get('CLOUDINARY_API_KEY'),
    'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET'),
}

STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.RawMediaCloudinaryStorage",
    },
    "staticfiles": {
        # Cambiamos a la versión estándar para que no lance Error 500 si falta un archivo
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage", 
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')