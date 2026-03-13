import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Spinner, Table, Modal, Badge, InputGroup, Row, Col } from 'react-bootstrap';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const GestionDocentes = () => {
  const [docentes, setDocentes] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🚨 NUEVO ESTADO: Controla exclusivamente el spinner del botón de guardado
  const [guardando, setGuardando] = useState(false);
  
  // Estado para la barra de búsqueda
  const [busqueda, setBusqueda] = useState('');

  // Estados del Modal de Creación
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoDni, setNuevoDni] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resUsuarios, resComisiones] = await Promise.all([
        api.get('usuarios/?rol=DOCENTE'),
        api.get('comisiones/')
      ]);
      
      setDocentes(resUsuarios.data.results || resUsuarios.data);
      setComisiones(resComisiones.data.results || resComisiones.data);
    } catch (error) {
      toast.error("Error al cargar la información del plantel docente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- LÓGICA PARA CREAR DOCENTE ---
  const handleCrearDocente = async (e) => {
    e.preventDefault();
    setGuardando(true); // 🚨 Activamos el spinner apenas el usuario hace clic

    try {
      const payload = {
        first_name: nuevoNombre,
        last_name: nuevoApellido,
        email: nuevoEmail,
        username: nuevoDni, 
        dni: nuevoDni,      
        password: nuevoDni, 
        rol: 'DOCENTE'      
      };

      await api.post('usuarios/', payload);
      toast.success("Docente registrado exitosamente");
      
      setNuevoNombre(''); setNuevoApellido(''); setNuevoEmail(''); setNuevoDni('');
      setShowCrearModal(false);
      fetchData();
      
    } catch (error) {
      const errorData = error.response?.data;
      console.error("❌ Error devuelto por Django:", errorData);
      
      if (errorData?.username || errorData?.dni) {
        toast.error("⚠️ El DNI o Usuario ya está registrado en el sistema.");
      } else if (errorData?.email) {
        toast.error("⚠️ Ese correo electrónico ya está en uso.");
      } else {
        toast.error(`Error: ${JSON.stringify(errorData)}`);
      }
    } finally {
      setGuardando(false); // 🚨 Apagamos el spinner termine bien o mal
    }
  };

  const handleEliminarDocente = async (id, nombreCompleto) => {
    if (window.confirm(`⚠️ ¿Deseas dar de baja a ${nombreCompleto}?\n\nEsta acción lo eliminará del sistema y lo desvinculará de las comisiones que tenga asignadas.`)) {
      try {
        await api.delete(`usuarios/${id}/`);
        toast.success("Docente eliminado del sistema");
        fetchData();
      } catch (error) {
        toast.error("No se pudo eliminar al docente.");
      }
    }
  };

  // --- FILTRO DE BÚSQUEDA ---
  const docentesFiltrados = docentes.filter(docente => {
    const termino = busqueda.toLowerCase();
    const nombreCompleto = `${docente.first_name} ${docente.last_name}`.toLowerCase();
    const dni = docente.username?.toLowerCase() || '';
    const email = docente.email?.toLowerCase() || '';
    
    return nombreCompleto.includes(termino) || dni.includes(termino) || email.includes(termino);
  });

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" style={{ color: '#0b2265' }} /></div>;

  return (
    <div>
      {/* --- CABECERA Y BUSCADOR RESPONSIVOS --- */}
      <div className="mb-4">
        <Row className="align-items-center g-3">
          <Col xs={12} lg={4}>
            <h2 className="fw-bold text-dark mb-1">
              <i className="bi bi-person-badge-fill me-2 text-piccadilly-blue"></i> Plantel Docente
            </h2>
            <p className="text-muted mb-0">Administra a los profesores de la institución.</p>
          </Col>
          
          <Col xs={12} md={6} lg={5}>
            <InputGroup className="shadow-sm">
              <InputGroup.Text className="bg-white border-end-0"><i className="bi bi-search text-muted"></i></InputGroup.Text>
              <Form.Control
                placeholder="Buscar por DNI, nombre o email..."
                className="border-start-0 ps-0"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </InputGroup>
          </Col>

          <Col xs={12} md={6} lg={3} className="d-grid d-md-flex justify-content-md-end">
            <Button 
              variant="primary" 
              className="fw-bold shadow-sm py-2 px-md-4 d-flex justify-content-center align-items-center w-100 w-md-auto"
              style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }}
              onClick={() => setShowCrearModal(true)}
            >
              <i className="bi bi-person-plus-fill me-2 fs-5"></i> Contratar Docente
            </Button>
          </Col>
        </Row>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0 bg-white">
            <thead className="table-light text-nowrap">
              <tr>
                <th className="px-4 py-3 border-0">DNI / Usuario</th>
                <th className="py-3 border-0">Profesor/a</th>
                <th className="py-3 border-0">Contacto</th>
                <th className="py-3 text-center border-0">Aulas a Cargo</th>
                <th className="text-end px-4 py-3 border-0">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {docentesFiltrados.map(docente => {
                const aulasACargo = comisiones.filter(c => c.docente === docente.id && c.activo).length;
                return (
                  <tr key={docente.id}>
                    <td className="px-4 text-muted fw-medium">{docente.dni || docente.username}</td>
                    <td className="fw-bold text-dark">
                      {docente.last_name}, {docente.first_name}
                    </td>
                    <td>
                      <i className="bi bi-envelope me-2 text-muted"></i>{docente.email}
                    </td>
                    <td className="text-center">
                      <Badge bg={aulasACargo > 0 ? "success" : "secondary"} pill className="px-3 py-2 shadow-sm">
                        {aulasACargo}
                      </Badge>
                    </td>
                    <td className="text-end px-4 text-nowrap">
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        className="rounded-pill px-3 shadow-sm"
                        onClick={() => handleEliminarDocente(docente.id, `${docente.first_name} ${docente.last_name}`)}
                      >
                        <i className="bi bi-trash me-1"></i> Dar de baja
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {docentesFiltrados.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-5">
                    <i className="bi bi-search fs-1 d-block mb-3 opacity-50"></i>
                    No se encontraron docentes con esa búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* --- MODAL: ALTA DE DOCENTE --- */}
      <Modal show={showCrearModal} onHide={() => !guardando && setShowCrearModal(false)} centered>
        <Form onSubmit={handleCrearDocente}>
          <Modal.Header closeButton={!guardando} className="bg-light">
            <Modal.Title className="fw-bold text-dark"><i className="bi bi-person-badge me-2 text-primary"></i>Alta de Docente</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="alert alert-info small border-info shadow-sm">
              <i className="bi bi-info-circle-fill me-2"></i>
              El DNI ingresado será el <b>Usuario</b> y <b>Contraseña temporal</b> del profesor. Deberá cambiarla al ingresar.
            </div>
            
            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label className="fw-medium text-muted small text-uppercase">Nombres <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" className="shadow-sm" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required disabled={guardando} />
                </Form.Group>
              </div>
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label className="fw-medium text-muted small text-uppercase">Apellidos <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" className="shadow-sm" value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} required disabled={guardando} />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium text-muted small text-uppercase">Documento (DNI sin puntos) <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" className="shadow-sm" placeholder="Ej: 25123456" value={nuevoDni} onChange={(e) => setNuevoDni(e.target.value)} required disabled={guardando} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium text-muted small text-uppercase">Correo Electrónico <span className="text-danger">*</span></Form.Label>
              <Form.Control type="email" className="shadow-sm" placeholder="profesor@correo.com" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} required disabled={guardando} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="link" className="text-muted text-decoration-none" onClick={() => setShowCrearModal(false)} disabled={guardando}>Cancelar</Button>
            
            {/* 🚨 BOTÓN ACTUALIZADO CON SPINNER Y ESTADO DE DESHABILITADO */}
            <Button 
              variant="primary" 
              type="submit" 
              disabled={guardando}
              className="fw-bold px-4 rounded-pill shadow-sm" 
              style={{ backgroundColor: guardando ? '#6c757d' : '#0b2265', borderColor: guardando ? '#6c757d' : '#0b2265' }}
            >
              {guardando ? (
                <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" /> Procesando...</>
              ) : (
                'Registrar Docente'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </div>
  );
};

export default GestionDocentes;