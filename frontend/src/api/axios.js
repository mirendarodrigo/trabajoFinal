import axios from 'axios';

// 1. Creamos la instancia base
const api = axios.create({
    // Leemos la URL base desde las variables de entorno de Vite
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/',
    headers: {
        'Content-Type': 'application/json',
    }
});

// 2. INTERCEPTOR DE PETICIONES (Agrega el token automáticamente a cada viaje)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. INTERCEPTOR DE RESPUESTAS (El salvavidas de la sesión)
api.interceptors.response.use(
    (response) => response, // Si todo sale bien, dejamos pasar la respuesta
    async (error) => {
        const originalRequest = error.config;

        // Si el error es 401 (Vencido) y NO es una petición a la ruta de login o refresh
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('token/')) {
            originalRequest._retry = true; // Marcamos la petición para no hacer un bucle infinito

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                
                if (refreshToken) {
                    // 🚨 EL ARREGLO: Reutilizamos la variable de entorno para la petición limpia
                    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';
                    
                    // Hacemos una petición limpia (sin interceptores) para renovar el pase
                    const response = await axios.post(`${baseURL}token/refresh/`, {
                        refresh: refreshToken
                    });

                    // ¡Éxito! Guardamos los nuevos tokens en la billetera
                    localStorage.setItem('access_token', response.data.access);
                    if (response.data.refresh) {
                        localStorage.setItem('refresh_token', response.data.refresh); // Guarda el nuevo si hay rotación
                    }

                    // Actualizamos la cabecera de la petición original que había fallado
                    originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
                    
                    // Volvemos a intentar la petición original automáticamente
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Si el refresh_token también venció o es inválido: Cierre de sesión forzado
                console.error("Sesión completamente caducada. Redirigiendo al login...");
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                
                // Redirigimos al usuario al login con un parámetro en la URL
                window.location.href = '/login?expired=true';
                return Promise.reject(refreshError);
            }
        }

        // Si el error es 404, 400, o 500, se lo pasamos al componente de React para que muestre el Toast rojo
        return Promise.reject(error);
    }
);

export default api;