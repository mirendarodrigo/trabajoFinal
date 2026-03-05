from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

# Definimos cómo se ve el usuario en el admin
class CustomUserAdmin(UserAdmin):
    # Agregamos nuestros campos personalizados a los 'fieldsets' (secciones del formulario)
    # Esto extiende la configuración por defecto de Django
    fieldsets = UserAdmin.fieldsets + (
        ('Información Académica', {'fields': ('rol', 'dni', 'telefono','imagen_perfil')}),
    )
    
    # Columnas que se ven en la lista de usuarios
    list_display = ('username', 'email', 'first_name', 'last_name', 'rol', 'dni', 'is_staff')
    
    # Filtros laterales
    list_filter = ('rol', 'is_staff', 'is_superuser', 'groups')
    
    # Campos por los que se puede buscar
    search_fields = ('username', 'first_name', 'last_name', 'dni', 'email')

# Registramos el modelo
admin.site.register(CustomUser, CustomUserAdmin)