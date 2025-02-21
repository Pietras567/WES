import {DataSource} from "typeorm";
import {ProductItem} from "./entities/ProductItem";
import {Category} from "./entities/Category";
import {Order} from './entities/Order';
import {Product} from './entities/Product';
import {OrderStatus} from './entities/OrderStatus';
import {User} from "./entities/User"
import "reflect-metadata";
import {Opinion} from "./entities/Opinion";
import {Account} from "./entities/Account";
import app from "./app"
import "./restMethods/CategoryMethods";
import "./restMethods/InitialisationMethods";
import "./restMethods/OpinionMethods";
import "./restMethods/ProductMethods";
import "./restMethods/OrderMethods";
import "./restMethods/SeoOptimalisationMethods";
import "./restMethods/StatusMethods";
import "./restMethods/UserAccountMethods";


/**
 * AppDataSource is an instance of the DataSource class, configured to connect to a PostgreSQL database.
 * It establishes a database connection using the specified host, port, username, password, and database name.
 *
 * Configuration details include:
 * - type: Specifies the database type ("postgres").
 * - host: The hostname or IP address of the database server ("localhost").
 * - port: The port number on which the database server is running (5432).
 * - username: The username used for database authentication ("AJI").
 * - password: The password used for database authentication ("AJI").
 * - database: The name of the database being connected to ("AJI").
 * - synchronize: Automatically synchronize the database schema with the entities (true).
 * - logging: Enable logging for database operations (true).
 * - entities: Specifies the entities/models that will be used in this data source.
 */
export let AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "AJI",
    password: "AJI",
    database: "AJI",
    synchronize: true,
    logging: true,
    // entities: ['./entities/*.{js,ts}'],
    entities: [Category, ProductItem, Order, Product, OrderStatus, User, Opinion, Account],

});

/**
 * Updates the AppDataSource to a new instance.
 *
 * @param {DataSource} newDataSource - The new DataSource instance to use.
 */
export function updateDataSource(newDataSource: DataSource): void {
    AppDataSource = newDataSource;
}

/**
 * Initializes the database connection and starts the server.
 *
 * @return {Promise<void>} A promise that resolves when the server has successfully started and the database connection is established.
 */
async function startServer() {
    try {
        console.log(AppDataSource.options.entities);

        await AppDataSource.initialize();
        console.log("Database connection established.");

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error during Data Source initialization:", error);
    }
}

/**
 * Initializes the predefined order statuses for the system.
 * Creates and adds a list of order statuses to the system by calling an asynchronous function for each status.
 *
 * @return {Promise<void>} A promise that resolves when all order statuses have been initialized.
 */
async function initializeOrderStatuses() {

    const statuses = [
        "NotApproved",
        "Approved",
        "Cancelled",
        "Executed",
    ];

    for (const name of statuses) {
        await addOrderStatus(name);
    }
    console.log("Order statuses initialized successfully.");
}

/**
 * Adds a new order status to the database if it does not already exist.
 *
 * @param {string} name - The name of the order status to add.
 * @return {Promise<void>} A promise that resolves when the operation is complete.
 */
async function addOrderStatus(name: string) {
    const orderStatusRepository = AppDataSource.getRepository(OrderStatus);

    // @ts-ignore
    const existingStatus = await orderStatusRepository.findOneBy({_currentStatus: name});

    if (!existingStatus) {
        const newStatus = new OrderStatus(name);
        await orderStatusRepository.save(newStatus);
        console.log(`Status '${name}' added.`);
    } else {
        console.log(`Status '${name}' already exists.`);
    }
}

/**
 * Initializes a predefined list of categories by adding each category
 * asynchronously and logs a success message upon completion.
 *
 * @return {Promise<void>} A promise that resolves when all categories have
 * been initialized successfully.
 */
async function initializeCategories() {
    const categories = [
        "Electronics",
        "Clothing",
        "Books",
        "Toys",
    ];

    for (const name of categories) {
        await addCategory(name);
    }

    console.log("Categories initialized successfully.");
}

/**
 * Adds a new category to the repository if it does not already exist.
 *
 * @param {string} name - The name of the category to be added.
 * @return {Promise<void>} A promise that resolves when the category is added or if it already exists.
 */
async function addCategory(name: string,) {
    const categoryRepository = AppDataSource.getRepository(Category);

    // @ts-ignore
    const existingCategory = await categoryRepository.findOneBy({_name: name});

    if (!existingCategory) {
        const newCategory = new Category(name);
        await categoryRepository.save(newCategory);
        console.log(`Category '${name}' added.`);
    } else {
        console.log(`Category '${name}' already exists.`);
    }
}

startServer()
    .then(() => initializeOrderStatuses())
    .then(() => initializeCategories())
    .then(() => {
        console.log("Server started.");
    })
    .catch((error) => {
        console.error("Error occured:", error);
    });
