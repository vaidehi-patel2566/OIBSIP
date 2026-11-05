const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationTokenExpiry: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpiry: { type: Date, default: null }
}, { timestamps: true });

userSchema.set("toJSON", {
  transform(doc, ret) {
    delete ret.password;
    delete ret.verificationToken;
    delete ret.verificationTokenExpiry;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpiry;
    return ret;
  }
});

module.exports = mongoose.model("User", userSchema);
