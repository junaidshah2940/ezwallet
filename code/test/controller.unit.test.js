import { categories, transactions } from '../models/model';
import { User, Group } from '../models/User';
import { handleAmountFilterParams, handleDateFilterParams, verifyAuth } from '../controllers/utils';
import { createCategory, createTransaction, deleteCategory, getAllTransactions, getCategories, getTransactionsByGroup, getTransactionsByUser, getTransactionsByUserByCategory, getTransactionsByGroupByCategory, updateCategory, deleteTransaction, deleteTransactions } from '../controllers/controller';

jest.mock('../models/model');
jest.mock('../models/User');
jest.mock("../controllers/utils.js", () => ({
    verifyAuth: jest.fn(),
    handleAmountFilterParams: jest.fn(),
    handleDateFilterParams: jest.fn()
}));

beforeEach(() => {
    categories.find.mockClear();
    categories.findOne.mockClear();
    categories.prototype.save.mockClear();
    transactions.find.mockClear();
    transactions.deleteOne.mockClear();
    transactions.aggregate.mockClear();
    transactions.prototype.save.mockClear();
    User.findOne.mockClear();
    User.find.mockClear();
    Group.findOne.mockClear();
    Group.find.mockClear();
    jest.clearAllMocks();
});

describe("createCategory", () => {
    test('should create a new category', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: {
                type: "mock type",
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        categories.findOne = jest.fn().mockReturnValue(null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "authorized" });

        await createCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: { type: "mock type", color: "mock color" }, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    })

    test('should return 400 if the request body does not contain all the necessary attributes', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: {
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        categories.findOne = jest.fn().mockReturnValue(null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "authorized" });

        await createCategory(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Please fill in all the required fields" });
    });

    test('should return 400 if at least one of the request body attributes is an empty string', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: {
                type: "",
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        categories.findOne = jest.fn().mockReturnValue(null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "authorized" });

        await createCategory(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Please fill in all the required fields" });

    });

    test('should return 400 if the type of category passed in the request body represents an already existing category in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: {
                type: "mock type",
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "authorized" });

        await createCategory(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Category already exists" });

    });

    test('should return 401 if called by an authenticated user who is not an admin (authType = Admin)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: {
                type: "mock type",
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await createCategory(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" });

    });

    test("should return 500 if an error occurs", async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: {
                type: "mock type",
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        categories.findOne = jest.fn().mockImplementation(() => { throw new Error("mock error") });
        verifyAuth.mockReturnValue({ authorized: true, cause: "authorized" });

        await createCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
})

