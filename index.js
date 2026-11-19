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

// Add Service
app.post("/services", async (req, res) => {
  try {
    const data = req.body

    const result = await serviceCollection.insertOne(data)

    res.send(result)
  } catch (error) {
    console.error("Add service error:", error)
    res.status(500).send({ message: "Failed to add service" })
  }
})

// Get All Approved & Available Services
app.get("/services", async (req, res) => {
  try {
    const { category, search, serviceMode, sort } = req.query

    const query = {
      approvalStatus: "approved",
      isAvailable: true,
    }

    // Category Filter
    if (category) {
      query.category = category
    }

    // Service Mode Filter
    if (serviceMode) {
      query.serviceMode = serviceMode
    }

    // Search Filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { serviceArea: { $regex: search, $options: "i" } },
        { technicianName: { $regex: search, $options: "i" } },
      ]
    }

    // Sort
    let sortOption = { createdAt: -1 }

    if (sort === "price-low") {
      sortOption = { basePrice: 1 }
    } else if (sort === "price-high") {
      sortOption = { basePrice: -1 }
    }

    const result = await serviceCollection
      .find(query)
      .sort(sortOption)
      .toArray()

    res.send(result)
  } catch (error) {
    console.error("Get services error:", error)
    res.status(500).send({ message: "Failed to fetch services" })
  }
})


// Approve data/ pending start


app.patch("/services/:id/approval", async (req, res) => {
  try {
    const { id } = req.params
    const { approvalStatus } = req.body

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid service ID" })
    }

    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).send({ message: "Invalid approval status" })
    }

    const result = await serviceCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          approvalStatus,
          updatedAt: new Date(),
        },
      }
    )

    res.send(result)
  } catch (error) {
    console.error("Approval error:", error)
    res.status(500).send({ message: "Failed to update approval status" })
  }
})

app.get("/services/pending", async (req, res) => {
    try {
        const result = await serviceCollection
        .find({ approvalStatus: "pending" })
        .sort({ createdAt: -1 })
        .toArray()
        
    res.send(result)
  } catch (error) {
    console.error("Pending services error:", error)
    res.status(500).send({ message: "Failed to get pending services" })
  }
})

// Get All Services (admin — any approval status)
// NOTE: must be registered BEFORE /services/:id or "all" would match as an id
app.get("/services/all", async (req, res) => {
    try {
        const result = await serviceCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray()

    res.send(result)
  } catch (error) {
    console.error("All services error:", error)
    res.status(500).send({ message: "Failed to get all services" })
  }
})

// admin power approve/reject

// Get Single Service
app.get("/services/:id", async (req, res) => {
  try {
    const { id } = req.params

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid service ID" })
    }

    const result = await serviceCollection.findOne({
      _id: new ObjectId(id),
      approvalStatus: "approved",
      isAvailable: true,
    })

    if (!result) {
      return res.status(404).send({ message: "Service not found" })
    }

    res.send(result)
  } catch (error) {
    console.error("Get single service error:", error)
    res.status(500).send({ message: "Failed to fetch service" })
  }
})

// Get Technician's Services
app.get("/services/technician/:technicianEmail", async (req, res) => {
  try {
    const { technicianEmail } = req.params

    const result = await serviceCollection
      .find({ technicianEmail })
      .sort({ createdAt: -1 })
      .toArray()

    res.send(result)
  } catch (error) {
    console.error("Get technician services error:", error)
    res.status(500).send({ message: "Failed to fetch technician services" })
  }
})

// Update Service
app.patch("/services/:id", async (req, res) => {
  try {
    const { id } = req.params
    const data = req.body

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid service ID" })
    }

    const updatedService = {
      title: data.title,
      category: data.category,
      description: data.description,
      image: data.image,
      basePrice: Number(data.basePrice),
      estimatedDuration: data.estimatedDuration,
      serviceMode: data.serviceMode,
      serviceArea: data.serviceArea,
      technicianName: data.technicianName,
      technicianEmail: data.technicianEmail,
      approvalStatus: "pending",
      updatedAt: new Date(),
    }

    const result = await serviceCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updatedService,
      }
    )

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Service not found" })
    }

    res.send({
      message: "Service updated successfully and sent for approval",
      result,
    })
  } catch (error) {
    console.error("Update service error:", error)
    res.status(500).send({ message: "Failed to update service" })
  }
})

// Delete Service
app.delete("/services/:id", async (req, res) => {
  try {
    const { id } = req.params

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid service ID" })
    }

    const result = await serviceCollection.deleteOne({
      _id: new ObjectId(id),
    })

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Service not found" })
    }

    res.send({
      message: "Service deleted successfully",
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error("Delete service error:", error)
    res.status(500).send({ message: "Failed to delete service" })
  }
})

// Toggle Service Availability
app.patch("/services/:id/availability", async (req, res) => {
  try {
    const { id } = req.params
    const { isAvailable } = req.body

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid service ID" })
    }

    if (typeof isAvailable !== "boolean") {
      return res.status(400).send({
        message: "isAvailable must be true or false",
      })
    }

    const result = await serviceCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isAvailable,
          updatedAt: new Date(),
        },
      }
    )

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Service not found" })
    }

    res.send({
      message: `Service is now ${isAvailable ? "available" : "unavailable"}`,
      result,
    })
  } catch (error) {
    console.error("Availability update error:", error)
    res.status(500).send({ message: "Failed to update availability" })
  }
})

// Service Data End



app.listen(PORT,()=>{
    console.log(`port is runing at  ${PORT}`);
})