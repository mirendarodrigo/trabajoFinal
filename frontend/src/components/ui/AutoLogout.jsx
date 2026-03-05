import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AutoLogout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Si estamos en la landing o en login, no hacemos nada.
    // Solo vigilamos inactividad si el usuario está dentro del dashboard/campus
    if (location.pathname === '/' || location.pathname === '/login') {
      return;
    }

    let timeoutId;

    // Tiempo de inactividad permitido en milisegundos (5 minutos = 300000 ms)
    const MAX_IDLE_TIME = 5 * 60 * 1000

    const handleLogout = () => {
      console.log("⌚ Tiempo de inactividad superado. Cerrando sesión...");
      // Destruimos la evidencia
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Lo mandamos al landing con el cartel de expirado
      navigate('/?expired=true', { replace: true });
    };

    const resetTimer = () => {
      // Cada vez que el usuario se mueve, reiniciamos el reloj de arena
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, MAX_IDLE_TIME);
    };

    // --- EVENTOS QUE CONSIDERAMOS "ACTIVIDAD" ---
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    // Iniciamos el contador la primera vez
    resetTimer();

    // Limpieza cuando el componente se desmonta (para no dejar fantasmas en memoria)
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [navigate, location.pathname]);

  return null; // Este componente no renderiza nada visual, es un vigilante invisible
};

export default AutoLogout;