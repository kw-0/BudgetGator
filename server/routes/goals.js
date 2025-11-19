const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// Set monthly goal for a period
router.post("/set", auth, async (req, res) => {
  try {
    const { period, amount } = req.body;
    
    if (!period || !amount) {
      return res.status(400).json({ error: "Period and amount are required" });
    }

    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: "Period must be in YYYY-MM format" });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if goal for this period already exists
    const existingGoalIndex = user.monthlyGoals.findIndex((g) => g.period === period);
    
    if (existingGoalIndex >= 0) {
      // Update existing goal
      user.monthlyGoals[existingGoalIndex].amount = amount;
    } else {
      // Add new goal
      user.monthlyGoals.push({ period, amount });
    }

    await user.save();

    res.json({ 
      message: "Goal set successfully", 
      goal: { period, amount } 
    });
  } catch (err) {
    console.error("Error setting goal:", err);
    res.status(500).json({ error: "Failed to set goal" });
  }
});

// Get goal for a specific period
router.get("/:period", auth, async (req, res) => {
  try {
    const { period } = req.params;

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: "Period must be in YYYY-MM format" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const goal = user.monthlyGoals.find((g) => g.period === period);

    if (!goal) {
      return res.json({ goal: null });
    }

    res.json({ goal: { period: goal.period, amount: goal.amount } });
  } catch (err) {
    console.error("Error fetching goal:", err);
    res.status(500).json({ error: "Failed to fetch goal" });
  }
});

// Get all goals for the user
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ goals: user.monthlyGoals || [] });
  } catch (err) {
    console.error("Error fetching goals:", err);
    res.status(500).json({ error: "Failed to fetch goals" });
  }
});

// Delete a goal for a specific period
router.delete("/:period", auth, async (req, res) => {
  try {
    const { period } = req.params;

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: "Period must be in YYYY-MM format" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const goalIndex = user.monthlyGoals.findIndex((g) => g.period === period);
    
    if (goalIndex === -1) {
      return res.status(404).json({ error: "Goal not found for this period" });
    }

    user.monthlyGoals.splice(goalIndex, 1);
    await user.save();

    res.json({ message: "Goal deleted successfully" });
  } catch (err) {
    console.error("Error deleting goal:", err);
    res.status(500).json({ error: "Failed to delete goal" });
  }
});

module.exports = router;