describe("updateCategory", () => {
    test('should update a category', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                type: "mock type"
            },
            body: {
                type: "mock type",
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
            .mockImplementationOnce(() => null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateOne = jest.fn().mockReturnValue({ nModified: 1 });
        transactions.find = jest.fn().mockReturnValue([mockTransaction, mockTransaction]);
        transactions.updateOne = jest.fn().mockReturnValue({ nModified: 1 });

        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "Category edited successfully", "count": 2 }, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    })

    test('should update a category', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                type: "mock type"
            },
            body: {
                type: "mock type",
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
            .mockImplementationOnce(() => null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateOne = jest.fn().mockReturnValue({ nModified: 1 });
        transactions.find = jest.fn().mockReturnValue([]);
        transactions.updateOne = jest.fn().mockReturnValue({ nModified: 1 });

        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "Category edited successfully", "count": 0 }, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    })

    test('should return 400 if the request body does not contain all the necessary attributes', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                type: "mock type"
            },
            body: {
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };



        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
            .mockImplementationOnce(() => null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateOne = jest.fn().mockReturnValue({ nModified: 1 });
        transactions.findOne = jest.fn().mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => null);
        transactions.updateOne = jest.fn().mockReturnValue({ nModified: 1 });

        await updateCategory(mockReq, mockRes)
        expect(categories.updateOne).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Please fill in all the required fields" })
    });

    test('should return 400 if at least one of the parameters in the request body is an empty string', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                type: "mock type"
            },
            body: {
                type: "mock type",
                color: ""
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
            .mockImplementationOnce(() => null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateOne = jest.fn().mockReturnValue({ nModified: 1 });
        transactions.findOne = jest.fn().mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => null);
        transactions.updateOne = jest.fn().mockReturnValue({ nModified: 1 });

        await updateCategory(mockReq, mockRes)
        expect(categories.updateOne).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Please fill in all the required fields" })
    });

    test('should return 400 if the type of category passed as a route parameter does not represent a category in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                type: "mock type"
            },
            body: {
                color: "mock color",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.findOne = jest.fn().mockImplementationOnce(() => null)
            .mockImplementationOnce(() => null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateOne = jest.fn().mockReturnValue({ nModified: 1 });
        transactions.findOne = jest.fn().mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => null);
        transactions.updateOne = jest.fn().mockReturnValue({ nModified: 1 });

        await updateCategory(mockReq, mockRes)
        expect(categories.updateOne).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Category does not exist" })
    });

    test('should return 400 if the type of category passed in the request body as the new type represents an already existing category in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                type: "mock type"
            },
            body: {
                color: "mock color",
                type: "mock type updated"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateOne = jest.fn().mockReturnValue({ nModified: 1 });
        transactions.findOne = jest.fn().mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => null);
        transactions.updateOne = jest.fn().mockReturnValue({ nModified: 1 });

        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Category already exists" })
    });

    test('should return 400 if the type of category passed in the request body as the new type represents an already existing category in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                type: "mock type"
            },
            body: {
                color: "mock color",
                type: "mock type updated"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };
        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.findOne = jest.fn()
            .mockReturnValueOnce(mockCategory)
            .mockReturnValueOnce(undefined)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateOne = jest.fn().mockReturnValue({ nModified: 1 });
        transactions.findOne = jest.fn().mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => null);
        transactions.updateOne = jest.fn().mockReturnValue({ nModified: 1 });

        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
    });

    test('should return 401 if called by an authenticated user who is not an admin (authType = Admin)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                type: "mock type"
            },
            body: {
                color: "mock color",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshedTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
            .mockImplementationOnce(() => null);
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });
        categories.updateOne = jest.fn().mockReturnValue({ nModified: 1 });
        transactions.findOne = jest.fn().mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => mockTransaction)
            .mockImplementationOnce(() => null);
        transactions.updateOne = jest.fn().mockReturnValue({ nModified: 1 });

        await updateCategory(mockReq, mockRes)
        expect(categories.updateOne).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" })
    });

    test("should return 500 if an error occurs", async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                type: "mock type"
            },
            body: {
                type: "mock type",
                color: "mock color"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        // verifyAuth triggers an error
        verifyAuth.mockImplementationOnce(() => { throw new Error("mock error") });
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
            .mockImplementationOnce(() => null);
        categories.updateOne = jest.fn().mockReturnValue({ nModified: 1 });
        transactions.find = jest.fn().mockReturnValue([mockTransaction, mockTransaction]);
        transactions.updateOne = jest.fn().mockReturnValue({ nModified: 1 });

        await updateCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
})

