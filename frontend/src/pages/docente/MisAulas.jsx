import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Spinner, Badge, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const MisAulas = () => {
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMisAulas = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const decoded = jwtDecode(token);
        const docenteId = decoded.user_id;

        // OPTIMIZACIÓN EXTREMA: 
        // 1. Pedimos SOLO las comisiones (El backend las filtra por nosotros)
        // 2. Ya NO descargamos la tabla de inscripciones de 18kb.
        const response = await api.get(`comisiones/?docente=${docenteId}`);
        const misComisiones = response.data.results || response.data;
        
        setComisiones(misComisiones);

      } catch (error) {
        console.error("Error al cargar las aulas:", error);
        toast.error("Hubo un problema al cargar tus aulas.");
      } finally {
        setLoading(false);
      }
    };

    fetchMisAulas();
  }, []);

  // Función para transformar el array de horarios en un texto legible
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
        <span className="ms-3 text-muted">Cargando tus aulas...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold text-dark">
          <i className="bi bi-easel-fill me-2 text-piccadilly-blue"></i> Mis Aulas
        </h2>
        <p className="text-muted">Ciclo Lectivo 2026</p>
      </div>

      {comisiones.length === 0 ? (
        <Alert variant="info" className="bg-white border-info border-start border-4 shadow-sm">
          <Alert.Heading className="h5 fw-bold"><i className="bi bi-info-circle me-2"></i>Sin aulas asignadas</Alert.Heading>
          <p className="mb-0">Actualmente no tienes comisiones a tu cargo en este periodo.</p>
        </Alert>
      ) : (
        <Row className="g-4">
          {comisiones.map(comision => (
            <Col xs={12} md={6} lg={4} key={comision.id}>
              <Card className="h-100 border-0 shadow-sm course-card hover-effect">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <Badge bg={comision.activo ? "danger" : "secondary"} className="px-3 py-2 rounded-pill">
                      <i className="bi bi-broadcast me-1"></i> {comision.activo ? "Nivel Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  
                  <Card.Title className="fw-bold fs-4 mb-2" style={{ color: '#0b2265' }}>
                    {comision.nombre}
                  </Card.Title>
                  
                  <Card.Text className="text-muted small mb-4">
                    <i className="bi bi-calendar3 me-2 text-primary"></i>  {comision.periodo_nombre || comision.periodo} <br/>
                    <i className="bi bi-clock me-2 mt-2 text-primary"></i>  {formatearHorarios(comision.horarios)} <br/>
                    {/* LEEMOS EL DATO CALCULADO POR EL BACKEND EN MILISEGUNDOS */}
                    <i className="bi bi-people-fill me-2 mt-2 text-primary"></i>  <span className="fw-bold">{comision.alumnos_count || 0} alumnos</span>
                  </Card.Text>
                  
                  <div className="d-grid gap-2">
                    <Button 
                      as={Link} 
                      to={`/dashboard/aulas/${comision.id}`} 
                      variant="outline-primary" 
                      className="fw-bold shadow-sm"
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i> Ingresar al Aula
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default MisAulas;