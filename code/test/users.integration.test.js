import request from 'supertest';
import { app } from '../app';
import { categories } from '../models/model';
import { transactions } from '../models/model';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
// import "jest-extended"
import { User, Group } from '../models/User';
import jwt from 'jsonwebtoken';
import { verifyAuth, handleDateFilterParams } from '../controllers/utils';
import e from 'express';

dotenv.config();

beforeAll(async () => {
  const dbName = "testingDatabaseUser";
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
  role: "User"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

//These tokens can be used in order to test the specific authentication error scenarios inside verifyAuth (no need to have multiple authentication error tests for the same route)
const testerAccessTokenExpired = jwt.sign({
  email: "tester@test.com",
  username: "tester",
  role: "User"
}, process.env.ACCESS_KEY, { expiresIn: '0s' })
const testerAccessTokenEmpty = jwt.sign({}, process.env.ACCESS_KEY, { expiresIn: "1y" })

describe("users.js", () =>{
  describe("getUsers", () => {
    test("should retrieve the list of all users (admin)", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        }
      ]);
      const response = await request(app)
          .get("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(3)
    })

    test("should retrieve the list of all users (user)", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "tester",
          email: "tester@test.com",
          password: "User"
        }
      ]);
      const response = await request(app)
          .get("/api/users/tester")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
      expect(response.status).toBe(200)
    })

    test("should return 401 if not authorized", async() => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        }
      ]);
      const response = await request(app)
          .get("/api/users")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })

    test("should return an empty list if no users are found", async() => {
      const response = await request(app)
          .get("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(0)
    })

    test('should return 500 if an error occurs', async () => {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();
      const response = await request(app)
          .get("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
      expect(response.status).toBe(500)
      const dbName = "testingDatabaseUser";
      const url = `${process.env.MONGO_URI}/${dbName}`;

      await mongoose.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
    });
  })

  describe("getUser", () => {
    test("should return the user with the given id", async() => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        }
      ]);
      const response = await request(app)
          .get("/api/users/mock user 1")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .then((response) => {
            expect(response.status).toBe(200)
            expect(response.body.data.username).toBe("mock user 1")
          })
    })

    test("should return 401 if not authorized", async() => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        }
      ]);
      const response = await request(app)
          .get("/api/users/mock user 1")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Unauthorized")
    })

    test("should return 400 if no user is found", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        }
      ]);
      const response = await request(app)
          .get("/api/users/mock user 4")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.message).toBe("User not found")
    })

    test('should return 500 if an error occurs', async () => {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();
      const response = await request(app)
          .get("/api/users/mock user 1")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .then((response) => {
            expect(response.status).toBe(500)
          })
      const dbName = "testingDatabaseUser";
      const url = `${process.env.MONGO_URI}/${dbName}`;

      await mongoose.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
    });
  })

  describe("createGroup", () => {
    test("should create a new group", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group", "memberEmails": ["mock1@mock.mock","mock2@mock.mock", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(200)
      expect(response.body.data.group.name).toBe("mock group")
      expect(response.body.data.group.members).toHaveLength(3)  // the third user is the admin that is creating the group
      expect(response.body.data.alreadyInGroup).toHaveLength(1)
      expect(response.body.data.membersNotFound).toHaveLength(1)
    })

    test("should create a new group", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group", "memberEmails": ["admin@email.com", "mock1@mock.mock","mock2@mock.mock", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(200)
      expect(response.body.data.group.name).toBe("mock group")
      expect(response.body.data.group.members).toHaveLength(3)  // the third user is the admin that is creating the group
      expect(response.body.data.alreadyInGroup).toHaveLength(1)
      expect(response.body.data.membersNotFound).toHaveLength(1)
    })

    test("should return 401 if not authorized", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          // .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .set("Cookie", `accessToken=${"notValidToken"}; refreshToken=${"notValidToken"}`)
          .send({ "name": "mock group", "memberEmails": ["mock1@mock.mock","mock2@mock.mock", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 400 if the request body does not contain all the necessary attributes", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "memberEmails": ["mock1@mock.mock","mock2@mock.mock", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.message).toBe("Request body must contain all the necessary attributes")
    })
    test("should return 400 if the group name passed in the request body is an empty string", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "", "memberEmails": ["mock1@mock.mock","mock2@mock.mock", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.message).toBe("Group name cannot be an empty string")
    })
    test("should return 400 if the group name passed in the request body represents an already existing group in the database", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "my group", "memberEmails": ["mock1@mock.mock","mock2@mock.mock", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.message).toBe("Group with same name already exists")
    })
    test("should return 400 if all the provided emails represent users that are already in a group or do not exist in the database",  async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            },
            {
              email: "admin@email.com"
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group name", "memberEmails": ["notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.message).toBe("All member emails either do not exist or are already in a group")
    })
    test("should return 400 if the user who calls the API is already in a group",  async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            },
            {
              email: "admin@email.com"
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group name", "memberEmails": ["mock1@mock.mock", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.message).toBe("User already in a group")
    })
    test("should return 400 if at least one of the member emails is not in a valid email format",  async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            },
            {
              email: "admin@email.com"
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group name", "memberEmails": ["not valid mock email", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.message).toBe("At least one of the member emails is not in a valid email format")
    })
    test("should return 400 if at least one of the member emails is an empty string",  async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "my group",
          members: [
            {
              email: "user1@example.com",
            },
            {
              email: "alreadyingroup@mock.mock",
            },
            {
              email: "admin@email.com"
            }
          ]
        }
      ])
      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group name", "memberEmails": ["", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.message).toBe("At least one of the member emails is an empty string")
    })
    test("should return 500 if an error occurs", async () => {

      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();

      const response = await request(app)
          .post("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group", "memberEmails": ["mock1@mock.mock","mock2@mock.mock", "notfound@mock.mock", "alreadyingroup@mock.mock"] })
      expect(response.status).toBe(500)

      const dbName = "testingDatabaseUser";
      const url = `${process.env.MONGO_URI}/${dbName}`;
      await mongoose.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
    });
  })

  describe("getGroups", () => {
    test("should return all groups in the database", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .get("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
      expect(response.status).toBe(200)
      expect(response.body.data[0].name).toBe("mock group 1")
      expect(response.body.data[1].name).toBe("mock group 2")
      expect(response.body.data[0].members.length).toBe(3)
    })
    test("should return 401 if the user is not authorized", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .get("/api/groups")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Unauthorized")
    })
    test("should return 500 if an error occurs", async () => {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();

      const response = await request(app)
          .get("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
      expect(response.status).toBe(500)

      const dbName = "testingDatabaseUser";
      const url = `${process.env.MONGO_URI}/${dbName}`;
      await mongoose.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
    })
  })

  describe("getGroup", () => {
    test("should return the group requested (admin)", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .get("/api/groups/mock group 1")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
      expect(response.status).toBe(200)
      expect(response.body.data.group.name).toBe("mock group 1")
      expect(response.body.data.group.members.length).toBe(3)
    })

    test("should return the group requested (group)", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .get("/api/groups/mock group 1")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
      expect(response.status).toBe(200)
    })

    test("should return 400 if the group name passed as route parameter does not represent a group in the database", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .get("/api/groups/mock group 3")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Group not found")
    })
    test("should return 401 if the user is not authorized", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .get("/api/groups/mock group 1")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Unauthorized")
    })
    test("should return 500 if an error occurs", async () => {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();

      const response = await request(app)
          .get("/api/groups/mock group 1")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
      expect(response.status).toBe(500)

      const dbName = "testingDatabaseUser";
      const url = `${process.env.MONGO_URI}/${dbName}`;
      await mongoose.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
    
    });
  })

  describe("addToGroup", () => {
    test("should add a user to a group (user)", async() => {  // route is /api/groups/:groupName/add
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/add")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({"emails": ["mock5@mock.mock", "mock6@mock.mock", "mock4@mock.mock"]})
      expect(response.status).toBe(200)
      expect(response.body.data.group.name).toBe("mock group 1")
      expect(response.body.data.group.members.length).toBe(6)
    })
    test("should add a user to a group (user) one email", async() => {  // route is /api/groups/:groupName/add
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/add")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({"emails": "mock6@mock.mock"})
      expect(response.status).toBe(400)
    })
    test("should add a user to a group (admin)", async() => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/insert")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock5@mock.mock", "mock6@mock.mock"]})
      expect(response.status).toBe(200)
      expect(response.body.data.group.name).toBe("mock group 1")
      expect(response.body.data.group.members.length).toBe(6)
    })
    test("should return 400 if the request body does not contain all the necessary attributes", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/insert")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"nothing": "nothing"})
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Request body does not contain all the necessary attributes")
    })
    test("should return 400 if the group name passed as a route parameter does not represent a group in the database", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 3/insert")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock5@mock.mock", "mock6@mock.mock"]})
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Group not found")
    })
    test("should return 400 if all the provided emails represent users that are already in a group or do not exist in the database", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/insert")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock7@mock.mock", "mock8@mock.mock"]})
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("All the provided emails represent users that are already in a group or do not exist in the database")
    })
    test("should return 400 if at least one of the member emails is not in a valid email format", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/insert")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["wrong mock email format", "mock5@mock.mock"]})
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("At least one of the member emails is not in a valid email format")
    })
    test("should return 400 if at least one of the member emails is not in a valid email format (only one email)", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/insert")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": "wrong mock email format"})
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("At least one of the member emails is not in a valid email format")
    })
    test("should return 400 if at least one of the member emails is an empty string", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/insert")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["", "mock5@mock.mock"]})
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("At least one of the member emails is an empty string")
    })
    test("should return 401 if called by an authenticated user who is not part of the group (authType = Group) if the route is api/groups/:name/add", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/add")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({"emails": ["mock4@mock.mock", "mock5@mock.mock"]})
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Unauthorized")
    })
    test("should return 401 if called by an authenticated user who is not an admin (authType = Admin) if the route is api/groups/:name/insert", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/insert")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({"emails": ["mock4@mock.mock", "mock5@mock.mock"]})
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Unauthorized")
    })
    test("should return 500 if an error occurs", async () => {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();

      const response = await request(app)
          .patch("/api/groups/mock group 1/add")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({"emails": ["mock5@mock.mock", "mock6@mock.mock"]})
      expect(response.status).toBe(500)

      const dbName = "testingDatabaseUser";
      const url = `${process.env.MONGO_URI}/${dbName}`;
      await mongoose.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
    
    });
  })

  describe("removeFromGroup", () => {
    test("should remove the users passed in the body from the group passed in the params (admin)", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/pull")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock","mock2@mock.mock"]})
      expect(response.body.data.group.name).toBe("mock group 1")
      expect(response.status).toBe(200)
      expect(response.body.data.group.members.length).toBe(1)
    })

    test("should remove the users passed in the body from the group passed in the params (group)", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            },
            {
              email: "tester@test.com"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/remove")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock","mock2@mock.mock"]})
      expect(response.status).toBe(200)
    })

    test("should remove the users passed in the body from the group passed in the params", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/pull")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock","mock2@mock.mock","mock3@mock.mock"]})
      expect(response.body.data.group.name).toBe("mock group 1")
      expect(response.status).toBe(200)
    })
    test("should return 401 if the route is not correct", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/remove")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock","mock2@mock.mock"]})
      expect(response.body.error).toBe("Wrong route")
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 400 if the request body does not contain all the necessary attributes", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/pull")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({})
      expect(response.body.error).toBe("Request body does not contain all the necessary attributes")
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 400 if the group name passed as a route parameter does not represent a group in the database", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/wrong mock group 1/pull")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock","mock2@mock.mock"]})
      expect(response.body.error).toBe("The group name passed as a route parameter does not represent a group in the database")
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 400 if all the provided emails represent users that do not belong to the group or do not exist in the database", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/pull")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock4@mock.mock","mockNotExists@mock.mock"]})
      expect(response.status).toBe(400)
      expect(response.body.error).toBe("All member emails either do not exist or are already in a group")
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 400 if at least one of the emails is not in a valid email format", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/pull")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock","not valid mock email"]})
      expect(response.status).toBe(400)
      expect(response.body.error).toBe("At least one of the emails is not in a valid email format")
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 400 if at least one of the emails is an empty string", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/pull")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock",""]})
      expect(response.status).toBe(400)
      expect(response.body.error).toBe("At least one of the emails is an empty string")
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 400 if the group contains only one member before deleting any user", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/pull")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock"]})
      expect(response.status).toBe(400)
      expect(response.body.error).toBe("Cannot remove all members from group")
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 401 if called by an authenticated user who is not part of the group (authType = Group) if the route is api/groups/:name/remove", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/remove")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock","mock2@mock.mock"]})
      expect(response.status).toBe(401)
      expect(response.body.error).toBe("Unauthorized")
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 401 if called by an authenticated user who is not an admin (authType = Admin) if the route is api/groups/:name/pull", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ])
      const response = await request(app)
          .patch("/api/groups/mock group 1/pull")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock","mock2@mock.mock"]})
      expect(response.status).toBe(401)
      expect(response.body.error).toBe("Unauthorized")
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
    })
    test("should return 500 if an error occurs", async () => {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();

      const response = await request(app)
          .patch("/api/groups/mock group 1/pull")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"emails": ["mock1@mock.mock","mock2@mock.mock"]})
      expect(response.status).toBe(500)

      const dbName = "testingDatabaseUser";
      const url = `${process.env.MONGO_URI}/${dbName}`;
      await mongoose.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
    
    });
  })

  describe("deleteUser", () => {
    test("should delete the user and his transactions from the database and his email from all groups he is part of", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      await transactions.insertMany([
        {
          username: "mock user 1",
          type: "mock type 1",
          amount: 100
        },
        {
          username: "mock user 1",
          type: "mock type 2",
          amount: 150
        }
      ])
      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"email": "mock1@mock.mock"})
      // console.log(response.body)
      expect(response.status).toBe(200)
      expect(response.body.data.deletedTransactions).toBe(2)
      expect(response.body.data.deletedFromGroup).toBe(true)
    })
    test("should delete the user and his transactions from the database and his email from all groups he is part of", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      await transactions.insertMany([
        {
          username: "mock user 1",
          type: "mock type 1",
          amount: 100
        },
        {
          username: "mock user 1",
          type: "mock type 2",
          amount: 150
        }
      ])
      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"email": "mock1@mock.mock"})
      // console.log(response.body)
      expect(response.status).toBe(200)
    })
    test("should return a 400 error if the request body does not contain all the necessary attributes", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      await transactions.insertMany([
        {
          username: "mock user 1",
          type: "mock type 1",
          amount: 100
        },
        {
          username: "mock user 1",
          type: "mock type 2",
          amount: 150
        }
      ])
      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({})
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Request body does not contain all the necessary attributes")
    })
    test("should return a 400 error if the email passed in the request body is an empty string", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      await transactions.insertMany([
        {
          username: "mock user 1",
          type: "mock type 1",
          amount: 100
        },
        {
          username: "mock user 1",
          type: "mock type 2",
          amount: 150
        }
      ])
      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "email": "" })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("The email passed in the request body is an empty string")
    })
    test("should return a 400 error if the email passed in the request body is not in correct email format", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      await transactions.insertMany([
        {
          username: "mock user 1",
          type: "mock type 1",
          amount: 100
        },
        {
          username: "mock user 1",
          type: "mock type 2",
          amount: 150
        }
      ])
      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "email": "not valid email" })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("The email passed in the request body is not in correct email format")
    })
    test("should return a 400 error if the email passed in the request body does not represent a user in the database", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      await transactions.insertMany([
        {
          username: "mock user 1",
          type: "mock type 1",
          amount: 100
        },
        {
          username: "mock user 1",
          type: "mock type 2",
          amount: 150
        }
      ])
      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "email": "notexisting@mock.mock" })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("The email passed in the request body does not represent a user in the database")
    })
    test("should return a 400 error if the user to delete is an administrator (role Admin)", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      await transactions.insertMany([
        {
          username: "mock user 1",
          type: "mock type 1",
          amount: 100
        },
        {
          username: "mock user 1",
          type: "mock type 2",
          amount: 150
        }
      ])
      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "email": "admin@email.com" })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("The user to delete is an admin")
    })
    test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      await transactions.insertMany([
        {
          username: "mock user 1",
          type: "mock type 1",
          amount: 100
        },
        {
          username: "mock user 1",
          type: "mock type 2",
          amount: 150
        }
      ])
      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({ "email": "mock1@mock.mock" })
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Unauthorized")
    })
    test("should delete the group if the user to delete is the last member of the group", async () => {
      await User.insertMany([
        {
          username: "mock user 1",
          email: "mock1@mock.mock",
          password: "mock1"
        },
        {
          username: "mock user 2",
          email: "mock2@mock.mock",
          password: "mock2"
        },
        {
          username: "mock user 3",
          email: "mock3@mock.mock",
          password: "mock3",
          role: "Admin"
        },
        {
          username: "mock user 4",
          email: "mock4@mock.mock",
          password: "mock4"
        },
        {
          username: "mock user 5",
          email: "mock5@mock.mock",
          password: "mock5"
        },
        {
          username: "mock user 6",
          email: "mock6@mock.mock",
          password: "mock6"
        },
        {
          username: "alreadyingroup",
          email: "alreadyingroup@mock.mock",
          password: "alreadyingroup",
        },
        {
          username: "admin",
          email: "admin@email.com",
          password: "admin",
          role: "Admin"
        }
      ]);
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      await transactions.insertMany([
        {
          username: "mock user 1",
          type: "mock type 1",
          amount: 100
        },
        {
          username: "mock user 1",
          type: "mock type 2",
          amount: 150
        }
      ])
      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "email": "mock4@mock.mock" })
      // console.log(response.body.error)
      expect(response.status).toBe(200)
      expect(response.body.data.deletedTransactions).toBe(0)
      expect(response.body.data.deletedFromGroup).toBe(true)
    })
    test("should return 500 if an error occurs", async () => {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();

      const response = await request(app)
          .delete("/api/users")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({"email": "mock1@mock.mock"})
      expect(response.status).toBe(500)

      const dbName = "testingDatabaseUser";
      const url = `${process.env.MONGO_URI}/${dbName}`;
      await mongoose.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
    
    });
  })

  describe("deleteGroup", () => {
    test("should delete the group", async () => {
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      const response = await request(app)
          .delete("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group 1" })
      expect(response.status).toBe(200)
      expect(response.body.data.message).toBe("Group deleted successfully")
    })

    test("should return a 400 error if the name passed in the request body does not represent a group in the database", async () => {
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      const response = await request(app)
          .delete("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group not existing" })
      expect(response.status).toBe(400)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("The name passed in the request body does not represent a group in the database")
    })
    test("should return a 401 error if called by an authenticated user who is not an admin (authType = Admin)", async () => {
      await Group.insertMany([
        {
          name: "mock group 1",
          members: [
            {
              email: "mock1@mock.mock",
            },
            {
              email: "mock2@mock.mock",
            },
            {
              email: "mock3@mock.mock"
            }
          ]
        },
        {
          name: "mock group 2",
          members: [
            {
              email: "mock4@mock.mock",
            }
          ]
        }
      ]);
      const response = await request(app)
          .delete("/api/groups")
          .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
          .send({ "name": "mock group 1" })
      expect(response.status).toBe(401)
      const errorMessage = response.body.error ? true : response.body.message ? true : false
      expect(errorMessage).toBe(true)
      expect(response.body.error).toBe("Unauthorized")
    })
    test("should return 500 if an error occurs", async () => {
      await mongoose.connection.db.dropDatabase();
      await mongoose.connection.close();

      const response = await request(app)
          .delete("/api/groups")
          .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
          .send({ "name": "mock group 1" })
      expect(response.status).toBe(500)

      const dbName = "testingDatabaseUser";
      const url = `${process.env.MONGO_URI}/${dbName}`;
      await mongoose.connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
    
    });
  })
})
