import express from "express";
import { userLogin, userRegister } from "../controllers/authController.js";

const router = express.Router();

// REGISTER
router.post("/register", userRegister);

// LOGIN
router.post("/login", userLogin);

export default router;
