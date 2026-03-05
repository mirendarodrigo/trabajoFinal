import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Badge } from 'react-bootstrap';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import toast from 'react-hot-toast';

// IMPORTAMOS LAS IMÁGENES POR DEFECTO PARA MANTENER LA COHERENCIA
import adminImg from '../assets/admindefault.png';
import teacherImg from '../assets/teacherdefault.png';
import studentImg from '../assets/studentdefault.png';

const Perfil = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // 🚨 LA MAGIA: Leemos la URL de Render desde las variables de Vercel
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) throw new Error("No token found");
                
                const decoded = jwtDecode(token);
                
                // Usamos la URL dinámica
                const response = await axios.get(`${baseURL}usuarios/${decoded.user_id}/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUser(response.data);
            } catch (error) {
                toast.error("Error al cargar datos del perfil");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [baseURL]);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('imagen_perfil', file);

        setUploading(true);
        try {
            const token = localStorage.getItem('access_token');
            
            // Usamos la URL dinámica
            const response = await axios.patch(`${baseURL}usuarios/${user.id}/`, formData, {
                headers: { 
                    'Authorization': `Bearer ${token}`
                    // El navegador pone el Content-Type multipart/form-data automáticamente
                }
            });

            if (response.data.imagen_perfil) {
                localStorage.setItem('avatar_actualizado', response.data.imagen_perfil);
            }

            toast.success("¡Foto de perfil actualizada!");
            window.location.reload(); 
            
        } catch (error) {
            console.error("🚨 Error detallado de Django:", error.response?.data || error.message);
            toast.error("Hubo un problema al subir la imagen");
        } finally {
            setUploading(false);
        }
    };

    // FUNCIÓN PARA LA IMAGEN POR DEFECTO SEGÚN ROL
    const getAvatar = () => {
        // Si hay imagen en Cloudinary, la usamos
        if (user?.imagen_perfil) return user.imagen_perfil;
        
        // Si no, asignamos la de por defecto
        const rol = user?.rol?.toUpperCase();
        if (rol === 'ADMIN') return adminImg;
        if (rol === 'DOCENTE') return teacherImg;
        return studentImg; 
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
                <Spinner animation="border" style={{ color: '#0b2265' }} />
            </div>
        );
    }

    if (!user) {
        return (
            <Container className="py-5 text-center">
                <h4 className="text-muted">No se pudo cargar la información del perfil.</h4>
                <Button variant="outline-danger" className="mt-3" onClick={() => window.history.back()}>Volver</Button>
            </Container>
        );
    }

    return (
        <Container className="py-4 animated fadeIn">
            
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold text-piccadilly-blue m-0">
                    <i className="bi bi-person-circle me-2 text-danger"></i> Mi Perfil
                </h2>
                <Button variant="outline-secondary" size="sm" className="rounded-pill px-3 fw-medium" onClick={() => window.history.back()}>
                    <i className="bi bi-arrow-left me-1"></i> Volver al panel
                </Button>
            </div>

            <Row className="justify-content-center">
                <Col xs={12} md={10} lg={8}>
                    <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
                        
                        {/* PORTADA DEL PERFIL */}
                        <div 
                            className="position-relative" 
                            style={{ 
                                height: '140px', 
                                backgroundColor: user.rol === 'Administrador' ? '#212529' : '#0b2265',
                                backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 100%)'
                            }}
                        >
                            <Badge 
                                bg={user.rol === 'Administrador' ? 'danger' : 'light'} 
                                text={user.rol === 'Administrador' ? 'white' : 'dark'}
                                className="position-absolute top-0 end-0 m-3 px-3 py-2 rounded-pill shadow-sm text-uppercase fw-bold"
                            >
                                {user.rol || 'Usuario'}
                            </Badge>
                        </div>

                        <Card.Body className="px-4 px-md-5 pb-5 position-relative">
                            
                            {/* AVATAR INTERACTIVO */}
                            <div className="text-center" style={{ marginTop: '-75px', marginBottom: '20px' }}>
                                <div className="position-relative d-inline-block">
                                    <img 
                                        src={getAvatar()} 
                                        alt="Perfil de usuario"
                                        className="rounded-circle border border-5 border-white shadow bg-white"
                                        style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                                    />
                                    
                                    <label 
                                        htmlFor="upload-photo" 
                                        className="position-absolute bottom-0 end-0 bg-danger text-white p-2 rounded-circle shadow profile-camera-btn" 
                                        style={{ cursor: 'pointer', transition: 'all 0.2s ease', border: '3px solid white' }}
                                        title="Cambiar foto de perfil"
                                    >
                                        {uploading ? (
                                            <Spinner size="sm" animation="border" />
                                        ) : (
                                            <i className="bi bi-camera-fill fs-5 d-flex"></i>
                                        )}
                                        <input type="file" id="upload-photo" hidden onChange={handleImageChange} accept="image/png, image/jpeg, image/jpg" />
                                    </label>
                                </div>

                                <h3 className="fw-bold text-dark mt-3 mb-0">
                                    {user.first_name ? `${user.first_name} ${user.last_name}` : 'Nombre no configurado'}
                                </h3>
                                <p className="text-muted mb-0">{user.email || 'Sin correo asociado'}</p>
                            </div>

                            <hr className="text-muted opacity-25 mb-4" />

                            <Row className="g-4">
                                <Col xs={12} md={6}>
                                    <div className="p-3 bg-light rounded-3 border border-light h-100 d-flex align-items-center transition-hover">
                                        <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-piccadilly-blue d-flex">
                                            <i className="bi bi-person-badge fs-4"></i>
                                        </div>
                                        <div>
                                            <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>Nombre de Usuario</small>
                                            <p className="mb-0 fw-bold text-dark fs-5">{user.username}</p>
                                        </div>
                                    </div>
                                </Col>

                                <Col xs={12} md={6}>
                                    <div className="p-3 bg-light rounded-3 border border-light h-100 d-flex align-items-center transition-hover">
                                        <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-piccadilly-blue d-flex">
                                            <i className="bi bi-card-heading fs-4"></i>
                                        </div>
                                        <div>
                                            <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>Documento / DNI</small>
                                            <p className="mb-0 fw-bold text-dark fs-5">{user.dni || 'No especificado'}</p>
                                        </div>
                                    </div>
                                </Col>

                                <Col xs={12} md={6}>
                                    <div className="p-3 bg-light rounded-3 border border-light h-100 d-flex align-items-center transition-hover">
                                        <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-piccadilly-blue d-flex">
                                            <i className="bi bi-telephone fs-4"></i>
                                        </div>
                                        <div>
                                            <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>Teléfono de Contacto</small>
                                            <p className="mb-0 fw-bold text-dark fs-5">{user.telefono || 'No especificado'}</p>
                                        </div>
                                    </div>
                                </Col>

                                <Col xs={12} md={6}>
                                    <div className="p-3 bg-light rounded-3 border border-light h-100 d-flex align-items-center transition-hover">
                                        <div className="bg-white p-3 rounded-circle shadow-sm me-3 text-piccadilly-blue d-flex">
                                            <i className="bi bi-shield-check fs-4"></i>
                                        </div>
                                        <div>
                                            <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>Estado de Cuenta</small>
                                            <p className="mb-0 fw-bold text-success fs-5">
                                                <i className="bi bi-check-circle-fill me-2"></i>Activo
                                            </p>
                                        </div>
                                    </div>
                                </Col>
                            </Row>

                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Perfil;