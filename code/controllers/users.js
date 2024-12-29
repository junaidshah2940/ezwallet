import { Group, User } from "../models/User.js";
import { transactions } from "../models/model.js";
import { verifyAuth } from "./utils.js";
import jwt from 'jsonwebtoken'
import {deleteTransactions} from "./controller.js";

/**
 * Return all the users
 - Request Body Content: None
 - Response `data` Content: An array of objects, each one having attributes `username`, `email` and `role`
 - Optional behavior:
 - empty array is returned if there are no users
 - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
// OK - double checked
// works
export const getUsers = async (req, res) => {
    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" });
        if (adminAuth.authorized) {
            //Admin auth successful
            const users = await User.find();
            // only send username, email and role
            const usersToSend = users.map(user => {
                return {
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            })
            return res.status(200).json({ data: usersToSend, refreshedTokenMessage: res.locals.refreshedTokenMessage });
        }
        else {
            return res.status(401).json({ error: adminAuth.cause })
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}



/**
 * Return information of a specific user
 - Request Body Content: None
 - Response `data` Content: An object having attributes `username`, `email` and `role`.
 - Optional behavior:
 - Returns a 400 error if the username passed as the route parameter does not represent a user in the database -- ok
 - Returns a 401 error if called by an authenticated user who is neither the same user as the one in the route parameter (authType = User) nor an admin (authType = Admin) -- ok
 */
export const getUser = async (req, res) => {
    try {
        const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username });  // username is the one got from the URL request
        if (userAuth.authorized) {} else {
            const adminAuth = verifyAuth(req, res, { authType: "Admin" });
            if (adminAuth.authorized) {} else {
                return res.status(401).json({ error: adminAuth.cause })
            }
        }
        let user;
        user = await User.findOne({ username: req.params.username })  // searches for the user in the system
        if (!user) return res.status(400).json({ message: "User not found" })  // if the user is not found, returns error 401
        return res.status(200).json({data: {username: user.username, email: user.email, role: user.role}, refreshedTokenMessage: res.locals.refreshedTokenMessage})  // if the user is found, returns the user
    } catch (error) {
        return res.status(500).json({ error: error.message })  // if an error occurs, returns error 500
    }
}

/**
 * Create a new group
 - Request Body Content: An object having a string attribute for the `name` of the group and an array that lists all the `memberEmails`
 - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name`
 of the created group and an array for the `members` of the group), an array that lists the `alreadyInGroup` members
 (members whose email is already present in a group) and an array that lists the `membersNotFound` (members whose email
 +does not appear in the system)
 - Optional behavior:
 - If the user who calls the API does not have their email in the list of emails then their email is added to the list of members -- ok
 - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
 - Returns a 400 error if the group name passed in the request body is an empty string -- ok
 - Returns a 400 error if the group name passed in the request body represents an already existing group in the database -- ok
 - Returns a 400 error if all the provided emails represent users that are already in a group or do not exist in the database -- ok
 - Returns a 400 error if the user who calls the API is already in a group -- ok
 - Returns a 400 error if at least one of the member emails is not in a valid email format -- ok
 - Returns a 400 error if at least one of the member emails is an empty string -- ok
 - Returns a 401 error if called by a user who is not authenticated (authType = Simple) - ??
 */
