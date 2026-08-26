import express from "express";
import cors from "cors";

const app = express();

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://192.168.100.4:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const PORT = 5000;

// Health check
app.get("/", (req, res) => {
  res.send("API running");
});

// Dashboard summary
app.get("/dashboard/summary", (req, res) => {
  res.json({ totalRevenue: 125000, totalOrders: 342, totalCustomers: 89 });
});

// Orders
app.get("/orders", (req, res) => {
  res.json([{ id: "ORD-001", amount: 1250, status: "delivered", date: "2025-05-01" }]);
});

// Invoices
app.get("/invoices", (req, res) => {
  res.json([{ id: "INV-001", amount: 1200, status: "paid", date: "2025-05-01" }]);
});

// Payments analytics
app.get("/dashboard/payments-analytics", (req, res) => {
  res.json({ totalPaid: 98500, totalPending: 15400, weeklyData: [12500, 14200] });
});

// Workspace members (to avoid 404 on settings)
app.get("/settings/workspace-members", (req, res) => {
  res.json([]);
});

// Customers
app.get("/customers", (req, res) => {
  res.json([]);
});

// Settings profile
app.get("/settings", (req, res) => {
  res.json({ workspace_profile: { name: "Stitch Flow", defaultCurrency: "GHS" } });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});