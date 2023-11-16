import "reflect-metadata";
import { dataSource } from "./config/dataSource";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as helmet from "helmet";
import * as cors from "cors";
import routes from "./routes";
import * as passport from "passport";

class Server {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
  }

  public routes(): void {
    this.app.use("/", routes);
  }

  public config(): void {
    this.app.set("port", process.env.PORT || 3000);
    this.app.use(passport.initialize());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(cors());
    this.app.use(helmet());
  }

  public start(): void {
    this.app.listen(this.app.get("port"), () => {
      // eslint-disable-next-line no-console
      console.log("Server running at http://localhost:%d", this.app.get("port"));
    });
  }
}

const server = new Server();

// Connects to the Database -> then starts the express
// eslint-disable-next-line @typescript-eslint/require-await
dataSource.initialize().then(async () => {
  server.start();
});