// OK - double checked
// works
export const createGroup = async (req, res) => {
    try {
        const { name, memberEmails } = req.body;

        // Authentication check
        const simpleAuth = verifyAuth(req, res, { authType: "Simple" })
        if (!simpleAuth.authorized) {
            return res.status(401).json({ error: simpleAuth.cause })
        }

        // Check if group with same name already exists
        const existingGroup = await Group.findOne({ name });
        if (existingGroup) {
            return res.status(400).json({ message: "Group with same name already exists" });
        }

        const cookie = req.cookies;
        const decodedAccessToken = jwt.verify(cookie.accessToken, process.env.ACCESS_KEY);
        const userEmail = decodedAccessToken.email;

        // Check if request body contains all the necessary attributes
        if (name===undefined || !memberEmails) {
            return res.status(400).json({ message: "Request body must contain all the necessary attributes" });
        }
        if (name.trim() === "") {
            return res.status(400).json({ message: "Group name cannot be an empty string" });
        }

        // Check if all member emails are in a valid email format or are not empty strings
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const email of memberEmails) {
            if (email.trim() === "") {
                return res.status(400).json({ message: "At least one of the member emails is an empty string" });
            } else if (!emailRegex.test(email)) {
                return res.status(400).json({ message: "At least one of the member emails is not in a valid email format" });
            }
        }

        // Check if the user email is included in the member emails
        if (!memberEmails.includes(userEmail)) {
            memberEmails.push(userEmail);
        }

        // Check if all member emails exist and are not already in a group
        const members = [];
        const membersToAdd = [];
        const alreadyInGroup = [];
        const membersNotFound = [];
        for (const email of memberEmails) {
            const user = await User.findOne({ email: email });
            if (!user) {
                membersNotFound.push(email);
            } else {
                const groups = await Group.find({ members: { $elemMatch: { email: email } } });
                if (groups.length > 0) {
                    alreadyInGroup.push(email);
                } else if (email === userEmail) {
                    membersToAdd.push({ user: user._id, email });
                } else {
                    members.push({ user: user._id, email });
                    membersToAdd.push({ user: user._id, email });
                }
            }
        }

        // Check if all member emails exist and are not already in a group
        if (members.length === 0) {
            return res.status(400).json({ message: "All member emails either do not exist or are already in a group" });
        }

        // Check if user is already in a group
        if (alreadyInGroup.includes(userEmail)) {
            return res.status(400).json({ message: "User already in a group" })
        }

        // Create new group
        const group = new Group({ name, membersToAdd });
        await group.save();

        // Send response
        return res.status(200).json({data: { group: { name, members: membersToAdd }, alreadyInGroup, membersNotFound }, refreshedTokenMessage: res.locals.refreshedTokenMessage});
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/**
 * Return all the groups
 - Request Body Content: None
 - Response `data` Content: An array of objects, each one having a string attribute for the `name` of the group
 and an array for the `members` of the group
 - Optional behavior:
 - empty array is returned if there are no groups
 - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) -- ok
 */
// OK - double checked
// works
export const getGroups = async (req, res) => {
    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) {
            const groups = await Group.find()
            const groupsToSend = groups.map(group => {
                return {
                    name: group.name,
                    members: group.members
                }
            })
            return res.status(200).json({ data: groupsToSend, refreshedTokenMessage: res.locals.refreshedTokenMessage })
        } else {
            return res.status(401).json({ error: adminAuth.cause })  // if verifyAuth returns an error, returns error 401
        }
    } catch (err) {
        return res.status(500).json({ error: err.message })  // if an error occurs, returns error 500
    }
}

/**
 * Return information of a specific group
 - Request Body Content: None
 - Response `data` Content: An object having a string attribute for the `name` of the group and an array for the
 `members` of the group
 - Optional behavior:
 - Returns a 400 error if the group name passed as a route parameter does not represent a group in the database -- ok
 - Returns a 401 error if called by an authenticated user who is neither part of the group (authType = Group) nor an admin (authType = Admin)
 */
// OK - double checked
// works
export const getGroup = async (req, res) => {
    try {
        let groupName = req.params.name  // get the name of the group to be searched from the request
        let group = await Group.findOne({ name: groupName })  // search for the group in the system

        // Check if the group is found
        if (!group) {  // if the group is not found
            return res.status(400).json({ error: "Group not found" })  // return error 400 if the group is not found
        }
        const groupAuth = verifyAuth(req, res, { authType: "Group", emails: group.members.map(member => member.email) })
        if (groupAuth.authorized) {} else {
            const adminAuth = verifyAuth(req, res, { authType: "Admin" })
            if (adminAuth.authorized) {} else {
                return res.status(401).json({ error: groupAuth.cause })  // if verifyAuth returns an error, returns error 401
            }
        }
        return res.status(200).json({data: {group: { name: group.name, members: group.members} }, refreshedTokenMessage: res.locals.refreshedTokenMessage})
    }
    catch (err) {
        return res.status(500).json({ error: err.message })  // if an error occurs, returns error 500
    }
}

