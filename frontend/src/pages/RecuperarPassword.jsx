import React, { useState } from 'react';
import { Card, Form, Button, Container, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const RecuperarPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  // Cambiamos email por username (DNI)
  const [username, setUsername] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSolicitar = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      // Hacemos el POST enviando el DNI
      await api.post('solicitar-reset/', { username });
      setEnviado(true);
      toast.success("Solicitud procesada");
    } catch (error) {
      toast.error("Ocurrió un error de red.");
    } finally {
      setCargando(false);
    }
  };

  const handleConfirmar = async (e) => {
    e.preventDefault();
    if (nuevaPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    try {
      await api.post(`confirmar-reset/${uid}/${token}/`, { nueva_password: nuevaPassword });
      toast.success("¡Contraseña restablecida con éxito!");
      setTimeout(() => navigate('/'), 2000); 
    } catch (error) {
      // Ahora mostrará el error específico del backend (Si fue el UID o el Token)
      toast.error(error.response?.data?.error || "El enlace es inválido o expiró.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light" style={{ backgroundColor: '#0b2265' }}>
      <Container className="d-flex justify-content-center">
        <Card className="border-0 shadow-lg" style={{ maxWidth: '450px', width: '100%', borderRadius: '15px' }}>
          <Card.Body className="p-4 p-md-5">
            
            <div className="text-center mb-4">
              <div className="bg-danger text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow" style={{ width: '60px', height: '60px' }}>
                <i className={`bi ${uid && token ? 'bi-key-fill' : 'bi-shield-lock-fill'} fs-2`}></i>
              </div>
              <h3 className="fw-bold text-dark">{uid && token ? 'Nueva Contraseña' : 'Recuperar Acceso'}</h3>
              <p className="text-muted small">
                {uid && token ? 'Ingresa tu nueva contraseña para acceder al campus.' : 'Ingresa tu DNI y te enviaremos un enlace al correo que tienes registrado.'}
              </p>
            </div>

            {!uid || !token ? (
              enviado ? (
                <Alert variant="success" className="text-center border-0 shadow-sm">
                  <i className="bi bi-check-circle-fill fs-3 d-block mb-2"></i>
                  Si el documento <b>{username}</b> existe y tiene un correo asociado, hemos enviado un enlace de recuperación.
                  <p className="small text-muted mt-2 mb-0">Revisa tu bandeja de entrada o carpeta de Spam.</p>
                  <Button variant="link" className="w-100 mt-3 text-decoration-none fw-bold" as={Link} to="/">Volver al inicio</Button>
                </Alert>
              ) : (
                <Form onSubmit={handleSolicitar}>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-medium small text-muted text-uppercase">Documento (DNI)</Form.Label>
                    <Form.Control type="text" placeholder="Ej: 12345678" value={username} onChange={(e) => setUsername(e.target.value)} required />
                  </Form.Group>
                  <Button variant="danger" type="submit" className="w-100 fw-bold py-2 shadow-sm" disabled={cargando}>
                    {cargando ? <Spinner animation="border" size="sm" /> : 'Enviar Enlace'}
                  </Button>
                  <div className="text-center mt-3">
                    <Link to="/" className="text-muted small text-decoration-none"><i className="bi bi-arrow-left me-1"></i> Volver</Link>
                  </div>
                </Form>
              )
            ) : (
              <Form onSubmit={handleConfirmar}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-medium small text-muted text-uppercase">Tu Nueva Contraseña</Form.Label>
                  <Form.Control type="password" placeholder="Mínimo 6 caracteres" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} required />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100 fw-bold py-2 shadow-sm" style={{ backgroundColor: '#0b2265' }} disabled={cargando}>
                  {cargando ? <Spinner animation="border" size="sm" /> : 'Restablecer y Entrar'}
                </Button>
              </Form>
            )}

          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default RecuperarPassword;