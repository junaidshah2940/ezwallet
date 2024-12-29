import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import {login, logout, register, registerAdmin} from "../controllers/auth.js";
import {verifyAuth} from "../controllers/utils.js";
const bcrypt = require("bcryptjs")

jest.mock("bcryptjs")
jest.mock('../models/User.js');

beforeEach(() => {
    jest.clearAllMocks()

    //additional `mockClear()` must be placed here
});

jest.mock("../controllers/utils.js", ()=> ({
    verifyAuth: jest.fn()
}))

describe('register', () => {

    test('Should return a message that confirm the user registration', async () => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        }
        mockReq.body = {
            username: "test1",
            email : "test1@test1.com",
            password : "123456"
        }


        jest.spyOn(User, "create").mockImplementation(()=> true)

        await register(mockReq,mockRes);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data : {message: "User added successfully"}
        }))
    });

    test("Should return an error: The request body does not contain all the necessary attributes", async ()=> {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };

        mockReq.body = {user : "name"};
        jest.spyOn(User, "findOne").mockReturnValue({});

        await register(mockReq,mockRes);


        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
        expect(mockRes.status).toHaveBeenCalledWith(400)

    });

    test("Should return an error: at least one of the parameters in the request body is an empty string", async ()=> {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };

        mockReq.body = {username : "", email: "mario.red@email.com", password: "securePass"};
        jest.spyOn(User, "findOne").mockReturnValue({});

        await register(mockReq,mockRes);


        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
        expect(mockRes.status).toHaveBeenCalledWith(400)
    });

    test("Should return an error: the email in the request body is not in a valid email format", async ()=> {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };

        mockReq.body = {username : "mario", email: "mario.redemail.com", password: "securePass"};
        jest.spyOn(User, "findOne").mockReturnValue({});

        await register(mockReq,mockRes);


        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
        expect(mockRes.status).toHaveBeenCalledWith(400)
    });


    test("Should return an error: users already register", async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };
        mockReq.body= {username: "Mario", email: "mario.red@email.com", password: "securePass"};

        jest.spyOn(User, "findOne").mockReturnValue({username: 'Mario', email: "mario.vvv@email.com", password: "securePass"})

        await register(mockReq,mockRes);

        expect(User.findOne).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });

    test("Should return an error: This email is already registered", async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };
        mockReq.body= {username: "Mario", email: "mario.red@email.com", password: "securePass"};

        jest.spyOn(User, "findOne").mockReturnValueOnce(null)
        jest.spyOn(User, "findOne").mockReturnValueOnce({username: 'Michele', email: "mario.red@email.com", password: "securePass"})

        await register(mockReq,mockRes);

        expect(User.findOne).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });

    test("Should return an error: This username is already registered", async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };
        mockReq.body= {username: "Mario", email: "mario.red@email.com", password: "securePass"};

        jest.spyOn(User, "findOne").mockReturnValueOnce(null)
        jest.spyOn(User, "findOne").mockReturnValue({username: 'Mario', email: "mario.res@email.com", password: "securePass"})

        await register(mockReq,mockRes);

        expect(User.findOne).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });

    test("should return 500 if an error occurs", async () => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        }
        mockReq.body = {
            username: "test1",
            email : "test1@test1.com",
            password : "123456"
        }

        User.findOne = jest.fn().mockImplementation(()=> {throw new Error("mock error")})
        jest.spyOn(User, "create").mockImplementation(()=> {throw new Error("mock error")})

        await register(mockReq,mockRes);
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
        expect(mockRes.status).toHaveBeenCalledWith(500)
        
    });
});

