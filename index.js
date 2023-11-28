const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const jwt = require("jsonwebtoken");
const jwt = require('jsonwebtoken');
const cors = require("cors");
const app = express();
require("dotenv").config();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

DB_USER=platform222
DB_PASS=Br2ipQnuBDwkt3zU
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6aqk9ji.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const postsCollection = client.db("platformDB").collection("posts");
    const userCollection = client.db("platformDB").collection("users");
    const announcementCollection = client.db("platformDB").collection("announcements");

    // user related
    app.get("/users", async (req, res) => {
        const result = await userCollection.find().toArray();
        res.send(result);
      });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      try {
        const result = await userCollection.insertOne(user);
        res.send({
          message: "User created successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).send({ message: "Error creating user" });
      }
    });

    app.delete("/users/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
      });

      app.patch(
        "/users/admin/:id",
      
        async (req, res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const updatedDoc = {
            $set: {
              role: "admin",
            },
          };
          const result = await userCollection.updateOne(query, updatedDoc);
          res.send(result);
        }
      );

// post related

    app.post("/posts", async (req, res) => {
      const post = req.body;
      //   console.log(post);
      const result = await postsCollection.insertOne(post);
      console.log(result);
      res.send(result);
    });

    // announcement related
    app.get("/announcements", async (req, res) => {
        const result = await announcementCollection.find().toArray();
        res.send(result);
      });

    app.post("/announcements", async (req, res) => {
        const announcement = req.body;
        //   console.log(post);
        const result = await announcementCollection.insertOne(announcement);
        console.log(result);
        res.send(result);
      });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Crud is running...");
});

app.listen(port, () => {
  console.log(`Simple Crud is Running on port ${port}`);
});
