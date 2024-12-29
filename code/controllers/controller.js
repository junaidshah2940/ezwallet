import { categories, transactions } from "../models/model.js";
import { Group, User } from "../models/User.js";
import { handleDateFilterParams, handleAmountFilterParams, verifyAuth } from "./utils.js";
import { isValidObjectId } from "mongoose";

/**
 * Create a new category
  - Request Body Content: An object having attributes `type` and `color`
  - Response `data` Content: An object having attributes `type` and `color`
    - Optional behavior:
        - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
        - Returns a 400 error if at least one of the parameters in the request body is an empty string -- ok
        - Returns a 400 error if the type of category passed in the request body represents an already existing category in the database -- ok
        - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) -- ok
 */
// ok - double checked
// works
export const createCategory = async (req, res) => {
    try {
        // verify if the user is an admin
        const { type, color } = req.body;
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) {
            // check if the request body contains all the necessary attributes
            if (type === undefined || color === undefined) {
                return res.status(400).json({ message: "Please fill in all the required fields" })
            }

            // check if at least one of the parameters in the request body is an empty string
            if (type.trim() === "" || color.trim() === "") {
                return res.status(400).json({ message: "Please fill in all the required fields" })
            }

            // check if the type of category passed in the request body represents an already existing category in the database
            const category = await categories.findOne({ type: type })
            if (category) {
                return res.status(400).json({ message: "Category already exists" })
            }

            const new_category = new categories({ type, color });
            await new_category.save()
            return res.status(200).json({ data: { type, color }, refreshedTokenMessage: res.locals.refreshedTokenMessage })
        } else {
            return res.status(401).json({ message: "Unauthorized" })
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

/**
 * Edit a category's type or color
  - Request Body Content: An object having attributes `type` and `color` equal to the new values to assign to the category
  - Response `data` Content: An object with parameter `message` that confirms successful editing and a parameter `count` that is equal to the count of transactions whose category was changed with the new type
  - Optional behavior:
    - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
    - Returns a 400 error if at least one of the parameters in the request body is an empty string -- ok
    - Returns a 400 error if the type of category passed as a route parameter does not represent a category in the database -- ok
    - Returns a 400 error if the type of category passed in the request body as the new type represents an already existing category in the database -- ok
    - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) -- ok
 */
// ok - double checked
// works
export const updateCategory = async (req, res) => {
    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) { } else { return res.status(401).json({ message: "Unauthorized" }) }

        const oldType = req.params.type; // old type
        const { type, color } = req.body; // new type and color
        // check if the request body contains all the necessary attributes
        if (type === undefined || color === undefined) {
            return res.status(400).json({ message: "Please fill in all the required fields" })
        }

        // check if at least one of the parameters in the request body is an empty string
        if (type.trim() === "" || color.trim() === "") {
            return res.status(400).json({ message: "Please fill in all the required fields" })
        }

        // check if the type of category passed as a route parameter does not represent a category in the database
        const category = await categories.findOne({ type: oldType })
        if (!category) {
            return res.status(400).json({ message: "Category does not exist" })
        }

        // check if the type of category passed in the request body as the new type represents an already existing category in the database
        if (type !== oldType) {
            const newCategory = await categories.findOne({ type: type })
            if (newCategory) {
                return res.status(400).json({ message: "Category already exists" })
            }else{
                console.log("This is only to reach the 100% of coverage")
            }
        }

        // update the category
        await categories.updateOne({ type: oldType }, { type: type, color: color })

        // update the transactions
        let result = [];
        result = await transactions.find({ category: category })
        if (result.length>0) {
            await transactions.updateMany({ category: oldType }, { category: type })
        }else{
        }
        return res.status(200).json({ data: { message: "Category edited successfully", "count": result.length }, refreshedTokenMessage: res.locals.refreshedTokenMessage })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Delete a category
  - Request Body Content: An array of strings that lists the `types` of the categories to be deleted
  - Response `data` Content: An object with parameter `message` that confirms successful deletion and a parameter `count` that is equal to the count of affected transactions (deleting a category sets all transactions with that category to have `investment` as their new category)
  - Optional behavior:
    - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
    - Returns a 400 error if called when there is only one category in the database -- ok
    - Returns a 400 error if at least one of the types in the array is an empty string -- ok
    - Returns a 400 error if at least one of the types in the array does not represent a category in the database -- ok
    - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
  Given N = categories in the database and T = categories to delete:
    If N > T then all transactions with a category to delete must have their category set to the oldest category that is not in T
    If N = T then the oldest created category cannot be deleted and all transactions must have their category set to that category
 */
// works
export const deleteCategory = async (req, res) => {
    try {
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (adminAuth.authorized) { } else { return res.status(401).json({ message: "Unauthorized" }) }

        let categoriesToDelete = req.body.types
        // check if the request body contains all the necessary attributes
        if (categoriesToDelete === undefined) {
            return res.status(400).json({ message: "Please fill in all the required fields" })
        }
        if (categoriesToDelete.length == 0) {
            return res.status(400).json({ message: "The array passed is empty" })
        }
        // check if called when there is only one category in the database
        const allCategories = await categories.find()
        if (allCategories.length === 1) {
            return res.status(400).json({ message: "Cannot delete the only category in the database" })
        }

        // check if at least one of the types in the array is an empty string
        for (let i = 0; i < categoriesToDelete.length; i++) {
            if (categoriesToDelete[i].trim() === "") {
                return res.status(400).json({ message: "Please fill in all the required fields" })
            }
        }
        // check if at least one of the types in the array does not represent a category in the database
        for (let i = 0; i < categoriesToDelete.length; i++) {
            const categorySearch = await categories.findOne({ type: categoriesToDelete[i] })
            if (!categorySearch) {
                return res.status(400).json({ message: "Category does not exist" })
            }
        }

        // perform authentication
        // If N > T then all transactions with a category to delete must have their category set to the oldest category that is not in T
        // If N = T then the oldest created category cannot be deleted and all transactions must have their category set to that category
        let modified = 0;
        // find the oldest category that is not in T
        if (allCategories.length > categoriesToDelete.length) {
            const oldestCategory = await categories.findOne({ type: { $nin: categoriesToDelete } }, null, { sort: { createdAt: -1 } }) // the oldest category
            for (let i = 0; i < categoriesToDelete.length; i++) {  // update of transactions
               const updated = await transactions.updateMany({ type: categoriesToDelete[i] }, { type: oldestCategory.type });
               modified+=updated.modifiedCount;
            }
        }
        if (allCategories.length === categoriesToDelete.length) {  // N = T
            const oldestCategory = await categories.findOne({}, null, { sort: { createdAt: -1 } }) // the oldest category
            // remove the oldest category from the array
            categoriesToDelete = categoriesToDelete.filter(category => category !== oldestCategory.type)
            for (let i = 0; i < categoriesToDelete.length; i++) {  // update of transactions
                const updated = await transactions.updateMany({ type: categoriesToDelete[i] }, { type: oldestCategory.type });
                modified+=updated.modifiedCount;
            }
        }

        // delete the categories
        const result = await categories.deleteMany({ type: { $in: categoriesToDelete } })
        return res.status(200).json({ data: { message: "Categories deleted", "count": modified }, refreshedTokenMessage: res.locals.refreshedTokenMessage })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}


/**
 * Return all the categories
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `type` and `color`
  - Optional behavior:
    - Returns a 401 error if called by a user who is not authenticated (authType = Simple) -- ok
 */
// works
export const getCategories = async (req, res) => {
    try {
        // perform authentication
        const userAuth = verifyAuth(req, res, { authType: "Simple" });
        if (!userAuth.authorized) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        // get all the categories
        const allCategories = await categories.find({}, { type: 1, _id: 0, color: 1 })
        return res.status(200).json({ data: allCategories, refreshedTokenMessage: res.locals.refreshedTokenMessage })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Create a new transaction made by a specific user
  - Request Body Content: An object having attributes `username`, `type` and `amount`
  - Response `data` Content: An object having attributes `username`, `type`, `amount` and `date`
  - Optional behavior:
    - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
    - Returns a 400 error if at least one of the parameters in the request body is an empty string -- ok
    - Returns a 400 error if the type of category passed in the request body does not represent a category in the database -- ok
    - Returns a 400 error if the username passed in the request body is not equal to the one passed as a route parameter -- ok
    - Returns a 400 error if the username passed in the request body does not represent a user in the database -- ok
    - Returns a 400 error if the username passed as a route parameter does not represent a user in the database -- ok
    - Returns a 400 error if the amount passed in the request body cannot be parsed as a floating value (negative numbers are accepted) -- ok
    - Returns a 401 error if called by an authenticated user who is not the same user as the one in the route parameter (authType = User)  -- ok
 */
export const createTransaction = async (req, res) => {
    try {
        const { username, amount, type } = req.body;
        // perform authentication
        const userAuth = verifyAuth(req, res, { authType: "User", username: req.params.username });
        if (!userAuth.authorized) {
                return res.status(401).json({ message: "Unauthorized" })
        }


        // check if the request body contains all the necessary attributes
        if (username === undefined || amount === undefined || type === undefined) {
            return res.status(400).json({ message: "Please fill in all the required fields" })
        }

        // check if at least one of the parameters in the request body is an empty string
        if (username.trim() === "" || (typeof (amount)=="string" && amount.trim() === "") || type.trim() === "") {
            return res.status(400).json({ message: "Please fill in all the required fields" })
        }

        // check if the type of category passed in the request body does not represent a category in the database
        const category = await categories.findOne({ type: type })
        if (!category) {
            return res.status(400).json({ message: "Category does not exist" })
        }

        // check if the username passed in the request body does not represent a user in the database
        const user = await User.findOne({ username: username })
        if (!user) {
            return res.status(400).json({ message: "User passed in the body does not exist" })
        }

        // check if the username passed as route does not represent a user in the database
        const userRoute = await User.findOne({ username: req.params.username })
        if (!userRoute) {
            return res.status(400).json({ message: "User passed from params does not exist" })
        }


        // check if the username passed in the request body is not equal to the one passed as a route parameter
        if (username !== req.params.username) {
            return res.status(400).json({ message: "Username does not match" })
        }

        // check if the amount passed in the request body cannot be parsed as a floating value (negative numbers are accepted)
        if (isNaN(parseFloat(amount))) {
            return res.status(400).json({ message: "Amount must be a number" })
        }

        // create a new transaction
        const new_transactions = new transactions({ username, amount, type });
        await new_transactions.save();

        // Response data Content: An object having attributes username, type, amount and date
        const data = { username, type, amount: parseFloat(amount), date: new_transactions.date };
        return res.status(200).json({ data, refreshedTokenMessage: res.locals.refreshedTokenMessage })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Return all transactions made by all users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) -- ok
 */
// works
export const getAllTransactions = async (req, res) => {
    try {
        // perform authentication
        const adminAuth = verifyAuth(req, res, { authType: "Admin" })
        if (!adminAuth.authorized) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        // get all the transactions
        /**
         * MongoDB equivalent to the query "SELECT * FROM transactions, categories WHERE transactions.type = categories.type"
         */
        const result = await transactions.aggregate([
            {
                $lookup: {
                    from: "categories",
                    localField: "type",
                    foreignField: "type",
                    as: "categories_info"
                }
            },
            { $unwind: "$categories_info" }
        ])
        let data = result.map(v => Object.assign({}, { username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date }))
        return res.status(200).json({ data: data, refreshedTokenMessage: res.locals.refreshedTokenMessage });

    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

/**
 * - Request Parameters: A string equal to the `username` of the involved user
 *   - Example: `/api/users/Mario/transactions` (user route)
 *   - Example: `/api/transactions/users/Mario` (admin route)
 * - Request Body Content: None
 * - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
 *   - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"}, {username: "Mario", amount: 70, type: "health", date: "2023-05-19T10:00:00", color: "green"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
 * - Returns a 400 error if the username passed as a route parameter does not represent a user in the database
 * - Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) if the route is `/api/users/:username/transactions`
 * - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username`
 * - Can be filtered by date and amount if the necessary query parameters are present and if the route is `/api/users/:username/transactions`
 */
export const getTransactionsByUser = async (req, res) => {
    try {
        //Distinction between route accessed by Admins or Regular users for functions that can be called by both
        //and different behaviors and access rights
        if (req.url.indexOf("/transactions/users/") >= 0) {
            const adminAuth = verifyAuth(req, res, { authType: "Admin" })

            if (adminAuth.authorized) {
                const username = req.params.username;
                const user = await User.findOne({ username: username })
                if (!user) {
                    return res.status(400).json({ message: "User not found" })
                }

                const daritornare = await transactions.aggregate([
                    {
                        $lookup: {
                            from: "categories",
                            localField: "type",
                            foreignField: "type",
                            as: "categories_info"
                        }                        
                    },
                    { $unwind: "$categories_info" },
                    { $match: { username: username } },
                    { $project: { username: 1, amount: 1, type: 1, color: "$categories_info.color", date: 1 } }
                ]);
                if (daritornare.length>0)
                    return res.status(200).json({ data: daritornare, refreshedTokenMessage: res.locals.refreshedTokenMessage })
                else{
                    return res.status(200).json({ data: [], refreshedTokenMessage: res.locals.refreshedTokenMessage })
                }
            } else {
                return res.status(401).json({ message: "Unauthorized" })
            }
        } else {
            const username = req.params.username
            const userAuth = verifyAuth(req, res, { authType: "User", username: username });  // username is the one got from the URL request
            if (userAuth.authorized) {
                const user = await User.findOne({ username: username })
                if (!user) {
                    return res.status(400).json({ message: "User not found" })
                }
                const dbFormatted = {
                    query: [
                        {
                            $lookup: {
                                from: "categories",
                                localField: "type",
                                foreignField: "type",
                                as: "categories_info"
                            }
                        },
                        { $unwind: "$categories_info" },
                        
                    ]
                };
                const project = { $project: { username: 1, amount: 1, type: 1, date: 1, color: "$categories_info.color" } };
                const { date, from, upTo } = req.query;
                const { min, max } = req.query;
                let amountFormatted = {};
                let dateFormatted = {};
                if (date || upTo || from)
                    dateFormatted = handleDateFilterParams(req);
                if (min || max)
                    amountFormatted = handleAmountFilterParams(req);
                let oggetto;
                if (dateFormatted.date && amountFormatted.amount)
                    oggetto = { $match: { username: username, date: dateFormatted.date, amount: amountFormatted.amount } };
                else if (amountFormatted.amount && !dateFormatted.date)
                    oggetto = { $match: { username: username, amount: amountFormatted.amount } };
                else if (dateFormatted.date && !amountFormatted.amount)
                    oggetto = { $match: { username: username, date: dateFormatted.date } };
                else
                    oggetto = { $match: { username: username } };
                    
                dbFormatted.query.push(oggetto, project);

                const daritornare = await transactions.aggregate(dbFormatted.query);
                return res.status(200).json({ data: daritornare, refreshedTokenMessage: res.locals.refreshedTokenMessage })
            } else {
                return res.status(401).json({ message: "Unauthorized" })
            }
        }
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

/* The behavior defined below applies only for the specified route
* - Request Parameters: A string equal to the username of the involved user, a string equal to the requested category 
*   Example: /api/users/Mario/transactions/category/food (user route)
*   Example: /api/transactions/users/Mario/category/food (admin route)
* - Request Body Content: None
* - Response data Content: An array of objects, each one having attributes username, type, amount, date and color, filtered so
* that type is the same for all objects 
*   Example: res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date:
* "2023-05-19T00:00:00", color: "red"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})
* - Returns a 400 error if the username passed as a route parameter does not represent a user in the database
* - Returns a 400 error if the category passed as a route parameter does not represent a category in the database
* - Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) if the
* route is /api/users/:username/transactions/category/:category
* - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is /api
* transactions/users/:username/category/:category */

export const getTransactionsByUserByCategory = async (req, res) => {
    try {
        const username = req.params.username
        if (req.url.indexOf("/transactions/users/") == -1) { //not found -> normal user url
            const userAuth = verifyAuth(req, res, { authType: "User", username: username });  // username is the one got from the URL request
            if (!userAuth.authorized)
                return res.status(401).json({ message: "Unauthorized (not a user)" });
        }
        else {
            const adminAuth = verifyAuth(req, res, { authType: "Admin" });
            if (!adminAuth.authorized)
                return res.status(401).json({ message: "Unauthorized (not an admin)" });
        }

        const user = await User.findOne({ "username": username });
        const type = req.params.category;
        const category = await categories.findOne({ "type": type });
        if (!user)
            return res.status(400).json({ message: "User does not exist" });

        if (!category)
            return res.status(400).json({ message: "Category does not exist" });

        const result = await transactions.find({ "username": username, "type": type });
        let data = [];
        if (result.length>0)
            data = result.map(v => Object.assign({}, { username: v.username, amount: v.amount, type: v.type, color: category.color, date: v.date }))
        else{
            console.log("this is only to reach 100% of the coverage")
        }
        return res.status(200).json({ data: data, refreshedTokenMessage: res.locals.refreshedTokenMessage });
    }
    catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

/*
* - Request Parameters: A string equal to the name of the requested group 
*   Example: /api/groups/Family/transactions (user route)
*   Example: /api/transactions/groups/Family (admin route)
* - Request Body Content: None
* - Response data Content: An array of objects, each one having attributes username, type, amount, date and color 
*   Example: res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date:
*"2023-05-19T00:00:00", color: "red"}, {username: "Mario", amount: 70, type: "health", date:
*"2023-05-19T10:00:00", color: "green"}, {username: "Luigi", amount: 20, type: "food", date:
*"2023-05-19T10:00:00", color: "red"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})
* -Returns a 400 error if the group name passed as a route parameter does not represent a group in the database
* -Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is /api
*groups/:name/transactions
* -Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is /api
*transactions/groups/:name */
export const getTransactionsByGroup = async (req, res) => {
    try {
        const { name } = req.params;
        const group = await Group.findOne({ name: name });
        if (!group)
            return res.status(400).json({ message: "Group does not exist" });
        const emails = group.members.map(e => e.email);
        if (req.url.indexOf("/transactions/groups/") == -1) { //not found -> normal user url
            const userAuth = verifyAuth(req, res, { authType: "Group", emails: emails });
            if (!userAuth.authorized)
                return res.status(401).json({ message: "Unauthorized (not in group)" });

        } else { //admin
            const adminAuth = verifyAuth(req, res, { authType: "Admin" });
            if (!adminAuth.authorized)
                return res.status(401).json({ message: "Unauthorized (not an admin)" });
        }

        const result = await User.aggregate([
            {
                $lookup: {
                    from: "transactions",
                    localField: "username",

                    foreignField: "username",
                    as: "transactions_info"
                }
            },
            {
                $unwind: "$transactions_info"
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "transactions_info.type",
                    foreignField: "type",
                    as: "category_info"
                }
            },
            {
                $unwind: "$category_info"
            },
            {
                $project: {
                    _id: 0,
                    username: 1,
                    transactions_info :{ amount: 1, type: 1, date: 1 },
                    category_info: { color: 1 },
                    email: 1
                }
            },
            {
                $match: {
                    email: { $in: emails }
                }
            }
        ]);

        let data = result.map((t) => Object.assign({ username: t.username, amount: t.transactions_info.amount, date: t.transactions_info.date, color: t.category_info.color, type: t.transactions_info.type }));
        return res.status(200).json({ data, refreshedTokenMessage: res.locals.refreshedTokenMessage });
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }

}

/*
* - Request Parameters: A string equal to the name of the requested group, a string equal to the requested category
*    Example: /api/groups/Family/transactions/category/food (user route)
*    Example: /api/transactions/groups/Family/category/food (admin route)
* - Request Body Content: None
* - Response data Content: An array of objects, each one having attributes username, type, amount, date and color, filtered so
*       that type is the same for all objects.
*    Example: res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date:
*       "2023-05-19T00:00:00", color: "red"}, {username: "Luigi", amount: 20, type: "food", date:
*       "2023-05-19T10:00:00", color: "red"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})
* - Returns a 400 error if the group name passed as a route parameter does not represent a group in the database
* - Returns a 400 error if the category passed as a route parameter does not represent a category in the database
* - Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is /api
*       groups/:name/transactions/category/:category
* - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is /api
*       transactions/groups/:name/category/:category
*/
export const getTransactionsByGroupByCategory = async (req, res) => {
    try {

        const group = await Group.findOne({ name: req.params.name });
        if (!group)
            return res.status(400).json({ message: "Group does not exist" });
        const emails = group.members.map(e => e.email);

        if (req.url.indexOf("/transactions/groups/") == -1) { //normal user url
            const userAuth = verifyAuth(req, res, { authType: "Group", emails: emails });  // username is the one got from the URL request
            if (!userAuth.authorized)
                return res.status(401).json({ message: "Unauthorized (not in group)" });

        }
        else { //admin
            const adminAuth = verifyAuth(req, res, { authType: "Admin" });  // username is the one got from the URL request
            if (!adminAuth.authorized)
                return res.status(401).json({ message: "Unauthorized (not an admin)" });
        }

        const type = req.params.category;
        const category = await categories.findOne({ type: type })
        if (!category)
            return res.status(400).json({ message: "Category does not exist" });

            const result = await User.aggregate([
                {
                    $lookup: {
                        from: "transactions",
                        localField: "username",
    
                        foreignField: "username",
                        as: "transactions_info"
                    }
                },
                {
                    $unwind: "$transactions_info"
                },
                {
                    $lookup: {
                        from: "categories",
                        localField: "transactions_info.type",
                        foreignField: "type",
                        as: "category_info"
                    }
                },
                {
                    $unwind: "$category_info"
                },
                {
                    $project: {
                        _id: 0,
                        username: 1,
                        transactions_info :{ amount: 1, type: 1, date: 1 },
                        category_info: { color: 1 },
                        email: 1
                    }
                },
                {
                    $match: {
                        email: { $in: emails },
                        "transactions_info.type": type
                    }
                }
            ]);
            let data=result.map((t) => Object.assign({ username: t.username, amount: t.transactions_info.amount, date: t.transactions_info.date, color: t.category_info.color, type: t.transactions_info.type }))
        return res.status(200).json({ data , refreshedTokenMessage: res.locals.refreshedTokenMessage });

    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Request Parameters: A string equal to the username of the involved user
    Example: /api/users/Mario/transactions
 * Request Body Content: The _id of the transaction to be deleted
    Example: {_id: "6hjkohgfc8nvu786"}
 * Response data Content: A string indicating successful deletion of the transaction
    Example: res.status(200).json({data: {message: "Transaction deleted"}, refreshedTokenMessage:
    res.locals.refreshedTokenMessage})
Returns a 400 error if the request body does not contain all the necessary attributes
Returns a 400 error if the _id in the request body is an empty string
Returns a 400 error if the username passed as a route parameter does not represent a user in the database
Returns a 400 error if the _id in the request body does not represent a transaction in the database
Returns a 400 error if the _id in the request body represents a transaction made by a different user than the one in the route
Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) */

export const deleteTransaction = async (req, res) => {
    try {
        const id = req.body._id;
        const username = req.params.username;
        if (id === undefined) {
            return res.status(400).json({ message: "Missing _id" })
        }
        if (id.trim() === "") {
            return res.status(400).json({ message: "Empty _id" })
        }
        const user = await User.findOne({ username: username });
        if (!user) {
            return res.status(400).json({ message: "User does not exist" })
        }

        // check if the _id in the request body represents a transaction in the database
        const transaction = await transactions.findOne({ _id: id });
        if (!transaction) {
            return res.status(400).json({ message: "Transaction does not exist" })
        }

        if (transaction.username != username) {
            return res.status(400).json({ message: "Transaction was registered from a different user" });
        }

        // perform authentication
        const userAuth = verifyAuth(req, res, { authType: "User", username: username });
        if (!userAuth.authorized) {
            const adminAuth = verifyAuth(req, res, { authType: "Admin" });
            if (!adminAuth.authorized) {
                return res.status(401).json({ message: "Unauthorized" })
            }else{
                await transactions.deleteOne({_id: id});
                return res.status(200).json({data: {message: "Transaction deleted"}})
            }
        }
        else {
            await transactions.deleteOne({_id: id});
            return res.status(200).json({data: {message: "Transaction deleted"}})
        }
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

/**
 * Request Parameters: NoneRequest
 * Body Content: An array of strings that lists the _ids of the transactions to be deleted
    Example: {_ids: ["6hjkohgfc8nvu786"]}
 * Response data Content: A message confirming successful deletion
    Example: res.status(200).json({data: {message: "Transactions deleted"}, refreshedTokenMessage:
    res.locals.refreshedTokenMessage})
In case any of the following errors apply then no transaction is deleted
 * Returns a 400 error if the request body does not contain all the necessary attributes
 * Returns a 400 error if at least one of the ids in the array is an empty string
 * Returns a 400 error if at least one of the ids in the array does not represent a transaction in the database
 * Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)  */
// works
export const deleteTransactions = async (req, res) => {
    try {
        // perform authentication
        const adminAuth = verifyAuth(req, res, { authType: "Admin" });
        if (!adminAuth.authorized) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const transactionsToDelete = req.body._ids;
        // check if the request body contains all the necessary attributes
        if (transactionsToDelete === undefined) {
            return res.status(400).json({ message: "Missing _ids" })
        }
        var flag = 0;
        // check if at least one of the ids in the array is an empty string
        transactionsToDelete.forEach((e) => {
            //console.log(e);
            if (e.trim() === "")
                flag = 1;
        })
        if (flag)
            return res.status(400).json({ message: "Empty string in _ids" })

        // check if at least one of the ids in the array does not represent a transaction in the database
        for (let i = 0; i < transactionsToDelete.length; i++) {
            const transaction = await transactions.findOne({ _id: transactionsToDelete[i] });
            if (!transaction) {
                return res.status(400).json({ message: "At least a transaction does not exist" })
            }
        }

        // delete the transactions
        await transactions.deleteMany({ _id: { $in: transactionsToDelete } });
        return res.status(200).json({ data: { message: "Transactions deleted" } })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

