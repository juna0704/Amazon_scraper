import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  console.log(res.status(200).json({ message: "this is main route" }));
});

export default router;
