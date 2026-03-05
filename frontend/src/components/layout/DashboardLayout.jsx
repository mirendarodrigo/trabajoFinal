import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { Navbar, Nav, Button, Offcanvas } from 'react-bootstrap';
import { logout } from '../../services/auth';
import { jwtDecode } from 'jwt-decode';

// IMPORTAMOS LAS IMÁGENES POR DEFECTO
import adminImg from '../../assets/admindefault.png';
import teacherImg from '../../assets/teacherdefault.png';
import studentImg from '../../assets/studentdefault.png';

const DashboardLayout = () => {
    const [showSidebar, setShowSidebar] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    
    // Buscamos si el usuario actualizó su foto en esta sesión
    const avatarActualizado = localStorage.getItem('avatar_actualizado');

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser(decoded);
            } catch (error) {
                console.error("Error al decodificar el token:", error);
            }
        }
    }, []);

    const handleLogout = () => {
        // 🚨 LIMPIAMOS LA FOTO TEMPORAL AL SALIR 🚨
        localStorage.removeItem('avatar_actualizado'); 
        logout();
        navigate('/');
    };

    const isAdmin = user?.rol === 'ADMIN' || user?.is_staff === true;
    const isDocente = user?.rol === 'DOCENTE';
    const isAlumno = user?.rol === 'ALUMNO';

    const getDefaultAvatar = () => {
        // 1. Si hay una foto recién subida, usamos esa.
        if (avatarActualizado) return avatarActualizado;
        // 2. Si el token trae una foto, usamos esa.
        if (user?.imagen_perfil) return user.imagen_perfil;
        
        // 3. Si no hay nada, usamos los avatares por rol.
        if (isAdmin) return adminImg;
        if (isDocente) return teacherImg;
        return studentImg;
    };

    const navLinkClass = ({ isActive }) =>
        `text-white rounded px-3 py-2 mb-1 d-block text-decoration-none transition-all ${isActive ? 'bg-white bg-opacity-10 fw-bold shadow-sm' : ''}`;

    const handleCloseSidebar = () => setShowSidebar(false);

    const SidebarContent = () => (
        <div className="d-flex flex-column h-100">
            <div className="p-3 text-center border-bottom border-light border-opacity-25 flex-shrink-0">
                <h4 className="text-white fw-bold m-0 mt-2"><i className="bi bi-building me-2"></i>Campus</h4>
                <small className="text-white-50 fw-medium">Piccadilly Institute</small>
            </div>

            <Nav className="flex-column flex-nowrap p-3 gap-1 flex-grow-1 overflow-auto">
                <NavLink to="/dashboard" end className={navLinkClass} onClick={handleCloseSidebar}>
                    <i className="bi bi-house-door-fill me-2"></i> Inicio
                </NavLink>

                {isAdmin && (
                    <>
                        <NavLink to="/dashboard/cursos" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-journal-text me-2"></i> Cursos y Niveles
                        </NavLink>
                        <NavLink to="/dashboard/comisiones" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-diagram-3-fill me-2"></i> Comisiones
                        </NavLink>
                        <NavLink to="/dashboard/gestion-alumnos" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-people-fill me-2"></i> Matrícula
                        </NavLink>
                        <NavLink to="/dashboard/cargar-alumnos" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-cloud-arrow-up-fill me-2"></i> Importar Excel
                        </NavLink>
                        <NavLink to="/dashboard/gestion-docentes" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-person-badge-fill me-2"></i> Plantel Docente
                        </NavLink>
                        <NavLink to="/dashboard/comunicados" className={navLinkClass} onClick={handleCloseSidebar} title="Comunicados Institucionales">
                            <i className="bi bi-broadcast me-2"></i> Comunicados
                        </NavLink>
                    </>
                )}

                {isDocente && (
                    <>
                        <NavLink to="/dashboard/aulas" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-easel-fill me-2"></i> Mis Aulas
                        </NavLink>
                        <NavLink to="/dashboard/evaluaciones-docente" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-file-earmark-text-fill me-2"></i> Evaluaciones y TPs
                        </NavLink>
                        <NavLink to="/dashboard/materiales-docente" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-folder2-open me-2"></i> Material de Estudio
                        </NavLink>
                    </>
                )}

                {isAlumno && (
                    <>
                        <NavLink to="/dashboard/mis-cursos" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-journal-bookmark-fill me-2"></i> Mis Cursos
                        </NavLink>
                        <NavLink to="/dashboard/notas" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-award-fill me-2"></i> Mis Notas
                        </NavLink>
                        <NavLink to="/dashboard/materiales" className={navLinkClass} onClick={handleCloseSidebar}>
                            <i className="bi bi-folder2-open me-2"></i> Material de Estudio
                        </NavLink>
                    </>
                )}
            </Nav>

            <div className="p-3 border-top border-light border-opacity-25 mt-auto flex-shrink-0">
                <div 
                    className="d-flex align-items-center text-white mb-3 px-2 py-2 rounded-3" 
                    style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onClick={() => { navigate('/dashboard/perfil'); handleCloseSidebar(); }}
                    title="Ver mi perfil"
                >
                    <img 
                        src={getDefaultAvatar()} 
                        alt="Perfil" 
                        className="rounded-circle border border-2 border-white me-3"
                        style={{ width: '42px', height: '42px', objectFit: 'cover' }}
                    />
                    <div className="overflow-hidden">
                        <p className="m-0 fw-bold lh-1 text-truncate" style={{ fontSize: '0.95rem' }}>
                            {user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.username || 'Usuario')}
                        </p>
                        <small className="text-white-50 fw-medium">
                            {isAdmin ? 'Administrador' : isDocente ? 'Docente' : 'Alumno'}
                        </small>
                    </div>
                </div>
                <Button variant="danger" className="w-100 fw-bold shadow-sm py-2" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i> Cerrar Sesión
                </Button>
            </div>
        </div>
    );

    return (
        <div className="d-flex vh-100 overflow-hidden bg-light">
            <aside 
                className="d-none d-lg-block text-white flex-shrink-0 shadow" 
                style={{ width: '260px', backgroundColor: '#0b2265', zIndex: 1050 }}
            >
                <SidebarContent />
            </aside>

            <Offcanvas 
                show={showSidebar} 
                onHide={() => setShowSidebar(false)} 
                className="d-lg-none text-white" 
                style={{ backgroundColor: '#0b2265', width: '280px' }}
            >
                <Offcanvas.Header closeButton closeVariant="white">
                    <Offcanvas.Title className="fw-bold"><i className="bi bi-building me-2"></i>Campus</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className="p-0">
                    <SidebarContent />
                </Offcanvas.Body>
            </Offcanvas>

            {/* 🚨 CORRECCIÓN CRÍTICA AQUÍ: minWidth: 0 en el style 🚨 */}
            <div className="flex-grow-1 d-flex flex-column h-100" style={{ minWidth: 0 }}>
                <Navbar bg="white" expand="lg" className="shadow-sm py-2 px-4 sticky-top">
                    <div className="d-flex align-items-center w-100">
                        <Button variant="light" className="d-lg-none me-3 border shadow-sm" onClick={() => setShowSidebar(true)}>
                            <i className="bi bi-list fs-4"></i>
                        </Button>
                        <h5 className="m-0 fw-bold text-piccadilly-blue d-none d-sm-block">Panel de Control</h5>
                        
                        <div className="ms-auto d-flex align-items-center">
                            <span className="me-3 text-muted small d-none d-md-block fw-medium">Ciclo Lectivo 2026</span>
                            
                            <Button variant="outline-danger" size="sm" className="rounded-pill px-3 fw-medium d-none d-md-block" onClick={handleLogout}>
                                Salir
                            </Button>

                            <div 
                                className="d-lg-none ms-3 p-1 rounded-circle" 
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate('/dashboard/perfil')} 
                            >
                                <img 
                                    src={getDefaultAvatar()} 
                                    className="rounded-circle border border-2 border-danger shadow-sm" 
                                    style={{ width: '38px', height: '38px', objectFit: 'cover' }} 
                                    alt="Perfil" 
                                />
                            </div>
                        </div>
                    </div>
                </Navbar>

                {/* 🚨 EL ÁREA MAIN MANTIENE EL OVERFLOW AUTO PARA PERMITIR SCROLL 🚨 */}
                <main className="p-3 p-md-4 overflow-auto flex-grow-1" style={{ scrollBehavior: 'smooth' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;