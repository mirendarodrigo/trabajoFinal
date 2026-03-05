import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Badge, Accordion } from 'react-bootstrap';
import api from '../../api/axios';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';

const MisNotas = () => {
  const [loading, setLoading] = useState(true);
  const [notasPorCurso, setNotasPorCurso] = useState({});

  useEffect(() => {
    const fetchNotasGlobales = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const decoded = jwtDecode(token);
        const alumnoId = parseInt(decoded.user_id);

        // OPTIMIZACIÓN EXTREMA: Pedimos solo las inscripciones de este alumno.
        // Las notas y evaluaciones ya vienen filtradas por seguridad desde el backend.
        const [resInscripciones, resNotas, resEvaluaciones, resComisiones] = await Promise.all([
          api.get(`inscripciones/?alumno=${alumnoId}`).catch(() => ({ data: [] })),
          api.get('notas/').catch(() => ({ data: [] })),
          api.get('evaluaciones/').catch(() => ({ data: [] })),
          api.get('comisiones/').catch(() => ({ data: [] })) 
        ]);

        const misInscripciones = resInscripciones.data.results || resInscripciones.data || [];
        const misNotas = resNotas.data.results || resNotas.data || [];
        const todasLasEvals = resEvaluaciones.data.results || resEvaluaciones.data || [];
        const todasLasComisiones = resComisiones.data.results || resComisiones.data || [];

        // Agrupamos las notas por Curso/Comisión
        const diccionarioCursos = {};

        misInscripciones.forEach(insc => {
          // Cruzamos la ID de la inscripción con la lista de comisiones para sacar el nombre
          const comId = typeof insc.comision === 'object' ? insc.comision?.id : insc.comision;
          const comisionDetalle = todasLasComisiones.find(c => c.id === comId);
          const nombreCurso = comisionDetalle?.nombre || `Comisión #${comId}`;
          
          let misCalificaciones = misNotas.filter(nota => 
            (nota.inscripcion?.id === insc.id) || (nota.inscripcion === insc.id)
          );

          misCalificaciones = misCalificaciones.map(nota => {
            const evalId = typeof nota.evaluacion === 'object' ? nota.evaluacion?.id : nota.evaluacion;
            const evalDetalle = todasLasEvals.find(e => e.id === evalId);
            return { ...nota, evaluacion_detalle: evalDetalle };
          });

          // Ordenamos las notas por fecha (las más recientes primero)
          misCalificaciones.sort((a, b) => {
             const dateA = a.evaluacion_detalle?.fecha ? new Date(a.evaluacion_detalle.fecha).getTime() : 0;
             const dateB = b.evaluacion_detalle?.fecha ? new Date(b.evaluacion_detalle.fecha).getTime() : 0;
             return dateB - dateA;
          });

          diccionarioCursos[nombreCurso] = misCalificaciones;
        });

        setNotasPorCurso(diccionarioCursos);

      } catch (error) {
        console.error("Error al cargar notas:", error);
        toast.error("Error al cargar tu boletín de calificaciones.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotasGlobales();
  }, []);

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" style={{ color: '#0b2265' }} /></div>;
  }

  const cursosNombres = Object.keys(notasPorCurso);

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold text-dark mb-0"><i className="bi bi-award-fill text-warning me-2"></i> Boletín Histórico</h2>
        <p className="text-muted mt-1">Aquí puedes ver todas tus calificaciones consolidadas por curso.</p>
      </div>

      {cursosNombres.length === 0 ? (
        <Card className="border-0 shadow-sm p-4 p-md-5 text-center">
          <div className="display-4 text-muted mb-3"><i className="bi bi-clipboard-x"></i></div>
          <h5 className="fw-bold text-muted">No tienes calificaciones aún</h5>
          <p className="text-muted">Cuando tus profesores suban notas, aparecerán aquí.</p>
        </Card>
      ) : (
        <Accordion defaultActiveKey="0" className="shadow-sm">
          {cursosNombres.map((curso, index) => {
            const notas = notasPorCurso[curso];
            
            // Calculamos promedio si hay notas numéricas
            let promedio = "S/N";
            if (notas.length > 0) {
              const suma = notas.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
              promedio = (suma / notas.length).toFixed(2);
            }

            return (
              <Accordion.Item eventKey={index.toString()} key={index} className="border-0 border-bottom">
                <Accordion.Header>
                  <div className="d-flex flex-column flex-sm-row justify-content-between w-100 pe-3 align-items-start align-items-sm-center">
                    <span className="fw-bold text-dark fs-5 mb-2 mb-sm-0 text-truncate" style={{maxWidth: '80%'}}>{curso}</span>
                    <Badge bg={promedio >= 6 ? "success" : (promedio !== "S/N" ? "danger" : "secondary")} className="fs-6 px-3 py-2 rounded-pill shadow-sm">
                      Promedio: {promedio}
                    </Badge>
                  </div>
                </Accordion.Header>
                <Accordion.Body className="p-0 bg-light">
                  
                  {notas.length === 0 ? (
                    <div className="text-center py-4 text-muted fst-italic">Sin notas registradas.</div>
                  ) : (
                    <>
                      {/* VISTA MOBILE: Tarjetas (Se oculta en pantallas medianas o superiores) */}
                      <div className="d-block d-md-none p-3">
                        <div className="d-flex flex-column gap-3">
                          {notas.map(nota => {
                            const notaValor = parseFloat(nota.valor);
                            const estaAprobado = notaValor >= 6;
                            
                            return (
                              <Card key={nota.id} className={`border-0 shadow-sm border-start border-4 ${estaAprobado ? 'border-success' : 'border-danger'}`}>
                                <Card.Body className="p-3">
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <h6 className="fw-bold text-dark mb-0">{nota.evaluacion_detalle?.nombre || 'Examen'}</h6>
                                    <span className={`fs-5 fw-bold ${estaAprobado ? 'text-success' : 'text-danger'}`}>
                                      {nota.valor}
                                    </span>
                                  </div>
                                  <div className="d-flex justify-content-between align-items-end mt-3">
                                    <small className="text-muted">
                                      <i className="bi bi-calendar-event me-1"></i>
                                      {nota.evaluacion_detalle?.fecha ? new Date((nota.evaluacion_detalle.fecha.includes('T') ? nota.evaluacion_detalle.fecha : nota.evaluacion_detalle.fecha + 'T12:00:00')).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'S/F'}
                                    </small>
                                    <Badge bg={estaAprobado ? "success" : "danger"} className="bg-opacity-10" text={estaAprobado ? "success" : "danger"}>
                                      {estaAprobado ? 'Aprobado' : 'A revisar'}
                                    </Badge>
                                  </div>
                                </Card.Body>
                              </Card>
                            )
                          })}
                        </div>
                      </div>

                      {/* VISTA PC: Tabla tradicional (Se oculta en celulares) */}
                      <div className="d-none d-md-block">
                        <Table responsive hover className="m-0 align-middle bg-white">
                          <thead className="bg-light">
                            <tr>
                              <th className="px-4 py-3 text-muted border-0">Evaluación</th>
                              <th className="px-4 py-3 text-muted border-0">Fecha</th>
                              <th className="px-4 py-3 text-muted text-center border-0">Calificación</th>
                              <th className="px-4 py-3 text-muted text-center border-0">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {notas.map((nota) => {
                              const notaValor = parseFloat(nota.valor);
                              const estaAprobado = notaValor >= 6;
                              
                              return (
                                <tr key={nota.id}>
                                  <td className="px-4 fw-bold text-dark">{nota.evaluacion_detalle?.nombre || 'Examen'}</td>
                                  <td className="px-4 text-muted small">
                                    {nota.evaluacion_detalle?.fecha ? new Date((nota.evaluacion_detalle.fecha.includes('T') ? nota.evaluacion_detalle.fecha : nota.evaluacion_detalle.fecha + 'T12:00:00')).toLocaleDateString('es-ES') : 'S/F'}
                                  </td>
                                  <td className="px-4 text-center">
                                    <span className="fs-5 fw-bold text-piccadilly-blue">{nota.valor}</span>
                                  </td>
                                  <td className="px-4 text-center">
                                    {estaAprobado ? (
                                      <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill">Aprobado</Badge>
                                    ) : (
                                      <Badge bg="danger" className="bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-2 rounded-pill">A revisar</Badge>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </Table>
                      </div>
                    </>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

export default MisNotas;