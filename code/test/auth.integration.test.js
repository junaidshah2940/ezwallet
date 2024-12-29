import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
const bcrypt = require("bcryptjs")
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

beforeAll(async () => {
  const dbName = "testingDatabaseAuth";
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
    await User.deleteMany({})
})

const testerAccessTokenValid = jwt.sign({
    email: "tester@test.com",
    username: "tester",
    role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

const testerAccessTokenExpired = jwt.sign({
    email: "tester@test.com",
    username: "tester",
    role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '0s' })
const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, { expiresIn: "1y" })


describe('register', () => {

    test("Register a user, should return a message : User added successfully", async () => {

        const response = await request(app)
            .post("/api/register")
            .send({username: "Mario", email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(200)
        expect(response.body.data).toEqual({message: "User added successfully"})
    })

    test("Register a user without the necessary attributes, should return an error with code 400", async () => {

        const response = await request(app)
            .post("/api/register")
            .send({email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Register a user already registered, should return an error with code 400", async () => {

        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: "hashedPassword"})

        const response = await request(app)
            .post("/api/register")
            .send({username: "depa",email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })
    test("Register a user with of the parameters in the request body is an empty string, should return an error with code 400", async () => {

        const response = await request(app)
            .post("/api/register")
            .send({username: "  ", email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Register a user with the request body is not in a valid email format, should return an error with code 400", async () => {

        const response = await request(app)
            .post("/api/register")
            .send({username: "Mario", email: "mario.redemail.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })


    test("Register a user with the request body is not in a valid email format, should return an error with code 400", async () => {

        await User.insertMany({username: "Mario", email: "mario.redemail.com", password: "securePass"})
        const response = await request(app)
            .post("/api/register")
            .send({username: "Mario", email: "mario.blue@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Register a user with a username in the request body identifies an already existing user, should return an error with code 400", async () => {
        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: "securePass"})
        const response = await request(app)
            .post("/api/register")
            .send({username: "Depa", email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Register a user with a username in the request body identifies an already existing user, should return an error with code 400", async () => {
        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: "securePass"})
        const response = await request(app)
            .post("/api/register")
            .send({username: "Mario", email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })



    test("Register a user with a username in the request body identifies an already existing user, should return an error with code 500", async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
        const response = await request(app)
            .post("/api/register")
            .send({username: "Depa", email: "mario.red@email.com", password: "securePass"})
        const dbName = "testingDatabaseAuth";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)

    })
});





describe("registerAdmin", () => {

    test("Register an admin, should return a message : User added successfully", async () => {

        const response = await request(app)
            .post("/api/admin")
            .send({username: "Mario", email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(200)
        expect(response.body.data).toEqual({message: "User added successfully"})
    })

    test("Register an admin without the necessary attributes, should return an error with code 400", async () => {

        const response = await request(app)
            .post("/api/admin")
            .send({email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })
    test("Register an admin with of the parameters in the request body is an empty string, should return an error with code 400", async () => {

        const response = await request(app)
            .post("/api/admin")
            .send({username: "  ", email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Register an admin with the request body is not in a valid email format, should return an error with code 400", async () => {

        const response = await request(app)
            .post("/api/admin")
            .send({username: "Mario", email: "mario.redemail.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })


    test("Register an admin with the request body is not in a valid email format, should return an error with code 400", async () => {

        await User.insertMany({username: "Mario", email: "mario.redemail.com", password: "securePass"})
        const response = await request(app)
            .post("/api/admin")
            .send({username: "Mario", email: "mario.blue@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })

    test("Register an admin with a username in the request body identifies an already existing user, should return an error with code 400", async () => {

        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: "securePass"})
        const response = await request(app)
            .post("/api/admin")
            .send({username: "Depa", email: "mario.red@email.com", password: "securePass"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    })
    test("Register a user with a username in the request body identifies an already existing user, should return an error with code 500", async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
        const response = await request(app)
            .post("/api/admin")
            .send({username: "Mario", email: "mario.red@email.com", password: "securePass"})
        const dbName = "testingDatabaseAuth";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)

    })
})

describe('login', () => {
    test("Performing the login , should return an object : {accessToken : ValidAccessToken, refreshToken: ValidRefreshToken}", async () => {
        const password = "securePass"
        const hashedPassword = await bcrypt.hash(password, 12);

        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: hashedPassword})

        const response = await request(app)
            .post("/api/login")
            .send({email: "mario.red@email.com", password: password})
        expect(response.status).toBe(200)
        //expect(response.body).toBe(true);
        expect(response.body.data).toEqual({accessToken:expect.any(String), refreshToken : expect.any(String)})
    });
    test("Performing the login with a request body that does not contain all the necessary attributes, should return an error with code 400", async () => {
        const password = "securePass"
        const hashedPassword = await bcrypt.hash(password, 12);

        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: hashedPassword})

        const response = await request(app)
            .post("/api/login")
            .send({password: password})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test("Performing the login with one of the parameters in the request body is an empty string, should return an error with code 400", async () => {
        const password = "securePass"
        const hashedPassword = await bcrypt.hash(password, 12);

        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: hashedPassword})

        const response = await request(app)
            .post("/api/login")
            .send({email: "  ", password: password})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test("Performing the login with the email in the request body does not identify a user in the database, should return an error with code 400", async () => {
        const password = "securePass"
        const hashedPassword = await bcrypt.hash(password, 12);


        const response = await request(app)
            .post("/api/login")
            .send({email: "test@test.com", password: password})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test("Performing the login with the email in the request body that has not in a valid email format, should return an error with code 400", async () => {
        const password = "securePass"
        const hashedPassword = await bcrypt.hash(password, 12);

        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: hashedPassword})

        const response = await request(app)
            .post("/api/login")
            .send({email: "testtest.com", password: password})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test("Performing the login with a wrong password, should return an error with code 400", async () => {
        const password = "securePass"
        const hashedPassword = await bcrypt.hash(password, 12);

        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: hashedPassword})

        const response = await request(app)
            .post("/api/login")
            .send({email: "mario.red@email.com", password: "securePassword"})
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Performing the login , should return an object : {accessToken : ValidAccessToken, refreshToken: ValidRefreshToken}", async () => {
        const password = "securePass"
        const hashedPassword = await bcrypt.hash(password, 12);

        await User.insertMany({username: "Mario", email: "mario.red@email.com", password: hashedPassword})
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
        const response = await request(app)
            .post("/api/login")
            .send({email: "mario.red@email.com", password: password})
        const dbName = "testingDatabaseAuth";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

});

describe('logout', () => {

    test("Performing the logout, should return a message : User logged out", async () => {

        await User.insertMany({
            username : "tester",
            email: "tester@tester.tester",
            password : "securePass",
            refreshToken: testerAccessTokenValid
        })

        const response = await request(app)
            .get("/api/logout")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(200)
        expect(response.body.data).toEqual({message: "User logged out"})
    });


    test("Performing the logout without refreshToken setted, should return an error with code 400", async () => {

        await User.insertMany({
            username : "tester",
            email: "tester@tester.tester",
            password : "securePass",
            refreshToken: testerAccessTokenValid
        })

        const response = await request(app)
            .get("/api/logout")
            .set("Cookie", `accessToken=${testerAccessTokenValid};`)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });
    test("Performing the logout without refreshToken invalid, should return an error with code 401", async () => {

        await User.insertMany({
            username : "tester",
            email: "tester@tester.tester",
            password : "securePass",
            refreshToken: testerAccessTokenValid
        })

        const response = await request(app)
            .get("/api/logout")
            .set("Cookie", `accessToken=1234567;refreshToken=12345`)
        expect(response.status).toBe(401)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

    test("Performing the logout without refreshToken setted, should return an error with code 400", async () => {


        const response = await request(app)
            .get("/api/logout")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
        expect(response.status).toBe(400)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });


    test("Performing the logout without the database, should return an error: 500", async () => {

        await User.insertMany({
            username : "tester",
            email: "tester@tester.tester",
            password : "securePass",
            refreshToken: testerAccessTokenValid
        })

        await mongoose.connection.close();

        const response = await request(app)
            .get("/api/logout")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)

        const dbName = "testingDatabaseAuth";
        const url = `${process.env.MONGO_URI}/${dbName}`;

        await mongoose.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        expect(response.status).toBe(500)
        const errorMessage = response.body.error ? true : response.body.message ? true : false
        expect(errorMessage).toBe(true)
    });

});
