#!/usr/bin/env bash
# Salir inmediatamente si ocurre algún error
set -o errexit

echo "📦 Instalando dependencias..."
pip install -r requirements.txt

echo "🎨 Recolectando archivos estáticos..."
python manage.py collectstatic --no-input

echo "🗄️ Aplicando migraciones a la base de datos..."
python manage.py migrate

echo "👑 Verificando/Creando Superusuario Admin..."
python manage.py shell -c "
from django.contrib.auth import get_user_model;
import os;
User = get_user_model();
username = 'admin';
email = 'admin@piccadilly.com';
password = 'AdminPassword2026!';

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password);
    print(f'✅ Superusuario creado: {username}');
else:
    print('ℹ️ El superusuario ya existe.');
"