import { DataSource } from "typeorm";

export const dataSource = new DataSource({
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "postgres",
  password: "password",
  database: "mydb",
});
