from rest_framework import serializers
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'rol', 'dni', 'telefono', 'password','imagen_perfil')
        extra_kwargs = {'password': {'write_only': True}} 

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user

# --- LÓGICA UNIFICADA PARA EL TOKEN ---
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # Obtenemos el token original
        token = super().get_token(user)

        # Inyectamos nuestros datos personalizados
        token['username'] = user.username
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['rol'] = user.rol
        token['imagen_perfil'] = user.imagen_perfil.url if user.imagen_perfil else None
        
        # Dato clave de seguridad
        token['debe_cambiar_password'] = getattr(user, 'debe_cambiar_password', False)

        return token

# La vista va al final, leyendo el serializador definitivo
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer