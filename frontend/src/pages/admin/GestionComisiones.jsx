import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Spinner, Table, Modal, Badge, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom'; 
import api from '../../api/axios';
import toast from 'react-hot-toast';

// 1. EL TRADUCTOR DE CÓDIGOS PARA LA TABLA
const DICCIONARIO_PERIODOS = {
  'ANUAL': 'Anual (Todo el año)',
  '1C': '1er Cuatrimestre',
  '2C': '2do Cuatrimestre',
  'VERANO': 'Intensivo Verano'
};

const GestionComisiones = () => {
  const [comisiones, setComisiones] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NUEVO: Estado para el Buscador ---
  const [busqueda, setBusqueda] = useState('');

  // Estados Modal Principal (Comisión)
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [docenteId, setDocenteId] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [periodo, setPeriodo] = useState('ANUAL');
  const [activo, setActivo] = useState(true);

  // Estados Modal de Horarios
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [comisionActual, setComisionActual] = useState(null);
  const [horariosComision, setHorariosComision] = useState([]);
  
  // Campos del formulario de Horarios
  const [dia, setDia] = useState('LUN');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resComisiones, resCursos, resUsuarios] = await Promise.all([
        api.get('comisiones/'),
        api.get('cursos/'),
        api.get('usuarios/')
      ]);
      setComisiones(resComisiones.data.results || resComisiones.data);
      setCursos(resCursos.data.results || resCursos.data);
      const soloDocentes = (resUsuarios.data.results || resUsuarios.data).filter(u => u.rol === 'DOCENTE' || u.is_staff);
      setDocentes(soloDocentes);
    } catch (error) {
      toast.error("Error al cargar la información.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- LÓGICA DEL BUSCADOR INTELIGENTE ---
  const comisionesFiltradas = comisiones.filter(c => {
    const termino = busqueda.toLowerCase();
    const nombreComision = c.nombre?.toLowerCase() || '';
    const nombreCurso = c.nombre_curso?.toLowerCase() || '';
    const nombreDocente = c.nombre_docente?.toLowerCase() || '';
    
    // Devuelve true si el término coincide con el curso, la comisión o el docente
    return nombreComision.includes(termino) || 
           nombreCurso.includes(termino) || 
           nombreDocente.includes(termino);
  });

  const handleShowModal = (comision = null) => {
    if (comision) {
      setEditId(comision.id);
      setNombre(comision.nombre);
      setCursoId(comision.curso?.id || comision.curso || '');
      setDocenteId(comision.docente?.id || comision.docente || '');
      setAnio(comision.anio);
      setPeriodo(comision.periodo);
      setActivo(comision.activo);
    } else {
      setEditId(null);
      setNombre('');
      setCursoId('');
      setDocenteId('');
      setAnio(new Date().getFullYear());
      setPeriodo('ANUAL');
      setActivo(true);
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!cursoId || !docenteId) {
      toast.error("Selecciona un Curso Base y un Docente.");
      return;
    }
    const payload = {
      nombre, curso: parseInt(cursoId), docente: parseInt(docenteId), anio: parseInt(anio), periodo, activo
    };
    try {
      if (editId) {
        await api.put(`comisiones/${editId}/`, payload);
        toast.success("Comisión actualizada");
      } else {
        await api.post('comisiones/', payload);
        toast.success("Comisión creada");
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      let errorMsg = "Error al guardar.";
      if (error.response?.data) {
         const err = error.response.data;
         errorMsg = typeof err === 'string' ? "Error 500: Revisa Django." : `Error: ${Object.values(err)[0]}`;
      }
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta comisión?")) {
      try {
        await api.delete(`comisiones/${id}/`);
        toast.success("Comisión eliminada");
        fetchData();
      } catch (error) {
        toast.error("No se pudo eliminar.");
      }
    }
  };

  const handleAbrirHorarios = async (comision) => {
    setComisionActual(comision);
    setDia('LUN');
    setHoraInicio('');
    setHoraFin('');
    try {
      const res = await api.get(`horarios/?comision=${comision.id}`);
      setHorariosComision(res.data.results || res.data);
      setShowHorarioModal(true);
    } catch (error) {
      toast.error("No se pudieron cargar los horarios.");
    }
  };

  const handleAgregarHorario = async (e) => {
    e.preventDefault();
    try {
      await api.post('horarios/', {
        dia: dia,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        comision: comisionActual.id
      });
      toast.success("Horario asignado");
      const res = await api.get(`horarios/?comision=${comisionActual.id}`);
      setHorariosComision(res.data.results || res.data);
      setHoraInicio('');
      setHoraFin('');
      fetchData(); 
    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (data.error) {
          toast.error(Array.isArray(data.error) ? data.error[0] : data.error, { duration: 6000 });
        } else if (data.non_field_errors) {
          toast.error(data.non_field_errors[0], { duration: 6000 });
        } else {
          const firstKey = Object.keys(data)[0];
          if (firstKey && Array.isArray(data[firstKey])) {
            toast.error(`${firstKey.toUpperCase()}: ${data[firstKey][0]}`);
          } else {
            toast.error("Revisa el formato de las horas ingresadas.");
          }
        }
      } else {
        toast.error("Error de conexión con el servidor.");
      }
    }
  };

  const handleEliminarHorario = async (idHorario) => {
    try {
      await api.delete(`horarios/${idHorario}/`);
      toast.success("Día eliminado");
      setHorariosComision(horariosComision.filter(h => h.id !== idHorario));
      fetchData();
    } catch (error) {
      toast.error("Error al eliminar.");
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" style={{ color: '#0b2265' }} /></div>;

  return (
    <div>
      {/* CABECERA RESPONSIVA CON BUSCADOR */}
      {/* CABECERA REORGANIZADA CON GRILLA */}
      <div className="mb-4">
        
        {/* Fila Superior: Título y Botón */}
        <div className="row align-items-center mb-2 g-3">
          <div className="col-12 col-md-8">
            <h2 className="fw-bold text-dark mb-0">
              <i className="bi bi-diagram-3-fill me-2 text-piccadilly-blue"></i> Comisiones y Horarios
            </h2>
          </div>
          {/* d-grid lo hace 100% en celular, d-md-flex lo devuelve a su tamaño normal en PC y lo tira a la derecha */}
          <div className="col-12 col-md-4 d-grid d-md-flex justify-content-md-end">
            <Button 
              variant="primary" 
              className="fw-bold shadow-sm" 
              style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} 
              onClick={() => handleShowModal()}
            >
              <i className="bi bi-plus-lg me-2"></i> Abrir Comisión
            </Button>
          </div>
        </div>

        {/* Fila Inferior: Subtítulo y Buscador (pegado a la tabla) */}
        <div className="row align-items-center g-3 mt-1">
          <div className="col-12 col-md-7">
            <p className="text-muted mb-0">
              Gestiona la apertura de cursos, asigna docentes y programa la agenda.
            </p>
          </div>
          <div className="col-12 col-md-5 d-flex justify-content-md-end">
            <div className="input-group shadow-sm w-100" style={{ maxWidth: '400px' }}>
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-primary"></i>
              </span>
              <Form.Control
                type="text"
                placeholder="Buscar por curso o docente..."
                className="border-start-0 ps-0"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </div>

      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Estado</th>
                <th className="py-3">Curso Base</th>
                <th className="py-3">Identificador</th>
                <th className="py-3">Docente a cargo</th>
                <th className="py-3">Periodo</th>
                <th className="text-end px-4 py-3">Acciones y Horarios</th>
              </tr>
            </thead>
            <tbody>
              {/* ITERAMOS SOBRE LA LISTA FILTRADA, NO LA ORIGINAL */}
              {comisionesFiltradas.map(c => (
                <tr key={c.id}>
                  <td className="px-4">
                    {c.activo 
                      ? <Badge bg="success" className="bg-opacity-10 text-success border border-success">Activa</Badge>
                      : <Badge bg="secondary" className="bg-opacity-10 text-secondary border border-secondary">Cerrada</Badge>
                    }
                  </td>
                  <td className="fw-bold text-dark">{c.nombre_curso || `Curso #${c.curso}`}</td>
                  <td>{c.nombre}</td>
                  <td><i className="bi bi-person-video3 me-2 text-muted"></i>{c.nombre_docente || 'Sin asignar'}</td>
                  
                  <td>{DICCIONARIO_PERIODOS[c.periodo] || c.periodo} ({c.anio})</td>
                  
                  <td className="text-end px-4 text-nowrap">
                    <Button as={Link} to={`/dashboard/aulas/${c.id}`} variant="outline-primary" size="sm" className="me-2 rounded-pill fw-bold" title="Ingresar al Aula">
                      <i className="bi bi-box-arrow-in-right me-1"></i> Entrar
                    </Button>
                    <Button variant="outline-success" size="sm" className="me-2 rounded-pill fw-bold" onClick={() => handleAbrirHorarios(c)}>
                      <i className="bi bi-clock-fill me-1"></i> Horarios
                    </Button>
                    <Button variant="light" size="sm" className="me-2 text-primary" onClick={() => handleShowModal(c)}>
                      <i className="bi bi-pencil-square fs-5"></i>
                    </Button>
                    <Button variant="light" size="sm" className="text-danger" onClick={() => handleDelete(c.id)}>
                      <i className="bi bi-trash fs-5"></i>
                    </Button>
                  </td>
                </tr>
              ))}
              {comisionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-5">
                    {busqueda ? 'No se encontraron comisiones que coincidan con tu búsqueda.' : 'No hay comisiones abiertas aún.'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* --- MODAL DE COMISIÓN --- */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold text-dark">{editId ? 'Modificar Comisión' : 'Apertura de Nueva Comisión'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label className="fw-medium">Curso Base <span className="text-danger">*</span></Form.Label>
                  <Form.Select value={cursoId} onChange={(e) => setCursoId(e.target.value)} required>
                    <option value="">Seleccione el curso...</option>
                    {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6 mb-3">
                <Form.Group>
                  <Form.Label className="fw-medium">Nombre / Identificador <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" placeholder="Ej: Comisión A - Tarde" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </Form.Group>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12 mb-3">
                <Form.Group>
                  <Form.Label className="fw-medium">Docente Titular <span className="text-danger">*</span></Form.Label>
                  <Form.Select value={docenteId} onChange={(e) => setDocenteId(e.target.value)} required>
                    <option value="">Seleccione un profesor...</option>
                    {docentes.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name} ({d.username})</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
            <div className="row">
              <div className="col-md-4 mb-3">
                <Form.Group>
                  <Form.Label className="fw-medium">Año Lectivo <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="number" value={anio} onChange={(e) => setAnio(e.target.value)} required />
                </Form.Group>
              </div>
              <div className="col-md-8 mb-3">
                <Form.Group>
                  <Form.Label className="fw-medium">Periodo <span className="text-danger">*</span></Form.Label>
                  <Form.Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} required>
                    <option value="ANUAL">Anual (Todo el año)</option>
                    <option value="1C">1er Cuatrimestre</option>
                    <option value="2C">2do Cuatrimestre</option>
                    <option value="VERANO">Intensivo Verano</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
            <Form.Group className="mt-2">
              <Form.Check type="switch" label={activo ? "Comisión Activa" : "Comisión Cerrada"} checked={activo} onChange={(e) => setActivo(e.target.checked)} className={`fw-medium ${activo ? 'text-success' : 'text-muted'}`}/>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }}>Guardar Comisión</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* --- MODAL DE HORARIOS --- */}
      <Modal show={showHorarioModal} onHide={() => setShowHorarioModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-bold text-dark">
            <i className="bi bi-calendar-week me-2"></i> 
            Agenda: {comisionActual?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          
          <h6 className="fw-bold mb-3">Horarios Asignados:</h6>
          {horariosComision.length === 0 ? (
            <div className="text-muted small mb-4 p-3 bg-light rounded text-center">
              Esta comisión aún no tiene días de cursada.
            </div>
          ) : (
            <ListGroup className="mb-4">
              {horariosComision.map(h => (
                <ListGroup.Item key={h.id} className="d-flex justify-content-between align-items-center">
                  <div>
                    <Badge bg="primary" className="me-2">{h.dia_nombre || h.dia}</Badge> 
                    <span className="fw-medium">{h.hora_inicio.slice(0,5)} a {h.hora_fin.slice(0,5)}</span> hs.
                  </div>
                  <Button variant="outline-danger" size="sm" onClick={() => handleEliminarHorario(h.id)}>
                    <i className="bi bi-x-lg"></i>
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          <hr/>

          <h6 className="fw-bold mb-3 text-success">Agregar nuevo día:</h6>
          <Form onSubmit={handleAgregarHorario}>
            <div className="row">
              <div className="col-12 mb-3">
                <Form.Select value={dia} onChange={(e) => setDia(e.target.value)} required>
                  <option value="LUN">Lunes</option>
                  <option value="MAR">Martes</option>
                  <option value="MIE">Miércoles</option>
                  <option value="JUE">Jueves</option>
                  <option value="VIE">Viernes</option>
                  <option value="SAB">Sábado</option>
                </Form.Select>
              </div>
              <div className="col-6 mb-3">
                <Form.Label className="small text-muted">Hora Inicio</Form.Label>
                <Form.Control type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
              </div>
              <div className="col-6 mb-3">
                <Form.Label className="small text-muted">Hora Fin</Form.Label>
                <Form.Control type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} required />
              </div>
            </div>
            <Button variant="success" type="submit" className="w-100 fw-bold">
              <i className="bi bi-plus-circle me-2"></i> Añadir a la agenda
            </Button>
          </Form>

        </Modal.Body>
      </Modal>

    </div>
  );
};

export default GestionComisiones;