describe("deleteCategory", () => {
    test('should delete a category (N > T)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: {
                types: ["mock type"]
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.find = jest.fn().mockReturnValue([{type: "mock type", color: "mock color"}, {type: "mock type", color: "mock color"}])
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
        .mockImplementationOnce(() => mockCategory);
        categories.sort = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateMany = jest.fn().mockReturnValue({ modifiedCount: 1 });
        categories.deleteOne = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteMany = jest.fn().mockReturnValue({ deletedCount: 1 });
        transactions.updateMany = jest.fn().mockReturnValue({ modifiedCount: 1 });

        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "Categories deleted", "count": 1 }, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    
    });

    test('should delete a category (N = T)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: {
                types: ["mock type", "mock1 type1"]
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.find = jest.fn().mockReturnValue([{type: "mock type", color: "mock color"}, {type: "mock1 type1", color: "mock1 color1"}])
        categories.findOne = jest.fn().mockImplementation(() => mockCategory);
        categories.sort = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateMany = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteOne = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteMany = jest.fn().mockReturnValue({ deletedCount: 1 });
        transactions.updateMany = jest.fn().mockReturnValue({modifiedCount:1})
        await deleteCategory(mockReq, mockRes)
        expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "Categories deleted", "count": 1 }, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
        expect(mockRes.status).toHaveBeenCalledWith(200)
        
    });

    test('should return 400 if the request body does not contain all the necessary attributes', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.find = jest.fn().mockReturnValue([{type: "mock type", color: "mock color"}, {type: "mock type", color: "mock color"}])
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
        .mockImplementationOnce(() => mockCategory);
        categories.sort = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateMany = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteOne = jest.fn().mockReturnValue({ nModified: 1 });

        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Please fill in all the required fields" })
    
    });

    test('should return 400 if called when there is only one category in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { types: ["mock type"] }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.find = jest.fn().mockReturnValue([{type: "mock type", color: "mock color"}])
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
        .mockImplementationOnce(() => mockCategory);
        categories.sort = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateMany = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteOne = jest.fn().mockReturnValue({ nModified: 1 });

        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Cannot delete the only category in the database" })
    
    });

    test('should return 400 if at least one of the types in the array is an empty string', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { types: ["mock type", ""] }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.find = jest.fn().mockReturnValue([{type: "mock type", color: "mock color"}, {type: "mock type", color: "mock color"}])
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
        .mockImplementationOnce(() => mockCategory);
        categories.sort = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateMany = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteOne = jest.fn().mockReturnValue({ nModified: 1 });

        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Please fill in all the required fields" })
    
    });

    test('should return 400 if at least one of the types in the array does not represent a category in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { types: ["mock type", "mock type 2"] }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.find = jest.fn().mockReturnValue([{type: "mock type", color: "mock color"}, {type: "mock type", color: "mock color"}])
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
                .mockImplementationOnce(() => null);
        categories.sort = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.updateMany = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteOne = jest.fn().mockReturnValue({ nModified: 1 });

        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Category does not exist" })
    
    });

    test('should return 401 if if called by an authenticated user who is not an admin (authType = Admin)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { types: ["mock type", "mock type 2"] }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.find = jest.fn().mockReturnValue([{type: "mock type", color: "mock color"}, {type: "mock type", color: "mock color"}])
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
                .mockImplementationOnce(() => mockCategory);
        categories.sort = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });
        categories.updateMany = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteOne = jest.fn().mockReturnValue({ nModified: 1 });

        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" })
    
    });

    test('should return 400 if the passed array is empty', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { types: [] }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "The array passed is empty" })
    });

    test("should return 500 if an error occurs", async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: {
                types: ["mock type"]
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        verifyAuth.mockImplementationOnce(() => { throw new Error("mock error") });
        categories.find = jest.fn().mockReturnValue(() => {throw new Error("mock error")})
        categories.findOne = jest.fn().mockImplementationOnce(() => mockCategory)
        .mockImplementationOnce(() => mockCategory);
        categories.sort = jest.fn().mockReturnValue(true)
        categories.updateMany = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteOne = jest.fn().mockReturnValue({ nModified: 1 });
        categories.deleteMany = jest.fn().mockReturnValue({ deletedCount: 1 });

        await deleteCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });

})

describe("getCategories", () => {
    test('should update a category', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.find = jest.fn().mockReturnValue([mockCategory, mockCategory])
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getCategories(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: [mockCategory, mockCategory], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    })

    test('should return 401 if called by a user who is not authenticated (authType = Simple)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.find = jest.fn().mockReturnValue([mockCategory, mockCategory])
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await getCategories(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" })
    })

    test("should return 500 if an error occurs", async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        const mockTransaction = { category: "mock type" };
        categories.find = jest.fn().mockReturnValue([mockCategory, mockCategory])
        verifyAuth.mockImplementationOnce(() => { throw new Error("mock error") });

        await getCategories(mockReq, mockRes)
        
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });

})

