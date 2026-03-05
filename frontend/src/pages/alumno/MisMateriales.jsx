import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Badge, Form, InputGroup, Row, Col } from 'react-bootstrap';
import api from '../../api/axios';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const MisMateriales = () => {
  const [materiales, setMateriales] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterialesGlobales = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const decoded = jwtDecode(token);
        const alumnoId = parseInt(decoded.user_id);

        // OPTIMIZACIÓN: Solo pedimos las inscripciones de este alumno
        const [resInscripciones, resMateriales, resComisiones] = await Promise.all([
          api.get(`inscripciones/?alumno=${alumnoId}`).catch(() => ({ data: [] })),
          api.get('materiales/').catch(() => ({ data: [] })),
          api.get('comisiones/').catch(() => ({ data: [] }))
        ]);

        const misInscripciones = resInscripciones.data.results || resInscripciones.data || [];
        const misComisionesIds = misInscripciones.map(i => i.comision?.id || i.comision);

        const todasLasComisiones = resComisiones.data.results || resComisiones.data || [];
        const todosLosMateriales = resMateriales.data.results || resMateriales.data || [];

        let misMateriales = todosLosMateriales.filter(mat => 
          misComisionesIds.includes(mat.comision?.id || mat.comision)
        );

        // Le pegamos el nombre de la materia de forma segura
        misMateriales = misMateriales.map(mat => {
          const comId = mat.comision?.id || mat.comision;
          const comisionDetalle = todasLasComisiones.find(c => c.id === comId);
          return { ...mat, comision_nombre: comisionDetalle?.nombre || 'Materia sin asignar' };
        });

        // Ordenamos por fecha de forma segura (evita errores de Invalid Date)
        misMateriales.sort((a, b) => {
            const dateA = a.fecha_subida ? new Date(a.fecha_subida).getTime() : 0;
            const dateB = b.fecha_subida ? new Date(b.fecha_subida).getTime() : 0;
            return dateB - dateA;
        });

        setMateriales(misMateriales);

      } catch (error) {
        console.error("Error al cargar materiales:", error);
        toast.error("Error al cargar tus materiales de estudio.");
      } finally {
        setLoading(false);
      }
    };

    fetchMaterialesGlobales();
  }, []);

  // FILTRO BLINDADO CONTRA DATOS NULOS (El salvavidas de la pantalla blanca)
  const materialesFiltrados = materiales.filter(mat => {
    const titulo = mat.titulo || '';
    const comisionNombre = mat.comision_nombre || '';
    const termino = busqueda.toLowerCase();
    
    return titulo.toLowerCase().includes(termino) || comisionNombre.toLowerCase().includes(termino);
  });

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" style={{ color: '#0b2265' }} /></div>;
  }

  return (
    <div>
      {/* CABECERA RESPONSIVA */}
      <div className="row align-items-center g-3 mb-4">
        <div className="col-12 col-md-7">
          <h2 className="fw-bold text-dark mb-0"><i className="bi bi-folder2-open text-primary me-2"></i> Biblioteca Virtual</h2>
          <p className="text-muted mt-1 mb-0">Explora todos los archivos y enlaces compartidos por tus profesores.</p>
        </div>
        <div className="col-12 col-md-5">
          <InputGroup className="shadow-sm w-100">
            <InputGroup.Text className="bg-white border-end-0"><i className="bi bi-search text-primary"></i></InputGroup.Text>
            <Form.Control
              placeholder="Buscar por tema o materia..."
              className="border-start-0 ps-0"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      {materialesFiltrados.length === 0 ? (
        <Card className="border-0 shadow-sm p-4 p-md-5 text-center">
          <div className="display-4 text-muted mb-3"><i className="bi bi-inbox"></i></div>
          <h5 className="fw-bold text-muted">No se encontraron materiales</h5>
          <p className="text-muted">Prueba buscando con otras palabras o espera a que tus profesores suban contenido.</p>
        </Card>
      ) : (
        <Row className="g-3">
          {materialesFiltrados.map(mat => (
            <Col xs={12} md={6} xl={4} key={mat.id}>
              <Card className="border-0 shadow-sm h-100 hover-effect">
                {/* En celular p-3 (menos margen), en PC p-4 (más margen) */}
                <Card.Body className="d-flex flex-column p-3 p-md-4">
                  
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <Badge bg="primary" className="bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1 text-truncate" style={{maxWidth: '70%'}}>
                      <i className="bi bi-easel2-fill me-1"></i> {mat.comision_nombre}
                    </Badge>
                    <div className="text-muted small text-nowrap ms-2 fw-medium">
                      {mat.fecha_subida ? new Date(mat.fecha_subida).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'S/F'}
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center mb-4">
                    <div className={`text-white rounded p-2 me-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm ${mat.archivo ? 'bg-danger' : 'bg-info'}`} style={{ width: '45px', height: '45px' }}>
                      <i className={`fs-5 ${mat.archivo ? 'bi bi-file-earmark-pdf-fill' : 'bi bi-link-45deg'}`}></i>
                    </div>
                    <div className="overflow-hidden">
                      <h6 className="fw-bold text-dark mb-0 text-truncate">{mat.titulo || 'Sin título'}</h6>
                      {mat.descripcion && <p className="text-muted small mb-0 mt-1" style={{display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{mat.descripcion}</p>}
                    </div>
                  </div>

                  {/* DISEÑO MOBILE DE BOTONES: En cel (d-grid) se apilan y ocupan 100%, en PC (d-md-flex) se alinean a la derecha */}
                  <div className="mt-auto pt-3 border-top border-light d-grid gap-2 d-md-flex justify-content-md-end">
                    {mat.archivo && (
                      <Button variant="outline-danger" size="sm" as="a" href={mat.archivo} target="_blank" rel="noopener noreferrer" className="rounded-pill fw-medium px-3">
                        <i className="bi bi-download me-2"></i> Descargar
                      </Button>
                    )}
                    {mat.enlace && (
                      <Button variant="outline-info" size="sm" as="a" href={mat.enlace} target="_blank" rel="noopener noreferrer" className="rounded-pill fw-medium px-3">
                        <i className="bi bi-box-arrow-up-right me-2"></i> Enlace
                      </Button>
                    )}
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

export default MisMateriales;