const mongoose = require('mongoose');

const borrowRequestSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'Pending' },
  dueDate: { type: Date },
  returned: { type: Boolean, default: false },
  requestedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BorrowRequest', borrowRequestSchema);
