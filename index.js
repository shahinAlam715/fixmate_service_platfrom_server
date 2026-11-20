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
const bookingCollection = dataBase.collection("bookings")


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
    const {
      category,
      search,
      serviceMode,
      sort,
      limit,
    } = req.query;

    const query = {};

    if (category) query.category = category;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { serviceTitle: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (serviceMode) query.serviceMode = serviceMode;

    // Default: latest services first
    let sortOption = { createdAt: -1 };

    if (sort === "price-low") {
      sortOption = { price: 1 };
    } else if (sort === "price-high") {
      sortOption = { price: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    let cursor = serviceCollection
      .find(query)
      .sort(sortOption);

    // Apply limit only when requested
    if (limit) {
      const parsedLimit = parseInt(limit);

      if (parsedLimit > 0) {
        cursor = cursor.limit(parsedLimit);
      }
    }

    const result = await cursor.toArray();

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to fetch services",
    });
  }
});


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


// booking collection start

// ================================
// CREATE REPAIR REQUEST
// POST /bookings
// ================================

// ================================
// CREATE REPAIR REQUEST
// POST /bookings
// ================================

app.post("/bookings", async (req, res) => {
  try {
    const {
      serviceId,
      customerEmail,
      customerPhone,
      address,
      preferredDate,
      problemDescription,
    } = req.body;

    // Validate service ID
    if (!ObjectId.isValid(serviceId)) {
      return res.status(400).send({
        message: "Invalid service ID",
      });
    }

    // Validate required fields
    if (
      !customerEmail ||
      !customerPhone ||
      !address ||
      !preferredDate ||
      !problemDescription
    ) {
      return res.status(400).send({
        message: "Please fill in all required fields",
      });
    }

    // Find customer from database
    const customer = await userCollection.findOne({
      email: customerEmail,
    });

    if (!customer || customer.role !== "customer") {
      return res.status(403).send({
        message: "Only customers can create repair requests",
      });
    }

    // Find service
    const service = await serviceCollection.findOne({
      _id: new ObjectId(serviceId),
    });

    if (!service) {
      return res.status(404).send({
        message: "Service not found",
      });
    }

    // Check service availability
    if (
      service.approvalStatus !== "approved" ||
      service.isAvailable !== true
    ) {
      return res.status(400).send({
        message: "This service is currently unavailable",
      });
    }

    // Validate preferred date
    const requestedDate = new Date(preferredDate);

    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).send({
        message: "Invalid preferred date",
      });
    }

    if (requestedDate < new Date()) {
      return res.status(400).send({
        message: "Preferred date cannot be in the past",
      });
    }

    // Validate problem description
    if (problemDescription.trim().length < 20) {
      return res.status(400).send({
        message: "Problem description must be at least 20 characters",
      });
    }

    // Create booking document
    const booking = {
      serviceId: service._id.toString(),

      // Service snapshot
      serviceTitle: service.title,
      serviceImage: service.image,
      category: service.category,
      basePrice: service.basePrice,

      // Technician snapshot
      technicianName: service.technicianName,
      technicianEmail: service.technicianEmail,

      // Customer data from database
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customerPhone.trim(),

      // Request form data
      address: address.trim(),
      preferredDate: requestedDate,
      problemDescription: problemDescription.trim(),

      // Default status
      status: "requested",
      finalAmount: service.basePrice,
      paymentStatus: "unpaid",

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert booking into database
    const result = await bookingCollection.insertOne(booking);

    res.status(201).send({
      message: "Repair request submitted successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    res.status(500).send({
      message: "Failed to create repair request",
    });
  }
});

app.get("/bookings/my-bookings", async (req, res) => {
  try {
    const customerEmail = req.query.customerEmail || req.user?.email;

    if (!customerEmail) {
      return res.status(400).send({
        message: "customerEmail is required",
      });
    }

    const result = await bookingCollection
      .find({ customerEmail })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("My bookings error:", error);

    res.status(500).send({
      message: "Failed to get bookings",
    });
  }
});

// GET TECHNICIAN BOOKINGS
app.get("/bookings/technician", async (req, res) => {
  try {
    const technicianEmail = req.query.technicianEmail;

    if (!technicianEmail) {
      return res.status(400).send({
        message: "technicianEmail is required",
      });
    }

    const technician = await userCollection.findOne({
      email: technicianEmail,
      role: "technician",
    });

    if (!technician) {
      return res.status(403).send({
        message: "Only technicians can access these bookings",
      });
    }

    const result = await bookingCollection
      .find({ technicianEmail })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Technician bookings error:", error);

    res.status(500).send({
      message: "Failed to get technician bookings",
    });
  }
});



