import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Spinner, Modal, Form } from 'react-bootstrap';
import api from '../../api/axios';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const DIAS_SEMANA_NUM = { 'DOM': 0, 'LUN': 1, 'MAR': 2, 'MIE': 3, 'JUE': 4, 'VIE': 5, 'SAB': 6 };

const EvaluacionesDocente = () => {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nuevaEval, setNuevaEval] = useState({
    nombre: '',
    fecha: '',
    es_entrega: false,
    comisionId: ''
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const decoded = jwtDecode(token);
      const docenteId = decoded.user_id;

      const [resComisiones, resEvaluaciones] = await Promise.all([
        api.get('comisiones/'),
        api.get('evaluaciones/')
      ]);

      // 1. Filtrar las comisiones de este docente
      const todasComisiones = resComisiones.data.results || resComisiones.data;
      const misComisiones = todasComisiones.filter(c => 
        (c.docente?.id || c.docente) === parseInt(docenteId)
      );
      setComisiones(misComisiones);

      // 2. Filtrar las evaluaciones que pertenecen a las comisiones de este docente
      const misComisionesIds = misComisiones.map(c => c.id);
      const todasEvals = resEvaluaciones.data.results || resEvaluaciones.data;
      const misEvals = todasEvals.filter(ev => 
        misComisionesIds.includes(ev.comision?.id || ev.comision)
      );

      // 3. Ordenar por fecha (las más próximas primero)
      misEvals.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      setEvaluaciones(misEvals);

    } catch (error) {
      console.error("Error cargando evaluaciones globales:", error);
      toast.error("Error al cargar tu cronograma de evaluaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCrearEvaluacion = async (e) => {
    e.preventDefault();

    if (!nuevaEval.comisionId) {
      toast.error("Debes seleccionar una comisión.");
      return;
    }

    // --- VALIDACIÓN DE DÍAS DE CURSADA ---
    const comisionSeleccionada = comisiones.find(c => c.id === parseInt(nuevaEval.comisionId));
    
    if (comisionSeleccionada?.horarios && comisionSeleccionada.horarios.length > 0) {
      const diasPermitidos = comisionSeleccionada.horarios.map(h => DIAS_SEMANA_NUM[h.dia]);
      const fechaSeleccionada = new Date(nuevaEval.fecha + 'T12:00:00');
      const diaSeleccionado = fechaSeleccionada.getDay();

      if (!diasPermitidos.includes(diaSeleccionado)) {
        const diasNombres = comisionSeleccionada.horarios.map(h => h.dia_nombre || h.dia).join(' o ');
        toast.error(`⚠️ Fecha inválida. ${comisionSeleccionada.nombre} solo cursa los días: ${diasNombres}.`);
        return; 
      }
    }

    setGuardando(true);
    
    try {
      const payload = {
        nombre: nuevaEval.nombre,
        fecha: nuevaEval.fecha,
        es_entrega: nuevaEval.es_entrega,
        comision: parseInt(nuevaEval.comisionId)
      };

      await api.post('evaluaciones/', payload);
      toast.success("¡Evaluación programada con éxito!");
      
      setNuevaEval({ nombre: '', fecha: '', es_entrega: false, comisionId: '' });
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error al crear:", error);
      toast.error("No se pudo guardar la evaluación.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta evaluación?")) {
      try {
        await api.delete(`evaluaciones/${id}/`);
        toast.success("Evaluación eliminada.");
        fetchData();
      } catch (error) {
        toast.error("Error al eliminar.");
      }
    }
  };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" style={{ color: '#0b2265' }} /></div>;

  return (
    <div>
      <div className="mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div>
          <h2 className="fw-bold text-dark mb-1">
            <i className="bi bi-file-earmark-text-fill me-2 text-danger"></i> Evaluaciones y TPs
          </h2>
          <p className="text-muted mb-0">Cronograma global de todas tus comisiones.</p>
        </div>
        <Button variant="danger" className="fw-bold shadow-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-2"></i> Programar Evaluación
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="py-3">Comisión</th>
                <th className="py-3">Evaluación</th>
                <th className="py-3">Tipo</th>
                <th className="text-end px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {evaluaciones.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">No tienes evaluaciones programadas.</td>
                </tr>
              ) : (
                evaluaciones.map(ev => {
                  const nombreAula = typeof ev.comision === 'object' ? ev.comision.nombre : comisiones.find(c => c.id === ev.comision)?.nombre || `Comisión #${ev.comision}`;
                  
                  return (
                    <tr key={ev.id}>
                      <td className="px-4 fw-medium text-muted">
                        {new Date(ev.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </td>
                      <td className="fw-bold text-piccadilly-blue">{nombreAula}</td>
                      <td className="fw-bold text-dark">{ev.nombre}</td>
                      <td>
                        {ev.es_entrega ? (
                          <Badge bg="warning" text="dark"><i className="bi bi-cloud-arrow-up me-1"></i> TP</Badge>
                        ) : (
                          <Badge bg="danger"><i className="bi bi-pen me-1"></i> Examen</Badge>
                        )}
                      </td>
                      <td className="text-end px-4">
                        <Button variant="outline-danger" size="sm" onClick={() => handleEliminar(ev.id)}>
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* MODAL CREAR */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleCrearEvaluacion}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold"><i className="bi bi-journal-plus me-2 text-danger"></i>Nueva Evaluación</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">¿Para qué comisión? <span className="text-danger">*</span></Form.Label>
              <Form.Select 
                value={nuevaEval.comisionId}
                onChange={(e) => setNuevaEval({...nuevaEval, comisionId: e.target.value})}
                required
              >
                <option value="">Selecciona un aula...</option>
                {comisiones.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Título <span className="text-danger">*</span></Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Ej: Parcial 1..." 
                value={nuevaEval.nombre}
                onChange={(e) => setNuevaEval({...nuevaEval, nombre: e.target.value})}
                required 
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">Fecha <span className="text-danger">*</span></Form.Label>
              <Form.Control 
                type="date" 
                value={nuevaEval.fecha}
                onChange={(e) => setNuevaEval({...nuevaEval, fecha: e.target.value})}
                required 
              />
            </Form.Group>

            <Form.Group className="p-3 bg-light rounded border">
              <Form.Check 
                type="switch"
                id="tipo-switch"
                label={<span className="fw-medium ms-1">Es un Trabajo Práctico (Entrega)</span>}
                checked={nuevaEval.es_entrega}
                onChange={(e) => setNuevaEval({...nuevaEval, es_entrega: e.target.checked})}
              />
            </Form.Group>

          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="outline-secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="danger" type="submit" disabled={guardando}>
              {guardando ? <Spinner animation="border" size="sm" /> : 'Guardar Evaluación'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default EvaluacionesDocente;