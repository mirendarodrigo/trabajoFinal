from users.serializers import UserSerializer
from rest_framework import serializers
from .models import Categoria, Curso, Comision, Inscripcion, Nota, Asistencia,MaterialEstudio, Evaluacion, Horario, Anuncio, ComentarioAnuncio


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

class CursoSerializer(serializers.ModelSerializer):
    nombre_categoria = serializers.CharField(source='categoria.nombre', read_only=True)
    
    class Meta:
        model = Curso
        fields = '__all__'
   
class HorarioSerializer(serializers.ModelSerializer):
   
    dia_nombre = serializers.CharField(source='get_dia_display', read_only=True) 

    class Meta:
        model = Horario
        fields = '__all__'

    def validate(self, data):
        """
        Validamos que la hora de inicio tenga sentido y que 
        el docente no tenga otra clase superpuesta en el mismo día.
        """
        comision = data.get('comision')
        dia = data.get('dia')
        hora_inicio = data.get('hora_inicio')
        hora_fin = data.get('hora_fin')

        # Si estamos editando un horario existente, rescatamos los datos que falten
        if self.instance:
            comision = comision or self.instance.comision
            dia = dia or self.instance.dia
            hora_inicio = hora_inicio or self.instance.hora_inicio
            hora_fin = hora_fin or self.instance.hora_fin

        # 1. Validación básica de lógica de tiempo
        if hora_inicio >= hora_fin:
            raise serializers.ValidationError({
                "error": "La hora de inicio debe ser anterior a la hora de fin."
            })

        # 2. Validación de choque de horarios del DOCENTE
        if comision and comision.docente:
            docente = comision.docente
            
            # Buscamos todos los horarios que tiene ESTE docente en ESTE mismo día
            horarios_existentes = Horario.objects.filter(
                comision__docente=docente,
                dia=dia,
                comision__activo=True
            )

            # Si estamos editando, nos excluimos a nosotros mismos de la búsqueda
            if self.instance:
                horarios_existentes = horarios_existentes.exclude(id=self.instance.id)

            for h in horarios_existentes:
                if hora_inicio < h.hora_fin and hora_fin > h.hora_inicio:
                    h_ini_str = h.hora_inicio.strftime('%H:%M')
                    h_fin_str = h.hora_fin.strftime('%H:%M')
                    
                    nombre_docente = f"{docente.first_name} {docente.last_name}".strip() or docente.username
                    
                    # Solución: Mapeo manual y seguro de los días
                    nombres_dias = {
                        'LUN': 'Lunes', 'MAR': 'Martes', 'MIE': 'Miércoles', 
                        'JUE': 'Jueves', 'VIE': 'Viernes', 'SAB': 'Sábado', 'DOM': 'Domingo'
                    }
                    dia_legible = nombres_dias.get(dia, dia)
                    
                    raise serializers.ValidationError({
                        "error": f"Choque de horarios: El docente {nombre_docente} ya dicta clases en '{h.comision.nombre}' los {dia_legible} de {h_ini_str} a {h_fin_str}."
                    })

        return data
        

class ComisionSerializer(serializers.ModelSerializer):
    nombre_curso = serializers.CharField(source='curso.nombre', read_only=True)
    nombre_docente = serializers.CharField(source='docente.get_full_name', read_only=True)
    periodo_nombre = serializers.CharField(source='get_periodo_display', read_only=True) 
    horarios = HorarioSerializer(many=True, read_only=True)
    alumnos_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Comision
        fields = '__all__'

class InscripcionSerializer(serializers.ModelSerializer):
    nombre_alumno = serializers.CharField(source='alumno.get_full_name', read_only=True)
    nombre_comision = serializers.CharField(source='comision.nombre', read_only=True)
    curso_comision = serializers.CharField(source='comision.curso.nombre', read_only=True)
    comision_detalle = ComisionSerializer(source='comision', read_only=True)
    alumno_detalle = UserSerializer(source='alumno', read_only=True)

    class Meta:
        model = Inscripcion
        fields = '__all__'

    class Meta:
        model = Inscripcion
        fields = '__all__'
        
class EvaluacionSerializer(serializers.ModelSerializer):
    nombre_comision = serializers.CharField(source='comision.nombre', read_only=True)
    nombre_curso = serializers.CharField(source='comision.curso.nombre', read_only=True)

    class Meta:
        model = Evaluacion
        fields = '__all__'

class NotaSerializer(serializers.ModelSerializer):
    alumno_nombre = serializers.CharField(source='inscripcion.alumno.get_full_name', read_only=True)
    evaluacion_info = serializers.CharField(source='evaluacion.nombre', read_only=True)
    
    class Meta:
        model = Nota
        fields = '__all__'
       
        
    def validate(self, data):
        """
        Validación cruzada: ¿Este alumno tenía que rendir este examen?
        """
        # 1. Usamos .get() para evitar el KeyError mortal
        evaluacion = data.get('evaluacion')
        inscripcion = data.get('inscripcion')

        # 2. Si estamos modificando una nota existente (PUT/PATCH), 
        # y React no mandó estos datos, los rescatamos de la base de datos
        if self.instance:
            evaluacion = evaluacion or self.instance.evaluacion
            inscripcion = inscripcion or self.instance.inscripcion

        # 3. Ejecutamos tu validación SOLO si tenemos ambos datos asegurados
        if evaluacion and inscripcion:
            alumno = inscripcion.alumno

            # Si el examen es selectivo, verificar que el alumno esté en la lista blanca
            if evaluacion.es_selectivo:
                if not evaluacion.alumnos_asignados.filter(id=alumno.id).exists():
                    raise serializers.ValidationError(
                        {"error": f"El alumno {alumno} no estaba asignado a esta evaluación selectiva."}
                    )
        
        return data

class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    
    
class AsistenciaSerializer(serializers.ModelSerializer):
   
    alumno_nombre = serializers.CharField(source='inscripcion.alumno.first_name', read_only=True)
    alumno_apellido = serializers.CharField(source='inscripcion.alumno.last_name', read_only=True)
    alumno_dni = serializers.CharField(source='inscripcion.alumno.dni', read_only=True)

    class Meta:
        model = Asistencia
        fields = '__all__'

class MaterialEstudioSerializer(serializers.ModelSerializer):
    # Campo extra para que React pueda leer el nombre del aula sin hacer malabares
    comision_nombre = serializers.CharField(source='comision.nombre', read_only=True)
    
    class Meta:
        model = MaterialEstudio
        fields = '__all__'       
        
class ComentarioAnuncioSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    # Por si el usuario no tiene cargado nombre y apellido, mandamos el username como backup
    autor_username = serializers.CharField(source='autor.username', read_only=True)

    class Meta:
        model = ComentarioAnuncio
        fields = '__all__'
        read_only_fields = ['autor']

class AnuncioSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.CharField(source='autor.get_full_name', read_only=True)
    comentarios = ComentarioAnuncioSerializer(many=True, read_only=True) # Traemos los comentarios anidados

    class Meta:
        model = Anuncio
        fields = '__all__' 
        