import { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom'; // <--- AGREGAMOS Link AQUÍ
import { login } from '../../services/auth';
import toast from 'react-hot-toast';

const LoginModal = ({ show, handleClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await login(username, password);

    if (result.success) {
      toast.success('¡Bienvenido de nuevo!');
      handleClose(); // Se cierra la ventana modal
      
      // Le damos un parpadeo a React para que guarde el token tranquilo y viaje
      setTimeout(() => {
        navigate('/dashboard'); 
      }, 100);

    } else {
      setError(result.error || 'Credenciales incorrectas');
    }
    setLoading(false);
  };

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-piccadilly-blue">Acceso Campus</Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="p-4">
        <p className="text-muted small mb-4">
          Ingresa tu DNI como usuario. Si es tu primera vez, tu contraseña también es tu DNI.
        </p>

        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium text-piccadilly-blue">Usuario / DNI</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: 12345678"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-medium text-piccadilly-blue">Contraseña</Form.Label>
            <Form.Control
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <div className="d-grid">
            <Button className="btn-piccadilly py-2" type="submit" disabled={loading} size="lg">
              {loading ? <Spinner animation="border" size="sm" /> : 'Ingresar'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
      
      <Modal.Footer className="border-0 justify-content-center pt-0 pb-4">
        {/* --- ENLACE DE RECUPERACIÓN CONECTADO --- */}
        <Button 
          variant="link" 
          as={Link} 
          to="/recuperar-password" 
          onClick={handleClose} 
          className="text-decoration-none text-muted small" 
          size="sm"
        >
          ¿Olvidaste tu contraseña?
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LoginModal;