describe("createTransaction", () => {
    test('should create a new transaction', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                amount: 100,
                username: "mock username",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        // to mock the saving of the new transaction in the database -- DOESN'T WORK
        //jest.spyOn(transactions.prototype, "save").mockReturnValue({ date: "mock date" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: { username: "mock username", amount: 100, type: "mock type", date: undefined }, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should return 400 if the request body does not contain all the necessary attributes', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                username: "mock username",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        // to mock the saving of the new transaction in the database

        transactions.save = jest.fn().mockImplementation(() => { return { username: "mock username", amount: 100, type: "mock type", date: "mock date" } });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Please fill in all the required fields" })
    });

    test('should return 400 if at least one of the parameters in the request body is an empty string', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                amount: 100,
                username: "",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        // to mock the saving of the new transaction in the database

        transactions.save = jest.fn().mockImplementation(() => { return { username: "mock username", amount: 100, type: "mock type", date: "mock date" } });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Please fill in all the required fields" })
    });

    test('should return 400 if the type of category passed in the request body does not represent a category in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                amount: 100,
                username: "mock username",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(null);
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        // to mock the saving of the new transaction in the database

    //     transactions.save = jest.fn().mockImplementation(() => { return { username: "mock username", amount: 100, type: "mock type", date: "mock date" } });
         verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

         await createTransaction(mockReq, mockRes)
         expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Category does not exist" })
    });

    test('should return 400 if the username passed in the request body is not equal to the one passed as a route parameter', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username 1"
            },
            body: {
                amount: 100,
                username: "mock username 2",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        // to mock the saving of the new transaction in the database

        transactions.save = jest.fn().mockImplementation(() => { return { username: "mock username", amount: 100, type: "mock type", date: "mock date" } });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Username does not match" })
    });

    test('should return 400 if the username passed in the request body does not represent a user in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                amount: 100,
                username: "mock username",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValue(null);
        // to mock the saving of the new transaction in the database

        transactions.save = jest.fn().mockImplementation(() => { return { username: "mock username", amount: 100, type: "mock type", date: "mock date" } });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "User passed in the body does not exist" })
    });

    test('should return 400 if the username passed as a route parameter does not represent a user in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                amount: 100,
                username: "mock username",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValueOnce( { username: "mock username" }).mockReturnValueOnce(null);
        // to mock the saving of the new transaction in the database

        transactions.save = jest.fn().mockImplementation(() => { return { username: "mock username", amount: 100, type: "mock type", date: "mock date" } });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "User passed from params does not exist" })
    });

    test('should return 400 if the amount passed in the request body cannot be parsed as a floating value (negative numbers are accepted)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                amount: "            ",
                username: "mock username",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        // to mock the saving of the new transaction in the database

        transactions.save = jest.fn().mockImplementation(() => { return { username: "mock username", amount: 100, type: "mock type", date: "mock date" } });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Please fill in all the required fields" })
    });




    test('should return 400 if the amount passed in the request body cannot be parsed as a floating value (negative numbers are accepted)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                amount: "otto",
                username: "mock username",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        // to mock the saving of the new transaction in the database

        transactions.save = jest.fn().mockImplementation(() => { return { username: "mock username", amount: 100, type: "mock type", date: "mock date" } });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Amount must be a number" })
    });

    test('should return 401 if called by an authenticated user who is not the same user as the one in the route parameter (authType = User)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                amount: 100,
                username: "mock username",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        // to mock the saving of the new transaction in the database

        transactions.save = jest.fn().mockImplementation(() => { return { username: "mock username", amount: 100, type: "mock type", date: "mock date" } });
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" })
    });
    test("should return 500 if an error occurs", async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {
                amount: 100,
                username: "mock username",
                type: "mock type"
            }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockCategory = { type: "mock type", color: "mock color" };
        categories.findOne = jest.fn().mockReturnValue(mockCategory);
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        // to mock the saving of the new transaction in the database -- DOESN'T WORK
        //jest.spyOn(transactions.prototype, "save").mockReturnValue({ date: "mock date" });
        verifyAuth.mockImplementationOnce(() => { throw new Error("mock error") });

        await createTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
})