describe("registerAdmin", () => {

    test('Should return a message that confirm the admin registration', async () => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        }
        mockReq.body = {
            username: "admin",
            email: "admin@email.com",
            password: "securePass"
        }

        jest.spyOn(User, "create").mockImplementation(()=> true)
        User.findOne = jest.fn().mockReturnValue(false)

        await registerAdmin(mockReq,mockRes);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data : expect.objectContaining({
                message:expect.any(String),
            })
        }))
        expect(mockRes.status).toHaveBeenCalledWith(200)
        
    });

    test("Should return an error: The request body does not contain all the necessary attributes", async ()=> {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };

        mockReq.body = {user : "name"};
        jest.spyOn(User, "findOne").mockReturnValue({});

        await registerAdmin(mockReq,mockRes);


        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
        expect(mockRes.status).toHaveBeenCalledWith(400)

    });

    test("Should return an error: at least one of the parameters in the request body is an empty string", async ()=> {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };

        mockReq.body = {username : "    ", email: "mario.red@email.com", password: "securePass"};
        jest.spyOn(User, "findOne").mockReturnValue({});

        await registerAdmin(mockReq,mockRes);


        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
        expect(mockRes.status).toHaveBeenCalledWith(400)
    });

    test("Should return an error: the email in the request body is not in a valid email format", async ()=> {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };

        mockReq.body = {username : "mario", email: "mario.redemail.com", password: "securePass"};
        jest.spyOn(User, "findOne").mockReturnValue({});

        await registerAdmin(mockReq,mockRes);


        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
        expect(mockRes.status).toHaveBeenCalledWith(400)
    });

    test("Should return an error: users already register (username)", async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };
        mockReq.body= {username: "Mario", email: "mario.red@email.com", password: "securePass"};

        jest.spyOn(User, "findOne").mockReturnValue({username: 'Mario', email: "mario.vvv@email.com", password: "securePass"})

        await registerAdmin(mockReq,mockRes);

        expect(User.findOne).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });

    test("Should return an error: users already register (email)", async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };
        mockReq.body= {username: "Mario", email: "mario.red@email.com", password: "securePass"};

        jest.spyOn(User, "findOne")
            .mockReturnValueOnce(false)
            .mockReturnValueOnce({username: 'Giovanni', email: "mario.red@email.com", password: "securePass"})

        await registerAdmin(mockReq,mockRes);

        expect(User.findOne).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });

    test("Should return an error: This email is already registered", async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };
        mockReq.body= {username: "Mario", email: "mario.red@email.com", password: "securePass"};

        jest.spyOn(User, "findOne").mockReturnValue({username: 'Michele', email: "mario.red@email.com", password: "securePass"})

        await registerAdmin(mockReq,mockRes);

        expect(User.findOne).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });

    test("Should return an error: This email is already registered", async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        };
        mockReq.body= {username: "Mario", email: "mario.red@email.com", password: "securePass"};

        jest.spyOn(User, "findOne").mockReturnValue({username: 'Mario', email: "mario.red@email.com", password: "securePass"})

        await registerAdmin(mockReq,mockRes);

        expect(User.findOne).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });

    test("should return 500 if an error occurs", async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            }
        }
        mockReq.body = {
            username: "admin",
            email: "admin@email.com",
            password: "securePass"
        }

        jest.spyOn(User, "create").mockImplementation(() => {throw new Error("mock error")})
        User.findOne = jest.fn().mockReturnValue(false)

        await registerAdmin(mockReq,mockRes);
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
        expect(mockRes.status).toHaveBeenCalledWith(500)
    });
})

