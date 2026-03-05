from django.contrib import admin
from academico.views import SolicitarResetPasswordView, ConfirmarResetPasswordView
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView 
from users.serializers import CustomTokenObtainPairView 
from users.serializers import CustomTokenObtainPairSerializer
from academico.views import (
    UsuarioViewSet, HorarioViewSet, CategoriaViewSet, MaterialEstudioViewSet,
    AnuncioViewSet, ComentarioAnuncioViewSet, CursoViewSet, NotaViewSet,
    EvaluacionViewSet, ComisionViewSet, InscripcionViewSet, UploadAlumnosView,
    AsistenciaViewSet
)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

router = DefaultRouter()
router.register(r'anuncios', AnuncioViewSet, basename='anuncio')
router.register(r'comentarios', ComentarioAnuncioViewSet, basename='comentario')
router.register(r'materiales', MaterialEstudioViewSet, basename='material')
router.register(r'asistencias', AsistenciaViewSet, basename='asistencia')
router.register(r'horarios', HorarioViewSet, basename='horario')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'cursos', CursoViewSet, basename='curso')
router.register(r'comisiones', ComisionViewSet, basename='comision')
router.register(r'inscripciones', InscripcionViewSet, basename='inscripcion')
router.register(r'evaluaciones', EvaluacionViewSet, basename='evaluacion')
router.register(r'notas', NotaViewSet, basename='nota')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include(router.urls)),
    path('api/upload-alumnos/', UploadAlumnosView.as_view(), name='upload_alumnos'),
    path('api/solicitar-reset/', SolicitarResetPasswordView.as_view(), name='solicitar_reset'),
    path('api/confirmar-reset/<str:uidb64>/<str:token>/', ConfirmarResetPasswordView.as_view(), name='confirmar_reset'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)