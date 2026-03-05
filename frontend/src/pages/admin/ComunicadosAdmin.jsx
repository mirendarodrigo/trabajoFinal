import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Spinner, Table, Modal, Badge, Row, Col } from 'react-bootstrap';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';

const ComunicadosAdmin = () => {
  const [comunicados, setComunicados] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Estados del Modal de Creación
  const [showModal, setShowModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [nuevoComunicado, setNuevoComunicado] = useState({
    titulo: '',
    contenido: '',
    tipo_audiencia: 'TODOS_DOCENTES',
    docentes_especificos: [],
    permite_comentarios: false,
    tipo_expiracion: 'permanente',
    fecha_expiracion_personalizada: ''
  });

  // Estados del Modal de Respuestas
  const [showRespuestasModal, setShowRespuestasModal] = useState(false);
  const [comunicadoActivo, setComunicadoActivo] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [guardandoComentario, setGuardandoComentario] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const decoded = jwtDecode(token);
      setUserId(decoded.user_id);

      const [resAnuncios, resUsuarios] = await Promise.all([
        api.get('anuncios/'),
        api.get('usuarios/')
      ]);

      const todosLosAnuncios = resAnuncios.data.results || resAnuncios.data;
      const anunciosInstitucionales = todosLosAnuncios.filter(a => a.comision === null);
      setComunicados(anunciosInstitucionales);

      const todosLosUsuarios = resUsuarios.data.results || resUsuarios.data;
      const soloDocentes = todosLosUsuarios.filter(u => u.rol === 'DOCENTE');
      setDocentes(soloDocentes);

    } catch (error) {
      console.error("Error al cargar comunicados:", error);
      toast.error("Error al cargar el panel de comunicaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckboxCambio = (docenteId) => {
    setNuevoComunicado(prev => {
      const seleccionados = prev.docentes_especificos;
      if (seleccionados.includes(docenteId)) {
        return { ...prev, docentes_especificos: seleccionados.filter(id => id !== docenteId) };
      } else {
        return { ...prev, docentes_especificos: [...seleccionados, docenteId] };
      }
    });
  };

  // --- PUBLICACIÓN OPTIMIZADA (Inyección Directa) ---
  const handlePublicar = async (e) => {
    e.preventDefault();
    if (nuevoComunicado.tipo_audiencia === 'DOCENTES_ESPECIFICOS' && nuevoComunicado.docentes_especificos.length === 0) {
      toast.error("Debes seleccionar al menos un docente.");
      return;
    }
    setGuardando(true);
    let fechaExpiracionCalculada = null;
    const fechaActual = new Date();

    if (nuevoComunicado.tipo_expiracion === 'semana') {
      fechaActual.setDate(fechaActual.getDate() + 7);
      fechaExpiracionCalculada = fechaActual.toISOString();
    } else if (nuevoComunicado.tipo_expiracion === 'mes') {
      fechaActual.setMonth(fechaActual.getMonth() + 1);
      fechaExpiracionCalculada = fechaActual.toISOString();
    } else if (nuevoComunicado.tipo_expiracion === 'especifica') {
      if (!nuevoComunicado.fecha_expiracion_personalizada) {
        toast.error("Selecciona una fecha de expiración.");
        setGuardando(false);
        return;
      }
      fechaExpiracionCalculada = new Date(nuevoComunicado.fecha_expiracion_personalizada + 'T23:59:59').toISOString();
    }

    try {
      // 1. Guardamos en el backend y capturamos la respuesta
      const response = await api.post('anuncios/', {
        titulo: nuevoComunicado.titulo,
        contenido: nuevoComunicado.contenido,
        tipo_audiencia: nuevoComunicado.tipo_audiencia,
        docentes_especificos: nuevoComunicado.docentes_especificos,
        permite_comentarios: nuevoComunicado.permite_comentarios,
        fecha_expiracion: fechaExpiracionCalculada,
        comision: null, 
        autor: userId
      });

      // 2. INYECCIÓN DIRECTA: Ponemos el nuevo comunicado arriba de todo sin recargar la página
      setComunicados(prev => [response.data, ...prev]);

      toast.success("Comunicado institucional publicado.");
      setNuevoComunicado({
        titulo: '', contenido: '', tipo_audiencia: 'TODOS_DOCENTES', docentes_especificos: [],
        permite_comentarios: false, tipo_expiracion: 'permanente', fecha_expiracion_personalizada: ''
      });
      setShowModal(false);
      
    } catch (error) {
      toast.error("Error al publicar el comunicado.");
    } finally {
      setGuardando(false);
    }
  };

  // --- ELIMINACIÓN OPTIMIZADA ---
  const handleEliminar = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este comunicado institucional?")) {
      try {
        await api.delete(`anuncios/${id}/`);
        // Eliminamos de la lista visual instantáneamente
        setComunicados(prev => prev.filter(c => c.id !== id));
        toast.success("Comunicado eliminado.");
      } catch (error) {
        toast.error("Error al eliminar.");
      }
    }
  };

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

  const handleAbrirRespuestas = async (comunicado) => {
    setComunicadoActivo(comunicado);
    setNuevoComentario('');
    setShowRespuestasModal(true);

    if (esAnuncioNoVisto(comunicado)) {
      try {
        setComunicados(prev => prev.map(c => c.id === comunicado.id ? { ...c, visto_por: [...(c.visto_por || []), userId] } : c));
        await api.post(`anuncios/${comunicado.id}/marcar_visto/`);
        
        // El sync en segundo plano lo dejamos porque involucra comentarios de otras personas
        const resAnuncios = await api.get('anuncios/');
        const todosLosAnuncios = resAnuncios.data.results || resAnuncios.data;
        const anunciosInstitucionales = todosLosAnuncios.filter(a => a.comision === null);
        setComunicados(anunciosInstitucionales);
      } catch (error) {
        console.error("Error al marcar visto:", error);
      }
    }
  };

  const handleEnviarComentarioAdmin = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setGuardandoComentario(true);
    try {
      await api.post('comentarios/', { anuncio: comunicadoActivo.id, contenido: nuevoComentario });
      setNuevoComentario('');
      
      const resAnuncios = await api.get('anuncios/');
      const todosLosAnuncios = resAnuncios.data.results || resAnuncios.data;
      const anunciosInstitucionales = todosLosAnuncios.filter(a => a.comision === null);
      setComunicados(anunciosInstitucionales);
      
      const comunicadoActualizado = anunciosInstitucionales.find(a => a.id === comunicadoActivo.id);
      if (comunicadoActualizado) setComunicadoActivo(comunicadoActualizado);

    } catch (error) {
      toast.error("Error al enviar la respuesta.");
    } finally {
      setGuardandoComentario(false);
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" style={{ color: '#0b2265' }} /></div>;

  return (
    <div>
      <div className="mb-4">
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-8">
            <h2 className="fw-bold text-dark mb-0"><i className="bi bi-broadcast text-danger me-2"></i> Comunicados Institucionales</h2>
            <p className="text-muted mb-0 mt-1">Envía mensajes globales al plantel docente o a profesores específicos.</p>
          </div>
          <div className="col-12 col-md-4 d-grid d-md-block text-md-end">
            <Button variant="danger" className="fw-bold shadow-sm px-4 py-2" onClick={() => setShowModal(true)}>
              <i className="bi bi-pencil-square me-2"></i> Redactar Comunicado
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light text-nowrap">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="py-3">Asunto</th>
                <th className="py-3">Audiencia</th>
                <th className="py-3">Expiración</th>
                <th className="text-end px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comunicados.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-5 text-muted">No hay comunicados institucionales activos.</td></tr>
              ) : (
                comunicados.map(com => {
                  const noVisto = esAnuncioNoVisto(com);

                  return (
                    <tr key={com.id}>
                      <td className="px-4 text-muted small text-nowrap">
                        {new Date(com.fecha_creacion).toLocaleDateString('es-ES')}
                      </td>
                      <td className="fw-bold text-dark">{com.titulo}</td>
                      <td className="text-nowrap">
                        {com.tipo_audiencia === 'TODOS_DOCENTES' ? (
                          <Badge bg="primary"><i className="bi bi-globe me-1"></i> Todos los Docentes</Badge>
                        ) : (
                          <Badge bg="info" text="dark"><i className="bi bi-person-lines-fill me-1"></i> Docentes Específicos</Badge>
                        )}
                      </td>
                      <td className="text-nowrap">
                        {com.fecha_expiracion ? (
                          <span className="text-warning fw-medium small">
                            <i className="bi bi-hourglass-split me-1"></i> {new Date(com.fecha_expiracion).toLocaleDateString('es-ES')}
                          </span>
                        ) : (
                          <span className="text-success small"><i className="bi bi-infinity me-1"></i> Permanente</span>
                        )}
                      </td>
                      <td className="text-end px-4 text-nowrap">
                        
                        {com.permite_comentarios && (
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="me-2 position-relative" 
                            onClick={() => handleAbrirRespuestas(com)}
                            title="Ver respuestas"
                          >
                            <i className="bi bi-chat-text"></i>
                            {com.comentarios?.length > 0 && <span className="ms-1">{com.comentarios.length}</span>}
                            
                            {noVisto && (
                              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                                <span className="visually-hidden">Nuevas respuestas</span>
                              </span>
                            )}
                          </Button>
                        )}

                        <Button variant="outline-danger" size="sm" onClick={() => handleEliminar(com.id)}>
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Form onSubmit={handlePublicar}>
          <Modal.Header closeButton className="bg-light border-bottom-0 pb-0">
            <Modal.Title className="fw-bold text-dark"><i className="bi bi-broadcast me-2 text-danger"></i>Nuevo Comunicado</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4 pt-3">
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold small text-muted text-uppercase">Asunto / Título</Form.Label>
              <Form.Control type="text" placeholder="Ej: Reunión de personal, Feriado..." value={nuevoComunicado.titulo} onChange={(e) => setNuevoComunicado({...nuevoComunicado, titulo: e.target.value})} required className="shadow-sm" />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted text-uppercase">Cuerpo del Mensaje</Form.Label>
              <Form.Control as="textarea" rows={4} value={nuevoComunicado.contenido} onChange={(e) => setNuevoComunicado({...nuevoComunicado, contenido: e.target.value})} required className="shadow-sm" />
            </Form.Group>

            <Row className="g-3 mb-4">
              <Col xs={12} md={6}>
                <div className="p-3 bg-light border rounded h-100">
                  <Form.Label className="fw-bold small text-muted text-uppercase mb-3"><i className="bi bi-people-fill me-2"></i>Audiencia</Form.Label>
                  <Form.Select 
                    className="mb-3 shadow-sm"
                    value={nuevoComunicado.tipo_audiencia} 
                    onChange={(e) => setNuevoComunicado({...nuevoComunicado, tipo_audiencia: e.target.value, docentes_especificos: []})}
                  >
                    <option value="TODOS_DOCENTES">Todo el plantel docente</option>
                    <option value="DOCENTES_ESPECIFICOS">Seleccionar profesores específicos...</option>
                  </Form.Select>

                  {nuevoComunicado.tipo_audiencia === 'DOCENTES_ESPECIFICOS' && (
                    <div className="border bg-white rounded p-2 shadow-sm" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {docentes.map(doc => (
                        <Form.Check 
                          key={doc.id}
                          type="checkbox"
                          id={`docente-${doc.id}`}
                          label={`${doc.last_name}, ${doc.first_name}`}
                          className="small mb-1"
                          checked={nuevoComunicado.docentes_especificos.includes(doc.id)}
                          onChange={() => handleCheckboxCambio(doc.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Col>
              
              <Col xs={12} md={6}>
                <div className="p-3 bg-light border rounded h-100">
                  <Form.Label className="fw-bold small text-muted text-uppercase mb-3"><i className="bi bi-clock-history me-2"></i>Opciones Adicionales</Form.Label>
                  
                  <Form.Select 
                    size="sm"
                    className="mb-3 shadow-sm"
                    value={nuevoComunicado.tipo_expiracion}
                    onChange={(e) => setNuevoComunicado({...nuevoComunicado, tipo_expiracion: e.target.value})}
                  >
                    <option value="permanente">Permanente (No se borra)</option>
                    <option value="semana">Ocultar en 1 semana</option>
                    <option value="mes">Ocultar en 1 mes</option>
                    <option value="especifica">Ocultar en una fecha específica...</option>
                  </Form.Select>

                  {nuevoComunicado.tipo_expiracion === 'especifica' && (
                    <Form.Control 
                      type="date" 
                      size="sm"
                      className="mb-3 shadow-sm border-warning" 
                      value={nuevoComunicado.fecha_expiracion_personalizada} 
                      onChange={(e) => setNuevoComunicado({...nuevoComunicado, fecha_expiracion_personalizada: e.target.value})}
                    />
                  )}

                  <Form.Check 
                    type="switch" 
                    id="comentarios-admin-switch" 
                    label={<span className="small text-dark">Permitir respuestas al comunicado</span>} 
                    checked={nuevoComunicado.permite_comentarios} 
                    onChange={(e) => setNuevoComunicado({...nuevoComunicado, permite_comentarios: e.target.checked})} 
                  />
                </div>
              </Col>
            </Row>

          </Modal.Body>
          <Modal.Footer className="bg-light border-top-0 pt-0">
            <Button variant="link" className="text-muted text-decoration-none" onClick={() => setShowModal(false)} disabled={guardando}>Cancelar</Button>
            <Button variant="danger" type="submit" className="fw-bold px-4 rounded-pill shadow-sm" disabled={guardando}>
              {guardando ? <Spinner animation="border" size="sm" /> : 'Publicar Comunicado'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showRespuestasModal} onHide={() => setShowRespuestasModal(false)} centered size="md">
        <Modal.Header closeButton className="bg-white border-bottom">
          <Modal.Title className="fw-bold text-dark fs-5">
            <i className="bi bi-chat-left-text-fill me-2 text-primary"></i> 
            Buzón de Respuestas
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light p-0 d-flex flex-column" style={{ maxHeight: '60vh' }}>
          
          <div className="p-3 bg-white border-bottom shadow-sm z-1">
            <Badge bg="secondary" className="mb-2">Asunto</Badge>
            <h6 className="fw-bold mb-1">{comunicadoActivo?.titulo}</h6>
            <p className="small text-muted mb-0" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {comunicadoActivo?.contenido}
            </p>
          </div>
          
          <div className="p-3 flex-grow-1 overflow-y-auto">
            {comunicadoActivo?.comentarios?.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {comunicadoActivo.comentarios.map(com => {
                  const esAdmin = com.autor_nombre === 'Administración' || com.autor_username === 'admin';
                  return (
                    <div key={com.id} className={`d-flex gap-2 ${esAdmin ? 'flex-row-reverse' : ''}`}>
                      <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white shadow-sm ${esAdmin ? 'bg-danger' : 'bg-secondary'}`} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        <i className={`bi ${esAdmin ? 'bi-building' : 'bi-person'}`}></i>
                      </div>
                      <div className={`p-2 rounded shadow-sm border ${esAdmin ? 'bg-danger bg-opacity-10 border-danger border-opacity-25' : 'bg-white'}`} style={{ maxWidth: '85%' }}>
                        <div className="d-flex justify-content-between align-items-center mb-1 gap-3">
                          <span className={`fw-bold small ${esAdmin ? 'text-danger' : 'text-dark'}`}>{esAdmin ? 'Tú' : (com.autor_nombre || com.autor_username)}</span>
                          <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                            {new Date(com.fecha_creacion).toLocaleDateString('es-ES', { hour: '2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                        <p className="mb-0 text-dark" style={{fontSize: '0.85rem'}}>{com.contenido}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-envelope-open text-muted fs-1 mb-2 d-block opacity-50"></i>
                <p className="text-muted small mb-0">Nadie ha respondido a este comunicado aún.</p>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-white p-3 border-top">
           <Form onSubmit={handleEnviarComentarioAdmin} className="d-flex w-100 gap-2 m-0">
              <Form.Control size="sm" type="text" placeholder="Escribir una aclaración o respuesta rápida..." value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} className="shadow-sm rounded-pill px-3" />
              <Button type="submit" size="sm" variant="primary" className="rounded-circle shadow-sm" style={{ width: '32px', height: '32px', padding: 0 }} disabled={!nuevoComentario.trim() || guardandoComentario}>
                <i className="bi bi-send-fill"></i>
              </Button>
           </Form>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default ComunicadosAdmin;