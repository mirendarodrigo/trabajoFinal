from django.contrib import admin
from .models import Categoria, Curso, Comision, Inscripcion, Nota, Asistencia, Evaluacion, Horario

# 1. Configurar los Horarios para que se vean "dentro" de la Comisión
class HorarioInline(admin.TabularInline):
    model = Horario
    extra = 1 # Muestra 1 renglón vacío por defecto para agregar rápido

class ComisionAdmin(admin.ModelAdmin):
    list_display = ('curso', 'nombre', 'docente', 'periodo', 'anio', 'activo')
    list_filter = ('anio', 'periodo', 'curso__categoria')
    search_fields = ('curso__nombre', 'docente__username')
    # Aquí agregamos los inlines
    inlines = [HorarioInline]

class InscripcionAdmin(admin.ModelAdmin):
    list_display = ('alumno', 'comision', 'fecha_inscripcion')
    search_fields = ('alumno__username', 'alumno__dni')
    list_filter = ('comision__anio', 'comision__periodo')

class EvaluacionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'comision', 'fecha', 'es_entrega', 'es_selectivo')
    list_filter = ('comision', 'es_selectivo')

# 2. Registros finales
admin.site.register(Categoria)
admin.site.register(Curso)
admin.site.register(Comision, ComisionAdmin)
admin.site.register(Inscripcion, InscripcionAdmin)
admin.site.register(Nota)
admin.site.register(Asistencia)
admin.site.register(Evaluacion, EvaluacionAdmin)
# No registramos Horario suelto porque ya está dentro de Comision