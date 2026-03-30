import { useState } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { supabase } from '../supabase';

const Contacts = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('requests')
        .insert([
          {
            name: formData.name,
            phone: formData.phone,
            description: formData.description,
            created_at: new Date()
          }
        ])
      
      if (error) throw error;
      alert('Заявка успешно отправлена!');
      setFormData({ name: '', phone: '', description: '' });
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Ошибка при отправке заявки');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Container>
      <h1 className="text-center my-5">Оставить заявку</h1>
      <Row className="justify-content-center">
        <Col md={6}>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Имя</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Телефон</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Описание товара</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Button type="submit" disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить заявку'}
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
};

export default Contacts;