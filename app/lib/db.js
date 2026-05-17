import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",       // your phpMyAdmin username
  password: "",       // your password
  database: "ebana_stuffhub",
});

export default db;