app.patch("/bookings/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid booking ID",
      });
    }

    const allowedStatuses = [
      "accepted",
      "rejected",
      "in-progress",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).send({
        message: "Invalid booking status",
      });
    }

    const result = await bookingCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Booking not found",
      });
    }

    res.send({
      message: "Booking status updated successfully",
    });
  } catch (error) {
    console.error("Update booking status error:", error);

    res.status(500).send({
      message: "Failed to update booking status",
    });
  }
});


app.patch("/bookings/:id/cancel",
 
  async (req, res) => {
    try {
      const { id } = req.params;
      const customerEmail = req.body?.customerEmail || req.query.customerEmail || req.user?.email;

      if (!customerEmail) {
        return res.status(400).send({
          message: "customerEmail is required",
        });
      }

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({
          message: "Invalid booking ID",
        });
      }

      const customer = await userCollection.findOne({
        email: customerEmail,
        role: "customer",
      });

      if (!customer) {
        return res.status(403).send({
          message: "Only customers can cancel bookings",
        });
      }

      const booking = await bookingCollection.findOne({
        _id: new ObjectId(id),
        customerEmail,
      });

      if (!booking) {
        return res.status(404).send({
          message: "Booking not found",
        });
      }

      // Customer can cancel only requested bookings
      if (booking.status !== "requested") {
        return res.status(400).send({
          message:
            "You can only cancel a request before technician accepts it",
        });
      }

      const result = await bookingCollection.updateOne(
        {
          _id: new ObjectId(id),
          customerEmail,
          status: "requested",
        },
        {
          $set: {
            status: "cancelled",
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(409).send({
          message: "Booking status changed. Please refresh.",
        });
      }

      res.send({
        message: "Repair request cancelled successfully",
      });
    } catch (error) {
      console.error("Cancel booking error:", error);

      res.status(500).send({
        message: "Failed to cancel repair request",
      });
    }
  }
);


// ================================
// ADMIN - GET ALL BOOKINGS
// GET /bookings/admin?email=admin@email.com
// ================================

app.get("/bookings/admin", async (req, res) => {
  try {
    const adminEmail = req.query.email;

    if (!adminEmail) {
      return res.status(400).send({
        message: "Admin email is required",
      });
    }

    // Verify admin from user collection
    const admin = await userCollection.findOne({
      email: adminEmail,
      role: "admin",
    });

    if (!admin) {
      return res.status(403).send({
        message: "Forbidden: Admin access required",
      });
    }

    // Get all bookings
    const result = await bookingCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Admin all bookings error:", error);

    res.status(500).send({
      message: "Failed to get all bookings",
    });
  }
});


// ================================
// ADMIN - ACCEPT REJECTED BOOKING
// PATCH /bookings/:id/admin-accept
// ================================

app.patch("/bookings/:id/admin-accept", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminEmail } = req.body;

    // Validate booking ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid booking ID",
      });
    }

    if (!adminEmail) {
      return res.status(400).send({
        message: "Admin email is required",
      });
    }

    // Verify admin
    const admin = await userCollection.findOne({
      email: adminEmail,
      role: "admin",
    });

    if (!admin) {
      return res.status(403).send({
        message: "Forbidden: Admin access required",
      });
    }

    // Find rejected booking
    const booking = await bookingCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found",
      });
    }

    // Only rejected bookings can be accepted by admin
    if (booking.status !== "rejected") {
      return res.status(400).send({
        message: "Only rejected bookings can be accepted by admin",
      });
    }

    // Update booking
    const result = await bookingCollection.updateOne(
      {
        _id: new ObjectId(id),
        status: "rejected",
      },
      {
        $set: {
          status: "accepted",
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(409).send({
        message: "Booking status changed. Please refresh.",
      });
    }

    res.send({
      message: "Rejected booking accepted successfully by admin",
    });
  } catch (error) {
    console.error("Admin accept booking error:", error);

    res.status(500).send({
      message: "Failed to accept rejected booking",
    });
  }
});


app.listen(PORT,()=>{
    console.log(`port is runing at  ${PORT}`);
})

export default app