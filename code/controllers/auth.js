import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { verifyAuth } from './utils.js';

/**
 * Register a new user in the system
  - Request Body Content: An object having attributes `username`, `email` and `password`
  - Response `data` Content: A message confirming successful insertion
  - Optional behavior:
    - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
    - Returns a 400 error if at least one of the parameters in the request body is an empty string -- ok
    - Returns a 400 error if the email in the request body is not in a valid email format -- ok
    - Returns a 400 error if the username in the request body identifies an already existing user -- ok
    - Returns a 400 error if the email in the request body identifies an already existing user -- ok
 */
// works
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (username===undefined || email===undefined || password===undefined) return res.status(400).json({ error: "Please fill in all the required fields" });
        if (username.trim() === "" || email.trim() === "" || password.trim() === "") return res.status(400).json({ error: "At least one of the parameters in the request body is an empty string" });
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Please enter a valid email address" });
        }
        let existingUser = await User.findOne({email: email, username: username });
        if (existingUser) return res.status(400).json({ error: "User already registered" });
        existingUser = await User.findOne({ email: req.body.email });
        if (existingUser && existingUser.username!==username) return res.status(400).json({ error: "This email is already used" });
        existingUser = await User.findOne({ username: req.body.username });
        if (existingUser && existingUser.email!==email) return res.status(400).json({ error: "This username is already used" });

        const hashedPassword = await bcrypt.hash(password, 12);
        await User.create({
            username,
            email,
            password: hashedPassword,
        });
        return res.status(200).json({data: {message: "User added successfully"}})
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

/**
 * Register a new user in the system with an Admin role
  - Request Body Content: An object having attributes `username`, `email` and `password`
  - Response `data` Content: A message confirming successful insertion
  - Optional behavior:
    - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
    - Returns a 400 error if at least one of the parameters in the request body is an empty string -- ok
    - Returns a 400 error if the email in the request body is not in a valid email format -- ok
    - Returns a 400 error if the username in the request body identifies an already existing user -- ok
    - Returns a 400 error if the email in the request body identifies an already existing user -- ok
 */
// works
export const registerAdmin = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (username===undefined || email===undefined || password===undefined) return res.status(400).json({ error: "Please fill in all the required fields" });
        if (username.trim() === "" || email.trim() === "" || password.trim() === "") return res.status(400).json({ error: "At least one of the parameters in the request body is an empty string" });
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Please enter a valid email address" });
        }
        let existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) return res.status(400).json({ error: "you are already registered" });
        existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) return res.status(400).json({ error: "you are already registered" });
        const hashedPassword = await bcrypt.hash(password, 12);
        await User.create({
            username,
            email,
            password: hashedPassword,
            role: "Admin"
        });
        return res.status(200).json({data: {message: "User added successfully"}})
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

/**
 * Perform login 
  - Request Body Content: An object having attributes `email` and `password`
  - Response `data` Content: An object with the created accessToken and refreshToken
  - Optional behavior:
    - Returns a 400 error if the request body does not contain all the necessary attributes -- ok
    - Returns a 400 error if at least one of the parameters in the request body is an empty string -- ok
    - Returns a 400 error if the email in the request body is not in a valid email format -- ok
    - Returns a 400 error if the email in the request body does not identify a user in the database -- ok
    - Returns a 400 error if the supplied password does not match with the one in the database -- ok
 */
// works
export const login = async (req, res) => {
    try {
        const { email, password } = req.body
        if (email===undefined || password===undefined) return res.status(400).json({ error: "please fill in all the required fields" })
        if (email.trim() === "" || password.trim() === "") return res.status(400).json({ error: "please fill in all the required fields" })
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "please enter a valid email address" });
        }
        const existingUser = await User.findOne({ email: email })
        if (!existingUser) return res.status(400).json( {error: "wrong credentials"} )
        const match = await bcrypt.compare(password, existingUser.password)
        if (!match) return res.status(400).json( {error: "wrong credentials"} )
        //CREATE ACCESSTOKEN
        const accessToken = jwt.sign({
            email: existingUser.email,
            id: existingUser.id,
            username: existingUser.username,
            role: existingUser.role
        }, process.env.ACCESS_KEY, { expiresIn: '1h' })
        //CREATE REFRESH TOKEN
        const refreshToken = jwt.sign({
            email: existingUser.email,
            id: existingUser.id,
            username: existingUser.username,
            role: existingUser.role
        }, process.env.ACCESS_KEY, { expiresIn: '7d' })
        //SAVE REFRESH TOKEN TO DB
        existingUser.refreshToken = refreshToken
        await existingUser.save()
        res.cookie("accessToken", accessToken, { httpOnly: true, domain: "localhost", path: "/api", maxAge: 60 * 60 * 1000, sameSite: "none", secure: true })
        res.cookie('refreshToken', refreshToken, { httpOnly: true, domain: "localhost", path: '/api', maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'none', secure: true })
        res.status(200).json({data: {accessToken: accessToken, refreshToken: refreshToken}})
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

/**
 * Perform logout
  - Auth type: Simple
  - Request Body Content: None
  - Response `data` Content: A message confirming successful logout
  - Optional behavior:
    - Returns a 400 error if the request does not have a refresh token in the cookies -- ok
    - Returns a 400 error if the refresh token in the request's cookies does not represent a user in the database -- ok
 */
// works
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken

        if(refreshToken===undefined)
            return res.status(400).json( {error: "refreshToken is not given"} )
        const logged = verifyAuth(req,res,{authType: "Simple"})

        if(!logged.authorized)
            return res.status(401).json({error : logged.cause});

        const user = await User.findOne({ refreshToken: refreshToken })
        if (!user) {
            return res.status(400).json({ error: "user not found" })
        }
        user.refreshToken = null
        res.cookie("accessToken", "", { httpOnly: true, path: '/api', maxAge: 0, sameSite: 'none', secure: true })
        res.cookie('refreshToken', "", { httpOnly: true, path: '/api', maxAge: 0, sameSite: 'none', secure: true })
        await user.save()
        res.status(200).json({data: {message: "User logged out"}})
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