describe("getAllTransactions", () => {
    test('should get all transactions', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, categories_info: { color: "mock color" }, date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getAllTransactions(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: [{ username: "mock username", amount: 100, type: "mock type", date: "mock date", color: "mock color" }], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should 400 if called by an authenticated user who is not an admin (authType = Admin)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, categories_info: { color: "mock color" }, date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await getAllTransactions(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });
    test('should return 500 if an error occurs', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, categories_info: { color: "mock color" }, date: "mock date", type: "mock type" }]);
        verifyAuth.mockImplementationOnce(() => { throw new Error("mock error") });

        await getAllTransactions(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });


})

describe("getTransactionsByUser", () => {
    test('should get all transactions by a specific user (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/transactions/users/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };
        
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: [{ username: "mock username", amount: 100, type: "mock type", date: "mock date", color: "mock color" }], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should get all transactions by a specific user (ADMIN) but there is no transaction', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/transactions/users/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };
        
        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.aggregate = jest.fn().mockReturnValue([]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should get all transactions by a specific user (USER)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/users/",
            body: {},
            query: {from: "2000-01-01", max: 200}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        User.findOne = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        const queryAmount = {amount: {$gte: parseInt(mockReq.query.max)}}
        handleAmountFilterParams.mockReturnValue(queryAmount)
        handleDateFilterParams.mockReturnValue({date : {$gte :Date("2023-05-10T23:59:59.000Z")}})
        transactions.aggregate = jest.fn().mockReturnValue("mock aggregate")

        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: "mock aggregate", refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });


    test('should get all transactions by a specific user (USER)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/users/",
            body: {},
            query: {from: "2000-01-01", max: 200}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        User.findOne = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        const queryAmount = {amount: {$gte: parseInt(mockReq.query.max)}}
        handleAmountFilterParams.mockReturnValue(queryAmount)
        handleDateFilterParams.mockReturnValue({date : {$gte :Date("2023-05-10T23:59:59.000Z")}})
        transactions.aggregate = jest.fn().mockReturnValue([])

        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });


    test('should get all transactions by a specific user (USER), missing dateFormatted.date', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/users/",
            body: {},
            query: {max: 200}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        User.findOne = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        const queryAmount = {amount: {$gte: parseInt(mockReq.query.max)}}
        handleAmountFilterParams.mockReturnValue(queryAmount)
        handleDateFilterParams.mockReturnValue({date : {$gte :Date("2023-05-10T23:59:59.000Z")}})
        transactions.aggregate = jest.fn().mockReturnValue("mock aggregate")

        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: "mock aggregate", refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should get all transactions by a specific user (USER), missing amountFormatted.amount', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/users/",
            body: {},
            query: {from: "2000-01-01"}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        User.findOne = jest.fn().mockReturnValue(true)
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        const queryAmount = {amount: {$gte: parseInt(mockReq.query.max)}}
        handleAmountFilterParams.mockReturnValue(queryAmount)
        handleDateFilterParams.mockReturnValue({date : {$gte :Date("2023-05-10T23:59:59.000Z")}})
        transactions.aggregate = jest.fn().mockReturnValue("mock aggregate")

        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: "mock aggregate", refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should return 400 error if user is not found (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/transactions/users/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockUser = false;

        User.findOne = jest.fn().mockReturnValueOnce(mockUser);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "User not found" })
        expect(mockRes.status).toHaveBeenCalledWith(400)
    });

    test('should return 400 error if user is not found (USER)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/users/",
            body: {},
            query: {from: "2000-01-01", max: 200}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        const mockUser = false;

        User.findOne = jest.fn().mockReturnValueOnce(mockUser);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "User not found" })
        expect(mockRes.status).toHaveBeenCalledWith(400)
    });

    test('should return 401 if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/transactions/users/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    test('should get all transactions by a specific user (USER)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock url",
            query: {},
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        User.findOne = jest.fn().mockReturnValue(true);
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: [{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage });
    });

    test('should return 401 if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock url",
            query: {},
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        verifyAuth.mockReturnValue({ authorized: false, cause: "Unathorized" });
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });
    test('should return 500 if an error occurs', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "/transactions/users/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        verifyAuth.mockImplementationOnce(() => { throw new Error("mock error") });

        await getTransactionsByUser(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
})

