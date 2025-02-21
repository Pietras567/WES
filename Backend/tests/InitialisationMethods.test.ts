import {Account} from "../src/entities/Account";

const request = require('supertest');
import app from '../src/app';
import {AppDataSource, updateDataSource} from '../src';
import { Product } from '../src/entities/Product';
import { Category } from '../src/entities/Category';
import jwt from 'jsonwebtoken';
import {Opinion} from "../src/entities/Opinion";
import {User} from "../src/entities/User";
import {OrderStatus} from "../src/entities/OrderStatus";
import {ProductItem} from "../src/entities/ProductItem";
import {Order} from "../src/entities/Order";
import {DataSource} from "typeorm";
import {PostgreSqlContainer, StartedPostgreSqlContainer} from "@testcontainers/postgresql";
import path from "node:path";
//require('dotenv').config({path: '../src/secret.env'});
require('dotenv').config({ path: path.resolve(__dirname, '../src/secret.env') });

describe('Initialization Endpoints', () => {
    jest.setTimeout(60000);

    let container: StartedPostgreSqlContainer;
    let dataSource: DataSource;
    let authToken: string;

    beforeAll(async () => {
        // Uruchom kontener PostgreSQL
        container = await new PostgreSqlContainer()
            .withUsername('test')
            .withPassword('test')
            .withDatabase('testdb')
            .start();

        // Konfiguracja połączenia TypeORM
        dataSource = new DataSource({
            type: 'postgres',
            url: container.getConnectionUri(),
            entities: [Category, ProductItem, Order, Product, OrderStatus, User, Opinion, Account],
            synchronize: true,
            logging: false
        });

        updateDataSource(dataSource);

        // Inicjalizacja połączenia
        await dataSource.initialize();
    });

    afterAll(async () => {
        // Zamknij połączenie i zatrzymaj kontener
        if (dataSource && dataSource.isInitialized) {
            await dataSource.destroy();
        }
        if (container) {
            await container.stop();
        }
    });

    beforeEach(async () => {
        // Wyczyść dane przed każdym testem
        if (dataSource && dataSource.isInitialized) {
            await dataSource.synchronize(true);
        }

        const account = new Account(
            'testManager', 'testManager', 'MANAGER')
        await AppDataSource.getRepository(Account).save(account);
        const user = new User(
            'testManager', 'testManager@gmail.com', '123456789', account)
        await AppDataSource.getRepository(Account).save(account);
        await AppDataSource.getRepository(User).save(user);

        // Tworzenie tokenu testowego dla managera
        authToken = jwt.sign(
            { id: account.id, userName: 'testManager', accountType: 'MANAGER' },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );
    });

    describe('POST /init', () => {
        it('should initialize the products when the base is empty', async () => {
            // Przygotowanie danych testowych
            const testProducts = [
                {
                    name: "Test Product",
                    description: "Test Description",
                    price: 100,
                    weight: 1.5,
                    categoryId: 1
                }
            ];

            // Utworzenie kategorii przed testem
            const category = new Category("Test Category");
            await AppDataSource.getRepository(Category).save(category);

            // Wywołanie endpointu
            const response = await request(app)
                .post('/init')
                .set('Cookie', `authToken=${authToken}`)
                .send(testProducts);

            // Sprawdzenie odpowiedzi
            expect(response.status).toBe(200);
            expect(response.body.message).toBe("Products initialized.");

            // Sprawdzenie czy produkt został zapisany w bazie
            const savedProducts = await AppDataSource.getRepository(Product).find();
            expect(savedProducts.length).toBe(1);
            expect(savedProducts[0].name).toBe("Test Product");
        });

        it('should return an error when products already exist', async () => {
            // Najpierw dodajemy produkt do bazy
            const category = new Category("Test Category");
            await AppDataSource.getRepository(Category).save(category);

            const existingProduct = new Product(
                "Existing Product",
                "Description",
                100,
                1.5,
                category
            );
            await AppDataSource.getRepository(Product).save(existingProduct);

            // Próba inicjalizacji z nowymi produktami
            const testProducts = [
                {
                    name: "Test Product",
                    description: "Test Description",
                    price: 100,
                    weight: 1.5,
                    categoryId: category.id
                }
            ];

            const response = await request(app)
                .post('/init')
                .set('Cookie', `authToken=${authToken}`)
                .send(testProducts);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe("Database already contains products.");
        });

        it('should return an error for invalid product data', async () => {
            const category = new Category("Test Category");
            await AppDataSource.getRepository(Category).save(category);

            // Produkty z nieprawidłowymi danymi (brak wymaganych pól)
            const invalidProducts = [
                {
                    name: "", // puste pole name
                    description: "Test Description",
                    price: -100, // nieprawidłowa cena
                    weight: 1.5,
                    categoryId: category.id
                }
            ];

            const response = await request(app)
                .post('/init')
                .set('Cookie', `authToken=${authToken}`)
                .send(invalidProducts);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain("Product name cannot be empty.");
        });

        it('should return an error for a non-existent category', async () => {
            const testProducts = [
                {
                    name: "Test Product",
                    description: "Test Description",
                    price: 100,
                    weight: 1.5,
                    categoryId: 999 // nieistniejące ID kategorii
                }
            ];

            const response = await request(app)
                .post('/init')
                .set('Cookie', `authToken=${authToken}`)
                .send(testProducts);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe("Category not found.");
        });
    });
});