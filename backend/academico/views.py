from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from django.db.models import Count, Q
from django.db import transaction
from django.utils import timezone  
from django.core.mail import send_mass_mail
from django.core.exceptions import PermissionDenied
import threading
import pandas as pd
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from rest_framework.permissions import AllowAny

from users.models import CustomUser
from users.serializers import UserSerializer
from .models import Categoria, Curso, Anuncio, ComentarioAnuncio, Comision, Inscripcion, Nota, MaterialEstudio, Evaluacion, Horario, Asistencia
from .serializers import (
    CategoriaSerializer, CursoSerializer, ComisionSerializer, MaterialEstudioSerializer,ComentarioAnuncioSerializer, AnuncioSerializer,
    EvaluacionSerializer, NotaSerializer, InscripcionSerializer,AsistenciaSerializer, FileUploadSerializer, HorarioSerializer
)

# =====================================================================
# 🛡️ CLASES DE SEGURIDAD (PERMISOS PERSONALIZADOS)
# =====================================================================

class IsAdminOrReadOnly(BasePermission):
    """ Solo Administradores pueden crear/editar/borrar. El resto solo puede leer. """
    def has_permission(self, request, view):
        if not request.user.is_authenticated: return False
        if request.method in SAFE_METHODS: return True
        return request.user.rol == 'ADMIN' or request.user.is_staff

class SoloLecturaAlumnos(BasePermission):
    """ Alumnos solo pueden leer (GET). Docentes y Admins pueden escribir. """
    def has_permission(self, request, view):
        if not request.user.is_authenticated: return False
        if request.user.rol == 'ALUMNO' and request.method not in SAFE_METHODS:
            return False # Bloquea POST, PUT, PATCH, DELETE a los alumnos
        return True


# =====================================================================
# 🚀 VIEWSETS BLINDADOS
# =====================================================================

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrReadOnly] # 🔒 Solo Admin edita

class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer
    permission_classes = [IsAdminOrReadOnly] # 🔒 Solo Admin edita

class ComisionViewSet(viewsets.ModelViewSet):
    serializer_class = ComisionSerializer
    permission_classes = [IsAdminOrReadOnly] # 🔒 Solo Admin edita
    filterset_fields = ['curso', 'docente', 'activo']

    def get_queryset(self):
        user = self.request.user
        base_qs = Comision.objects.select_related('curso', 'docente').prefetch_related('horarios').annotate(
            alumnos_count=Count('alumnos')
        ).all()
        
        if user.rol == 'DOCENTE':
            return base_qs.filter(docente=user)
        elif user.rol == 'ALUMNO':
            # El alumno solo puede ver las comisiones en las que está inscripto
            return base_qs.filter(alumnos__alumno=user)
            
        return base_qs

class InscripcionViewSet(viewsets.ModelViewSet):
    serializer_class = InscripcionSerializer
    permission_classes = [IsAdminOrReadOnly] # 🔒 Alumnos no pueden matricularse a sí mismos
    filterset_fields = ['comision', 'alumno']

    def get_queryset(self):
        user = self.request.user
        base_qs = Inscripcion.objects.select_related('alumno', 'comision', 'comision__curso').all()

        if user.rol == 'ALUMNO':
            return base_qs.filter(alumno=user) # Privacidad absoluta
        elif user.rol == 'DOCENTE':
            return base_qs.filter(comision__docente=user)
            
        return base_qs

class EvaluacionViewSet(viewsets.ModelViewSet):
    serializer_class = EvaluacionSerializer
    permission_classes = [SoloLecturaAlumnos] # 🔒 Alumno no puede crear exámenes
    filterset_fields = ['comision']
    
    def get_queryset(self):
        user = self.request.user
        base_qs = Evaluacion.objects.select_related('comision').all()
        
        if user.rol == 'ALUMNO':
            mis_comisiones_ids = user.inscripciones.values_list('comision_id', flat=True)
            return base_qs.filter(comision__id__in=mis_comisiones_ids).filter(
                Q(es_selectivo=False) | Q(alumnos_asignados=user)
            ).distinct()

        elif user.rol == 'DOCENTE':
            return base_qs.filter(comision__docente=user)
            
        return base_qs

class NotaViewSet(viewsets.ModelViewSet):
    serializer_class = NotaSerializer
    permission_classes = [SoloLecturaAlumnos] # 🔒 ¡VITAL! Evita que alumnos editen su nota
    filterset_fields = ['evaluacion', 'inscripcion', 'evaluacion__comision'] 

    def get_queryset(self):
        user = self.request.user
        base_qs = Nota.objects.select_related('inscripcion', 'inscripcion__alumno', 'evaluacion').all()
        
        if user.rol == 'ALUMNO':
            return base_qs.filter(inscripcion__alumno=user)
        elif user.rol == 'DOCENTE':
            return base_qs.filter(evaluacion__comision__docente=user)
            
        return base_qs

class UsuarioViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrReadOnly] # 🔒 Nadie borra usuarios excepto Admin
    filterset_fields = ['rol']

    def get_queryset(self):
        user = self.request.user
        base_qs = CustomUser.objects.all()
        
        if user.rol == 'ALUMNO':
            # Un alumno solo debería poder descargar sus propios datos (o los de su profesor a lo sumo)
            return base_qs.filter(id=user.id)
            
        return base_qs
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def cambiar_password(self, request):
        nueva_password = request.data.get('nueva_password')
        
        if not nueva_password or len(nueva_password) < 6:
            return Response(
                {'error': 'La contraseña debe tener al menos 6 caracteres.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        user.set_password(nueva_password) # Encripta la nueva clave
        user.debe_cambiar_password = False # ¡Le quitamos la restricción!
        user.save()
        
        return Response({'status': 'Contraseña actualizada correctamente'}, status=status.HTTP_200_OK)
    
class HorarioViewSet(viewsets.ModelViewSet):
    serializer_class = HorarioSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Horario.objects.select_related('comision').all()
        comision_id = self.request.query_params.get('comision', None)
        if comision_id is not None:
            queryset = queryset.filter(comision_id=comision_id)
        return queryset

class AsistenciaViewSet(viewsets.ModelViewSet):
    serializer_class = AsistenciaSerializer
    permission_classes = [SoloLecturaAlumnos] # 🔒 Alumno no puede auto-pasarse asistencia

    def get_queryset(self):
        user = self.request.user
        base_qs = Asistencia.objects.select_related('inscripcion', 'inscripcion__alumno').all()

        if user.rol == 'ALUMNO':
            return base_qs.filter(inscripcion__alumno=user)
        elif user.rol == 'DOCENTE':
            return base_qs.filter(inscripcion__comision__docente=user)
            
        return base_qs

    def create(self, request, *args, **kwargs):
        is_many = isinstance(request.data, list)
        if not is_many:
            return super(AsistenciaViewSet, self).create(request, *args, **kwargs)
        
        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class MaterialEstudioViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialEstudioSerializer 
    permission_classes = [SoloLecturaAlumnos] # 🔒
    filterset_fields = ['comision']   
    
    def get_queryset(self):
        user = self.request.user
        base_qs = MaterialEstudio.objects.select_related('comision').all().order_by('-fecha_subida')

        if user.rol == 'ALUMNO':
            mis_comisiones_ids = user.inscripciones.values_list('comision_id', flat=True)
            return base_qs.filter(comision__id__in=mis_comisiones_ids)
        elif user.rol == 'DOCENTE':
            return base_qs.filter(comision__docente=user)
            
        return base_qs

class AnuncioViewSet(viewsets.ModelViewSet):
    serializer_class = AnuncioSerializer
    permission_classes = [SoloLecturaAlumnos] # 🔒
    filterset_fields = ['comision', 'autor']
    
    def perform_create(self, serializer):
        anuncio = serializer.save(autor=self.request.user)
        anuncio.visto_por.add(self.request.user)

    def get_queryset(self):
        user = self.request.user
        ahora = timezone.now()
        
        base_qs = Anuncio.objects.select_related('autor', 'comision').prefetch_related(
            'visto_por', 'comentarios', 'comentarios__autor'
        ).filter(
            Q(fecha_expiracion__isnull=True) | Q(fecha_expiracion__gt=ahora)
        )

        if user.rol == 'ADMIN' or user.is_staff:
            return base_qs.order_by('-fecha_creacion')
            
        elif user.rol == 'DOCENTE':
            mis_comisiones = Comision.objects.filter(docente=user).values_list('id', flat=True)
            return base_qs.filter(
                Q(comision__id__in=mis_comisiones, tipo_audiencia='COMISION') |
                Q(tipo_audiencia='TODOS_DOCENTES') |
                Q(tipo_audiencia='DOCENTES_ESPECIFICOS', docentes_especificos=user)
            ).distinct().order_by('-fecha_creacion')
            
        elif user.rol == 'ALUMNO':
            mis_comisiones = Inscripcion.objects.filter(alumno=user).values_list('comision_id', flat=True)
            return base_qs.filter(
                comision__id__in=mis_comisiones, 
                tipo_audiencia='COMISION'
            ).distinct().order_by('-fecha_creacion')
            
        return base_qs.none()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def marcar_visto(self, request, pk=None):
        anuncio = self.get_object()
        anuncio.visto_por.add(request.user)
        anuncio.save()
        return Response({'status': 'marcado como visto'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def apagar_alarma_comentarios(self, request, pk=None):
        anuncio = self.get_object()
        if request.user == anuncio.autor or request.user.rol == 'ADMIN':
            anuncio.hay_comentarios_nuevos = False
            anuncio.save()
            return Response({'status': 'alarma apagada'})
        return Response(status=status.HTTP_403_FORBIDDEN)

class ComentarioAnuncioViewSet(viewsets.ModelViewSet):
    serializer_class = ComentarioAnuncioSerializer
    permission_classes = [IsAuthenticated] # 🔒 Aquí el alumno SÍ puede escribir (POST)

    def get_queryset(self):
        user = self.request.user
        base_qs = ComentarioAnuncio.objects.select_related('autor').all().order_by('fecha_creacion')

        # 1. El Admin puede leer todos los comentarios
        if user.rol == 'ADMIN' or user.is_staff:
            return base_qs
            
        # 2. El Docente solo lee comentarios de sus aulas o de anuncios globales/privados
        elif user.rol == 'DOCENTE':
            mis_comisiones = Comision.objects.filter(docente=user).values_list('id', flat=True)
            return base_qs.filter(
                Q(anuncio__comision__id__in=mis_comisiones) |
                Q(anuncio__tipo_audiencia='TODOS_DOCENTES') |
                Q(anuncio__tipo_audiencia='DOCENTES_ESPECIFICOS', anuncio__docentes_especificos=user)
            ).distinct()
            
        # 3. El Alumno solo lee comentarios de los anuncios de su aula
        elif user.rol == 'ALUMNO':
            mis_comisiones = Inscripcion.objects.filter(alumno=user).values_list('comision_id', flat=True)
            return base_qs.filter(
                anuncio__comision__id__in=mis_comisiones, 
                anuncio__tipo_audiencia='COMISION'
            ).distinct()
            
        return base_qs.none()

    def perform_create(self, serializer):
        # Validación cruzada: ¿Tiene permiso para ver el anuncio donde comenta?
        anuncio_id = self.request.data.get('anuncio')
        
        if self.request.user.rol == 'ALUMNO':
            # Evita que un alumno comente en un anuncio global de profesores o de otra aula
            try:
                anuncio_destino = Anuncio.objects.get(id=anuncio_id)
                if anuncio_destino.tipo_audiencia != 'COMISION':
                    raise PermissionDenied("No puedes comentar en anuncios institucionales.")
                    
                acceso = Inscripcion.objects.filter(alumno=self.request.user, comision=anuncio_destino.comision).exists()
                if not acceso:
                    raise PermissionDenied("No perteneces a esta clase.")
            except Anuncio.DoesNotExist:
                raise PermissionDenied("El anuncio no existe.")
                
        comentario = serializer.save(autor=self.request.user)
        anuncio = comentario.anuncio
        anuncio.visto_por.clear()
        anuncio.visto_por.add(self.request.user)
        anuncio.save()
# =====================================================================
# 📥 CARGA MASIVA 
# =====================================================================
class UploadAlumnosView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        if request.user.rol != 'ADMIN':
            return Response(
                {"error": "Acceso denegado. Solo los administradores pueden hacer cargas masivas."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No se ha subido ningún archivo"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(file_obj)
            required_columns = ['DNI', 'NOMBRE', 'APELLIDO', 'EMAIL','CODIGO_CURSO']
            df.columns = [col.upper().strip() for col in df.columns]

            if not all(col in df.columns for col in required_columns):
                missing = [col for col in required_columns if col not in df.columns]
                return Response(
                    {"error": f"Faltan columnas en el Excel: {missing}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            anio_actual = timezone.now().year
            comisiones_activas = Comision.objects.filter(activo=True, anio=anio_actual).select_related('curso')
            mapa_comisiones = {c.curso.codigo: c for c in comisiones_activas}

            dnis_excel = []
            for d in df['DNI']:
                d_str = str(d).strip()
                if d_str.endswith('.0'): d_str = d_str[:-2]
                dnis_excel.append(d_str)

            usuarios_existentes = {u.username: u for u in CustomUser.objects.filter(username__in=dnis_excel)}

            nuevos_usuarios = []
            mensajes_correo = []

            for index, row in df.iterrows():
                dni = str(row['DNI']).strip()
                if dni.endswith('.0'): dni = dni[:-2]
                
                codigo_curso = str(row['CODIGO_CURSO']).strip()

                if codigo_curso not in mapa_comisiones:
                    return Response({"error": f"No hay comisiones activas {anio_actual} para el curso {codigo_curso} (Fila {index+2})" }, status=status.HTTP_400_BAD_REQUEST)

                if dni not in usuarios_existentes:
                    user = CustomUser(
                        username=dni,
                        dni=dni,
                        first_name=str(row['NOMBRE']).strip(),
                        last_name=str(row['APELLIDO']).strip(),
                        email=str(row['EMAIL']).strip(),
                        rol='ALUMNO'
                    )
                    user.set_password(dni)
                    nuevos_usuarios.append(user)
                    
                    usuarios_existentes[dni] = user

                    if user.email:
                        mensaje = (
                            'Bienvenido al Campus Piccadilly',
                            f'Hola {user.first_name},\n\nTu cuenta ha sido creada. Ingresa con tu DNI.\nUsuario: {dni}\nContraseña: {dni}',
                            'no-reply@piccadilly.com', 
                            [user.email]
                        )
                        mensajes_correo.append(mensaje)

            with transaction.atomic():
                if nuevos_usuarios:
                    CustomUser.objects.bulk_create(nuevos_usuarios, ignore_conflicts=True)
                
                usuarios_refrescados = {u.username: u for u in CustomUser.objects.filter(username__in=dnis_excel)}
                
                inscripciones_a_crear = []
                inscripciones_existentes = set(
                    Inscripcion.objects.filter(alumno__username__in=dnis_excel).values_list('alumno__username', 'comision_id')
                )

                for index, row in df.iterrows():
                    dni = str(row['DNI']).strip()
                    if dni.endswith('.0'): dni = dni[:-2]
                    
                    codigo_curso = str(row['CODIGO_CURSO']).strip()
                    comision = mapa_comisiones[codigo_curso]
                    user_actual = usuarios_refrescados.get(dni)

                    if user_actual and (dni, comision.id) not in inscripciones_existentes:
                        inscripciones_a_crear.append(
                            Inscripcion(alumno=user_actual, comision=comision, estado_alumno='REGULAR')
                        )
                        inscripciones_existentes.add((dni, comision.id)) 

                if inscripciones_a_crear:
                    Inscripcion.objects.bulk_create(inscripciones_a_crear, ignore_conflicts=True)

            if mensajes_correo:
                def enviar_correos_background():
                    try:
                        send_mass_mail(mensajes_correo, fail_silently=True)
                    except Exception as e:
                        print(f"Error enviando correos: {e}")

                threading.Thread(target=enviar_correos_background).start()

            return Response(
                {"status": "success", "mensaje": f"Procesado correctamente. {len(nuevos_usuarios)} alumnos nuevos y {len(inscripciones_a_crear)} inscripciones generadas."}, 
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            import traceback
            traceback.print_exc() 
            return Response({"error": "Ocurrió un error inesperado procesando el archivo."}, status=status.HTTP_400_BAD_REQUEST)

# =====================================================================
# 🔑 RECUPERACIÓN DE CONTRASEÑA 
# =====================================================================
class SolicitarResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # AHORA PEDIMOS EL DNI/USERNAME
        username = request.data.get('username') 
        user = CustomUser.objects.filter(username=username).first()
        
        # Solo enviamos si el usuario existe Y tiene un correo guardado
        if user and user.email:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            link = f"http://localhost:5173/recuperar-password/{uid}/{token}"
            
            send_mail(
                'Recuperación de Contraseña - Piccadilly',
                f'Hola {user.first_name},\n\nHaz clic en el siguiente enlace para crear una nueva contraseña:\n{link}\n\nSi no solicitaste esto, ignora este correo.',
                'no-reply@campus.piccadilly.com',
                [user.email],
                fail_silently=True,
            )
            
        return Response({'mensaje': 'Si el DNI existe y tiene un correo asociado, enviamos las instrucciones.'}, status=status.HTTP_200_OK)

class ConfirmarResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = CustomUser.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            user = None

        # --- AHORA TE DIREMOS EXACTAMENTE QUÉ FALLA ---
        if user is None:
            return Response({'error': 'El usuario del enlace no existe (UID corrupto).'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not default_token_generator.check_token(user, token):
            return Response({'error': 'El token de seguridad expiró, ya fue usado, o está mal copiado.'}, status=status.HTTP_400_BAD_REQUEST)

        # Si pasa las barreras, cambiamos la clave
        nueva_password = request.data.get('nueva_password')
        if not nueva_password or len(nueva_password) < 6:
            return Response({'error': 'La contraseña debe tener al menos 6 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(nueva_password)
        user.debe_cambiar_password = False 
        user.save()
        return Response({'mensaje': 'Contraseña restablecida con éxito.'}, status=status.HTTP_200_OK)        