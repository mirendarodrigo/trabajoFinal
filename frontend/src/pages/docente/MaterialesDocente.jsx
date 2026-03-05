import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Spinner, Modal, Form, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import api from '../../api/axios';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const MaterialesDocente = () => {
  const [materiales, setMateriales] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [comisionId, setComisionId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [enlace, setEnlace] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const decoded = jwtDecode(token);
      const docenteId = decoded.user_id;

      const [resComisiones, resMateriales] = await Promise.all([
        api.get('comisiones/'),
        api.get('materiales/')
      ]);

      const todasComisiones = resComisiones.data.results || resComisiones.data;
      const misComisiones = todasComisiones.filter(c => 
        (c.docente?.id || c.docente) === parseInt(docenteId)
      );
      setComisiones(misComisiones);

      const misComisionesIds = misComisiones.map(c => c.id);
      const todosMateriales = resMateriales.data.results || resMateriales.data;
      const misMateriales = todosMateriales.filter(m => 
        misComisionesIds.includes(m.comision?.id || m.comision)
      );

      setMateriales(misMateriales);

    } catch (error) {
      console.error("Error cargando materiales:", error);
      toast.error("Error al cargar tu repositorio de materiales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubirMaterial = async (e) => {
    e.preventDefault();

    if (!comisionId) {
      toast.error("Debes seleccionar una comisión.");
      return;
    }
    if (!archivo && !enlace) {
      toast.error("Debes adjuntar un archivo o pegar un enlace externo.");
      return;
    }

    setGuardando(true);
    
    const formData = new FormData();
    formData.append('comision', comisionId);
    formData.append('titulo', titulo);
    if (descripcion) formData.append('descripcion', descripcion);
    if (enlace) formData.append('enlace', enlace);
    if (archivo) formData.append('archivo', archivo); 

    try {
      await api.post('materiales/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success("¡Material subido con éxito!");
      
      setComisionId('');
      setTitulo('');
      setDescripcion('');
      setArchivo(null);
      setEnlace('');
      
      const fileInput = document.getElementById('archivo-input');
      if (fileInput) fileInput.value = '';

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error al subir:", error);
      toast.error("No se pudo subir el material. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este material? Los alumnos ya no podrán descargarlo.")) {
      try {
        await api.delete(`materiales/${id}/`);
        toast.success("Material eliminado permanentemente.");
        fetchData();
      } catch (error) {
        toast.error("Error al eliminar el archivo.");
      }
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" style={{ color: '#0b2265' }} /></div>;

  return (
    <div>
      {/* CABECERA RESPONSIVA */}
      <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-1">
            <i className="bi bi-folder2-open me-2 text-primary"></i> Material de Estudio
          </h2>
          <p className="text-muted mb-0">Gestiona los archivos y enlaces de todas tus cursadas.</p>
        </div>
        <Button variant="primary" className="fw-bold shadow-sm w-100 w-md-auto" style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} onClick={() => setShowModal(true)}>
          <i className="bi bi-cloud-arrow-up-fill me-2"></i> Subir Material
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light text-nowrap">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="py-3">Comisión</th>
                <th className="py-3">Título del Recurso</th>
                <th className="py-3">Formato</th>
                <th className="text-end px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {materiales.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">Aún no has subido materiales de estudio.</td>
                </tr>
              ) : (
                materiales.map(mat => {
                  const nombreAula = typeof mat.comision === 'object' ? mat.comision.nombre : mat.comision_nombre || comisiones.find(c => c.id === mat.comision)?.nombre || `Comisión #${mat.comision}`;
                  
                  return (
                    <tr key={mat.id}>
                      <td className="px-4 text-muted small text-nowrap">
                        {new Date(mat.fecha_subida).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="fw-bold text-piccadilly-blue text-nowrap">{nombreAula}</td>
                      <td>
                        <div className="fw-bold text-dark">{mat.titulo}</div>
                        {mat.descripcion && <small className="text-muted d-block text-truncate" style={{ maxWidth: '250px' }}>{mat.descripcion}</small>}
                      </td>
                      <td className="text-nowrap">
                        {mat.archivo && (
                          <Badge bg="danger" className="me-2"><i className="bi bi-file-earmark-pdf me-1"></i> Archivo</Badge>
                        )}
                        {mat.enlace && (
                          <Badge bg="info"><i className="bi bi-link-45deg me-1"></i> Enlace</Badge>
                        )}
                      </td>
                      <td className="text-end px-4 text-nowrap">
                        
                        {/* TOOLTIP PARA VER ARCHIVO */}
                        {mat.archivo && (
                          <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-archivo-${mat.id}`}>Ver Archivo</Tooltip>}>
                            <Button variant="outline-primary" size="sm" className="me-2" as="a" href={mat.archivo} target="_blank" rel="noopener noreferrer">
                              <i className="bi bi-eye"></i>
                            </Button>
                          </OverlayTrigger>
                        )}
                        
                        {/* TOOLTIP PARA ABRIR ENLACE */}
                        {mat.enlace && (
                          <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-enlace-${mat.id}`}>Abrir Enlace</Tooltip>}>
                            <Button variant="outline-info" size="sm" className="me-2" as="a" href={mat.enlace} target="_blank" rel="noopener noreferrer">
                              <i className="bi bi-box-arrow-up-right"></i>
                            </Button>
                          </OverlayTrigger>
                        )}
                        
                        {/* TOOLTIP PARA ELIMINAR */}
                        <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-eliminar-${mat.id}`}>Eliminar</Tooltip>}>
                          <Button variant="outline-danger" size="sm" onClick={() => handleEliminar(mat.id)}>
                            <i className="bi bi-trash"></i>
                          </Button>
                        </OverlayTrigger>

                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* MODAL SUBIR MATERIAL - DISEÑO CORREGIDO */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Form onSubmit={handleSubirMaterial}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold"><i className="bi bi-cloud-arrow-up me-2 text-primary"></i>Nuevo Material de Estudio</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">¿Para qué comisión? <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    value={comisionId}
                    onChange={(e) => setComisionId(e.target.value)}
                    required
                    className="shadow-sm"
                  >
                    <option value="">Selecciona un aula...</option>
                    {comisiones.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium">Título del Recurso <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Ej: Unidad 1 - Presentación" 
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required 
                    className="shadow-sm"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">Descripción corta (Opcional)</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2}
                placeholder="Instrucciones breves para los alumnos..." 
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="shadow-sm"
              />
            </Form.Group>

            {/* SECCIÓN DE ARCHIVOS: ALINEACIÓN PERFECTA */}
            <div className="p-4 bg-light rounded border">
              <h6 className="fw-bold text-muted mb-3"><i className="bi bi-paperclip me-2"></i>Adjuntar Contenido</h6>
              
              <Row className="g-3 align-items-center">
                <Col xs={12} md={5}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted">1. Subir un Archivo físico</Form.Label>
                    <Form.Control 
                      type="file" 
                      id="archivo-input"
                      onChange={(e) => setArchivo(e.target.files[0])}
                      className="shadow-sm"
                    />
                  </Form.Group>
                </Col>
                
                {/* DIVISOR VISUAL RESPONSIVO */}
                <Col xs={12} md={2} className="text-center">
                  <Badge bg="secondary" className="text-uppercase my-3 my-md-0 px-3 py-2 rounded-pill shadow-sm">
                    Y / O
                  </Badge>
                </Col>
                
                <Col xs={12} md={5}>
                  <Form.Group>
                    <Form.Label className="small fw-bold text-muted">2. Pegar Enlace (Drive, YouTube)</Form.Label>
                    <Form.Control 
                      type="url" 
                      placeholder="https://..." 
                      value={enlace}
                      onChange={(e) => setEnlace(e.target.value)}
                      className="shadow-sm"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="outline-secondary" className="fw-medium" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="fw-bold shadow-sm" style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} disabled={guardando}>
              {guardando ? <Spinner animation="border" size="sm" /> : 'Subir y Publicar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialesDocente;