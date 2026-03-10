import React, { useState, useEffect } from 'react';
import { Container, Navbar, Nav, Button, Row, Col, Card } from 'react-bootstrap';
import { useLocation, useNavigate, Link } from 'react-router-dom'; 
import toast from 'react-hot-toast'; 
import LoginModal from '../components/ui/LoginModal';

// IMPORTACIONES DE IMÁGENES
import logo from '../assets/logo-piccadilly.png'; 
import caratula from '../assets/caratula.png'; // <--- Nueva imagen

const Landing = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [imgError, setImgError] = useState(false); // <--- Detector de error de imagen
  const location = useLocation();
  const navigate = useNavigate();

  // --- DETECTOR DE SESIÓN EXPIRADA ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      toast.error("Tu sesión ha expirado por inactividad. Por favor, vuelve a ingresar.", {
        duration: 5000,
        icon: '🔒',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      setShowLogin(true);
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      {/* --- NAVBAR --- */}
      <Navbar bg="white" expand="lg" className="shadow-sm sticky-top py-2">
        <Container>
          <Navbar.Brand className="fw-bold text-piccadilly-blue fs-4 d-flex align-items-center" href="#">
            <img src={logo} alt="Piccadilly Institute" height="40" className="me-2" />
            PICCADILLY
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center mt-3 mt-lg-0 fw-medium text-piccadilly-blue">
              <Nav.Link href="#instituto" className="mx-2">El Instituto</Nav.Link>
              <Nav.Link href="#cursos" className="mx-2">Nuestros Cursos</Nav.Link>
              <Nav.Link href="#contacto" className="mx-2 mb-3 mb-lg-0">Contacto</Nav.Link>
              
              <Button 
                variant="danger" 
                className="btn-piccadilly-red px-4 rounded-pill w-100 w-lg-auto ms-lg-3"
                onClick={() => setShowLogin(true)}
              >
                Acceso Campus
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* --- HERO SECTION CON ONDAS --- */}
      <div className="position-relative bg-white overflow-hidden pb-5">
        <svg viewBox="0 0 1440 250" xmlns="http://www.w3.org/2000/svg" className="w-100 position-absolute top-0 start-0 z-0">
          <path fill="#da121a" fillOpacity="1" d="M0,96L80,112C160,128,320,160,480,149.3C640,139,800,85,960,69.3C1120,53,1280,75,1360,85.3L1440,96L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"></path>
          <path fill="#0b2265" fillOpacity="1" d="M0,32L80,48C160,64,320,96,480,96C640,96,800,64,960,58.7C1120,53,1280,75,1360,85.3L1440,96L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"></path>
        </svg>

        <Container className="position-relative z-1" style={{ paddingTop: '120px' }}>
          <Row className="align-items-center flex-column-reverse flex-lg-row">
            <Col xs={12} lg={6} className="text-center text-lg-start mt-5 mt-lg-0">
              <span className="badge mb-3 px-3 py-2 rounded-pill shadow-sm"  style="background-color: var(--piccadilly-red);">
                ¡Inscripciones Abiertas!
              </span>
              <h1 className="display-4 fw-bold mb-3 lh-1 text-piccadilly-blue">
                Formando estudiantes con <br/>
                <span className="text-piccadilly-red">confianza y fluidez</span>
              </h1>
              <p className="lead text-muted mb-4">
                Aprende inglés de forma divertida y efectiva. Clases dinámicas, profesores capacitados y un campus virtual diseñado para ti.
              </p>
              <div className="d-grid gap-3 d-sm-flex justify-content-sm-center justify-content-lg-start">
                <Button className="btn-piccadilly px-4 py-2" size="lg" onClick={() => setShowLogin(true)}>
                  Ingresar al Campus
                </Button>
                <Button variant="outline-secondary" size="lg" href="#cursos" className="fw-semibold px-4 py-2">
                  Ver Niveles
                </Button>
              </div>
            </Col>
            
            {/* CÍRCULO CON IMAGEN ADAPTABLE */}
            <Col xs={12} lg={6} className="text-center px-4">
              <div 
                className="bg-light rounded-circle overflow-hidden d-flex align-items-center justify-content-center border border-5 border-white shadow mx-auto" 
                style={{ width: 'min(300px, 70vw)', height: 'min(300px, 70vw)' }}
              >
                {!imgError ? (
                  <img 
                    src={caratula} 
                    alt="Clase de inglés Piccadilly" 
                    className="w-100 h-100" 
                    style={{ objectFit: 'cover' }} 
                    onError={() => setImgError(true)} 
                  />
                ) : (
                  <i className="bi bi-mortarboard-fill text-piccadilly-blue" style={{ fontSize: '7rem' }}></i>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* --- CURSOS EXTRAÍDOS DE TUS FLYERS --- */}
      <Container id="cursos" className="py-5 flex-grow-1">
        <div className="text-center mb-5">
          <h2 className="fw-bold text-piccadilly-blue display-6">Nuestros Cursos</h2>
          <p className="text-muted">Acompañamos cada etapa de tu aprendizaje</p>
        </div>

        <Row className="g-4 justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 shadow-sm course-card">
              <Card.Body className="p-4 text-center">
                <h3 className="fw-bold text-piccadilly-red mb-1">KINDER</h3>
                <h6 className="text-piccadilly-blue fw-bold mb-3">3 a 4 años</h6>
                <p className="text-muted small">Contacto con el idioma de manera natural y divertida. Aprenden jugando, con historias y canciones.</p>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 shadow-sm course-card">
              <Card.Body className="p-4 text-center">
                <h3 className="fw-bold text-piccadilly-red mb-1">COACHING</h3>
                <h6 className="text-piccadilly-blue fw-bold mb-3">Nivel Primario</h6>
                <p className="text-muted small">Programa de acompañamiento enfocado en fortalecer la comprensión mediante juegos y práctica guiada.</p>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 shadow-sm course-card">
              <Card.Body className="p-4 text-center">
                <h3 className="fw-bold text-piccadilly-red mb-1">PRETEEN</h3>
                <h6 className="text-piccadilly-blue fw-bold mb-3">6º Grado a 1º Año</h6>
                <p className="text-muted small">Nivel A1 (Principiante). Clases dinámicas, vocabulario básico y comunicación efectiva.</p>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 shadow-sm course-card">
              <Card.Body className="p-4 text-center">
                <h3 className="fw-bold text-piccadilly-red mb-1">TEENS 1 a 4</h3>
                <h6 className="text-piccadilly-blue fw-bold mb-3">Niveles A2 a B1</h6>
                <p className="text-muted small">Desarrollo de fluidez, role plays, preparación para exámenes internacionales y debates.</p>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 shadow-sm course-card">
              <Card.Body className="p-4 text-center">
                <h3 className="fw-bold text-piccadilly-red mb-1">SENIOR 1</h3>
                <h6 className="text-piccadilly-blue fw-bold mb-3">Nivel A1 (Elemental)</h6>
                <p className="text-muted small">Orientado a estudiantes que dan sus primeros pasos. Lectura, escritura, habla y comprensión auditiva.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* --- FOOTER ESTILO FLYER (Onda + Fondo Azul) --- */}
      <div className="position-relative mt-auto">
        <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" className="w-100 d-block" style={{ marginBottom: '-1px' }}>
          <path fill="#0b2265" fillOpacity="1" d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z"></path>
        </svg>
        
        <footer className="text-white py-4" style={{ backgroundColor: '#0b2265' }}>
          <Container className="text-center" id="contacto">
            <h5 className="fw-bold mb-3">INSTITUTO PICCADILLY</h5>
            
            {/* ICONOS REEMPLAZADOS */}
            <p className="small mb-1 fw-medium">
              <i className="bi bi-geo-alt-fill text-danger me-1"></i> Lopez May 6380 - G. Catán
            </p>
            <p className="small mb-3 fw-medium">
              <i className="bi bi-whatsapp text-success me-1"></i> 11-6467-2549 | 
              <i className="bi bi-instagram ms-2 me-1" style={{ color: '#E1306C' }}></i> @institutopiccadilly
            </p>
            
            <hr className="border-secondary opacity-25 mx-auto" style={{ maxWidth: '300px' }} />
            
            {/* ENLACE DE RECUPERACIÓN DIRECTO EN EL FOOTER */}
            <div className="mb-3">
              <Link to="/recuperar-password" className="text-white-50 small text-decoration-none hover-white transition-all">
                <i className="bi bi-shield-lock-fill me-1"></i> ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <small className="opacity-75">© 2026 Piccadilly Institute. Campus Virtual.</small>
          </Container>
        </footer>
      </div>

      {/* --- MODAL --- */}
      <LoginModal show={showLogin} handleClose={() => setShowLogin(false)} />
    </div>
  );
};

export default Landing;