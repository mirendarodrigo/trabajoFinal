import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import Landing from './pages/Landing';
import DashboardLayout from './components/layout/DashboardLayout';
import MisCursos from './pages/alumno/MisCursos';
import MisNotas from './pages/alumno/MisNotas';
import MisMateriales from './pages/alumno/MisMateriales';
import MisAulas from './pages/docente/MisAulas';
import Calificar from './pages/docente/Calificar';
import DetalleAula from './pages/docente/DetalleAula';
import DetalleCurso from './pages/alumno/DetalleCurso';
import Inicio from './pages/Inicio';
import CargarAlumnos from './pages/admin/CargarAlumnos';
import GestionCursos from './pages/admin/GestionCursos';
import GestionComisiones from './pages/admin/GestionComisiones';
import GestionAlumnos from './pages/admin/GestionAlumnos';
import GestionDocentes from './pages/admin/GestionDocentes';
import ComunicadosAdmin from './pages/admin/ComunicadosAdmin';
import EvaluacionesDocente from './pages/docente/EvaluacionesDocente';
import MaterialesDocente from './pages/docente/MaterialesDocente';
import AutoLogout from './components/ui/AutoLogout';
import CambiarPassword from './pages/CambiarPassword';
import RecuperarPassword from './pages/RecuperarPassword';
import Perfil from './pages/Perfil';

const ProtectedRoute = ({ children, requirePasswordChange = false }) => {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/" replace />;

  try {
    const decoded = jwtDecode(token);
    if (decoded.debe_cambiar_password && !requirePasswordChange) return <Navigate to="/cambiar-password" replace />;
    if (!decoded.debe_cambiar_password && requirePasswordChange) return <Navigate to="/dashboard" replace />;
  } catch (error) {
    localStorage.removeItem('access_token');
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AutoLogout />
      <Toaster position="top-center" />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/cambiar-password" element={<ProtectedRoute requirePasswordChange={true}><CambiarPassword /></ProtectedRoute>} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
        <Route path="/recuperar-password/:uid/:token" element={<RecuperarPassword />} />

        <Route path="/dashboard" element={<ProtectedRoute requirePasswordChange={false}><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Inicio />} />
          <Route path="perfil" element={<Perfil />} /> {/* RUTA DE PERFIL AGREGADA */}
          
          <Route path="cargar-alumnos" element={<CargarAlumnos />} />
          <Route path="comisiones" element={<GestionComisiones />} />
          <Route path="cursos" element={<GestionCursos />} />
          <Route path="gestion-alumnos" element={<GestionAlumnos />} />
          <Route path="gestion-docentes" element={<GestionDocentes />} />
          <Route path="comunicados" element={<ComunicadosAdmin />} />
          <Route path="aulas" element={<MisAulas />} />
          <Route path="calificar/:id" element={<Calificar />} />
          <Route path="aulas/:id" element={<DetalleAula />} />
          <Route path="evaluaciones-docente/" element={<EvaluacionesDocente />} />
          <Route path="materiales-docente/" element={<MaterialesDocente />} />
          <Route path="mis-cursos" element={<MisCursos />} />
          <Route path="curso/:id" element={<DetalleCurso />} />
          <Route path="notas" element={<MisNotas />} />
          <Route path="materiales" element={<MisMateriales />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;