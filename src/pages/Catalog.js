import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';

const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
        
        if (error) throw error;
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <Container>Загрузка...</Container>;
  }

  return (
    <Container>
      <h1 className="text-center my-5">Каталог товаров</h1>
      <Row>
        {products.map((product) => (
          <Col md={4} key={product.id} className="mb-4">
            <Card>
              <Card.Img variant="top" src={product.image || 'https://via.placeholder.com/300x200'} />
              <Card.Body>
                <Card.Title>{product.name}</Card.Title>
                <Card.Text>{product.description}</Card.Text>
                <Card.Text>Цена: {product.price} ₽</Card.Text>
                <Button variant="primary" onClick={() => handleRequest(product)}>
                  Оставить заявку
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );

  function handleRequest(product) {
    // Здесь будет логика для заявки
    alert(`Заявка на ${product.name} отправлена!`);
  }
};

export default Catalog;