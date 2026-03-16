"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/orders', orderRoutes_1.default);
app.use('/dashboard', dashboardRoutes_1.default);
// Routes will be added here
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map