import api from '../api/axios';
import { jwtDecode } from "jwt-decode";

export const login = async (username, password) => {
    try {
        // 1. Pedimos el token a Django
        const response = await api.post('token/', { username, password });
        
        // 2. Si responde bien, guardamos los tokens en el navegador
        if (response.data.access) {
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            
            // 3. Decodificamos el token para saber quién es (Admin? Alumno?)
            const decoded = jwtDecode(response.data.access);
            return { success: true, user: decoded };
        }
    } catch (error) {
        console.error("Error en login:", error);
        return { 
            success: false, 
            error: error.response?.data?.detail || "Error de conexión" 
        };
    }
};

export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/'; // Redirigir al inicio
};