describe('login', () => { 
    test('Should return accessToken and refreshToken', async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        const existingUser = {
            email: 'test@example.com',
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        mockReq.body= existingUser;

        jest.spyOn(User, "findOne").mockReturnValue(existingUser)
        jest.spyOn(bcrypt, "compare").mockReturnValue(true);
        jest.spyOn(jwt,"sign").mockReturnValue("abc");
        await login(mockReq,mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({data: expect.objectContaining({
            accessToken : expect.any(String),
            refreshToken : expect.any(String)
        })}))
        expect(mockRes.cookie).toHaveBeenCalledTimes(2);
    });

    test("should return 400 if wrong credentials", async() => {
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        const existingUser = {
            email: 'test@example.com',
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        mockReq.body= existingUser;

        jest.spyOn(User, "findOne").mockReturnValue(false)
        jest.spyOn(bcrypt, "compare").mockReturnValue(true);
        jest.spyOn(jwt,"sign").mockReturnValue("abc");
        await login(mockReq,mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error : expect.any(String)}))
    });


    test('Should return an error with code 400 cause: missing body field', async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        const existingUser = {
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        mockReq.body= existingUser;

        jest.spyOn(User, "findOne").mockReturnValue(existingUser)
        jest.spyOn(bcrypt, "compare").mockReturnValue(true);
        jest.spyOn(jwt,"sign").mockReturnValue("abc");
        await login(mockReq,mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });


    test('Should return an error with code 400 cause: empty string', async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        const existingUser = {
            email: "    ",
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        mockReq.body= existingUser;

        jest.spyOn(User, "findOne").mockReturnValue(existingUser)
        jest.spyOn(bcrypt, "compare").mockReturnValue(true);
        jest.spyOn(jwt,"sign").mockReturnValue("abc");
        await login(mockReq,mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });


    test('Should return an error with code 400 cause: wrong format', async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        const existingUser = {
            email: "ciaociao",
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        mockReq.body= existingUser;

        jest.spyOn(User, "findOne").mockReturnValue(existingUser)
        jest.spyOn(bcrypt, "compare").mockReturnValue(true);
        jest.spyOn(jwt,"sign").mockReturnValue("abc");
        await login(mockReq,mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });


    test('Should return an error with code 400 cause: wrong password', async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        const existingUser = {
            email: "ciao@ciao.com",
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        mockReq.body= existingUser;

        jest.spyOn(User, "findOne").mockReturnValue(true)
        jest.spyOn(bcrypt, "compare").mockReturnValue(false);
        jest.spyOn(jwt,"sign").mockReturnValue("abc");
        await login(mockReq,mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });

    test("should return 500 if an error occurs", async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        const existingUser = {
                    email: 'test@example.com',
                    password: 'hashed_password', // Password già hashata
                    save: jest.fn().mockReturnValue(true)
                };
        mockReq.body = existingUser;
        jest.spyOn(User, 'findOne').mockImplementation(() => true);
        bcrypt.compare = jest.fn().mockImplementation(() => {throw new Error("mock error")})
        await login(mockReq,mockRes);
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
        expect(mockRes.status).toHaveBeenCalledWith(500)
    });


});

describe('logout', () => {

    test('Should return a message that confirm the logout', async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        mockReq.cookies = {
            accessToken : "abc",
            refreshToken :"abc"
        }
        const existingUser = {
            email: "ciao@ciao.com",
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
        jest.spyOn(User, "findOne").mockReturnValue(existingUser)
        await logout(mockReq,mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            data : {message: "User logged out"}
        }))
    });


    test('Should return a message that confirm the logout', async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        mockReq.cookies = {
            accessToken : "abc"
        }
        const existingUser = {
            email: "ciao@ciao.com",
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
        jest.spyOn(User, "findOne").mockReturnValue(existingUser)
        await logout(mockReq,mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });


    test('Should return a message that confirm the logout', async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        mockReq.cookies = {
            accessToken : "abc",
            refreshToken : "abc"
        }
        const existingUser = {
            email: "ciao@ciao.com",
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
        jest.spyOn(User, "findOne").mockReturnValue(false)
        await logout(mockReq,mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            error : expect.any(String)
        }))
    });

    test("should return 401 if not authorized", async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        mockReq.cookies = {
            accessToken : "abc",
            refreshToken :"abc"
        }
        const existingUser = {
            email: "ciao@ciao.com",
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
        jest.spyOn(User, "findOne").mockReturnValue(existingUser)
        await logout(mockReq,mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({error: "Unauthorized"})
    });

    test("should return 500 if an error occurs", async ()=>{
        const mockReq = {};
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshToken"
            },
            cookie: jest.fn().mockImplementation(()=> true)
        };
        mockReq.cookies = {
            accessToken : "abc",
            refreshToken :"abc"
        }
        const existingUser = {
            email: "ciao@ciao.com",
            password: 'hashed_password', // Password già hashata
            save: jest.fn().mockReturnValue(true)
        };
        verifyAuth.mockImplementation(() => {throw new Error("mock error")})
        jest.spyOn(User, "findOne").mockReturnValue(existingUser)
        await logout(mockReq,mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
});
