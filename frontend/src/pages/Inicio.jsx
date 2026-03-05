import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Badge, Button, Form, Modal, Collapse } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../api/axios';
import toast from 'react-hot-toast';

// Configuración del calendario
const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales,
});
const DIAS_SEMANA_NUM = { 'DOM': 0, 'LUN': 1, 'MAR': 2, 'MIE': 3, 'JUE': 4, 'VIE': 5, 'SAB': 6 };

const Inicio = () => {
  const [rol, setRol] = useState(null);
  const [nombre, setNombre] = useState('');
  const [userId, setUserId] = useState(null);
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Detección inteligente de dispositivo para vista del calendario
  const esCelular = window.innerWidth < 768;
  const [vistaCalendario, setVistaCalendario] = useState(esCelular ? 'day' : 'month');
  
  const [fechaCalendario, setFechaCalendario] = useState(new Date());
  const [misComisionesActivas, setMisComisionesActivas] = useState([]);
  
  const navigate = useNavigate();

  // Estados: Comunicados
  const [comunicadosInstitucionales, setComunicadosInstitucionales] = useState([]);
  const [expandirComunicados, setExpandirComunicados] = useState(false); 
  
  // Estados: Modal de Respuestas
  const [showRespuestasModal, setShowRespuestasModal] = useState(false);
  const [comunicadoActivo, setComunicadoActivo] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [guardandoComentario, setGuardandoComentario] = useState(false);

  const [metricas, setMetricas] = useState({ alumnosTotales: 0, comisionesTotales: 0, misCursos: 0, misEvaluaciones: 0, promedio: 'S/N' });

  const cargarDashboard = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const decoded = jwtDecode(token);
      const currentRol = decoded.rol;
      const currentUserId = parseInt(decoded.user_id);

      setRol(currentRol);
      setNombre(decoded.first_name || decoded.username || 'Usuario');
      setUserId(currentUserId);

      let promesasBase = [];

      if (currentRol === 'ADMIN') {
        promesasBase = [
          api.get('comisiones/').catch(() => ({ data: [] })),
          Promise.resolve({ data: [] }), 
          api.get('evaluaciones/').catch(() => ({ data: [] })),
          api.get('inscripciones/?limit=1').catch(() => ({ data: [] })), 
          Promise.resolve({ data: [] })  
        ];
      } else if (currentRol === 'ALUMNO') {
        promesasBase = [
          api.get('comisiones/').catch(() => ({ data: [] })),
          api.get('anuncios/').catch(() => ({ data: [] })), 
          api.get('evaluaciones/').catch(() => ({ data: [] })),
          api.get(`inscripciones/?alumno=${currentUserId}`).catch(() => ({ data: [] })),
          api.get('notas/').catch(() => ({ data: [] }))
        ];
      } else {
        promesasBase = [
          api.get('comisiones/').catch(() => ({ data: [] })),
          api.get('anuncios/').catch(() => ({ data: [] })), 
          api.get('evaluaciones/').catch(() => ({ data: [] })),
          Promise.resolve({ data: [] }), 
          Promise.resolve({ data: [] })  
        ];
      }

      const [resComisiones, resAnuncios, resEvaluaciones, resInscripciones, resNotas] = await Promise.all(promesasBase);

      const comisiones = resComisiones.data.results || resComisiones.data || [];
      const anuncios = resAnuncios.data.results || resAnuncios.data || [];
      const evaluaciones = resEvaluaciones.data.results || resEvaluaciones.data || [];
      const inscripciones = resInscripciones.data.results || resInscripciones.data || [];
      const notas = resNotas.data.results || resNotas.data || [];

      if (currentRol === 'DOCENTE') {
        const comunicados = anuncios.filter(a => a.comision === null);
        setComunicadosInstitucionales(comunicados);
      }

      let misComisiones = [];
      if (currentRol === 'ALUMNO') {
        const misComisionesIds = inscripciones.map(i => i.comision?.id || i.comision);
        misComisiones = comisiones.filter(c => misComisionesIds.includes(c.id));
      } else if (currentRol === 'DOCENTE') {
        misComisiones = comisiones.filter(c => (c.docente?.id || c.docente) === currentUserId);
      } else {
        misComisiones = comisiones; 
      }
      
      setMisComisionesActivas(misComisiones); 

      const misEvaluaciones = evaluaciones;

      let promedioCalculado = 'S/N';
      if (currentRol === 'ALUMNO') {
        const misInscripcionesIds = inscripciones.map(i => i.id);
        const misNotas = notas.filter(n => misInscripcionesIds.includes(n.inscripcion?.id || n.inscripcion));
        if (misNotas.length > 0) {
          const suma = misNotas.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
          promedioCalculado = (suma / misNotas.length).toFixed(2); 
        }
      }

      let totalInscripciones = inscripciones.length;
      if (currentRol === 'ADMIN' && resInscripciones.data && resInscripciones.data.count !== undefined) {
          totalInscripciones = resInscripciones.data.count;
      }

      setMetricas({ 
        alumnosTotales: totalInscripciones, 
        comisionesTotales: comisiones.length, 
        misCursos: misComisiones.length, 
        misEvaluaciones: misEvaluaciones.length, 
        promedio: promedioCalculado 
      });

      const eventosTipoEvaluacion = misEvaluaciones.map(ev => {
        const fechaLimpia = ev.fecha.split('T')[0]; 
        const [year, month, day] = fechaLimpia.split('-');
        const fechaInicio = new Date(year, month - 1, day, 12, 0); 
        
        return { 
          title: `${ev.es_entrega ? 'Entrega' : 'Examen'}: ${ev.nombre}`, 
          start: fechaInicio, 
          end: new Date(fechaInicio.getTime() + (2 * 60 * 60 * 1000)), 
          tipo: ev.es_entrega ? 'entrega' : 'examen',
          comisionId: ev.comision?.id || ev.comision 
        };
      });

      const eventosTipoClase = [];
      const hoy = new Date();
      const año = hoy.getFullYear();
      const mesActual = hoy.getMonth();

      misComisiones.forEach(comision => {
        if (comision.horarios && comision.horarios.length > 0) {
          comision.horarios.forEach(h => {
            for (let m = mesActual - 1; m <= mesActual + 2; m++) {
              const diasDelMes = new Date(año, m + 1, 0).getDate();
              for (let dia = 1; dia <= diasDelMes; dia++) {
                const fechaIterada = new Date(año, m, dia);
                if (fechaIterada.getDay() === DIAS_SEMANA_NUM[h.dia]) {
                  const [hIni, mIni] = h.hora_inicio.split(':');
                  const [hFin, mFin] = h.hora_fin.split(':');
                  eventosTipoClase.push({ 
                    title: ` Clase: ${comision.nombre}`, 
                    start: new Date(año, m, dia, parseInt(hIni), parseInt(mIni)), 
                    end: new Date(año, m, dia, parseInt(hFin), parseInt(mFin)), 
                    tipo: 'clase',
                    comisionId: comision.id 
                  });
                }
              }
            }
          });
        }
      });

      setEventosCalendario([...eventosTipoEvaluacion, ...eventosTipoClase]);

    } catch (error) { toast.error("Hubo un problema al cargar tu agenda."); } finally { setLoading(false); }
  };

  useEffect(() => { cargarDashboard(); }, []);

  const handleAbrirAcordeon = () => {
    const nuevoEstado = !expandirComunicados;
    setExpandirComunicados(nuevoEstado);

    if (nuevoEstado) {
      comunicadosInstitucionales.forEach(async (anuncio) => {
        const noVisto = Array.isArray(anuncio.visto_por) ? !anuncio.visto_por.includes(userId) : true;
        if (noVisto) {
          try {
            await api.post(`anuncios/${anuncio.id}/marcar_visto/`);
            setComunicadosInstitucionales(prev => prev.map(a => a.id === anuncio.id ? { ...a, visto_por: [...(a.visto_por || []), userId] } : a));
          } catch (error) { console.error(error); }
        }
      });
    }
  };

  const handleAbrirRespuestas = async (anuncio) => {
    setComunicadoActivo(anuncio);
    setNuevoComentario('');
    setShowRespuestasModal(true);
    
    const autorId = anuncio.autor?.id || anuncio.autor;
    if (anuncio.hay_comentarios_nuevos && autorId !== userId) {
      try {
        await api.post(`anuncios/${anuncio.id}/apagar_alarma_comentarios/`);
        setComunicadosInstitucionales(prev => prev.map(a => a.id === anuncio.id ? { ...a, hay_comentarios_nuevos: false } : a));
      } catch (error) { console.error("No se pudo apagar la notificación", error); }
    }
  };

  const handleEnviarComentario = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim() || !comunicadoActivo) return;
    setGuardandoComentario(true);
    try {
      await api.post('comentarios/', { anuncio: comunicadoActivo.id, contenido: nuevoComentario });
      setNuevoComentario('');
      const resAnuncios = await api.get('anuncios/');
      const anuncios = resAnuncios.data.results || resAnuncios.data;
      const comunicados = anuncios.filter(a => a.comision === null);
      setComunicadosInstitucionales(comunicados);
      const comunicadoActualizado = comunicados.find(a => a.id === comunicadoActivo.id);
      if (comunicadoActualizado) setComunicadoActivo(comunicadoActualizado);
    } catch (error) { toast.error("Error al enviar la respuesta."); } finally { setGuardandoComentario(false); }
  };

  const handleSeleccionarEvento = (evento) => {
    if (evento.comisionId) {
      navigate(`/dashboard/curso/${evento.comisionId}`);
    }
  };

  const PanelAdmin = () => {
    const fechaHoy = new Date();
    const dia = fechaHoy.getDate();
    const mes = fechaHoy.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
    const textoFecha = `${dia} ${mes}`;

    return (
      <Row className="g-3 g-md-4 mb-4">
        <Col xs={12} sm={6} lg={4}>
          <Card className="border-0 shadow-sm h-100 p-3 p-md-4" style={{ borderLeft: '5px solid #0b2265' }}>
            <div className="d-flex align-items-center h-100">
              <div className="display-4 text-piccadilly-blue me-3">
                <i className="bi bi-people"></i>
              </div>
              <div>
                <h4 className="fw-bold mb-1 text-dark fs-2">{metricas.alumnosTotales}</h4>
                <p className="text-muted fw-medium mb-0 text-uppercase" style={{ fontSize: '0.8rem' }}>Inscripciones</p>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4}>
          <Card className="border-0 shadow-sm h-100 p-3 p-md-4" style={{ borderLeft: '5px solid #dc3545' }}>
            <div className="d-flex align-items-center h-100">
              <div className="display-4 text-danger me-3">
                <i className="bi bi-journal-bookmark"></i>
              </div>
              <div>
                <h4 className="fw-bold mb-1 text-dark fs-2">{metricas.comisionesTotales}</h4>
                <p className="text-muted fw-medium mb-0 text-uppercase" style={{ fontSize: '0.8rem' }}>Comisiones</p>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} lg={4}>
          <Card className="border-0 shadow-sm h-100 p-3 p-md-4" style={{ borderLeft: '5px solid #198754' }}>
            <div className="d-flex align-items-center h-100">
              <div className="display-4 text-success me-3">
                <i className="bi bi-calendar2-day"></i>
              </div>
              <div>
                <h4 className="fw-bold mb-1 text-dark fs-3">{textoFecha}</h4>
                <p className="text-muted fw-medium mb-0 text-uppercase" style={{ fontSize: '0.8rem' }}>Agenda Global</p>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    );
  };

  const PanelDocente = () => {
    const hayNotificacionesGlobales = comunicadosInstitucionales.some(a => {
      const noVisto = Array.isArray(a.visto_por) ? !a.visto_por.includes(userId) : true;
      const autorId = a.autor?.id || a.autor;
      const respuestasNuevas = a.hay_comentarios_nuevos && autorId !== userId;
      return noVisto || respuestasNuevas;
    });

    return (
      <>
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '5px solid #0b2265' }}>
              <Card.Body className="d-flex align-items-center p-4">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3"><i className="bi bi-easel-fill fs-3" style={{ color: '#0b2265' }}></i></div>
                <div><h6 className="text-muted mb-1 fw-bold text-uppercase" style={{ fontSize: '0.8rem' }}>Aulas a Cargo</h6><h3 className="mb-0 fw-bold text-dark">{metricas.misCursos}</h3></div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '5px solid #dc3545' }}>
              <Card.Body className="d-flex align-items-center p-4">
                <div className="rounded-circle bg-danger bg-opacity-10 p-3 me-3"><i className="bi bi-journal-text fs-3 text-danger"></i></div>
                <div><h6 className="text-muted mb-1 fw-bold text-uppercase" style={{ fontSize: '0.8rem' }}>Evaluaciones</h6><h3 className="mb-0 fw-bold text-dark">{metricas.misEvaluaciones}</h3></div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {comunicadosInstitucionales.length > 0 && (
          <div className="mb-4">
            <div 
              className="d-flex align-items-center justify-content-between p-3 bg-white rounded shadow-sm border-start border-4 border-danger user-select-none mb-1"
              style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
              onClick={handleAbrirAcordeon}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div className="d-flex align-items-center">
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                  <i className="bi bi-broadcast text-danger me-2"></i> Comunicados de Administración
                </h5>
                {hayNotificacionesGlobales && !expandirComunicados && (
                  <Badge bg="danger" pill className="ms-3 shadow-sm px-2 py-1">¡Nuevos Avisos!</Badge>
                )}
              </div>
              <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                <i className={`bi bi-chevron-${expandirComunicados ? 'up' : 'down'} text-muted`}></i>
              </div>
            </div>

            <Collapse in={expandirComunicados}>
              <div> 
                <div className="d-flex flex-column gap-3 pt-2">
                  {comunicadosInstitucionales.map(anuncio => {
                    const esGlobal = anuncio.tipo_audiencia === 'TODOS_DOCENTES';
                    const autorId = anuncio.autor?.id || anuncio.autor;
                    const tieneRespuestasNuevas = anuncio.hay_comentarios_nuevos && autorId !== userId;
                    
                    return (
                      <Card key={anuncio.id} className="border-0 shadow-sm border-start border-4 border-danger ms-md-4" style={{ borderLeftColor: '#dc3545 !important' }}>
                        <Card.Body className="p-4">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <div className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center text-danger fw-bold" style={{ width: '40px', height: '40px' }}><i className="bi bi-building"></i></div>
                              <div>
                                <h6 className="mb-0 fw-bold">Dirección / Administración</h6>
                                <small className="text-muted">
                                  {new Date(anuncio.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
                                  <Badge bg={esGlobal ? "primary" : "info"} className="ms-2 fw-normal" text={esGlobal ? "" : "dark"}>{esGlobal ? "Global" : "Privado"}</Badge>
                                </small>
                              </div>
                            </div>
                          </div>
                          
                          <h5 className="fw-bold mt-3 mb-2">{anuncio.titulo}</h5>
                          <p className="text-dark mb-3" style={{ whiteSpace: 'pre-wrap' }}>{anuncio.contenido}</p>
                          
                          <div className="d-flex align-items-center pt-3 border-top border-light">
                            {anuncio.permite_comentarios ? (
                              <Button variant="outline-primary" size="sm" className="fw-medium position-relative rounded-pill px-3" onClick={() => handleAbrirRespuestas(anuncio)}>
                                <i className="bi bi-chat-text me-2"></i>
                                {anuncio.comentarios?.length > 0 ? `Abrir ${anuncio.comentarios.length} respuesta(s)` : 'Responder'}
                                {tieneRespuestasNuevas && (
                                  <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                                    <span className="visually-hidden">Nuevas respuestas</span>
                                  </span>
                                )}
                              </Button>
                            ) : (
                              <Badge bg="secondary" className="bg-opacity-10 text-muted border px-2 py-1"><i className="bi bi-lock-fill me-1"></i> Respuestas desactivadas</Badge>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </Collapse>
          </div>
        )}
      </>
    );
  };
  
  const PanelAlumno = () => (
    <Row className="g-4 mb-4">
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100 p-4 border-start border-success border-4"><div className="d-flex align-items-center"><div className="display-4 text-success me-3"><i className="bi bi-check-circle"></i></div><div><h4 className="fw-bold mb-1">Estado Regular</h4><p className="text-muted mb-0">Inscrito en {metricas.misCursos} curso(s).</p></div></div></Card>
      </Col>
      <Col xs={12} md={6}>
        <Card className="border-0 shadow-sm h-100 p-4 border-start border-info border-4"><div className="d-flex align-items-center"><div className="display-4 text-info me-3"><i className="bi bi-mortarboard"></i></div><div><h4 className="fw-bold mb-1">Promedio: {metricas.promedio}</h4><p className="text-muted mb-0">{metricas.promedio === 'S/N' ? 'Aún no tienes notas cargadas.' : 'Este es tu desempeño histórico.'}</p></div></div></Card>
      </Col>
    </Row>
  );

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}><Spinner animation="border" style={{ color: '#0b2265' }} /><span className="ms-3 text-muted">Sincronizando agenda...</span></div>;

  // 🚨 CAMBIO: Definimos las horas de inicio y fin para el calendario
  const minTime = new Date();
  minTime.setHours(7, 0, 0); // El calendario empieza a las 7:00 AM

  const maxTime = new Date();
  maxTime.setHours(23, 0, 0); // El calendario termina a las 23:00 PM

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold text-dark">¡Hola, {nombre}! <i className="bi bi-hand-wave text-warning ms-1"></i></h2>
        <p className="text-muted">{rol === 'ADMIN' && 'Este es el estado general del instituto.'}{rol === 'DOCENTE' && 'Aquí tienes tu centro de operaciones y accesos rápidos.'}{rol === 'ALUMNO' && 'Aquí tienes un resumen de tu cursada.'}</p>
      </div>

      {rol === 'ADMIN' && <PanelAdmin />}
      {rol === 'DOCENTE' && <PanelDocente />}
      {rol === 'ALUMNO' && <PanelAlumno />}

      <Card className="border-0 shadow-sm mt-4 mb-5">
        <Card.Body className="p-3 p-md-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold mb-0" style={{ color: '#0b2265' }}>
              <i className="bi bi-calendar-week me-2"></i>
              {rol === 'ADMIN' ? 'Agenda Global Piccadilly' : 'Mi Agenda y Clases'}
            </h4>
            {rol !== 'ADMIN' && <small className="text-muted d-none d-sm-block"><i className="bi bi-info-circle me-1"></i>Haz clic en un evento para ir al aula virtual</small>}
          </div>
          
          <div className="overflow-x-auto">
            <div style={{ height: '650px', minWidth: '500px' }}>
              <Calendar
                localizer={localizer} 
                events={eventosCalendario} 
                startAccessor="start" 
                endAccessor="end" 
                culture="es" 
                view={vistaCalendario} 
                onView={setVistaCalendario} 
                date={fechaCalendario} 
                onNavigate={setFechaCalendario}
                // 🚨 CAMBIO: Le pasamos el min y el max al componente
                min={minTime}
                max={maxTime}
                messages={{ next: "Sig", previous: "Ant", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda" }}
                onSelectEvent={handleSeleccionarEvento} 
                eventPropGetter={(event) => {
                  let bgColor = '#0b2265';
                  let cursorStyle = event.comisionId ? 'pointer' : 'default'; 
                  
                  if (event.tipo === 'examen') bgColor = '#dc3545';
                  if (event.tipo === 'entrega') bgColor = '#fd7e14';
                  
                  return { 
                    style: { 
                      backgroundColor: bgColor, 
                      color: 'white', 
                      borderRadius: '4px', 
                      border: 'none', 
                      fontWeight: 'bold', 
                      fontSize: '0.85rem', 
                      padding: '2px 5px',
                      cursor: cursorStyle, 
                      transition: 'opacity 0.2s',
                    } 
                  };
                }}
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showRespuestasModal} onHide={() => setShowRespuestasModal(false)} centered size="md">
        <Modal.Header closeButton className="bg-white border-bottom"><Modal.Title className="fw-bold text-dark fs-5"><i className="bi bi-chat-left-text-fill me-2 text-primary"></i> Respuestas al Comunicado</Modal.Title></Modal.Header>
        <Modal.Body className="bg-light p-0 d-flex flex-column" style={{ maxHeight: '60vh' }}>
          <div className="p-3 bg-white border-bottom shadow-sm z-1"><Badge bg="secondary" className="mb-2">Asunto</Badge><h6 className="fw-bold mb-1">{comunicadoActivo?.titulo}</h6><p className="small text-muted mb-0" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{comunicadoActivo?.contenido}</p></div>
          <div className="p-3 flex-grow-1 overflow-y-auto">
            {comunicadoActivo?.comentarios?.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {comunicadoActivo.comentarios.map(com => {
                  const esMio = com.autor === userId;
                  const esAdmin = com.autor_nombre === 'Administración' || com.autor_username === 'admin' || com.autor === comunicadoActivo.autor;
                  return (
                    <div key={com.id} className={`d-flex gap-2 ${esMio ? 'flex-row-reverse' : ''}`}>
                      <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white shadow-sm ${esMio ? 'bg-primary' : (esAdmin ? 'bg-danger' : 'bg-secondary')}`} style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}><i className={`bi ${esMio ? 'bi-person-fill' : (esAdmin ? 'bi-building' : 'bi-person')}`}></i></div>
                      <div className={`p-2 rounded shadow-sm border ${esMio ? 'bg-primary bg-opacity-10 border-primary border-opacity-25' : (esAdmin ? 'bg-danger bg-opacity-10 border-danger border-opacity-25' : 'bg-white')}`} style={{ maxWidth: '85%' }}>
                        <div className="d-flex justify-content-between align-items-center mb-1 gap-3"><span className={`fw-bold small ${esMio ? 'text-primary' : (esAdmin ? 'text-danger' : 'text-dark')}`}>{esMio ? 'Tú' : (esAdmin ? 'Administración' : (com.autor_nombre || com.autor_username))}</span><span className="text-muted" style={{ fontSize: '0.65rem' }}>{new Date(com.fecha_creacion).toLocaleDateString('es-ES', { hour: '2-digit', minute:'2-digit' })}</span></div>
                        <p className="mb-0 text-dark" style={{fontSize: '0.85rem'}}>{com.contenido}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (<div className="text-center py-4"><i className="bi bi-chat-dots text-muted fs-1 mb-2 d-block opacity-50"></i><p className="text-muted small mb-0">Nadie ha respondido a este comunicado aún.</p></div>)}
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-white p-3 border-top">
           <Form onSubmit={handleEnviarComentario} className="d-flex w-100 gap-2 m-0">
              <Form.Control size="sm" type="text" placeholder="Escribe tu respuesta..." value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} className="shadow-sm rounded-pill px-3" />
              <Button type="submit" size="sm" variant="primary" className="rounded-circle shadow-sm" style={{ width: '32px', height: '32px', padding: 0 }} disabled={!nuevoComentario.trim() || guardandoComentario}><i className="bi bi-send-fill"></i></Button>
           </Form>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Inicio;