/**
 * Add new members to a group
 - Request Body Content: An array of strings containing the emails of the members to add to the group
 - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the
 created group and an array for the `members` of the group, this array must include the new members as well as the old ones),
 an array that lists the `alreadyInGroup` members (members whose email is already present in a group) and an array that lists
 the `membersNotFound` (members whose email does not appear in the system)
 - Optional behavior (in case any of the following errors apply then no user is added to the group):
 - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
 - Returns a 400 error if the group name passed as a route parameter does not represent a group in the database -- ok
 - Returns a 400 error if all the provided emails represent users that are already in a group or do not exist in the database -- ok
 - Returns a 400 error if at least one of the member emails is not in a valid email format -- ok
 - Returns a 400 error if at least one of the member emails is an empty string -- ok
 - Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is api/groups/:name/add -- ok
 - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is api/groups/:name/insert -- ok
 */
// OK - double checked
// works
export const addToGroup = async (req, res) => {
    try {
        let groupName = req.params.name  // get the name of the group to be searched from the request
        let group = await Group.findOne({ name: groupName })  // search for the group in the system

        // Check if the group is found
        if (!group) {  // if the group is not found
            return res.status(400).json({ error: "Group not found" })  // return error 400 if the group is not found
        }

        const route = req.url.split("/")[3]  // "add" for user, "insert" for admin

        const groupAuth = verifyAuth(req, res, { authType: "Group", emails: group.members.map(member => member.email) })
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (groupAuth.authorized) {
            // console.log("groupAuth")
        } else {
            if (adminAuth.authorized) {
            } else {
                return res.status(401).json({ error: "Unauthorized" })
            }
        }

        const { emails } = req.body;  // get the emails of the members to be added from the request
        let emailsVerify = []  // array of emails of the members of the group

        // check if the request body contains all the necessary attributes
        if (!emails) {
            return res.status(400).json({ error: "Request body does not contain all the necessary attributes" })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(Array.isArray(emails)){
            for (let email of emails) {  // for each email passed
                // Check if the email is valid or an empty string
                if (email.trim() === "") {
                    return res.status(400).json({ error: "At least one of the member emails is an empty string" })
                } else if (!emailRegex.test(email)) {
                    // console.log("email\t:" + email)
                    return res.status(400).json({ error: "At least one of the member emails is not in a valid email format" })
                }
                emailsVerify.push(email)  // add the email of the member to the array of emails
            }
        } else {
            if (!emailRegex.test(emails)) {
                return res.status(400).json({ error: "At least one of the member emails is not in a valid email format" })
            }
            emailsVerify.push(emails)  // add the email of the member to the array of emails
        }
        const members = [];
        const alreadyInGroup = [];
        const membersNotFound = [];
        // console.log("emails\t:" + emails.length)
        // console.log("emails\t:" + emails)
        for (const email of emails) {
            // console.log("email\t:" + email)
            const user = await User.findOne({ email: email });
            if (!user) {
                // console.log("user " + email + " not found")
                membersNotFound.push(email);
            } else {
                const groups = await Group.find({ members: { $elemMatch: { email: email } } });
                // console.log("groups\t:" + groups.length)
                // console.log("groups\t:" + groups.length)
                if (groups.length > 0) {
                    // console.log("user " + email + " already in group")
                    alreadyInGroup.push(email);
                } else {
                    // console.log("user " + email + " is ok")
                    members.push({ user: user._id, email: email });
                }
            }
        }

        // Check if all the provided emails represent users that are already in a group or do not exist in the database
        if (members.length === 0) {
            return res.status(400).json({ error: "All the provided emails represent users that are already in a group or do not exist in the database" })
        }

        await Group.updateOne({ name: groupName },
            {
                $push: {
                    members: {
                        $each:
                        members
                    }
                }
            })
        const response = await Group.findOne({ name: groupName })
        const toReturn = { data: { group: response, alreadyInGroup: alreadyInGroup, membersNotFound: membersNotFound }, refreshedTokenMessage: groupAuth.refreshedTokenMessage }
        return res.status(200).json(toReturn)
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}


/**
 * Remove members from a group
 - Request Parameters: A string equal to the `name` of the group
 - Example: `api/groups/Family/remove` (user route)
 - Example: `api/groups/Family/pull` (admin route)
 - Request Body Content: An array of strings containing the `emails` of the members to remove from the group
 - Example: `{emails: ["pietro.blue@email.com"]}`
 - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the created group and an array for the `members` of the group, this array must include only the remaining members), an array that lists the `notInGroup` members (members whose email is not in the group) and an array that lists the `membersNotFound` (members whose email does not appear in the system)
 - Example: `res.status(200).json({data: {group: {name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}]}, membersNotFound: [], notInGroup: []} refreshedTokenMessage: res.locals.refreshedTokenMessage})`
 - In case any of the following errors apply then no user is removed from the group
 - Returns a 400 error if the request body does not contain all the necessary attributes
 - Returns a 400 error if the group name passed as a route parameter does not represent a group in the database
 - Returns a 400 error if all the provided emails represent users that do not belong to the group or do not exist in the database
 - Returns a 400 error if at least one of the emails is not in a valid email format
 - Returns a 400 error if at least one of the emails is an empty string
 - Returns a 400 error if the group contains only one member before deleting any user
 - Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/remove`
 - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/pull`
 */
// works
export const removeFromGroup = async (req, res) => { //IMPORTANT: this fn must delete all except (at least) one member from the grp: it's impossible to remove every user leaving the grp empty. If only one user is present, error should be returned
    try {
        const groupName = req.params.name;
        const group = await Group.findOne({name: groupName});
        // check if the group name passed as a route parameter does not represent a group in the database
        if (!group) {
            return res.status(400).json({ error: "The group name passed as a route parameter does not represent a group in the database" })
        }
        const route = req.url.split("/")[3]; // "remove" for group, "pull" for admin

        const groupAuth = verifyAuth(req, res, { authType: "Group", emails: group.members.map(member => member.email) })
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (groupAuth.authorized) {
        } else {
            if (adminAuth.authorized) {
            } else {
                return res.status(401).json({ error: "Unauthorized" })
            }
        }
        if(adminAuth.authorized && route === "pull") {} else {
            if(groupAuth.authorized && route === "remove") {} else {
                return res.status(401).json({ error: "Wrong route" })
            }
        }
        const memberEmails = req.body.emails;
        if (!memberEmails) {
            return res.status(400).json({ error: "Request body does not contain all the necessary attributes" })
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const email of memberEmails) {
            if (email.trim() === "") {
                return res.status(400).json({ error: "At least one of the emails is an empty string" })
            } else if (!emailRegex.test(email)) {
                return res.status(400).json({error: "At least one of the emails is not in a valid email format"})
            }
        }

        // check if the group contains only one member before deleting any user
        if(group.members.length == 1){
            return res.status(400).json({error: "Cannot remove all members from group"});
        }

        const members = [];
        const notInGroup = [];
        const notFound = [];
        const groupEmails = group.members.map(member => member.email);

        for (const email of memberEmails) {
            const user = await User.findOne({ email: email.toString() });
            if (!user) {
                notFound.push(email);
            } else {
                if (groupEmails.includes(email.toString())) {
                    members.push({ email: email });
                } else {
                    notInGroup.push(email);
                }
            }
        }

        // check if all the provided emails represent users that do not belong to the group or do not exist in the database
        if (members.length === 0) {
            return res.status(400).json({ error: "All member emails either do not exist or are already in a group" });
        }

        if (notInGroup.length == 0 && notFound.length == 0 && members.length == group.members.length) {
            //REMOVE THE FIRST EMAIL FROM THE ARRAY OF EMAILS TO BE REMOVED FROM THE GROUP
            members.shift();  //remove the first email from the array of emails to be removed from the group
        }

        await Group.updateOne({ name: groupName },
            {
                $pull:{
                    members:{
                        email: {
                            $in:
                            memberEmails
                        }
                    }
                }
            })
        const response = await Group.findOne({name:groupName})
        const toReturn = {data: {group: response, notInGroup: notInGroup, membersNotFound: notFound}, refreshedTokenMessage: res.locals.refreshedTokenMessage}
        return res.status(200).json(toReturn)
    } catch (err) {
        return res.status(500).json({ error: err.message})
    }
}


/**
 * Delete a user
 - Request Parameters: None
 - Request Body Content: A string equal to the `email` of the user to be deleted
 - Response `data` Content: An object having an attribute that lists the number of `deletedTransactions` and a boolean attribute that
 specifies whether the user was also `deletedFromGroup` or not.
 - Optional behavior:
 - If the user is the last user of a group then the group is deleted as well -- DA controllare
 - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
 - Returns a 400 error if the email passed in the request body is an empty string -- ok
 - Returns a 400 error if the email passed in the request body is not in correct email format -- ok
 - Returns a 400 error if the email passed in the request body does not represent a user in the database -- ok
 - Returns a 400 error if the user to delete is an administrator (role Admin)
 - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
// TO CHECK AGAIN
export const deleteUser = async (req, res) => {
    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) {} else {
            return res.status(401).json({ error: "Unauthorized" })
        }

        const { email } = req.body;
        // check if the request body contains all the necessary attributes
        if (email===undefined) {
            return res.status(400).json({ error: "Request body does not contain all the necessary attributes" })
        }
        // check if the email passed in the request body is an empty string
        if (email.trim() === "") {
            return res.status(400).json({ error: "The email passed in the request body is an empty string" })
        }

        // check if the email passed in the request body is not in correct email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "The email passed in the request body is not in correct email format" })
        }

        const user = await User.findOne({ email: email })
        // check if the email passed in the request body does not represent a user in the database
        if (!user) {
            return res.status(400).json({ error: "The email passed in the request body does not represent a user in the database" })
        }
        if (user.role === "Admin") {
            return res.status(400).json({ error: "The user to delete is an admin" });
        }

        const deletedTrans = await transactions.deleteMany({ username: user.username })  //delete all transactions of the user
        //check if the user is the last user of a group then the group is deleted as well
        const group = await Group.findOne({members: {$elemMatch: {email:email}}})
        let deletedFromGroup;
        if(group){
            if(group.members.length == 1){
                await Group.deleteOne({name: group.name})
                deletedFromGroup = {modifiedCount: 1}
            }
            else {
                // console.log("group\t" + group)
                deletedFromGroup = await Group.updateOne({
                    members: {  //delete the user from all groups
                        $elemMatch: {
                            email: email
                        }
                    }
                }, {
                    $pull: {
                        members: { email: email }
                    }
                })
            }
        } else {
            deletedFromGroup = {modifiedCount: 0}
        }
        await User.deleteOne({email:email}) //delete the user
        return res.status(200).json({data: { deletedTransactions: deletedTrans.deletedCount, deletedFromGroup: deletedFromGroup.modifiedCount > 0}, refreshedTokenMessage: res.locals.refreshedTokenMessage})
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}

/**
 * Delete a group
 - Request Parameters: None
 - Request Body Content: A string equal to the `name` of the group to be deleted
 - Example: `{name: "Family"}`
 - Response `data` Content: A message confirming successful deletion -- okkkkkkk
 - Example: `res.status(200).json({data: {message: "Group deleted successfully"} , refreshedTokenMessage: res.locals.refreshedTokenMessage})` -- ok
 - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
 - Returns a 400 error if the name passed in the request body is an empty string -- ok
 - Returns a 400 error if the name passed in the request body does not represent a group in the database -- ok
 - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) -- ok

 */
export const deleteGroup = async (req, res) => {
    try {
        const {name} = req.body;
        const group = await Group.findOne({ name: name });
        // check if the name passed in the request body does not represent a group in the database
        if (!group) {
            return res.status(400).json({ error: "The name passed in the request body does not represent a group in the database" })
        }
        // perform authorization check
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) {} else {
            return res.status(401).json({ error: "Unauthorized" })
        }

        // check if the request body does not contain all the necessary attributes
        // if (name===undefined) {
        //     return res.status(400).json({ error: "The request body does not contain all the necessary attributes" })
        // }

        // check if the name passed in the request body is an empty string
        // if (name.trim() === "") {
        //     return res.status(400).json({ error: "The name passed in the request body is an empty string" })
        // }
        await Group.deleteOne({ name: name });
        return res.status(200).json({ data: { message: "Group deleted successfully" }, refreshedTokenMessage: res.locals.refreshedTokenMessage })
    } catch (err) {
        return res.status(500).json({ error: err.message })
    }
}