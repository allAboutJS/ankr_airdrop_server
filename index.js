import express, { Router } from "express";
import connectToDb from "./utils/connect-to-db.js";
import TelegramBotController from "./controllers/telegram-bot-controller.js";
import UserController from "./controllers/user-controller.js";
import helmet from "helmet";
import cors from "cors";
import AdminController from "./controllers/admin-controller.js";
import TaskController from "./controllers/task-controller.js";
import { config } from "dotenv";

config();

const app = express();
const port = parseInt(process.env.PORT || "3000");
const userRouter = Router();
const adminRouter = Router();

app.disable("x-powered-by");
app.disable("x-server");

app.use(cors());
app.use(helmet());
app.use(cors({}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use(async (req, res, next) => {
	res.header("Cache-Control", "no-cache, no-store, must-revalidate");
	res.header("Pragma", "no-cache");
	res.header("Expires", "0");

	next();
});

app.post("/telegram-webhook", TelegramBotController.handleRequest);
app.get("/ping", (_, res) => res.send("Pong!"));
app.get("/clear-daily-tasks", async (_, res) => {
	res.sendStatus(204);
	await UserController.clearExpiredUserDailyTasks();
});

// USER ROUTES
userRouter.get("/tasks/initialize", UserController.initializeTask);

userRouter.use(UserController.authenticateUser);

userRouter.get("/tasks/confirm", UserController.confirmTaskHandler);
userRouter.get("/", UserController.getUserHandler);
userRouter.get("/tasks", UserController.getUserTasksHandler);
userRouter.get("/referees", UserController.getRefereesHandler);

// ADMIN ROUTES
adminRouter.use(AdminController.authenticateAdmin);

adminRouter.post("/tasks/create", AdminController.createTaskHandler);
adminRouter.delete("/tasks/delete", AdminController.deleteTasksHandler);
adminRouter.delete(
	"/user/tasks/delete",
	AdminController.deleteUserTasksHandler,
);
adminRouter.get("/users", AdminController.getUsersHandler);

app.get("/api/tasks", TaskController.getTasksHandler);

app.all("*", (req, res) => res.sendStatus(403));

app.listen(port, async () => {
	await connectToDb();
	console.log("server started");
});
