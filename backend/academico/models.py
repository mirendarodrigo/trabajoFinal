from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class Categoria(models.Model):
    """
    Ej: 'Niños - Nivel Inicial', 'Adolescentes', 'Adultos', 'Workshops'
    """
    nombre = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return self.nombre

class Curso(models.Model):
    """
    El plan de estudios específico.
    Ej: 'Kids 1', 'Teen 4', 'Seniors 1', 'FCE Preparation'
    """
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name="cursos")
    nombre = models.CharField(max_length=100) 
    codigo = models.CharField(max_length=20, unique=True, help_text="Ej: K1, T4, S1")
    es_cuatrimestral = models.BooleanField(default=False, help_text="Marcar si es un curso de Adultos (duración semestral)")

    def __str__(self):
        return f"{self.nombre} ({self.categoria})"

class Comision(models.Model):
    """
    La clase real que se dicta en un momento del tiempo.
    Ej: 'Seniors 1 - Noche - 1er Cuatrimestre 2025'
    """
    PERIODO_CHOICES = (
        ('ANUAL', 'Anual (Todo el año)'),
        ('1C', '1er Cuatrimestre'),
        ('2C', '2do Cuatrimestre'),
        ('VERANO', 'Intensivo Verano'),
    )

    curso = models.ForeignKey(Curso, on_delete=models.PROTECT, related_name="comisiones")
    docente = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL,
        null=True, 
        blank=True,
        limit_choices_to={'rol': 'DOCENTE'},
        related_name="comisiones_a_cargo"
    )
    # Nombre descriptivo, ej: "Lunes y Miércoles 18hs" o "Comisión A"
    nombre = models.CharField(max_length=100) 
    anio = models.IntegerField(default=2025)
    periodo = models.CharField(max_length=10, choices=PERIODO_CHOICES, default='ANUAL')
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Comisiones"

    def __str__(self):
        return f"{self.curso.nombre} - {self.nombre} ({self.periodo} {self.anio})"

# --- MODELO AGREGADO: HORARIO (Vital para la Agenda) ---
class Horario(models.Model):
    DIAS_SEMANA = (
        ('LUN', 'Lunes'),
        ('MAR', 'Martes'),
        ('MIE', 'Miércoles'),
        ('JUE', 'Jueves'),
        ('VIE', 'Viernes'),
        ('SAB', 'Sábado'),
    )

    comision = models.ForeignKey(Comision, on_delete=models.CASCADE, related_name="horarios")
    dia = models.CharField(max_length=3, choices=DIAS_SEMANA)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    aula = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.get_dia_display()} {self.hora_inicio}-{self.hora_fin}"

class Inscripcion(models.Model):
    ESTADOS_CHOICES = [
        ('REGULAR', 'Regular'),
        ('LIBRE', 'Libre'),
        ('PROMOCIONADO', 'Promocionado'),
        ('ABANDONO', 'Abandono'),
    ]

    alumno = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        limit_choices_to={'rol': 'ALUMNO'},
        related_name="inscripciones"
    )
    comision = models.ForeignKey(Comision, on_delete=models.CASCADE, related_name="alumnos")
    fecha_inscripcion = models.DateField(auto_now_add=True)
    
    # ¡NUEVO CAMPO!
    estado_alumno = models.CharField(
        max_length=20, 
        choices=ESTADOS_CHOICES, 
        default='REGULAR'
    )
    
    class Meta:
        unique_together = ('alumno', 'comision')
        verbose_name_plural = "Inscripciones"

    def __str__(self):
        return f"{self.alumno} -> {self.comision} ({self.estado_alumno})"

