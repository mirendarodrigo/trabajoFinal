import React, { useState } from 'react';
import { Card, Button, Form, Spinner, Alert, Breadcrumb, Row, Col,Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const CargarAlumnos = () => {
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null); // Guardará un objeto { tipo: 'success' | 'danger', mensaje: '' }

  const handleFileChange = (e) => {
    setArchivo(e.target.files[0]);
    setResultado(null); // Limpiamos mensajes anteriores si elige un nuevo archivo
  };

  const handleSubirExcel = async (e) => {
    e.preventDefault();
    
    if (!archivo) {
      toast.error("⚠️ Por favor, selecciona un archivo Excel (.xlsx)");
      return;
    }

    setCargando(true);
    setResultado(null);

    // Para enviar archivos, necesitamos usar FormData en lugar de un objeto JSON normal
    const formData = new FormData();
    formData.append('file', archivo);

    try {
      const response = await api.post('upload-alumnos/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Fundamental para enviar archivos
        },
      });

      setResultado({
        tipo: 'success',
        mensaje: response.data.mensaje || "¡Base de datos actualizada correctamente!"
      });
      toast.success("¡Carga masiva exitosa!");
      
      // Limpiamos el formulario
      setArchivo(null);
      e.target.reset(); 

    } catch (error) {
      console.error("Error al subir Excel:", error);
      const errorMsg = error.response?.data?.error || "Ocurrió un error al procesar el archivo. Revisa que el formato sea correcto.";
      setResultado({
        tipo: 'danger',
        mensaje: errorMsg
      });
      toast.error("Error en la importación");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/dashboard" }}>Inicio</Breadcrumb.Item>
        <Breadcrumb.Item active>Carga Masiva</Breadcrumb.Item>
      </Breadcrumb>

      <div className="mb-4">
        <h2 className="fw-bold text-dark">
          <i className="bi bi-cloud-arrow-up-fill me-2 text-piccadilly-blue"></i> Importar Alumnos
        </h2>
        <p className="text-muted">Inscribe múltiples alumnos a la vez subiendo un archivo Excel.</p>
      </div>

      <Row>
        {/* COLUMNA IZQUIERDA: Formulario de subida */}
        <Col xs={12} lg={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4 p-md-5 text-center">
              
              <div className="display-1 text-muted mb-4">
                <i className="bi bi-file-earmark-excel text-success"></i>
              </div>
              
              <h4 className="fw-bold mb-3" style={{ color: '#0b2265' }}>Subir archivo de inscripciones</h4>
              <p className="text-muted mb-4">Solo se aceptan archivos en formato <strong>.xlsx</strong> o <strong>.xls</strong></p>

              <Form onSubmit={handleSubirExcel}>
                <Form.Group controlId="formFile" className="mb-4 text-start">
                  <Form.Control 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange}
                    size="lg"
                    className="border-primary shadow-sm"
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    size="lg" 
                    className="fw-bold" 
                    style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }}
                    disabled={cargando || !archivo}
                  >
                    {cargando ? (
                      <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" /> Procesando filas...</>
                    ) : (
                      <><i className="bi bi-upload me-2"></i> Procesar e Inscribir</>
                    )}
                  </Button>
                </div>
              </Form>

              {/* Mensajes de éxito o error */}
              {resultado && (
                <Alert variant={resultado.tipo} className="mt-4 text-start border-start border-4 shadow-sm">
                  <i className={`bi ${resultado.tipo === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger'} me-2`}></i>
                  {resultado.mensaje}
                </Alert>
              )}

            </Card.Body>
          </Card>
        </Col>

        {/* COLUMNA DERECHA: Instrucciones para el usuario */}
        <Col xs={12} lg={6} className="mb-4">
          <Card className="border-0 shadow-sm bg-light h-100">
            <Card.Body className="p-4 p-md-5">
              <h5 className="fw-bold text-dark mb-4">
                <i className="bi bi-info-circle me-2 text-danger"></i> Instrucciones de formato
              </h5>
              
              <p className="text-muted">
                El archivo Excel debe contener una hoja principal con la primera fila como cabecera (nombres de las columnas). 
                Es <strong>estrictamente necesario</strong> que existan las siguientes columnas:
              </p>

              <ul className="list-group list-group-flush mb-4 shadow-sm rounded">                
                <li className="list-group-item bg-white"><Badge bg="secondary" className="me-2">APELLIDO</Badge> <span className="text-muted small">Apellidos del alumno</span></li>
                <li className="list-group-item bg-white"><Badge bg="secondary" className="me-2">NOMBRE</Badge> <span className="text-muted small">Nombres del alumno</span></li>
                <li className="list-group-item bg-white"><Badge bg="secondary" className="me-2">DNI</Badge> <span className="text-muted small">Número de documento (sin puntos)</span></li>
                <li className="list-group-item bg-white"><Badge bg="secondary" className="me-2">EMAIL</Badge> <span className="text-muted small">Correo electrónico real del alumno</span></li>
                <li className="list-group-item bg-white"><Badge bg="secondary" className="me-2">CODIGO_CURSO</Badge> <span className="text-muted small">Código exacto del curso (Ej: K01, S02, etc.)</span></li>
              </ul>

              <Alert variant="warning" className="border-warning border-start border-4 bg-white shadow-sm mb-0">
                <i className="bi bi-lightbulb-fill text-warning me-2"></i>
                <strong>¿Qué sucede al procesar?</strong> El sistema creará una cuenta para el alumno usando su DNI como usuario y contraseña. Luego, lo inscribirá automáticamente en la comisión activa del año actual que coincida con el código del curso.
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CargarAlumnos;