import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { jwtDecode } from 'jwt-decode';

const MisCursos = () => {
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMisCursos = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const decoded = jwtDecode(token);
        const alumnoId = parseInt(decoded.user_id);

        // OPTIMIZACIÓN: Le pedimos a Django SOLO nuestras propias inscripciones
        const response = await api.get(`inscripciones/?alumno=${alumnoId}`);
        const misInscripciones = response.data.results || response.data;
        
        setInscripciones(misInscripciones);
      } catch (err) {
        console.error("Error al cargar cursos:", err);
        setError("No se pudieron cargar tus cursos. Verifica tu conexión.");
      } finally {
        setLoading(false);
      }
    };

    fetchMisCursos();
  }, []);

  // Función idéntica a la del docente para que el alumno vea "Martes 09:30 a 11:30"
  const formatearHorarios = (horarios) => {
    if (!horarios || horarios.length === 0) return 'Horario a definir';
    
    return horarios.map(h => {
      const dia = h.dia_nombre || h.dia;
      const inicio = h.hora_inicio.slice(0, 5);
      const fin = h.hora_fin.slice(0, 5);
      return `${dia} ${inicio} a ${fin}`;
    }).join(' | ');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" style={{ color: '#0b2265' }} />
        <span className="ms-3 text-muted">Buscando tus cursos...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold text-dark mb-0">
          {/* Unificamos el color y el icono con el resto del diseño */}
          <i className="bi bi-journal-bookmark-fill me-2 text-piccadilly-blue"></i> Mis Cursos
        </h2>
        <p className="text-muted mb-0">Ciclo Lectivo 2026</p>
      </div>

      {error && <Alert variant="danger"><i className="bi bi-exclamation-triangle me-2"></i>{error}</Alert>}

      {!error && inscripciones.length === 0 ? (
        <Alert variant="info" className="bg-white border-info border-start border-4 shadow-sm">
          <Alert.Heading className="h5 fw-bold"><i className="bi bi-info-circle me-2"></i>Aún no tienes cursos</Alert.Heading>
          <p className="mb-0">Actualmente no estás inscrito en ninguna comisión. Si crees que esto es un error, comunícate con la administración de Piccadilly.</p>
        </Alert>
      ) : (
        <Row className="g-4">
          {inscripciones.map((inscripcion) => {
            // El backend select_related ya nos trae los datos de la comisión y el curso armados
            const comisionId = typeof inscripcion.comision === 'object' ? inscripcion.comision?.id : inscripcion.comision;

            return (
              <Col xs={12} md={6} lg={4} key={inscripcion.id}>
                <Card className="h-100 border-0 shadow-sm course-card">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill">
                        <i className="bi bi-check-circle-fill me-1"></i> Alumno Regular
                      </Badge>
                    </div>
                    
                    <Card.Title className="fw-bold fs-4 mb-2" style={{ color: '#0b2265' }}>
                      {inscripcion.comision_detalle?.nombre || 'Curso sin nombre'}
                    </Card.Title>
                    
                    <Card.Text className="text-muted small mb-4">
                      <i className="bi bi-calendar3 me-2 mt-2"></i>  {inscripcion.comision_detalle?.periodo_nombre || inscripcion.comision_detalle?.periodo} <br/>
                      <i className="bi bi-clock me-2 mt-2"></i>  {formatearHorarios(inscripcion.comision_detalle?.horarios)}<br/>
                      <i className="bi bi-person-video3 me-2"></i>  <span className="fw-medium">{inscripcion.comision_detalle?.nombre_docente || 'A designar'}</span> 
                    </Card.Text>
                    <div className="d-grid gap-2">
                      <Button 
                        as={Link} 
                        to={`/dashboard/curso/${comisionId}`} 
                        variant="outline-danger" 
                        className="fw-medium"
                      >
                        <i className="bi bi-box-arrow-in-right me-2"></i> Ingresar al Aula Virtual
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  );
};

export default MisCursos;