describe("getTransactionsByUserByCategory", () => {
    test('should get all transactions by a specific user and category (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username",
                category: "mock category"
            },
            url: "/transactions/users/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByUserByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: [{ username: "mock username", amount: 100, type: "mock type", date: "mock date", color: "mock color" }], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should return empty array of transactions in case none of them are found', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username",
                category: "mock category"
            },
            url: "mock user url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.find = jest.fn().mockReturnValue([]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByUserByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: [], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should return 400 if the username passed as a route parameter does not represent a user in the database (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username",
                category: "mock category"
            },
            url: "mock user url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue(null);
        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByUserByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "User does not exist" });
    });

    test('should return 400 if the category passed as a route parameter does not represent a category in the database (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username",
                category: "mock category"
            },
            url: "mock user url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        categories.findOne = jest.fn().mockReturnValue(null);
        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByUserByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Category does not exist" });
    });

    test('should return 401 if called by an authenticated user who is not an admin (authType = Admin) if the route is reserved for admins', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username",
                category: "mock category"
            },
            url: "/transactions/users/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await getTransactionsByUserByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized (not an admin)" });
    });

    test('should return 401 if called by an authenticated user who is not the one in the route, if the route is reserved for users', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username",
                category: "mock category"
            },
            url: "mock user url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await getTransactionsByUserByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized (not a user)" });
    });

    test('should return 500 if an error occurs', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username",
                category: "mock category"
            },
            url: "mock user url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.find = jest.fn().mockReturnValue([{ username: "mock username", amount: 100, color: "mock color", date: "mock date", type: "mock type" }]);
        verifyAuth.mockImplementationOnce(() => { throw new Error("mock error") });

        await getTransactionsByUserByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
})

describe("getTransactionsByGroup", () => {
    test('should get all transactions by the members of a specific group (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock category"
            },
            url: "/transactions/groups/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        Group.findOne = jest.fn().mockReturnValue({ name: "mock groupname", members: [{ email: "mock username" }, { email: "mock username 2" }] });
        User.aggregate = jest.fn().mockReturnValue([{ username: "mock username", category_info: { color: "mock color" }, transactions_info: { amount: 100, date: "mock date", type: "mock type"} ,email:"mock@email" }]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByGroup(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: [{ username: "mock username", amount: 100, type: "mock type", date: "mock date", color: "mock color" }], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should get all transactions by the members of a specific group (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock category"
            },
            url: "mock group url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        Group.findOne = jest.fn().mockReturnValue({ name: "mock groupname", members: [{ email: "mock username" }, { email: "mock username 2" }] });
        User.aggregate = jest.fn().mockReturnValue([{ username: "mock username", category_info: { color: "mock color" }, transactions_info: { amount: 100, date: "mock date", type: "mock type"} ,email:"mock@email" }]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByGroup(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: [{ username: "mock username", amount: 100, type: "mock type", date: "mock date", color: "mock color" }], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should return 400 if the group name passed as a route parameter does not represent a group in the database (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock category"
            },
            url: "/transactions/groups/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        Group.findOne = jest.fn().mockReturnValue(null);
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", categories_info: { color: "mock color" }, amount: 100, date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByGroup(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Group does not exist" })
    });

    test('should return 401 if called by an authenticated user who is not an admin (authType = Admin) and the route is reserved to admin', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock category"
            },
            url: "/transactions/groups/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        Group.findOne = jest.fn().mockReturnValue({ name: "mock groupname", members: [{ email: "mock username" }, { email: "mock username 2" }] });
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", categories_info: { color: "mock color" }, amount: 100, date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await getTransactionsByGroup(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized (not an admin)" })
    });

    test('should return 401 if called by an authenticated user who is not part of the group (authType = Group) if the route is the user one', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock category"
            },
            url: "mock user url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        Group.findOne = jest.fn().mockReturnValue({ name: "mock groupname", members: [{ email: "mock username" }, { email: "mock username 2" }] });
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", categories_info: { color: "mock color" }, amount: 100, date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await getTransactionsByGroup(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized (not in group)" })
    });

    test('should return 500 if an error occurs', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock category"
            },
            url: "/transactions/groups/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        Group.findOne.mockImplementation(() => { throw new Error("mock error") });
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", categories_info: { color: "mock color" }, amount: 100, date: "mock date", type: "mock type" }]);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await getTransactionsByGroup(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
})

