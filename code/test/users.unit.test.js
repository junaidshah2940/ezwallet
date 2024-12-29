import { User, Group } from '../models/User.js';
import { getGroup, getGroups, createGroup, getUsers, getUser, addToGroup, removeFromGroup, deleteUser, deleteGroup } from '../controllers/users';
import { verifyAuth } from "../controllers/utils";
import jwt from 'jsonwebtoken';
import { transactions } from '../models/model.js';

/**
 * In order to correctly mock the calls to external modules it is necessary to mock them using the following line.
 * Without this operation, it is not possible to replace the actual implementation of the external functions with the one
 * needed for the test cases.
 * `jest.mock()` must be called for every external module that is called in the functions under test.
 */
jest.mock("../models/User.js")
jest.mock("../controllers/utils.js", ()=> ({
  verifyAuth: jest.fn()
}))

/**
 * Defines code to be executed before each test case is launched
 * In this case the mock implementation of `User.find()` is cleared, allowing the definition of a new mock implementation.
 * Not doing this `mockClear()` means that test cases may use a mock implementation intended for other test cases.
 */
beforeEach(() => {
  jest.clearAllMocks()
  //additional `mockClear()` must be placed here
});

describe("getUsers", () => {  
  test("should retrieve list of all users", async () => {
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    const mockReq = {}
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedUsers = [
      { username: 'test1', email: 'test1@example.com', role: 'Admin' },
      { username: 'test2', email: 'test2@example.com', role: 'User' },
      { username: 'test3', email: 'test3@example.com'}
    ]
    jest.spyOn(User, 'find').mockImplementation(() => retrievedUsers);
    await getUsers(mockReq, mockRes)
    expect(User.find).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({data: retrievedUsers, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
  })

  test("should return 401 if not authorized", async () => {
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    const mockReq = {}
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedUsers = [
      { username: 'test1', email: 'test1@example.com', role: 'Admin' },
      { username: 'test2', email: 'test2@example.com', role: 'User' },
      { username: 'test3', email: 'test3@example.com'}
    ]
    jest.spyOn(User, 'find').mockImplementation(() => retrievedUsers);
    await getUsers(mockReq, mockRes)
    expect(User.find).not.toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({error: "Unauthorized"})
  })

  test("should return an empty list if no users are found", async () => {
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    const mockReq = {}
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedUsers = []
    jest.spyOn(User, 'find').mockImplementation(() => retrievedUsers);
    await getUsers(mockReq, mockRes)
    expect(User.find).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({data: [], refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
  })

  test("should return 500 if an error occurs", async () => {
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    const mockReq = {}
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedUsers = []
    User.find.mockImplementation(() => {throw new Error("mock error")});
    await getUsers(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
  })
})

describe("getUser", () => { 
  test("should return the user with the given id", async () => {
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      params: {
        username: "mock username"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedUser = [ { username: 'test1', email: 'test1@test1.test1', role: 'User' }]
    jest.spyOn(User, 'findOne').mockImplementation(() => retrievedUser);
    await getUser(mockReq, mockRes)
    expect(User.findOne).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({data: {username: retrievedUser.username, email: retrievedUser.email, role: retrievedUser.role}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
  })

  test("should return the user with the given id (admin case)", async () => {
    // verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    verifyAuth
      .mockReturnValueOnce({authorized: false, cause: "Unauthorized"})
      .mockReturnValueOnce({authorized: true, cause: "Authorized"})
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      params: {
        username: "mock username"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedUser = [ { username: 'test1', email: 'test1@test1.test1', role: 'User' }]
    jest.spyOn(User, 'findOne').mockImplementation(() => retrievedUser);
    await getUser(mockReq, mockRes)
    expect(User.findOne).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({data: {username: retrievedUser.username, email: retrievedUser.email, role: retrievedUser.role}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
  })

  test("should return 401 if not authorized", async () => {
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      params: {
        username: "mock username"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedUser = [ { username: 'test1', email: 'test1@test1.test1', role: 'User' }]
    verifyAuth.mockReturnValue({ authorized: false, cause: "Unauthorized" })
    User.findOne = jest.fn().mockReturnValue(retrievedUser)
    await getUser(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({error: "Unauthorized"})
  })

  test("should return 400 if no user is found", async () => {
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      params: {
        username: "mock username"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    User.findOne = jest.fn().mockReturnValue(false)
    await getUser(mockReq, mockRes)
    expect(User.findOne).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({message: "User not found"})
  })

  test("should return 500 if an error occurs", async () => {
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      params: {
        username: "mock username"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    User.findOne = jest.fn().mockImplementation(() => {throw new Error("mock error")})
    await getUser(mockReq, mockRes)
    expect(User.findOne).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
  })
})

describe("createGroup", () => {
  test("should create a new group", async () => {
    const groupName = "mock name"
    const membersArray = [{
      user: "mock id",
      email: "mock1@mock.mock"
    }, {
      user: "mock id",
      email: "mock2@mock.mock"
    }, {
      user: "mock id",
      email: "mock3@mock.mock"
    }]
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "mock name",
        memberEmails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    jwt.verify = jest.fn().mockReturnValue({email: "mock1@mock.mock"})
    User.findOne = jest.fn().mockReturnValue({_id: "mock id"})
    Group.find = jest.fn().mockReturnValue(false)
    Group.findOne = jest.fn().mockReturnValue(null)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({data: {group: {"name": groupName, "members": membersArray}, alreadyInGroup:[], membersNotFound:[]}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
    expect(mockRes.status).toHaveBeenCalledWith(200)
  })

  test("should create a new group", async () => {
    const groupName = "mock name"
    const membersArray = [{
      user: "mock id",
      email: "mock2@mock.mock"
    }, {
      user: "mock id",
      email: "mock3@mock.mock"
    },{
      user: "mock id",
      email: "mock1@mock.mock"
    }]
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "mock name",
        memberEmails: ["mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    jwt.verify = jest.fn().mockReturnValue({email: "mock1@mock.mock"})
    User.findOne = jest.fn().mockReturnValue({_id: "mock id"})
    Group.find = jest.fn().mockReturnValue(false)
    Group.findOne = jest.fn().mockReturnValue(null)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({data: {group: {"name": groupName, "members": membersArray}, alreadyInGroup:[], membersNotFound:[]}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
    expect(mockRes.status).toHaveBeenCalledWith(200)
  })

  test("should return 401 if not authorized", async () => {
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "mock name",
        memberEmails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    await createGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({error: "Unauthorized"})
  })

  test("should return 400 if the request body does not contain all the necessary attributes", async () => {
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        memberEmails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    jwt.verify = jest.fn().mockReturnValue({email: "mock1@mock.mock"})
    User.findOne = jest.fn().mockReturnValue({_id: "mock id"})
    Group.find = jest.fn().mockReturnValue(false)
    Group.findOne = jest.fn().mockReturnValue(null)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Request body must contain all the necessary attributes" })
  })

  test("should return 400 if the group name passed in the request body is an empty string", async () => {
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "",
        memberEmails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    jwt.verify = jest.fn().mockReturnValue({email: "mock1@mock.mock"})
    User.findOne = jest.fn().mockReturnValue({_id: "mock id"})
    Group.find = jest.fn().mockReturnValue(false)
    Group.findOne = jest.fn().mockReturnValue(null)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Group name cannot be an empty string" })
  })

  test("should return 400 if the group name passed in the request body represents an already existing group in the database", async () => {
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "mock name",
        memberEmails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    jwt.verify = jest.fn().mockReturnValue({email: "mock1@mock.mock"})
    User.findOne = jest.fn().mockReturnValue({_id: "mock id"})
    Group.find = jest.fn().mockReturnValue(false)
    Group.findOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Group with same name already exists" })
  })

  test("should return 400 if all the provided emails represent users that are already in a group or do not exist in the database",  async () => {
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "mock name",
        memberEmails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    jwt.verify = jest.fn().mockReturnValue({email: "mock1@mock.mock"})
    User.findOne = jest.fn().mockReturnValue(false)
    Group.find = jest.fn().mockReturnValue({members: [{email: "mockemail@mock.mock"}]})
    Group.findOne = jest.fn().mockReturnValue(null)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ message: "All member emails either do not exist or are already in a group" })
  })

  test("should return 400 if the user who calls the API is already in a group",  async () => {
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "mock name",
        memberEmails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = [{
        _id: "mock id",
        name: "mock group name",
        members: [
          {
            user: "mock id",
            email: "mock1@mock.mock"
          }
        ]
    }]
    jwt.verify = jest.fn().mockReturnValue({email: 'mock1@mock.mock'})
    User.findOne = jest.fn().mockReturnValue({_id: "mock id"})
    Group.find = jest.fn()
      .mockReturnValueOnce(mockGroup)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      // .mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(null)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({message: "User already in a group"})
  })

  test("should return 400 if at least one of the member emails is not in a valid email format",  async () => {
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "mock name",
        memberEmails: ["mock1@mock.mock", "mockNotValidEmail", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    jwt.verify = jest.fn().mockReturnValue({email: "mock1@mock.mock"})
    User.findOne = jest.fn().mockReturnValue({_id: "mock id"})
    Group.find = jest.fn().mockReturnValue(false)
    Group.findOne = jest.fn().mockReturnValue(null)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ message: "At least one of the member emails is not in a valid email format" })
  })

  test("should return 400 if at least one of the member emails is an empty string",  async () => {
    const groupName = "mock name"
    const membersArray = [{
      user: "mock id",
      email: "mock1@mock.mock"
    }, {
      user: "mock id",
      email: "mock2@mock.mock"
    }, {
      user: "mock id",
      email: "mock3@mock.mock"
    }]
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "mock name",
        memberEmails: ["", "mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    jwt.verify = jest.fn().mockReturnValue({email: "mock1@mock.mock"})
    User.findOne = jest.fn().mockReturnValue({_id: "mock id"})
    Group.find = jest.fn().mockReturnValue(false)
    Group.findOne = jest.fn().mockReturnValue(null)

    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({message: "At least one of the member emails is an empty string"})
  })

  test("should return 500 if an error occurs",  async () => {
    const groupName = "mock name"
    const membersArray = [{
      user: "mock id",
      email: "mock1@mock.mock"
    }, {
      user: "mock id",
      email: "mock2@mock.mock"
    }, {
      user: "mock id",
      email: "mock3@mock.mock"
    }]
    const mockReq = {
      cookies: {
        accessToken: "mock accessToken",
        refreshToken: "mock refreshToken"
      },
      body: {
        name: "mock name",
        memberEmails: ["", "mock2@mock.mock", "mock3@mock.mock"]
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    jwt.verify.mockImplementation(() => {throw new Error("mock error")});
    User.findOne = jest.fn().mockReturnValue({_id: "mock id"})
    Group.find = jest.fn().mockReturnValue(false)
    Group.findOne = jest.fn().mockReturnValue(null)

    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await createGroup(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({message: "mock error"})
  })
})

describe("getGroups", () => {
  test("should return all groups in the database", async () => {
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    const mockReq = {}
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroups = [
      {name: "mock group name 1",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        }
      ]},
      {name: "mock group name 2",
      members: [
        {
          user: "mock id 2",
          email: "mock@mock.mock"
        }
      ]},
      {name: "mock group name 3",
      members: [
        {
          user: "mock id 3",
          email: "mock@mock.mock"
        }
      ]},
    ]
    jest.spyOn(Group, 'find').mockImplementation(() => retrievedGroups);
    await getGroups(mockReq, mockRes)
    expect(Group.find).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({data: retrievedGroups, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
  })

  test("should return 401 if the user is not authorized", async () => {  
    const mockReq = {}
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroups = [
      {name: "mock group name 1",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        }
      ]},
      {name: "mock group name 2",
      members: [
        {
          user: "mock id 2",
          email: "mock@mock.mock"
        }
      ]},
      {name: "mock group name 3",
      members: [
        {
          user: "mock id 3",
          email: "mock@mock.mock"
        }
      ]},
    ]
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    jest.spyOn(Group, 'find').mockImplementation(() => retrievedGroups);
    await getGroups(mockReq, mockRes)
    expect(Group.find).not.toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({error: "Unauthorized"})
  })

  test("should return 500 if an error occurs", async () => {
    const mockReq = {}
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroups = [
      {name: "mock group name 1",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        }
      ]},
      {name: "mock group name 2",
      members: [
        {
          user: "mock id 2",
          email: "mock@mock.mock"
        }
      ]},
      {name: "mock group name 3",
      members: [
        {
          user: "mock id 3",
          email: "mock@mock.mock"
        }
      ]},
    ]
    verifyAuth.mockImplementation(() => {throw new Error("mock error")});
    jest.spyOn(Group, 'find').mockImplementation(() => retrievedGroups);
    await getGroups(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
  })
})

describe("getGroup", () => {
  test("should return the group requested", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name 1",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        }
      ]
    }
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    jest.spyOn(Group, 'findOne').mockImplementation(() => retrievedGroup);
    await getGroup(mockReq, mockRes)
    expect(Group.findOne).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({data: {group: { name: retrievedGroup.name, members: retrievedGroup.members}}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
  })

  test("should return the group requested (admin)", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name 1",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        }
      ]
    }
    verifyAuth
      .mockReturnValueOnce({authorized: false, cause: "Unauthorized"})
      .mockReturnValueOnce({authorized: true, cause: "Authorized"})
    jest.spyOn(Group, 'findOne').mockImplementation(() => retrievedGroup);
    await getGroup(mockReq, mockRes)
    expect(Group.findOne).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({data: {group: { name: retrievedGroup.name, members: retrievedGroup.members}}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
  })

  test("should return 400 if the group name passed as route parameter does not represent a group in the database", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name 1",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        }
      ]
    }
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    Group.findOne = jest.fn().mockReturnValue(null)
    await getGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Group not found" })
  
  })

  test("should return 401 if the user is not authorized", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name 1",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        }
      ]
    }
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    await getGroup(mockReq, mockRes)
    expect(Group.findOne).toHaveBeenCalled()
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  })

  test("should return 500 if an error occurs", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name 1",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        }
      ]
    }
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    Group.findOne.mockImplementation(() => {throw new Error("mock error")});
    await getGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
  })

})

describe("addToGroup", () => {
  test("should add a user to a group (user)", async() => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: "mock@mock.mock"
      },
      url: "api/groups/mock/add"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    User.findOne = jest.fn().mockReturnValue(true)
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    Group.find = jest.fn().mockReturnValue(false)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({ data: { group: retrievedGroup, alreadyInGroup: [], membersNotFound: [] } })
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(Group.updateOne).toHaveBeenCalled()
  })

  test("should add a user to a group (admin)", async() => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock@mock.mock", "alreadyInGroup@mock.mock", "membersNotFound@mock.mock"]
      },
      url: "api/groups/mock/insert"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    const alreadyInGroup = {
      name: "mock group 2",
      members: [
        {
          email: "alreadyInGroup@mock.mock",
        }
      ],
      length: 1
    }
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    Group.find = jest.fn()
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => alreadyInGroup)
      .mockImplementationOnce(() => false)
    User.findOne = jest.fn()
      .mockImplementationOnce(() => true)
      .mockImplementationOnce(() => true)
      .mockImplementationOnce(() => false)
    verifyAuth
      .mockReturnValueOnce({authorized: false, cause: "Unauthorized"})
      .mockReturnValueOnce({authorized: true, cause: "Authorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({ data: { group: retrievedGroup, alreadyInGroup: ["alreadyInGroup@mock.mock"], membersNotFound: ["membersNotFound@mock.mock"] } })
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(Group.updateOne).toHaveBeenCalled()
  })

  test("should return 400 if the request body does not contain all the necessary attributes", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        
      },
      url: "api/groups/mock/add"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    Group.find = jest.fn().mockReturnValue(false)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Request body does not contain all the necessary attributes" })

  })
  test("should return 400 if the group name passed as a route parameter does not represent a group in the database", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: "mock@mock.mock"
      },
      url: "api/groups/mock/add"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    Group.findOne = jest.fn().mockReturnValue(false)
    Group.find = jest.fn().mockReturnValue(false)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Group not found" })
  
  })
  test("should return 400 if all the provided emails represent users that are already in a group or do not exist in the database", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: "mock@mock.mock"
      },
      url: "api/groups/mock/add"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    const alreadyInGroup = {
      name: "mock group 2",
      members: [
        {
          email: "mock@mock.mock",
        }
      ],
      length: 1
    }
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    Group.find = jest.fn().mockReturnValue(alreadyInGroup)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "All the provided emails represent users that are already in a group or do not exist in the database" })
  })

  test("should return 400 if at least one of the member emails is not in a valid email format", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock@mock.mock", "not correct mock email"]
      },
      url: "api/groups/mock/add"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "not correct mock email"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    Group.find = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "At least one of the member emails is not in a valid email format" })
    
  })
  test("should return 400 if at least one of the member emails is an empty string", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock@mock.mock", ""]
      },
      url: "api/groups/mock/add"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: ""
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    Group.find = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "At least one of the member emails is an empty string" })
  })
  
  test("should return 400 if at least one of the member emails is not in a valid email format (one email case)", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: "not correct mock email"
      },
      url: "api/groups/mock/add"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "not correct mock email"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    Group.find = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "At least one of the member emails is not in a valid email format" })
  })

  test("should return 401 if called by an authenticated user who is not part of the group (authType = Group) if the route is api/groups/:name/add", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: "mock@mock.mock"
      },
      url: "api/groups/mock/add"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    Group.find = jest.fn().mockReturnValue(false)
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  })

  test("should return 401 if called by an authenticated user who is not an admin (authType = Admin) if the route is api/groups/:name/insert", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: "mock@mock.mock"
      },
      url: "api/groups/mock/insert"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    Group.findOne = jest.fn().mockReturnValue(retrievedGroup)
    Group.find = jest.fn().mockReturnValue(false)
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  })

  test("should return 500 if an error occurs", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: "mock@mock.mock"
      },
      url: "api/groups/mock/add"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const retrievedGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock2.mock2"
        }
      ]
    }
    Group.findOne.mockImplementation(() => {throw new Error("mock error")});
    Group.find = jest.fn().mockReturnValue(false)
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    Group.updateOne = jest.fn().mockReturnValue(true)
    await addToGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
  })
})

