const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const jwt = require("jsonwebtoken");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
require("dotenv").config();
const stripe = require("stripe")(process.env.SECRET_KEY);

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

    const reportCollection = client.db("platformDB").collection("reports");
    const postsCollection = client.db("platformDB").collection("posts");
    const reactsCollection = client.db("platformDB").collection("reacts");
    const commentsCollection = client.db("platformDB").collection("comments");
    const paymentCollection = client.db("platformDB").collection("payments");
    const userCollection = client.db("platformDB").collection("users");
    const announcementCollection = client
      .db("platformDB")
      .collection("announcements");
    // jwt

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    // middleware
    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // payment

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price * 100);
      console.log("provide an amount", amount);
      const paymentIntents = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntents.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      console.log("payment id", payment);
      res.send(paymentResult);

      // const query = {_id: {
      //   $in: payment.cartIds.map(id => new ObjectId(id))
      // }};

      // const deleteResult = await cartsCollection.deleteMany(query);

      // res.send({paymentResult, deleteResult})
    });

    // user related
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const { email } = req.params;
      const user = await userCollection.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({ role: user.role || "user" });
    });

    app.post("/users",verifyToken, async (req, res) => {
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

    app.delete("/users/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",verifyToken,

      async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(query, updatedDoc);
        console.log(result);
        res.send(result);
      }
    );

    // post related

    // app.get("/posts", async (req, res) => {
    //   const email = req.query.email;
    //   console.log(email);
    //   const query = { userEmail: email };
    //   console.log(query);
    //   const result = await postsCollection.find(query).toArray();
    //   console.log(result);

    //   res.send(result);
    // });

    app.get("/posts", async (req, res) => {
    try{
      const filter = req.query;
      console.log(filter);
      const query = {
        tags: { $regex: filter.search, $options: "i" },
      };
      console.log(query);

      const result = await postsCollection.find(query).toArray();
      res.send(result);
    }
    catch(error){
      console.log(error);
    }
    });

    app.get("/posts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.findOne(query);
      res.send(result);
    });

    app.post("/posts", async (req, res) => {
      const post = req.body;
      //   console.log(post);
      const result = await postsCollection.insertOne(post);
      console.log(result);
      res.send(result);
    });

    app.delete("/posts/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await postsCollection.deleteOne(query);
      // console.log(result);
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

    // reacts related
    app.get("/reacts", async (req, res) => {
      const result = await reactsCollection.find().toArray();
      res.send(result);
    });

    app.get("/reacts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reactsCollection.findOne(query);
      res.send(result);
    });

    app.post("/reacts", async (req, res) => {
      try {
        const reactsData = req.body;
        const result = await reactsCollection.insertOne(reactsData);

        res
          .status(201)
          .json({ message: "React inserted successfully", data: result.ops });
      } catch (error) {
        console.error("Error inserting react:", error);
        res.status(500).json({ message: "Error inserting react" });
      }
    });

    // commnets

    app.get("/comments", async (req, res) => {
      const result = await commentsCollection.find().toArray();
      res.send(result);
    });

    app.post("/comments", async (req, res) => {
      const comment = req.body;
      const result = await commentsCollection.insertOne(comment);
      console.log(result);
      res.send(result);
    });

    // reported
    app.get("/reports", async (req, res) => {
      const result = await reportCollection.find().toArray();
      res.send(result);
    });

    app.get("/reports/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reportCollection.findOne(query);
      res.send(result);
    });

    app.post("/reports", async (req, res) => {
      const post = req.body;
      //   console.log(post);
      const result = await reportCollection.insertOne(post);
      console.log(result);
      res.send(result);
    });
    app.delete("/reports/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await reportCollection.deleteOne(query);
      // console.log(result);
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
