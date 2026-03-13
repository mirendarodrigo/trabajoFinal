import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Spinner, Table, Modal, Badge, ListGroup, InputGroup, Row, Col } from 'react-bootstrap';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const GestionAlumnos = () => {
    const [alumnos, setAlumnos] = useState([]);
    const [comisiones, setComisiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    // Estados del Modal de Ficha Académica
    const [showFichaModal, setShowFichaModal] = useState(false);
    const [alumnoActual, setAlumnoActual] = useState(null);
    const [comisionSeleccionada, setComisionSeleccionada] = useState('');
    const [inscripcionesDelAlumno, setInscripcionesDelAlumno] = useState([]);
    const [loadingFicha, setLoadingFicha] = useState(false);
    
    // 🚨 NUEVO: Estado para el spinner del botón "Matricular"
    const [guardandoMatricula, setGuardandoMatricula] = useState(false);

    // Estados para el Modal de Crear Alumno
    const [showCrearModal, setShowCrearModal] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoApellido, setNuevoApellido] = useState('');
    const [nuevoEmail, setNuevoEmail] = useState('');
    const [nuevoDni, setNuevoDni] = useState('');
    
    // 🚨 NUEVO: Estado para el spinner del botón "Registrar Alumno"
    const [guardandoAlumno, setGuardandoAlumno] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resUsuarios, resComisiones] = await Promise.all([
                api.get('usuarios/?rol=ALUMNO'),
                api.get('comisiones/')
            ]);
            
            setAlumnos(resUsuarios.data.results || resUsuarios.data);
            setComisiones(resComisiones.data.results || resComisiones.data);
        } catch (error) {
            toast.error("Error al cargar la información.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- LÓGICA PARA CREAR ALUMNO ---
    const handleCrearAlumno = async (e) => {
        e.preventDefault();
        setGuardandoAlumno(true); // 🚨 Encendemos el spinner
        
        try {
            const payload = {
                first_name: nuevoNombre,
                last_name: nuevoApellido,
                email: nuevoEmail,
                username: nuevoDni, 
                dni: nuevoDni,      
                password: nuevoDni, 
                rol: 'ALUMNO'
            };

            await api.post('usuarios/', payload);
            toast.success("Alumno registrado exitosamente");

            setNuevoNombre(''); setNuevoApellido(''); setNuevoEmail(''); setNuevoDni('');
            setShowCrearModal(false);
            fetchData();
        } catch (error) {
            if (error.response?.data?.username) {
                toast.error("El DNI / Usuario ya está registrado en el sistema.");
            } else {
                toast.error("Error al registrar el alumno. Revisa los datos.");
            }
        } finally {
            setGuardandoAlumno(false); // 🚨 Apagamos el spinner termine bien o mal
        }
    };

    const handleEliminarAlumno = async (idAlumno, nombreCompleto) => {
        if (window.confirm(`⚠️ ¿ESTÁS COMPLETAMENTE SEGURO?\n\nVas a eliminar a ${nombreCompleto} de forma permanente.\nEsto borrará todo su historial, notas e inscripciones. Esta acción NO se puede deshacer.`)) {
            try {
                await api.delete(`usuarios/${idAlumno}/`);
                toast.success("Alumno eliminado permanentemente del sistema.");
                if (alumnoActual?.id === idAlumno) {
                    setShowFichaModal(false);
                }
                fetchData(); 
            } catch (error) {
                toast.error("Error al eliminar. Es posible que el alumno tenga registros protegidos.");
                console.error("Error al borrar alumno:", error);
            }
        }
    };

    // --- LÓGICA DE LA FICHA DEL ALUMNO ---
    const fetchInscripcionesAlumno = async (idAlumno) => {
        setLoadingFicha(true);
        try {
            const res = await api.get(`inscripciones/?alumno=${idAlumno}`);
            setInscripcionesDelAlumno(res.data.results || res.data);
        } catch (error) {
            toast.error("Error al cargar el historial del alumno.");
        } finally {
            setLoadingFicha(false);
        }
    };

    const handleAbrirFicha = (alumno) => {
        setAlumnoActual(alumno);
        setComisionSeleccionada('');
        setInscripcionesDelAlumno([]); 
        setShowFichaModal(true);
        fetchInscripcionesAlumno(alumno.id); 
    };

    const handleInscribir = async (e) => {
        e.preventDefault();
        if (!comisionSeleccionada) return toast.error("Selecciona una comisión");
        
        setGuardandoMatricula(true); // 🚨 Encendemos el spinner de matrícula
        try {
            await api.post('inscripciones/', {
                alumno: alumnoActual.id,
                comision: parseInt(comisionSeleccionada),
                estado_alumno: 'REGULAR'
            });
            toast.success("Alumno matriculado exitosamente");
            setComisionSeleccionada('');
            fetchInscripcionesAlumno(alumnoActual.id);
        } catch (error) {
            toast.error("Error al inscribir. Quizás ya esté anotado.");
        } finally {
            setGuardandoMatricula(false); // 🚨 Apagamos el spinner
        }
    };

    const handleCambiarEstado = async (idInscripcion, nuevoEstado) => {
        try {
            await api.patch(`inscripciones/${idInscripcion}/`, { estado_alumno: nuevoEstado });
            toast.success("Estado actualizado");
            fetchInscripcionesAlumno(alumnoActual.id);
        } catch (error) {
            toast.error("Error al actualizar estado");
        }
    };

    const handleEliminarInscripcion = async (idInscripcion) => {
        if (window.confirm("¿Dar de baja al alumno de esta comisión?")) {
            try {
                await api.delete(`inscripciones/${idInscripcion}/`);
                toast.success("Inscripción eliminada");
                fetchInscripcionesAlumno(alumnoActual.id);
            } catch (error) {
                toast.error("Error al eliminar la inscripción");
            }
        }
    };

    const alumnosFiltrados = alumnos.filter(alumno => {
        const termino = busqueda.toLowerCase();
        const nombreCompleto = `${alumno.first_name} ${alumno.last_name}`.toLowerCase();
        const dni = alumno.username?.toLowerCase() || '';
        const email = alumno.email?.toLowerCase() || '';
        
        return nombreCompleto.includes(termino) || dni.includes(termino) || email.includes(termino);
    });

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" style={{ color: '#0b2265' }} /></div>;

    return (
        <div>
            {/* --- CABECERA Y BUSCADOR --- */}
            <div className="mb-4">
                <Row className="align-items-center g-3">
                    <Col xs={12} lg={4}>
                        <h2 className="fw-bold text-dark mb-1">
                            <i className="bi bi-people-fill me-2 text-piccadilly-blue"></i> Padrón de Alumnos
                        </h2>
                        <p className="text-muted mb-0">Administra estudiantes y sus matrículas.</p>
                    </Col>
                    
                    <Col xs={12} md={6} lg={4}>
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

                    <Col xs={12} md={6} lg={4} className="d-flex flex-column flex-sm-row gap-2 justify-content-md-end">
                        <Button 
                            as={Link} 
                            to="/dashboard/cargar-alumnos" 
                            variant="outline-success" 
                            className="fw-bold shadow-sm w-100 w-sm-auto py-2"
                        >
                            <i className="bi bi-file-earmark-excel-fill me-2"></i> Importar Excel
                        </Button>
                        <Button 
                            variant="success" 
                            className="fw-bold shadow-sm w-100 w-sm-auto py-2" 
                            onClick={() => setShowCrearModal(true)}
                        >
                            <i className="bi bi-person-plus-fill me-2"></i> Nuevo Alumno
                        </Button>
                    </Col>
                </Row>
            </div>

            <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                    <Table responsive hover className="align-middle mb-0 bg-white">
                        <thead className="table-light text-nowrap">
                            <tr>
                                <th className="px-4 py-3 border-0">Usuario / DNI</th>
                                <th className="py-3 border-0">Nombre Completo</th>
                                <th className="py-3 border-0">Email</th>
                                <th className="text-end px-4 py-3 border-0">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alumnosFiltrados.map(alumno => {
                                return (
                                    <tr key={alumno.id}>
                                        <td className="px-4 text-muted fw-medium">{alumno.username}</td>
                                        <td className="fw-bold text-dark">{alumno.first_name} {alumno.last_name}</td>
                                        <td>{alumno.email || <span className="text-muted fst-italic small">Sin email</span>}</td>
                                        <td className="text-end px-4 text-nowrap">
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm" 
                                                className="rounded-pill px-3 shadow-sm me-2" 
                                                onClick={() => handleAbrirFicha(alumno)}
                                            >
                                                <i className="bi bi-card-checklist me-1"></i> Ficha del Alumno
                                            </Button>
                                            <Button 
                                                variant="outline-danger" 
                                                size="sm" 
                                                className="rounded-circle shadow-sm p-1" 
                                                style={{ width: '32px', height: '32px' }} 
                                                title="Eliminar permanentemente"
                                                onClick={() => handleEliminarAlumno(alumno.id, `${alumno.first_name} ${alumno.last_name}`)}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {alumnosFiltrados.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center text-muted py-5">
                                        <i className="bi bi-search fs-1 d-block mb-3 opacity-50"></i>
                                        No se encontraron alumnos con esa búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* --- MODAL: CREAR ALUMNO --- */}
            {/* 🚨 Evitamos que se cierre si está guardando */}
            <Modal show={showCrearModal} onHide={() => !guardandoAlumno && setShowCrearModal(false)} centered>
                <Form onSubmit={handleCrearAlumno}>
                    <Modal.Header closeButton={!guardandoAlumno} className="bg-light">
                        <Modal.Title className="fw-bold text-dark"><i className="bi bi-person-badge me-2 text-success"></i>Alta de Estudiante</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="p-4">
                        <div className="alert alert-info small border-info shadow-sm">
                            <i className="bi bi-info-circle-fill me-2"></i>
                            El DNI ingresado se utilizará como <b>Usuario</b> y <b>Contraseña temporal</b> para que el alumno ingrese al campus.
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <Form.Group>
                                    <Form.Label className="fw-medium text-muted small text-uppercase">Nombres <span className="text-danger">*</span></Form.Label>
                                    <Form.Control type="text" className="shadow-sm" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required disabled={guardandoAlumno} />
                                </Form.Group>
                            </div>
                            <div className="col-md-6 mb-3">
                                <Form.Group>
                                    <Form.Label className="fw-medium text-muted small text-uppercase">Apellidos <span className="text-danger">*</span></Form.Label>
                                    <Form.Control type="text" className="shadow-sm" value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} required disabled={guardandoAlumno} />
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-medium text-muted small text-uppercase">Documento (DNI sin puntos) <span className="text-danger">*</span></Form.Label>
                            <Form.Control type="text" className="shadow-sm" placeholder="Ej: 35123456" value={nuevoDni} onChange={(e) => setNuevoDni(e.target.value)} required disabled={guardandoAlumno} />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-medium text-muted small text-uppercase">Correo Electrónico</Form.Label>
                            <Form.Control type="email" className="shadow-sm" placeholder="alumno@correo.com" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} disabled={guardandoAlumno} />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="bg-light">
                        <Button variant="link" className="text-muted text-decoration-none" onClick={() => setShowCrearModal(false)} disabled={guardandoAlumno}>Cancelar</Button>
                        <Button 
                            variant="success" 
                            type="submit" 
                            disabled={guardandoAlumno}
                            className="fw-bold px-4 rounded-pill shadow-sm"
                        >
                            {/* 🚨 SPINNER CONDICIONAL */}
                            {guardandoAlumno ? (
                                <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" /> Registrando...</>
                            ) : (
                                'Registrar Alumno'
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* --- MODAL: FICHA DEL ALUMNO --- */}
            <Modal show={showFichaModal} onHide={() => setShowFichaModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold text-dark">
                        <i className="bi bi-person-vcard text-piccadilly-blue me-2"></i> 
                        Ficha de: <span className="text-primary">{alumnoActual?.first_name} {alumnoActual?.last_name}</span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0 bg-light">
                    
                    {/* Caja de Matrícula Nueva */}
                    <div className="p-4 bg-white border-bottom shadow-sm z-1 position-relative">
                        <h6 className="fw-bold mb-3 text-dark"><i className="bi bi-plus-circle-fill text-success me-2"></i>Matricular en nuevo curso</h6>
                        <Form onSubmit={handleInscribir} className="d-flex flex-column flex-md-row gap-2">
                            <Form.Select 
                                className="shadow-sm" 
                                value={comisionSeleccionada} 
                                onChange={(e) => setComisionSeleccionada(e.target.value)} 
                                required
                                disabled={loadingFicha || guardandoMatricula} // 🚨 Bloqueado si está cargando o guardando
                            >
                                <option value="">Selecciona la comisión para anotar al alumno...</option>
                                {comisiones.filter(c => c.activo).map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre_curso} - {c.nombre} ({c.periodo})</option>
                                ))}
                            </Form.Select>
                            <Button 
                                variant="success" 
                                type="submit" 
                                className="fw-bold px-4 shadow-sm w-100 w-md-auto text-nowrap" 
                                disabled={loadingFicha || guardandoMatricula}
                            >
                                {/* 🚨 SPINNER CONDICIONAL PARA MATRÍCULA */}
                                {guardandoMatricula ? (
                                    <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" /> Matriculando...</>
                                ) : (
                                    'Matricular'
                                )}
                            </Button>
                        </Form>
                    </div>

                    {/* Lista de Comisiones del Alumno */}
                    <div className="p-4 overflow-y-auto" style={{ maxHeight: '50vh' }}>
                        <h6 className="fw-bold mb-3 text-muted text-uppercase small"><i className="bi bi-journal-bookmark-fill me-2"></i>Cursos Actuales del Alumno</h6>
                        
                        {loadingFicha ? (
                            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                        ) : inscripcionesDelAlumno.length === 0 ? (
                            <div className="text-center text-muted p-5 bg-white border rounded shadow-sm">
                                <i className="bi bi-folder-x fs-1 mb-2 d-block opacity-50"></i>
                                El alumno no está inscripto en ninguna comisión.
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {inscripcionesDelAlumno.map(insc => (
                                    <Card key={insc.id} className="border-0 shadow-sm">
                                        <Card.Body className="p-3">
                                            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-2">
                                                <div>
                                                    <span className="fw-bold fs-5 d-block text-dark">{insc.nombre_comision}</span>
                                                    <Badge bg="secondary" className="bg-opacity-10 text-muted border fw-normal"><i className="bi bi-book me-1"></i> Curso base: {insc.curso_comision}</Badge>
                                                </div>
                                                <Button variant="outline-danger" size="sm" onClick={() => handleEliminarInscripcion(insc.id)}>
                                                    <i className="bi bi-trash"></i> Dar de baja
                                                </Button>
                                            </div>
                                            <div className="d-flex flex-column flex-sm-row align-items-sm-center pt-3 border-top border-light gap-2">
                                                <span className="small fw-medium text-muted text-uppercase me-sm-2">Estado Académico:</span>
                                                <Form.Select
                                                    size="sm" 
                                                    className="w-auto shadow-sm fw-bold border-0 bg-light" 
                                                    value={insc.estado_alumno}
                                                    onChange={(e) => handleCambiarEstado(insc.id, e.target.value)}
                                                    style={{ color: insc.estado_alumno === 'REGULAR' ? '#198754' : '#dc3545' }}
                                                >
                                                    <option value="REGULAR">🟢 Regular</option>
                                                    <option value="LIBRE">🔴 Libre</option>
                                                    <option value="PROMOCIONADO">🔵 Promocionado</option>
                                                    <option value="ABANDONO">⚫ Abandono</option>
                                                </Form.Select>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white p-3 border-top d-flex justify-content-end">
                         <Button 
                             variant="outline-danger" 
                             size="sm" 
                             onClick={() => handleEliminarAlumno(alumnoActual.id, `${alumnoActual.first_name} ${alumnoActual.last_name}`)}
                         >
                            <i className="bi bi-person-x-fill me-2"></i> Eliminar Registro Permanentemente
                         </Button>
                    </div>

                </Modal.Body>
            </Modal>

        </div>
    );
};

export default GestionAlumnos;