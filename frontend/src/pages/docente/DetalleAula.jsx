import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tabs, Tab, Table, Button, Spinner, Breadcrumb, Card, Badge, Row, Col, Modal, Form, Alert, Dropdown, Collapse } from 'react-bootstrap';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const DIAS_SEMANA_NUM = { 'DOM': 0, 'LUN': 1, 'MAR': 2, 'MIE': 3, 'JUE': 4, 'VIE': 5, 'SAB': 6 };

const DetalleAula = () => {
  const { id } = useParams();
  const [comision, setComision] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Estados Evaluaciones
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [guardandoEval, setGuardandoEval] = useState(false);
  const [nuevaEval, setNuevaEval] = useState({ nombre: '', fecha: '', es_entrega: false });

  // Estados Asistencia
  const hoy = new Date().toLocaleDateString('en-CA'); 
  const [fechaAsistencia, setFechaAsistencia] = useState(hoy);
  const [asistenciasGuardadas, setAsistenciasGuardadas] = useState([]); 
  const [estadoAsistencia, setEstadoAsistencia] = useState({}); 
  const [guardandoAsistencia, setGuardandoAsistencia] = useState(false);

  // Estados Tablero de Anuncios
  const [anuncios, setAnuncios] = useState([]);
  const [showAnuncioModal, setShowAnuncioModal] = useState(false);
  const [guardandoAnuncio, setGuardandoAnuncio] = useState(false);
  const [nuevoAnuncio, setNuevoAnuncio] = useState({ 
    titulo: '', contenido: '', permite_comentarios: true, tipo_expiracion: 'permanente', fecha_expiracion_personalizada: ''
  });
  const [anuncioExpandido, setAnuncioExpandido] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [guardandoComentario, setGuardandoComentario] = useState(false);

  const fetchDatosAula = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const decoded = jwtDecode(token);
      setUserId(decoded.user_id);

      // APLICANDO LOS FILTROS DEL BACKEND DIRECTAMENTE EN LA URL
      const [resComision, resInscripciones, resEvaluaciones, resAnuncios] = await Promise.all([
        api.get(`comisiones/${id}/`),
        api.get(`inscripciones/?comision=${id}`), 
        api.get(`evaluaciones/?comision=${id}`),
        api.get(`anuncios/?comision=${id}`) 
      ]);

      setComision(resComision.data);

      const inscripcionesFiltradas = resInscripciones.data.results || resInscripciones.data;
      setInscripciones(inscripcionesFiltradas);

      const evalsFiltradas = resEvaluaciones.data.results || resEvaluaciones.data;
      evalsFiltradas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      setEvaluaciones(evalsFiltradas);

      const anunciosFiltrados = resAnuncios.data.results || resAnuncios.data;
      setAnuncios(anunciosFiltrados);

      // Traemos las asistencias y notas. Podrían filtrarse también, pero cruzarlas por ID de inscripción sigue siendo muy rápido.
      const inscripcionesIds = inscripcionesFiltradas.map(i => i.id);
      
      const [resAsistencias, resNotas] = await Promise.all([
        api.get('asistencias/'),
        api.get('notas/')
      ]);

      const todasLasAsistencias = resAsistencias.data.results || resAsistencias.data;
      const asistenciasFiltradas = todasLasAsistencias.filter(a => 
        inscripcionesIds.includes(a.inscripcion?.id || a.inscripcion)
      );
      setAsistenciasGuardadas(asistenciasFiltradas);

      const todasLasNotas = resNotas.data.results || resNotas.data;
      // Solo guardamos las notas de esta comisión
      const notasFiltradas = todasLasNotas.filter(n => inscripcionesIds.includes(n.inscripcion?.id || n.inscripcion));
      setNotas(notasFiltradas);

    } catch (error) {
      console.error("Error al cargar el aula:", error);
      toast.error("Hubo un problema al cargar los datos del aula.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatosAula();
  }, [id]);

  useEffect(() => {
    const nuevosEstados = {};
    inscripciones.forEach(insc => {
      const registroExistente = asistenciasGuardadas.find(a => 
        (a.inscripcion?.id === insc.id || a.inscripcion === insc.id) && 
        a.fecha === fechaAsistencia
      );
      nuevosEstados[insc.id] = registroExistente ? registroExistente.presente : true;
    });
    setEstadoAsistencia(nuevosEstados);
  }, [fechaAsistencia, inscripciones, asistenciasGuardadas]);

  let isFechaAsistenciaValida = true;
  let diasNombresAsistencia = '';
  if (comision?.horarios && comision.horarios.length > 0) {
    const diasPermitidos = comision.horarios.map(h => DIAS_SEMANA_NUM[h.dia]);
    const [y, m, d] = fechaAsistencia.split('-');
    const diaSeleccionado = new Date(y, m - 1, d, 12, 0).getDay();
    if (!diasPermitidos.includes(diaSeleccionado)) {
      isFechaAsistenciaValida = false;
      diasNombresAsistencia = comision.horarios.map(h => h.dia_nombre || h.dia).join(' o ');
    }
  }

  const handleGuardarAsistencia = async () => {
    setGuardandoAsistencia(true);
    try {
      const recordsToCreate = [];
      const promisesToUpdate = [];
      inscripciones.forEach(insc => {
        const registroExistente = asistenciasGuardadas.find(a => (a.inscripcion?.id === insc.id || a.inscripcion === insc.id) && a.fecha === fechaAsistencia);
        const estaPresente = estadoAsistencia[insc.id];
        if (registroExistente) {
          if (registroExistente.presente !== estaPresente) {
            promisesToUpdate.push(api.put(`asistencias/${registroExistente.id}/`, { inscripcion: insc.id, fecha: fechaAsistencia, presente: estaPresente }));
          }
        } else {
          recordsToCreate.push({ inscripcion: insc.id, fecha: fechaAsistencia, presente: estaPresente });
        }
      });
      if (recordsToCreate.length > 0) await api.post('asistencias/', recordsToCreate);
      if (promisesToUpdate.length > 0) await Promise.all(promisesToUpdate);
      toast.success("¡Asistencia guardada correctamente!");
      fetchDatosAula(); 
    } catch (error) { toast.error("Error al guardar la asistencia."); } finally { setGuardandoAsistencia(false); }
  };

  const descargarLista = async (incluirNotas = false) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Planilla');

      const ultimaColumna = incluirNotas ? 'G' : 'F';
      worksheet.mergeCells(`A1:${ultimaColumna}1`);
      const tituloCelda = worksheet.getCell('A1');
      tituloCelda.value = `Planilla de Alumnos - ${comision?.nombre || 'Comisión'}`;
      tituloCelda.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      tituloCelda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2265' } };
      tituloCelda.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.getCell('A3').value = 'Fecha de Referencia:';
      worksheet.getCell('A3').font = { bold: true };
      worksheet.getCell('B3').value = fechaAsistencia;

      worksheet.getCell('A4').value = 'Profesor a Cargo:';
      worksheet.getCell('A4').font = { bold: true };
      worksheet.getCell('B4').value = comision?.nombre_docente || 'No asignado';

      const columnas = [
        { header: 'DNI', key: 'dni', width: 15 },
        { header: 'Apellido', key: 'apellido', width: 20 },
        { header: 'Nombre', key: 'nombre', width: 25 },
        { header: 'Email', key: 'email', width: 35 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Asistencia', key: 'asistencia', width: 15 },
      ];

      if (incluirNotas) {
        columnas.push({ header: 'Promedio', key: 'promedio', width: 15 });
      }

      worksheet.getRow(6).values = columnas.map(c => c.header);
      worksheet.columns = columnas;

      const headerRow = worksheet.getRow(6);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      inscripciones.forEach(insc => {
        const dni = insc.alumno_detalle?.dni || insc.alumno_detalle?.username || "S/D";
        const apellido = insc.alumno_detalle?.last_name || "";
        const nombre = insc.alumno_detalle?.first_name || "";
        const email = insc.alumno_detalle?.email || "";
        const estado = insc.estado_alumno || "Regular";
        const presente = estadoAsistencia[insc.id] ? "Presente" : "Ausente";

        const rowData = { dni, apellido, nombre, email, estado, asistencia: presente };

        if (incluirNotas) {
          const misNotas = notas.filter(n => (n.inscripcion?.id || n.inscripcion) === insc.id);
          rowData.promedio = misNotas.length > 0 ? (misNotas.reduce((acc, curr) => acc + parseFloat(curr.valor), 0) / misNotas.length).toFixed(2) : "S/N";
        }

        const row = worksheet.addRow(rowData);

        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin', color: {argb:'FFDDDDDD'} }, left: { style: 'thin', color: {argb:'FFDDDDDD'} }, bottom: { style: 'thin', color: {argb:'FFDDDDDD'} }, right: { style: 'thin', color: {argb:'FFDDDDDD'} } };
          cell.alignment = { vertical: 'middle', horizontal: cell.col === 6 || cell.col === 7 ? 'center' : 'left' };
        });

        const celdaAsistencia = row.getCell(6);
        if (presente === 'Presente') {
          celdaAsistencia.font = { color: { argb: 'FF198754' }, bold: true }; 
        } else {
          celdaAsistencia.font = { color: { argb: 'FFDC3545' }, bold: true }; 
        }
        
        if (incluirNotas) {
          const celdaNota = row.getCell(7);
          celdaNota.font = { bold: true };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Planilla_${comision.nombre.replace(/\s/g, '_')}.xlsx`);
      
      toast.success("Planilla Excel generada con éxito");

    } catch (error) {
      console.error(error);
      toast.error("Error al generar el archivo Excel");
    }
  };

  const handleCrearEvaluacion = async (e) => {
    e.preventDefault();
    if (comision.horarios && comision.horarios.length > 0) {
      const diasPermitidos = comision.horarios.map(h => DIAS_SEMANA_NUM[h.dia]);
      const diaSeleccionado = new Date(nuevaEval.fecha + 'T12:00:00').getDay(); 
      if (!diasPermitidos.includes(diaSeleccionado)) {
        const diasNombres = comision.horarios.map(h => h.dia_nombre || h.dia).join(' o ');
        toast.error(
          <span>
            <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
            Fecha inválida. Esta comisión solo tiene clases los días: {diasNombres}.
          </span>
        );
        return; 
      }
    }
    setGuardandoEval(true);
    try {
      const response = await api.post('evaluaciones/', { ...nuevaEval, comision: parseInt(id) });
      setEvaluaciones(prev => [...prev, response.data].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)));
      toast.success("¡Evaluación programada con éxito!");
      setNuevaEval({ nombre: '', fecha: '', es_entrega: false });
      setShowEvalModal(false);
    } catch (error) { 
      toast.error("No se pudo guardar la evaluación."); 
    } finally { 
      setGuardandoEval(false); 
    }
  };

  const handleEliminarEvaluacion = async (evalId) => {
    if (window.confirm("¿Estás seguro de eliminar esta evaluación?")) {
      try { 
        await api.delete(`evaluaciones/${evalId}/`); 
        setEvaluaciones(prev => prev.filter(ev => ev.id !== evalId));
        toast.success("Evaluación eliminada."); 
      } catch (error) { 
        toast.error("Error al eliminar."); 
      }
    }
  };
  
  const handleCrearAnuncio = async (e) => {
    e.preventDefault();
    setGuardandoAnuncio(true);

    let fechaExpiracionCalculada = null;
    const fechaActual = new Date();

    if (nuevoAnuncio.tipo_expiracion === 'semana') {
      fechaActual.setDate(fechaActual.getDate() + 7);
      fechaExpiracionCalculada = fechaActual.toISOString();
    } else if (nuevoAnuncio.tipo_expiracion === 'mes') {
      fechaActual.setMonth(fechaActual.getMonth() + 1);
      fechaExpiracionCalculada = fechaActual.toISOString();
    } else if (nuevoAnuncio.tipo_expiracion === 'especifica') {
      if (!nuevoAnuncio.fecha_expiracion_personalizada) {
        toast.error("Debes seleccionar una fecha de expiración.");
        setGuardandoAnuncio(false);
        return;
      }
      const fechaElegida = new Date(nuevoAnuncio.fecha_expiracion_personalizada + 'T23:59:59');
      fechaExpiracionCalculada = fechaElegida.toISOString();
    }

    try {
      const response = await api.post('anuncios/', {
        titulo: nuevoAnuncio.titulo,
        contenido: nuevoAnuncio.contenido,
        permite_comentarios: nuevoAnuncio.permite_comentarios,
        fecha_expiracion: fechaExpiracionCalculada, 
        comision: parseInt(id),
        autor: userId
      });
      
      setAnuncios(prev => [response.data, ...prev]);

      toast.success("Anuncio publicado en el muro.");
      setNuevoAnuncio({ titulo: '', contenido: '', permite_comentarios: true, tipo_expiracion: 'permanente', fecha_expiracion_personalizada: '' });
      setShowAnuncioModal(false);
    } catch (error) { 
      toast.error("Error al publicar el anuncio."); 
    } finally { 
      setGuardandoAnuncio(false); 
    }
  };

  const handleEliminarAnuncio = async (anuncioId) => {
    if (window.confirm("¿Eliminar este anuncio del muro?")) {
      try { 
        await api.delete(`anuncios/${anuncioId}/`); 
        setAnuncios(prev => prev.filter(anun => anun.id !== anuncioId));
        toast.success("Anuncio borrado."); 
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
    
    if (!autorIdStr && (!anuncio.comentarios || anuncio.comentarios.length === 0)) {
      noLoVi = false;
    }

    return noLoVi;
  };

  const marcarComoVisto = async (anuncioId) => {
    try {
      setAnuncios(prev => prev.map(a => a.id === anuncioId ? { ...a, visto_por: [...(a.visto_por || []), userId] } : a));
      await api.post(`anuncios/${anuncioId}/marcar_visto/`);
      
      const resAnuncios = await api.get(`anuncios/?comision=${id}`);
      const anunciosFiltrados = resAnuncios.data.results || resAnuncios.data;
      setAnuncios(anunciosFiltrados);
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
      fetchDatosAula(); 
    } catch (error) { toast.error("Error al enviar el comentario."); } finally { setGuardandoComentario(false); }
  };

  const hayNotificacionesTablero = anuncios.some(esAnuncioNoVisto);

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}><Spinner animation="border" style={{ color: '#0b2265' }} /><span className="ms-3 text-muted">Abriendo el aula...</span></div>;

  return (
    <div>
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/dashboard/aulas" }}>Mis Aulas</Breadcrumb.Item>
        <Breadcrumb.Item active>{comision?.nombre || `Comisión #${id}`}</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="border-0 shadow-sm mb-4 text-white" style={{ backgroundColor: '#0b2265' }}>
        <Card.Body className="p-4">
          <Row className="align-items-center">
            <Col md={8}>
              <Badge bg="danger" className="mb-2">Activa</Badge>
              <h2 className="fw-bold mb-1">{comision?.nombre || `Comisión #${id}`}</h2>
              <p className="mb-0 text-white-50 d-flex align-items-center">
                <i className="bi bi-calendar3 me-2"></i> Periodo: {comision?.periodo_nombre || comision?.periodo} {comision?.anio} 
                <span className="mx-3">|</span> 
                <i className="bi bi-people-fill me-2"></i> Alumnos: {inscripciones.length}
              </p>
            </Col>
            <Col md={4} className="text-md-end mt-3 mt-md-0">
              <Button as={Link} to={`/dashboard/calificar/${id}`} variant="light" className="fw-bold shadow-sm w-100 w-md-auto" style={{ color: '#0b2265' }}>
                <i className="bi bi-pencil-square me-2"></i>Cargar Notas
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Tabs defaultActiveKey="tablero" id="aula-tabs" className="mb-4 custom-tabs">
        
        {/* --- PESTAÑA: TABLERO DE ANUNCIOS --- */}
        <Tab eventKey="tablero" title={<span><i className="bi bi-megaphone me-2"></i>Tablero {hayNotificacionesTablero && <Badge bg="danger" pill className="ms-1" style={{ fontSize: '0.6rem', verticalAlign: 'top' }}>NUEVO</Badge>}</span>}>
          
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
            <div>
              <h5 className="fw-bold mb-1 text-dark">Muro de la Comisión</h5>
              <p className="text-muted small mb-0">Publica avisos, recordatorios y comunícate con la clase.</p>
            </div>
            <div className="d-grid d-md-block mt-2 mt-md-0">
              <Button variant="primary" className="fw-bold shadow-sm px-4" style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} onClick={() => setShowAnuncioModal(true)}>
                <i className="bi bi-pencil-square me-2"></i>Publicar Aviso
              </Button>
            </div>
          </div>

          {anuncios.length === 0 ? (
            <div className="text-center py-5 bg-white border rounded shadow-sm">
              <div className="display-4 text-muted mb-3"><i className="bi bi-chat-square-quote"></i></div>
              <h6 className="fw-bold text-muted">El muro está vacío</h6>
              <p className="small text-muted mb-0">Comienza publicando un mensaje de bienvenida para tus alumnos.</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {anuncios.map(anuncio => {
                const isExpanded = anuncioExpandido === anuncio.id;
                const noVisto = esAnuncioNoVisto(anuncio);

                return (
                  <Card key={anuncio.id} className="border-0 shadow-sm border-start border-4 border-primary" style={{ borderLeftColor: '#0b2265 !important' }}>
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: '40px', height: '40px' }}>
                            <i className="bi bi-person-fill"></i>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-bold">{anuncio.autor_nombre || 'Tú (Docente)'}</h6>
                            <small className="text-muted">
                              {new Date(anuncio.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute:'2-digit' })}
                              {anuncio.fecha_expiracion && (
                                <span className="ms-2 badge bg-warning text-dark opacity-75 fw-normal">
                                  <i className="bi bi-hourglass-split me-1"></i>
                                  Expira el {new Date(anuncio.fecha_expiracion).toLocaleDateString('es-ES')}
                                </span>
                              )}
                            </small>
                          </div>
                        </div>
                        <Button variant="link" className="text-danger p-0" onClick={() => handleEliminarAnuncio(anuncio.id)}>
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                      
                      <h5 className="fw-bold mt-3 mb-2">{anuncio.titulo}</h5>
                      <p className="text-dark mb-3" style={{ whiteSpace: 'pre-wrap' }}>{anuncio.contenido}</p>
                      
                      <div className="d-flex align-items-center gap-3 pt-3 border-top border-light">
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
                            <p className="text-muted small text-center mb-3 fst-italic">No hay comentarios aún. ¡Sé el primero en responder!</p>
                          )}

                          <Form onSubmit={(e) => handleEnviarComentario(e, anuncio.id)} className="d-flex gap-2 pb-3">
                            <Form.Control size="sm" type="text" placeholder="Escribe una respuesta..." value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} />
                            <Button type="submit" size="sm" variant="primary" disabled={!nuevoComentario.trim() || guardandoComentario}>
                              <i className="bi bi-send"></i>
                            </Button>
                          </Form>
                        </div>
                      </Collapse>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </Tab>

        {/* --- PESTAÑA: ESTUDIANTES --- */}
        <Tab eventKey="alumnos" title={<span><i className="bi bi-person-lines-fill me-2"></i>Estudiantes</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
              <span className="fw-bold text-muted">Listado de la Comisión</span>
              <Dropdown>
                <Dropdown.Toggle variant="outline-success" size="sm" className="fw-medium">
                  <i className="bi bi-file-earmark-excel-fill me-2"></i>Descargar Planilla
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow-sm">
                  <Dropdown.Item onClick={() => descargarLista(false)}><i className="bi bi-list-check me-2 text-muted"></i>Solo Alumnos y Asistencia</Dropdown.Item>
                  <Dropdown.Item onClick={() => descargarLista(true)}><i className="bi bi-award me-2 text-warning"></i>Incluir Promedios Actuales</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="m-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3 text-muted">DNI</th>
                    <th className="px-4 py-3 text-muted">Nombre Completo</th>
                    <th className="px-4 py-3 text-muted">Contacto</th>
                    <th className="px-4 py-3 text-muted">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {inscripciones.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-5 text-muted">No hay alumnos inscritos en esta comisión.</td></tr>
                  ) : (
                    inscripciones.map((insc) => (
                      <tr key={insc.id}>
                        <td className="px-4 fw-medium text-muted">{insc.alumno_detalle?.dni || insc.alumno_detalle?.username || 'S/D'}</td>
                        <td className="px-4 text-dark fw-bold">{insc.alumno_detalle?.last_name}, {insc.alumno_detalle?.first_name}</td>
                        <td className="px-4 text-muted small">
                          <i className="bi bi-envelope me-1"></i> {insc.alumno_detalle?.email || 'Sin email'}<br/>
                          {insc.alumno_detalle?.telefono && <><i className="bi bi-telephone me-1"></i> {insc.alumno_detalle?.telefono}</>}
                        </td>
                        <td className="px-4">
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 text-uppercase px-2 py-1">{insc.estado_alumno || 'Regular'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* --- PESTAÑA: ASISTENCIA --- */}
        <Tab eventKey="asistencia" title={<span><i className="bi bi-calendar-check me-2"></i>Asistencia</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom">
                <div className="mb-3 mb-md-0">
                  <h5 className="fw-bold mb-1">Registro de Asistencia</h5>
                  <p className="text-muted small mb-0">Selecciona la fecha y marca quién asistió a clase.</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Form.Label className="mb-0 fw-medium text-muted text-nowrap">Fecha de Clase:</Form.Label>
                  <Form.Control type="date" value={fechaAsistencia} onChange={(e) => setFechaAsistencia(e.target.value)} className="shadow-sm" style={{ maxWidth: '160px' }} />
                </div>
              </div>

              {!isFechaAsistenciaValida && (
                <Alert variant="warning" className="d-flex align-items-center mb-4 border-warning border-start border-4">
                  <i className="bi bi-exclamation-triangle-fill fs-3 text-warning me-3"></i>
                  <div>
                    <h6 className="fw-bold mb-1">Día fuera de cronograma</h6>
                    <span className="small">Esta comisión dicta clases los días <b>{diasNombresAsistencia}</b>. Por favor, selecciona una fecha válida para tomar asistencia.</span>
                  </div>
                </Alert>
              )}

              {inscripciones.length === 0 ? (
                <div className="text-center py-5 bg-light rounded">
                  <div className="display-4 text-muted mb-3"><i className="bi bi-people"></i></div>
                  <h6 className="fw-bold text-muted">Aún no hay alumnos para tomar lista</h6>
                </div>
              ) : (
                <>
                  <Table responsive hover className="align-middle border">
                    <thead className="table-light">
                      <tr><th className="ps-4">Alumno</th><th className="text-center">Estado</th></tr>
                    </thead>
                    <tbody>
                      {inscripciones.map(insc => {
                        const estaPresente = estadoAsistencia[insc.id];
                        return (
                          <tr key={insc.id} className={!estaPresente && isFechaAsistenciaValida ? 'bg-danger bg-opacity-10' : ''}>
                            <td className="ps-4 fw-bold text-dark">{insc.alumno_detalle?.last_name}, {insc.alumno_detalle?.first_name}</td>
                            <td className="text-center">
                              <Form.Check 
                                type="switch" id={`switch-asistencia-${insc.id}`} className="d-flex justify-content-center align-items-center fs-5"
                                checked={estaPresente || false} onChange={(e) => setEstadoAsistencia({...estadoAsistencia, [insc.id]: e.target.checked})}
                                disabled={!isFechaAsistenciaValida} 
                                label={estaPresente ? <Badge bg={isFechaAsistenciaValida ? "success" : "secondary"} className="ms-2">Presente</Badge> : <Badge bg={isFechaAsistenciaValida ? "danger" : "secondary"} className="ms-2">Ausente</Badge>}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                  <div className="d-flex justify-content-end mt-4">
                    <Button variant="primary" className="fw-bold px-4 py-2 shadow-sm" style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} onClick={handleGuardarAsistencia} disabled={guardandoAsistencia || !isFechaAsistenciaValida}>
                      {guardandoAsistencia ? <><Spinner animation="border" size="sm" className="me-2"/> Guardando...</> : <><i className="bi bi-save2 me-2"></i> Guardar Asistencia</>}
                    </Button>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* --- PESTAÑA: EVALUACIONES --- */}
        <Tab eventKey="evaluaciones" title={<span><i className="bi bi-journal-text me-2"></i>Evaluaciones</span>}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                <div>
                  <h5 className="fw-bold mb-1">Exámenes y Trabajos</h5>
                  <p className="text-muted small mb-0">Planifica las instancias de evaluación para este curso.</p>
                </div>
                <Button variant="danger" className="fw-bold shadow-sm w-100 w-sm-auto" onClick={() => setShowEvalModal(true)}><i className="bi bi-plus-lg me-2"></i>Nueva Evaluación</Button>
              </div>

              {evaluaciones.length === 0 ? (
                <div className="text-center py-5 bg-light rounded">
                  <div className="display-4 text-muted mb-3"><i className="bi bi-file-earmark-text"></i></div>
                  <h6 className="fw-bold text-muted">Aún no hay evaluaciones programadas</h6>
                </div>
              ) : (
                <Table responsive hover className="align-middle border">
                  <thead className="table-light">
                    <tr><th className="ps-4">Fecha</th><th>Nombre / Tema</th><th>Tipo</th><th className="text-end pe-4">Acciones</th></tr>
                  </thead>
                  <tbody>
                    {evaluaciones.map(ev => (
                      <tr key={ev.id}>
                        <td className="ps-4 fw-medium" style={{ width: '150px' }}>
                          <i className="bi bi-calendar-event me-2 text-muted"></i>
                          {new Date(ev.fecha.includes('T') ? ev.fecha : `${ev.fecha}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="fw-bold text-dark">{ev.nombre}</td>
                        <td>{ev.es_entrega ? <Badge bg="warning" text="dark" className="px-2 py-1"><i className="bi bi-cloud-arrow-up me-1"></i> Entrega TP</Badge> : <Badge bg="danger" className="px-2 py-1"><i className="bi bi-pen me-1"></i> Examen</Badge>}</td>
                        <td className="text-end pe-4"><Button variant="outline-danger" size="sm" onClick={() => handleEliminarEvaluacion(ev.id)}><i className="bi bi-trash"></i></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* --- MODALES --- */}

      <Modal show={showEvalModal} onHide={() => setShowEvalModal(false)} centered>
        <Form onSubmit={handleCrearEvaluacion}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold text-dark"><i className="bi bi-journal-plus me-2 text-danger"></i>Programar Evaluación</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Título del Examen o TP <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" placeholder="Ej: Primer Parcial..." value={nuevaEval.nombre} onChange={(e) => setNuevaEval({...nuevaEval, nombre: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">Fecha Programada <span className="text-danger">*</span></Form.Label>
              <Form.Control type="date" value={nuevaEval.fecha} onChange={(e) => setNuevaEval({...nuevaEval, fecha: e.target.value})} required />
            </Form.Group>
            <Form.Group className="p-3 bg-light rounded border">
              <Form.Check type="switch" id="tipo-evaluacion-switch" label={<span className="fw-medium ms-1">Es un Trabajo Práctico (Entrega)</span>} checked={nuevaEval.es_entrega} onChange={(e) => setNuevaEval({...nuevaEval, es_entrega: e.target.checked})} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="outline-secondary" onClick={() => setShowEvalModal(false)} disabled={guardandoEval}>Cancelar</Button>
            <Button variant="danger" type="submit" className="fw-bold px-4" disabled={guardandoEval}>{guardandoEval ? <Spinner animation="border" size="sm" /> : 'Guardar'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showAnuncioModal} onHide={() => setShowAnuncioModal(false)} centered>
        <Form onSubmit={handleCrearAnuncio}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold text-dark"><i className="bi bi-pencil-square me-2 text-primary"></i>Publicar Aviso</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Asunto <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" placeholder="Ej: Cambio de horario..." value={nuevoAnuncio.titulo} onChange={(e) => setNuevoAnuncio({...nuevoAnuncio, titulo: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Mensaje <span className="text-danger">*</span></Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Escribe tu mensaje..." value={nuevoAnuncio.contenido} onChange={(e) => setNuevoAnuncio({...nuevoAnuncio, contenido: e.target.value})} required />
            </Form.Group>

            <Form.Group className="mb-3 p-3 bg-white border rounded">
              <Form.Label className="fw-bold text-muted small"><i className="bi bi-hourglass-split me-2"></i>Duración del anuncio en el muro:</Form.Label>
              <Form.Select 
                size="sm"
                value={nuevoAnuncio.tipo_expiracion}
                onChange={(e) => setNuevoAnuncio({...nuevoAnuncio, tipo_expiracion: e.target.value})}
              >
                <option value="permanente">Permanente (No se borra)</option>
                <option value="semana">Ocultar en 1 semana</option>
                <option value="mes">Ocultar en 1 mes</option>
                <option value="especifica">Ocultar en una fecha específica...</option>
              </Form.Select>
              
              {nuevoAnuncio.tipo_expiracion === 'especifica' && (
                <Form.Control 
                  type="date" 
                  size="sm"
                  className="mt-2 border-warning" 
                  value={nuevoAnuncio.fecha_expiracion_personalizada} 
                  onChange={(e) => setNuevoAnuncio({...nuevoAnuncio, fecha_expiracion_personalizada: e.target.value})}
                />
              )}
            </Form.Group>

            <Form.Group className="p-2 bg-light rounded border">
              <Form.Check type="switch" id="comentarios-switch" label={<span className="fw-medium ms-1 small">Permitir comentarios</span>} checked={nuevoAnuncio.permite_comentarios} onChange={(e) => setNuevoAnuncio({...nuevoAnuncio, permite_comentarios: e.target.checked})} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="outline-secondary" onClick={() => setShowAnuncioModal(false)} disabled={guardandoAnuncio}>Cancelar</Button>
            <Button variant="primary" type="submit" className="fw-bold px-4" style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} disabled={guardandoAnuncio}>
              {guardandoAnuncio ? <Spinner animation="border" size="sm" /> : 'Publicar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </div>
  );
};

export default DetalleAula;