class Evaluacion(models.Model):
    """
    Representa el evento en la agenda: Un examen, una entrega de TP, etc.
    """
    comision = models.ForeignKey(Comision, on_delete=models.CASCADE, related_name="evaluaciones")
    nombre = models.CharField(max_length=100, help_text="Ej: Parcial 1, TP Final")
    fecha = models.DateTimeField(help_text="Fecha y hora del examen/entrega")
    es_entrega = models.BooleanField(default=False, help_text="Si es True, es un TP para entregar. Si es False, es un examen presencial.")
    temas = models.TextField(blank=True, null=True, help_text="Contenidos a evaluar")

    # CAMPOS DE SELECTIVIDAD
    es_selectivo = models.BooleanField(
        default=False, 
        help_text="Si es True, solo aplica a los alumnos seleccionados. Si es False, es para todos."
    )
    alumnos_asignados = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        blank=True, 
        related_name="evaluaciones_asignadas",
        help_text="Solo necesario si es un examen selectivo (ej: Recuperatorio)"
    )

    # --- __str__ UNIFICADO Y CORREGIDO ---
    def __str__(self):
        tipo = "Entrega" if self.es_entrega else "Examen"
        alcance = "Selectivo" if self.es_selectivo else "General"
        # Formato: Parcial 1 (Examen - General) - 12/05 18:00
        return f"{self.nombre} ({tipo} - {alcance}) - {self.fecha.strftime('%d/%m %H:%M')}"

class Nota(models.Model):
    """
    La calificación individual de un alumno para una Evaluación específica.
    """
    inscripcion = models.ForeignKey(Inscripcion, on_delete=models.CASCADE, related_name="notas")
    evaluacion = models.ForeignKey(Evaluacion, on_delete=models.CASCADE, related_name="calificaciones")
    
    valor = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    observacion = models.TextField(blank=True, null=True)
    
    class Meta:
        unique_together = ('inscripcion', 'evaluacion')

    def __str__(self):
        return f"{self.inscripcion.alumno}: {self.valor} en {self.evaluacion.nombre}"

class Asistencia(models.Model):
    inscripcion = models.ForeignKey(Inscripcion, on_delete=models.CASCADE, related_name="asistencias")
    fecha = models.DateField()
    presente = models.BooleanField(default=False)

    class Meta:
        unique_together = ('inscripcion', 'fecha')

    def __str__(self):
        estado = "P" if self.presente else "A"
        return f"{self.inscripcion.alumno} [{self.fecha}]: {estado}"
    
class MaterialEstudio(models.Model):
    comision = models.ForeignKey(Comision, on_delete=models.CASCADE, related_name="materiales")
    titulo = models.CharField(max_length=200, help_text="Ej: Unidad 1 - Introducción")
    descripcion = models.TextField(blank=True, null=True, help_text="Instrucciones o resumen breve")
    
    # Puede subir un archivo físico...
    archivo = models.FileField(upload_to='materiales/%Y/%m/',max_length=500, blank=True, null=True)
    
    # ... o puede dejar un link externo (YouTube, Drive, un sitio web)
    enlace = models.URLField(blank=True, null=True, help_text="Enlace a recurso externo")
    
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.titulo} - {self.comision.nombre}"    
    
class Anuncio(models.Model):
    TIPO_AUDIENCIA = [
        ('COMISION', 'Toda la Comisión (Alumnos y Docente)'),
        ('TODOS_DOCENTES', 'Todos los Docentes (Global)'),
        ('DOCENTES_ESPECIFICOS', 'Docentes Específicos'),
    ]

    # Ahora 'comision' puede ser nulo, porque un aviso a "Todos los docentes" no tiene un aula específica
    comision = models.ForeignKey(Comision, on_delete=models.CASCADE, related_name="anuncios", null=True, blank=True)
    
    # --- NUEVOS CAMPOS DE FILTRADO (Superpoderes de Admin) ---
    tipo_audiencia = models.CharField(max_length=30, choices=TIPO_AUDIENCIA, default='COMISION')
    docentes_especificos = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="anuncios_recibidos", blank=True)
    # ---------------------------------------------------------

    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=200)
    contenido = models.TextField()
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_expiracion = models.DateTimeField(blank=True, null=True, help_text="Si está vacío, es permanente")
    
    permite_comentarios = models.BooleanField(default=True)
    visto_por = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="anuncios_vistos", blank=True)
    hay_comentarios_nuevos = models.BooleanField(default=False)

    def __str__(self):
        if self.comision:
            return f"{self.titulo} - {self.comision.nombre}"
        return f"{self.titulo} - {self.get_tipo_audiencia_display()}"

class ComentarioAnuncio(models.Model):
    anuncio = models.ForeignKey(Anuncio, on_delete=models.CASCADE, related_name="comentarios")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    contenido = models.TextField()
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comentario de {self.autor.username} en {self.anuncio.id}"