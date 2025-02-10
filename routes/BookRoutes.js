const express = require("express");
const multer = require("multer");
const path = require("path");
const BorrowRequest = require("../models/borrowRequest");
const Book = require("../models/Book");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
require("dotenv").config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: "raw" },
          async (error, result) => {
              if (error) return res.status(500).json({ message: "Upload failed", error });

              // Save the PDF URL in MongoDB
              const newBook = new Book({
                  title: req.body.title,
                  author: req.body.author,
                  category: req.body.category,
                  pdfUrl: result.secure_url, // Store Cloudinary URL
              });
              await newBook.save();

              res.json({ message: "File uploaded successfully", pdfUrl: result.secure_url });
          }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
      res.status(500).json({ message: "Upload failed", error: err.message });
  }
});



router.get("/book", async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch books", error: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { title, author, category } = req.query;
    let query = {};
    if (title) query.title = { $regex: title, $options: "i" };
    if (author) query.author = { $regex: author, $options: "i" };
    if (category) query.category = category;

    const books = await Book.find(query);
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "Error fetching books", error: err.message });
  }
});

router.post('/bor/:bookId', async (req, res) => {
  try {
    const { userId } = req.body;
    const { bookId } = req.params;

    const book = await Book.findById(bookId);
    if (!book || !book.available) return res.status(400).json({ message: 'Book is not available' });

    const newRequest = new BorrowRequest({ book: bookId, user: userId, status: 'pending' });
    await newRequest.save();

    res.status(200).json({ message: 'Borrow request submitted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error processing borrow request' });
  }
});

router.post("/approveRequests/:requestId", async (req, res) => {
    try {
        const { status } = req.body;
        const { requestId } = req.params;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const request = await BorrowRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        request.status = status;

        if (status === "approved") {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);
            request.dueDate = dueDate;

            const book = await Book.findById(request.book);
            if (book) {
                book.available = false;
                await book.save();
            }
        }

        await request.save();

        res.status(200).json({ message: `Borrow request ${status}` });
    } catch (err) {
        res.status(500).json({ message: "Error processing approval" });
    }
});

router.post('/approveReturns/:requestId', async (req, res) => {
  try {
    const { status } = req.body;
    const { requestId } = req.params;

    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid status" });

    const request = await BorrowRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (status === "approved") {
      request.status = "returned";
      await request.save();

      const book = await Book.findById(request.book);
      if (book) {
        book.available = true;
        await book.save();
      }
    } else {
      request.status = "return-rejected";
      await request.save();
    }

    res.status(200).json({ message: `Return request ${status}` });
  } catch (err) {
    res.status(500).json({ message: "Error processing return approval" });
  }
});

router.get('/borrowRequest', async (req, res) => {
    try {
        const borrowRequests = await BorrowRequest.find({ status: "pending" })
            .populate('book')
            .populate('user');

        res.json(borrowRequests);
    } catch (err) {
        res.status(500).json({ message: "Error fetching borrow requests", error: err.message });
    }
});

router.get('/returnRequest', async (req, res) => {
    try {
      const returnRequests = await BorrowRequest.find({ status: "pending-return" }).populate('book').populate('user');
      res.json(returnRequests);
    } catch (err) {
      res.status(500).json({ message: "Error fetching return requests" });
    }
  });

router.get('/borrow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const borrowRequests = await BorrowRequest.find({ user: userId, status: 'pending' }).populate('book');

    if (!borrowRequests.length) return res.status(404).json({ message: 'No pending borrow requests found' });

    res.json(borrowRequests);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching borrow requests' });
  }
});

router.post('/returned/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { userId } = req.body;

        const request = await BorrowRequest.findOne({ book: bookId, user: userId, status: 'approved' });

        if (!request) {
            return res.status(400).json({ message: 'No approved borrow request found for this book' });
        }

        request.status = "returned";
        await request.save();

        const book = await Book.findById(bookId);
        if (book) {
            book.available = true;
            await book.save();
        }

        res.status(200).json({ message: 'Book returned successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error returning book', error: err.message });
    }
});

router.get('/borroweded/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const borrowedBooks = await BorrowRequest.find({ user: userId, status: 'approved' }).populate('book');

        res.json(borrowedBooks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching borrowed books', error: err.message });
    }
});

module.exports = router;