describe("getTransactionsByGroupByCategory", () => {
    test('should get all transactions by a specific group and category (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock type"
            },
            url: "/transactions/groups/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        Group.findOne = jest.fn().mockReturnValue({ name: "mock groupname", members: [{ email: "mock@email" }, { email: "mock2@email" }] });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        User.aggregate = jest.fn().mockReturnValue([{ username: "mock username", category_info: { color: "mock color" }, transactions_info: { amount: 100, date: "mock date", type: "mock type"} ,email:"mock@email" }]);

        await getTransactionsByGroupByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: [{ username: "mock username", amount: 100, type: "mock type", date: "mock date", color: "mock color" }], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
    });

    test('should return 400 if the group name passed as a route parameter does not represent a group in the database (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock type"
            },
            url: "mock group url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        Group.findOne = jest.fn().mockReturnValue(null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.find = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", categories_info: { color: "mock color" }, amount: 100, date: "mock date", type: "mock type" }]);

        await getTransactionsByGroupByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Group does not exist" });
    });

    test('should return 400 if the category passed as a route parameter does not represent a category in the database (ADMIN)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock category"
            },
            url: "mock group url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };


        Group.findOne = jest.fn().mockReturnValue({ name: "mock groupname", members: [{ email: "mock username" }, { email: "mock username 2" }] });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.findOne = jest.fn().mockReturnValue(null);
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", categories_info: { color: "mock color" }, amount: 100, date: "mock date", type: "mock type" }]);

        await getTransactionsByGroupByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Category does not exist" });
    });

    test('should return 401 if called by an authenticated user who is not part of the group (authType = Group) if the route is for groups', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock category"
            },
            url: "mock group url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };


        Group.findOne = jest.fn().mockReturnValue({ name: "mock groupname", members: [{ email: "mock username" }, { email: "mock username 2" }] });
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });
        categories.find = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", categories_info: { color: "mock color" }, amount: 100, date: "mock date", type: "mock type" }]);

        await getTransactionsByGroupByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized (not in group)" });
    });

    test('should return 401 if called by an authenticated user who is not the one in the route, if the route is reserved for users', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock category"
            },
            url: "/transactions/groups/",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };


        Group.findOne = jest.fn().mockReturnValue({ name: "mock groupname", members: [{ email: "mock username" }, { email: "mock username 2" }] });
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });
        categories.find = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", categories_info: { color: "mock color" }, amount: 100, date: "mock date", type: "mock type" }]);

        await getTransactionsByGroupByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized (not an admin)" });
    });

    test('should return 500 if an error occurs', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                name: "mock groupname",
                category: "mock type"
            },
            url: "mock group url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });
        categories.findOne = jest.fn().mockReturnValue({ type: "mock type", color: "mock color" });
        transactions.aggregate = jest.fn().mockReturnValue([{ username: "mock username", categories_info: { color: "mock color" }, amount: 100, date: "mock date", type: "mock type" ,email:"mock@email" }]);
        Group.findOne.mockImplementation(() => { throw new Error("mock error") });
        await getTransactionsByGroupByCategory(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
})

