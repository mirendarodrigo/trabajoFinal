import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Table, Button, Form, Spinner, Alert, Breadcrumb, Card, Row, Col, Badge } from 'react-bootstrap';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const Calificar = () => {
  const { id } = useParams(); 
  const [inscripciones, setInscripciones] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        // OPTIMIZACIÓN: Solo pedimos los datos de ESTA comisión
        const [resInsc, resEval] = await Promise.all([
          api.get(`inscripciones/?comision=${id}`),
          api.get(`evaluaciones/?comision=${id}`)
        ]);

        setInscripciones(resInsc.data.results || resInsc.data);
        setEvaluaciones(resEval.data.results || resEval.data);

      } catch (err) {
        console.error("Error al cargar los datos:", err);
        toast.error("Hubo un problema al cargar la información.");
      } finally {
        setLoading(false);
      }
    };

    fetchDatos();
  }, [id]);

  const handleNotaChange = (inscripcionId, nuevaNota) => {
    setInscripciones(inscripciones.map(insc => 
      insc.id === inscripcionId ? { ...insc, nota_temporal: nuevaNota } : insc
    ));
  };

  const guardarNotas = async () => {
    if (!evaluacionSeleccionada) {
      toast.error("⚠️ Selecciona una evaluación arriba antes de guardar.");
      return;
    }

    // Filtramos solo los alumnos a los que se les escribió una nota
    const notasAEnviar = inscripciones.filter(insc => insc.nota_temporal && insc.nota_temporal.trim() !== '');

    if (notasAEnviar.length === 0) {
      toast.error("No ingresaste ninguna nota nueva para guardar.");
      return;
    }

    setGuardando(true);

    // OPTIMIZACIÓN: Preparamos todas las peticiones para enviarlas al mismo tiempo (En paralelo)
    const promesas = notasAEnviar.map(insc => {
      return api.post('notas/', {
        inscripcion: insc.id,
        evaluacion: evaluacionSeleccionada,
        valor: parseFloat(insc.nota_temporal)
      });
    });

    try {
      // Promise.allSettled ejecuta todas a la vez y nos dice cuáles fallaron y cuáles no
      const resultados = await Promise.allSettled(promesas);
      
      const exitosas = resultados.filter(r => r.status === 'fulfilled').length;
      const fallidas = resultados.filter(r => r.status === 'rejected').length;

      if (exitosas > 0 && fallidas === 0) {
        toast.success(`¡Se guardaron ${exitosas} calificaciones con éxito!`);
        setInscripciones(inscripciones.map(i => ({ ...i, nota_temporal: '' }))); // Limpiamos inputs
      } else if (exitosas > 0 && fallidas > 0) {
        toast.error(`Se guardaron ${exitosas} notas, pero fallaron ${fallidas}. (Posible duplicado)`);
      } else {
        toast.error("No se pudo guardar ninguna nota. Verifica que no estén duplicadas.");
      }
    } catch (error) {
      toast.error("Ocurrió un error crítico al guardar las notas.");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" style={{ color: '#0b2265' }} />
        <span className="ms-3 text-muted">Preparando libro de actas...</span>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/dashboard/aulas" }}>Mis Aulas</Breadcrumb.Item>
        <Breadcrumb.Item active>Cargar Notas</Breadcrumb.Item>
      </Breadcrumb>

      {/* CABECERA RESPONSIVE */}
      <Row className="align-items-center mb-4 g-3">
        <Col xs={12} md={5} lg={4}>
          <h2 className="fw-bold text-dark mb-1 d-flex align-items-center fs-3">
            <i className="bi bi-pencil-square me-2 text-danger"></i> Calificaciones
          </h2>
          <p className="text-muted mb-0">Comisión #{id}</p>
        </Col>
        
        <Col xs={12} md={7} lg={8}>
          <div className="d-flex flex-column flex-sm-row gap-2 justify-content-md-end">
            <Form.Select 
              value={evaluacionSeleccionada} 
              onChange={(e) => setEvaluacionSeleccionada(e.target.value)}
              className="border-primary shadow-sm w-100"
              style={{ maxWidth: '350px' }}
            >
              <option value="">-- Seleccionar Evaluación --</option>
              {evaluaciones.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.nombre} ({new Date(ev.fecha.includes('T') ? ev.fecha : ev.fecha + 'T12:00:00').toLocaleDateString('es-ES')})
                </option>
              ))}
            </Form.Select>

            <Button 
              variant="danger" 
              className="fw-bold px-4 shadow-sm text-nowrap"
              onClick={guardarNotas}
              disabled={guardando || inscripciones.length === 0 || evaluaciones.length === 0}
            >
              {guardando ? <><Spinner animation="border" size="sm" className="me-2"/> Guardando...</> : <><i className="bi bi-floppy-fill me-2"></i> Guardar Notas</>}
            </Button>
          </div>
        </Col>
      </Row>

      {evaluaciones.length === 0 && (
        <Alert variant="warning" className="border-start border-warning border-4 shadow-sm mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>Aviso:</strong> Esta comisión aún no tiene evaluaciones (exámenes o trabajos) creadas. El administrador debe crear una para que puedas cargar notas.
        </Alert>
      )}

      {/* TABLA RESPONSIVE */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="m-0 align-middle bg-white">
            <thead className="table-light text-nowrap">
              <tr>
                <th className="px-3 px-md-4 py-3 border-0">Alumno</th>
                <th className="px-3 px-md-4 py-3 text-center border-0 d-none d-sm-table-cell">Estado</th>
                <th className="px-3 px-md-4 py-3 text-end border-0" style={{ minWidth: '140px' }}>Calificación</th>
              </tr>
            </thead>
            <tbody>
              {inscripciones.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-5 text-muted">
                    <i className="bi bi-person-x fs-1 d-block mb-3 opacity-50"></i>
                    No hay alumnos inscritos en esta comisión aún.
                  </td>
                </tr>
              ) : (
                inscripciones.map((inscripcion) => (
                  <tr key={inscripcion.id}>
                    <td className="px-3 px-md-4 py-3">
                      <div className="d-flex align-items-center">
                        <div className="bg-light rounded-circle d-none d-md-flex align-items-center justify-content-center text-primary fw-bold me-3" style={{ width: '40px', height: '40px' }}>
                          {inscripcion.alumno_detalle?.first_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="fw-bold text-dark">{inscripcion.alumno_detalle?.last_name}, {inscripcion.alumno_detalle?.first_name}</div>
                          <div className="text-muted small">DNI: {inscripcion.alumno_detalle?.dni || inscripcion.alumno_detalle?.username}</div>
                          {/* Estado visible solo en mobile bajo el nombre */}
                          <div className="d-sm-none mt-1">
                            <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1">{inscripcion.estado_alumno || 'Regular'}</Badge>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 px-md-4 py-3 text-center d-none d-sm-table-cell">
                      <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill text-uppercase">
                        {inscripcion.estado_alumno || 'Regular'}
                      </Badge>
                    </td>
                    <td className="px-3 px-md-4 py-3 text-end">
                      <Form.Control 
                        type="number" 
                        min="1" max="10" step="0.01"
                        placeholder="Nota"
                        className="text-center fw-bold shadow-sm d-inline-block"
                        style={{ width: '90px' }}
                        value={inscripcion.nota_temporal !== undefined ? inscripcion.nota_temporal : ''}
                        onChange={(e) => handleNotaChange(inscripcion.id, e.target.value)}
                        disabled={!evaluacionSeleccionada} 
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Calificar;