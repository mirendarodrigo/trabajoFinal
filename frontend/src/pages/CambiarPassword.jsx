import React, { useState } from 'react';
import { Card, Form, Button, Container, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios'; // Ajusta la ruta a tu axios si es necesario

const CambiarPassword = () => {
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (nuevaPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      // Hacemos el POST al endpoint que acabamos de crear
      await api.post('usuarios/cambiar_password/', {
        nueva_password: nuevaPassword
      });

      toast.success("¡Contraseña actualizada con éxito!", { duration: 4000 });
      
      // Destruimos el token viejo (que decía debe_cambiar_password = true)
      // y mandamos al usuario al login para que entre con su nueva clave
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      setTimeout(() => {
        navigate('/?changed=true'); // Lo mandamos a la landing
      }, 1500);

    } catch (error) {
      toast.error("Hubo un error al actualizar tu contraseña.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light" style={{ backgroundColor: '#0b2265' }}>
      <Container className="d-flex justify-content-center">
        <Card className="border-0 shadow-lg" style={{ maxWidth: '450px', width: '100%', borderRadius: '15px' }}>
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <div className="bg-danger text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-shield-lock-fill fs-2"></i>
              </div>
              <h3 className="fw-bold text-dark">Cambio de Seguridad</h3>
              <p className="text-muted small">Por motivos de seguridad, debes cambiar tu contraseña predeterminada para acceder al campus.</p>
            </div>

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-medium small text-muted text-uppercase">Nueva Contraseña</Form.Label>
                <Form.Control 
                  type="password" 
                  placeholder="Mínimo 6 caracteres" 
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  required
                  className="shadow-sm py-2"
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-medium small text-muted text-uppercase">Repetir Contraseña</Form.Label>
                <Form.Control 
                  type="password" 
                  placeholder="Vuelve a escribirla" 
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  required
                  className="shadow-sm py-2"
                />
              </Form.Group>

              <div className="d-grid">
                <Button 
                  variant="primary" 
                  type="submit" 
                  size="lg" 
                  className="fw-bold shadow-sm"
                  style={{ backgroundColor: '#0b2265', borderColor: '#0b2265' }}
                  disabled={cargando}
                >
                  {cargando ? <Spinner animation="border" size="sm" /> : 'Actualizar y Continuar'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default CambiarPassword;