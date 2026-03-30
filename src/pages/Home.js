import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <Container>
      <h1 className="text-center my-5">Интернет-магазин светотехники</h1>
      <Row className="mb-5">
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Каталог товаров</Card.Title>
              <Card.Text>
                Ознакомьтесь с нашим ассортиментом светотехники
              </Card.Text>
              <Link to="/catalog">
                <Button variant="primary">Перейти в каталог</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Оставить заявку</Card.Title>
              <Card.Text>
                Не нашли нужный товар? Оставьте заявку
              </Card.Text>
              <Link to="/contacts">
                <Button variant="primary">Оставить заявку</Button>
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;