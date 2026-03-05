# 🏫 Campus Piccadilly - Sistema de Gestión Académica

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

Plataforma educativa integral diseñada para optimizar la gestión académica, la comunicación y el seguimiento de alumnos en el **Piccadilly Institute**. Desarrollada bajo una arquitectura de monorepo separando el Backend (API REST) y el Frontend (SPA), con un enfoque 100% *Mobile First*.

## ✨ Características Principales por Rol

La plataforma cuenta con un sistema de autenticación seguro mediante **JSON Web Tokens (JWT)** y control de acceso basado en tres roles principales:

### 👨‍💼 Administrador
* **Métricas y Dashboard:** Visualización en tiempo real de inscripciones, comisiones activas y agenda global.
* **Gestión Institucional:** ABM de Cursos, Niveles y Comisiones.
* **Matrícula y Usuarios:** Alta manual y masiva (importación vía Excel) de alumnos y docentes.
* **Comunicación:** Sistema de anuncios globales y privados por comisión, con hilos de respuestas.

### 👩‍🏫 Docente
* **Mis Aulas:** Acceso directo a las comisiones asignadas.
* **Evaluaciones:** Creación de exámenes y trabajos prácticos, con sistema integral de calificación.
* **Material de Estudio:** Repositorio para subir archivos y recursos para los alumnos.
* **Agenda:** Calendario dinámico con los horarios de dictado de clases y fechas de exámenes.

### 👨‍🎓 Alumno
* **Panel de Control:** Resumen de estado regular y promedio histórico.
* **Mis Cursos:** Acceso al material de estudio y notificaciones de sus comisiones.
* **Mis Notas:** Historial de calificaciones en exámenes y trabajos prácticos.
* **Calendario Personalizado:** Vista de "Día/Mes/Agenda" con clases programadas y fechas límite de entregas.

## 🛠️ Tecnologías Utilizadas

**Frontend:**
* React.js (Vite)
* React Router DOM (Navegación protegida)
* React Bootstrap & CSS puro (Diseño y UI)
* React Big Calendar (Gestión de agendas)
* Axios (Cliente HTTP)
* JWT Decode (Manejo de sesiones)

**Backend:**
* Python 3 / Django
* Django REST Framework (Construcción de la API)
* SimpleJWT (Autenticación)
* Cloudinary (Almacenamiento de medios e imágenes de perfil en la nube)

## 🚀 Instalación y Ejecución Local

### 1. Clonar el repositorio
```bash
git clone [https://github.com/mirendarodrigo/trabajoFinal.git](https://github.com/mirendarodrigo/trabajoFinal.git)
cd trabajoFinal

**Configuración Backend:**

cd backend
python -m venv venv
# Activar entorno (Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

**Configuración Frontend:**

cd frontend
npm install
npm run dev