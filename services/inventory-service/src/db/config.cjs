// src/db/config.cjs
require("dotenv").config();

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    logging: console.log,
  },
  test: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    logging: false,
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: "postgres",
    logging: false,
  },
};