import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Spinner, Table, Modal, Tabs, Tab, Badge, InputGroup } from 'react-bootstrap';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const GestionCursos = () => {
  const [categorias, setCategorias] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de Búsqueda
  const [busquedaCurso, setBusquedaCurso] = useState('');
  const [busquedaCategoria, setBusquedaCategoria] = useState('');

  // Estados para Modal de Categorías (Niveles)
  const [showCatModal, setShowCatModal] = useState(false);
  const [catEditId, setCatEditId] = useState(null);
  const [catNombre, setCatNombre] = useState('');

  // Estados para Modal de Cursos
  const [showCursoModal, setShowCursoModal] = useState(false);
  const [cursoEditId, setCursoEditId] = useState(null);
  const [cursoNombre, setCursoNombre] = useState('');
  const [cursoCodigo, setCursoCodigo] = useState('');
  const [cursoCategoriaId, setCursoCategoriaId] = useState('');

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCat, resCur] = await Promise.all([
        api.get('categorias/'),
        api.get('cursos/')
      ]);
      setCategorias(resCat.data.results || resCat.data);
      setCursos(resCur.data.results || resCur.data);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("Error al cargar la información.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- LÓGICA DE CATEGORÍAS (NIVELES) ---
  const handleShowCatModal = (cat = null) => {
    if (cat) {
      setCatEditId(cat.id);
      setCatNombre(cat.nombre);
    } else {
      setCatEditId(null);
      setCatNombre('');
    }
    setShowCatModal(true);
  };

  const handleSaveCategoria = async (e) => {
    e.preventDefault();
    try {
      if (catEditId) {
        await api.put(`categorias/${catEditId}/`, { nombre: catNombre });
        toast.success("Nivel actualizado");
      } else {
        await api.post('categorias/', { nombre: catNombre });
        toast.success("Nivel creado");
      }
      setShowCatModal(false);
      fetchData();
    } catch (error) {
      toast.error("Error al guardar el nivel");
    }
  };

  const handleDeleteCategoria = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este nivel? Los cursos asociados podrían verse afectados.")) {
      try {
        await api.delete(`categorias/${id}/`);
        toast.success("Nivel eliminado");
        fetchData();
      } catch (error) {
        toast.error("No se pudo eliminar. Verifica que no tenga cursos asociados.");
      }
    }
  };

  // --- LÓGICA DE CURSOS ---
  const handleShowCursoModal = (curso = null) => {
    if (curso) {
      setCursoEditId(curso.id);
      setCursoNombre(curso.nombre);
      setCursoCodigo(curso.codigo || '');
      setCursoCategoriaId(curso.categoria?.id || curso.categoria || '');
    } else {
      setCursoEditId(null);
      setCursoNombre('');
      setCursoCodigo('');
      setCursoCategoriaId('');
    }
    setShowCursoModal(true);
  };

  const handleSaveCurso = async (e) => {
    e.preventDefault();

    if (!cursoCategoriaId || cursoCategoriaId === "") {
      toast.error("⚠️ ALTO: Debes seleccionar un Nivel/Categoría de la lista.");
      return; 
    }

    const payload = {
      nombre: cursoNombre,
      codigo: cursoCodigo,
      categoria: parseInt(cursoCategoriaId) 
    };

    try {
      if (cursoEditId) {
        await api.put(`cursos/${cursoEditId}/`, payload);
        toast.success("Curso actualizado");
      } else {
        await api.post('cursos/', payload);
        toast.success("Curso creado");
      }
      setShowCursoModal(false);
      fetchData(); 
    } catch (error) {
      console.error("❌ Respuesta de error del servidor:", error.response?.data);
      let errorMsg = "Error al guardar el curso.";
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
           errorMsg = "Error grave en el servidor. Revisa la consola de Django.";
        } else {
           const errores = error.response.data;
           const campoFalla = Object.keys(errores)[0];
           errorMsg = `Problema en "${campoFalla}": ${errores[campoFalla]}`;
        }
      }
      toast.error(errorMsg);
    }
  };

  const handleDeleteCurso = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este curso?")) {
      try {
        await api.delete(`cursos/${id}/`);
        toast.success("Curso eliminado");
        fetchData();
      } catch (error) {
        toast.error("No se pudo eliminar el curso.");
      }
    }
  };

  // --- FILTROS DE BÚSQUEDA ---
  const cursosFiltrados = cursos.filter(c => 
    c.nombre.toLowerCase().includes(busquedaCurso.toLowerCase()) || 
    c.codigo.toLowerCase().includes(busquedaCurso.toLowerCase()) ||
    (c.nombre_categoria && c.nombre_categoria.toLowerCase().includes(busquedaCurso.toLowerCase()))
  );

  const categoriasFiltradas = categorias.filter(c => 
    c.nombre.toLowerCase().includes(busquedaCategoria.toLowerCase())
  );

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" style={{ color: '#0b2265' }} /></div>;

  return (
    <div>
      <div className="mb-4">
        <h2 className="fw-bold text-dark"><i className="bi bi-journal-text me-2 text-piccadilly-blue"></i> Cursos y Niveles</h2>
        <p className="text-muted">Administra la estructura base de la oferta académica de Piccadilly.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-3 p-md-4">
          <Tabs defaultActiveKey="cursos" className="mb-4 custom-tabs">
            
            {/* --- PESTAÑA 1: CURSOS --- */}
            <Tab eventKey="cursos" title={<><i className="bi bi-book me-2"></i>Cursos</>}>
              
              {/* ENCABEZADO Y BUSCADOR RESPONSIVE */}
              <div className="row align-items-center mb-3 g-3">
                <div className="col-12 col-md-4">
                  <h5 className="mb-0 fw-bold">Listado de Cursos Base</h5>
                </div>
                <div className="col-12 col-md-5">
                  <InputGroup className="shadow-sm">
                    <InputGroup.Text className="bg-white border-end-0"><i className="bi bi-search text-muted"></i></InputGroup.Text>
                    <Form.Control
                      placeholder="Buscar curso, código o nivel..."
                      className="border-start-0 ps-0"
                      value={busquedaCurso}
                      onChange={(e) => setBusquedaCurso(e.target.value)}
                    />
                  </InputGroup>
                </div>
                <div className="col-12 col-md-3 d-grid d-md-block text-md-end">
                  <Button 
                    variant="primary" 
                    className="shadow-sm w-100 w-md-auto py-2 py-md-1" 
                    style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} 
                    onClick={() => handleShowCursoModal()}
                  >
                    <i className="bi bi-plus-lg me-1"></i> Nuevo Curso
                  </Button>
                </div>
              </div>

              <Table responsive hover className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Código</th>
                    <th>Nombre del Curso</th>
                    <th>Nivel (Categoría)</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cursosFiltrados.map(c => (
                    <tr key={c.id}>
                      <td><Badge bg="secondary">{c.codigo}</Badge></td>
                      <td className="fw-medium">{c.nombre}</td>
                      <td>{c.nombre_categoria || 'Sin nivel'}</td>
                      <td className="text-end text-nowrap">
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowCursoModal(c)}>
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteCurso(c.id)}>
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {cursosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-5">
                         <i className="bi bi-search fs-1 d-block mb-2 opacity-50"></i>
                         No se encontraron cursos con esa búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Tab>

            {/* --- PESTAÑA 2: NIVELES (CATEGORÍAS) --- */}
            <Tab eventKey="niveles" title={<><i className="bi bi-layers me-2"></i>Niveles</>}>
              
              {/* ENCABEZADO Y BUSCADOR RESPONSIVE */}
              <div className="row align-items-center mb-3 g-3">
                <div className="col-12 col-md-4">
                  <h5 className="mb-0 fw-bold">Categorías de Agrupación</h5>
                </div>
                <div className="col-12 col-md-5">
                  <InputGroup className="shadow-sm">
                    <InputGroup.Text className="bg-white border-end-0"><i className="bi bi-search text-muted"></i></InputGroup.Text>
                    <Form.Control
                      placeholder="Buscar por nombre de nivel..."
                      className="border-start-0 ps-0"
                      value={busquedaCategoria}
                      onChange={(e) => setBusquedaCategoria(e.target.value)}
                    />
                  </InputGroup>
                </div>
                <div className="col-12 col-md-3 d-grid d-md-block text-md-end">
                  <Button 
                    variant="primary" 
                    className="shadow-sm w-100 w-md-auto py-2 py-md-1" 
                    style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} 
                    onClick={() => handleShowCatModal()}
                  >
                    <i className="bi bi-plus-lg me-1"></i> Nuevo Nivel
                  </Button>
                </div>
              </div>

              <div className="w-100 w-lg-75">
                <Table responsive hover className="align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Nombre del Nivel (Ej: Kids, Seniors)</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriasFiltradas.map(cat => (
                      <tr key={cat.id}>
                        <td className="text-muted">#{cat.id}</td>
                        <td className="fw-medium">{cat.nombre}</td>
                        <td className="text-end text-nowrap">
                          <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowCatModal(cat)}>
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteCategoria(cat.id)}>
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {categoriasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-5">
                          <i className="bi bi-search fs-1 d-block mb-2 opacity-50"></i>
                          No se encontraron niveles con esa búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Tab>

          </Tabs>
        </Card.Body>
      </Card>

      {/* --- MODAL PARA CATEGORÍAS --- */}
      <Modal show={showCatModal} onHide={() => setShowCatModal(false)} centered>
        <Form onSubmit={handleSaveCategoria}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold text-dark"><i className="bi bi-layers me-2 text-primary"></i>{catEditId ? 'Editar Nivel' : 'Crear Nivel'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Nombre del Nivel <span className="text-danger">*</span></Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Ej: Teens, First Certificate..." 
                value={catNombre} 
                onChange={(e) => setCatNombre(e.target.value)} 
                required 
                className="shadow-sm"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="outline-secondary" onClick={() => setShowCatModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} className="fw-bold px-4 shadow-sm">Guardar Nivel</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* --- MODAL PARA CURSOS --- */}
      <Modal show={showCursoModal} onHide={() => setShowCursoModal(false)} centered>
        <Form onSubmit={handleSaveCurso}>
          <Modal.Header closeButton className="bg-light">
            <Modal.Title className="fw-bold text-dark"><i className="bi bi-book me-2 text-primary"></i>{cursoEditId ? 'Editar Curso Base' : 'Crear Curso Base'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">Código del Curso <span className="text-danger">*</span></Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Ej: S01, K02" 
                value={cursoCodigo} 
                onChange={(e) => setCursoCodigo(e.target.value)} 
                required 
                className="shadow-sm"
              />
              <Form.Text className="text-muted small"><i className="bi bi-info-circle me-1"></i>Este código debe ser único y exacto al que uses en la carga masiva de Excel.</Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">Nombre Completo <span className="text-danger">*</span></Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Ej: Seniors 1 (Adultos)" 
                value={cursoNombre} 
                onChange={(e) => setCursoNombre(e.target.value)} 
                required 
                className="shadow-sm"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-medium">Nivel / Categoría <span className="text-danger">*</span></Form.Label>
              <Form.Select 
                value={cursoCategoriaId} 
                onChange={(e) => setCursoCategoriaId(e.target.value)} 
                required
                className="shadow-sm border-primary"
              >
                <option value="">Seleccione un nivel...</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="outline-secondary" onClick={() => setShowCursoModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }} className="fw-bold px-4 shadow-sm">Guardar Curso</Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </div>
  );
};

export default GestionCursos;