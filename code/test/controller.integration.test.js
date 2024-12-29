import request from 'supertest';
import { app } from '../app';
import { categories } from '../models/model';
import { transactions } from '../models/model';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Group } from '../models/User';
import jwt from 'jsonwebtoken';
import { verifyAuth, handleDateFilterParams } from '../controllers/utils';



dotenv.config();

beforeAll(async () => {
    const dbName = "testingDatabaseController";
    const url = `${process.env.MONGO_URI}/${dbName}`;

    await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

});

afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
});

//necessary setup to ensure that each test can insert the data it needs
beforeEach(async () => {
    await categories.deleteMany({})
    await transactions.deleteMany({})
    await User.deleteMany({})
    await Group.deleteMany({})
    jest.clearAllMocks();
})

/**
 * Alternate way to create the necessary tokens for authentication without using the website
 */
const adminAccessTokenValid = jwt.sign({
    email: "admin@email.com",
    //id: existingUser.id, The id field is not required in any check, so it can be omitted
    username: "admin",
    role: "Admin"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

const testerAccessTokenValid = jwt.sign({
    email: "tester@test.com",
    username: "tester",
    role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

//These tokens can be used in order to test the specific authentication error scenarios inside verifyAuth (no need to have multiple authentication error tests for the same route)
const testerAccessTokenExpired = jwt.sign({
    email: "tester@test.com",
    username: "tester",
    role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '0s' })
const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, { expiresIn: "1y" })

describe("createCategory", () => {

    test("Creating a category, should return an object : {data: {type: \"food\", color: \"red\"}}", async () => {

        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "food", color: "red" })
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("type")
        expect(response.body.data).toHaveProperty("color")
    });

    test("Creating a category with the request body that does not contain all the necessary attributes, should return an errore with code 400", async () => {


        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ color: "red" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Creating a category with at least one of the parameters in the request body is an empty string, should return an errore with code 400", async () => {

        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "  ", color: "red" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Creating a category with the type of category passed in the request body represents an already existing category in the database, should return an errore with code 400", async () => {
        await categories.insertMany(
            {
                type: "test",
                color: "blue"
            })

        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "test", color: "red" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Creating a category called by an authenticated user who is not an admin, should return an errore with code 401", async () => {

        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ type: "test", color: "red" })
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Creating a category, should return a 500 error in case the db is not responding", async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
        const response = await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "food", color: "red" })
        expect(response.status).toBe(500)
        expect(response.body).toHaveProperty("error")
        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

    });
})

describe("updateCategory", () => {
    test('Updating a category, should return an object {data: {message: "Category edited successfully", count: 2}, refreshedTokenMessage: res.locals.refreshedTokenMessage}', async () => {
        await categories.insertMany(
            {
                type: "Food",
                color: "blue"
            })
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }])
        const response = await request(app)
            .patch("/api/categories/Food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "Food", color: "yellow" })
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
        expect(response.body.data).toHaveProperty("count", 2)
    });

    test('Updating a category with request body that does not contain all the necessary attributes, should return an errore with code 400', async () => {
        await categories.insertMany(
            {
                type: "Food",
                color: "blue"
            })
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }])
        const response = await request(app)
            .patch("/api/categories/Food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ color: "yellow" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Updating a category with at least one of the parameters in the request body is an empty string, should return an errore with code 400', async () => {
        await categories.insertMany(
            {
                type: "Food",
                color: "blue"
            })
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }])
        const response = await request(app)
            .patch("/api/categories/Food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "  ", color: "yellow" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Updating a category with a wrong route, should return an errore with code 400', async () => {
        await categories.insertMany(
            {
                type: "Food",
                color: "blue"
            })
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }])
        const response = await request(app)
            .patch("/api/categories/Foodie")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "Food", color: "yellow" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Updating a category with the type of category passed in the request body as the new type represents an already existing category in the database, should return an errore with code 400', async () => {
        await categories.insertMany([
            {
                type: "Drink",
                color: "purple"
            }, {
                type: "Food",
                color: "blue"
            }])
        const response = await request(app)
            .patch("/api/categories/Food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "Drink", color: "yellow" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Updating a category with the type of category passed in the request body as the new type represents an already existing category in the database, should return an errore with code 200', async () => {
        await categories.insertMany([
             {
                type: "Food",
                color: "blue"
            }])
        const response = await request(app)
            .patch("/api/categories/Food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "Drink", color: "yellow" })
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
        expect(response.body.data).toHaveProperty("count", 0)
    });

    test('Updating a category with the type of category passed in the request body from a user that is not an admin, should return an errore with code 401', async () => {
        await categories.insertMany(
            {
                type: "Food",
                color: "blue"
            })
        const response = await request(app)
            .patch("/api/categories/Food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ type: "Food", color: "yellow" })
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Updating a category, should return a 500 error in case the db is not responding', async () => {
        await categories.insertMany(
            {
                type: "Food",
                color: "blue"
            })
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }])

        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
        const response = await request(app)
            .patch("/api/categories/Food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "Food", color: "yellow" })
        expect(response.status).toBe(500)
        expect(response.body).toHaveProperty("error")
        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;
        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });
})




