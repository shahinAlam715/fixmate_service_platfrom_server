import { MongoClient } from 'mongodb';
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


app.get("/", (req, res)=>{
    const bb = "Allhamdulillah !"
    res.send(bb)
})

app.get("/users", async (req, res) => {
  try {
    const result = await userCollection.find({}).toArray()
    res.send(result)
  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Failed to fetch users" })
  }
})


app.listen(PORT,()=>{
    console.log(`port is runing at  ${PORT}`);
})