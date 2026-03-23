"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const app = (0, express_1.default)();
// CORS: allow the Vercel frontend URL in production, or all origins in dev
const allowedOrigin = process.env.FRONTEND_URL;
app.use((0, cors_1.default)({
    origin: allowedOrigin
        ? (origin, callback) => {
            // Allow requests with no origin (e.g. server-to-server, curl)
            if (!origin || origin === allowedOrigin) {
                callback(null, true);
            }
            else {
                callback(new Error(`CORS: Origin ${origin} not allowed`));
            }
        }
        : true, // allow all origins in dev (no FRONTEND_URL set)
    credentials: true,
}));
app.use(express_1.default.json());
// Health check for Railway
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map