describe("deleteCategory", () => {

    test('Delete a category, should return an object {data: {message: "Categories deleted", count: 1}', async () => {
        await categories.insertMany([
            {
                type: "health",
                color: "blue"
            },
            {
                type: "Food",
                color: "yellow"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["health", "Food"] })
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
        expect(response.body.data).toHaveProperty("count")
    });

    test('Delete a category, should return a 400 error in case the request body contains an empty array', async () => {
        await categories.insertMany([
            {
                type: "health",
                color: "blue"
            },
            {
                type: "Food",
                color: "yellow"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: [] })
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("message")
    });

    test('Delete a category with N > T to assign the oldest category to the transactions left', async () => {
        await categories.insertMany([
            {
                type: "health",
                color: "blue"
            },
            {
                type: "Food",
                color: "yellow"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["health"] })
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
        expect(response.body.data).toHaveProperty("count")
    });

    test('Delete a category with an empty body, should return an error with code 400 ', async () => {
        await categories.insertMany([
            {
                type: "health",
                color: "blue"
            },
            {
                type: "Food",
                color: "yellow"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Delete a category called when there is only one category in the database, should return an error with code 400 ', async () => {
        await categories.insertMany(
            {
                type: "Food",
                color: "yellow"
            })
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["Food"] })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Delete a category called when at least one of the types in the array is an empty string, should return an error with code 400 ', async () => {
        await categories.insertMany([
            {
                type: "health",
                color: "blue"
            },
            {
                type: "Food",
                color: "yellow"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["  ", "Food"] })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });


    test('Delete a category called when at least one of the types in the array does not represent a category in the database, should return an error with code 400 ', async () => {
        await categories.insertMany([
            {
                type: "health",
                color: "blue"
            },
            {
                type: "Food",
                color: "yellow"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["Drink", "Food"] })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Delete a category called when at least one of the types in the array does not represent a category in the database, should return an error with code 400 ', async () => {
        await categories.insertMany([
            {
                type: "health",
                color: "blue"
            },
            {
                type: "Food",
                color: "yellow"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ types: ["health", "Food"] })
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Delete a category, should return a 500 error if the db is not responding', async () => {
        await categories.insertMany([
            {
                type: "health",
                color: "blue"
            },
            {
                type: "Food",
                color: "yellow"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
        const response = await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ["health", "Food"] })
        expect(response.status).toBe(500)
        expect(response.body).toHaveProperty("error")

        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;
        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

})

describe("getCategories", () => {
    test('Get a category, should return an object {data: [{type: "food", color: "red"}, {type: "health", color: "green"}', async () => {
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });

    test('Get a category without a valid accessToken and refreshToken, should return an error with code 401', async () => {
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/categories")
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Get a category, should return an error 500', async () => {
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();


        const response = await request(app)
            .get("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)

        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;


        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

})

describe("createTransaction", () => {

    test('Get a category, should return an object {data: [{type: "food", color: "red"}, {type: "health", color: "green"}', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: 100, type: "food" })
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("username")
        expect(response.body.data).toHaveProperty("amount")
        expect(response.body.data).toHaveProperty("type")
        expect(response.body.data).toHaveProperty("date")
    });

    test('Get a category without all the necessary attributes, should return an error 400', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ amount: 100, type: "food" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Create a transaction with an invalid user in the req params should return an error 400', async () => {

        await User.insertMany([
            {
                email: "test@test.com",
                username: "test",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ amount: 100, type: "food", username: "test" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Get a category with a empty string, should return an error 400', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "  ", amount: 100, type: "food" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });


    test('Get a category with a wrong category, should return an error 400', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: 100, type: "drink" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Get a category with a different username between the route and the body, should return an error with code 400', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }, {
                email: "tester1@test1.com",
                username: "tester1",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester1", amount: 100, type: "food" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });


    test('Get a category with a wrong username passed in the body, should return an error with code 400', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester2", amount: 100, type: "food" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Get a category with a wrong username passed in the route, should return an error with code 400', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester2",
                password: "securePass",
                role: "Regular"
            }, {
                email: "tester1@test1.com",
                username: "tester1",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester2", amount: 100, type: "food" })
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
        expect(response.status).toBe(400)

    });


    test('Get a category with the amount passed in the request body that cannot be parsed as a floating value, should return an error with code 400', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: "c", type: "food" })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Get a category with the amount passed in the request body that cannot be parsed as a floating value, should return an error with code 400', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }, {
                email: "tester1@test1.com",
                username: "tester1",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        const response = await request(app)
            .post("/api/users/tester1/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester1", amount: 100, type: "food" })
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Get a category, should return an error 500', async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }])
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])

        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();

        const response = await request(app)
            .post("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: "tester", amount: 100, type: "food" })
        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });


})

describe("getAllTransactions", () => {
    test('Get all transactions, should return an object {data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"},' +
        '{username: "Mario", amount: 70, type: "health", date: "2023-05-19T10:00:00", color: "green"}, ' +
        '{username: "Luigi", amount: 20, type: "food", date: "2023-05-19T10:00:00", color: "red"} ],' +
        ' refreshedTokenMessage: res.locals.refreshedTokenMessage}', async () => {
            await categories.insertMany([
                {
                    type: "Food",
                    color: "red"
                },
                {
                    type: "health",
                    color: "green"
                }])
            await transactions.insertMany([{
                username: "test",
                type: "Food",
                amount: 100
            }, {
                username: "test",
                type: "health",
                amount: 100
            }, {
                username: "test",
                type: "Food",
                amount: 100
            }, {
                username: "test",
                type: "health",
                amount: 100
            }])
            const response = await request(app)
                .get("/api/transactions")
                .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            expect(response.status).toBe(200)
            expect(Array.isArray(response.body.data)).toBe(true)
        });
    test("Get all Transactions called by an authenticated user who is not an admin, should return an errore with code 401", async () => {

        const response = await request(app)
            .get("/api/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Should return an error with code 500", async () => {
        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();

        const response = await request(app)
            .get("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)

        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });


        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

})

describe("getTransactionsByUser", () => {
    test('Get all transactions, should return an object that contains all the transaction from the user tester ', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });
    test('Get all transactions, should return an object that contains all the transaction from the user tester ', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/users/tester/transactions?date=2020-12-01")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });
    test('Get all transactions, should return an object that contains all the transaction from the user tester ', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/users/tester/transactions?min=10")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });
    test('Get all transactions, should return an object that contains all the transaction from the user tester ', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/users/tester/transactions?date=2020-10-04&min=10")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });

    test('Get all transactions, should return an object that contain all the transactions from the user Mario', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "Mario",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/transactions/users/Mario")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });
    test('Get all transactions, should return an object that contain all the transactions from the user Mario', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "Mario",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "Mario",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/transactions/users/Mario")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });

    test("Get user Transactions called by a wrong route, should return an error with code 400", async () => {

        const response = await request(app)
            .get("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Get user Transactions called by a different user, should return an error with code 401", async () => {

        const response = await request(app)
            .get("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Get user Transactions called by a wrong route, should return an error with code 400", async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }
        )
        const response = await request(app)
            .get("/api/transactions/users/Mario")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Get user Transactions called by admin inserting the wrong username, should return an error with code 400", async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "admin"
            }
        )

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        const response = await request(app)
            .get("/api/transactions/users/Mario")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });


    test('Get all transactions, should return an error 500 ', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();


        const response = await request(app)
            .get("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)

        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)

    });


})

describe("getTransactionsByUserByCategory", () => {
    test('Get all transactions, should return an object that contains all the transaction from the user tester ', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "tester",
            type: "Food",
            amount: 100
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "food",
            amount: 100
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/users/tester/transactions/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });
    test('Get all transactions, should return an object that contain all the transactions from the user Mario', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "Mario",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/transactions/users/Mario/category/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });
    test('Get all transactions, should return an object that contains no transactions  ', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "food",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test1",
            type: "food",
            amount: 100
        }, {
            username: "test1",
            type: "food",
            amount: 100
        }, {
            username: "test1",
            type: "Food",
            amount: 100
        }, {
            username: "test1",
            type: "food",
            amount: 100
        }])
        const response = await request(app)
            .get("/api/users/tester/transactions/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });

    test("Get user Transactions called by a wrong username in the route, should return an error with code 400", async () => {
        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        const response = await request(app)
            .get("/api/users/tester/transactions/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });


    test("Get user Transactions called by a wrong category in the route, should return an error with code 400", async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        const response = await request(app)
            .get("/api/users/tester/transactions/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Get user Transactions called by a different username in the route, should return an error with code 400", async () => {

        await User.insertMany([
            {
                email: "tester@test.com",
                username: "Mario",
                password: "securePass",
                role: "Regular"
            }, {
                email: "tester1@test1.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            }]);

        const response = await request(app)
            .get("/api/users/Mario/transactions/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Get user Transactions called by a different username being a user, should return an error with code 400", async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "Mario",
                password: "securePass",
                role: "Regular"
            });

        const response = await request(app)
            .get("/api/transactions/users/Mario/category/:category")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('Get all transactions, should return an error 500', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();

        const response = await request(app)
            .get("/api/users/tester/transactions/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)


        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });


        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)

    });

})

describe("getTransactionsByGroup", () => {


    test('should retrive all the transactions of the user of a group', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        const group = await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        const response = await request(app)
            .get("/api/groups/Family/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });
    test('should retrive all the transactions of the user of a group for an admin', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        const group = await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        const response = await request(app)
            .get("/api/transactions/groups/Family")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });

    test('request with a wrong gorup name in the url, should retrive an error 400', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        const group = await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        const response = await request(app)
            .get("/api/transactions/groups/family")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });


    test('request with a user not an admin, should retrieve an error 401', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        const group = await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        const response = await request(app)
            .get("/api/transactions/groups/Family")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test('request with a user not authorized, should retrieve an error 401', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "Food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        const group = await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester1@test1.com"
            }]
        }])
        const response = await request(app)
            .get("/api/groups/Family/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test('should return an error 500', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        const group = await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();

        const response = await request(app)
            .get("/api/groups/Family/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)

        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

})

describe("getTransactionsByGroupByCategory", () => {


    test('should retrive all the transactions of the user of a group by categories', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        const group = await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        const response = await request(app)
            .get("/api/groups/Family/transactions/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });
    test('should retrive all the transactions of the user of a group for an admin', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "test",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        const response = await request(app)
            .get("/api/transactions/groups/Family/category/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(Array.isArray(response.body.data)).toBe(true)
    });


    test('get transactions by group with a wrong group in the route, by category should retrive an error with code 400', async () => {
        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        const response = await request(app)
            .get("/api/transactions/groups/Families/category/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('get transactions by group with a wrong category in the route , by category should retrive an error with code 400', async () => {
        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        const response = await request(app)
            .get("/api/transactions/groups/Family/category/foodie")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('get transactions by group with a user does present in the group but with using an admin route, by category should retrive an error with code 401', async () => {
        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        const response = await request(app)
            .get("/api/transactions/groups/Family/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('get transactions by group with a user does not present in the group , by category should retrive an error with code 401', async () => {
        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester1@test1.com"
            }]
        }])
        const response = await request(app)
            .get("/api/groups/Family/transactions/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('should retrive an error 500', async () => {

        await User.insertMany(
            {
                email: "tester@test.com",
                username: "tester",
                password: "securePass",
                role: "Regular"
            });

        await categories.insertMany([
            {
                type: "food",
                color: "red"
            },
            {
                type: "health",
                color: "green"
            }])
        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }])

        const group = await Group.insertMany([{
            name: "Family",
            members: [{
                email: "tester@test.com"
            }]
        }])
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
        const response = await request(app)
            .get("/api/groups/Family/transactions/category/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)

        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

})

describe("deleteTransaction", () => {
    test('deleting a transaction (USER)', async () => {
        var id = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ _id: id.toString() })
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
    });
    test('deleting a transaction', async () => {
        var id = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _id: id.toString() })
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
    });

    test('deleting a transaction without a proper body', async () => {
        var id = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        },{
            username: "test",
            type: "health",
            amount: 100
        },{
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        },{
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
 });

    test('deleting a transaction without a proper body', async () => {
        var id = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        },{
            username: "test",
            type: "health",
            amount: 100
        },{
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        },{
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({_id:"   "})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test('deleting a transaction passing a wrong route', async () => {
        var id = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/users/Mario/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ _id: id.toString() })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('deleting a transaction with a wrong id', async () => {
        var id = new mongoose.Types.ObjectId();
        var id2 = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ _id: id2.toString() })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });


    test('deleting a transaction made by a different user', async () => {
        var id = new mongoose.Types.ObjectId();
        var id2 = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }, {
            username: "tester1",
            email: "tester1@test1.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id2
        }, {
            username: "tester1",
            type: "health",
            amount: 100,
            _id: id
        }])
        const response = await request(app)
            .delete("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ _id: id.toString() })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('deleting a transaction with a wrong username in the route', async () => {
        var id = new mongoose.Types.ObjectId();
        var id2 = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }, {
            username: "tester1",
            email: "tester1@test1.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester1",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/users/tester1/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ _id: id.toString() })
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test('deleting a transaction, should return error 500', async () => {
        var id = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])

        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();

        const response = await request(app)
            .delete("/api/users/tester/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ _id: id.toString() })

        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
})

describe("deleteTransactions", () => {
    test('deleting transactions', async () => {
        var id = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _ids: [id.toString()] })
        expect(response.status).toBe(200)
        expect(response.body.data).toHaveProperty("message")
    });

    test('deleting transactions without the proper body', async () => {
        var id = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('deleting a transaction passing an empty id', async () => {
        var id = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])

        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _ids: [" ", "  "] })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('deleting transactions with a wrong id in the ids array', async () => {
        var id = new mongoose.Types.ObjectId();
        var id2 = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _ids: [id.toString(), id2.toString()] })
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test('deleting a transaction with a wrong username in the route', async () => {
        var id = new mongoose.Types.ObjectId();
        var id2 = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }, {
            username: "tester1",
            email: "tester1@test1.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ _ids: [id.toString()] })
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test('deleting a transaction with a wrong username in the route', async () => {
        var id = new mongoose.Types.ObjectId();
        var id2 = new mongoose.Types.ObjectId();

        await User.insertMany([{
            username: "tester",
            email: "tester@test.com",
            password: "securePassword"
        }])


        await transactions.insertMany([{
            username: "test",
            type: "Food",
            amount: 100
        }, {
            username: "test",
            type: "health",
            amount: 100
        }, {
            username: "tester",
            type: "Food",
            amount: 100,
            _id: id
        }, {
            username: "tester",
            type: "health",
            amount: 100
        }])
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();


        const response = await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _ids: [id.toString(), id2.toString()] })
        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)

        const dbName = "testingDatabaseController";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

    });

})
