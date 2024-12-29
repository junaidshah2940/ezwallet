import { categories } from '../models/model';
import { transactions } from '../models/model';
import dotenv from 'dotenv';
import { User, Group } from '../models/User';
import jwt from 'jsonwebtoken';
import { verifyAuth, handleDateFilterParams, handleAmountFilterParams } from '../controllers/utils';

jest.mock('jsonwebtoken');

dotenv.config();

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

beforeEach(() => {
    jest.clearAllMocks()
    //additional `mockClear()` must be placed here
});

describe("utils.js", () => {
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

        test('should return an error if both min and max are invalid', () => {
            const req = { query: { min: 'invalid', max: 'invalid' } };
            expect(() => handleAmountFilterParams(req)).toThrow()
        });

        test('should return an error if invalid amount is provided (min)', () => {
            const req = { query: { min: 'invalid' } };
            expect(() => handleAmountFilterParams(req)).toThrow()
        });

        test('should return an error if invalid amount is provided (max)', () => {
            const req = { query: { max: 'invalid' } };
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

        test('should return error when passing a date not in format YYYY-MM-DD (date)', () => {
            const req = { query: { date: 'First of January 2023' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });

        test('should return error when passing not a date (date)', () => {
            const req = { query: { date: '2023-13-21' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });

        test('should return error when passing a date not in format YYYY-MM-DD (from)', () => {
            const req = { query: { from: 'First of January 2023' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });

        test('should return error when passing not a date (from)', () => {
            const req = { query: { from: '2023-13-21' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });

        test('should return error when passing a date not in format YYYY-MM-DD (upTo)', () => {
            const req = { query: { upTo: 'First of January 2023' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });

        test('should return error when passing not a date (upTo)', () => {
            const req = { query: { upTo: '2023-13-21' } };
            expect(() => handleDateFilterParams(req)).toThrow()
        });
    });

    describe('verifyAuth', () => {
        test("Tokens are both valid and belong to the requested user", () => {
            //The cookies are not actually evaluated in this case, since we are mocking the jwt functions
            //They should still be passed however, since there is a check on their existence
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}

            /**
             * The jwt.verify method is used to decode a token and it returns an object with, among others, these three attributes
             * We can directly have the mocked return value be the requested object
             */
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            //There may be situations where using jest.spyOn() leads to an error (this verify method, the deleteOne/aggregate mongoose methods)
            //This alternate implementation performs the same exact behavior but directly replaces the implementation
            //Any option that does not cause errors can be used, there is no preferred method
            // jwt.verify.mockReturnValue(decodedAccessToken)
            jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)

            //Second alternate option to mock a function's behavior in case jest.spyOn() does not work
            //jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)

            //The function is called in the same way as in the various methods, passing the necessary authType and other information
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            //The response object must contain a field that is a boolean value equal to true, it does not matter what the actual name of the field is
            //Checks on the "cause" field are omitted since it can be any string
            expect(Object.values(response).includes(true)).toBe(true)
        })

        test("Tokens are both valid and belong to the requested admin", () => {
            //The cookies are not actually evaluated in this case, since we are mocking the jwt functions
            //They should still be passed however, since there is a check on their existence
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}

            /**
             * The jwt.verify method is used to decode a token and it returns an object with, among others, these three attributes
             * We can directly have the mocked return value be the requested object
             */
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Admin"
            }
            //There may be situations where using jest.spyOn() leads to an error (this verify method, the deleteOne/aggregate mongoose methods)
            //This alternate implementation performs the same exact behavior but directly replaces the implementation
            //Any option that does not cause errors can be used, there is no preferred method
            // jwt.verify.mockReturnValue(decodedAccessToken)
            jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)

            //Second alternate option to mock a function's behavior in case jest.spyOn() does not work
            //jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)

            //The function is called in the same way as in the various methods, passing the necessary authType and other information
            const response = verifyAuth(req, res, { authType: "Admin", username: "tester" })
            //The response object must contain a field that is a boolean value equal to true, it does not matter what the actual name of the field is
            //Checks on the "cause" field are omitted since it can be any string
            expect(Object.values(response).includes(true)).toBe(true)
        })

        test("Tokens are both valid and belong to the requested group", () => {
            //The cookies are not actually evaluated in this case, since we are mocking the jwt functions
            //They should still be passed however, since there is a check on their existence
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}

            /**
             * The jwt.verify method is used to decode a token and it returns an object with, among others, these three attributes
             * We can directly have the mocked return value be the requested object
             */
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            //There may be situations where using jest.spyOn() leads to an error (this verify method, the deleteOne/aggregate mongoose methods)
            //This alternate implementation performs the same exact behavior but directly replaces the implementation
            //Any option that does not cause errors can be used, there is no preferred method
            // jwt.verify.mockReturnValue(decodedAccessToken)
            jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)

            //Second alternate option to mock a function's behavior in case jest.spyOn() does not work
            //jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)

            //The function is called in the same way as in the various methods, passing the necessary authType and other information
            const response = verifyAuth(req, res, { authType: "Group", emails: ["tester@test.com"] })
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
            const req = { cookies: { accessToken: "testerAccessTokenExpired", refreshToken: "testerAccessTokenValid" } }
            //The inner working of the cookie function is as follows: the response object's cookieArgs object values are set
            const cookieMock = (name, value, options) => {
                res.cookieArgs = { name, value, options };
            }
            //In this case the response object must have a "cookie" function that sets the needed values, as well as a "locals" object where the message must be set 
            const res = {
                cookie: cookieMock,
                locals: {},
            }
            //The first call to verify must fail due to the access token being expired, so we substitute its implementation this way
            //"Once" is needed in order to not have the second check cause a failing scenario 
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            //The check inside verifyAuth depends on the error's name, so this name must be set explicitly
            jwt.verify = jest.fn()
                .mockImplementationOnce((token, secret) => {
                    const error = new Error('TokenExpiredError')
                    error.name = 'TokenExpiredError'
                    throw error
                })
                .mockImplementationOnce(() => decodedAccessToken)
            
            //The second call to verify will return the "decoded" token with the parameters we want
            // jwt.verify.mockReturnValue(decodedAccessToken)
            //The newly created access token should be a string, in this case we only care about the "sign" method returning a string
            jwt.sign = jest.fn().mockReturnValue("refreshedAccessToken")
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            //The response must have a true value (valid refresh token and expired access token)
            // expect(Object.values(response).includes(true)).toBe(true)
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
            const message = res.locals.refreshedTokenMessage ? true : res.locals.message ? true : false
            expect(message).toBe(true)
        })

        test("Access token is missing information", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester"
            }
            jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(response.authorized).toBe(false)
            expect(response.cause).toBe("Token is missing information")
        })

        test("Refresh token is missing information", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            const decodedRefreshToken = {
                email: "tester@test.com",
                username: "tester"
            }
            jwt.verify = jest.fn()
                .mockReturnValueOnce(decodedAccessToken)
                .mockReturnValueOnce(decodedRefreshToken)
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(response.authorized).toBe(false)
            expect(response.cause).toBe("Token is missing information")
        })

        test("Access token and refresh token mismatch", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            const decodedRefreshToken = {
                email: "tester@test.com",
                username: "anotherTester",
                role: "Regular"
            }
            jwt.verify = jest.fn()
                .mockReturnValueOnce(decodedAccessToken)
                .mockReturnValueOnce(decodedRefreshToken)
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(response.authorized).toBe(false)
            expect(response.cause).toBe("Mismatched users")
        })

        test("Tokens are valid but belong to anothe user", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)
            const response = verifyAuth(req, res, { authType: "User", username: "anotherTester" })
            expect(response.authorized).toBe(false)
            expect(response.cause).toBe("Unauthorized")
        })

        test("Tokens are valid but user is not an admin", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)
            const response = verifyAuth(req, res, { authType: "Admin" })
            expect(response.authorized).toBe(false)
            expect(response.cause).toBe("Unauthorized")
        })

        test("Tokens are valid but user belongs to another group", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)
            const response = verifyAuth(req, res, { authType: "Group", emails: ["notyouremaik@mock.mock"] })
            expect(response.authorized).toBe(false)
            expect(response.cause).toBe("Unauthorized")
        })

        test("Invalid auth type", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)
            const response = verifyAuth(req, res, { authType: "InvalidAuthType"})
            expect(response.authorized).toBe(false)
            expect(response.cause).toBe("Invalid authType")
        })

        test("Access token and refresh token are both invalid", () => {
            const req = { cookies: { accessToken: "invalidAccessToken", refreshToken: "invalidRefreshToken" } }
            const res = {}
            //The verify function throws an error any time it's called in this test, meaning that both tokens are invalid
            jwt.verify = jest.fn().mockImplementation((token, secret) => {
                const error = new Error('JsonWebTokenError')
                error.name = 'JsonWebTokenError'
                throw error
            })
            const response = verifyAuth(req, res, { authType: "Simple" })
            expect(Object.values(response).includes(false)).toBe(true)
        })

        test("Auth type simple", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}
            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            jwt.verify = jest.fn().mockReturnValue(decodedAccessToken)
            const response = verifyAuth(req, res, { authType: "Simple" })
            expect(response.authorized).toBe(true)
            expect(response.cause).toBe("Authorized");
        });

        test("The user should perform login again", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}

            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            const errore = {name: "TokenExpiredError"}
            jwt.verify.mockImplementation(() => {throw errore});
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(response.authorized).toBe(false)
            expect(response.cause).toBe("Perform login again")
        })

        test("It is catched a 500 error", () => {
            const req = { cookies: { accessToken: "testerAccessTokenValid", refreshToken: "testerAccessTokenValid" } }
            const res = {}

            const decodedAccessToken = {
                email: "tester@test.com",
                username: "tester",
                role: "Regular"
            }
            const errore = {name: "TokenExpiredError"}
            const errore2 = {name: "mock error"}
            jwt.verify
                .mockImplementationOnce(() => {throw errore})
                .mockImplementationOnce(() => {throw errore2})
            const response = verifyAuth(req, res, { authType: "User", username: "tester" })
            expect(response.authorized).toBe(false)
            expect(response.cause).toBe("mock error")
        })
    })
})