/*
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if the group name passed as a route parameter does not represent a group in the database
- Returns a 400 error if all the provided emails represent users that do not belong to the group or do not exist in the database
- Returns a 400 error if at least one of the emails is not in a valid email format
- Returns a 400 error if at least one of the emails is an empty string
- Returns a 400 error if the group contains only one member before deleting any user
- Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/remove`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/pull`
*/
describe("removeFromGroup", () => {
  test("should remove the users passed in the body from the group passed in the params", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock", "notingroup@mock.mock","notfound@mock.mock"]
      },
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn()
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (false))
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({data: {group: mockGroupUpdated, notInGroup: ["notingroup@mock.mock"], membersNotFound: ["notfound@mock.mock"]},refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
    expect(mockRes.status).toHaveBeenCalledWith(200)
  })

  test("should remove the users passed in the body from the group passed in the params", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock", "notingroup@mock.mock","notfound@mock.mock"]
      },
      url: "api/groups/mock group name/pull"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth
      .mockReturnValueOnce({authorized: false, cause: "Unauthorized"})
      .mockReturnValueOnce({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn()
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (false))
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({data: {group: mockGroupUpdated, notInGroup: ["notingroup@mock.mock"], membersNotFound: ["notfound@mock.mock"]},refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
    expect(mockRes.status).toHaveBeenCalledWith(200)
  })

  test("should remove the first email from the array before removing the users passed in the body from the group passed in the params", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      },
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn()
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({data: {group: mockGroupUpdated, notInGroup: [], membersNotFound: []},refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
    expect(mockRes.status).toHaveBeenCalledWith(200)
  })

  test("should return 401 if the route is not correct", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock", "notingroup@mock.mock","notfound@mock.mock"]
      },
      url: "api/groups/mock group name/wrong mock route"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn()
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (true))
      .mockImplementationOnce(() => (false))
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({error: "Wrong route"})
    expect(mockRes.status).toHaveBeenCalledWith(401)  
  })

  test("should return 400 if the request body does not contain all the necessary attributes", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {},
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn().mockReturnValue(true)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Request body does not contain all the necessary attributes" })
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return 400 if the group name passed as a route parameter does not represent a group in the database", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      },
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn().mockReturnValue(true)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({error: "The group name passed as a route parameter does not represent a group in the database"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return 400 if all the provided emails represent users that do not belong to the group or do not exist in the database", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      },
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn().mockReturnValue(false)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({error: "All member emails either do not exist or are already in a group"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return 400 if at least one of the emails is not in a valid email format", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["not valid mock email", "mock2@mock.mock", "mock3@mock.mock"]
      },
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn().mockReturnValue(true)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({error: "At least one of the emails is not in a valid email format"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return 400 if at least one of the emails is an empty string", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["", "mock2@mock.mock", "mock3@mock.mock"]
      },
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn().mockReturnValue(true)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({error: "At least one of the emails is an empty string"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return 400 if the group contains only one member before deleting any user", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock"]
      },
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn().mockReturnValue(true)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({error: "Cannot remove all members from group"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return 401 if called by an authenticated user who is not part of the group (authType = Group) if the route is api/groups/:name/remove", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      },
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    User.findOne = jest.fn().mockReturnValue(true)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({error: "Unauthorized"})
    expect(mockRes.status).toHaveBeenCalledWith(401)
  })

  test("should return 401 if called by an authenticated user who is not an admin (authType = Admin) if the route is api/groups/:name/pull", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      },
      url: "api/groups/mock group name/pull"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    User.findOne = jest.fn().mockReturnValue(true)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({error: "Unauthorized"})
    expect(mockRes.status).toHaveBeenCalledWith(401)
  })

  test("should remove the first email from the array of emails", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {
        emails: ["mock1@mock.mock", "mock2@mock.mock", "mock3@mock.mock"]
      },
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne = jest.fn()
      .mockImplementationOnce(() => mockGroup)
      .mockImplementationOnce(() => mockGroupUpdated)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn().mockReturnValue(true)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.json).toHaveBeenCalledWith({data: {group: mockGroupUpdated, notInGroup: [], membersNotFound: []}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
    expect(mockRes.status).toHaveBeenCalledWith(200)
  })

  test("should return 500 if an error occurs", async () => {
    const mockReq = {
      params: {
        name: "mock group name"
      },
      body: {},
      url: "api/groups/mock group name/remove"
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockGroup = {
      name: "mock group name",
      members: [
        {
          user: "mock id 1",
          email: "mock1@mock.mock"
        },
        {
          user: "mock id 2",
          email: "mock2@mock.mock"
        },
        {
          user: "mock id 3",
          email: "mock3@mock.mock"
        },
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    const mockGroupUpdated = {
      name: "mock group name",
      members: [
        {
          user: "mock id 4",
          email: "mock4@mock.mock"
        },
        {
          user: "mock id 5",
          email: "mock5@mock.mock"
        }
      ]
    }
    Group.findOne.mockImplementation(() => {throw new Error("mock error")});
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    User.findOne = jest.fn().mockReturnValue(true)
    Group.updateOne = jest.fn().mockReturnValue(true)
    await removeFromGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
  })
})

/*
  - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
  - Returns a 400 error if the email passed in the request body is an empty string -- ok
  - Returns a 400 error if the email passed in the request body is not in correct email format -- ok
  - Returns a 400 error if the email passed in the request body does not represent a user in the database -- ok
  - Returns a 400 error if the user to delete is an administrator (role Admin)
  - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
*/
describe("deleteUser", () => {
  test("should delete the user and his transactions from the database and his email from all groups he is part of", async () => {
    const mockReq = {
      body: {
        email: "mock@mock.mock"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1", "mock id 2", "mock id 3", "mock id 4", "mock id 5"],
      modifiedCount: 1
    }
    User.findOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(mockGroup)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith({data: { deletedTransactions: mockTransactions.deletedCount, deletedFromGroup: mockGroup.modifiedCount > 0}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
    expect(mockRes.status).toHaveBeenCalledWith(200)
  })

  test("should delete the user and his transactions from the database and his email from all groups he is part of", async () => {
    const mockReq = {
      body: {
        email: "mock@mock.mock"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1", "mock id 2", "mock id 3", "mock id 4", "mock id 5"],
      modifiedCount: 1
    }
    User.findOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(false)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith({data: { deletedTransactions: mockTransactions.deletedCount, deletedFromGroup: false}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
    expect(mockRes.status).toHaveBeenCalledWith(200)
  })

  test("should return a 400 error if the request body does not contain all the necessary attributes", async () => {
    const mockReq = {
      body: {}
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1", "mock id 2", "mock id 3", "mock id 4", "mock id 5"],
      modifiedCount: 1
    }
    User.findOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(mockGroup)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith({error: "Request body does not contain all the necessary attributes"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return a 400 error if the email passed in the request body is an empty string", async () => {
    const mockReq = {
      body: {
        email: ""
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1", "mock id 2", "mock id 3", "mock id 4", "mock id 5"],
      modifiedCount: 1
    }
    User.findOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(mockGroup)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith({error: "The email passed in the request body is an empty string"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return a 400 error if the email passed in the request body is not in correct email format", async () => {
    const mockReq = {
      body: {
        email: "wrong mock email"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1", "mock id 2", "mock id 3", "mock id 4", "mock id 5"],
      modifiedCount: 1
    }
    User.findOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(mockGroup)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith({error: "The email passed in the request body is not in correct email format"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return a 400 error if the email passed in the request body does not represent a user in the database", async () => {
    const mockReq = {
      body: {
        email: "mock@mock.mock"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1", "mock id 2", "mock id 3", "mock id 4", "mock id 5"],
      modifiedCount: 1
    }
    User.findOne = jest.fn().mockReturnValue(false)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(mockGroup)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith({error: "The email passed in the request body does not represent a user in the database"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return a 400 error if the user to delete is an administrator (role Admin)", async () => {
    const mockReq = {
      body: {
        email: "mock@mock.mock"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1", "mock id 2", "mock id 3", "mock id 4", "mock id 5"],
      modifiedCount: 1
    }
    const mockUser = {
      role: "Admin"
    }
    User.findOne = jest.fn().mockReturnValue(mockUser)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(mockGroup)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith({error: "The user to delete is an admin"})
    expect(mockRes.status).toHaveBeenCalledWith(400)
  })

  test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
    const mockReq = {
      body: {
        email: "mock@mock.mock"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1", "mock id 2", "mock id 3", "mock id 4", "mock id 5"],
      modifiedCount: 1
    }
    User.findOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(mockGroup)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith({error: "Unauthorized"})
    expect(mockRes.status).toHaveBeenCalledWith(401)
  })

  test("should delete the group if the user to delete is the last member of the group", async () => {
    const mockReq = {
      body: {
        email: "mock@mock.mock"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1"],
      modifiedCount: 1
    }
    User.findOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(mockGroup)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith({data: { deletedTransactions: mockTransactions.deletedCount, deletedFromGroup: mockGroup.modifiedCount > 0}, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage})
    expect(mockRes.status).toHaveBeenCalledWith(200)

  })

  test("should return 500 if an error occurs", async () => {
    const mockReq = {
      body: {
        email: "mock@mock.mock"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    const mockTransactions = {
      deletedCount: 2
    }
    const mockGroup = {
      members: ["mock id 1", "mock id 2", "mock id 3", "mock id 4", "mock id 5"],
      modifiedCount: 1
    }
    User.findOne.mockImplementation(() => {throw new Error("mock error")});
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    transactions.deleteMany = jest.fn().mockReturnValue(mockTransactions)
    Group.updateOne = jest.fn().mockReturnValue(mockGroup)
    Group.findOne = jest.fn().mockReturnValue(mockGroup)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    User.deleteOne = jest.fn().mockReturnValue(true)

    await deleteUser(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
  })
})

// - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
// - Returns a 400 error if the name passed in the request body is an empty string -- ok
// - Returns a 400 error if the name passed in the request body does not represent a group in the database -- ok
// - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) -- ok
describe("deleteGroup", () => { 
  test("should delete the group", async () => {
    const mockReq = {
      body: {
        name: "mock name"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    Group.findOne = jest.fn().mockReturnValue(true)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await deleteGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.json).toHaveBeenCalledWith({ data: { message: "Group deleted successfully" }, refreshedTokenMessage: mockRes.locals.refreshedTokenMessage })
  })

  test("should return a 400 error if the name passed in the request body does not represent a group in the database", async () => {
    const mockReq = {
      body: {
        name: "mock name"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    Group.findOne = jest.fn().mockReturnValue(false)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await deleteGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "The name passed in the request body does not represent a group in the database" })
  })

  test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
    const mockReq = {
      body: {
        name: "mock name"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    Group.findOne = jest.fn().mockReturnValue(true)
    Group.deleteOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: false, cause: "Unauthorized"})
    await deleteGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  })

  test("should return 500 if an error occurs", async () => {
    const mockReq = {
      body: {
        name: "mock name"
      }
    }
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: "mock refreshToken"
      }
    }
    Group.findOne.mockImplementation(() => {throw new Error("mock error")});
    Group.deleteOne = jest.fn().mockReturnValue(true)
    verifyAuth.mockReturnValue({authorized: true, cause: "Authorized"})
    await deleteGroup(mockReq, mockRes)
    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({error: "mock error"})
  })
})