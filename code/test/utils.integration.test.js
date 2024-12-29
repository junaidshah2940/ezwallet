import { categories } from '../models/model';
import { transactions } from '../models/model';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Group } from '../models/User';
import jwt from 'jsonwebtoken';
import { verifyAuth, handleDateFilterParams, handleAmountFilterParams } from '../controllers/utils';


dotenv.config();

beforeAll(async () => {
    const dbName = "testingDatabaseUtils";
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
}, process.env.ACCESS_KEY, { expiresIn: '-1s' })
const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, { expiresIn: "1y" })
//Sto modificando utils.integration.js
describe("utils.js", () => {
    describe("verifyAuth", () => {
        /**
         * When calling verifyAuth directly, we do not have access to the req and res objects created by express, so we must define them manually
         * An object with a "cookies" field that in turn contains "accessToken" and "refreshToken" is sufficient for the request
         * The response object is untouched in most cases, so it can be a simple empty object
         */
        test("Tokens are both valid and belong to the requested user", () => {
            //The only difference between access and refresh token is (in practice) their duration, but the payload is the same
            //Meaning that the same object can be used for both
            const req = { cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid } }
            const res = {}
            //The function is called in the same way as in the various methods, passing the necessary authType and other information
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            //The response object must contain a field that is a boolean value equal to true, it does not matter what the actual name of the field is
            //Checks on the "cause" field are omitted since it can be any string
            expect(Object.values(response).includes(true)).toBe(true)
        })

        test("Undefined tokens", () => {
            const req = { cookies: {} }
            const res = {}
            const response = verifyAuth(req, res, { authType: "Simple" })
            //The test is passed if the function returns an object with a false value, no matter its name
            expect(Object.values(response).includes(false)).toBe(true)
        })
        
        test("Access token expired and refresh token belonging to the requested user", () => {
            const req = { cookies: { accessToken: testerAccessTokenExpired, refreshToken: testerAccessTokenValid } }
            //The inner working of the cookie function is as follows: the response object's cookieArgs object values are set
            const cookieMock = (name, value, options) => {
                res.cookieArgs = { name, value, options };
            }
            //In this case the response object must have a "cookie" function that sets the needed values, as well as a "locals" object where the message must be set 
            const res = {
                cookie: cookieMock,
                locals: {},
            }
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            //The response must have a true value (valid refresh token and expired access token)
            expect(Object.values(response).includes(true)).toBe(true)
            expect(res.cookieArgs).toEqual({
                name: 'accessToken', //The cookie arguments must have the name set to "accessToken" (value updated)
                value: expect.any(String), //The actual value is unpredictable (jwt string), so it must exist
                options: { //The same options as during creation
                    httpOnly: true,
                    path: '/api',
                    maxAge: 60 * 60 * 1000,
                    sameSite: 'none',
                    secure: true,
                },
            })
            //The response object must have a field that contains the message, with the name being either "message" or "refreshedTokenMessage"
            // console.log(res.locals)
            const message = res.locals.refreshedTokenMessage ? true : res.locals.message ? true : false
            expect(message).toBe(true)
        })

        test("Access token is missing information", () => {
            const req = { cookies: { accessToken: testerAccessTokenEmpty, refreshToken: testerAccessTokenValid } }
            const res = {}
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(Object.values(response).includes(false)).toBe(true)
        })

        test("Refresh token is missing information", () => {
            const req = { cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenEmpty } }
            const res = {}
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(Object.values(response).includes(false)).toBe(true)
        })

        test("Access token and refresh token mismatch", () => {
            const req = { cookies: { accessToken: testerAccessTokenValid, refreshToken: adminAccessTokenValid } }
            const res = {}
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(Object.values(response).includes(false)).toBe(true)
        })

        test("Tokens are valid but belong to anothe user", () => {
            const req = { cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid } }
            const res = {}
            const response = verifyAuth(req, res, { authType: "User", username: "admin" })
            expect(Object.values(response).includes(false)).toBe(true)
        })

        test("Tokens are valid but user is not an admin", () => {
            const req = { cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid } }
            const res = {}
            const response = verifyAuth(req, res, { authType: "Admin" })
            expect(Object.values(response).includes(false)).toBe(true)
        })

        test("Tokens are valid but user belongs to another group", () => {
            const req = { cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid } }
            const res = {}
            const emails = ["notyou@mock.mock"]
            const response = verifyAuth(req, res, { authType: "Group", emails: emails })
            expect(Object.values(response).includes(false)).toBe(true)
        })

        test("Invalid auth type", () => {
            const req = { cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid } }
            const res = {}
            const response = verifyAuth(req, res, { authType: "Invalid" })
            expect(Object.values(response).includes(false)).toBe(true)
        })

        test("Tokens are both valid and belong to the requested group", () => {
            const req = { cookies: { accessToken: testerAccessTokenValid, refreshToken: testerAccessTokenValid } }
            const res = {}
            const emails = ["tester@test.com", "mockemail@mock.mock"]
            const response = verifyAuth(req, res, { authType: "Group", emails: emails })
            expect(Object.values(response).includes(true)).toBe(true)
        })

        test("Tokens are both valid and belong to the requested admin", () => {
            const req = { cookies: { accessToken: adminAccessTokenValid, refreshToken: adminAccessTokenValid } }
            const res = {}
            const response = verifyAuth(req, res, { authType: "Admin" })
            expect(Object.values(response).includes(true)).toBe(true)
        })

        /**
         * The only situation where the response object is actually interacted with is the case where the access token must be refreshed
         */


        test("Both tokens are expired", () => {
            const req = { cookies: { accessToken: testerAccessTokenExpired, refreshToken: "not valid token" } }
            const res = {}
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(Object.values(response).includes(false)).toBe(true)
        })

        test("Both tokens are expired", () => {
            const req = { cookies: { accessToken: testerAccessTokenExpired, refreshToken: testerAccessTokenExpired } }
            const res = {}
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(Object.values(response).includes(false)).toBe(true)
        })
    })

    describe('handleAmountFilterParams', () => {
        test('should return an empty object if no query parameters are provided', () => {
          const req = { query: {} };
          const result = handleAmountFilterParams(req);
          expect(result).toEqual({});
        });
      
        test('should return a query object with $gte property if min query parameter is provided', () => {
          const req = { query: { min: '100' } };
          const result = handleAmountFilterParams(req);
          expect(result).toEqual({ amount: { $gte: 100 } });
        });
      
        test('should return a query object with $lte property if max query parameter is provided', () => {
          const req = { query: { max: '500' } };
          const result = handleAmountFilterParams(req);
          expect(result).toEqual({ amount: { $lte: 500 } });
        });

        test('should return a query object with $gte and $lte properties if both min and max query parameters are provided', () => {
            const req = { query: { min: '100', max: '500' } };
            const result = handleAmountFilterParams(req);
            expect(result).toEqual({ amount: { $gte: 100, $lte: 500 } });
        });

        test('should return an error if min is NaN (min and max provided)', () => {
            const req = { query: { min: 'not a number', max: '100' } };
            expect(() => handleAmountFilterParams(req)).toThrow()
        });

        test('should return an error if max is NaN (min and max provided)', () => {
            const req = { query: { min: '100', max: 'NaN' } };
            expect(() => handleAmountFilterParams(req)).toThrow()
        });

        test('should return an error if min is NaN (only min provided)', () => {
            const req = { query: { min: 'NaN'} };
            expect(() => handleAmountFilterParams(req)).toThrow()
        });

        test('should return an error if max is NaN (only max provided)', () => {
            const req = { query: { max: 'NaN'} };
            expect(() => handleAmountFilterParams(req)).toThrow()
        });
    });

    describe('handleDateFilterParams', () => {
        test('should return an empty object if no query parameters are provided', () => {
          const req = { query: {} };
          const result = handleDateFilterParams(req);
          expect(result).toEqual({});
        });
      
        test('should return a query object with $gte and $lte properties if date query parameter is provided', () => {
          const req = { query: { date: '2023-04-30' } };
          const result = handleDateFilterParams(req);
          expect(result).toEqual({
            date: {
              $gte: new Date('2023-04-30T00:00:00.000Z'),
              $lte: new Date('2023-04-30T23:59:59.999Z'),
            },
          });
        });
      
        test('should return a query object with $gte property if from query parameter is provided', () => {
          const req = { query: { from: '2023-04-30' } };
          const result = handleDateFilterParams(req);
          expect(result).toEqual({
            date: {
              $gte: new Date('2023-04-30T00:00:00.000Z'),
            },
          });
        });
      
        test('should return a query object with $lte property if upTo query parameter is provided', () => {
          const req = { query: { upTo: '2023-04-30' } };
          const result = handleDateFilterParams(req);
          expect(result).toEqual({
            date: {
              $lte: new Date('2023-04-30T23:59:59.999Z'),
            },
          });
        });

        test('should return error when passing both date and from or date and upTo', () => {
            const req = { query: { date: '2023-04-30', upTo: '2023-04-30' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });

        test('should return error when passing date not in a valid date format YYYY-MM-DD', () => {
            const req = { query: { date: 'first of January 2001' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });
        test('should return error when passing from not in a valid date format YYYY-MM-DD', () => {
            const req = { query: { from: 'first of January 2001' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });
        test('should return error when passing upTo not in a valid date format YYYY-MM-DD', () => {
            const req = { query: { upTo: 'first of January 2001' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });

        test('should return error when passing date not as an existing date', () => {
            const req = { query: { date: '2023-04-32' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });
        test('should return error when passing from not as an existing date', () => {
            const req = { query: { from: '2023-04-32' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });
        test('should return error when passing upTo not as an existing date', () => {
            const req = { query: { upTo: '2023-04-32' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });

        /////
        test('should return error when passing both date and upTo', () => {
            const req = { query: { date: '2023-04-30', upTo: '2023-04-30' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });
        test('should return error when passing both date and from', () => {
            const req = { query: { date: '2023-04-30', from: '2023-04-30' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });
        test('should return error when passing date, from and upTo', () => {
            const req = { query: { date: '2023-04-30', from: '2023-04-30', upTo: '2023-04-30' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });
    });
})