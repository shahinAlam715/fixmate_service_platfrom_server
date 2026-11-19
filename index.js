import { MongoClient, ObjectId } from 'mongodb';
import express from "express"
import cors from "cors"
import 'dotenv/config'
const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const mongodbUsers = await connectToMongoDB()
const dataBase = mongodbUsers.db("fixmateusers")
const userCollection = dataBase.collection("user")
const serviceCollection = dataBase.collection("services")


app.get("/", (req, res)=>{
    const bb = "Allhamdulillah !"
    res.send(bb)
})

// user Data Start

app.get("/users", async (req, res) => {
  try {
    const result = await userCollection.find({}).toArray()
    res.send(result)
  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Failed to fetch users" })
  }
})

app.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    // Validate role
    const allowedRoles = ["customer", "technician", "admin"]

    if (!allowedRoles.includes(role)) {
      return res.status(400).send({ message: "Invalid role!" })
    }

    // Update user role
    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          role: role,
        },
      }
    )

    res.send(result)
  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Failed to update user role!" })
  }
})

app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid user ID" })
    }

    const result = await userCollection.deleteOne({
      _id: new ObjectId(id),
    })

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "User not found" })
    }

    res.send({
      message: "User deleted successfully",
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error("Delete user error:", error)

    res.status(500).send({
      message: "Failed to delete user",
    })
  }
})

// user Data End

// Service Data Start

app.post("/services", async(req, res)=>{
    const data = req.body
    const result = await serviceCollection.insertOne(data)
    res.send(result)
})
app.get("/services", async(req, res)=>{
    const data = req.body
    const result = await serviceCollection.find(data).toArray()
    res.send(result)
})

// Service Data End

app.listen(PORT,()=>{
    console.log(`port is runing at  ${PORT}`);
})