describe("deleteTransaction", () => {
    test('should delete a transaction (USER)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock group url",
            body: { _id: "mock id" }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "Transaction deleted" } });
    });

    test('should delete a transaction (USER)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock group url",
            body: { _id: "mock id" }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValueOnce({ authorized: false, cause: "Authorized" });
        verifyAuth.mockReturnValueOnce({ authorized: true, cause: "Authorized" });

        await deleteTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "Transaction deleted" } });
    });

    test('should return 400 if the request body does not contain all the necessary attributes', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock group url",
            body: {}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Missing _id" });
    });


    test('should return 400 if the id in the body is an empty string', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock group url",
            body: { _id: "" }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Empty _id" });

    });

    test('should return 400 if the username passed as a route parameter does not represent a user in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock group url",
            body: { _id: "mock id" }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue(null);
        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "User does not exist" });
    });

    test('should return 400  if the _id in the request body does not represent a transaction in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock group url",
            body: { _id: "mock id" }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.findOne = jest.fn().mockReturnValue(null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Transaction does not exist" });
    });

    test('should return 400  if the _id in the request body represents a transaction made by a different user than the one in the route', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock group url",
            body: { _id: "mock id" }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.findOne = jest.fn().mockReturnValue({ username: "mock different username" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Transaction was registered from a different user" });
    });

    test('should return 401 if called by an authenticated user who is not the same user as the one in the route (authType = User)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock group url",
            body: { _id: "mock id" }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await deleteTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    test('should return 500 if an error occurs', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            params: {
                username: "mock username"
            },
            url: "mock group url",
            body: { _id: "mock id" }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        User.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" });
        verifyAuth.mockImplementation(() => {throw new Error("mock error")});

        await deleteTransaction(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
})

describe("deleteTransactions", () => {
    test('should delete many transactions', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { _ids: ["111111111111", "111111111111"]}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" })
            .mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransactions(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(200)

        expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "Transactions deleted" } });
    });

    test('should return 400 if the request body does not contain all the necessary attributes', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { }
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" })
            .mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransactions(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Missing _ids" } );
    });

    test('should return 400 if at least one of the ids in the array is an empty string', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { _ids: ["111111111111", ""]}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" })
            .mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransactions(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Empty string in _ids" } );
    });

    test('should return 400 if at least one of the ids in the array does not represent a transaction in the database', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { _ids: ["111111111111", "111111111111"]}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" })
            .mockReturnValue(null);
        verifyAuth.mockReturnValue({ authorized: true, cause: "Authorized" });

        await deleteTransactions(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(400)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "At least a transaction does not exist" } );
    });

    test('should return 401 if called by an authenticated user who is not an admin (authType = Admin)', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { _ids: ["111111111111", "111111111111"]}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" })
            .mockReturnValue({ username: "mock username" });
        verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" });

        await deleteTransactions(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(401)

        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" } );
    });

    test('should return 500 if an error occurs', async () => {
        const mockReq = {
            cookies: {
                accessToken: "mock accessToken",
                refreshToken: "mock refreshToken"
            },
            body: { _ids: ["111111111111", "111111111111"]}
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                refreshedTokenMessage: "mock refreshTokenMessage"
            }
        };

        transactions.findOne = jest.fn().mockReturnValue({ username: "mock username" })
            .mockReturnValue({ username: "mock username" });
            verifyAuth.mockImplementation(() => {throw new Error("mock error")});

        await deleteTransactions(mockReq, mockRes)
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
    });
})
