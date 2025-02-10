
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const bookRoutes = require('./routes/BookRoutes');
const userRoutes = require("./routes/authRoutes");
require("dotenv").config();
const app = express();
app.use(express.json()) 
app.use(cors());
app.use('/api/books' ,bookRoutes);
app.use("/api/auth",userRoutes);

mongoose.connect(process.env.mongo_server)
.then(() => console.log("connected to DB"))
.catch((err) => console.log(err))

app.listen(process.env.PORT, () => {
  console.log(`Server started on port ${process.env.PORT}`);
});
