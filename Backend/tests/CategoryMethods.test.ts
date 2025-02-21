import app from '../src/app';
import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {ProductItem} from "../src/entities/ProductItem";
import {Order} from "../src/entities/Order";
import {Product} from "../src/entities/Product";
import {OrderStatus} from "../src/entities/OrderStatus";
import {User} from "../src/entities/User";
import {Opinion} from "../src/entities/Opinion";
import {Account} from "../src/entities/Account";
import {AppDataSource} from "../src";
import {updateDataSource} from "../src";

const { Client } = require("pg");
const { Category } = require("../src/entities/Category");

const request = require('supertest');

describe('GET /categories', () => {
    jest.setTimeout(60000);

    let container: StartedPostgreSqlContainer;
    let dataSource: DataSource;

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
    });

    it('should return a list of categories', async () => {
        // Przygotuj testowe dane
        const categoryRepository = dataSource.getRepository(Category);
        await categoryRepository.save({
            _name: 'Test Category',
            //description: 'Test Description'
        });

        const response = await request(app).get('/categories');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        console.log("Categories: \n", response.body);
    });
});
