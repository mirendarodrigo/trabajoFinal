import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tabs, Tab, Table, Spinner, Breadcrumb, Card, Badge, Row, Col, Alert, Button, Collapse, Form } from 'react-bootstrap';
import api from '../../api/axios';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const DetalleCurso = () => {
  const { id } = useParams();
  const [comision, setComision] = useState(null);
  const [misNotas, setMisNotas] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Identificación del usuario actual
  const [userId, setUserId] = useState(null);
  const [rol, setRol] = useState(null);

  // Estados para comentarios en el Tablero
  const [anuncioExpandido, setAnuncioExpandido] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [guardandoComentario, setGuardandoComentario] = useState(false);

  const fetchDatosAula = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const decoded = jwtDecode(token);
      const currentUserId = parseInt(decoded.user_id);
      const currentRol = decoded.rol;
      
      setUserId(currentUserId);
      setRol(currentRol);

      // --- CARGA INTELIGENTE SEGÚN EL ROL ---
      // Todos necesitan ver la comisión, materiales, anuncios y evaluaciones
      let promesasBase = [
        api.get(`comisiones/${id}/`),
        api.get(`evaluaciones/?comision=${id}`),
        api.get(`materiales/?comision=${id}`),     
        api.get(`anuncios/?comision=${id}`)        
      ];

      // Solo los ALUMNOS descargan sus notas e inscripciones
      if (currentRol === 'ALUMNO') {
        promesasBase.push(api.get(`notas/?evaluacion__comision=${id}`));
        promesasBase.push(api.get(`inscripciones/?comision=${id}&alumno=${currentUserId}`)); 
      } else {
        promesasBase.push(Promise.resolve({ data: [] })); // Notas falsas
        promesasBase.push(Promise.resolve({ data: [] })); // Inscripciones falsas
      }

      const [resComision, resEvaluaciones, resMateriales, resAnuncios, resNotas, resInscripciones] = await Promise.all(promesasBase);

      setComision(resComision.data);

      // --- PROCESAR NOTAS (SOLO PARA ALUMNOS) ---
      if (currentRol === 'ALUMNO') {
        const todasLasNotas = resNotas.data.results || resNotas.data;
        const todasLasEvals = resEvaluaciones.data.results || resEvaluaciones.data;
        
        let misCalificaciones = todasLasNotas.map(nota => {
          const evalId = typeof nota.evaluacion === 'object' ? nota.evaluacion?.id : nota.evaluacion;
          const evalDetalle = todasLasEvals.find(e => e.id === evalId);
          return { ...nota, evaluacion_detalle: evalDetalle };
        });
        
        misCalificaciones.sort((a, b) => {
           const dateA = a.evaluacion_detalle?.fecha ? new Date(a.evaluacion_detalle.fecha).getTime() : 0;
           const dateB = b.evaluacion_detalle?.fecha ? new Date(b.evaluacion_detalle.fecha).getTime() : 0;
           return dateB - dateA;
        });

        setMisNotas(misCalificaciones);
      }

      // --- PROCESAR MATERIALES Y ANUNCIOS ---
      setMateriales(resMateriales.data.results || resMateriales.data);
      setAnuncios(resAnuncios.data.results || resAnuncios.data);

    } catch (error) {
      console.error("Error al cargar el aula:", error);
      toast.error("Hubo un problema al cargar tu aula virtual.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatosAula();
  }, [id]);

  const renderDocente = () => {
    if (comision?.nombre_docente && comision.nombre_docente.trim() !== '') {
      return comision.nombre_docente;
    }
    return 'Profesor asignado';
  };

  // --- LÓGICA INTELIGENTE ANTI-FANTASMAS ---
  const esAnuncioNoVisto = (anuncio) => {
    if (!userId) return false;
    
    const currentUserIdStr = String(userId);
    const vistos = Array.isArray(anuncio.visto_por)
      ? anuncio.visto_por.map(u => String(typeof u === 'object' ? u.id : u))
      : [];
    
    const autorIdStr = anuncio.autor ? String(typeof anuncio.autor === 'object' ? anuncio.autor.id : anuncio.autor) : null;
    
    let noLoVi = !vistos.includes(currentUserIdStr);

    if (autorIdStr === currentUserIdStr && (!anuncio.comentarios || anuncio.comentarios.length === 0)) {
      noLoVi = false;
    }

    return noLoVi;
  };

  const marcarComoVisto = async (anuncioId) => {
    try {
      setAnuncios(prev => prev.map(a => a.id === anuncioId ? { ...a, visto_por: [...(a.visto_por || []), userId] } : a));
      await api.post(`anuncios/${anuncioId}/marcar_visto/`);
      
      const resAnuncios = await api.get(`anuncios/?comision=${id}`);
      setAnuncios(resAnuncios.data.results || resAnuncios.data);
    } catch (error) { 
      console.error("Error al sincronizar visto:", error); 
    }
  };

  const handleToggleComentarios = async (anuncio) => {
    if (anuncioExpandido === anuncio.id) {
      setAnuncioExpandido(null);
    } else {
      setAnuncioExpandido(anuncio.id);
      setNuevoComentario('');
      if (esAnuncioNoVisto(anuncio)) {
        marcarComoVisto(anuncio.id);
      }
    }
  };

  const handleEnviarComentario = async (e, anuncioId) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setGuardandoComentario(true);
    try {
      await api.post('comentarios/', { anuncio: anuncioId, contenido: nuevoComentario });
      setNuevoComentario('');
      
      const resAnuncios = await api.get(`anuncios/?comision=${id}`);
      setAnuncios(resAnuncios.data.results || resAnuncios.data);

    } catch (error) { 
      toast.error("Error al enviar el comentario."); 
    } finally { 
      setGuardandoComentario(false); 
    }
  };

  const hayNotificacionesTablero = anuncios.some(esAnuncioNoVisto);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" style={{ color: '#0b2265' }} />
        <span className="ms-3 text-muted">Ingresando al aula virtual...</span>
      </div>
    );
  }

  // Si es un admin/docente, debe poder volver a Inicio. Si es un alumno, vuelve a Mis Cursos.
  const enlaceVolver = rol === 'ALUMNO' ? '/dashboard/mis-cursos' : '/dashboard';
  const textoVolver = rol === 'ALUMNO' ? 'Mis Cursos' : 'Volver al Inicio';

  return (
    <div>
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: enlaceVolver }}>{textoVolver}</Breadcrumb.Item>
        <Breadcrumb.Item active>{comision?.nombre || `Curso #${id}`}</Breadcrumb.Item>
      </Breadcrumb>

      {/* CABECERA */}
      <Card className="border-0 shadow-sm mb-4 text-white" style={{ backgroundColor: '#0b2265' }}>
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col md={8}>
              <Badge bg={rol === 'ALUMNO' ? "danger" : "info"} className="mb-2">
                {rol === 'ALUMNO' ? 'Cursada Activa' : 'Vista de ' + rol}
              </Badge>
              <h2 className="fw-bold mb-1">{comision?.nombre || `Comisión #${id}`}</h2>
              <p className="mb-0 text-white-50 d-flex align-items-center fs-5 mt-2">
                <i className="bi bi-person-video3 me-2"></i> Docente: {renderDocente()}
              </p>
               <p className="mb-0 text-white-50 small mt-2">
                <i className="bi bi-calendar3 me-2"></i> Periodo: {comision?.periodo_nombre || comision?.periodo} {comision?.anio} 
              </p>
            </Col>
            
            {/* Solo mostramos el estado de inscripción si es un ALUMNO */}
            {rol === 'ALUMNO' && (
              <Col md={4} className="text-md-end mt-4 mt-md-0">
                <div className="bg-white rounded p-3 d-inline-block text-center shadow-sm">
                  <p className="small text-muted mb-1 lh-1">Estado de inscripción</p>
                  <h5 className="mb-0 fw-bold text-success">
                    <i className="bi bi-check-circle-fill me-2"></i>Alumno Regular
                  </h5>
                </div>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      <Tabs defaultActiveKey="tablero" id="aula-tabs" className="mb-4 custom-tabs">
        
        {/* PESTAÑA 1: TABLERO (MURO) */}
        <Tab eventKey="tablero" title={<span><i className="bi bi-megaphone me-2"></i>Tablero {hayNotificacionesTablero && <Badge bg="danger" pill className="ms-1" style={{ fontSize: '0.6rem', verticalAlign: 'top' }}>NUEVO</Badge>}</span>}>
          {anuncios.length === 0 ? (
            <Card className="border-0 shadow-sm p-5 text-center">
              <div className="display-4 text-muted mb-3"><i className="bi bi-chat-square-quote"></i></div>
              <h5 className="fw-bold text-muted">Aún no hay anuncios</h5>
              <p className="text-muted">No se han publicado avisos en el muro de esta comisión.</p>
            </Card>
          ) : (
            <div className="d-flex flex-column gap-3 mt-2">
              {anuncios.map(anuncio => {
                const isExpanded = anuncioExpandido === anuncio.id;
                const noVisto = esAnuncioNoVisto(anuncio);

                return (
                  <Card key={anuncio.id} className={`border-0 shadow-sm border-start border-4 ${!noVisto ? 'border-secondary' : 'border-danger'}`}>
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: '40px', height: '40px' }}>
                            <i className="bi bi-person-fill"></i>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-bold">{anuncio.autor_nombre || 'Profesor'}</h6>
                            <small className="text-muted">{new Date(anuncio.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute:'2-digit' })}</small>
                          </div>
                        </div>
                        {noVisto && <Badge bg="danger">Nuevo</Badge>}
                      </div>
                      
                      <h5 className="fw-bold mt-3 mb-2">{anuncio.titulo}</h5>
                      <p className="text-dark mb-3" style={{ whiteSpace: 'pre-wrap' }}>{anuncio.contenido}</p>
                      
                      <div className="pt-3 border-top border-light d-flex align-items-center gap-2">
                        {anuncio.permite_comentarios ? (
                          <Button variant="light" size="sm" className="fw-medium text-muted position-relative" onClick={() => handleToggleComentarios(anuncio)}>
                            <i className="bi bi-chat-text me-2"></i>
                            {anuncio.comentarios?.length || 0} Comentarios
                            {noVisto && (
                              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                                <span className="visually-hidden">Nuevos comentarios</span>
                              </span>
                            )}
                          </Button>
                        ) : (
                           noVisto ? (
                             <Button variant="success" size="sm" className="rounded-pill px-3" onClick={() => marcarComoVisto(anuncio.id)}>
                               <i className="bi bi-check2-all me-1"></i> Marcar como leído
                             </Button>
                           ) : (
                             <Badge bg="secondary" className="bg-opacity-10 text-muted border px-2 py-1">
                               <i className="bi bi-lock-fill me-1"></i> Comentarios desactivados
                             </Badge>
                           )
                        )}
                      </div>

                      {/* ZONA DE COMENTARIOS */}
                      <Collapse in={isExpanded}>
                        <div className="mt-3 pt-3 px-3 bg-light rounded border">
                          {anuncio.comentarios?.length > 0 ? (
                            <div className="d-flex flex-column gap-3 mb-3">
                              {anuncio.comentarios.map(com => (
                                <div key={com.id} className="d-flex gap-2">
                                  <div className="bg-white rounded-circle d-flex align-items-center justify-content-center text-secondary border flex-shrink-0" style={{ width: '30px', height: '30px', fontSize: '0.8rem' }}>
                                    <i className="bi bi-person"></i>
                                  </div>
                                  <div className="bg-white p-2 rounded shadow-sm border w-100">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                      <span className="fw-bold small">{com.autor_nombre || com.autor_username}</span>
                                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                        {new Date(com.fecha_creacion).toLocaleDateString('es-ES', { hour: '2-digit', minute:'2-digit' })}
                                      </span>
                                    </div>
                                    <p className="mb-0 small">{com.contenido}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted small text-center mb-3 fst-italic">No hay respuestas. ¡Sé el primero en comentar!</p>
                          )}

                          {/* CAJA PARA COMENTAR */}
                          {anuncio.permite_comentarios ? (
                            <Form onSubmit={(e) => handleEnviarComentario(e, anuncio.id)} className="d-flex gap-2 pb-3">
                              <Form.Control 
                                size="sm" type="text" placeholder="Escribe un comentario..." 
                                value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)}
                              />
                              <Button type="submit" size="sm" variant="primary" disabled={!nuevoComentario.trim() || guardandoComentario}>
                                <i className="bi bi-send"></i>
                              </Button>
                            </Form>
                          ) : (
                            <Alert variant="secondary" className="small p-2 mb-2 text-center">
                              <i className="bi bi-lock-fill me-2"></i>El profesor ha desactivado los comentarios para este anuncio.
                            </Alert>
                          )}
                        </div>
                      </Collapse>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </Tab>

        {/* PESTAÑA 2: MATERIAL DE ESTUDIO */}
        <Tab eventKey="materiales" title={<span><i className="bi bi-folder2-open me-2"></i>Materiales</span>}>
          <Card className="border-0 shadow-sm p-4">
            <Alert variant="info" className="bg-white border-info border-start border-4 shadow-sm mb-4">
              <i className="bi bi-info-circle-fill me-2 text-info"></i>
              Aquí se encuentran los archivos PDF, audios y enlaces compartidos clase a clase.
            </Alert>
            
            {materiales.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                No se ha subido material de estudio aún.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {materiales.map(mat => (
                  <div key={mat.id} className="d-flex align-items-center justify-content-between p-3 border rounded bg-light hover-effect transition-all">
                    <div className="d-flex align-items-center overflow-hidden pe-3">
                      <div className={`text-white rounded p-2 me-3 d-flex align-items-center justify-content-center flex-shrink-0 ${mat.archivo ? 'bg-danger' : 'bg-info'}`} style={{ width: '45px', height: '45px' }}>
                        <i className={`fs-5 ${mat.archivo ? 'bi bi-file-earmark-pdf-fill' : 'bi bi-link-45deg'}`}></i>
                      </div>
                      <div className="text-truncate">
                        <h6 className="mb-0 fw-bold text-dark text-truncate">{mat.titulo}</h6>
                        {mat.descripcion && <small className="text-muted d-block text-truncate mb-1">{mat.descripcion}</small>}
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-clock me-1"></i>
                          Subido el {new Date(mat.fecha_subida).toLocaleDateString('es-ES')}
                        </small>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      {mat.archivo && (
                        <Button variant="outline-danger" size="sm" as="a" href={mat.archivo} target="_blank" rel="noopener noreferrer">
                          <i className="bi bi-download me-sm-2"></i><span className="d-none d-sm-inline">Descargar</span>
                        </Button>
                      )}
                      {mat.enlace && (
                        <Button variant="outline-info" size="sm" as="a" href={mat.enlace} target="_blank" rel="noopener noreferrer">
                          <i className="bi bi-box-arrow-up-right me-sm-2"></i><span className="d-none d-sm-inline">Ir al enlace</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Tab>

        {/* PESTAÑA 3: MIS CALIFICACIONES (¡SOLO VISIBLE PARA ALUMNOS!) */}
        {rol === 'ALUMNO' && (
          <Tab eventKey="calificaciones" title={<span><i className="bi bi-award me-2"></i>Mis Notas</span>}>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Table responsive hover className="m-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-4 py-3 text-muted">Evaluación</th>
                      <th className="px-4 py-3 text-muted">Fecha</th>
                      <th className="px-4 py-3 text-muted text-center">Calificación</th>
                      <th className="px-4 py-3 text-muted text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {misNotas.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-5 text-muted">
                          <i className="bi bi-clipboard-x fs-1 d-block mb-3 opacity-50"></i>
                          Aún no tienes calificaciones cargadas en esta comisión.
                        </td>
                      </tr>
                    ) : (
                      misNotas.map((nota) => (
                        <tr key={nota.id}>
                          <td className="px-4 fw-bold text-dark">{nota.evaluacion_detalle?.nombre || 'Examen'}</td>
                          <td className="px-4 text-muted small">
                            {nota.evaluacion_detalle?.fecha ? new Date((nota.evaluacion_detalle.fecha.includes('T') ? nota.evaluacion_detalle.fecha : nota.evaluacion_detalle.fecha + 'T12:00:00')).toLocaleDateString('es-ES') : 'S/F'}
                          </td>
                          <td className="px-4 text-center">
                            <span className="fs-5 fw-bold text-piccadilly-blue">{nota.valor}</span>
                          </td>
                          <td className="px-4 text-center">
                            {parseFloat(nota.valor) >= 6 ? (
                              <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill">Aprobado</Badge>
                            ) : (
                              <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-2 rounded-pill">A revisar</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab>
        )}

      </Tabs>
    </div>
  );
};

export default DetalleCurso;